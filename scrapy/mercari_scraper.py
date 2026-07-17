# -*- coding: utf-8 -*-
"""
メルカリ (mercari.jp) 検索スクレイパー

対象 URL:
  https://jp.mercari.com/search?category_id=1293&sort=created_time&order=desc&status=sold_out%7Ctrading

条件:
  - カテゴリ: ヴァイスシュヴァルツ (category_id = 1293)
  - 販売状況: 売り切れ / 取引中 (sold_out | trading)
  - 並び順:   新しい順 (created_time / desc)
  - 期間:     出品日時が「1日以内」のもののみ

メルカリの Web はサーバーサイドの内部 API を使用しており、
リクエストには DPoP(ES256 で署名した JWT)ヘッダーが必要です。
本スクリプトはその署名を毎回生成して検索 API を叩きます。

依存:  pip install requests cryptography
"""

import argparse
import base64
import csv
import json
import os
import re
import statistics
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone

# Windows のコンソール (cp932/cp950) でも日本語を安全に表示する
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

import requests
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature

# --- 定数 -------------------------------------------------------------------

SEARCH_URL = "https://api.mercari.jp/v2/entities:search"

# 商品ページの URL プレフィックス (item id を後ろに付ける)
ITEM_URL_PREFIX = "https://jp.mercari.com/item/"

# デフォルト検索条件
DEFAULT_CATEGORY_ID = 1293          # ヴァイスシュヴァルツ
DEFAULT_STATUS = ["STATUS_SOLD_OUT", "STATUS_TRADING"]  # 売り切れ | 取引中

PAGE_SIZE = 120                     # 1ページあたりの取得件数 (メルカリの上限)

# --- 監視 (長期運用) 用の設定 ------------------------------------------------

# リトライ対象のステータスコードと最大リトライ回数
RETRYABLE_STATUS = {429, 500, 502, 503, 504}
MAX_RETRIES = 5
BACKOFF_BASE = 2.0                  # 指数バックオフの基数 (秒)

# 既知の商品 ID を保存する状態ファイル (実行をまたいで重複を除外する)
DEFAULT_STATE_FILE = "mercari_seen.json"

# 状態ファイルに残す ID の保持期間 (これより古い初回発見分は掃除する)
STATE_RETENTION = timedelta(days=30)

# --- 市場価格 (カード単位) 用の設定 ------------------------------------------

# 生成した価格 JSON を書き出すローカルフォルダ。
# GCS の json/mercariData/ に対応させ、後で gsutil 等で同期する想定。
DEFAULT_MARKET_DIR = "mercariData"

# 1 日の中央値を計算する最小成約件数 (これ未満の日はノイズとして捨てる)
MIN_SOLD_PER_DAY = 1


# --- DPoP 署名 --------------------------------------------------------------

def _b64url(data: bytes) -> str:
    """base64url エンコード (パディングなし)"""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def generate_dpop(url: str, method: str = "POST") -> str:
    """
    メルカリ API 用の DPoP JWT を生成する。
    鍵はリクエストごとに新規生成 (ephemeral) で問題なく通る。
    """
    key = ec.generate_private_key(ec.SECP256R1())
    numbers = key.public_key().public_numbers()
    x = numbers.x.to_bytes(32, "big")
    y = numbers.y.to_bytes(32, "big")

    header = {
        "typ": "dpop+jwt",
        "alg": "ES256",
        "jwk": {
            "crv": "P-256",
            "kty": "EC",
            "x": _b64url(x),
            "y": _b64url(y),
        },
    }
    payload = {
        "iat": int(time.time()),
        "jti": str(uuid.uuid4()),
        "htu": url,
        "htm": method,
        "uuid": str(uuid.uuid4()),
    }

    signing_input = (
        _b64url(json.dumps(header, separators=(",", ":")).encode())
        + "."
        + _b64url(json.dumps(payload, separators=(",", ":")).encode())
    )

    der_sig = key.sign(signing_input.encode("ascii"), ec.ECDSA(hashes.SHA256()))
    # JWT は DER ではなく raw r||s (64 byte) を要求する
    r, s = decode_dss_signature(der_sig)
    raw_sig = r.to_bytes(32, "big") + s.to_bytes(32, "big")

    return signing_input + "." + _b64url(raw_sig)


# --- 検索 -------------------------------------------------------------------

def build_payload(category_id: int, status: list, page_token: str,
                  search_session_id: str, keyword: str = "") -> dict:
    return {
        "userId": "",
        "pageSize": PAGE_SIZE,
        "pageToken": page_token,
        "searchSessionId": search_session_id,
        "indexRouting": "INDEX_ROUTING_UNSPECIFIED",
        "thumbnailTypes": [],
        "searchCondition": {
            "keyword": keyword,          # 空=カテゴリ全体 / 型番=カード単位検索
            "excludeKeyword": "",
            "sort": "SORT_CREATED_TIME",   # 新しい順
            "order": "ORDER_DESC",          # 降順
            "status": status,               # sold_out | trading
            "sizeId": [],
            "categoryId": [category_id],    # ヴァイスシュヴァルツ
            "brandId": [],
            "sellerId": [],
            "priceMin": 0,
            "priceMax": 0,
            "itemConditionId": [],
            "shippingPayerId": [],
            "shippingFromArea": [],
            "shippingMethod": [],
            "colorId": [],
            "hasCoupon": False,
            "attributes": [],
            "itemTypes": [],
            "skuIds": [],
            "shopIds": [],
            "excludeShippingMethodIds": [],
        },
        "defaultDatasets": [],
        "serviceFrom": "suruga",
        "withItemBrand": True,
        "withItemSize": False,
        "withItemPromotions": True,
        "withItemSizes": True,
        "withShopname": False,
        "useDynamicAttribute": True,
        "withSuggestedItems": True,
        "withOfferPricePromotions": False,
        "withProductSuggest": True,
        "withParentProducts": False,
        "withProductArticles": False,
        "withSearchCondition": True,
    }


def search_page(session: requests.Session, payload: dict) -> dict:
    """
    検索 API を叩く。長期運用向けに、レート制限 (429) や一時的な
    サーバーエラー (5xx)、ネットワーク障害は指数バックオフでリトライする。
    """
    last_err = None
    for attempt in range(MAX_RETRIES):
        # DPoP は署名内に発行時刻を含むため、リトライごとに作り直す
        headers = {
            "DPoP": generate_dpop(SEARCH_URL, "POST"),
            "X-Platform": "web",
            "Content-Type": "application/json; charset=utf-8",
            "Accept": "*/*",
            "Accept-Language": "ja-JP,ja;q=0.9",
            "Origin": "https://jp.mercari.com",
            "Referer": "https://jp.mercari.com/",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            ),
        }
        try:
            resp = session.post(SEARCH_URL, headers=headers, json=payload, timeout=30)
        except (requests.ConnectionError, requests.Timeout) as e:
            last_err = e
            wait = BACKOFF_BASE * (2 ** attempt)
            print(f"  [retry {attempt + 1}/{MAX_RETRIES}] 通信エラー: {e} "
                  f"-> {wait:.0f}s 待機", file=sys.stderr)
            time.sleep(wait)
            continue

        if resp.status_code in RETRYABLE_STATUS:
            last_err = requests.HTTPError(f"HTTP {resp.status_code}", response=resp)
            # 429 はサーバー指定の待機時間 (Retry-After) を優先する
            retry_after = resp.headers.get("Retry-After")
            if retry_after and retry_after.isdigit():
                wait = float(retry_after)
            else:
                wait = BACKOFF_BASE * (2 ** attempt)
            print(f"  [retry {attempt + 1}/{MAX_RETRIES}] HTTP {resp.status_code} "
                  f"-> {wait:.0f}s 待機", file=sys.stderr)
            time.sleep(wait)
            continue

        resp.raise_for_status()  # リトライ対象外の 4xx は即座に失敗させる
        return resp.json()

    # リトライを使い切った
    raise RuntimeError(f"検索 API がリトライ上限に達しました: {last_err}")


def scrape(category_id: int, status: list, within: timedelta,
           max_pages: int = 40, delay: float = 1.0,
           time_field: str = "created", dry_pages: int = 2,
           keyword: str = "") -> list:
    """
    条件に合致し、かつ `time_field` (created=出品日時 / updated=更新日時) が
    `within` 以内の商品をすべて集める。

    注意: メルカリの「新しい順」は created が厳密な降順ではない
    (再出品などで古い出品が上位に来る) ため、範囲外に当たっても即座に
    打ち切らない。範囲内が 0 件のページが `dry_pages` 回連続したら終了する。
    """
    session = requests.Session()
    search_session_id = uuid.uuid4().hex
    now = datetime.now(timezone.utc)
    cutoff = now - within

    results = []
    seen_ids = set()
    page_token = ""
    consecutive_dry = 0

    for page in range(max_pages):
        payload = build_payload(category_id, status, page_token,
                                search_session_id, keyword)
        data = search_page(session, payload)

        items = data.get("items", []) or []
        if not items:
            break

        in_window = 0
        for it in items:
            item_id = it.get("id", "")
            if item_id in seen_ids:
                continue
            ts = int(it.get(time_field, 0) or 0)
            dt = datetime.fromtimestamp(ts, tz=timezone.utc)
            if dt < cutoff:
                continue  # 範囲外はスキップ (打ち切らない)
            created_ts = int(it.get("created", 0) or 0)
            created_dt = datetime.fromtimestamp(created_ts, tz=timezone.utc)
            seen_ids.add(item_id)
            results.append(parse_item(it, created_dt))
            in_window += 1

        print(f"[page {page + 1}] 取得 {len(items)} 件 / "
              f"今回 範囲内 {in_window} 件 / 累計 {len(results)} 件")

        # 範囲内が続いている間は掘り続ける。0 件が続いたら終了。
        if in_window == 0 and results:
            consecutive_dry += 1
            if consecutive_dry >= dry_pages:
                break
        else:
            consecutive_dry = 0

        page_token = data.get("meta", {}).get("nextPageToken", "") \
            or data.get("nextPageToken", "")
        if not page_token:
            break

        time.sleep(delay)  # サーバー負荷への配慮

    # 新しい順に整列して返す
    results.sort(key=lambda r: r["_sort_ts"], reverse=True)
    for r in results:
        r.pop("_sort_ts", None)
    return results


def scrape_sold_recent(days: float = 30.0, category_id: int = DEFAULT_CATEGORY_ID,
                       keyword: str = "", max_pages: int = 40,
                       delay: float = 1.0) -> list:
    """
    直近 `days` 日以内に成約した (売り切れた) 商品を抓ってくる便利関数。

    成約日時は updated (最終更新 ≒ 取引成立時刻) で判定し、
    販売状況は「売り切れ」に限定する。既定は 30 日ぶん。

    引数:
      days:        遡る日数 (既定: 30)
      category_id: カテゴリ ID (既定: 1293 = ヴァイスシュヴァルツ)
      keyword:     検索キーワード (空=カテゴリ全体 / 型番・カード名で絞り込み)
      max_pages:   最大ページ数 (既定: 40)
      delay:       ページ間の待機秒数 (既定: 1.0)

    戻り値: parse_item 形式の dict 一覧 (新しい順)。
    """
    return scrape(
        category_id=category_id,
        status=["STATUS_SOLD_OUT"],     # 成約 (売り切れ) のみ
        within=timedelta(days=days),
        max_pages=max_pages,
        delay=delay,
        time_field="updated",           # 売れた日 (最終更新) で範囲判定
        keyword=keyword,
    )


def parse_item(it: dict, created_dt: datetime) -> dict:
    item_id = it.get("id", "")
    updated_ts = int(it.get("updated", 0)) if it.get("updated") else 0
    status_map = {
        "ITEM_STATUS_SOLD_OUT": "売り切れ",
        "ITEM_STATUS_TRADING": "取引中",
        "ITEM_STATUS_ON_SALE": "販売中",
    }
    return {
        "id": item_id,
        "name": it.get("name", ""),
        "price": it.get("price", ""),
        "status": status_map.get(it.get("status", ""), it.get("status", "")),
        "created": created_dt.astimezone().strftime("%Y-%m-%d %H:%M:%S"),
        "updated": (datetime.fromtimestamp(updated_ts).strftime("%Y-%m-%d %H:%M:%S")
                    if updated_ts else ""),
        "thumbnail": (it.get("thumbnails") or [""])[0],
        "url": ITEM_URL_PREFIX + item_id,
        "_sort_ts": int(it.get("created", 0) or 0),
    }


# --- 市場価格 (カード単位) の集計 -------------------------------------------

def product_code_from_cardno(card_no: str) -> str:
    """
    型番から製品ファイル名の元になる製品コードを取り出す。
    例: "BD/W54-070SSP" -> "BD_W54"  (遊々亭側の cardData/ と同じ規則)
    """
    prefix = card_no.split("-", 1)[0]      # "BD/W54"
    return prefix.replace("/", "_")         # "BD_W54"


def aggregate_sold_medians(rows: list) -> dict:
    """
    売り切れ (成約) の明細を「売れた日」ごとにまとめ、日別の中央値を返す。
    戻り値: { "YYYY-MM-DD": 中央値(int), ... }

    price は円単位の整数。売れた日付は updated (最終更新 ≒ 成約時刻) を使う。
    """
    by_date = {}
    for r in rows:
        upd = r.get("updated") or ""
        if len(upd) < 10:
            continue
        date = upd[:10]                     # "YYYY-MM-DD"
        try:
            price = int(r.get("price") or 0)
        except (TypeError, ValueError):
            continue
        if price <= 0:
            continue
        by_date.setdefault(date, []).append(price)

    medians = {}
    for date, prices in by_date.items():
        if len(prices) < MIN_SOLD_PER_DAY:
            continue
        medians[date] = int(round(statistics.median(prices)))
    return medians


def merge_card_series(data_dir: str, card_no: str, daily_medians: dict) -> int:
    """
    日別中央値を製品 JSON にマージする (実行をまたいで累積させる)。
    フォーマットは遊々亭側と同じ:
        { 型番: { "upddate": [日付...], "cardPrice": [価格...] } }
    同じ日付の点は新しい値で上書きするので、再実行しても重複しない。
    戻り値: その型番の系列が持つ総データ点数。
    """
    if not daily_medians:
        return 0

    os.makedirs(data_dir, exist_ok=True)
    path = os.path.join(data_dir, product_code_from_cardno(card_no) + ".json")

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            data = {}
    except (FileNotFoundError, json.JSONDecodeError):
        data = {}

    entry = data.get(card_no) or {"upddate": [], "cardPrice": []}
    series = dict(zip(entry.get("upddate", []), entry.get("cardPrice", [])))
    series.update(daily_medians)            # 新しい日付/再計算値で上書き

    dates = sorted(series.keys())
    entry["upddate"] = dates
    entry["cardPrice"] = [series[d] for d in dates]
    data[card_no] = entry

    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)
    return len(dates)


def _norm(s: str) -> str:
    """空白除去 + 大文字化。型番がタイトルに含まれるかの緩い判定用。"""
    return "".join(str(s or "").split()).upper()


def title_has_number(title: str, card_no: str) -> bool:
    """商品タイトルに型番が含まれるか (空白無視・大小無視)。"""
    return _norm(card_no) in _norm(title)


# 型番から (製品, 番号, レアリティ後綴) を切り出す
_CARD_SPLIT_RE = re.compile(r"^(.*)-(\d+)(.*)$")


def rarity_from_cardno(card_no: str) -> str:
    """型番のレアリティ後綴を返す。base (後綴なし) は空文字。 例: BD/W54-070SSP -> SSP"""
    m = _CARD_SPLIT_RE.match(card_no or "")
    return (m.group(3) if m else "").upper()


def title_has_rarity(title: str, rarity: str) -> bool:
    """
    商品タイトルにレアリティ表記が「独立した語」として含まれるか。
    'SP' を探すとき 'SSP' に誤ヒットしないよう、英数字の境界で判定する。
    base (rarity 空) は判定材料が無いので True (除外しない)。
    """
    if not rarity:
        return True
    t = (title or "").upper()
    pat = r"(?<![A-Z0-9])" + re.escape(rarity.upper()) + r"(?![A-Z0-9])"
    return re.search(pat, t) is not None


def pick_keyword(card_no: str, name: str, search_by: str) -> str:
    """
    検索キーワードを決める。
      number: 型番で検索 (精度高・命中数少)
      name:   カード名で検索 (命中数多・別レア混在の恐れ)
      auto:   カード名があれば name、無ければ number
    """
    if search_by == "number":
        return card_no
    if search_by == "name":
        return name or card_no
    return name if name else card_no       # auto


def scrape_market(cards: list, days: float, data_dir: str,
                  category_id: int, delay: float, max_pages: int,
                  search_by: str = "auto", match_mode: str = "loose") -> None:
    """
    各カードについて Mercari の「売り切れ」を検索し、直近 `days` 日ぶんの
    日別中央値を集計して製品 JSON に累積マージする。

    cards: (型番, カード名) のタプル一覧。カード名は検索キーワードに使う。
    search_by: 検索キーワードの選び方 (number / name / auto)。
    match_mode: 出品タイトルでの絞り込み方 (出品パターンの頻度 型4>型2>型3>型1 を踏まえる)。
      loose  … 検索結果をそのまま採用 (recall 最大。型2 の同名別レアも混ざる)。
      rarity … タイトルに「型番」または「レアリティ」を含むものを採用。
               最多の型4 (名前+レア) と最少の型1 (番号+名前) を拾い、
               判別不能な型2 (名前のみ) を除外する。精度と件数のバランスが良い。
      number … タイトルに型番を含むものだけ (型1 のみ。最も少ないので件数は激減)。
    ※ 型3 (番号は商品説明にのみ有り) は検索結果に説明が無いため、ここでは拾えない。
    """
    within = timedelta(days=days)
    for i, (card_no, name) in enumerate(cards, 1):
        keyword = pick_keyword(card_no, name, search_by)
        rarity = rarity_from_cardno(card_no)
        label = f"{card_no}" + (f" / {name}" if name and name != card_no else "")
        print(f"\n[{i}/{len(cards)}] {label}  (keyword=\"{keyword}\") を検索中 …")
        rows = scrape(
            category_id=category_id,
            status=["STATUS_SOLD_OUT"],     # 成約価格のみ
            within=within,
            max_pages=max_pages,
            delay=delay,
            time_field="updated",           # 売れた日 (最終更新) で範囲判定
            keyword=keyword,
        )

        matched = rows
        if match_mode == "number":
            matched = [r for r in rows if title_has_number(r.get("name", ""), card_no)]
            print(f"  検索 {len(rows)} 件 -> 型番一致 {len(matched)} 件 "
                  f"(タイトルに {card_no})")
        elif match_mode == "rarity":
            matched = [r for r in rows
                       if title_has_number(r.get("name", ""), card_no)
                       or title_has_rarity(r.get("name", ""), rarity)]
            rlabel = rarity if rarity else "(base:除外せず)"
            print(f"  検索 {len(rows)} 件 -> 型番/レア一致 {len(matched)} 件 "
                  f"(レア={rlabel})")

        medians = aggregate_sold_medians(matched)
        total = merge_card_series(data_dir, card_no, medians)
        if medians:
            latest = sorted(medians.keys())[-1]
            print(f"  成約 {len(matched)} 件 -> 日別中央値 {len(medians)} 日分 "
                  f"(最新 {latest}: {medians[latest]}円 / 系列 累計 {total} 点)")
        else:
            print(f"  成約データなし (この期間に売り切れ無し)。系列は変更なし。")
        time.sleep(delay)


# --- 状態 (既知 ID) の管理 --------------------------------------------------

def load_state(path: str) -> dict:
    """
    既知の商品 ID を読み込む。形式: { item_id: first_seen_iso8601 }
    ファイルが無ければ空で始める。
    """
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_state(path: str, state: dict) -> None:
    # 古すぎる ID を掃除してファイルの肥大化を防ぐ
    cutoff = datetime.now(timezone.utc) - STATE_RETENTION
    pruned = {}
    for item_id, seen_iso in state.items():
        try:
            seen_dt = datetime.fromisoformat(seen_iso)
        except (ValueError, TypeError):
            seen_dt = datetime.now(timezone.utc)  # 壊れていたら残す
        if seen_dt >= cutoff:
            pruned[item_id] = seen_iso
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(pruned, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)  # アトミックに置き換え (書き込み途中の破損を防ぐ)


# --- 出力 -------------------------------------------------------------------

def append_master(rows: list, path: str) -> None:
    """新着分を累積用マスター JSON に追記する (先頭が新しい順)。"""
    try:
        with open(path, "r", encoding="utf-8") as f:
            existing = json.load(f)
        if not isinstance(existing, list):
            existing = []
    except (FileNotFoundError, json.JSONDecodeError):
        existing = []
    merged = rows + existing
    with open(path, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

def save_csv(rows: list, path: str) -> None:
    fields = ["id", "name", "price", "status", "created", "updated", "url", "thumbnail"]
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def save_json(rows: list, path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)


# --- エントリポイント -------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="メルカリ ヴァイスシュヴァルツ スクレイパー")
    ap.add_argument("--category-id", type=int, default=DEFAULT_CATEGORY_ID,
                    help="カテゴリ ID (既定: 1293 = ヴァイスシュヴァルツ)")
    ap.add_argument("--hours", type=float, default=24.0,
                    help="何時間以内のものを対象にするか (既定: 24)")
    ap.add_argument("--by", choices=["created", "updated"], default="created",
                    help="期間判定に使う時刻: created=出品日時 / updated=更新日時 (既定: created)")
    ap.add_argument("--max-pages", type=int, default=40,
                    help="最大ページ数 (既定: 40)")
    ap.add_argument("--delay", type=float, default=1.0,
                    help="ページ間の待機秒数 (既定: 1.0)")
    ap.add_argument("--out", default="mercari_ws",
                    help="出力ファイル名 (拡張子なし。.csv と .json を生成)")
    ap.add_argument("--monitor", action="store_true",
                    help="監視モード: 既知 ID を状態ファイルで管理し、新着のみ出力する")
    ap.add_argument("--sold-recent", action="store_true",
                    help="成約モード: 直近 N 日以内に成約 (売り切れ) した商品を抓って出力する "
                         "(日数は --days で指定、既定 30 日)")
    ap.add_argument("--state-file", default=DEFAULT_STATE_FILE,
                    help=f"既知 ID の状態ファイル (既定: {DEFAULT_STATE_FILE})")
    # --- 市場価格モード (カード単位の成約中央値を集計) ---
    ap.add_argument("--market", action="store_true",
                    help="市場価格モード: 型番ごとに売り切れの成約中央値を集計し、"
                         "製品 JSON (upddate/cardPrice) に累積する")
    ap.add_argument("--card", action="append", default=[], metavar="型番",
                    help="対象の型番 (例: BD/W54-070SSP)。複数回指定可")
    ap.add_argument("--cards-file", default=None,
                    help="型番一覧を書いた JSON 配列ファイル (--card の代わり/併用)")
    ap.add_argument("--days", type=float, default=3.0,
                    help="市場価格 / 成約モードで遡る日数 (既定: 3。成約モードでは 30 を推奨)")
    ap.add_argument("--keyword", default="",
                    help="成約モードの検索キーワード (空=カテゴリ全体 / 型番・カード名で絞り込み)")
    ap.add_argument("--data-dir", default=DEFAULT_MARKET_DIR,
                    help=f"市場価格 JSON の出力フォルダ (既定: {DEFAULT_MARKET_DIR})")
    ap.add_argument("--search-by", choices=["auto", "name", "number"], default="auto",
                    help="検索キーワード: name=カード名 / number=型番 / "
                         "auto=名前があれば名前 (既定: auto)")
    ap.add_argument("--match", choices=["loose", "rarity", "number"], default="rarity",
                    help="タイトルでの絞り込み: "
                         "loose=そのまま / "
                         "rarity=タイトルに型番orレアリティを含むもの(型4+型1を採用・推奨) / "
                         "number=型番を含むものだけ(型1のみ) "
                         "(既定: rarity)")
    args = ap.parse_args()

    # === 市場価格モード =====================================================
    if args.market:
        # cards: (型番, カード名) のタプル一覧を組み立てる。
        #   --card       -> (型番, None)  ※名前が無いので number 検索にフォールバック
        #   --cards-file -> 文字列配列 ["型番", ...] か、
        #                    ペア配列 [["型番","カード名"], ...] の両方を許容
        cards = [(cn, None) for cn in args.card if cn]
        if args.cards_file:
            with open(args.cards_file, "r", encoding="utf-8") as f:
                loaded = json.load(f)
            if not isinstance(loaded, list):
                ap.error("--cards-file は JSON 配列である必要があります")
            for item in loaded:
                if isinstance(item, (list, tuple)) and item:
                    cards.append((str(item[0]), str(item[1]) if len(item) > 1 else None))
                elif isinstance(item, str):
                    cards.append((item, None))
        # 型番で重複除去しつつ順序を保つ (名前は最初に出たものを採用)
        seen = set()
        uniq = []
        for card_no, name in cards:
            if card_no and card_no not in seen:
                seen.add(card_no)
                uniq.append((card_no, name))
        cards = uniq
        if not cards:
            ap.error("市場価格モードには --card か --cards-file が必要です")

        with_name = sum(1 for _, n in cards if n)
        print(f"市場価格モード: {len(cards)} 型番 (名前あり {with_name}) / "
              f"検索={args.search_by}, 一致={args.match} / "
              f"直近 {args.days} 日の成約中央値 -> {args.data_dir}/")
        scrape_market(
            cards=cards,
            days=args.days,
            data_dir=args.data_dir,
            category_id=args.category_id,
            delay=args.delay,
            max_pages=args.max_pages,
            search_by=args.search_by,
            match_mode=args.match,
        )
        print(f"\n完了: 市場価格 JSON を {args.data_dir}/ に書き出しました。")
        return

    # === 成約モード (直近 N 日の売り切れを出力) =============================
    if args.sold_recent:
        print(f"成約モード: category_id={args.category_id}, "
              f"status=sold_out, 直近 {args.days} 日以内の成約 (updated 判定)"
              + (f', keyword=\"{args.keyword}\"' if args.keyword else ""))
        rows = scrape_sold_recent(
            days=args.days,
            category_id=args.category_id,
            keyword=args.keyword,
            max_pages=args.max_pages,
            delay=args.delay,
        )
        print(f"\n完了: {len(rows)} 件が直近 {args.days} 日以内に成約しました。")
        if rows:
            save_csv(rows, args.out + ".csv")
            save_json(rows, args.out + ".json")
            print(f"保存: {args.out}.csv / {args.out}.json")
        return

    within = timedelta(hours=args.hours)
    print(f"検索開始: category_id={args.category_id}, "
          f"status=sold_out|trading, sort=新しい順, "
          f"期間={args.hours}時間以内 ({args.by})"
          + (" [監視モード]" if args.monitor else ""))

    rows = scrape(
        category_id=args.category_id,
        status=DEFAULT_STATUS,
        within=within,
        max_pages=args.max_pages,
        delay=args.delay,
        time_field=args.by,
    )

    if not args.monitor:
        # 従来どおりの全量出力 (毎回上書き)
        print(f"\n完了: {len(rows)} 件が条件に合致しました。")
        if rows:
            save_csv(rows, args.out + ".csv")
            save_json(rows, args.out + ".json")
            print(f"保存: {args.out}.csv / {args.out}.json")
        return

    # --- 監視モード: 実行をまたいで新着だけを抽出 ---
    state = load_state(args.state_file)
    now_iso = datetime.now(timezone.utc).isoformat()
    new_rows = [r for r in rows if r["id"] not in state]

    for r in new_rows:
        state[r["id"]] = now_iso
    save_state(args.state_file, state)

    print(f"\n完了: 範囲内 {len(rows)} 件 / うち新着 {len(new_rows)} 件 "
          f"(既知 {len(state) - len(new_rows)} 件はスキップ)")

    if new_rows:
        # 本次新着 (上書き) + 累積マスター (追記)
        save_csv(new_rows, args.out + "_new.csv")
        save_json(new_rows, args.out + "_new.json")
        append_master(new_rows, args.out + "_all.json")
        print(f"保存: {args.out}_new.csv / {args.out}_new.json "
              f"(累積: {args.out}_all.json)")
        for r in new_rows:
            print(f"  + {r['created']}  {r['price']:>7}円  {r['name']}")
    else:
        print("新着はありませんでした。")


if __name__ == "__main__":
    main()

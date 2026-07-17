# -*- coding: utf-8 -*-
"""
cardDictionary.json から mercari_scraper.py 用の型番リスト (cards.json) を生成する。

cardDictionary.json は [型番, カード名] の配列 (約 6 万件)。
全件を毎日スクレイプするのは非現実的 (レート制限で即ブロック) なので、
本ツールは「製品」「レアリティ後綴」「件数上限」で必ず絞り込ませる。

出力: 型番の JSON 配列。そのまま
        python mercari_scraper.py --market --cards-file cards.json
に渡せる。

使用例:
  # 1 製品だけ
  python make_cards_list.py --product BD/W54 --out cards.json

  # 複数製品 + 高レアのみ (base/S/SP を除外し、値の付きやすい後綴だけ)
  python make_cards_list.py --product BD/W54 --product BD/W73 \
      --include-suffix SSP --include-suffix SP --include-suffix SEC --out cards.json

  # 製品一覧をファイルで渡す
  python make_cards_list.py --products-file products.json --out cards.json
"""

import argparse
import json
import re
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

DEFAULT_DICT = "../json/cardDictionary.json"

# 型番 -> (製品コード, レアリティ後綴)
#   "BD/W54-070SSP" -> ("BD/W54", "SSP")
#   "ZM/W03-005"    -> ("ZM/W03", "")     ← base (後綴なし)
_CARD_RE = re.compile(r"^(.*)-(\d+)(.*)$")


def parse_card(card_no: str):
    m = _CARD_RE.match(card_no)
    if not m:
        return None, None
    return m.group(1), m.group(3)          # (製品コード, 後綴)


def load_card_numbers(dict_path: str) -> list:
    with open(dict_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    nums = []
    for row in data:
        # 形式: ["型番", "カード名"] 。文字列だけの場合も許容
        if isinstance(row, (list, tuple)) and row:
            nums.append((str(row[0]), str(row[1]) if len(row) > 1 else ""))
        elif isinstance(row, str):
            nums.append((row, ""))
    # 型番で重複除去 (順序保持)
    seen = set()
    out = []
    for no, name in nums:
        if no not in seen:
            seen.add(no)
            out.append((no, name))
    return out


def norm_suffix(s: str) -> str:
    """後綴の正規化。空文字 / 'base' を base として扱う。大文字小文字は無視。"""
    s = (s or "").strip()
    if s.lower() == "base":
        return ""
    return s.upper()


def main():
    ap = argparse.ArgumentParser(
        description="cardDictionary.json から型番リスト (cards.json) を生成")
    ap.add_argument("--dict", default=DEFAULT_DICT,
                    help=f"cardDictionary.json のパス (既定: {DEFAULT_DICT})")
    ap.add_argument("--out", default="cards.json",
                    help="出力する型番リスト JSON (既定: cards.json)")
    ap.add_argument("--product", action="append", default=[], metavar="製品",
                    help="対象製品コード (例: BD/W54)。複数回指定可")
    ap.add_argument("--products-file", default=None,
                    help="製品コード一覧の JSON 配列ファイル")
    ap.add_argument("--include-suffix", action="append", default=[], metavar="後綴",
                    help="この後綴のみ含める (例: SSP SP SEC。'base' で後綴なし)")
    ap.add_argument("--exclude-suffix", action="append", default=[], metavar="後綴",
                    help="この後綴を除外する ('base' で後綴なしを除外)")
    ap.add_argument("--limit", type=int, default=0,
                    help="出力件数の上限 (0=無制限)")
    ap.add_argument("--all", action="store_true",
                    help="製品/件数の絞り込みなしで全件出力を明示的に許可する (非推奨)")
    ap.add_argument("--delay", type=float, default=2.0,
                    help="所要時間の見積り用: 1 型番あたりの想定秒数 (既定: 2.0)")
    ap.add_argument("--with-name", action="store_true",
                    help="[型番, カード名] のペア配列で出力する "
                         "(mercari_scraper.py --search-by name 用に推奨)")
    args = ap.parse_args()

    products = list(args.product)
    if args.products_file:
        with open(args.products_file, "r", encoding="utf-8") as f:
            loaded = json.load(f)
        if not isinstance(loaded, list):
            ap.error("--products-file は JSON 配列である必要があります")
        products.extend(str(p) for p in loaded)
    product_set = set(products)

    include = {norm_suffix(s) for s in args.include_suffix}
    exclude = {norm_suffix(s) for s in args.exclude_suffix}

    # 暴発防止: 何の絞り込みも無い場合は拒否する
    if not product_set and not include and not args.limit and not args.all:
        ap.error("絞り込み条件がありません。--product / --include-suffix / --limit の"
                 "いずれかを指定するか、全件を意図するなら --all を付けてください。")

    all_entries = load_card_numbers(args.dict)

    selected = []
    for card_no, name in all_entries:
        product, suffix = parse_card(card_no)
        if product is None:
            continue
        if product_set and product not in product_set:
            continue
        suf = suffix.upper()
        if include and suf not in include:
            continue
        if exclude and suf in exclude:
            continue
        selected.append((card_no, name))

    selected.sort(key=lambda x: x[0])
    if args.limit and len(selected) > args.limit:
        selected = selected[:args.limit]

    # 出力形式: --with-name ならペア [[型番, 名前], ...]、既定は型番のみ [型番, ...]
    if args.with_name:
        payload = [[no, name] for no, name in selected]
    else:
        payload = [no for no, _ in selected]
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    # サマリー + レート制限の目安
    est_min = len(selected) * args.delay / 60.0
    fmt = "ペア[型番,名前]" if args.with_name else "型番のみ"
    print(f"辞書 {len(all_entries)} 件 -> 抽出 {len(selected)} 件を {args.out} に書き出しました ({fmt})。")
    if product_set:
        print(f"  製品フィルタ: {', '.join(sorted(product_set))}")
    if include:
        print(f"  含める後綴: {', '.join(sorted(s or 'base' for s in include))}")
    if exclude:
        print(f"  除外後綴:   {', '.join(sorted(s or 'base' for s in exclude))}")
    print(f"  1 型番 {args.delay} 秒想定 -> 1 回の実行に約 {est_min:.1f} 分")
    if len(selected) > 500:
        print("  ⚠ 件数が多いとレート制限に掛かりやすくなります。"
              "製品や後綴でさらに絞る / --delay を大きくすることを推奨します。")


if __name__ == "__main__":
    main()

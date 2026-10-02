# -*- coding: utf-8 -*-
"""
WS 官方「入賞者デッキレシピ」爬蟲

來源:
  https://ws-tcg.com/deckrecipe/recipe_prize/          (列表，每頁 20 場大會)
  https://ws-tcg.com/deckrecipe/<id>/                  (單場大會，含每副入賞牌組的完整卡表)

只收 2019 年起的結構化頁面（deckrecipeBlock）。更早的頁面只有外連，略過。

輸出 (預設 json/official-decks/):
  index.json        已抓過的大會清單、各作品前綴的牌組數
  <PREFIX>.json     依卡號前綴（例如 BD、HOL）分檔的入賞牌組，供 deckAnalysis.html 讀取

用法:
  python scrapy/ws_official_decks.py              # 增量：只抓新的大會
  python scrapy/ws_official_decks.py --full       # 全部重抓
  python scrapy/ws_official_decks.py --max-pages 2 --delay 2

依存: 只用 Python 標準函式庫
"""

import argparse
import collections
import html
import json
import os
import re
import sys
import time
import urllib.request

BASE = "https://ws-tcg.com/deckrecipe/"
LIST_URL = BASE + "recipe_prize/"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/129.0 Safari/537.36")
SCHEMA_VERSION = 1
MIN_DATE = "2019-01-01"

CARD_TYPE = {"キャラカード": "C", "イベントカード": "E", "クライマックスカード": "X"}
RANK_SCORE = [
    (re.compile(r"準優勝"), 2),
    (re.compile(r"優勝"), 1),
    (re.compile(r"(\d+)\s*位"), None),
    (re.compile(r"ベスト\s*(\d+)"), None),
    (re.compile(r"TOP\s*(\d+)", re.I), None),
]


def fetch(url, retries=3):
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ja"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (i + 1))
    raise RuntimeError("fetch failed: %s (%s)" % (url, last))


def text(s):
    s = re.sub(r"<br\s*/?>", "\n", s or "")
    s = re.sub(r"<[^>]+>", "", s)
    return html.unescape(s).strip()


def parse_list_page(src):
    """回傳 [(event_id, date 'YYYY-MM-DD', title)] 與最大頁數。"""
    out = []
    for eid, inner in re.findall(r'href="https://ws-tcg\.com/deckrecipe/(\d+)/"[^>]*>(.*?)</a>', src, re.S):
        t = re.sub(r"\s+", " ", text(inner))
        m = re.match(r"(\d{4})\.(\d{2})\.(\d{2})\s*(?:入賞者)?\s*(.*)", t)
        if not m:
            continue
        out.append((eid, "%s-%s-%s" % m.group(1, 2, 3), m.group(4).strip()))
    pages = [int(p) for p in re.findall(r"recipe_prize/page/(\d+)/", src)]
    return out, max(pages or [1])


def rank_score(rank):
    for rx, fixed in RANK_SCORE:
        m = rx.search(rank or "")
        if m:
            return fixed if fixed is not None else int(m.group(1))
    return 99


def parse_event_page(src):
    """回傳該大會所有入賞牌組。"""
    chunks = src.split('class="deckrecipeBlock article"')[1:]
    decks = []
    for chunk in chunks:
        meta = {}
        for key, dd in re.findall(r'deckrecipe__metaItem is-([\w_]+)"><dt>.*?</dt><dd>(.*?)</dd>', chunk, re.S):
            meta[key] = re.sub(r"\s+", " ", text(dd))
        cards = []
        for wrap in re.findall(r'deckrecipe__cardListsTitle">(.*?)</h4>(.*?)</table>', chunk, re.S):
            ctype = CARD_TYPE.get(text(wrap[0]), "?")
            for no, name, lvcost, qty in re.findall(
                    r"<tr[^>]*>\s*<td><span>(.*?)</span></td>\s*<td><span>(.*?)</span></td>\s*"
                    r"<td><span>(.*?)</span></td>\s*<td><span>(.*?)</span></td>", wrap[1], re.S):
                n = re.sub(r"\D", "", text(qty))
                no = text(no).replace("\\", "/")
                if not no or not n:
                    continue
                cards.append({"no": no, "name": text(name), "lvcost": text(lvcost), "type": ctype, "qty": int(n)})
        if not cards:
            continue
        decks.append({
            "block": meta.get("title", ""),
            "rank": meta.get("ranking", ""),
            "code": meta.get("deck_code", ""),
            "deckName": meta.get("deck_name", ""),
            "kind": meta.get("deck_kind", ""),
            "neoTitle": meta.get("deck_kind__user_id", ""),
            "cards": cards,
        })
    return decks


def deck_prefix(cards):
    c = collections.Counter()
    for x in cards:
        m = re.match(r"([A-Za-z0-9]+)/", x["no"])
        if m:
            c[m.group(1).upper()] += x["qty"]
    return c.most_common(1)[0][0] if c else ""


def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def write_json(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "json", "official-decks"))
    ap.add_argument("--full", action="store_true", help="忽略已抓過的大會，全部重抓")
    ap.add_argument("--max-pages", type=int, default=0, help="最多讀幾頁列表（0 = 讀到 2019 為止）")
    ap.add_argument("--delay", type=float, default=1.5, help="每次請求間隔秒數")
    args = ap.parse_args()

    out = os.path.abspath(args.out)
    os.makedirs(out, exist_ok=True)
    index_path = os.path.join(out, "index.json")
    index = load_json(index_path, {}) if not args.full else {}
    events = index.get("events", {})

    by_prefix = {}
    if not args.full:
        for p in index.get("prefixes", {}):
            by_prefix[p] = load_json(os.path.join(out, p + ".json"), None)
    by_prefix = {p: d for p, d in by_prefix.items() if d}

    todo = []
    page, last_page = 1, 1
    while True:
        src = fetch(LIST_URL if page == 1 else "%spage/%d/" % (LIST_URL, page))
        rows, last_page = parse_list_page(src)
        fresh = [r for r in rows if r[0] not in events and r[1] >= MIN_DATE]
        todo.extend(fresh)
        old_enough = any(r[1] < MIN_DATE for r in rows)
        print("list page %d/%d: %d events, %d new" % (page, last_page, len(rows), len(fresh)), flush=True)
        if old_enough or page >= last_page or (args.max_pages and page >= args.max_pages):
            break
        if not args.full and rows and not fresh:
            break
        page += 1
        time.sleep(args.delay)

    added = 0
    for i, (eid, date, title) in enumerate(todo, 1):
        time.sleep(args.delay)
        try:
            decks = parse_event_page(fetch(BASE + eid + "/"))
        except RuntimeError as e:
            print("  skip %s: %s" % (eid, e), flush=True)
            continue
        events[eid] = {"date": date, "title": title, "decks": len(decks)}
        for d in decks:
            prefix = deck_prefix(d["cards"])
            if not prefix:
                continue
            bucket = by_prefix.setdefault(prefix, {"prefix": prefix, "cards": {}, "events": {}, "decks": []})
            bucket["events"][eid] = {"date": date, "title": title}
            for c in d["cards"]:
                bucket["cards"].setdefault(c["no"], [c["name"], c["lvcost"], c["type"]])
            bucket["decks"].append({
                "e": eid,
                "b": d["block"],
                "r": d["rank"],
                "rs": rank_score(d["rank"]),
                "k": d["kind"],
                "t": d["neoTitle"],
                "n": d["deckName"],
                "code": d["code"],
                "c": [[c["no"], c["qty"]] for c in d["cards"]],
            })
            added += 1
        print("[%d/%d] %s %s %s: %d decks" % (i, len(todo), eid, date, title, len(decks)), flush=True)

    updated = time.strftime("%Y-%m-%d")
    prefixes = {}
    for p, bucket in by_prefix.items():
        bucket["decks"].sort(key=lambda d: (bucket["events"].get(d["e"], {}).get("date", ""), -d["rs"]), reverse=True)
        bucket["schemaVersion"] = SCHEMA_VERSION
        bucket["updated"] = updated
        write_json(os.path.join(out, p + ".json"), bucket)
        dates = [bucket["events"][d["e"]]["date"] for d in bucket["decks"] if d["e"] in bucket["events"]]
        prefixes[p] = {"decks": len(bucket["decks"]), "latest": max(dates) if dates else ""}

    write_json(index_path, {
        "schemaVersion": SCHEMA_VERSION,
        "source": LIST_URL,
        "updated": updated,
        "minDate": MIN_DATE,
        "prefixes": dict(sorted(prefixes.items())),
        "events": dict(sorted(events.items(), key=lambda kv: kv[1]["date"], reverse=True)),
    })
    print("done: %d new decks, %d prefixes, %d events" % (added, len(prefixes), len(events)))
    return 0


if __name__ == "__main__":
    sys.exit(main())

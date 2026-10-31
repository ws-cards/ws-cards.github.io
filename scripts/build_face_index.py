#!/usr/bin/env python3
"""Build a single-series card-face fingerprint JSON for deckPhotoAnalysis.html.

Algorithm must stay in sync with deckPhotoAnalysis.html (algo=rgb-grid-v1):
  - resize to 48x66
  - 6x8 cell mean RGB (+ center-art mean RGB)
  - L2-normalize

Examples:
  python3 scripts/build_face_index.py --series BD/W54
  python3 scripts/build_face_index.py --series BD_W54 --concurrency 8
  python3 scripts/build_face_index.py --series BD/W54 --out-dir json/face-index
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CONTENT_WS_BASE = (
    "https://storage.googleapis.com/divine-vehicle-292507.appspot.com/"
    "cardDataInfo/content/ws/"
)
IMG_BASE = "https://imgs.devilfox.net/ws/"
WS_CARD_IMAGE_BASE = "https://ws-tcg.com/wordpress/wp-content/images/cardlist"
ALGO = "rgb-grid-v1"
VERSION = 1
FP_W, FP_H, FP_COLS, FP_ROWS = 48, 66, 6, 8
FP_DIMS = FP_COLS * FP_ROWS * 3 + 3  # 147

CARD_NO_RE = re.compile(r"^[A-Za-z0-9]+/[A-Za-z0-9]+-[A-Za-z0-9]+$")
BASE_NO_RE = re.compile(r"^([A-Za-z0-9]+/[A-Za-z0-9]+-\d+)", re.I)
KIND_GCS = {"0": "角色", "1": "事件", "2": "CX"}
KIND_DECKLOG = {"2": "角色", "3": "事件", "4": "CX"}


def normalize_series(raw: str) -> tuple[str, str]:
    s = raw.strip().replace("\\", "/")
    if "_" in s and "/" not in s:
        code = s.replace("_", "/", 1)
    else:
        code = s
    # WS series codes are typically like BD/W54 — normalize slash form
    parts = code.split("/")
    if len(parts) != 2:
        raise SystemExit(f"系列代碼格式錯誤：{raw}（例：BD/W54）")
    code = f"{parts[0]}/{parts[1]}"
    title = code.replace("/", "_")
    return code, title


def normalize_card_no(card_no: str) -> str:
    return str(card_no or "").strip().replace("\\", "/").upper()


def looks_like_ws(card_no: str) -> bool:
    return bool(CARD_NO_RE.match(card_no.strip()))


def base_card_no(card_no: str) -> str:
    m = BASE_NO_RE.match(card_no)
    return m.group(1).upper() if m else normalize_card_no(card_no)


def kind_label_of(raw: dict[str, Any] | None) -> str:
    if not raw:
        return ""
    k = raw.get("kind", raw.get("cardkind"))
    key = str(k) if k is not None else ""
    return KIND_GCS.get(key) or KIND_DECKLOG.get(key) or ""


def build_image_urls(card_number: str) -> tuple[str, str]:
    card_num = str(card_number or "").strip()
    if " " in card_num:
        card_num = card_num.split(" ", 1)[0]
    if not card_num or "-" not in card_num:
        return "", ""
    card_first = card_num[0]
    card_second = card_num[: card_num.index("-")].replace("/", "_")
    card_third = card_num.replace("/", "_").replace("-", "_")
    primary = f"{IMG_BASE}{card_second.lower()}/{card_third.lower()}.png"
    fallback = (
        f"{WS_CARD_IMAGE_BASE}/"
        f"{card_first.lower()}/{card_second.lower()}/{card_third.lower()}.png"
    )
    return primary, fallback


def http_get_json(url: str, timeout: float = 60.0) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": "ws-cards-face-index/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def http_get_bytes(url: str, timeout: float = 60.0) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "ws-cards-face-index/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def load_set_payload(title_code: str) -> dict[str, Any]:
    remote = f"{CONTENT_WS_BASE}{title_code}.json"
    local = ROOT / "json" / f"{title_code}.json"
    try:
        data = http_get_json(remote)
        return data
    except Exception as err:
        if local.is_file():
            return json.loads(local.read_text(encoding="utf-8"))
        raise SystemExit(f"無法載入卡表 {title_code}：{err}") from err


def index_set_payload(data: Any) -> dict[str, Any]:
    by_id: dict[str, Any] = {}
    if not isinstance(data, dict):
        return by_id
    cards = data.get("cards")
    if isinstance(cards, list):
        for c in cards:
            if not isinstance(c, dict):
                continue
            cid = c.get("id") or c.get("cardno")
            if cid:
                by_id[str(cid)] = c
        return by_id
    for k, v in data.items():
        if k == "metadata":
            continue
        by_id[str(k)] = v
    return by_id


def pick_index_cards(by_id: dict[str, Any]) -> list[dict[str, Any]]:
    best: dict[str, dict[str, Any]] = {}
    for cid, raw in by_id.items():
        card_no = normalize_card_no(cid)
        if not looks_like_ws(card_no):
            continue
        base = base_card_no(card_no)
        score = 1000 - len(card_no)
        if re.search(r"-(?:SSP|SEC|SP|SR|HR|SIR|OFR)$", card_no, re.I):
            score -= 40
        if re.search(r"-P\d+", card_no, re.I) or re.search(r"/.*-T\d+", card_no, re.I):
            score -= 10
        prev = best.get(base)
        if prev and prev["score"] >= score:
            continue
        level = raw.get("level", raw.get("cardlevel")) if isinstance(raw, dict) else None
        try:
            level_n = float(level) if level is not None and str(level) != "" else None
        except (TypeError, ValueError):
            level_n = None
        best[base] = {
            "score": score,
            "cardNo": card_no,
            "name": (raw.get("name") or raw.get("cardname") or card_no)
            if isinstance(raw, dict)
            else card_no,
            "kindLabel": kind_label_of(raw if isinstance(raw, dict) else None),
            "kind": raw.get("kind") if isinstance(raw, dict) else None,
            "level": level_n,
            "color": (raw.get("color") or raw.get("cardcolor") or "")
            if isinstance(raw, dict)
            else "",
        }
    rows = list(best.values())
    rows.sort(key=lambda r: r["cardNo"])
    return rows


def fingerprint_image(img: Image.Image) -> list[float]:
    rgb = img.convert("RGB").resize((FP_W, FP_H), Image.Resampling.BILINEAR)
    # Flattened RGB bytes → (r,g,b) tuples without deprecated getdata()
    raw = rgb.tobytes()
    pixels = [
        (raw[i], raw[i + 1], raw[i + 2])
        for i in range(0, len(raw), 3)
    ]
    vec: list[float] = []
    cell_w = FP_W / FP_COLS
    cell_h = FP_H / FP_ROWS
    for ry in range(FP_ROWS):
        for cx in range(FP_COLS):
            x0 = int(cx * cell_w)
            x1 = int((cx + 1) * cell_w)
            y0 = int(ry * cell_h)
            y1 = int((ry + 1) * cell_h)
            r = g = b = n = 0
            for y in range(y0, y1):
                row = y * FP_W
                for x in range(x0, x1):
                    pr, pg, pb = pixels[row + x]
                    r += pr
                    g += pg
                    b += pb
                    n += 1
            vec.extend([r / n / 255.0, g / n / 255.0, b / n / 255.0])

    mx0, mx1 = int(FP_W * 0.12), int(FP_W * 0.88)
    my0, my1 = int(FP_H * 0.1), int(FP_H * 0.72)
    cr = cg = cb = cn = 0
    for y in range(my0, my1):
        row = y * FP_W
        for x in range(mx0, mx1):
            pr, pg, pb = pixels[row + x]
            cr += pr
            cg += pg
            cb += pb
            cn += 1
    vec.extend([cr / cn / 255.0, cg / cn / 255.0, cb / cn / 255.0])

    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [round(v / norm, 6) for v in vec]


def load_card_image(card_no: str) -> tuple[Image.Image, str]:
    primary, fallback = build_image_urls(card_no)
    last_err: Exception | None = None
    for url in (primary, fallback):
        if not url:
            continue
        try:
            data = http_get_bytes(url)
            img = Image.open(BytesIO(data))
            img.load()
            return img, url
        except Exception as err:  # noqa: BLE001 - collect and try next
            last_err = err
    raise RuntimeError(f"image load failed for {card_no}: {last_err}")


def process_card(card: dict[str, Any]) -> dict[str, Any] | None:
    try:
        img, url = load_card_image(card["cardNo"])
        fp = fingerprint_image(img)
        if len(fp) != FP_DIMS:
            raise RuntimeError(f"bad fp dims {len(fp)}")
        out = {
            "cardNo": card["cardNo"],
            "name": card.get("name") or card["cardNo"],
            "kindLabel": card.get("kindLabel") or "",
            "imageUrl": url,
            "fp": fp,
        }
        if card.get("level") is not None and not (
            isinstance(card["level"], float) and math.isnan(card["level"])
        ):
            out["level"] = card["level"]
        if card.get("color"):
            out["color"] = card["color"]
        if card.get("kind") is not None:
            out["kind"] = card["kind"]
        return out
    except Exception as err:  # noqa: BLE001
        print(f"  skip {card['cardNo']}: {err}", file=sys.stderr)
        return None


def update_meta(meta_path: Path, entry: dict[str, Any], fp_meta: dict[str, Any]) -> None:
    if meta_path.is_file():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    else:
        meta = {"version": VERSION, "algo": ALGO, "fp": fp_meta, "series": []}
    meta["version"] = VERSION
    meta["algo"] = ALGO
    meta["fp"] = fp_meta
    meta["updatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    series = meta.get("series") or []
    if not isinstance(series, list):
        series = []
    code = entry["code"]
    series = [s for s in series if isinstance(s, dict) and s.get("code") != code]
    series.append(entry)
    series.sort(key=lambda s: str(s.get("code") or ""))
    meta["series"] = series
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build one series face-index JSON")
    parser.add_argument("--series", required=True, help="Series code, e.g. BD/W54 or BD_W54")
    parser.add_argument(
        "--out-dir",
        default=str(ROOT / "json" / "face-index"),
        help="Output directory for face-index JSON files",
    )
    parser.add_argument("--concurrency", type=int, default=8)
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Optional max cards (debug). 0 = all",
    )
    args = parser.parse_args()

    series_code, title_code = normalize_series(args.series)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{title_code}.json"
    meta_path = out_dir / "meta.json"

    print(f"series={series_code} titleCode={title_code}")
    data = load_set_payload(title_code)
    by_id = index_set_payload(data)
    cards = pick_index_cards(by_id)
    if args.limit and args.limit > 0:
        cards = cards[: args.limit]
    if not cards:
        raise SystemExit("此系列沒有可用卡號")
    print(f"cards to index: {len(cards)}")

    built: list[dict[str, Any]] = []
    failed = 0
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=max(1, args.concurrency)) as pool:
        futures = {pool.submit(process_card, c): c["cardNo"] for c in cards}
        done = 0
        for fut in as_completed(futures):
            done += 1
            row = fut.result()
            if row is None:
                failed += 1
            else:
                built.append(row)
            if done % 20 == 0 or done == len(cards):
                print(f"  progress {done}/{len(cards)} ok={len(built)} fail={failed}")

    built.sort(key=lambda r: r["cardNo"])
    if not built:
        raise SystemExit("沒有成功建立任何指紋")

    fp_meta = {
        "w": FP_W,
        "h": FP_H,
        "cols": FP_COLS,
        "rows": FP_ROWS,
        "dims": FP_DIMS,
    }
    built_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = {
        "series": series_code,
        "titleCode": title_code,
        "version": VERSION,
        "algo": ALGO,
        "fp": fp_meta,
        "builtAt": built_at,
        "cardCount": len(built),
        "skipped": failed,
        "cards": built,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

    update_meta(
        meta_path,
        {
            "code": series_code,
            "titleCode": title_code,
            "file": f"{title_code}.json",
            "cards": len(built),
            "skipped": failed,
            "builtAt": built_at,
            "algo": ALGO,
            "version": VERSION,
        },
        fp_meta,
    )

    elapsed = time.time() - t0
    size_kb = out_path.stat().st_size / 1024
    print(
        f"wrote {out_path.relative_to(ROOT)} ({size_kb:.1f} KiB), "
        f"meta={meta_path.relative_to(ROOT)}, ok={len(built)} skip={failed} in {elapsed:.1f}s"
    )


if __name__ == "__main__":
    main()

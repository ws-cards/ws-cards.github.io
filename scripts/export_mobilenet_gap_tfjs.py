#!/usr/bin/env python3
"""Deprecated exporter.

MobileNet face-index now uses the same @tensorflow-models/mobilenet package
in Node (build) and the browser (query), so a separate TF.js conversion step
is no longer required.

Build indexes with:
  node scripts/mobilenet-face/build_face_index.mjs --series BD/W54

Or via the Python front-door:
  python3 scripts/build_face_index.py --series BD/W54 --algo mobilenetv2-gap-v1
"""

from __future__ import annotations

import sys


def main() -> None:
    print(
        "此腳本已停用。請改用：\n"
        "  node scripts/mobilenet-face/build_face_index.mjs --series BD/W54\n"
        "或：\n"
        "  python3 scripts/build_face_index.py --series BD/W54 --algo mobilenetv2-gap-v1",
        file=sys.stderr,
    )
    raise SystemExit(2)


if __name__ == "__main__":
    main()

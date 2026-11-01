"""Turn generated lesson-test pictures into app assets (src/assets/images/lesson-tests/*.webp).

    python3 scripts/assets/lesson-test-art/cut.py b1l04-drinks:strip b1l04-menu:single

A `strip` is a 3-panel picture cut at its white gutters into <name>-1/-2/-3 (answer pictures, 560 px);
a `single` is converted whole (1280 px). Sources come from output/lesson-test-art/<name>.png. A cut picture
replaces its placeholder and leaves pending.json (see placeholders.py).
"""
import json
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "output/lesson-test-art"
DEST = ROOT / "src/assets/images/lesson-tests"


def runs(mask):
    """[start, end) runs of True."""
    out, start = [], None
    for index, value in enumerate(mask):
        if value and start is None:
            start = index
        if not value and start is not None:
            out.append((start, index))
            start = None
    if start is not None:
        out.append((start, len(mask)))
    return out


def panels(image):
    """The three panels, found as runs of non-white columns (a box resize averages each column and row)."""
    mask = image.convert("L").point(lambda value: 0 if value > 236 else 255)
    columns = [value / 255 > 0.08 for value in mask.resize((image.width, 1), Image.BOX).getdata()]
    rows = [value / 255 > 0.08 for value in mask.resize((1, image.height), Image.BOX).getdata()]
    cols = [r for r in runs(columns) if r[1] - r[0] > image.width * 0.15]
    spans = [r for r in runs(rows) if r[1] - r[0] > image.height * 0.2]
    if len(cols) != 3 or not spans:
        raise SystemExit(f"expected 3 panels, found {len(cols)} columns / {len(spans)} rows")
    top, bottom = spans[0][0], spans[-1][1]
    return [image.crop((x0, top, x1, bottom)) for x0, x1 in cols]


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    pending_path = Path(__file__).resolve().parent / "pending.json"
    pending = json.loads(pending_path.read_text()) if pending_path.exists() else {}
    for arg in sys.argv[1:]:
        name, kind = arg.split(":")
        image = Image.open(SOURCE / f"{name}.png").convert("RGB")
        if kind == "strip":
            for number, panel in enumerate(panels(image), 1):
                panel.thumbnail((560, 560), Image.LANCZOS)
                panel.save(DEST / f"{name}-{number}.webp", "WEBP", quality=82, method=6)
                pending.pop(f"{name}-{number}", None)  # real art replaces the placeholder
                print(name, number, panel.size)
        else:
            image.thumbnail((1280, 1280), Image.LANCZOS)
            image.save(DEST / f"{name}.webp", "WEBP", quality=84, method=6)
            pending.pop(name, None)
            print(name, image.size)
    if pending_path.exists():
        pending_path.write_text(json.dumps(pending, ensure_ascii=False, indent=1) + "\n")


if __name__ == "__main__":
    main()

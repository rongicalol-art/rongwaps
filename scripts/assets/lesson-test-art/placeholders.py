"""Placeholder pictures for lesson tests whose art is not drawn yet.

    python3 scripts/assets/lesson-test-art/placeholders.py content/lesson-tests/book-1/lesson01.json [...]

Every picture a lesson names that has no file (or is still listed in pending.json) gets a plain card at
src/assets/images/lesson-tests/<name>.webp showing what the picture will show: the description for answer
pictures and scenes, the exact writing for menus, receipts and notices. Codex art later replaces the file
with the same name (cut.py removes it from pending.json). Reading pictures (`reading:<id>`) are real art
and are skipped. Rules: content/lesson-tests/README.md → Pictures.
"""
import json
import sys
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
DEST = ROOT / "src/assets/images/lesson-tests"
PENDING = Path(__file__).resolve().parent / "pending.json"
FONT = "/System/Library/Fonts/Hiragino Sans GB.ttc"  # Latin and Chinese (traditional glyphs included)
BG, EDGE, INK, MUTED = (246, 241, 232), (201, 191, 174), (74, 71, 67), (143, 139, 134)


def font(size):
    return ImageFont.truetype(FONT, size)


def card(size):
    image = Image.new("RGB", size, BG)
    draw = ImageDraw.Draw(image)
    w, h = size
    inset = round(min(w, h) * 0.04)
    # Dashed rounded frame: "a picture goes here".
    draw.rounded_rectangle([inset, inset, w - inset, h - inset], radius=inset * 2, outline=EDGE, width=4)
    for x in range(inset * 3, w - inset * 3, 28):
        draw.line([x + 14, inset, x + 28, inset], fill=BG, width=6)
        draw.line([x + 14, h - inset, x + 28, h - inset], fill=BG, width=6)
    return image, draw


def centered(draw, lines, size, top, fnt, fill, gap):
    w = size[0]
    y = top
    for line in lines:
        box = draw.textbbox((0, 0), line, font=fnt)
        draw.text(((w - (box[2] - box[0])) / 2, y), line, font=fnt, fill=fill)
        y += (box[3] - box[1]) + gap
    return y


def block_height(draw, lines, fnt, gap):
    return sum((draw.textbbox((0, 0), line, font=fnt)[3] - draw.textbbox((0, 0), line, font=fnt)[1]) + gap for line in lines)


def described(size, text, wrap):
    image, draw = card(size)
    label, body = font(round(size[1] * 0.04)), font(round(size[1] * 0.06))
    lines = textwrap.wrap(text, wrap)
    height = block_height(draw, ["Picture coming"], label, 24) + block_height(draw, lines, body, 14)
    y = (size[1] - height) / 2
    y = centered(draw, ["Picture coming"], size, y, label, MUTED, 24)
    centered(draw, lines, size, y, body, INK, 14)
    return image


def writing(size, transcript, alt):
    image, draw = card(size)
    lines = [line for line in transcript.replace("\n", "　").split("　") if line.strip()]
    body = font(round(size[1] / max(9, len(lines) + 3)))
    note = font(round(size[1] * 0.03))
    height = block_height(draw, lines, body, 18)
    y = (size[1] - height) / 2 - size[1] * 0.03
    centered(draw, lines, size, y, body, INK, 18)
    centered(draw, textwrap.wrap(f"Picture coming: {alt}", 70), size, size[1] * 0.86, note, MUTED, 8)
    return image


def pictures(lesson):
    """(name, kind, description, transcript) for every drawn picture the lesson names."""
    out = {}
    for slot in lesson["slots"]:
        for item in slot["versions"]:
            kind = item["kind"]
            if kind == "picture-hear":
                out[item["picture"]["picture"]] = ("scene", item["picture"]["alt"], "")
            if kind == "scene-gap":
                out[item["picture"]] = ("scene", item["alt"], "")
            if kind == "realia":
                out[item["picture"]] = ("realia", item["alt"], item["transcript"]["traditional"])
            for question in item["questions"]:
                for choice in question.get("choices") or []:
                    if choice.get("picture"):
                        out[choice["picture"]] = ("panel", choice.get("alt") or choice["picture"], "")
    return {name: value for name, value in out.items() if not name.startswith("reading:")}


def main():
    pending = json.loads(PENDING.read_text()) if PENDING.exists() else {}
    DEST.mkdir(parents=True, exist_ok=True)
    made = 0
    for path in sys.argv[1:]:
        lesson = json.loads(Path(path).read_text())
        for name, (kind, alt, transcript) in sorted(pictures(lesson).items()):
            target = DEST / f"{name}.webp"
            if target.exists() and name not in pending:
                continue  # real art
            if kind == "panel":
                image = described((480, 600), alt, 22)
            elif kind == "realia":
                image = writing((1280, 960), transcript, alt)
            else:
                image = described((1280, 720), alt, 44)
            image.save(target, "WEBP", quality=80, method=6)
            pending[name] = {"lesson": lesson["key"], "kind": kind, "description": alt}
            made += 1
    PENDING.write_text(json.dumps(dict(sorted(pending.items())), ensure_ascii=False, indent=1) + "\n")
    print(f"{made} placeholders; {len(pending)} pictures pending Codex art (pending.json)")


if __name__ == "__main__":
    main()

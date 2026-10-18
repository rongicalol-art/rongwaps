#!/usr/bin/env python3
"""Find every grammar sentence the book's own recordings say cleanly, and cut its clip.

Reads the grammar pages and exercises (content/grammar, content/grammar-practice), finds each
sentence inside one line of content/dialogueAlignment.json, and keeps it only when the
recording can be cut around it: every character matched at 0.85 or better, the word before at
least 0.65 s earlier, and real silence (ffmpeg silencedetect on the local official MP3s,
output/official-audio/book1) after the last syllable and 0.3 s before the next word.
Writes content/audio/grammar_book_clips.json, keyed by the sentence's Chinese characters;
`npm run content:export` attaches a clip to every grammar sentence that has one.

  python3 scripts/audio/matchGrammarBookClips.py
"""
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUDIO_DIR = ROOT / "output/official-audio/book1"
OUT = ROOT / "content/audio/grammar_book_clips.json"
MIN_SCORE = 0.85
LEAD = 0.12            # silence kept before the first syllable
MIN_LEAD = 0.05        # never less than this, at the very start of a track
MIN_PREVIOUS = 0.6     # the player seeks to the nearest frame: the word before must be out of reach
MIN_NEXT = 0.3         # the player stops a little late: the next word must be out of reach
TAIL = 0.15            # silence kept after the last syllable ends
MIN_LAST = 0.45        # the last syllable is never shorter than this
SILENCE = "silencedetect=noise=-40dB:d=0.08"


def han(text):
    return "".join(ch for ch in text if re.match(r"[㐀-鿿]", ch))


def sentences():
    found = set()

    def walk(node):
        if isinstance(node, dict):
            text = node.get("traditional")
            if isinstance(text, str) and "english" in node and not re.search(r"[A-Z][:：]", text):
                if len(han(text)) >= 2:
                    found.add(han(text))
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    for folder in ("content/grammar", "content/grammar-practice"):
        for path in sorted((ROOT / folder).glob("*.json")):
            walk(json.loads(path.read_text()))
    return found


def silence_after(file, at, until):
    """Seconds where sound first stops after `at` (before `until`), or None if it never does."""
    result = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-ss", f"{at:.3f}", "-to", f"{until:.3f}",
         "-i", str(AUDIO_DIR / file), "-af", SILENCE, "-f", "null", "-"],
        capture_output=True, text=True, check=True)
    starts = [float(m) for m in re.findall(r"silence_start: (-?[\d.]+)", result.stderr)]
    starts = [at + s for s in starts if s > 0.2]
    return starts[0] if starts else None


def candidates(alignment, target):
    for reading, record in alignment.items():
        starts = sorted(c["start"] for line in record["lines"] for c in line.get("chars") or [])
        for line in record["lines"]:
            if line.get("unmatched") or not line.get("chars"):
                continue
            chars = [c for c in line["chars"] if han(line["text"][c["charStart"]:c["charEnd"]])]
            said = "".join(line["text"][c["charStart"]:c["charEnd"]] for c in chars)
            at = said.find(target)
            while at >= 0:
                run = chars[at:at + len(target)]
                yield reading, record["audioFile"], line["index"], run, starts
                at = said.find(target, at + 1)


def cut(file, run, starts):
    if min(c.get("score", 0) for c in run) < MIN_SCORE:
        return None
    first, last = run[0]["start"], run[-1]["start"]
    start = max(0.0, round(first - LEAD, 2))
    if first - start < MIN_LEAD:
        return None
    before = [s for s in starts if s < first]
    if before and start - before[-1] < MIN_PREVIOUS:
        return None
    after = [s for s in starts if s > last]
    limit = (after[0] if after else last + 2.0) - MIN_NEXT
    if limit - last < MIN_LAST:
        return None
    quiet = silence_after(file, last, limit)
    if quiet is None:
        return None
    end = round(min(quiet + TAIL, limit), 2)
    return (start, end) if end - last >= MIN_LAST else None


def main():
    alignment = json.loads((ROOT / "content/dialogueAlignment.json").read_text())
    clips = {}
    for target in sorted(sentences()):
        best = None
        for reading, file, line, run, starts in candidates(alignment, target):
            window = cut(file, run, starts)
            if not window:
                continue
            score = min(c.get("score", 0) for c in run)
            if not best or score > best[0]:
                best = (score, {"reading": reading, "line": line, "file": file, "start": window[0], "end": window[1]})
        if best:
            clips[target] = best[1]
    OUT.write_text(json.dumps(clips, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    print(f"{len(clips)} grammar sentences have a clean book clip -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

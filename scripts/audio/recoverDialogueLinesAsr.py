#!/usr/bin/env python3
"""Fill dialogue lines the forced aligner left `unmatched` by speech recognition, between their neighbours.

align_mms.py marks a line unmatched when it can't align every syllable (numbers such as 三萬六千, long narrator
lines, laughter). For each such spoken line (not a stage direction in parentheses), this pass looks only between the
previous matched line's end and the next matched line's start, splits that stretch at its pauses, transcribes each
piece (Qwen3-ASR), and takes the run of pieces whose syllables are the line's (tones aside). The cut must transcribe
to the same syllables on its own. A found line gets start/end and `unmatched: false`, with `recoveredBy` so it can be
told apart; it has no per-character timings (the reader highlights the whole line).

Run: output/qwen-pilot-venv/bin/python scripts/audio/recoverDialogueLinesAsr.py --book 2 --audio-dir <tracks>
Writes content/dialogueAlignment-book<N>.json in place, then run `npm run content:export`.
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from recoverGrammarClipsAsr import ASR_MODEL, LEAD, TAIL, ffmpeg_cut, norm, sounds  # noqa: E402
from mlx_audio.stt.utils import load_model  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
STAGE = re.compile(r"^\s*[（(][^）)]*[）)]\s*$")  # A stage direction: not spoken.
SILENCE_FILTER = "silencedetect=noise=-40dB:d=0.3"
INLINE_STAGE = re.compile(r"[（(][^）)]*[）)]")  # （美心接著說） inside a line is not spoken either.


def spoken(text):
    """A line's syllables as the recording says them: no stage directions, laughter of any length the same."""
    return re.sub(r"(ha )+ha|ha", "ha", sounds(norm(INLINE_STAGE.sub("", text))) + " ").strip()


def pauses_between(track, start, end):
    """Speech pieces inside [start, end] of a track, split at pauses."""
    result = subprocess.run(["ffmpeg", "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", str(track), "-af",
                             SILENCE_FILTER, "-f", "null", "-"], capture_output=True, text=True)
    starts = [float(v) for v in re.findall(r"silence_start: (-?[\d.]+)", result.stderr)]
    ends = [float(v) for v in re.findall(r"silence_end: ([\d.]+)", result.stderr)]
    pieces, cursor = [], 0.0
    for silence_start, silence_end in zip(starts, ends):
        if silence_start - cursor > 0.05:
            pieces.append((start + max(0.0, cursor), start + silence_start))
        cursor = silence_end
    if end - start - cursor > 0.05:
        pieces.append((start + cursor, end))
    return pieces


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--book", type=int, required=True)
    parser.add_argument("--audio-dir", type=Path, required=True, help="Folder with the dialogue tracks.")
    args = parser.parse_args()
    path = ROOT / f"content/dialogueAlignment-book{args.book}.json"
    alignment = json.loads(path.read_text(encoding="utf-8"))
    model = load_model(ASR_MODEL)
    found = missed = 0
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "piece.wav"
        for reading_id, reading in sorted(alignment.items()):
            track = args.audio_dir / reading["audioFile"]
            lines = reading["lines"]
            for index, line in enumerate(lines):
                if not line.get("unmatched") or STAGE.match(line["text"]) or not norm(line["text"]):
                    continue
                before = max((l["end"] for l in lines[:index] if not l.get("unmatched")), default=0.0)
                after = min((l["start"] for l in lines[index + 1:] if not l.get("unmatched")), default=None)
                if after is None:
                    after = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                                                  "csv=p=0", str(track)], capture_output=True, text=True).stdout)
                pieces = []
                for a, b in pauses_between(track, before, after):
                    ffmpeg_cut(track, a, b, wav)
                    pieces.append((a, b, norm(model.generate(str(wav), language="Chinese", max_tokens=256,
                                                             temperature=0, verbose=False).text)))
                target = spoken(line["text"])
                best = None
                for first in range(len(pieces)):
                    for last in range(first, len(pieces)):
                        heard = "".join(p[2] for p in pieces[first:last + 1])
                        if spoken(heard) == target:
                            best = (pieces[first][0], pieces[last][1])
                            break
                    if best:
                        break
                if best:
                    start, end = round(max(before, best[0] - LEAD), 2), round(min(after, best[1] + TAIL), 2)
                    ffmpeg_cut(track, start, end, wav)
                    heard = norm(model.generate(str(wav), language="Chinese", max_tokens=256, temperature=0,
                                                verbose=False).text)
                    if spoken(heard) == target:
                        line.update({"start": start, "end": end, "unmatched": False, "recoveredBy": "asr-span"})
                        found += 1
                        print(f"found  {reading_id} {line['text']}", flush=True)
                        continue
                missed += 1
                print(f"missed {reading_id} {line['text']} | heard {[p[2] for p in pieces]}", flush=True)
    path.write_text(json.dumps(alignment, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{found} lines found, {missed} not found")


if __name__ == "__main__":
    main()

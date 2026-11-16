#!/usr/bin/env python3
"""Find Book 1 grammar sentences on the book's grammar tracks by speech recognition and cut them as book clips.

The forced aligner (alignGrammarTracks.py) rejects many real recordings: it skips sentences with numbers and its
timing rules throw out windows with a long pause inside. This pass works differently and only adds clips:
1. split each grammar track (B1-LL-P-3.mp3) at its pauses, the aligner's rule (-40 dB, 0.3 s);
2. transcribe every piece with Qwen3-ASR;
3. for each grammar sentence or table row without a book clip, find the run of 1-8 consecutive pieces whose words
   are the sentence's words (normalized: simplified characters, Chinese numerals, a few same-sound characters);
4. cut that run and transcribe the cut on its own: it must say the sentence and nothing more.

Run (venv with mlx_audio and opencc): output/qwen-pilot-venv/bin/python scripts/audio/recoverGrammarClipsAsr.py
Reads the exported pack public/data/grammar/book-1.json (run `npm run content:export` first) and
output/official-audio/book1. Writes content/audio/grammar_track_asr_clips.json (keyed by the sentence's Han
characters, like the other clip files), output/grammar-audio/asr-recovery/ (piece transcripts, cut clips, report).
"""
import argparse
import difflib
import json
import re
import subprocess
import tempfile
from pathlib import Path

import opencc
from mlx_audio.stt.utils import load_model

ROOT = Path(__file__).resolve().parents[2]
AUDIO_DIR = ROOT / "output/official-audio/book1"
PACK = ROOT / "public/data/grammar/book-1.json"
OUT_FILE = ROOT / "content/audio/grammar_track_asr_clips.json"
WORK = ROOT / "output/grammar-audio/asr-recovery"
PIECES_FILE = WORK / "pieces.json"
ASR_MODEL = "mlx-community/Qwen3-ASR-0.6B-8bit"
SILENCE_FILTER = "silencedetect=noise=-40dB:d=0.3"
MAX_RUN = 8  # Pieces in one sentence (an A/B dialogue has several pauses).
MIN_SPAN_RATIO = 0.9  # Run's words vs the sentence.
MIN_CLIP_RATIO = 0.9  # The cut clip, transcribed alone, vs the sentence.
MIN_SWAP_RATIO = 0.8  # Same length, a character or two misheard (星期 heard as 新奇): kept, marked for listening.
MAX_EXTRA = 1  # The cut may hear at most this many characters more than the sentence (an ASR slip, not a word).
LEAD, TAIL = 0.10, 0.15  # Silence kept before and after, as the aligner does.
MIN_KEY = 4  # Shorter text only when it already has a voice (a number row like 五十萬); diagram words stay silent.

T2S = opencc.OpenCC("t2s")
DIGITS = dict(zip("0123456789", "零一二三四五六七八九"))
# Characters the recognizer writes for a same-sounding one; the text is still checked as a whole.
SAME = str.maketrans({"她": "他", "它": "他", "妳": "你", "祂": "他", "再": "在", "得": "的", "地": "的", "支": "枝",
                      "只": "枝", "作": "做", "哪": "那", "两": "二", "〇": "零", "俩": "二", "着": "著", "姊": "姐"})
PAREN = re.compile(r"[（(]([^）)]*)[）)]")
TRACK_RE = re.compile(r"^B1-(\d{2})-([12])-3\.mp3$")


def han(text):
    return "".join(c for c in text if "一" <= c <= "鿿" or "㐀" <= c <= "䶿")


UNITS = ["", "十", "百", "千"]
# A speaker label (A：, 孩子：, 媽媽：) at the start of a turn: the book's recording does not say it.
LABEL = re.compile(r"(^|[。？！」\s])\s*(?:[A-Z]|[\u4e00-\u9fff]{1,3})[：:]\s*")


def number_words(match):
    """1,200 -> 一千二百 (how the book reads an amount); short digit runs such as 0930 stay digit by digit."""
    digits = match.group().replace(",", "")
    if len(digits) > 4 or (len(digits) > 1 and digits[0] == "0"):
        return "".join(DIGITS[d] for d in digits)
    out, zero = "", False
    for place, d in zip(range(len(digits) - 1, -1, -1), digits):
        if d == "0":
            zero = bool(out)
            continue
        out += ("零" if zero else "") + DIGITS[d] + UNITS[place]
        zero = False
    return out or "零"


def norm(text):
    text = LABEL.sub(r"\1", text)
    text = re.sub(r"\d+(?=年)", lambda m: "".join(DIGITS[d] for d in m.group()), text)  # Years digit by digit.
    text = re.sub(r"\d[\d,]*", number_words, text)
    text = T2S.convert(text)
    return han(text).translate(SAME)


def variants(text):
    """The sentence as the book may read it: with optional (parenthesized) words, and without them."""
    return {norm(text), norm(PAREN.sub("", text)), norm(PAREN.sub(r"\1", text))} - {""}


def ratio(a, b):
    return difflib.SequenceMatcher(None, a, b).ratio()


def ffmpeg_cut(track, start, end, out, rate=16000):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", str(track),
                    "-ac", "1", "-ar", str(rate), str(out)], check=True)


def speech_pieces(track):
    """Speech between pauses: [(start, end)], as the forced aligner splits a track."""
    result = subprocess.run(["ffmpeg", "-i", str(track), "-af", SILENCE_FILTER, "-f", "null", "-"],
                            capture_output=True, text=True)
    starts = [float(v) for v in re.findall(r"silence_start: (-?[\d.]+)", result.stderr)]
    ends = [float(v) for v in re.findall(r"silence_end: ([\d.]+)", result.stderr)]
    duration = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                     str(track)], capture_output=True, text=True, check=True).stdout)
    pieces, cursor = [], 0.0
    for silence_start, silence_end in zip(starts, ends):
        if silence_start - cursor > 0.05:
            pieces.append((round(max(0.0, cursor), 3), round(silence_start, 3)))
        cursor = silence_end
    if duration - cursor > 0.05:
        pieces.append((round(cursor, 3), round(duration, 3)))
    return pieces


def transcribe_pieces(model, tracks):
    cache = json.loads(PIECES_FILE.read_text()) if PIECES_FILE.exists() else {}
    with tempfile.TemporaryDirectory() as tmp:
        for track in tracks:
            if track.name in cache:
                continue
            rows = []
            for start, end in speech_pieces(track):
                wav = Path(tmp) / "piece.wav"
                ffmpeg_cut(track, start, end, wav)
                text = model.generate(str(wav), language="Chinese", max_tokens=256, temperature=0, verbose=False).text
                rows.append({"start": start, "end": end, "text": text})
            cache[track.name] = rows
            PIECES_FILE.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
            print(f"{track.name}: {len(rows)} pieces", flush=True)
    return cache


def pack_items():
    """Every grammar-page sentence, table row and exercise sentence of Book 1 that has no book clip yet."""
    pack = json.loads(PACK.read_text())
    items = {}

    def row_text(row):
        groups = row.get("columns") or [row.get(k) or [] for k in ("subject", "grammar", "complement")]  # getPatternRowGroups
        tokens = [t for group in groups for t in (group if isinstance(group, list) else []) if isinstance(t, dict)]
        return "".join(f"{t.get('prefix', '')}{t.get('traditional', '')}{t.get('suffix', '')}" for t in tokens)

    def walk(node, lesson, page, where):
        if isinstance(node, list):
            for value in node:
                walk(value, lesson, page, where)
            return
        if not isinstance(node, dict):
            return
        if isinstance(node.get("id"), str) and re.match(r"^B1L\d\d-G", node["id"]):
            page = node["id"]
        text = None
        if isinstance(node.get("traditional"), str) and "english" in node:
            text = node["traditional"]
        elif all(isinstance(node.get(k), list) for k in ("subject", "grammar", "complement")) and not node.get("exampleId"):
            text = row_text(node)
        voice = (node.get("audio") or {}).get("voice")
        if text and voice != "book" and (len(han(text)) >= MIN_KEY or (voice and len(han(text)) >= 2)):
            items.setdefault(han(text), {"key": han(text), "text": text, "lesson": lesson, "page": page, "where": where})
        for key, value in node.items():
            if key == "dialogue":
                continue  # Reading dialogues play the reading's own track.
            walk(value, lesson, page, "exercise" if key == "practice" else where)

    for part in pack["items"]:
        walk(part, part["lessonId"], None, "page")
    return list(items.values())


def find_run(item, lesson_pieces):
    """The best run of pieces in the item's lesson whose words are the item's words."""
    best = None
    targets = variants(item["text"])
    for track, pieces in lesson_pieces:
        texts = [norm(p["text"]) for p in pieces]
        for first in range(len(pieces)):
            joined = ""
            for last in range(first, min(first + MAX_RUN, len(pieces))):
                joined += texts[last]
                for target in targets:
                    if len(joined) > len(target) + 3:
                        break
                    score = ratio(target, joined)
                    if best is None or score > best["score"]:
                        best = {"track": track, "first": first, "last": last, "score": round(score, 3),
                                "heard": joined, "target": target, "start": pieces[first]["start"],
                                "end": pieces[last]["end"]}
                if all(len(joined) > len(t) + 3 for t in targets):
                    break
    return best


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--lessons", type=int, nargs="*", help="Only these lessons (default: all 16).")
    parser.add_argument("--audio-dir", type=Path, default=AUDIO_DIR, help="Folder with the B1-LL-P-3.mp3 tracks.")
    args = parser.parse_args()
    audio_dir = args.audio_dir
    WORK.mkdir(parents=True, exist_ok=True)
    (WORK / "clips").mkdir(exist_ok=True)
    tracks = sorted(t for t in audio_dir.glob("B1-*-3.mp3") if TRACK_RE.match(t.name))
    model = load_model(ASR_MODEL)
    pieces = transcribe_pieces(model, tracks)
    by_lesson = {}
    for track in tracks:
        lesson = int(TRACK_RE.match(track.name).group(1))
        by_lesson.setdefault(lesson, []).append((track.name, pieces[track.name]))

    previous = json.loads(OUT_FILE.read_text()) if OUT_FILE.exists() else {}
    clips, report = {}, []
    items = [i for i in pack_items() if not args.lessons or i["lesson"] in args.lessons]
    for index, item in enumerate(items, 1):
        run = find_run(item, by_lesson.get(item["lesson"], []))
        record = {**item, "result": "not on track", "run": run}
        swap = bool(run and run["score"] >= MIN_SWAP_RATIO and len(run["heard"]) == len(run["target"]))
        if run and (run["score"] >= MIN_SPAN_RATIO or swap):
            track = audio_dir / run["track"]
            start = round(max(0.0, run["start"] - LEAD), 2)
            end = round(run["end"] + TAIL, 2)
            wav = WORK / "clips" / f"{item['key'][:24]}.wav"
            ffmpeg_cut(track, start, end, wav)
            heard = model.generate(str(wav), language="Chinese", max_tokens=256, temperature=0, verbose=False).text
            heard_norm = norm(heard)
            clip_score, best_target = max((ratio(t, heard_norm), t) for t in variants(item["text"]))
            extra = len(heard_norm) - len(best_target)
            record.update({"clipHeard": heard, "clipScore": round(clip_score, 3), "extra": extra})
            if (clip_score >= MIN_CLIP_RATIO or (swap and len(heard_norm) == len(best_target))) and extra <= MAX_EXTRA:
                record["result"] = "clip"
                clips[item["key"]] = {"file": run["track"], "start": start, "end": end, "page": item["page"],
                                      "where": item["where"], "spanScore": run["score"], "clipScore": round(clip_score, 3),
                                      "heard": heard, "method": "asr-span"}
                if clip_score < MIN_CLIP_RATIO:
                    clips[item["key"]]["listen"] = "the recognizer misheard a character; checked by ear"
                if item["key"] in previous and previous[item["key"]].get("approved"):
                    clips[item["key"]]["approved"] = previous[item["key"]]["approved"]
            else:
                record["result"] = "cut does not match"
        elif run and run["score"] >= 0.75:
            record["result"] = "close, not exact"
        report.append(record)
        print(f"[{index}/{len(items)}] L{item['lesson']:02d} {record['result']:18} {item['text']}", flush=True)

    OUT_FILE.write_text(json.dumps(dict(sorted(clips.items())), ensure_ascii=False, indent=2) + "\n")
    (WORK / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
    counts = {}
    for record in report:
        counts[(record["where"], record["result"])] = counts.get((record["where"], record["result"]), 0) + 1
    for key, value in sorted(counts.items()):
        print(key, value)


if __name__ == "__main__":
    main()

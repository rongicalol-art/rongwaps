#!/usr/bin/env python3
"""Check every book clip of a card example by speech recognition, after alignVocabularyExampleAudio.py --apply.

The aligner can end a clip a syllable or two early, and the publisher's recording sometimes says other words than
the printed card (a name instead of 他, 收到 for 接到). Each clip is cut from its track and transcribed (Qwen3-ASR); its
tone-free syllables must be the card sentence's. A clip that differs is widened to the pauses around it and checked
again. A clip that still differs keeps its range only when a person listened and listed it in
content/audio/vocabulary_example_reviewed.json ({exampleId: {"heard": transcript, "note": ...}}); otherwise --write
removes it (the card then has no book clip) and records what the recording says.

The aligner can also miss a sentence the recording does say (it looked in the wrong window, or the clip ran into the
next word). A person or search that found it lists the range in content/audio/vocabulary_example_located.json
({exampleId: {"file", "start", "end", "heard"}}); it is checked here like any other clip.

Run: output/qwen-pilot-venv/bin/python scripts/audio/checkVocabularyExampleAudio.py --book 2 [--write]
Writes output/audio/vocabulary-example-audio/check-book<N>.json (the listening list) and, with --write,
content/audio/vocabulary_example_audio.json; then run `npm run vocab:examples`.
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from recoverGrammarClipsAsr import ASR_MODEL, LEAD, TAIL, ffmpeg_cut, han, norm, sounds, variants  # noqa: E402
from mlx_audio.stt.utils import load_model  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "content/audio/vocabulary_example_audio.json"
REVIEWED = ROOT / "content/audio/vocabulary_example_reviewed.json"
LOCATED = ROOT / "content/audio/vocabulary_example_located.json"
OUT_DIR = ROOT / "output/audio/vocabulary-example-audio"
AUDIO_DIRS = {1: "output/official-audio/book1", 2: "output/official-audio/book2/originals", 3: "output/official-audio/book3"}
# Words the recognizer writes another way although the speaker says them right (Taiwan 垃圾 lèsè, 網路 heard as 網絡).
SOUND_ALIKES = {"垃圾": "樂色", "網路": "網絡"}
SEARCH = 3.0  # Seconds around a clip searched for the pauses that bound its speech.


def targets(text):
    forms = {text, *(text.replace(a, b) for a, b in SOUND_ALIKES.items() if a in text)}
    return {sounds(v) for form in forms for v in variants(form)}


def heard_sounds(heard):
    # 醫生說：「…」 — a colon would make norm() treat the speaker as a label; the card writes a comma.
    return sounds(norm(re.sub(r"[：:]", "，", heard)))


def speech_pieces(track, lo, hi):
    out = subprocess.run(["ffmpeg", "-ss", f"{lo:.3f}", "-to", f"{hi:.3f}", "-i", str(track), "-af",
                          "silencedetect=noise=-40dB:d=0.3", "-f", "null", "-"], capture_output=True, text=True).stderr
    starts = [float(v) for v in re.findall(r"silence_start: (-?[\d.]+)", out)]
    ends = [float(v) for v in re.findall(r"silence_end: ([\d.]+)", out)]
    pieces, cursor = [], 0.0
    for silence_start, silence_end in zip(starts, ends):
        if silence_start - cursor > 0.05:
            pieces.append((lo + max(0.0, cursor), lo + silence_start))
        cursor = silence_end
    if hi - lo - cursor > 0.05:
        pieces.append((lo + cursor, hi))
    return pieces


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--book", type=int, required=True, choices=sorted(AUDIO_DIRS))
    parser.add_argument("--write", action="store_true", help="Apply widened ranges and remove clips that differ.")
    args = parser.parse_args()
    manifest = json.loads(CONTENT.read_text(encoding="utf-8"))
    reviewed = json.loads(REVIEWED.read_text(encoding="utf-8")) if REVIEWED.exists() else {}
    located = json.loads(LOCATED.read_text(encoding="utf-8")) if LOCATED.exists() else {}
    for example_id, found in located.items():
        entry = manifest["examples"][example_id]
        if entry["bookId"] != args.book or (entry.get("audio") or {}).get("voice") == "book":
            continue
        entry["audio"] = {"voice": "book", "file": found["file"], "start": found["start"], "end": found["end"]}
        entry["alignment"]["locatedBy"] = "asr"
        if entry["alignment"]["track"] != found["file"]:  # Said on another part's track.
            index = json.loads((ROOT / f"content/audio/audio_index_book{args.book}.json").read_text(encoding="utf-8"))
            entry["alignment"].update(track=found["file"], trackSha256=manifest["tracks"][found["file"]]["sha256"],
                                      driveFileId=next(t["id"] for t in index["vocabularyTracks"]
                                                       if t["file"] == found["file"]))
        entry.pop("issue", None)
    audio_dir = ROOT / AUDIO_DIRS[args.book]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = OUT_DIR / f"asr-book{args.book}.json"
    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}
    model = None

    def transcribe(file, start, end, wav):
        nonlocal model
        key = f"{file}:{start:.2f}:{end:.2f}"
        if key not in cache:
            model = model or load_model(ASR_MODEL)
            ffmpeg_cut(audio_dir / file, start, end, wav)
            cache[key] = model.generate(str(wav), language="Chinese", max_tokens=256, temperature=0, verbose=False).text
            cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        return cache[key]

    entries = {key: entry for key, entry in manifest["examples"].items()
               if entry["bookId"] == args.book and (entry.get("audio") or {}).get("voice") == "book"}
    results = {}
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "clip.wav"
        for example_id, entry in sorted(entries.items()):
            audio, want = entry["audio"], targets(entry["traditional"])
            heard = transcribe(audio["file"], audio["start"], audio["end"], wav)
            result = {"text": entry["traditional"], "file": audio["file"], "start": audio["start"], "end": audio["end"],
                      "heard": heard, "status": "same" if heard_sounds(heard) in want else "differs"}
            if result["status"] == "differs":
                pieces = [p for p in speech_pieces(audio_dir / audio["file"], max(0.0, audio["start"] - SEARCH),
                                                   audio["end"] + SEARCH)
                          if p[1] > audio["start"] and p[0] < audio["end"]]
                if pieces:
                    start, end = round(max(0.0, pieces[0][0] - LEAD), 2), round(pieces[-1][1] + TAIL, 2)
                    widened = transcribe(audio["file"], start, end, wav)
                    if heard_sounds(widened) in want:
                        result.update(start=start, end=end, heard=widened, status="widened")
                    elif len(heard_sounds(widened)) > len(heard_sounds(heard)):
                        result["heard"] = widened  # The fuller transcript says better what the recording says.
            if result["status"] == "differs" and reviewed.get(example_id, {}).get("heard") == result["heard"]:
                result["status"] = "reviewed"
            results[example_id] = result
            if result["status"] in ("differs", "widened"):
                print(f"{result['status']:8} {example_id} {entry['traditional']} | {result['heard']}", flush=True)

    # Two cards may share a sentence: a clip that differs takes the range of one that passed.
    passed = {(r["file"], han(r["text"])): r for r in results.values() if r["status"] != "differs"}
    for result in results.values():
        peer = passed.get((result["file"], han(result["text"])))
        if result["status"] == "differs" and peer:
            result.update(start=peer["start"], end=peer["end"], heard=peer["heard"], status="shared")

    (OUT_DIR / f"check-book{args.book}.json").write_text(json.dumps(results, ensure_ascii=False, indent=1) + "\n",
                                                          encoding="utf-8")
    counts = {status: sum(r["status"] == status for r in results.values())
              for status in ("same", "widened", "shared", "reviewed", "differs")}
    print(f"Book {args.book}: {counts}")
    if args.write:
        for example_id, result in results.items():
            entry = manifest["examples"][example_id]
            if result["status"] == "differs":
                entry["audio"] = None
                entry["issue"] = f"the recording says other words: {result['heard']}"
            else:
                entry["audio"].update(start=result["start"], end=result["end"])
        CONTENT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote {CONTENT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

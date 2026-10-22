#!/usr/bin/env python3
"""Generate Qwen studio clips for Book 3 L1-5: grammar examples, pattern rows, reading lines and vocabulary examples.

  HF_HUB_OFFLINE=1 output/qwen-pilot-venv/bin/python scripts/audio/generateBook3Audio.py [--limit N]

Reuses the Book 1 grammar generator's helpers, with a one-line teacher style (no rule list) and
output in output/grammar-audio/b3/. Resumable: finished clips are skipped.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generateGrammarStudioAudio as g  # noqa: E402

LESSONS = ["b3LessonOne", "b3LessonTwo", "b3LessonThree", "b3LessonFour", "b3LessonFive"]
READINGS = g.ROOT / "content/readings/book-3.json"
VOCAB_EXAMPLES = g.ROOT / "content/audio/vocabulary_example_audio.json"  # Only used for the sentence list.
STYLE = "像專業的華語老師，清楚、自然、親切地朗讀。"  # Owner's pick, 2026-10-21.
VOICE_A = "Vivian"  # First speaker and narrator.
VOICE_B = "Dylan"  # Second speaker of a dialogue.
MAX_HAN_PER_SECOND = 6  # Natural pace; Book 1 capped at 4 for slow beginner delivery.
OUT = g.ROOT / "output/grammar-audio/b3"

g.VOICE = VOICE_A
g.INSTRUCT = g.SLOW_INSTRUCT = STYLE
g.AUDIO_DIR, g.MANIFEST_PATH, g.REVIEW_PATH, g.NUMBERS_PATH = OUT / "studio", OUT / "manifest.json", OUT / "review.html", OUT / "numbers.json"
current_voices = [VOICE_A]
g.turn_voice = lambda index: current_voices[0]  # One turn per clip; the voice is set per target.


def reading_targets(clipped):
    """One target per reading line; the second speaker of a dialogue is voice B."""
    targets = []
    for reading in json.loads(READINGS.read_text(encoding="utf-8")):
        if reading["lessonId"] > 5:
            continue
        second = None
        for index, line in enumerate(reading["paragraphs"]):
            text = line["traditional"].strip()
            key = g.han(text)
            if not key or key in clipped:
                continue
            speaker = line.get("speaker")
            first = reading["paragraphs"][0].get("speaker")
            if speaker not in (first, "旁白") and second is None:
                second = speaker
            targets.append({
                "key": key, "text": text, "turns": g.speaker_turns(line.get("simplified") or text),
                "users": [{"page": reading["id"], "id": f"{reading['id']}-{index}", "kind": "reading"}],
                "order": (reading["lessonId"], reading["dialogueNumber"], 2, index),
                "voice": VOICE_B if speaker == second else VOICE_A,
            })
    return targets


def vocabulary_example_targets():
    """Book 3 vocabulary example sentences, replacing the book-track ranges. No authored simplified form: read as written."""
    examples = json.loads(VOCAB_EXAMPLES.read_text(encoding="utf-8"))["examples"]
    return [{
        "key": g.han(e["traditional"]), "text": e["traditional"], "turns": g.speaker_turns(e["traditional"]),
        "users": [{"page": e["sourceCardId"], "id": example_id, "kind": "vocabulary-example"}],
        "order": (e["lessonId"], 3, 3, example_id),
    } for example_id, e in examples.items() if e["bookId"] == 3 and e["lessonId"] <= 5 and g.han(e["traditional"])]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    grammar, _, _ = g.collect_targets(LESSONS)
    by_key = {}
    for target in grammar + reading_targets(set()) + vocabulary_example_targets():
        if target["key"] in by_key:
            by_key[target["key"]]["users"] += target["users"]
        else:
            by_key[target["key"]] = {**target, "voice": target.get("voice", VOICE_A)}
    targets = sorted(by_key.values(), key=lambda t: tuple(map(str, t["order"])))
    selected = targets[:args.limit] if args.limit else targets
    print(f"{len(targets)} unique clips; generating up to {len(selected)}", flush=True)

    OUT.mkdir(parents=True, exist_ok=True)
    g.AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    old = json.loads(g.MANIFEST_PATH.read_text(encoding="utf-8")) if g.MANIFEST_PATH.exists() else []
    done = {e["key"]: e for e in old}
    import mlx.core as mx
    import numpy as np
    import soundfile as sf
    from mlx_audio.tts.utils import load_model
    model = load_model(g.MODEL)

    failures = []
    for target in selected:
        key = target["key"]
        current_voices[0] = target["voice"]
        g.VOICE = target["voice"]
        for seed in (g.SEED, g.RETRY_SEED):
            digest, path, sidecar = g.output_for(key, target["turns"], seed)
            if key in done and (g.ROOT / done[key]["local"]).is_file() and done[key].get("voice") == target["voice"]:
                break
            try:
                audio, rate = g.synthesize(model, target["turns"], seed, mx, np, STYLE)
                duration = g.validate_duration(audio, rate, key)
                if len(key) / duration > MAX_HAN_PER_SECOND:
                    raise ValueError("delivery too fast")
                g.encode_mp3(audio, rate, path, sf)
                sidecar.write_text(digest + "\n", encoding="utf-8")
                done[key] = g.build_manifest_entry(target, seed, path, g.probe_audio(path)[0])
                print(f"generated {key[:20]}: {duration:.1f}s ({target['voice']})", flush=True)
                break
            except Exception as error:
                print(f"seed {seed} failed {key[:20]}: {error}", flush=True)
        else:
            failures.append(key)
        entries = [done[t["key"]] for t in targets if t["key"] in done]
        g.write_json(g.MANIFEST_PATH, entries)
        g.write_review(entries)
    print(f"done {len([t for t in targets if t['key'] in done])}/{len(targets)}; failed {len(failures)}", flush=True)


if __name__ == "__main__":
    main()

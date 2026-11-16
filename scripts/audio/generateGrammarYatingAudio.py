#!/usr/bin/env python3
"""Voice Book 1 grammar sentences the book does not record with the mock-test voice (Yating 雅婷), replacing Qwen.

The owner's pick (2026-11-16): the TOCFL lesson-test voices and pace, so Book 1 sounds the same in lessons and tests.
Targets are read from the exported pack (public/data/grammar/book-1.json): every grammar-page sentence, table row and
exercise sentence whose audio is not the book's. Speed and comma pauses follow the lesson tests (YATING_PACE in
generateLessonTestAudio.py: Lessons 1-8 slower, 9-16 a little quicker, 400 ms at each comma).

  cd <main checkout>   # yatingTts.py finds YATING_API_KEY in the main checkout's .env and caches in output/yating-cache
  output/qwen-pilot-venv/bin/python <worktree>/scripts/audio/generateGrammarYatingAudio.py --lessons 1-15
  HF_HUB_OFFLINE=1 output/qwen-pilot-venv/bin/python scripts/audio/checkStudioBatch.py output/grammar-audio/b1-yating
  node --import dotenv/config --import tsx scripts/audio/publishGrammarStudioAudio.ts \
    --manifest output/grammar-audio/b1-yating/manifest.json --approved "owner <date> (...)" --upload

Writes <worktree>/output/grammar-audio/b1-yating/: manifest.json (publishGrammarStudioAudio.ts format), masters/,
delivery/ (the 48 kbps copies named by hash, published as grammar-studio/v1/<hash>.mp3).
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generateGrammarStudioAudio import (  # noqa: E402
    ENDING_MAX, LANG_CODE, MIN_VOICED_PACE, ALTERNATIVE_RE, PAREN_RE, ending_ratio, han, master_recording,
    measure_quality, probe_audio, syllables, validate_duration, voiced_pace, write_json,
)
from generateLessonTestAudio import (  # noqa: E402
    DELIVERY_BITRATE, MAX_PACE, YATING_PITCH, YATING_SPEED_STEPS, YATING_VOICES, deliver, synthesize_yating,
    yating_label, yating_model, yating_pace, yating_request,
)

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "public/data/grammar/book-1.json"
OUT = ROOT / "output/grammar-audio/b1-yating"
FILE_PREFIX = "grammar-studio/v1/"
MIN_KEY = 4  # Shorter text only when it already had a (Qwen) voice; diagram words stay silent.
SPEAKER = "F"  # Every target is one sentence (no A/B dialogue is left without a book clip): 雅婷.
# Numbers the voice would read as an amount: years and the 101 tower are read digit by digit.
SPOKEN = [(re.compile(r"(\d{4})(?=年)"), lambda m: "".join("零一二三四五六七八九"[int(d)] for d in m.group(1))),
          (re.compile(r"台北101"), lambda m: "台北一零一")]


def spoken_form(text):
    """What the voice reads: optional (parenthesized) words kept without the marks, the book's alternative dropped."""
    text = ALTERNATIVE_RE.sub("", PAREN_RE.sub("", text))
    for pattern, replace in SPOKEN:
        text = pattern.sub(replace, text)
    return text.strip()


def targets(lessons):
    pack = json.loads(PACK.read_text(encoding="utf-8"))
    found = {}

    def row_text(row):
        groups = row.get("columns") or [row.get(k) or [] for k in ("subject", "grammar", "complement")]
        return "".join(f"{t.get('prefix', '')}{t.get('traditional', '')}{t.get('suffix', '')}"
                       for group in groups for t in group if isinstance(t, dict))

    def walk(node, lesson, where):
        if isinstance(node, list):
            for value in node:
                walk(value, lesson, where)
            return
        if not isinstance(node, dict):
            return
        text = None
        if isinstance(node.get("traditional"), str) and "english" in node:
            text = node["traditional"]
        elif all(isinstance(node.get(k), list) for k in ("subject", "grammar", "complement")) and not node.get("exampleId"):
            text = row_text(node)
        voice = (node.get("audio") or {}).get("voice")
        if text and voice != "book" and (len(han(text)) >= MIN_KEY or (voice and len(han(text)) >= 2)):
            found.setdefault(han(text), {"key": han(text), "text": text, "lesson": lesson, "where": where})
        for key, value in node.items():
            if key != "dialogue":  # Reading dialogues play the reading's own track.
                walk(value, lesson, "exercise" if key == "practice" else where)

    for part in pack["items"]:
        if part["lessonId"] in lessons:
            walk(part, part["lessonId"], "page")
    out = []
    for item in found.values():
        speed, pauses = yating_pace(1, item["lesson"], SPEAKER)
        out.append({**item, "spoken": spoken_form(item["text"]), "speaker": SPEAKER, "voice": yating_label(SPEAKER, speed, pauses),
                    "model": YATING_VOICES[SPEAKER], "speed": speed, "pauses": pauses, "pitch": YATING_PITCH[SPEAKER]})
    return out


def render(target, rejected, np, sf):
    """Try the takes (speed nudged a little each time) until one passes the duration, pace, fade and drag checks."""
    request = {**target, "text": target["spoken"]}
    errors = []
    for take in range(len(YATING_SPEED_STEPS)):
        if str(take) in rejected.get(target["key"], []):
            continue
        floor = MIN_VOICED_PACE / max(1.0, yating_request(request, take)[2])
        master = OUT / "masters" / f"{target['key'][:16]}-{take}.mp3"
        try:
            audio, rate = synthesize_yating(request, take, np, sf)
            duration = validate_duration(audio, rate, target["spoken"])
            pace = syllables(target["spoken"]) / duration
            if pace > MAX_PACE[SPEAKER]:
                raise ValueError(f"too fast ({pace:.2f}/s)")
            wav = master.with_suffix(".tmp.wav")
            sf.write(wav, audio, rate, subtype="FLOAT")
            master_recording(wav, master)
            wav.unlink(missing_ok=True)
            if ending_ratio(master) > ENDING_MAX:
                raise ValueError("ends abruptly")
            if syllables(target["spoken"]) >= 4 and voiced_pace(master, target["spoken"]) < floor:
                raise ValueError("drags")
            published, digest = deliver(master, OUT / "delivery")
            return {
                "key": target["key"], "text": target["text"], "spoken": target["spoken"], "voice": target["voice"],
                "lesson": target["lesson"], "where": target["where"],
                "file": FILE_PREFIX + published.name, "local": published.relative_to(ROOT).as_posix(),
                "sha256": digest, "duration": round(probe_audio(published)[0], 3),
                "model": yating_model(request, take), "instruct": "", "seed": take, "take": "",
                "deliveryBitrate": DELIVERY_BITRATE, "minVoicedPace": floor, "quality": measure_quality(published),
            }
        except Exception as error:  # noqa: BLE001 - any failure means "try the next take"
            errors.append(f"take {take}: {error}")
    raise ValueError("; ".join(errors[-3:]))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--lessons", default="1-15", help="Lesson range, e.g. 1-15 (Lesson 16 waits for its rebuild).")
    args = parser.parse_args()
    first, last = (int(v) for v in args.lessons.split("-"))
    todo = targets(range(first, last + 1))
    (OUT / "masters").mkdir(parents=True, exist_ok=True)
    manifest_path = OUT / "manifest.json"
    old = {e["key"]: e for e in json.loads(manifest_path.read_text(encoding="utf-8"))} if manifest_path.exists() else {}
    rejected = json.loads((OUT / "rejected.json").read_text(encoding="utf-8")) if (OUT / "rejected.json").exists() else {}
    entries, pending = [], []
    for target in todo:
        previous = old.get(target["key"])
        if (previous and (ROOT / previous["local"]).is_file() and previous["spoken"] == target["spoken"]
                and str(previous["seed"]) not in rejected.get(target["key"], [])):
            entries.append(previous)
        else:
            pending.append(target)
    print(f"{len(todo)} sentences, {len(pending)} to voice, {sum(len(han(t['spoken'])) for t in pending)} characters", flush=True)

    import threading
    from concurrent.futures import ThreadPoolExecutor
    import numpy as np
    import soundfile as sf
    from yatingTts import synthesize as yating

    def first_take(target):  # Fetch first takes 3 at a time (Yating's limit); render() then reads the cache.
        text, model, speed, ssml, pitch = yating_request({**target, "text": target["spoken"]})
        return yating(text, model, speed=speed, pitch=pitch, ssml=ssml)

    with ThreadPoolExecutor(3) as pool:
        list(pool.map(first_take, pending))
    lock, failures = threading.Lock(), []

    def one(target):
        try:
            entry = render(target, rejected, np, sf)
            with lock:
                entries.append(entry)
                print(f"[{len(entries)}/{len(todo)}] L{target['lesson']:02d} {target['spoken']}", flush=True)
                write_json(manifest_path, sorted(entries, key=lambda e: e["key"]))
        except Exception as error:  # noqa: BLE001
            with lock:
                failures.append(target["key"])
                print(f"FAILED {target['spoken']}: {error}", flush=True)

    with ThreadPoolExecutor(6) as pool:
        list(pool.map(one, pending))
    write_json(manifest_path, sorted(entries, key=lambda e: e["key"]))
    print(f"done: {len(entries)} clips, {len(failures)} failed", flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

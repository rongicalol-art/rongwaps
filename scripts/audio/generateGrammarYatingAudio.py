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
PACK = ROOT / "public/data/grammar/book-{book}.json"
OUT = ROOT / "output/grammar-audio/b{book}-yating"  # Set in main() for --book.
RECEIPT = ROOT / "content/audio/grammar_studio_audio.json"
FILE_PREFIX = "grammar-studio/v1/"
MIN_KEY = 4  # Shorter text only when it already had a (Qwen) voice; diagram words stay silent.
SPEAKER = "F"  # A single sentence: 雅婷.
# A dialogue's speaker label (A：, 可欣：, 外國人：) at the start of a turn. 說：「…」 is a quote, not a turn.
TURN = re.compile(r"(?:^|(?<=[。？！」…\s]))\s*([A-D]|[\u4e00-\u9fff]{1,3})[：:]\s*")
QUOTE_VERBS = ("說", "問", "道", "寫", "叫", "喊", "想")  # 跟我說：「…」 is a quote even at a sentence start.
# Who is a woman (雅婷) or a man (家豪): the books' characters and family words. A role such as 老闆 or 客人
# takes the voice the other speaker doesn't use; a third speaker (C) is 意晴, the lesson tests' narrator.
FEMALE_LABELS = {"A", "媽媽", "老師", "太太", "王太太", "可欣", "美心", "妹妹", "姐姐", "姊姊", "女朋友", "女兒", "母親", "以凡"}
MALE_LABELS = {"B", "爸爸", "先生", "錢先生", "良介", "男朋友", "父親", "兒子", "哥哥", "弟弟", "明生", "龍介"}
TURN_SILENCE = 0.6  # Seconds between turns, as the Qwen dialogues.
# Numbers the voice would read as an amount: years and the 101 tower are read digit by digit.
SPOKEN = [(re.compile(r"(\d{4})(?=年)"), lambda m: "".join("零一二三四五六七八九"[int(d)] for d in m.group(1))),
          (re.compile(r"台北101"), lambda m: "台北一零一"),
          # The voice reads 兒 as a separate "er" syllable; Taiwan speech says 一點 (owner, 2026-11-16).
          (re.compile(r"(點|會)兒"), lambda m: m.group(1)),  # 一點兒, 一會兒 (owner, 2026-11-16/17)
          # Owner flagged 姊姊 (2026-11-16): the common 姐姐 is read jiějie too, and more cleanly.
          (re.compile(r"姊"), lambda m: "姐"),
          # The voice said 晚餐 for 晚飯 at the slower takes; a space keeps the word (checked by ASR).
          (re.compile(r"晚飯"), lambda m: "晚 飯")]


def spoken_form(text):
    """What the voice reads: optional (parenthesized) words kept without the marks, the book's alternative dropped."""
    text = ALTERNATIVE_RE.sub("", PAREN_RE.sub("", text))
    for pattern, replace in SPOKEN:
        text = pattern.sub(replace, text)
    return text.strip()


def turns(text):
    """[(speaker, spoken text)]: one turn per label, or the whole sentence for 雅婷."""
    labels = [m for m in TURN.finditer(text) if not m.group(1).endswith(QUOTE_VERBS)]
    if not labels or text[:labels[0].start()].strip():
        return [(SPEAKER, spoken_form(text))]
    names = list(dict.fromkeys(m.group(1) for m in labels))
    voice = {n: "F" for n in names if n in FEMALE_LABELS} | {n: "M" for n in names if n in MALE_LABELS}
    for name in names:
        if name not in voice:
            taken = set(voice.values())
            voice[name] = next((v for v in ("F", "M") if v not in taken), "N")
    if len(names) > 1 and voice[names[1]] == voice[names[0]] == "F":
        voice[names[1]] = "N"  # Two women (妹妹, 姐姐): the second is 意晴, so they don't sound like one person.
    out = []
    for index, label in enumerate(labels):
        end = labels[index + 1].start() if index + 1 < len(labels) else len(text)
        out.append((voice[label.group(1)], spoken_form(text[label.end():end])))
    return out


def targets(book, lessons):
    pack = json.loads(Path(str(PACK).format(book=book)).read_text(encoding="utf-8"))
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
        parts = []
        for speaker, spoken in turns(item["text"]):
            speed, pauses = yating_pace(book, item["lesson"], speaker)
            parts.append({"speaker": speaker, "text": spoken, "voice": yating_label(speaker, speed, pauses),
                          "model": YATING_VOICES[speaker], "speed": speed, "pauses": pauses, "pitch": YATING_PITCH[speaker]})
        out.append({**item, "turns": parts, "spoken": " ".join(p["text"] for p in parts),
                    "voice": " + ".join(dict.fromkeys(p["voice"] for p in parts))})
    return out


def synthesize_with_tail(turn, take, np, sf):
    """A take with a short silence asked for after the last word: the voice sometimes clips its final sound."""
    import io
    from generateGrammarStudioAudio import TRIM_PADDING, trim_to_active
    from yatingTts import synthesize as yating
    text, model, speed, ssml, pitch = yating_request(turn, take)
    body = text[len("<speak>"):-len("</speak>")] if ssml else text
    audio, rate = sf.read(io.BytesIO(yating(f'<speak>{body}<break time="300ms"/></speak>', model, speed=speed,
                                            pitch=pitch, ssml=True)), dtype="float32")
    audio = trim_to_active(np.asarray(audio, dtype=np.float32).reshape(-1), np)
    pad = np.zeros(round(rate * TRIM_PADDING), dtype=np.float32)
    return np.concatenate([pad, audio, pad]), rate


def render(target, rejected, np, sf, tail=False):
    """Try the takes (speed nudged a little each time) until one passes the duration, pace, fade and drag checks."""
    errors = []
    for take in range(len(YATING_SPEED_STEPS)):
        if str(take) in rejected.get(target["key"], []):
            continue
        floor = MIN_VOICED_PACE / max(1.0, min(yating_request(t, take)[2] for t in target["turns"]))
        master = OUT / "masters" / f"{target['key'][:16]}-{take}.mp3"
        try:
            pieces, rate = [], None
            for turn in target["turns"]:
                audio, rate = (synthesize_with_tail if tail else synthesize_yating)(turn, take, np, sf)
                duration = validate_duration(audio, rate, turn["text"])
                pace = syllables(turn["text"]) / duration
                if pace > MAX_PACE[turn["speaker"]]:
                    raise ValueError(f"too fast ({pace:.2f}/s)")
                if pieces:
                    pieces.append(np.zeros(round(rate * TURN_SILENCE), dtype=np.float32))
                pieces.append(audio)
            audio = np.concatenate(pieces)
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
                "model": " + ".join(dict.fromkeys(yating_model(t, take) for t in target["turns"])), "instruct": "", "seed": take, "take": "",
                "deliveryBitrate": DELIVERY_BITRATE, "minVoicedPace": floor, "quality": measure_quality(published),
            }
        except Exception as error:  # noqa: BLE001 - any failure means "try the next take"
            errors.append(f"take {take}: {error}")
    if not tail and errors and all(e.endswith("ends abruptly") for e in errors):
        entry = render(target, rejected, np, sf, tail=True)
        return {**entry, "model": entry["model"] + " (tail break)"}
    raise ValueError("; ".join(errors[-3:]))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--book", type=int, default=1)
    parser.add_argument("--lessons", default="1-15", help="Lesson range, e.g. 1-15 (Book 1 Lesson 16 waits for its rebuild).")
    args = parser.parse_args()
    global OUT
    OUT = Path(str(OUT).format(book=args.book))
    first, last = (int(v) for v in args.lessons.split("-"))
    todo = targets(args.book, range(first, last + 1))
    # A sentence another book already has a Yating clip for keeps it: clips are keyed by text, not by book.
    published = {k for k, v in json.loads(RECEIPT.read_text(encoding="utf-8")).items() if "yating" in v.get("model", "")}
    shared = [t for t in todo if t["key"] in published]
    todo = [t for t in todo if t["key"] not in published]
    if shared:
        print(f"{len(shared)} sentences already voiced in another book; kept", flush=True)
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
        for turn in target["turns"]:
            text, model, speed, ssml, pitch = yating_request(turn)
            yating(text, model, speed=speed, pitch=pitch, ssml=ssml)

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

#!/usr/bin/env python3
"""Voice the lesson tests (content/lesson-tests) in Taiwan-accent studio voices, plus the shared ding and letters.

  HF_HUB_OFFLINE=1 <venv>/bin/python scripts/audio/generateLessonTestAudio.py --lessons b1l04
  HF_HUB_OFFLINE=1 <venv>/bin/python scripts/audio/checkStudioBatch.py output/lesson-test-audio   # ASR + cut-off check
  HF_HUB_OFFLINE=1 <venv>/bin/python scripts/audio/generateLessonTestAudio.py --lessons b1l04     # re-voices rejected takes

(<venv> is the local MLX environment, output/qwen-pilot-venv in the main checkout.)

  <venv>/bin/python scripts/audio/generateLessonTestAudio.py --engine yating --lessons b1l01 ... b1l16

--engine yating voices the sentences with the owner-picked Yating API voices (雅婷 F, 家豪 M, 意晴 N; key
YATING_API_KEY in .env) at each test's pace (YATING_PACE, after the textbook's recordings), and writes voices.json
(each test's voice per role) for the receipt. The A/B/C/D letters stay the English Serena clips.

Voices (TOCFL recordings use two dialogue voices and a separate narrator):
- F: Vivian, the owner-approved studio voice;
- M: Dylan (owner-approved for speaker B) and Uncle_Fu, a non-dialect male voice, both rendered so the owner
  picks one by ear (--male picks which one the manifest publishes; default dylan);
- N: Serena, the narrator who reads questions, spoken answers and the A/B/C letters.
Dialogue voices speak naturally, like everyday conversation; the narrator reads like a test recording.

Every clip is mastered like the grammar studio clips, published as a 48 kbps copy named by its hash
(`lesson-test-studio/v1/<hash>.mp3`) and listed in <out>/manifest.json, which checkStudioBatch.py checks
(independent ASR must hear the whole sentence; the ending must fade) and publishLessonTestAudio.ts uploads.
The ding is a recorded small bell (scripts/audio/sounds, CC0). It never time-stretches speech.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generateGrammarStudioAudio import (  # noqa: E402
    ENDING_MAX, LANG_CODE, MAX_TOKENS, MIN_VOICED_PACE, MODEL, TRIM_PADDING, attempt_id, ending_ratio,
    file_sha256, master_recording, measure_quality, probe_audio, syllables, trim_to_active, validate_duration,
    voiced_pace, write_json,
)

ROOT = Path(__file__).resolve().parents[2]  # Repository root.
CONTENT = ROOT / "content/lesson-tests"  # Authored lesson tests.
OUT = ROOT / "output/lesson-test-audio"  # Batch: manifest, review page, clips (gitignored scratch).
FILE_PREFIX = "lesson-test-studio/v1/"  # R2 key prefix of published clips.
DELIVERY_BITRATE = "48k"  # Published copy, like the Book 1 gap batch.
DIALOGUE_INSTRUCT = "用台灣國語的口音，像日常生活中自然的對話，語氣自然親切，語速適中，咬字清楚，不要捲舌音太重，不要兒化音。只朗讀提供的文字，不增添、不省略任何字詞。"
NARRATOR_INSTRUCT = "用台灣國語的口音，像華語文能力測驗的錄音旁白，語氣平穩、清楚、自然，語速適中，不要捲舌音太重，不要兒化音。只朗讀提供的文字，不增添、不省略任何字詞。"
LETTER_INSTRUCT = "Read this single capital letter clearly and calmly, like an exam narrator naming an answer choice."
VOICES = {"F": "Vivian", "N": "Serena"}
MALE_VOICES = {"dylan": "Dylan", "uncle_fu": "Uncle_Fu"}
SEEDS = [42, 43, 44, 45, 46, 47, 48, 49]
SLOWER = " 語速稍微慢一點，在逗號自然停頓，但不要拖長字音。"  # Last resort for a voice that reads too fast on every seed.
TAKES = [(seed, "") for seed in SEEDS] + [(seed, "s") for seed in SEEDS[:5]]
MAX_PACE = {"N": 4.2, "F": 4.5, "M": 4.5}  # Characters a second: the narrator stays measured, dialogue may be conversational.
LETTERS = ["A", "B", "C", "D"]
# --engine yating: the owner-picked Yating API voices (scripts/audio/yatingTts.py). The A/B/C/D letters stay the
# English letter clips read by VOICES["N"] (owner's choice), so they are never sent to Yating.
YATING_VOICES = {"F": "zh_en_female_1", "M": "zh_en_male_1", "N": "zh_en_female_2"}  # 雅婷, 家豪, 意晴.
# Pace per test, after the textbook's own recordings (output/checks/speech_rate.py: Book 1 L1–8 ≈ 2.0 characters a
# second, L9–16 ≈ 2.5, Book 2 ≈ 3.2–3.5). Yating speed: a higher value speaks slower (max 1.5). Book 1 adds a
# 400 ms pause at every comma (owner's pick over slowing the voice further). (dialogue speed, narrator speed, pauses)
YATING_PACE = {(1, 8): (1.2, 1.3, True), (1, 16): (1.1, 1.2, True), (2, 16): (1.0, 1.1, False)}
# Retakes nudge the speed (higher = slower): a little faster first, since a slow short line drags and a slow
# question can end on a held syllable; then a little slower, for a take that reads too fast.
YATING_SPEED_STEPS = (0.0, -0.1, 0.1, -0.2)
YATING_TAKES = [(take, "y") for take in range(len(YATING_SPEED_STEPS))]


def yating_pace(book, lesson, speaker):
    """The (speed, pauses) a lesson's test uses for one role."""
    for (pace_book, last), (dialogue, narrator, pauses) in sorted(YATING_PACE.items()):
        if pace_book == book and lesson <= last:
            return (narrator if speaker == "N" else dialogue), pauses
    raise SystemExit(f"No Yating pace for book {book}")


def yating_label(speaker, speed, pauses):
    """The receipt's voice name: Yating model, speed and pause flag (e.g. zh_en_female_1@1.2p)."""
    return f"{YATING_VOICES[speaker]}@{speed}{'p' if pauses else ''}"


def spoken_units(lesson):
    """Every line a lesson test says aloud: (speaker, traditional text)."""
    units = []

    def add(node):
        if isinstance(node, dict):
            if node.get("speaker") in ("F", "M", "N") and node.get("traditional"):
                units.append((node["speaker"], node["traditional"]))
            for value in node.values():
                add(value)
        elif isinstance(node, list):
            for value in node:
                add(value)

    add(lesson["slots"])
    return units


def clip_key(voice, text):
    """The receipt key: the voice and the exact text."""
    return f"{voice}|{text}"


DING_SOURCE = Path(__file__).resolve().parent / "sounds" / "lesson-test-ding.mp3"


def ding(destination):
    """The ding: the first strike of "Ding Ding Small Bell" (Freesound 173932, CC0), cut 0.43 s in for 2.2 s with a
    4 ms fade-in and a fade-out from 1.4 s, then levelled to about -18 LUFS, a little under the voices."""
    shutil.copyfile(DING_SOURCE, destination)


def deliver(master, folder):
    """The published 48 kbps copy, named by its content hash. The low bitrate can push peaks past the master's,
    so it is re-encoded a little quieter until its true peak is at most -1 dBFS."""
    folder.mkdir(parents=True, exist_ok=True)
    temporary = folder / f"{master.stem}.tmp.mp3"
    gain = 0.0
    for _ in range(3):
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(master), "-af", f"volume={gain}dB",
                        "-map_metadata", "-1", "-vn", "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame",
                        "-b:a", DELIVERY_BITRATE, str(temporary)], check=True)
        peak = measure_quality(temporary)["truePeakDbfs"]
        if peak <= -1.0:
            break
        gain -= peak + 1.3
    else:
        raise ValueError(f"Encoded peaks remain unsafe: {master.name}")
    digest = file_sha256(temporary)
    destination = folder / f"{digest[:12]}.mp3"
    temporary.replace(destination)
    return destination, digest


def synthesize(model, text, voice, instruct, seed, lang, mx, np):
    """One take of one line in one voice, trimmed and padded."""
    mx.random.seed(seed)
    results = list(model.generate(text, voice=voice, lang_code=lang, instruct=instruct, max_tokens=MAX_TOKENS))
    if not results:
        raise ValueError("model returned no audio")
    rate = int(results[0].sample_rate)
    audio = trim_to_active(np.concatenate([np.asarray(r.audio, dtype=np.float32).reshape(-1) for r in results]), np)
    pad = np.zeros(round(rate * TRIM_PADDING), dtype=np.float32)
    return np.concatenate([pad, audio, pad]), rate


def yating_request(target, take=0):
    """The Yating call for a target's take: its model, speed (nudged per retake) and comma pauses as SSML."""
    speed = round(min(1.5, max(0.5, target["speed"] + YATING_SPEED_STEPS[take])), 2)
    text = target["text"]
    if target["pauses"] and "，" in text:
        return "<speak>" + text.replace("，", '，<break time="400ms"/>') + "</speak>", target["model"], speed, True
    return text, target["model"], speed, False


def synthesize_yating(target, take, np, sf):
    """One Yating take (cached by request), trimmed and padded like the Qwen takes."""
    import io
    from yatingTts import synthesize as yating
    text, model, speed, ssml = yating_request(target, take)
    audio, rate = sf.read(io.BytesIO(yating(text, model, speed=speed, ssml=ssml)), dtype="float32")
    audio = trim_to_active(np.asarray(audio, dtype=np.float32).reshape(-1), np)
    pad = np.zeros(round(rate * TRIM_PADDING), dtype=np.float32)
    return np.concatenate([pad, audio, pad]), rate


def render(model, target, rejected, masters, mx, np, sf):
    """Try takes until one passes duration, pace, fade and drag checks; return its manifest entry."""
    key, text, voice, instruct, lang = target["key"], target["text"], target["voice"], target["instruct"], target["lang"]
    yating = target.get("engine") == "yating"
    errors = []
    for seed, style in (YATING_TAKES if yating else TAKES):
        if attempt_id(seed, style) in rejected.get(key, []):
            continue
        master = masters / f"{abs(hash((key, seed, style))) % 10**12:012d}.mp3"
        # Yating's pace is set on purpose (Book 1 speaks slower), so "drags" means slower than that pace.
        floor = MIN_VOICED_PACE / max(1.0, yating_request(target, seed)[2]) if yating else MIN_VOICED_PACE
        try:
            if yating:
                audio, rate = synthesize_yating(target, seed, np, sf)
            else:
                audio, rate = synthesize(model, text, voice, instruct + (SLOWER if style else ""), seed, lang, mx, np)
            if lang == LANG_CODE:
                duration = validate_duration(audio, rate, text)
                pace = syllables(text) / duration
                if pace > MAX_PACE[target["speaker"]]:
                    raise ValueError(f"too fast ({pace:.2f}/s)")
            wav = master.with_suffix(".tmp.wav")
            sf.write(wav, audio, rate, subtype="FLOAT")
            master_recording(wav, master)
            wav.unlink(missing_ok=True)
            if lang == LANG_CODE:
                if ending_ratio(master) > ENDING_MAX:
                    raise ValueError("ends abruptly")
                if syllables(text) >= 4 and voiced_pace(master, text) < floor:
                    raise ValueError("drags")
            published, digest = deliver(master, OUT / "studio")
            duration, _ = probe_audio(published)
            return {
                "key": key, "text": text, "spoken": text, "voice": voice, "speaker": target["speaker"],
                "file": FILE_PREFIX + published.name, "local": published.relative_to(ROOT).as_posix(),
                "master": master.relative_to(ROOT).as_posix(), "sha256": digest, "duration": round(duration, 3),
                "model": f"yating-tts-v2/{target['model']}/speed-{yating_request(target, seed)[2]}" if yating else MODEL,
                "instruct": "" if yating else instruct + (SLOWER if style else ""), "seed": seed, "take": style,
                "deliveryBitrate": DELIVERY_BITRATE, "minVoicedPace": floor,
                "quality": measure_quality(published),
            }
        except Exception as error:  # noqa: BLE001 - every failure means "try the next seed"
            errors.append(f"seed {seed}{style}: {error}")
    raise ValueError("; ".join(errors[-3:]))


def write_review(entries):
    """A local listening page: every clip with its text, grouped by voice."""
    rows = "\n".join(
        f"<tr><td>{e['voice']}</td><td>{e['text']}</td><td><audio controls preload=none src='studio/{Path(e['local']).name}'></audio></td></tr>"
        for e in sorted(entries, key=lambda e: (e["voice"], e["text"]))
    )
    (OUT / "review.html").write_text(
        f"<!doctype html><meta charset=utf-8><title>Lesson test audio</title><table>{rows}</table>\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lessons", nargs="+", required=True, help="Lesson keys, e.g. b1l04")
    parser.add_argument("--male", choices=sorted(MALE_VOICES), default="dylan", help="Which male voice the manifest publishes.")
    parser.add_argument("--both-male", action="store_true", help="Also render the other male voice for comparison.")
    parser.add_argument("--engine", choices=["qwen", "yating"], default="qwen",
                        help="qwen: the local MLX voices; yating: the Yating API voices (YATING_API_KEY in .env).")
    args = parser.parse_args()

    targets = {}
    lesson_voices = {}  # Yating: which voice label each test uses per role (its pace), for the receipt.
    for key in args.lessons:
        book = int(key[1:key.index("l")])
        number = int(key[key.index('l') + 1:])
        lesson = json.loads((CONTENT / f"book-{book}" / f"lesson{number:02d}.json").read_text(encoding="utf-8"))
        if args.engine == "yating":
            lesson_voices[key] = {s: yating_label(s, *yating_pace(book, number, s)) for s in YATING_VOICES}
        for speaker, text in spoken_units(lesson):
            if args.engine == "yating":
                speed, pauses = yating_pace(book, number, speaker)
                voice = yating_label(speaker, speed, pauses)
                targets[clip_key(voice, text)] = {"key": clip_key(voice, text), "text": text, "voice": voice,
                                                  "speaker": speaker, "instruct": "", "lang": LANG_CODE, "engine": "yating",
                                                  "model": YATING_VOICES[speaker], "speed": speed, "pauses": pauses}
                continue
            voices = [VOICES.get(speaker)] if speaker != "M" else [MALE_VOICES[args.male]] + (
                [v for k, v in MALE_VOICES.items() if k != args.male] if args.both_male else [])
            for voice in voices:
                instruct = NARRATOR_INSTRUCT if speaker == "N" else DIALOGUE_INSTRUCT
                targets[clip_key(voice, text)] = {"key": clip_key(voice, text), "text": text, "voice": voice,
                                                  "speaker": speaker, "instruct": instruct, "lang": LANG_CODE}
    for letter in LETTERS:
        targets[clip_key(VOICES["N"], letter)] = {"key": clip_key(VOICES["N"], letter), "text": letter, "voice": VOICES["N"],
                                                  "speaker": "N", "instruct": LETTER_INSTRUCT, "lang": "English"}

    OUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUT / "manifest.json"
    old = {e["key"]: e for e in json.loads(manifest_path.read_text(encoding="utf-8"))} if manifest_path.exists() else {}
    if (OUT / "sounds.json").exists():
        old.update({e["key"]: e for e in json.loads((OUT / "sounds.json").read_text(encoding="utf-8")).get("letters", {}).values()})
    rejected = json.loads((OUT / "rejected.json").read_text(encoding="utf-8")) if (OUT / "rejected.json").exists() else {}
    entries, pending = [], []
    for key, target in targets.items():
        previous = old.get(key)
        if previous and (ROOT / previous["local"]).is_file() and attempt_id(previous["seed"], previous.get("take", "")) not in rejected.get(key, []):
            if previous["quality"]["truePeakDbfs"] > -1.0 and (ROOT / previous["master"]).is_file():
                # Published before deliver() checked peaks: re-deliver from its master; the checker runs on it again.
                published, digest = deliver(ROOT / previous["master"], OUT / "studio")
                previous = {**previous, "file": FILE_PREFIX + published.name, "local": published.relative_to(ROOT).as_posix(),
                            "sha256": digest, "duration": round(probe_audio(published)[0], 3), "quality": measure_quality(published)}
            entries.append(previous)
        else:
            pending.append(target)
    print(f"{len(targets)} clips, {len(pending)} to render", flush=True)

    ding_path = OUT / "ding.mp3"
    ding(ding_path)
    published, digest = deliver(ding_path, OUT / "studio")
    sounds = {"ding": {"file": FILE_PREFIX + published.name, "local": published.relative_to(ROOT).as_posix(), "sha256": digest}}

    failures = []
    if pending:
        import numpy as np
        import soundfile as sf
        model = mx = None
        if any(t.get("engine") != "yating" for t in pending):
            import mlx.core as mx
            from mlx_audio.tts.utils import load_model
            model = load_model(MODEL)
        api = [t for t in pending if t.get("engine") == "yating"]
        if api:
            # Fetch every first take up front, 3 at a time (Yating's limit per key); render() then reads the cache.
            from concurrent.futures import ThreadPoolExecutor
            from yatingTts import synthesize as yating
            def first_take(target):
                text, model, speed, ssml = yating_request(target)
                return yating(text, model, speed=speed, ssml=ssml)

            with ThreadPoolExecutor(3) as pool:
                list(pool.map(first_take, api))
            print(f"fetched {len(api)} Yating takes", flush=True)
        masters = OUT / "masters"
        masters.mkdir(parents=True, exist_ok=True)
        # Yating takes are already fetched: mastering and checks (ffmpeg) run on several cores at once.
        # The local Qwen model renders one take at a time.
        import threading
        from concurrent.futures import ThreadPoolExecutor
        lock = threading.Lock()
        done = [0]

        def one(target):
            try:
                entry = render(model, target, rejected, masters, mx, np, sf)
                with lock:
                    entries.append(entry)
                    done[0] += 1
                    print(f"[{done[0]}/{len(pending)}] {target['voice']} {target['text']}", flush=True)
                    write_json(manifest_path, [e for e in entries if e["text"] not in LETTERS])
            except Exception as error:  # noqa: BLE001
                with lock:
                    failures.append((target["key"], str(error)))
                    print(f"FAILED {target['key']}: {error}", flush=True)

        workers = 6 if all(t.get("engine") == "yating" for t in pending) else 1
        with ThreadPoolExecutor(workers) as pool:
            list(pool.map(one, pending))
    # Letters are not sentences: the ASR/pace checker can't judge them, so they live with the ding (checked by ear).
    sounds["letters"] = {e["text"]: e for e in entries if e["text"] in LETTERS}
    write_json(manifest_path, [e for e in entries if e["text"] not in LETTERS])
    write_json(OUT / "sounds.json", sounds)
    if lesson_voices:
        write_json(OUT / "voices.json", lesson_voices)  # publishLessonTestAudio.ts copies it into the receipt.
    write_review(entries)
    print(f"done: {len(entries)} clips, {len(failures)} failed", flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

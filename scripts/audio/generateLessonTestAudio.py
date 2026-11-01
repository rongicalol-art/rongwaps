#!/usr/bin/env python3
"""Voice the lesson tests (content/lesson-tests) in Taiwan-accent studio voices, plus the shared ding and letters.

  HF_HUB_OFFLINE=1 <venv>/bin/python scripts/audio/generateLessonTestAudio.py --lessons b1l04
  HF_HUB_OFFLINE=1 <venv>/bin/python scripts/audio/checkStudioBatch.py output/lesson-test-audio   # ASR + cut-off check
  HF_HUB_OFFLINE=1 <venv>/bin/python scripts/audio/generateLessonTestAudio.py --lessons b1l04     # re-voices rejected takes

(<venv> is the local MLX environment, output/qwen-pilot-venv in the main checkout.)

Voices (TOCFL recordings use two dialogue voices and a separate narrator):
- F: Vivian, the owner-approved studio voice;
- M: Dylan (owner-approved for speaker B) and Uncle_Fu, a non-dialect male voice, both rendered so the owner
  picks one by ear (--male picks which one the manifest publishes; default dylan);
- N: Serena, the narrator who reads questions, spoken answers and the A/B/C letters.
Dialogue voices speak naturally, like everyday conversation; the narrator reads like a test recording.

Every clip is mastered like the grammar studio clips, published as a 48 kbps copy named by its hash
(`lesson-test-studio/v1/<hash>.mp3`) and listed in <out>/manifest.json, which checkStudioBatch.py checks
(independent ASR must hear the whole sentence; the ending must fade) and publishLessonTestAudio.ts uploads.
The ding is synthesized here (a soft bell, no model). It never time-stretches speech.
"""
import argparse
import json
import math
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


def ding(destination):
    """A soft bell (C6 with bell partials and an exponential fade), mastered like speech but quieter."""
    import numpy as np
    import soundfile as sf
    rate = 24000
    seconds = 1.3
    t = np.arange(int(rate * seconds)) / rate
    f0 = 1046.5
    partials = [(1.0, 1.0, 1.6), (2.0, 0.32, 2.4), (2.76, 0.16, 3.4), (5.4, 0.05, 6.0)]
    wave = sum(amp * np.sin(2 * math.pi * f0 * ratio * t) * np.exp(-t * decay) for ratio, amp, decay in partials)
    wave *= np.minimum(1.0, t / 0.006)  # 6 ms attack: no click.
    wave = (wave / np.max(np.abs(wave)) * 0.5).astype(np.float32)
    tmp = destination.with_suffix(".tmp.wav")
    sf.write(tmp, wave, rate, subtype="FLOAT")
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(tmp), "-af", "volume=-9dB",
                    "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "96k", str(destination)], check=True)
    tmp.unlink(missing_ok=True)


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


def render(model, target, rejected, masters, mx, np, sf):
    """Try seeds until a take passes duration, pace, fade and drag checks; return its manifest entry."""
    key, text, voice, instruct, lang = target["key"], target["text"], target["voice"], target["instruct"], target["lang"]
    errors = []
    for seed, style in TAKES:
        if attempt_id(seed, style) in rejected.get(key, []):
            continue
        master = masters / f"{abs(hash((key, seed, style))) % 10**12:012d}.mp3"
        try:
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
                if syllables(text) >= 4 and voiced_pace(master, text) < MIN_VOICED_PACE:
                    raise ValueError("drags")
            published, digest = deliver(master, OUT / "studio")
            duration, _ = probe_audio(published)
            return {
                "key": key, "text": text, "spoken": text, "voice": voice, "speaker": target["speaker"],
                "file": FILE_PREFIX + published.name, "local": published.relative_to(ROOT).as_posix(),
                "master": master.relative_to(ROOT).as_posix(), "sha256": digest, "duration": round(duration, 3),
                "model": MODEL, "instruct": instruct + (SLOWER if style else ""), "seed": seed, "take": style,
                "deliveryBitrate": DELIVERY_BITRATE,
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
    args = parser.parse_args()

    targets = {}
    for key in args.lessons:
        book = int(key[1:key.index("l")])
        lesson = json.loads((CONTENT / f"book-{book}" / f"lesson{int(key[key.index('l') + 1:]):02d}.json").read_text(encoding="utf-8"))
        for speaker, text in spoken_units(lesson):
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
    if not ding_path.exists():
        ding(ding_path)
    published, digest = deliver(ding_path, OUT / "studio")
    sounds = {"ding": {"file": FILE_PREFIX + published.name, "local": published.relative_to(ROOT).as_posix(), "sha256": digest}}

    failures = []
    if pending:
        import mlx.core as mx
        import numpy as np
        import soundfile as sf
        from mlx_audio.tts.utils import load_model
        model = load_model(MODEL)
        masters = OUT / "masters"
        masters.mkdir(parents=True, exist_ok=True)
        for index, target in enumerate(pending, 1):
            try:
                entries.append(render(model, target, rejected, masters, mx, np, sf))
                print(f"[{index}/{len(pending)}] {target['voice']} {target['text']}", flush=True)
                write_json(manifest_path, [e for e in entries if e["text"] not in LETTERS])
            except Exception as error:  # noqa: BLE001
                failures.append((target["key"], str(error)))
                print(f"FAILED {target['key']}: {error}", flush=True)
    # Letters are not sentences: the ASR/pace checker can't judge them, so they live with the ding (checked by ear).
    sounds["letters"] = {e["text"]: e for e in entries if e["text"] in LETTERS}
    write_json(manifest_path, [e for e in entries if e["text"] not in LETTERS])
    write_json(OUT / "sounds.json", sounds)
    write_review(entries)
    print(f"done: {len(entries)} clips, {len(failures)} failed", flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

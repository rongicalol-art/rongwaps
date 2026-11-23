#!/usr/bin/env python3
"""Voice the lesson tests (content/lesson-tests) in Taiwan-accent studio voices, plus the shared ding and letters.

  HF_HUB_OFFLINE=1 <venv>/bin/python scripts/audio/generateLessonTestAudio.py --lessons b1l04
  HF_HUB_OFFLINE=1 <venv>/bin/python scripts/audio/checkStudioBatch.py output/lesson-test-audio   # ASR + cut-off check
  HF_HUB_OFFLINE=1 <venv>/bin/python scripts/audio/generateLessonTestAudio.py --lessons b1l04     # re-voices rejected takes

(<venv> is the local MLX environment, output/qwen-pilot-venv in the main checkout.)

  <venv>/bin/python scripts/audio/generateLessonTestAudio.py --engine yating --lessons b1l01 ... b1l16

--engine yating voices the sentences with the owner-picked Yating API voices (雅婷 F, 家豪 M, 意晴 N; key
YATING_API_KEY in .env) at each test's pace (YATING_PACE, after the textbook's recordings), and writes voices.json
(each test's voice per role) for the receipt. The A/B/C/D letters stay the English Serena clips already in the
receipt (content/audio/lesson_test_audio.json), so they are not rendered again. A batch can hold only the tests to
voice now: publishLessonTestAudio.ts adds them to the receipt and keeps the rest.

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
# Pace per test: each voice near its natural speed, evened out so 雅婷 and the narrator match 家豪's calmer pace
# (owner's pick "Natural, evened out" over stretching to the textbook's exact pace, which sounded drawn out).
# Yating speed: a higher value speaks slower (max 1.5). At the same setting 家豪 is ~10% slower than 雅婷 and 意晴 ~10%
# faster (output/checks/yating_calibrate.py), so each role has its own setting. Book 1 adds a 400 ms pause at every
# comma. The textbook's own pace (output/checks/speech_rate.py): Book 1 L1–8 ≈ 2.0 characters a second, L9–16 ≈ 2.5,
# Book 2 ≈ 3.2–3.5, Book 3 ≈ 3.9. L9–16 (owner's pick) speaks like the official TOCFL Band A mock's dialogues, ≈ 3.9
# characters a second not counting pauses (the narrator a little calmer, under MAX_PACE); Books 2 and 3 keep that speed
# without the extra comma pauses (Book 3's own recordings speak at it).
# {(book, last lesson): ({role: speed}, pauses)}
YATING_PACE = {
    (1, 8): ({"F": 1.35, "M": 1.2, "N": 1.4}, True),
    (1, 16): ({"F": 1.05, "M": 0.9, "N": 1.2}, True),
    (2, 8): ({"F": 1.05, "M": 1.0, "N": 1.2}, False),  # Owner's pick by ear (2026-11-19): about 4.6 characters a second.
    (2, 16): ({"F": 0.96, "M": 0.92, "N": 1.2}, False),  # L9–16 a step faster, about 5.0 (owner: "faster is okay").
    (3, 5): ({"F": 1.05, "M": 0.9, "N": 1.2}, False),
    # Book 3 L6–16 take Book 2's cast (YATING_CAST_FROM) and its speeds: L6–9 (TOCFL Level 3) at Book 2 L1–8's
    # ≈ 4.6 characters a second, L10–16 (Level 4) at Book 2 L9–16's ≈ 5.0. The official Band B mock's longer
    # dialogues and talks measure ≈ 4.5–4.7 with its slower narrator mixed in (2026-11-23).
    (3, 9): ({"F": 1.05, "M": 1.0, "N": 1.2}, False),
    (3, 16): ({"F": 0.96, "M": 0.92, "N": 1.2}, False),
}
# Yating pitch per role (1.0 = the voice's own). 家豪 is raised to ≈ 141 Hz, near the TOCFL mock's man (≈ 145 Hz;
# his own ≈ 118 Hz sounded heavy). Pitch does not change his speed.
YATING_PITCH = {"F": 1.0, "M": 1.3, "N": 1.0}
# A book's own dialogue cast, by ear (owner's pick, 2026-11-19, from a six-way comparison): Book 2's woman is 意晴 and
# its man Yating's second male voice, both livelier (energy 1.3). {book: {role: (model, pitch, energy)}}; the
# narrator and every other book keep the voices above.
YATING_BOOK_VOICES = {2: {"F": ("zh_en_female_2", 1.0, 1.3), "M": ("zh_en_male_2", 1.0, 1.3)}}
# Books whose dialogue voices (F, M) are published as Yating made them (owner's pick by ear, 2026-11-19: "native
# sounds better"): no trimming, no padding and no MASTERING, whose upward compressor lifted the quiet comma pauses
# into audible breath and hiss. Only a plain volume change to NATIVE_LUFS under a peak limiter, encoded once at
# NATIVE_BITRATE. Each clip keeps Yating's own ≈ 0.35 s of silence at its end, so the app adds no gap between these
# turns (src/screens/lesson-test/testAudioSequence.ts).
YATING_NATIVE_BOOKS = {2}
# Later lessons voiced in another book's cast and delivery: {(book, first lesson): book whose cast it takes}. Book 3
# L6–16 sound like Book 2 (owner, 2026-11-23: livelier sounds more natural); L1–5 keep the cast they were voiced in.
YATING_CAST_FROM = {(3, 6): 2}


def cast_book(book, lesson):
    """The book whose dialogue cast and delivery a lesson's test uses."""
    for (from_book, first), source in YATING_CAST_FROM.items():
        if book == from_book and lesson >= first:
            return source
    return book
NATIVE_LUFS = -14.5
NATIVE_BITRATE = "96k"


def yating_voice(book, speaker):
    """The (model, pitch, energy) a book's test uses for one role."""
    return YATING_BOOK_VOICES.get(book, {}).get(speaker, (YATING_VOICES[speaker], YATING_PITCH[speaker], 1.0))
# Retakes change the speed only a little, so a retaken line never sounds slower or faster than its neighbours.
# Retakes keep the pace within ±0.05; a last, slower take only when all of those fail (short narrator lines can run
# just past MAX_PACE). Yating's speed is a length factor: a higher value speaks slower.
YATING_SPEED_STEPS = (0.0, -0.05, 0.05, 0.1)
# A faster test's dialogue gets a higher "too fast" cap than MAX_PACE: Book 2 aims at ≈ 4.6 (L1–8) and ≈ 5.0 (L9–16)
# characters a second, so short lines run past 4.5. {(book, last lesson): characters a second}; the narrator keeps
# MAX_PACE["N"].
YATING_MAX_PACE = {(2, 8): 5.2, (2, 16): 5.6, (3, 9): 5.2, (3, 16): 5.6}
YATING_TAKES = [(take, "y") for take in range(len(YATING_SPEED_STEPS))]


def yating_pace(book, lesson, speaker):
    """The (speed, pauses) a lesson's test uses for one role."""
    speeds, pauses = YATING_PACE[pace_band(book, lesson)]
    return speeds[speaker], pauses


def pace_band(book, lesson):
    """The YATING_PACE key a lesson's test falls in."""
    for pace_book, last in sorted(YATING_PACE):
        if pace_book == book and lesson <= last:
            return pace_book, last
    raise SystemExit(f"No Yating pace for book {book}")


def max_pace(book, lesson, speaker):
    """The "too fast" cap for one role in one test."""
    return MAX_PACE[speaker] if speaker == "N" else YATING_MAX_PACE.get(pace_band(book, lesson), MAX_PACE[speaker])


def yating_label(speaker, speed, pauses, book=0):
    """The receipt's voice name: Yating model, speed, pause flag, any pitch and energy (e.g. zh_en_male_1@1.2p-pitch1.3)."""
    model, pitch, energy = yating_voice(book, speaker)
    return (f"{model}@{speed}{'p' if pauses else ''}" + (f"-pitch{pitch}" if pitch != 1.0 else "")
            + (f"-energy{energy}" if energy != 1.0 else ""))


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
    """The Yating call for a target's take: text (comma pauses as SSML), model, speed (nudged per retake), SSML flag
    and pitch."""
    speed = round(min(1.5, max(0.5, target["speed"] + YATING_SPEED_STEPS[take])), 2)
    text, pitch = target["text"], target["pitch"]
    if target["pauses"] and "，" in text:
        return "<speak>" + text.replace("，", '，<break time="400ms"/>') + "</speak>", target["model"], speed, True, pitch
    return text, target["model"], speed, False, pitch


def yating_energy(target):
    return target.get("energy", 1.0)


def yating_model(target, take):
    """The manifest's model field for a Yating take: model and the speed actually sent."""
    if take >= len(YATING_SPEED_STEPS):
        return None
    _, model, speed, _, pitch = yating_request(target, take)
    energy = yating_energy(target)
    return (f"yating-tts-v2/{model}/speed-{speed}" + (f"/pitch-{pitch}" if pitch != 1.0 else "")
            + (f"/energy-{energy}" if energy != 1.0 else ""))


def synthesize_yating(target, take, np, sf):
    """One Yating take (cached by request), trimmed and padded like the Qwen takes; a native take stays as it came."""
    import io
    from yatingTts import synthesize as yating
    text, model, speed, ssml, pitch = yating_request(target, take)
    audio, rate = sf.read(io.BytesIO(yating(text, model, speed=speed, pitch=pitch, energy=yating_energy(target), ssml=ssml)), dtype="float32")
    audio = np.asarray(audio, dtype=np.float32).reshape(-1)
    trimmed = trim_to_active(audio, np)  # Also rejects silent or broken audio.
    if target.get("native"):
        return audio, rate
    pad = np.zeros(round(rate * TRIM_PADDING), dtype=np.float32)
    return np.concatenate([pad, trimmed, pad]), rate


def master_native(source, destination):
    """A native take: turned to NATIVE_LUFS under a limiter and encoded once, with its true peak at most -1 dBFS."""
    gain = NATIVE_LUFS - measure_quality(source)["integratedLufs"]
    limit = 0.84
    for _ in range(4):
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(source),
                        "-af", f"volume={gain:.2f}dB,alimiter=limit={limit:.3f}:level=0", "-map_metadata", "-1",
                        "-vn", "-ac", "1", "-codec:a", "libmp3lame", "-b:a", NATIVE_BITRATE, str(destination)], check=True)
        peak = measure_quality(destination)["truePeakDbfs"]
        if peak <= -1.0:
            return
        limit *= 10 ** (-(peak + 1.2) / 20)
    raise ValueError(f"Encoded peaks remain unsafe: {destination.name}")


def publish_native(master, folder):
    """A native take is published as its master (already encoded once), named by its content hash."""
    folder.mkdir(parents=True, exist_ok=True)
    digest = file_sha256(master)
    destination = folder / f"{digest[:12]}.mp3"
    shutil.copyfile(master, destination)
    return destination, digest


def render(model, target, rejected, masters, mx, np, sf):
    """Try takes until one passes duration, pace, fade and drag checks; return its manifest entry."""
    key, text, voice, instruct, lang = target["key"], target["text"], target["voice"], target["instruct"], target["lang"]
    yating = target.get("engine") == "yating"
    native = yating and target.get("native")
    errors = []
    takes = YATING_TAKES if yating else TAKES
    if "seedFirst" in target:  # A line re-mastered as native tries the take that passed before first.
        takes = sorted(takes, key=lambda take: take[0] != target["seedFirst"])
    for seed, style in takes:
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
                if pace > target.get("maxPace", MAX_PACE[target["speaker"]]):
                    raise ValueError(f"too fast ({pace:.2f}/s)")
            wav = master.with_suffix(".tmp.wav")
            sf.write(wav, audio, rate, subtype="FLOAT")
            (master_native if native else master_recording)(wav, master)
            wav.unlink(missing_ok=True)
            if lang == LANG_CODE:
                if ending_ratio(master) > ENDING_MAX and not target.get("endingReviewed"):
                    raise ValueError("ends abruptly")
                if syllables(text) >= 4 and voiced_pace(master, text) < floor:
                    raise ValueError("drags")
            published, digest = publish_native(master, OUT / "studio") if native else deliver(master, OUT / "studio")
            duration, _ = probe_audio(published)
            return {
                "key": key, "text": text, "spoken": text, "voice": voice, "speaker": target["speaker"],
                "file": FILE_PREFIX + published.name, "local": published.relative_to(ROOT).as_posix(),
                "master": master.relative_to(ROOT).as_posix(), "sha256": digest, "duration": round(duration, 3),
                "model": yating_model(target, seed) if yating else MODEL,
                "instruct": "" if yating else instruct + (SLOWER if style else ""), "seed": seed, "take": style,
                "deliveryBitrate": NATIVE_BITRATE if native else DELIVERY_BITRATE, "minVoicedPace": floor,
                **({"native": True} if native else {}),
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

    # A line another test already published in the same voice and pace keeps that recording (the receipt has it), so
    # a shared narrator line sounds the same in every test and is never paid for twice.
    receipt = ROOT / "content/audio/lesson_test_audio.json"
    published = json.loads(receipt.read_text(encoding="utf-8")) if args.engine == "yating" and receipt.exists() else {}
    targets = {}
    lesson_voices = {}  # Yating: which voice label each test uses per role (its pace), for the receipt.
    reviewed_path = OUT / "asr-reviewed.json"  # An "ending" note: a crisp ending shown to be complete (checkStudioBatch).
    reviewed = json.loads(reviewed_path.read_text(encoding="utf-8")) if reviewed_path.exists() else {}
    for key in args.lessons:
        book = int(key[1:key.index("l")])
        number = int(key[key.index('l') + 1:])
        lesson = json.loads((CONTENT / f"book-{book}" / f"lesson{number:02d}.json").read_text(encoding="utf-8"))
        if args.engine == "yating":
            lesson_voices[key] = {s: yating_label(s, *yating_pace(book, number, s), cast_book(book, number)) for s in YATING_VOICES}
        for speaker, text in spoken_units(lesson):
            if args.engine == "yating":
                speed, pauses = yating_pace(book, number, speaker)
                cast = cast_book(book, number)
                voice = yating_label(speaker, speed, pauses, cast)
                model, pitch, energy = yating_voice(cast, speaker)
                native = cast in YATING_NATIVE_BOOKS and speaker != "N"
                if clip_key(voice, text) in published.get("clips", {}) and not native:
                    continue
                targets[clip_key(voice, text)] = {"key": clip_key(voice, text), "text": text, "voice": voice,
                                                  "speaker": speaker, "instruct": "", "lang": LANG_CODE, "engine": "yating",
                                                  "model": model, "speed": speed, "pauses": pauses,
                                                  "pitch": pitch, "energy": energy, "native": native,
                                                  "maxPace": max_pace(book, number, speaker),
                                                  "endingReviewed": bool(reviewed.get(clip_key(voice, text), {}).get("ending"))}
                continue
            voices = [VOICES.get(speaker)] if speaker != "M" else [MALE_VOICES[args.male]] + (
                [v for k, v in MALE_VOICES.items() if k != args.male] if args.both_male else [])
            for voice in voices:
                instruct = NARRATOR_INSTRUCT if speaker == "N" else DIALOGUE_INSTRUCT
                targets[clip_key(voice, text)] = {"key": clip_key(voice, text), "text": text, "voice": voice,
                                                  "speaker": speaker, "instruct": instruct, "lang": LANG_CODE}
    # The letters are the published English clips (owner's choice); a Yating batch reuses them from the receipt.
    published_letters = published.get("sounds", {}).get("letters")
    if not published_letters:
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
        if previous and target.get("engine") == "yating" and previous.get("model") != yating_model(target, previous["seed"]):
            previous = None  # Rendered at another speed (an older retake rule): render it again at this one.
        if previous and bool(previous.get("native")) != bool(target.get("native")):
            target = {**target, "seedFirst": previous["seed"]}  # Re-master the same take the other way.
            previous = None
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
                text, model, speed, ssml, pitch = yating_request(target)
                return yating(text, model, speed=speed, pitch=pitch, energy=yating_energy(target), ssml=ssml)

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

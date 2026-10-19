#!/usr/bin/env python3
"""Generate Vivian studio clips for L1-L8 grammar examples and pattern rows.

Run with the local MLX environment and model cache:
  HF_HUB_OFFLINE=1 output/qwen-pilot-venv/bin/python scripts/audio/generateGrammarStudioAudio.py
  HF_HUB_OFFLINE=1 output/qwen-pilot-venv/bin/python scripts/audio/generateGrammarStudioAudio.py --limit 2
  HF_HUB_OFFLINE=1 output/qwen-pilot-venv/bin/python scripts/audio/generateGrammarStudioAudio.py --takes 6
  HF_HUB_OFFLINE=1 output/qwen-pilot-venv/bin/python scripts/audio/generateGrammarStudioAudio.py --refresh-audio

`--refresh-audio` masters published local takes and regenerates flagged takes or delivery above four Chinese
characters per second with a naturally slower instruction. It never time-stretches speech.
Publication additionally requires content QA and measured encoded peak/loudness results.

Qwen's pace wanders between takes (it often slows down on numbers and times), so `--takes N`
also renders seeds 42..42+N-1 of every sentence; `scoreGrammarStudioTakes.py --pick` then
writes the steadiest take's seed to studio-picks.json, and the next run uses it.
"""
import argparse
import hashlib
import html
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # Repository root.
GRAMMAR_DIR = ROOT / "content/grammar"  # Authored grammar pages.
TRACK_CLIPS = ROOT / "content/audio/grammar_track_clips.json"  # Grammar-track book clips.
BOOK_CLIPS = ROOT / "content/audio/grammar_book_clips.json"  # Dialogue-track book clips.
OUT_DIR = ROOT / "output/grammar-audio"  # Local review artifacts.
AUDIO_DIR = OUT_DIR / "studio"  # Generated MP3 files.
MANIFEST_PATH = OUT_DIR / "studio-manifest.json"  # Resumable studio inventory.
REVIEW_PATH = OUT_DIR / "studio-review.html"  # Local listening page.
NUMBERS_PATH = OUT_DIR / "studio-numbers.json"  # Review row number lookup.
PICKS_PATH = OUT_DIR / "studio-picks.json"  # Seed chosen per key by scoreGrammarStudioTakes.py --pick.
MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-8bit"  # Cached Qwen voice model.
VOICE = "Vivian"  # Selected studio speaker (and speaker A of a dialogue).
B_VOICE = "Dylan"  # Speaker B of an A/B dialogue (owner's pick by ear, 2026-10-18).
LANG_CODE = "Chinese"  # Qwen language code.
INSTRUCT = "用台灣國語的口音朗讀，像台灣的華語老師在課堂上清楚地示範，語氣溫和自然，語速適中，不要捲舌音太重。"  # Studio delivery.
SEED = 42  # Primary generation seed.
RETRY_SEED = 43  # Single retry seed for invalid audio.
MAX_TOKENS = 512  # Qwen generation limit.
TURN_SILENCE = 0.6  # Silence between dialogue turns.
TRIM_PADDING = 0.1  # Silence retained at the outside edges.
SILENCE_THRESHOLD = 0.003  # Absolute amplitude threshold for trimming and silence checks.
MIN_SECONDS_PER_HAN = 0.15  # Shortest accepted clip per Han character.
MAX_SECONDS_PER_HAN = 1.2  # Longest accepted clip per Han character.
MP3_BITRATE = "96k"  # Preserve detail when mastering existing approved MP3s.
MASTERING = "acompressor=mode=upward:threshold=0.4:ratio=4:attack=5:release=100,volume=1.78,alimiter=limit=0.66:level=0:latency=1"
SLOW_INSTRUCT = INSTRUCT + " 面向初學者，語速稍慢，像老師耐心示範完整的句子。在詞組和標點之間自然停頓，保持連貫、溫暖的語氣。不要趕著說，不要逐字念，也不要拖長字音。只朗讀提供的文字，不增添、不省略任何字詞。"
HAN_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\U00020000-\U0002fa1f]")  # Han characters used for keys.
SPEAKER_RE = re.compile(r"(?<![A-Za-z])([AB])[:：]\s*")  # Textbook A/B speaker labels.
PAREN_RE = re.compile(r"[()（）]")  # Optional-parenthesis delimiters.
CLOCK_RE = re.compile(r"[一二兩两三四五六七八九十]+(?=[點点分月號号日])")  # A number in a time or date.
DIGITS = {"一": 1, "二": 2, "兩": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}  # Numerals to digits.
SPELLED_CLOCK = {"十一點多", "十一点多"}  # Keep the owner-selected spoken form of this phrase.
ALTERNATIVE_RE = re.compile(r"[/／][\u3400-\u9fff]+")  # "號/日": the book's alternative word; read only the first.


def han(text):
    """Return only the Han characters, preserving their original order."""
    return "".join(HAN_RE.findall(text or ""))


def load_clip_keys(path):
    """Read the existing book recordings as Han-only sentence keys."""
    data = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    return {han(key) for key in data if han(key)}


def row_text(row, script="traditional"):
    """Join authored tokens in the pattern row's visual column order."""
    groups = row.get("columns")
    if groups is None:
        groups = [row.get(name) or [] for name in ("subject", "grammar", "complement")]
    # Punctuation rides on the tokens (`suffix` 。？): keep it, so a question is read as one.
    return "".join(
        f"{token.get('prefix', '')}{token.get(script) or token.get('traditional', '')}{token.get('suffix', '')}"
        for group in groups
        for token in (group or [])
        if isinstance(token, dict)
    )


def clock_digits(text):
    """Write times and dates in digits (十點十五分 → 10點15分): Qwen reads them as a time at a natural
    pace, where spelled-out numerals drag (owner's pick by ear, 2026-10-18). The words said are the same.
    一點 stays: in 一點兒 / 一點東西 it means "a little", not one o'clock."""
    def to_digits(match):
        numeral = match.group(0)
        if numeral == "一" and text[match.end()] in "點点":
            return numeral
        tens, _, ones = numeral.rpartition("十")
        if "十" not in numeral:
            return str(DIGITS[numeral]) if len(numeral) == 1 else numeral
        value = (DIGITS[tens] if tens else 1) * 10 + (DIGITS[ones] if ones else 0)
        return str(value)
    if any(phrase in text for phrase in SPELLED_CLOCK):
        return text
    return CLOCK_RE.sub(to_digits, text)


def speaker_turns(text):
    """Strip A/B labels and optional-parenthesis marks, retaining turn boundaries."""
    matches = list(SPEAKER_RE.finditer(text))
    if matches and not text[:matches[0].start()].strip():
        pieces = [
            text[match.end():matches[index + 1].start() if index + 1 < len(matches) else len(text)]
            for index, match in enumerate(matches)
        ]
    else:
        pieces = [SPEAKER_RE.sub("", text)]
    spoken = [clock_digits(ALTERNATIVE_RE.sub("", PAREN_RE.sub("", piece))).strip() for piece in pieces]
    return [piece for piece in spoken if piece]


def user_record(page, item, kind):
    """Build the user reference retained for every occurrence of a key."""
    return {"page": page, "id": str(item.get("id") or "unknown"), "kind": kind}


def add_target(targets, counts, totals, key, text, user, sort_order, clipped, synthesis_text=None):
    """Count a source user and add it only when neither book source has a clip."""
    totals[user["kind"]] += 1
    if key in clipped:
        return
    counts[user["kind"]] += 1
    target = targets.setdefault(key, {
        "key": key,
        "text": text,
        # Use the authored simplified form: Qwen can misread traditional 餓 as a different word.
        "turns": speaker_turns(synthesis_text or text),
        "users": [],
        "order": sort_order,
    })
    identity = (user["page"], user["id"], user["kind"])
    known = {(entry["page"], entry["id"], entry["kind"]) for entry in target["users"]}
    if identity not in known:
        target["users"].append(user)


def collect_targets():
    """Collect uncovered L1-L8 examples and eligible pattern rows in book order."""
    clipped = load_clip_keys(TRACK_CLIPS) | load_clip_keys(BOOK_CLIPS)
    targets = {}
    missing = Counter()
    totals = Counter()
    parts = []
    for path in sorted(GRAMMAR_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        for part_name, part in data.items():
            if not isinstance(part, dict):
                continue
            lesson = part.get("lessonId")
            part_number = part.get("partId")
            if not isinstance(lesson, int) or lesson > 8 or lesson < 1:
                continue
            parts.append((lesson, int(part_number or 0), path.name, part_name, part))
    parts.sort(key=lambda entry: entry[:4])

    for lesson, part_number, file_name, part_name, part in parts:
        for page_index, page in enumerate(part.get("grammarPages") or []):
            page_id = str(page.get("id") or page.get("pageId") or "unknown")
            for item_index, example in enumerate(page.get("examples") or []):
                text = ((example.get("text") or {}).get("traditional") or "").strip()
                key = han(text)
                if not key:
                    continue
                add_target(
                    targets, missing, totals, key, text,
                    user_record(page_id, example, "example"),
                    (lesson, part_number, page_index, 0, item_index, file_name, part_name),
                    clipped, (example.get("text") or {}).get("simplified"),
                )

            rows = list(page.get("patternRows") or [])
            for subsection in page.get("subsections") or []:
                rows.extend(subsection.get("patternRows") or [])
            for row_index, row in enumerate(rows):
                if row.get("exampleId"):
                    continue
                text = row_text(row).strip()
                key = han(text)
                if not key:
                    continue
                add_target(
                    targets, missing, totals, key, text,
                    user_record(page_id, row, "row"),
                    (lesson, part_number, page_index, 1, row_index, file_name, part_name),
                    clipped, row_text(row, "simplified"),
                )
    ordered = sorted(targets.values(), key=lambda item: item["order"])
    return ordered, missing, totals


def recipe_text(key, turns, seed):
    """Serialize every generation choice that can change the generated audio."""
    recipe = {
        "model": MODEL,
        "voice": VOICE,
        "lang_code": LANG_CODE,
        "instruct": SLOW_INSTRUCT,
        "seed": seed,
        "max_tokens": MAX_TOKENS,
        "mp3_codec": "libmp3lame",
        "mp3_bitrate": MP3_BITRATE,
        "mp3_channels": 1,
        "mp3_sample_rate": 24000,
        "wav_subtype": "FLOAT",
        "mastering": MASTERING,
        "turn_silence": TURN_SILENCE,
        "trim_padding": TRIM_PADDING,
        "silence_threshold": SILENCE_THRESHOLD,
        "spoken_turns": turns,
    }
    if len(turns) > 1:  # Only dialogues read B in a second voice; single sentences keep their files.
        recipe["turn_voices"] = [turn_voice(index) for index in range(len(turns))]
    return key + json.dumps(recipe, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def output_for(key, turns, seed):
    """Return the full recipe digest, destination MP3, and recipe sidecar."""
    digest = hashlib.sha256(recipe_text(key, turns, seed).encode("utf-8")).hexdigest()
    filename = f"{digest[:12]}.mp3"
    path = AUDIO_DIR / filename
    return digest, path, path.with_suffix(path.suffix + ".recipe.sha256")


def file_sha256(path):
    """Hash a completed output file for the manifest."""
    digest = hashlib.sha256()
    with path.open("rb") as audio_file:
        for block in iter(lambda: audio_file.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def probe_audio(path):
    """Read the encoded MP3 duration and channel count with ffprobe."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error", "-select_streams", "a:0",
            "-show_entries", "stream=channels:format=duration",
            "-of", "json", str(path),
        ],
        capture_output=True, text=True, check=True,
    )
    data = json.loads(result.stdout)
    stream = data["streams"][0]
    return float(data["format"]["duration"]), int(stream["channels"])


def cached_entry(target, seed, old_entries):
    """Prefer refreshed manifest takes; otherwise require an exact recipe hash."""
    previous = old_entries.get(target["key"])
    if previous and previous.get("mastering") == MASTERING and previous.get("text") == target["text"]:
        published = ROOT / previous["local"]
        if published.is_file() and file_sha256(published) == previous.get("sha256"):
            return {**previous, "users": target["users"]}
    digest, path, sidecar = output_for(target["key"], target["turns"], seed)
    if not path.is_file() or not sidecar.is_file():
        return None
    if sidecar.read_text(encoding="utf-8").strip() != digest:
        return None
    previous = old_entries.get(target["key"])
    if previous and previous.get("sha256") == file_sha256(path):
        duration = float(previous.get("duration", 0))
    else:
        try:
            duration, channels = probe_audio(path)
            if channels != 1:
                return None
        except (OSError, KeyError, ValueError, subprocess.CalledProcessError, json.JSONDecodeError):
            return None
    return build_manifest_entry(target, seed, path, duration)


def build_manifest_entry(target, seed, path, duration):
    """Build the requested public manifest shape for one generated key."""
    return {
        "key": target["key"],
        "text": target["text"],
        "spoken": " ".join(target["turns"]),
        "users": target["users"],
        "file": f"grammar-studio/v1/{path.name}",
        "local": path.relative_to(ROOT).as_posix(),
        "duration": round(duration, 3),
        "sha256": file_sha256(path),
        "model": MODEL,
        "voice": VOICE,
        "instruct": SLOW_INSTRUCT,
        "seed": seed,
        "mastering": MASTERING,
        "quality": measure_quality(path),
    }


def trim_to_active(audio, np):
    """Remove model-supplied edge silence and reject silent or non-finite audio."""
    if audio.size == 0 or not np.isfinite(audio).all():
        raise ValueError("empty or non-finite waveform")
    active = np.flatnonzero(np.abs(audio) >= SILENCE_THRESHOLD)
    if active.size == 0:
        raise ValueError("silent waveform")
    return audio[active[0]:active[-1] + 1]


def turn_voice(index):
    """Every dialogue is A then B: A in the studio voice, B in the second one."""
    return VOICE if index % 2 == 0 else B_VOICE


def synthesize(model, turns, seed, mx, np, instruct=SLOW_INSTRUCT):
    """Generate each dialogue turn separately (B in its own voice) and join turns with 0.6 s silence."""
    turn_audio = []
    sample_rate = None
    for index, turn in enumerate(turns):
        mx.random.seed(seed)
        results = list(model.generate(
            turn, voice=turn_voice(index), lang_code=LANG_CODE, instruct=instruct,
            max_tokens=MAX_TOKENS,
        ))
        if not results:
            raise ValueError("model returned no audio")
        rates = {int(result.sample_rate) for result in results}
        if len(rates) != 1:
            raise ValueError("model returned inconsistent sample rates")
        this_rate = rates.pop()
        if sample_rate is not None and this_rate != sample_rate:
            raise ValueError("dialogue turns have different sample rates")
        sample_rate = this_rate
        audio = np.concatenate([
            np.asarray(result.audio, dtype=np.float32).reshape(-1)
            for result in results
        ])
        turn_audio.append(trim_to_active(audio, np))

    gap = np.zeros(round(sample_rate * TURN_SILENCE), dtype=np.float32)
    pieces = []
    for index, audio in enumerate(turn_audio):
        if index:
            pieces.append(gap)
        pieces.append(audio)
    padding = np.zeros(round(sample_rate * TRIM_PADDING), dtype=np.float32)
    combined = np.concatenate([padding, *pieces, padding])
    if not np.isfinite(combined).all() or combined.size == 0:
        raise ValueError("joined waveform is empty or non-finite")
    if float(np.max(np.abs(combined))) < SILENCE_THRESHOLD:
        raise ValueError("joined waveform is silent")
    return combined, sample_rate


def validate_duration(audio, sample_rate, key):
    """Enforce the requested duration range for the Han-only sentence key."""
    duration = len(audio) / sample_rate
    han_count = len(key)
    seconds_per_han = duration / han_count
    if not MIN_SECONDS_PER_HAN <= seconds_per_han <= MAX_SECONDS_PER_HAN:
        raise ValueError(
            f"{duration:.2f}s / {han_count} Han characters "
            f"= {seconds_per_han:.2f}s per character"
        )
    return duration


def measure_quality(path):
    """Measure the delivered MP3, including codec peak overshoot."""
    result = subprocess.run([
        "ffmpeg", "-hide_banner", "-nostats", "-i", str(path),
        "-af", "ebur128=peak=true:framelog=quiet", "-f", "null", "-",
    ], capture_output=True, text=True, check=True)
    loudness = re.search(r"Integrated loudness:\s*I:\s*(-?[\d.]+) LUFS", result.stderr)
    peak = re.search(r"True peak:\s*Peak:\s*(-?[\d.]+) dBFS", result.stderr)
    if not loudness or not peak:
        raise ValueError(f"Cannot measure {path.name}")
    return {"integratedLufs": float(loudness.group(1)), "truePeakDbfs": float(peak.group(1))}


def master_recording(source, destination):
    """Level speech without changing its pitch, tempo, or phrasing; check encoded peaks."""
    gain = 0.0
    for _ in range(3):
        subprocess.run([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(source),
            "-af", f"{MASTERING},volume={gain}dB", "-map_metadata", "-1",
            "-vn", "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame",
            "-b:a", MP3_BITRATE, str(destination),
        ], capture_output=True, text=True, check=True)
        quality = measure_quality(destination)
        if quality["truePeakDbfs"] <= -1.0:
            if not -17 <= quality["integratedLufs"] <= -9:
                raise ValueError(f"Unexpected mastered loudness: {quality}")
            return quality
        gain -= quality["truePeakDbfs"] + 1.3
    raise ValueError(f"Encoded peaks remain unsafe: {destination.name}")


def encode_mp3(audio, sample_rate, destination, sf):
    """Master the original generated waveform and encode a mono MP3."""
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    wav_path = destination.with_name(destination.stem + ".tmp.wav")
    mp3_path = destination.with_name(destination.stem + ".tmp.mp3")
    try:
        sf.write(wav_path, audio, sample_rate, subtype="FLOAT")
        master_recording(wav_path, mp3_path)
        mp3_path.replace(destination)
    finally:
        wav_path.unlink(missing_ok=True)
        mp3_path.unlink(missing_ok=True)


def write_json(path, data):
    """Write readable UTF-8 JSON with a trailing newline."""
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_review(entries):
    """Write numbered listening rows and the matching number-to-key index."""
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    numbers = {}
    rows = []
    for number, entry in enumerate(entries, start=1):
        numbers[str(number)] = entry["key"]
        users = ", ".join(
            f'{user["page"]} · {user["kind"]} {user["id"]}'
            for user in entry["users"]
        )
        source = f'studio/{Path(entry["local"]).name}'
        rows.append(
            "<tr>"
            f"<td>{number}</td>"
            f'<td><small>{html.escape(users)}</small></td>'
            f'<td lang="zh-Hant">{html.escape(entry["text"])}</td>'
            f'<td><audio controls preload="none" src="{html.escape(source, quote=True)}"></audio></td>'
            "</tr>"
        )
    document = (
        "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\">"
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        "<title>Grammar studio voice review</title>"
        "<style>body{font:16px system-ui,sans-serif;max-width:1100px;margin:2rem auto;padding:0 1rem}"
        "table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;"
        "padding:.65rem;border-bottom:1px solid #ddd}audio{width:240px}small{color:#555}</style>"
        "<h1>Grammar studio voice review</h1>"
        f"<p>{len(entries)} clips · {html.escape(VOICE)} · {html.escape(MODEL)}</p>"
        "<table><thead><tr><th>#</th><th>Page and user</th><th>Text</th><th>Audio</th></tr></thead>"
        "<tbody>" + "".join(rows) + "</tbody></table></html>"
    )
    REVIEW_PATH.write_text(document, encoding="utf-8")
    write_json(NUMBERS_PATH, numbers)


def render_takes(targets, count, model):
    """Render the extra seeds of every key (skipping ones on disk) for the pace picker."""
    import mlx.core as mx
    import numpy as np
    import soundfile as sf
    from mlx_audio.tts.utils import load_model
    model = model or load_model(MODEL)
    for target in targets:
        for seed in range(SEED, SEED + count):
            digest, path, sidecar = output_for(target["key"], target["turns"], seed)
            if path.is_file() and sidecar.is_file():
                continue
            try:
                audio, sample_rate = synthesize(model, target["turns"], seed, mx, np)
                validate_duration(audio, sample_rate, target["key"])
                encode_mp3(audio, sample_rate, path, sf)
                sidecar.write_text(digest + "\n", encoding="utf-8")
                print(f"take {target['key']} seed {seed}", flush=True)
            except Exception as error:
                print(f"take {target['key']} seed {seed} skipped: {type(error).__name__}: {error}", flush=True)


def refresh_audio():
    """Keep approved slow takes; regenerate rushed or transcription-flagged takes."""
    import mlx.core as mx
    import numpy as np
    import soundfile as sf
    from mlx_audio.tts.utils import load_model
    from align_mms import pinyinize

    checkpoint = OUT_DIR / "studio-refresh-manifest.json"
    originals = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    completed = json.loads(checkpoint.read_text(encoding="utf-8")) if checkpoint.exists() else []
    by_key = {entry["key"]: entry for entry in completed}
    targets = {target["key"]: target for target in collect_targets()[0]}
    transcript_path = OUT_DIR / "studio-asr-report.json"
    transcripts = json.loads(transcript_path.read_text()) if transcript_path.exists() else {}
    model = None
    for original in originals:
        key = original["key"]
        target = targets[key]
        transcript = transcripts.get(key)
        failed_speech = bool(transcript and transcript["sha256"] == original["sha256"]
                             and pinyinize(transcript["transcript"]) != pinyinize(" ".join(target["turns"])))
        cached = original if original.get("mastering") == MASTERING else by_key.get(key)
        if (not failed_speech and cached and cached.get("mastering") == MASTERING
                and (cached["sha256"] == original["sha256"] or cached.get("previousSha256") == original["sha256"])
                and (ROOT / cached["local"]).is_file() and file_sha256(ROOT / cached["local"]) == cached["sha256"]):
            by_key[key] = cached
            continue
        source = ROOT / original["local"]
        if file_sha256(source) != original["sha256"]:
            raise ValueError(f"Approved source changed: {key}")
        pace = len(han(original["spoken"])) / original["duration"]
        if pace > 4 or failed_speech:
            if model is None:
                model = load_model(MODEL)
            first_seed = original["seed"] + 1 if failed_speech else SEED
            for seed in range(first_seed, first_seed + 8):
                delivery = SLOW_INSTRUCT
                if seed >= first_seed + 4:
                    delivery += " 語速明顯放慢，大約是正常語速的百分之七十，每個短句之後自然停頓。保持句子連貫，不要機械地逐字讀。"
                try:
                    audio, sample_rate = synthesize(model, target["turns"], seed, mx, np, delivery)
                    duration = validate_duration(audio, sample_rate, key)
                except ValueError as error:
                    print(f"retry invalid take {key}: {error} (seed {seed})", flush=True)
                    continue
                new_pace = len(han(original["spoken"])) / duration
                if not 0 < new_pace <= 3.9:
                    print(f"retry pace {key}: {new_pace:.2f} chars/s (seed {seed})", flush=True)
                    continue
                recipe = recipe_text(key, target["turns"], seed) + delivery
                digest = hashlib.sha256(recipe.encode("utf-8")).hexdigest()
                destination = AUDIO_DIR / f"{digest[:12]}.mp3"
                encode_mp3(audio, sample_rate, destination, sf)
                duration, channels = probe_audio(destination)
                if channels != 1:
                    raise ValueError(f"Non-mono output: {key}")
                entry = build_manifest_entry(target, seed, destination, duration)
                entry["instruct"] = delivery
                entry["regenerated"] = True
                break
            else:
                raise ValueError(f"No natural take at a suitable pace: {key}")
        else:
            digest = hashlib.sha256((original["sha256"] + MASTERING + MP3_BITRATE).encode()).hexdigest()
            destination = AUDIO_DIR / f"{digest[:12]}.mp3"
            quality = master_recording(source, destination)
            duration, channels = probe_audio(destination)
            if channels != 1 or abs(duration - original["duration"]) > 0.15:
                raise ValueError(f"Mastering changed the timing: {key}")
            entry = {**original, "file": f"grammar-studio/v1/{destination.name}",
                     "local": destination.relative_to(ROOT).as_posix(), "duration": round(duration, 3),
                     "sha256": file_sha256(destination), "mastering": MASTERING, "quality": quality}
        entry["previousSha256"] = original.get("previousSha256", original["sha256"])
        entry["previousFile"] = original.get("previousFile", original["file"])
        by_key[key] = entry
        write_json(checkpoint, list(by_key.values()))
        print(f"{'regenerated' if entry.get('regenerated') else 'mastered'} {key}: {entry['duration']:.2f}s, {entry['quality']['integratedLufs']:.1f} LUFS", flush=True)
    entries = [by_key[entry["key"]] for entry in originals]
    write_json(MANIFEST_PATH, entries)
    write_review(entries)
    print(f"Refreshed {len(entries)} clips; regenerated {sum(bool(e.get('regenerated')) for e in entries)} naturally. No tempo stretching.", flush=True)


def main():
    """Collect targets, resume cached clips, generate, and write review artifacts."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, help="Generate only the first N uncovered keys.")
    parser.add_argument("--takes", type=int, default=0, help="Also render seeds 42..42+N-1 of every key.")
    parser.add_argument("--refresh-audio", action="store_true", help="Regenerate rushed or transcription-flagged clips and master all studio clips.")
    args = parser.parse_args()
    if args.refresh_audio:
        refresh_audio()
        return
    if args.limit is not None and args.limit < 0:
        parser.error("--limit must be zero or greater")

    targets, missing, totals = collect_targets()
    print(
        f"Uncovered users: {missing['example']} examples, {missing['row']} rows; "
        f"{len(targets)} unique keys ({totals['example']} total examples, {totals['row']} eligible rows).",
        flush=True,
    )
    selected = targets[:args.limit] if args.limit is not None else targets
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    old_data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8")) if MANIFEST_PATH.exists() else []
    old_entries = {entry.get("key"): entry for entry in old_data if isinstance(entry, dict)}
    by_key = {}
    failures = []
    picks = json.loads(PICKS_PATH.read_text(encoding="utf-8")) if PICKS_PATH.exists() else {}
    for target in targets:
        seeds = [picks[target["key"]]] if target["key"] in picks else []
        for seed in seeds + [SEED, RETRY_SEED]:
            entry = cached_entry(target, seed, old_entries)
            if entry is not None:
                by_key[target["key"]] = entry
                break

    pending = [target for target in selected if target["key"] not in by_key]
    if pending:
        try:
            import mlx.core as mx
            import numpy as np
            import soundfile as sf
            from mlx_audio.tts.utils import load_model
        except Exception as error:
            reason = f"{type(error).__name__}: {error}"
            failures.extend((item["key"], f"audio runtime unavailable: {reason}") for item in pending)
            print(f"Audio runtime unavailable: {reason}", file=sys.stderr, flush=True)
            print(
                f"Blocked {len(pending)} selected key(s) before inference: "
                + ", ".join(item["key"] for item in pending),
                file=sys.stderr, flush=True,
            )
            entries = [by_key[item["key"]] for item in targets if item["key"] in by_key]
            write_json(MANIFEST_PATH, entries)
            write_review(entries)
            raise SystemExit(2)

    model = None
    generated_keys = set()
    for target in pending:
        key = target["key"]
        if not target["turns"]:
            failures.append((key, "no speakable text"))
            print(f"failed {key}: no speakable text", flush=True)
            continue
        try:
            if model is None:
                model = load_model(MODEL)
        except Exception as error:
            reason = f"model load blocked: {type(error).__name__}: {error}"
            failures.extend((item["key"], reason) for item in selected if item["key"] not in by_key)
            print(reason, file=sys.stderr, flush=True)
            break

        first_error = None
        for seed in (SEED, RETRY_SEED):
            digest, path, sidecar = output_for(key, target["turns"], seed)
            try:
                audio, sample_rate = synthesize(model, target["turns"], seed, mx, np)
                duration = validate_duration(audio, sample_rate, key)
                if len(han("".join(target["turns"]))) / duration > 4:
                    raise ValueError("Generated delivery exceeds four Chinese characters per second")
                encode_mp3(audio, sample_rate, path, sf)
                encoded_duration, channels = probe_audio(path)
                if channels != 1:
                    raise ValueError(f"encoded MP3 has {channels} channels")
                if abs(encoded_duration - duration) > 0.15:
                    raise ValueError(f"encoded duration changed from {duration:.2f}s to {encoded_duration:.2f}s")
                sidecar.write_text(digest + "\n", encoding="utf-8")
                entry = build_manifest_entry(target, seed, path, encoded_duration)
                by_key[key] = entry
                generated_keys.add(key)
                print(f"generated {key}: {encoded_duration:.2f}s (seed {seed})", flush=True)
                break
            except Exception as error:
                first_error = first_error or error
                if seed == SEED:
                    print(f"retry {key} with seed {RETRY_SEED}: {type(error).__name__}: {error}", flush=True)
                else:
                    reason = f"{type(error).__name__}: {error}"
                    if first_error is not error:
                        reason = f"seed 42: {type(first_error).__name__}: {first_error}; seed 43: {reason}"
                    failures.append((key, reason))
                    print(f"failed {key}: {reason}", flush=True)
        write_json(MANIFEST_PATH, [by_key[item["key"]] for item in targets if item["key"] in by_key])
        write_review([by_key[item["key"]] for item in targets if item["key"] in by_key])

    if args.takes:
        render_takes(selected, args.takes, model)

    entries = [by_key[item["key"]] for item in targets if item["key"] in by_key]
    write_json(MANIFEST_PATH, entries)
    write_review(entries)
    total_duration = sum(float(entry["duration"]) for entry in entries)
    print(
        f"Available {len(entries)}/{len(targets)} clips; generated this run {len(generated_keys)}; "
        f"failed {len(failures)}; total duration {total_duration:.2f}s.",
        flush=True,
    )
    if failures:
        for key, reason in failures:
            print(f"failure detail {key}: {reason}", flush=True)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Generate Vivian studio clips for grammar examples and pattern rows (L1-L8 by default).

Run with the local MLX environment and model cache:
  HF_HUB_OFFLINE=1 output/qwen-pilot-venv/bin/python scripts/audio/generateGrammarStudioAudio.py
  HF_HUB_OFFLINE=1 output/qwen-pilot-venv/bin/python scripts/audio/generateGrammarStudioAudio.py --limit 2
  HF_HUB_OFFLINE=1 output/qwen-pilot-venv/bin/python scripts/audio/generateGrammarStudioAudio.py --takes 6
  HF_HUB_OFFLINE=1 output/qwen-pilot-venv/bin/python scripts/audio/generateGrammarStudioAudio.py --refresh-audio
  HF_HUB_OFFLINE=1 output/qwen-pilot-venv/bin/python scripts/audio/generateGrammarStudioAudio.py --only lesson --lessons 1-16 --practice --vocab-book 1 --out output/grammar-audio/b1-gaps --delivery-bitrate 48k

`--practice` adds the answer sentences (and accepted alternatives) of every book exercise (content/grammar-practice) on the selected
pages. `--out` writes a separate batch (manifest, review page, clips) for `publishGrammarStudioAudio.ts
--manifest`; a batch skips sentences that already have a published studio recording and the takes
`checkStudioBatch.py` listed in its rejected.json. A take that stops mid-syllable is rendered again
(other seeds, then with a tail-guard word cut off at the pause); a sentence read too fast on every take
gets slower-instruction takes. `--delivery-bitrate` publishes a
smaller copy of every mastered clip.

`--refresh-audio` masters published local takes and regenerates flagged takes or delivery above four Chinese
characters per second with a naturally slower instruction. It never time-stretches speech.
Publication additionally requires content QA and measured encoded peak/loudness results.

Qwen's pace wanders between takes (it often slows down on numbers and times), so `--takes N`
also renders seeds 42..42+N-1 of every sentence; `scoreGrammarStudioTakes.py --pick` then
writes the steadiest take's seed to studio-picks.json, and the next run uses it.
"""
import argparse
import hashlib
import os
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
TRACK_APPROVED = ROOT / "content/audio/grammar_track_approved.json"  # Owner-approved near-miss book clips.
STUDIO_RECEIPT = ROOT / "content/audio/grammar_studio_audio.json"  # Published studio recordings.
PRACTICE_DIR = ROOT / "content/grammar-practice"  # Book exercises, keyed by grammar page id.
VOCAB_EXAMPLES = ROOT / "content/audio/vocabulary_example_audio.json"  # Vocabulary examples and their book clips.
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
RETRY_SEED = 43  # First retry seed for invalid audio.
RETRY_SEEDS = (43, 44, 45)  # Retries for invalid audio (short lines often come out rushed).
# Qwen sometimes stops a sentence mid-syllable. A take whose last speech frame is still this loud
# (against the clip's typical speech) is cut off and is rendered again.
ENDING_MAX = 0.4
# Last resort for a cut-off sentence: the voice says this word after it, so the real last syllable
# finishes and fades; the clip is cut in the pause before the word (ASR then confirms the cut).
TAIL_GUARD = "好。"
TAIL_GUARD_MAX = 0.9  # Seconds the guard word may take after the pause; more means the cut was mid-sentence.
DELIVERY_BITRATE = None  # Set by --delivery-bitrate: publish a smaller copy of each mastered clip.
MAX_TOKENS = 512  # Qwen generation limit.
TURN_SILENCE = 0.6  # Silence between dialogue turns.
TRIM_PADDING = 0.1  # Silence retained at the outside edges.
SILENCE_THRESHOLD = 0.003  # Absolute amplitude threshold for trimming and silence checks.
MIN_SECONDS_PER_HAN = 0.15  # Shortest accepted clip per Han character.
MAX_SECONDS_PER_HAN = 1.2  # Longest accepted clip per Han character.
MP3_BITRATE = "96k"  # Preserve detail when mastering existing approved MP3s.
MASTERING = "acompressor=mode=upward:threshold=0.4:ratio=4:attack=5:release=100,volume=1.78,alimiter=limit=0.66:level=0:latency=1"
SLOW_INSTRUCT = INSTRUCT + " 面向初學者，語速稍慢，像老師耐心示範完整的句子。在詞組和標點之間自然停頓，保持連貫、溫暖的語氣。不要趕著說，不要逐字念，也不要拖長字音。只朗讀提供的文字，不增添、不省略任何字詞。"
# Last resort for a sentence read too fast on every take: a slower instruction, kept only between
# SLOWER_MIN_PACE and four characters a second (it can also drag).
SLOWER_INSTRUCT = SLOW_INSTRUCT + " 這是給剛開始學中文的學生聽的，請放慢語速，每個字都說清楚。"
SLOWER_MIN_PACE = 2.8
MAX_PACE = 4.0  # Characters a second; --max-pace raises it for the few sentences no take reads slower.
# Takes tried in order for a sentence: (seed, style), style "g" = tail guard, "s" = slower instruction.
# A batch's rejected.json skips any of them by name (attempt_id).
ATTEMPTS = [(SEED, ""), *((seed, "") for seed in RETRY_SEEDS), (42, "g"), (43, "g"), (44, "g"),
            (42, "s"), (43, "s"), (44, "s"), (45, "s"), (42, "sg"), (43, "sg")]
HAN_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\U00020000-\U0002fa1f]")  # Han characters used for keys.
SPEAKER_RE = re.compile(r"(?<![A-Za-z])([AB])[:：]\s*")  # Textbook A/B speaker labels.
PAREN_RE = re.compile(r"[()（）]")  # Optional-parenthesis delimiters.
CLOCK_RE = re.compile(r"[一二兩两三四五六七八九十]+(?=[點点分月號号日])")  # A number in a time or date.
DIGITS = {"一": 1, "二": 2, "兩": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}  # Numerals to digits.
SPELLED_CLOCK = {"十一點多", "十一点多"}  # Keep the owner-selected spoken form of this phrase.
ALTERNATIVE_RE = re.compile(r"[/／][\u3400-\u9fff]+")  # "號/日": the book's alternative word; read only the first.


def set_out_dir(path):
    """Point every output at a separate batch folder (manifest.json, review.html, numbers.json, studio/)."""
    global OUT_DIR, AUDIO_DIR, MANIFEST_PATH, REVIEW_PATH, NUMBERS_PATH, PICKS_PATH
    OUT_DIR = path
    AUDIO_DIR = path / "studio"
    MANIFEST_PATH = path / "manifest.json"
    REVIEW_PATH = path / "review.html"
    NUMBERS_PATH = path / "numbers.json"
    PICKS_PATH = path / "picks.json"


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


def collect_targets(only=None, lessons=(1, 8), practice=False, skip_published=False, vocab_book=None):
    """Collect uncovered examples and eligible pattern rows of the selected lessons in book order.

    `only` limits the run to grammar files whose names start with one of the given prefixes;
    `practice` adds each exercise's answer sentence from the matching content/grammar-practice file."""
    clipped = load_clip_keys(TRACK_CLIPS) | load_clip_keys(BOOK_CLIPS) | load_clip_keys(TRACK_APPROVED)
    if skip_published:
        clipped |= load_clip_keys(STUDIO_RECEIPT)
    targets = {}
    missing = Counter()
    totals = Counter()
    parts = []
    for path in sorted(GRAMMAR_DIR.glob("*.json")):
        if only and not path.name.startswith(tuple(only)):
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for part_name, part in data.items():
            if not isinstance(part, dict):
                continue
            lesson = part.get("lessonId")
            part_number = part.get("partId")
            if not isinstance(lesson, int) or not lessons[0] <= lesson <= lessons[1]:
                continue
            parts.append((lesson, int(part_number or 0), path.name, part_name, part))
    parts.sort(key=lambda entry: entry[:4])
    # Exercises are keyed by grammar page id (practice files are per lesson, grammar files may be per part).
    exercises = {}
    for path in sorted(PRACTICE_DIR.glob("*.json")) if practice else []:
        exercises.update(json.loads(path.read_text(encoding="utf-8")))

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
        for page_index, page in enumerate(part.get("grammarPages") or [] if practice else []):
            page_id = str(page.get("id"))
            for item_index, item in enumerate((exercises.get(page_id) or {}).get("items") or []):
                # The answer sentence, and every other right answer the item accepts.
                for sentence in [item.get("result") or {}, *(item.get("alternatives") or [])]:
                    text = (sentence.get("traditional") or "").strip()
                    key = han(text)
                    if not key:
                        continue
                    add_target(
                        targets, missing, totals, key, text,
                        user_record(page_id, item, "exercise"),
                        (lesson, part_number, page_index, 2, item_index, file_name, part_name),
                        clipped, sentence.get("simplified"),
                    )
    # Vocabulary examples of this book the book's own recording couldn't be matched to.
    examples = json.loads(VOCAB_EXAMPLES.read_text(encoding="utf-8"))["examples"] if vocab_book else {}
    for example_id, example in examples.items():
        lesson = example.get("lessonId")
        if example.get("bookId") != vocab_book or example.get("audio") or not lessons[0] <= lesson <= lessons[1]:
            continue
        text = example["traditional"].strip()
        add_target(
            targets, missing, totals, han(text), text,
            {"page": example["sourceCardId"], "id": example_id, "kind": "vocab"},
            (lesson, 99, 0, 3, 0, "", example_id), clipped,
        )
    ordered = sorted(targets.values(), key=lambda item: item["order"])
    return ordered, missing, totals


def recipe_text(key, turns, seed, style=""):
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
    if "g" in style:
        recipe["tail_guard"] = TAIL_GUARD
    if "s" in style:
        recipe["instruct"] = SLOWER_INSTRUCT
    if len(turns) > 1:  # Only dialogues read B in a second voice; single sentences keep their files.
        recipe["turn_voices"] = [turn_voice(index) for index in range(len(turns))]
    return key + json.dumps(recipe, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def output_for(key, turns, seed, style=""):
    """Return the full recipe digest, destination MP3, and recipe sidecar."""
    digest = hashlib.sha256(recipe_text(key, turns, seed, style).encode("utf-8")).hexdigest()
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


def attempt_id(seed, style=""):
    """Name of one take in rejected.json: the seed plus its style ("g" tail guard, "s" slower)."""
    return f"{seed}{style}"


def cached_entry(target, seed, old_entries, style=""):
    """Prefer refreshed manifest takes; otherwise require an exact recipe hash."""
    previous = old_entries.get(target["key"])
    if previous and previous.get("mastering") == MASTERING and previous.get("text") == target["text"]:
        published = ROOT / previous["local"]
        if published.is_file() and file_sha256(published) == previous.get("sha256"):
            return {**previous, "users": target["users"]}
    digest, path, sidecar = output_for(target["key"], target["turns"], seed, style)
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
    return build_manifest_entry(target, seed, path, duration, style)


def build_manifest_entry(target, seed, path, duration, style=""):
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
        "instruct": SLOWER_INSTRUCT if "s" in style else SLOW_INSTRUCT,
        "seed": seed,
        "mastering": MASTERING,
        "quality": measure_quality(path),
        **({"take": style} if style else {}),
        **({"tailGuard": TAIL_GUARD} if "g" in style else {}),
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


def cut_before_guard(audio, sample_rate, np):
    """Keep the speech before the pause that precedes the tail-guard word (and 40 ms of that pause)."""
    size = int(sample_rate * 0.02)
    frames = np.sqrt((audio[: len(audio) // size * size].reshape(-1, size) ** 2).mean(axis=1))
    quiet = frames < frames.max() * 0.03
    pause_start = pause_end = None
    index = 0
    while index < len(frames):
        if not quiet[index]:
            index += 1
            continue
        end = index
        while end < len(frames) and quiet[end]:
            end += 1
        if end - index >= 6 and end < len(frames):  # A pause of 120 ms or more with speech after it.
            pause_start, pause_end = index, end
        index = end
    if pause_start is None:
        raise ValueError("no pause before the tail-guard word")
    if (len(frames) - pause_end) * 0.02 > TAIL_GUARD_MAX:
        raise ValueError("the last pause is inside the sentence, not before the tail-guard word")
    return audio[: (pause_start + 2) * size]


def synthesize(model, turns, seed, mx, np, instruct=SLOW_INSTRUCT, guard=False):
    """Generate each dialogue turn separately (B in its own voice) and join turns with 0.6 s silence."""
    turn_audio = []
    sample_rate = None
    for index, turn in enumerate(turns):
        mx.random.seed(seed)
        guarded = guard and index == len(turns) - 1
        results = list(model.generate(
            turn + TAIL_GUARD if guarded else turn, voice=turn_voice(index), lang_code=LANG_CODE, instruct=instruct,
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
        if guarded:
            audio = cut_before_guard(trim_to_active(audio, np), this_rate, np)
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


def ending_ratio(path):
    """Loudness of a clip's last speech frame against its typical speech frame (cut-off speech stays loud)."""
    import numpy as np
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    audio = np.frombuffer(raw, dtype=np.float32)
    size = 320  # 20 ms frames.
    frames = np.sqrt((audio[: len(audio) // size * size].reshape(-1, size) ** 2).mean(axis=1))
    speech = np.flatnonzero(frames > frames.max() * 0.05)
    if speech.size < 5:
        return 1.0
    typical = np.percentile(frames[speech[0]: speech[-1] + 1], 75)
    return float(frames[speech[-1]] / typical)


def deliver(entry):
    """Encode the published copy of a mastered clip at DELIVERY_BITRATE (named by its content hash)."""
    if DELIVERY_BITRATE is None:
        return entry
    master = ROOT / entry.get("master", entry["local"])
    if entry.get("deliveryBitrate") == DELIVERY_BITRATE and (ROOT / entry["local"]).is_file():
        return entry
    folder = OUT_DIR / "delivery"
    folder.mkdir(parents=True, exist_ok=True)
    temporary = folder / f"{master.stem}.tmp.mp3"
    gain = 0.0
    for _ in range(3):
        subprocess.run([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(master),
            "-af", f"volume={gain}dB", "-map_metadata", "-1", "-vn", "-ac", "1", "-ar", "24000",
            "-codec:a", "libmp3lame", "-b:a", DELIVERY_BITRATE, str(temporary),
        ], capture_output=True, text=True, check=True)
        quality = measure_quality(temporary)
        if quality["truePeakDbfs"] <= -1.0:
            break
        gain -= quality["truePeakDbfs"] + 1.3
    else:
        raise ValueError(f"Encoded peaks remain unsafe: {master.name}")
    digest = file_sha256(temporary)
    destination = folder / f"{digest[:12]}.mp3"
    temporary.replace(destination)
    duration, _ = probe_audio(destination)
    return {
        **entry,
        "master": master.relative_to(ROOT).as_posix(),
        "masterSha256": entry.get("masterSha256", entry["sha256"]),
        "local": destination.relative_to(ROOT).as_posix(),
        "file": f"grammar-studio/v1/{destination.name}",
        "sha256": digest,
        "duration": round(duration, 3),
        "deliveryBitrate": DELIVERY_BITRATE,
        "quality": quality,
    }


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
        source = os.path.relpath(ROOT / entry["local"], OUT_DIR)
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
    global DELIVERY_BITRATE, MAX_PACE
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, help="Generate only the first N uncovered keys.")
    parser.add_argument("--takes", type=int, default=0, help="Also render seeds 42..42+N-1 of every key.")
    parser.add_argument("--only", nargs="+", help="Only grammar files starting with these prefixes (e.g. b3LessonOne b3LessonTwo).")
    parser.add_argument("--lessons", default="1-8", help="Lesson range, e.g. 9-16 (default 1-8).")
    parser.add_argument("--practice", action="store_true", help="Also voice each book exercise's answer sentence.")
    parser.add_argument("--vocab-book", type=int, help="Also voice this book's vocabulary examples that have no book clip.")
    parser.add_argument("--max-pace", type=float, help=f"Fastest accepted delivery in characters a second (default {MAX_PACE}).")
    parser.add_argument("--delivery-bitrate", help="Publish a copy of each clip at this MP3 bitrate (e.g. 48k).")
    parser.add_argument("--out", help="Write a separate batch here (skips sentences already published).")
    parser.add_argument("--refresh-audio", action="store_true", help="Regenerate rushed or transcription-flagged clips and master all studio clips.")
    args = parser.parse_args()
    if args.refresh_audio:
        refresh_audio()
        return
    if args.limit is not None and args.limit < 0:
        parser.error("--limit must be zero or greater")

    if args.out:
        set_out_dir(ROOT / args.out)
    if args.delivery_bitrate:
        DELIVERY_BITRATE = args.delivery_bitrate
    if args.max_pace:
        MAX_PACE = args.max_pace
    first, _, last = args.lessons.partition("-")
    lessons = (int(first), int(last or first))
    targets, missing, totals = collect_targets(args.only, lessons, args.practice, bool(args.out), args.vocab_book)
    print(
        f"Uncovered users: {missing['example']} examples, {missing['row']} rows, {missing['exercise']} exercises, {missing['vocab']} vocabulary examples; "
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
    rejected_path = OUT_DIR / "rejected.json"  # Takes checkStudioBatch.py found cut off or misheard.
    rejected = json.loads(rejected_path.read_text(encoding="utf-8")) if rejected_path.exists() else {}
    for key, previous in list(old_entries.items()):
        if attempt_id(previous.get("seed"), previous.get("take", "g" if previous.get("tailGuard") else "")) in rejected.get(key, []):
            del old_entries[key]
    attempts_for = {
        target["key"]: [
            attempt for attempt in ATTEMPTS
            if attempt_id(*attempt) not in rejected.get(target["key"], [])
        ]
        for target in targets
    }
    for target in targets:
        picked = [(picks[target["key"]], "")] if target["key"] in picks else []
        for seed, style in picked + attempts_for[target["key"]]:
            entry = cached_entry(target, seed, old_entries, style)
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

        errors = []
        attempts = attempts_for[key]
        if not attempts:
            failures.append((key, "every take was rejected"))
            print(f"failed {key}: every take was rejected", flush=True)
            continue
        for seed, style in attempts:
            digest, path, sidecar = output_for(key, target["turns"], seed, style)
            try:
                audio, sample_rate = synthesize(
                    model, target["turns"], seed, mx, np,
                    instruct=SLOWER_INSTRUCT if "s" in style else SLOW_INSTRUCT, guard="g" in style,
                )
                duration = validate_duration(audio, sample_rate, key)
                pace = len(han("".join(target["turns"]))) / duration
                if pace > MAX_PACE:
                    raise ValueError(f"Generated delivery is {pace:.2f} characters per second (over {MAX_PACE})")
                if "s" in style and pace < SLOWER_MIN_PACE:
                    raise ValueError(f"Slower take drags ({pace:.2f} characters per second)")
                encode_mp3(audio, sample_rate, path, sf)
                encoded_duration, channels = probe_audio(path)
                if channels != 1:
                    raise ValueError(f"encoded MP3 has {channels} channels")
                if abs(encoded_duration - duration) > 0.15:
                    raise ValueError(f"encoded duration changed from {duration:.2f}s to {encoded_duration:.2f}s")
                if ending_ratio(path) > ENDING_MAX:
                    raise ValueError("speech stops mid-syllable")
                sidecar.write_text(digest + "\n", encoding="utf-8")
                entry = build_manifest_entry(target, seed, path, encoded_duration, style)
                by_key[key] = entry
                generated_keys.add(key)
                print(f"generated {key}: {encoded_duration:.2f}s (take {attempt_id(seed, style)})", flush=True)
                break
            except Exception as error:
                errors.append(f"take {attempt_id(seed, style)}: {type(error).__name__}: {error}")
                if (seed, style) != attempts[-1]:
                    print(f"retry {key}: {errors[-1]}", flush=True)
                else:
                    failures.append((key, "; ".join(errors)))
                    print(f"failed {key}: {'; '.join(errors)}", flush=True)
        write_json(MANIFEST_PATH, [by_key[item["key"]] for item in targets if item["key"] in by_key])
        write_review([by_key[item["key"]] for item in targets if item["key"] in by_key])

    if args.takes:
        render_takes(selected, args.takes, model)

    entries = [deliver(by_key[item["key"]]) for item in targets if item["key"] in by_key]
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

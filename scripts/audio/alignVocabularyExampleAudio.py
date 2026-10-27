#!/usr/bin/env python3
"""Align printed vocabulary example sentences to their official book tracks.

The word clips already hosted by the app fingerprint the vocabulary track.
MMS forced alignment then locates each authored sentence using its Chinese
text. Long tracks are encoded in overlapping windows so memory use stays
bounded. Originals are read from ignored output/; the script never uploads
audio.

Usage:
  output/align-venv/bin/python scripts/audio/alignVocabularyExampleAudio.py --preview
  output/align-venv/bin/python scripts/audio/alignVocabularyExampleAudio.py --apply

Requires the existing audio alignment environment, ffmpeg, and downloaded
Book 1 / Book 3 tracks. The first run downloads torchaudio's MMS_FA checkpoint
to the user's normal Torch cache (not the repository).
"""
import argparse
import hashlib
import json
import math
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

import numpy as np
import torch
from pypinyin import lazy_pinyin
from torchaudio.pipelines import MMS_FA as bundle
from pypinyin.constants import PINYIN_DICT
from pypinyin.contrib.tone_convert import to_normal

ROOT = Path(__file__).resolve().parents[2]
VOCAB_ROOT = ROOT / 'public/data/vocabulary'
WORD_AUDIO_ROOT = ROOT / 'output/audio/vocabulary-trim-v1/originals'
BOOK1_AUDIO_ROOT = ROOT / 'output/official-audio/book1'
BOOK3_AUDIO_ROOT = ROOT / 'output/official-audio/book3'
BOOK1_INDEX = ROOT / 'content/audio/audio_index_book1.json'
BOOK3_INDEX = ROOT / 'content/audio/audio_index_book3.json'
BOOK1_COURSE_EXAMPLES = ROOT / 'public/data/course-examples/book-1.json'
BOOK1_MANIFEST = ROOT / 'content/audio/audio_manifest_book1.json'
BOOK3_MANIFEST = BOOK3_AUDIO_ROOT / 'vocabulary-manifest.json'
REPORT_PATH = ROOT / 'output/audio/vocabulary-example-audio/alignment-report.json'
DRAFT_PATH = ROOT / 'output/audio/vocabulary-example-audio/draft.json'
CONTENT_PATH = ROOT / 'content/audio/vocabulary_example_audio.json'
ALIGN_SAMPLE_RATE = bundle.sample_rate
FINGERPRINT_SAMPLE_RATE = 1000
EMISSION_CHUNK_SECONDS = 30
EMISSION_OVERLAP_SECONDS = 2
MIN_WORD_MATCH_SCORE = 0.68
MIN_SEGMENT_SCORE = 0.64
MAX_SYLLABLE_DURATION = 2.20
PINYIN_VARIANTS = {
    'shei': 'shui', 'zhei': 'zhe', 'nei': 'na', 'dei': 'de',
    'liao': 'le', 'zhongming': 'zhouming',
}
PUNCT = set('，。？！、：；“”‘’「」『』（）《》〈〉…—～∼,.?!:;\'"()[]{}-/\\')
CN_DIGITS = '零一二三四五六七八九'
NUMERAL_CHARS = set('零一二兩三四五六七八九十百千萬')
NUMERAL_SYLLABLES = {
    'ling', 'yi', 'er', 'liang', 'san', 'si', 'wu', 'liu',
    'qi', 'ba', 'jiu', 'shi', 'bai', 'qian', 'wan', 'fen',
}
PINYIN_SYLLABLES = {
    to_normal(syllable).lower()
    for readings in PINYIN_DICT.values()
    for syllable in readings.split(',')
}
PINYIN_SYLLABLES.update({'shei', 'zhei', 'ng', 'n', 'm'})


def strip_pinyin_tones(value):
    lowered = to_normal(value.lower()).replace('ü', 'v')
    return ''.join(
        char for char in unicodedata.normalize('NFKD', lowered)
        if not unicodedata.combining(char)
    )


def read_examples(item):
    value = item.get('examples')
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return []
    if not isinstance(value, list):
        return []
    return [example for example in value if isinstance(example, dict) and example.get('chinese')]


def han_count(text):
    return sum(1 for char in text if '\u3400' <= char <= '\u9fff' or '\U00020000' <= char <= '\U0002ebef')


def expand_digits(text):
    text = text.replace('○', '零').replace('〇', '零')
    def convert(match):
        number = int(match.group(0))
        if number == 0:
            return '零'
        if len(match.group(0).lstrip('0')) > 4 or match.group(0) == '101':
            return ''.join(CN_DIGITS[int(digit)] for digit in match.group(0))
        units = ['', '十', '百', '千']
        parts = []
        digits = [int(digit) for digit in str(number)]
        for index, digit in enumerate(digits):
            position = len(digits) - 1 - index
            if digit == 0:
                if parts and parts[-1] != '零' and any(tail != 0 for tail in digits[index + 1:]):
                    parts.append('零')
            elif position == 1 and digit == 1 and not parts:
                parts.append('十')
            else:
                parts.append(CN_DIGITS[digit] + units[position])
        return ''.join(parts)
    return re.sub(r'\d+', convert, text)


def pinyin_syllable(char):
    if char in PUNCT or char.isspace() or char in '兒儿':
        return ''
    if not ('\u3400' <= char <= '\u9fff' or '\U00020000' <= char <= '\U0002ebef'):
        return ''
    plain = re.sub(r'[^a-z]', '', strip_pinyin_tones(''.join(lazy_pinyin(char))))
    for variant, canonical in PINYIN_VARIANTS.items():
        plain = plain.replace(variant, canonical)
    return plain


def split_pinyin_word(word):
    """Return plausible syllabifications of one printed, unspaced Pinyin word."""
    normalized = strip_pinyin_tones(word)
    memo = {len(normalized): {0: [()]}}
    for position in range(len(normalized) - 1, -1, -1):
        options = {}
        for end in range(min(len(normalized), position + 6), position, -1):
            syllable = normalized[position:end]
            if syllable not in PINYIN_SYLLABLES:
                continue
            for count, tails in memo.get(end, {}).items():
                options.setdefault(count + 1, [])
                for tail in tails:
                    if len(options[count + 1]) < 12:
                        options[count + 1].append((syllable, *tail))
        memo[position] = options
    return memo.get(0, {})


def strip_speaker_labels(text, pinyin=None):
    """Remove unspoken dialogue speaker prefixes (e.g. 老師：, 學生：, 姊姊：, A:) before alignment."""
    cleaned_text = re.sub(r'(?:^|(?<=[。？！?!\s]))[\u4e00-\u9fff]{1,4}[：:](?!「)\s*', ' ', text or '')
    cleaned_text = re.sub(r'\b[A-Z]\s*[：:]\s*', ' ', cleaned_text)
    if pinyin is None:
        return cleaned_text
    cleaned_pinyin = re.sub(r'(?:^|(?<=[.?!\s]))[^\s:：]{1,20}\s*[：:]\s*', ' ', pinyin or '')
    return cleaned_text, cleaned_pinyin


def printed_pinyin_syllables(text, pinyin):
    """Parse source-book Pinyin, requiring one syllable for every spoken Hanzi."""
    if not pinyin:
        return None
    text = re.sub(r'[（(][^）)]*[）)]', '', text)
    pinyin = re.sub(r'[（(][^）)]*[）)]', '', pinyin)
    text, pinyin = strip_speaker_labels(text, pinyin)
    words = re.findall(r'[A-Za-zvV]+', strip_pinyin_tones(pinyin))
    erhua_count = sum(1 for word in words if len(word) > 2 and word.endswith('r') and not word.endswith('er'))
    # In erhua words such as yìdiǎnr, 儿 is represented by the final r rather
    # than its own vowel-bearing syllable.
    words = [word[:-1] if len(word) > 2 and word.endswith('r') and not word.endswith('er') else word for word in words]
    expected = han_count(expand_digits(text)) - erhua_count
    if expected <= 0:
        return None
    choices = [split_pinyin_word(word) for word in words]
    if not choices or any(not choice for choice in choices):
        return None

    # Dynamic programming preserves only paths that can still reach the exact
    # Hanzi count; this handles printings that join syllables inside a word.
    paths = {0: ()}
    remaining_min = [sum(min(choice) for choice in choices[index:]) for index in range(len(choices) + 1)]
    remaining_max = [sum(max(choice) for choice in choices[index:]) for index in range(len(choices) + 1)]
    for index, word_choices in enumerate(choices):
        next_paths = {}
        for count, syllables in paths.items():
            for word_count, variants in word_choices.items():
                new_count = count + word_count
                if new_count + remaining_min[index + 1] > expected:
                    continue
                if new_count + remaining_max[index + 1] < expected:
                    continue
                for variant in variants:
                    if new_count not in next_paths:
                        next_paths[new_count] = syllables + variant
                        break
        paths = next_paths
        if not paths:
            return None
    result = paths.get(expected)
    return list(result) if result else None


def normalize_to_syllables(text, pinyin=None):
    """Use textbook Pinyin where it matches the printed sentence; otherwise infer."""
    text = re.sub(r'[（(][^）)]*[）)]', '', text)
    pinyin = re.sub(r'[（(][^）)]*[）)]', '', pinyin or '')
    if pinyin:
        source_syllables = printed_pinyin_syllables(text, pinyin)
        if source_syllables:
            return source_syllables
    text = strip_speaker_labels(text)
    syllables = []
    text = expand_digits(text)
    index = 0
    while index < len(text):
        char = text[index]
        if char.isdigit():
            end = index
            while end < len(text) and text[end].isdigit():
                end += 1
            for numeral in expand_digits(text[index:end]):
                value = pinyin_syllable(numeral)
                if value:
                    syllables.append(value)
            index = end
            continue
        value = pinyin_syllable(char)
        if value:
            syllables.append(value)
        index += 1
    return syllables


def clean_vocab_term(text):
    # The textbook's slash notation lists alternatives; the recording uses
    # one headword, while parentheses mark optional erhua or characters.
    first = re.split(r'[/／]', text, maxsplit=1)[0]
    return re.sub(r'[（(][^）)]*[）)]', '', first)


def decode(path, sample_rate):
    raw = subprocess.run(
        ['ffmpeg', '-nostdin', '-v', 'error', '-i', str(path), '-map', '0:a:0',
         '-f', 'f32le', '-ac', '1', '-ar', str(sample_rate), 'pipe:1'],
        check=True, capture_output=True, timeout=240,
    ).stdout
    samples = np.frombuffer(raw, dtype='<f4').copy()
    if samples.size == 0 or not np.isfinite(samples).all():
        raise ValueError(f'Empty or invalid audio: {path}')
    return samples


def normalized_match(signal, template, start, end):
    """Find a template by normalized cross-correlation in a bounded window."""
    template = np.asarray(template, dtype=np.float64)
    signal = np.asarray(signal, dtype=np.float64)
    length = len(template)
    low = max(0, int(start))
    high = min(len(signal) - length, int(end))
    if length < FINGERPRINT_SAMPLE_RATE // 4 or high < low:
        return 0.0, None

    window = signal[low:high + length]
    centered = template - template.mean()
    template_norm = np.linalg.norm(centered)
    if template_norm < 1e-8:
        return 0.0, None

    fft_size = 1 << (len(window) + length - 2).bit_length()
    correlation = np.fft.irfft(
        np.fft.rfft(window, fft_size) * np.fft.rfft(centered[::-1], fft_size),
        fft_size,
    )[length - 1:len(window)]
    sums = np.cumsum(window, dtype=np.float64)
    squares = np.cumsum(window * window, dtype=np.float64)
    window_sum = sums[length - 1:] - np.r_[0.0, sums[:-length]]
    window_energy = squares[length - 1:] - np.r_[0.0, squares[:-length]]
    variance = np.maximum(window_energy - window_sum * window_sum / length, 1e-12)
    score = correlation / (np.sqrt(variance) * template_norm + 1e-9)
    score[window_energy < max(float(window_energy.max()) * 0.005, 1e-10)] = 0
    position = int(np.argmax(score))
    return float(score[position]), low + position


def get_book_items(book_id):
    data = json.loads((VOCAB_ROOT / f'book-{book_id}.json').read_text())
    groups = {}
    for item in data['items']:
        match = re.fullmatch(r'B([13])L(\d{2})-(\d)-(\d+)', item.get('id', ''))
        if not match or int(match.group(1)) != book_id or int(match.group(2)) == 0:
            continue
        lesson_id, part_id, sequence = int(match.group(2)), int(match.group(3)), int(match.group(4))
        item['_sequence'] = sequence
        item['_examples'] = read_examples(item)
        groups.setdefault((lesson_id, part_id), []).append(item)
    for items in groups.values():
        items.sort(key=lambda item: item['_sequence'])
    return groups


def load_book1_candidates():
    index = json.loads(BOOK1_INDEX.read_text())
    result = {}
    for lesson_text, lesson in index['textbook_dialogue_audio']['lessons'].items():
        lesson_id = int(lesson_text)
        for track in lesson['tracks']:
            match = re.fullmatch(r'B1-\d{2}-(\d)-(\d)\.mp3', track['file'])
            if match:
                part_id = int(match.group(1))
                result.setdefault((lesson_id, part_id), []).append(track)
    return result


def load_book3_tracks():
    index = json.loads(BOOK3_INDEX.read_text())
    return {
        (int(re.search(r'B3-(\d{2})-(\d)-2\.mp3', entry['file']).group(1)),
         int(re.search(r'B3-(\d{2})-(\d)-2\.mp3', entry['file']).group(2))): entry
        for entry in index['vocabularyTracks']
    }


def source_template(item, cache):
    path = WORD_AUDIO_ROOT / f"modernchinese-{item['id']}.mp3"
    if not path.exists():
        return None
    if path not in cache:
        cache[path] = decode(path, FINGERPRINT_SAMPLE_RATE)
    return cache[path]


def manifest_files(path):
    if not path.exists():
        return {}
    manifest = json.loads(path.read_text())
    return {
        entry['file']: entry for entry in manifest.get('files', [])
        if isinstance(entry, dict) and isinstance(entry.get('file'), str)
    }


def verify_track(candidate, audio_root, expected_files):
    expected = expected_files.get(candidate['file'])
    if not expected:
        raise ValueError(f"{candidate['file']} is missing from its audio source manifest")
    if candidate.get('id') and expected.get('id') and candidate['id'] != expected['id']:
        raise ValueError(f"{candidate['file']} file ID does not match its audio source manifest")
    track_path = audio_root / candidate['file']
    if not track_path.exists():
        raise ValueError(f'Missing local track {track_path}')
    expected_hash = expected.get('sha256')
    if not isinstance(expected_hash, str) or len(expected_hash) != 64:
        raise ValueError(f"{candidate['file']} has no SHA-256 in its audio source manifest")
    with track_path.open('rb') as source:
        actual_hash = hashlib.file_digest(source, 'sha256').hexdigest()
    if actual_hash != expected_hash:
        raise ValueError(f"{candidate['file']} failed its audio source SHA-256 check")
    return actual_hash


def classify_track(items, candidates, audio_root, source_cache, signal_cache):
    sample_items = [item for item in items if source_template(item, source_cache) is not None][:8]
    if not sample_items:
        raise ValueError('No original vocabulary-word recordings are available for track matching.')
    ranked = []
    for candidate in candidates:
        track_path = audio_root / candidate['file']
        if not track_path.exists():
            continue
        if track_path not in signal_cache:
            signal_cache[track_path] = decode(track_path, FINGERPRINT_SAMPLE_RATE)
        signal = signal_cache[track_path]
        cursor = 0
        previous_example_length = 0
        scores = []
        positions = []
        for item in sample_items:
            template = source_template(item, source_cache)
            earliest = cursor + round((previous_example_length * 0.20 + 0.35) * FINGERPRINT_SAMPLE_RATE) if cursor else 0
            max_gap = max(18, min(60, 10 + previous_example_length * 0.55))
            score, position = normalized_match(
                signal, template, earliest,
                earliest + max_gap * FINGERPRINT_SAMPLE_RATE,
            )
            scores.append(score)
            positions.append(position)
            if position is not None and score >= MIN_WORD_MATCH_SCORE:
                cursor = position + len(template)
            else:
                cursor = earliest
            previous_example_length = han_count(item['_examples'][0]['chinese']) if item['_examples'] else 0

        strong = sum(score >= 0.75 for score in scores)
        coverage = strong / len(scores)
        mean_score = float(np.mean(scores)) if scores else 0.0
        ranked.append({
            'track': candidate,
            'scores': scores,
            'positions': positions,
            'strong': strong,
            'coverage': coverage,
            'meanScore': mean_score,
            'rank': coverage * 0.75 + mean_score * 0.25,
        })

    ranked.sort(key=lambda entry: entry['rank'], reverse=True)
    if not ranked:
        raise ValueError('No candidate audio tracks were downloaded.')
    best = ranked[0]
    required = max(2, math.ceil(len(sample_items) * 0.5))
    if best['strong'] < required or best['meanScore'] < 0.68:
        detail = ', '.join(
            f"{entry['track']['file']} {entry['strong']}/{len(entry['scores'])} strong"
            for entry in ranked
        )
        raise ValueError(f'Vocabulary-track fingerprint did not clear the confidence bar: {detail}')
    if len(ranked) > 1 and best['rank'] - ranked[1]['rank'] < 0.08:
        raise ValueError(
            f"Ambiguous vocabulary track: {best['track']['file']} and {ranked[1]['track']['file']} "
            f"have near-identical fingerprints."
        )
    return best, ranked


def build_alignment_segments(items):
    tokens = []
    segments = []
    for item in items:
        word_text = clean_vocab_term(item.get('traditional') or item.get('simplified') or '')
        word_pinyin = item.get('pinyin')
        word_syllables = normalize_to_syllables(word_text, word_pinyin)
        if word_syllables:
            first = len(tokens)
            tokens.extend(word_syllables)
            segments.append({
                'kind': 'word', 'sourceCardId': item['id'], 'text': word_text,
                'pinyinSource': 'textbook' if printed_pinyin_syllables(word_text, word_pinyin) else 'inferred',
                'tokenStart': first, 'tokenEnd': len(tokens),
            })
        for example_index, example in enumerate(item['_examples'], start=1):
            text = str(example.get('chinese', '')).strip()
            example_pinyin = example.get('pinyin')
            syllables = normalize_to_syllables(text, example_pinyin)
            pinyin_source = 'textbook' if printed_pinyin_syllables(text, example_pinyin) else 'inferred'
            if not syllables:
                segments.append({
                    'kind': 'example', 'sourceCardId': item['id'],
                    'exampleId': f"{item['id']}-E{example_index:02d}",
                    'text': text, 'pinyinSource': pinyin_source,
                    'tokenStart': len(tokens), 'tokenEnd': len(tokens),
                    'missingReason': 'No Mandarin syllables found in sentence text.',
                })
                continue
            first = len(tokens)
            tokens.extend(syllables)
            segments.append({
                'kind': 'example', 'sourceCardId': item['id'],
                'exampleId': f"{item['id']}-E{example_index:02d}",
                'text': text, 'pinyinSource': pinyin_source,
                'tokenStart': first, 'tokenEnd': len(tokens),
            })
    return tokens, segments


def han_only(text):
    return ''.join(char for char in text if '\u3400' <= char <= '\u9fff' or '\U00020000' <= char <= '\U0002ebef')


def load_book1_course_examples():
    if not BOOK1_COURSE_EXAMPLES.exists():
        raise FileNotFoundError(f'Missing generated Book 1 course examples: {BOOK1_COURSE_EXAMPLES}')
    pack = json.loads(BOOK1_COURSE_EXAMPLES.read_text())
    records = pack.get('records')
    if not isinstance(records, list):
        raise ValueError(f'Invalid generated Book 1 course examples: {BOOK1_COURSE_EXAMPLES}')
    return records


def load_book1_course_extras(items, records):
    """Return OCR vocabulary examples that differ from the primary vocab sentence."""
    item_ids = {item['id'] for item in items}
    primary = {
        (item['id'], han_only(example['chinese']))
        for item in items for example in item['_examples']
    }
    extras = []
    for record in records:
        if not re.fullmatch(r'.+-E\d{2}', str(record.get('id', ''))):
            continue
        source_card_id = record.get('sourceCardId')
        text = str(record.get('traditional', '')).strip()
        if source_card_id not in item_ids or not text:
            continue
        if (source_card_id, han_only(text)) in primary:
            continue
        syllables = normalize_to_syllables(text, record.get('pinyin'))
        if not syllables:
            continue
        extras.append({
            'kind': 'example',
            'sourceCardId': source_card_id,
            'exampleId': f"{record['id']}-ocr-extra",
            'text': text,
            'pinyinSource': 'textbook' if printed_pinyin_syllables(text, record.get('pinyin')) else 'inferred',
            'syllables': syllables,
        })
    return extras


def decode_for_aligner(path):
    samples = decode(path, ALIGN_SAMPLE_RATE)
    waveform = torch.from_numpy(samples).unsqueeze(0)
    return waveform


def infer_window_from_waveform(model, waveform, start_sample, end_sample, chunk_samples, device):
    """Run model on a full chunk_samples slice of real audio containing [start_sample, end_sample]."""
    total_samples = waveform.size(1)
    start_sample = max(0, min(start_sample, total_samples))
    end_sample = max(start_sample + 1, min(end_sample, total_samples))
    if total_samples <= chunk_samples or end_sample - start_sample >= chunk_samples:
        chunk = waveform[:, start_sample:min(total_samples, start_sample + chunk_samples)]
        with torch.inference_mode():
            emission, _ = model(chunk.to(device))
        return emission[0].detach().to('cpu')
    win_start = max(0, min(start_sample, total_samples - chunk_samples))
    win_end = win_start + chunk_samples
    chunk = waveform[:, win_start:win_end]
    with torch.inference_mode():
        emission, _ = model(chunk.to(device))
    emission = emission[0].detach().to('cpu')
    total_frames = emission.size(0)
    rel_start = round((start_sample - win_start) / chunk_samples * total_frames)
    rel_end = max(rel_start + 1, round((end_sample - win_start) / chunk_samples * total_frames))
    return emission[rel_start:rel_end]


def infer_emission(model, waveform, device):
    """Run Wav2Vec2 in overlapping windows with center-trimmed overlap to bound memory."""
    chunk_samples = EMISSION_CHUNK_SECONDS * ALIGN_SAMPLE_RATE
    if waveform.size(1) <= chunk_samples:
        return infer_window_from_waveform(model, waveform, 0, waveform.size(1), chunk_samples, device)
    overlap_samples = EMISSION_OVERLAP_SECONDS * ALIGN_SAMPLE_RATE
    step_samples = chunk_samples - overlap_samples
    starts = list(range(0, waveform.size(1), step_samples))
    chunks = []
    for index, start in enumerate(starts):
        end = min(waveform.size(1), start + chunk_samples)
        emission = infer_window_from_waveform(model, waveform, start, end, chunk_samples, device)
        frames_per_sample = emission.size(0) / max(1, end - start)
        half_overlap_frames = round((overlap_samples / 2) * frames_per_sample)
        if index > 0:
            emission = emission[min(emission.size(0), half_overlap_frames):]
        if end < waveform.size(1) and index + 1 < len(starts):
            emission = emission[:max(1, emission.size(0) - half_overlap_frames)]
        chunks.append(emission)
        print(f"    audio model window {index + 1}: {start / ALIGN_SAMPLE_RATE:.0f}-{end / ALIGN_SAMPLE_RATE:.0f}s", flush=True)
    if device.type == 'mps':
        torch.mps.empty_cache()
    return torch.cat(chunks, dim=0)


def refine_word_anchors(items, track_path, aligned, source_cache, signal_cache):
    """Replace weak sequence word bounds with source-word audio fingerprints."""
    if track_path not in signal_cache:
        signal_cache[track_path] = decode(track_path, FINGERPRINT_SAMPLE_RATE)
    signal = signal_cache[track_path]
    word_segments = {
        segment['sourceCardId']: segment
        for segment in aligned if segment.get('kind') == 'word'
    }
    cursor = 0
    previous_example_length = 0
    matched = 0
    for item in items:
        segment = word_segments.get(item['id'])
        template = source_template(item, source_cache)
        earliest = max(0, cursor - round(0.25 * FINGERPRINT_SAMPLE_RATE)) if cursor else 0
        max_gap = max(35, min(65, 20 + previous_example_length * 0.60))
        if template is not None:
            score, position = normalized_match(
                signal, template, earliest,
                earliest + max_gap * FINGERPRINT_SAMPLE_RATE,
            )
            if segment and position is not None and score >= MIN_WORD_MATCH_SCORE:
                segment.update({
                    'start': position / FINGERPRINT_SAMPLE_RATE,
                    'end': (position + len(template)) / FINGERPRINT_SAMPLE_RATE,
                    'wordAnchorScore': score,
                    'alignmentMethod': 'word-fingerprint',
                })
                cursor = position + len(template)
                matched += 1
        previous_example_length = (
            han_count(item['_examples'][0]['chinese']) if item['_examples'] else 0
        )
    print(f"    refined {matched}/{len(items)} vocabulary word anchors from source clips", flush=True)


def assign_example_windows(aligned, items, track_duration):
    """Compute acoustic [windowStart, windowEnd] bounds for every word and example segment."""
    item_by_id = {item['id']: item for item in items}
    word_segments = []
    for segment in aligned:
        if segment.get('kind') != 'word':
            continue
        if segment.get('start') is None or segment.get('end') is None:
            continue
        if word_segments and float(segment['start']) < float(word_segments[-1]['start']):
            continue
        word_segments.append(segment)

    def are_grouped(curr_word, next_word):
        gap = float(next_word['start']) - float(curr_word['end'])
        if gap < 2.2:
            return True
        curr_item = item_by_id.get(curr_word['sourceCardId'])
        next_item = item_by_id.get(next_word['sourceCardId'])
        curr_ex = [han_only(e.get('chinese', '')) for e in (curr_item or {}).get('_examples', [])]
        next_ex = [han_only(e.get('chinese', '')) for e in (next_item or {}).get('_examples', [])]
        if curr_ex and curr_ex == next_ex and gap < 4.5:
            return True
        if next_word['sourceCardId'].startswith('B1') and not curr_ex and gap < 4.2:
            return True
        return False

    word_windows = {}
    for index, word_seg in enumerate(word_segments):
        first_idx = index
        while first_idx > 0 and are_grouped(word_segments[first_idx - 1], word_segments[first_idx]):
            first_idx -= 1
        last_idx = index
        while last_idx + 1 < len(word_segments) and are_grouped(word_segments[last_idx], word_segments[last_idx + 1]):
            last_idx += 1
        win_start = float(word_segments[last_idx]['end'])
        win_end = float(word_segments[last_idx + 1]['start']) if last_idx + 1 < len(word_segments) else track_duration
        word_seg['windowStart'] = win_start
        word_seg['windowEnd'] = win_end
        word_windows[word_seg['sourceCardId']] = (win_start, win_end, first_idx, last_idx)

    for segment in aligned:
        if segment.get('kind') != 'example':
            continue
        info = word_windows.get(segment.get('sourceCardId'))
        if not info:
            continue
        win_start, win_end, first_idx, last_idx = info
        syllable_count = segment.get('syllableCount', 0)
        # Handle 1-syllable interjection clip (e.g. B3L01-1-36 嗯) cut from B: inside its own dialogue example
        if (first_idx == last_idx and first_idx > 0
                and syllable_count >= 15
                and win_end - win_start < syllable_count * 0.27):
            prev_word = word_segments[first_idx - 1]
            prev_item = item_by_id.get(prev_word['sourceCardId'])
            if prev_item and not prev_item.get('_examples'):
                win_start = float(prev_word['end'])
        segment['windowStart'] = win_start
        segment['windowEnd'] = win_end


def summarize_alignment_spans(valid_spans, seconds_per_frame, track_duration, text, syllables=None, offset_seconds=0.0):
    """Extract capped start/end, score, maxSyllableGap, and maxSyllableDuration from CTC spans."""
    bounds = [
        [
            offset_seconds + min(state.start for state in span) * seconds_per_frame,
            offset_seconds + max(state.end for state in span) * seconds_per_frame,
        ]
        for span in valid_spans
    ]
    if bounds:
        if bounds[0][1] - bounds[0][0] > 0.65:
            bounds[0][0] = bounds[0][1] - 0.45
        if bounds[-1][1] - bounds[-1][0] > 0.65:
            bounds[-1][1] = bounds[-1][0] + 0.45
    start = max(0.0, bounds[0][0]) if bounds else 0.0
    end = min(track_duration, bounds[-1][1]) if bounds else 0.0
    max_syllable_duration = max((b[1] - b[0] for b in bounds), default=0.0)
    max_syllable_gap = max(
        (max(0.0, following[0] - previous[1]) for previous, following in zip(bounds, bounds[1:])),
        default=0.0,
    )
    all_states = [state for span in valid_spans for state in span]
    score = float(np.mean([state.score for state in all_states])) if all_states else 0.0
    expanded_text = expand_digits(re.sub(r'[（(][^）)]*[）)]', '', text))
    numeral_count = sum(1 for char in expanded_text if char in NUMERAL_CHARS)
    if (score < MIN_SEGMENT_SCORE and numeral_count >= 2
            and syllables and len(valid_spans) == len(syllables) and len(valid_spans) >= 4):
        first_score = float(np.mean([s.score for s in valid_spans[0]]))
        last_score = float(np.mean([s.score for s in valid_spans[-1]]))
        non_num_states = [
            state for syl, span in zip(syllables, valid_spans)
            if syl not in NUMERAL_SYLLABLES for state in span
        ]
        if first_score >= 0.70 and last_score >= 0.70 and len(non_num_states) >= 4:
            non_num_mean = float(np.mean([s.score for s in non_num_states]))
            if non_num_mean >= 0.85:
                score = max(score, non_num_mean * 0.92)
        elif first_score >= 0.70 and last_score >= 0.45 and numeral_count >= 4:
            non_num_syl_scores = sorted(
                (float(np.mean([s.score for s in span]))
                 for syl, span in zip(syllables, valid_spans)
                 if syl not in NUMERAL_SYLLABLES),
                reverse=True,
            )
            if (len(non_num_syl_scores) >= 4
                    and float(np.mean(non_num_syl_scores)) >= 0.65
                    and float(np.mean(non_num_syl_scores[:4])) >= 0.90):
                score = max(score, float(np.mean(non_num_syl_scores)) * 0.96)
    return {
        'start': start,
        'end': end,
        'score': score,
        'maxSyllableGap': max_syllable_gap,
        'maxSyllableDuration': max_syllable_duration,
    }


def align_segments(model, dictionary, aligner, track_path, segments, tokens, device,
                   items, source_cache, signal_cache):
    waveform = decode_for_aligner(track_path)
    track_duration = waveform.size(1) / ALIGN_SAMPLE_RATE
    emission = infer_emission(model, waveform, device)
    ratio = waveform.size(1) / emission.size(0)
    seconds_per_frame = ratio / ALIGN_SAMPLE_RATE
    tokenized = [[dictionary[char] for char in token if char in dictionary] for token in tokens]
    if any(not token for token in tokenized):
        raise ValueError('Pinyin token sequence contains a character outside the MMS alignment dictionary.')
    spans = aligner(emission, tokenized)
    aligned = []
    for segment in segments:
        first, last = segment['tokenStart'], segment['tokenEnd']
        token_spans = spans[first:last]
        valid = [span for span in token_spans if span]
        if not valid:
            aligned.append({**segment, 'start': None, 'end': None, 'score': 0.0})
            continue
        summary = summarize_alignment_spans(
            valid, seconds_per_frame, track_duration,
            segment['text'], syllables=tokens[first:last],
        )
        aligned.append({
            **segment,
            **summary,
            'alignedSyllables': len(valid),
            'syllableCount': last - first,
            'alignmentMethod': 'sequence',
            '_syllables': tokens[first:last],
        })
    refine_word_anchors(items, track_path, aligned, source_cache, signal_cache)
    assign_example_windows(aligned, items, track_duration)
    retry_unreliable_segments(
        model, waveform, device, emission, ratio, aligner, aligned, tokenized, track_duration,
    )
    return aligned, track_duration, emission, ratio, waveform


def max_allowed_syllable_gap(text):
    if len(re.findall(r'[。？！?]', text)) > 1:
        return 5.0
    if '/' in text or '／' in text:
        return 2.5
    if re.search(r'[,，、;；:：]|[A-Z]\s*:', text):
        return 3.5
    return 1.5


def segment_quality_issue(segment):
    if segment.get('alignedSyllables') != segment.get('syllableCount'):
        return True
    han = han_count(segment['text'])
    start, end = segment.get('start'), segment.get('end')
    if start is None or end is None:
        return True
    window_start = segment.get('windowStart')
    window_end = segment.get('windowEnd')
    if window_start is not None and float(start) < float(window_start) - 0.08:
        return True
    if window_end is not None and float(end) > float(window_end) + 0.08:
        return True
    if segment.get('maxSyllableDuration', 0.0) > MAX_SYLLABLE_DURATION:
        return True
    duration = float(end) - float(start)
    min_duration = max(0.30, han * 0.14)
    max_duration = max(5.0, han * 0.72 + 1.0)
    maximum_gap = max_allowed_syllable_gap(segment['text'])
    return (
        segment.get('score', 0.0) < MIN_SEGMENT_SCORE
        or segment.get('maxSyllableGap', 0.0) > maximum_gap
        or not min_duration <= duration <= max_duration
    )


def retry_unreliable_segments(model, waveform, device, emission, ratio, aligner, aligned, tokenized, track_duration):
    """Retry weak or out-of-window alignments inside adjacent word-anchor bounds."""
    previous_example_end = {}
    previous_window_example = {}
    for index, segment in enumerate(aligned):
        if segment.get('kind') != 'example':
            continue

        own_word = next((candidate for candidate in reversed(aligned[:index])
                         if candidate.get('kind') == 'word'
                         and candidate.get('sourceCardId') == segment.get('sourceCardId')),
                        None)
        next_word = next((candidate for candidate in aligned[index + 1:]
                          if candidate.get('kind') == 'word'
                          and candidate.get('start') is not None), None)
        local_lower = segment.get('_localLower')
        if local_lower is None:
            local_lower = segment.get('windowStart')
        lower = (float(local_lower) + 0.04 if local_lower is not None else
                 float(own_word['end']) + 0.04
                 if own_word and own_word.get('end') is not None else
                 max(0.0, float(segment.get('start') or 0.0) - 2.0))
        if segment['sourceCardId'] in previous_example_end and not segment.get('_allowOverlap'):
            lower = max(lower, previous_example_end[segment['sourceCardId']] + 0.10)
        local_upper = segment.get('_localUpper')
        if local_upper is None:
            local_upper = segment.get('windowEnd')
        upper = (float(local_upper) - 0.04 if local_upper is not None else
                 float(next_word['start']) - 0.04
                 if next_word and next_word.get('start') is not None else track_duration)

        win_key = (round(float(local_lower or 0.0), 1), round(float(local_upper or track_duration), 1))
        seg_han = han_only(segment['text'])
        if win_key in previous_window_example and not segment.get('_allowOverlap'):
            prev_han, prev_end = previous_window_example[win_key]
            if seg_han != prev_han:
                lower = max(lower, prev_end + 0.10)

        if not segment_quality_issue(segment):
            if segment.get('end') is not None:
                previous_example_end[segment['sourceCardId']] = float(segment['end'])
                previous_window_example[win_key] = (seg_han, float(segment['end']))
            continue
        if upper - lower < 0.8:
            continue

        first, last = segment['tokenStart'], segment['tokenEnd']
        target_tokens = segment.get('_targetTokens') or tokenized[first:last]
        target_syllables = segment.get('_syllables')
        if not target_tokens:
            continue

        seconds_per_frame = ratio / ALIGN_SAMPLE_RATE
        low_frame = max(0, int(lower / seconds_per_frame))
        high_frame = min(emission.size(0), int(upper / seconds_per_frame))
        if high_frame - low_frame < len(target_tokens) * 2:
            continue

        def search_local_emission(local_emission, local_spf, base_offset):
            total_frames = local_emission.size(0)
            window_span_sec = total_frames * local_spf
            syllable_count = segment['syllableCount']
            expected = max(1.6, min(18.0, syllable_count * 0.36 + 0.6))
            max_win = min(window_span_sec, max(12.0, syllable_count * 0.65 + 1.5))
            window_seconds = sorted({
                round(min(window_span_sec, max(0.8, min(max_win, expected * scale))), 2)
                for scale in (0.65, 0.8, 0.95, 1.1, 1.25, 1.5, 1.8)
            } | {round(window_span_sec, 2)})
            step_frames = max(1, round(0.25 / local_spf))
            best_local = None
            for seconds in window_seconds:
                window_frames = min(total_frames, max(1, round(seconds / local_spf)))
                if window_frames < len(target_tokens) * 2:
                    continue
                latest_start = total_frames - window_frames
                starts = list(range(0, latest_start + 1, step_frames))
                if not starts or starts[-1] != latest_start:
                    starts.append(latest_start)
                for window_start in starts:
                    window = local_emission[window_start:window_start + window_frames]
                    spans = aligner(window, target_tokens)
                    valid = [span for span in spans if span]
                    if len(valid) != len(target_tokens):
                        continue
                    summary = summarize_alignment_spans(
                        valid, local_spf, track_duration, segment['text'],
                        syllables=target_syllables,
                        offset_seconds=base_offset + window_start * local_spf,
                    )
                    start = summary['start']
                    end = summary['end']
                    score = summary['score']
                    max_gap = summary['maxSyllableGap']
                    max_syl_dur = summary['maxSyllableDuration']
                    han = han_count(segment['text'])
                    duration = end - start
                    if score < MIN_SEGMENT_SCORE or max_gap > max_allowed_syllable_gap(segment['text']):
                        continue
                    if max_syl_dur > MAX_SYLLABLE_DURATION:
                        continue
                    if not max(0.30, han * 0.14) <= duration <= max(5.0, han * 0.72 + 1.0):
                        continue
                    rank = score - max_gap * 0.04 - max(0.0, max_syl_dur - 0.45) * 0.05
                    if best_local is None or rank > best_local['rank']:
                        best_local = {**summary, 'rank': rank}
            return best_local

        best = search_local_emission(emission[low_frame:high_frame], seconds_per_frame, lower)
        # If local emission slice failed or had borderline confidence (e.g. straddling a 30s chunk boundary),
        # run a single fixed-shape forward pass on the bounded waveform window [lower, upper].
        if best is None or best['score'] < 0.72:
            chunk_samples = EMISSION_CHUNK_SECONDS * ALIGN_SAMPLE_RATE
            low_sample = max(0, int(lower * ALIGN_SAMPLE_RATE))
            high_sample = min(waveform.size(1), min(low_sample + chunk_samples, int(upper * ALIGN_SAMPLE_RATE)))
            if high_sample - low_sample >= int(0.6 * ALIGN_SAMPLE_RATE):
                fresh_emission = infer_window_from_waveform(
                    model, waveform, low_sample, high_sample, chunk_samples, device,
                )
                fresh_spf = ((high_sample - low_sample) / max(1, fresh_emission.size(0))) / ALIGN_SAMPLE_RATE
                fresh_best = search_local_emission(fresh_emission, fresh_spf, low_sample / ALIGN_SAMPLE_RATE)
                if fresh_best is not None and (best is None or fresh_best['rank'] > best['rank']):
                    best = fresh_best
        if best:
            segment.update({
                'start': best['start'], 'end': best['end'], 'score': best['score'],
                'maxSyllableGap': best['maxSyllableGap'],
                'maxSyllableDuration': best['maxSyllableDuration'],
                'alignedSyllables': segment['syllableCount'],
                'alignmentMethod': 'local-window',
            })
            print(f"    recovered {segment['exampleId']} at {best['start']:.2f}-{best['end']:.2f}s "
                  f"(score {best['score']:.3f})", flush=True)
        if segment.get('end') is not None and not segment_quality_issue(segment):
            previous_example_end[segment['sourceCardId']] = float(segment['end'])
            previous_window_example[win_key] = (seg_han, float(segment['end']))


def track_reference(book_id, track, book3_track_index):
    if book_id == 1:
        return track['file'], track['id']
    return track['file'], track['id']


def reuse_exact_sentence_ranges(entries):
    """Share a verified recording when identical text occurs on multiple vocab cards."""
    ranges_by_sentence = {}
    for example_id, entry in entries.items():
        if not entry.get('audio'):
            continue
        sentence_key = (
            entry['bookId'], entry['lessonId'], entry['partId'],
            han_only(entry['traditional']),
        )
        ranges_by_sentence.setdefault(sentence_key, []).append((example_id, entry))

    reused = 0
    for example_id, entry in entries.items():
        if entry.get('audio'):
            continue
        sentence_key = (
            entry['bookId'], entry['lessonId'], entry['partId'],
            han_only(entry['traditional']),
        )
        peers = ranges_by_sentence.get(sentence_key, [])
        if not peers:
            continue
        source_id, source = max(peers, key=lambda pair: pair[1]['alignment']['score'])
        entry['audio'] = source['audio']
        entry['alignment']['score'] = source['alignment']['score']
        entry['alignment']['alignedSyllables'] = source['alignment']['alignedSyllables']
        entry['alignment']['syllableCount'] = source['alignment']['syllableCount']
        entry['alignment']['rangeSharedFrom'] = source_id
        entry.pop('issue', None)
        ranges_by_sentence.setdefault(sentence_key, []).append((example_id, entry))
        reused += 1
    return reused


def make_audio_entry(book_id, file, score, word_segment, example_segment, next_segment, track_duration):
    raw_start, raw_end = example_segment.get('start'), example_segment.get('end')
    if raw_start is None or raw_end is None:
        return None, 'invalid alignment bounds'
    start = float(raw_start)
    end = float(raw_end)
    if not math.isfinite(start) or not math.isfinite(end) or end <= start:
        return None, 'invalid alignment bounds'
    han = han_count(example_segment['text'])
    min_duration = max(0.45, han * 0.14)
    max_duration = max(5.0, han * 0.72 + 1.0)
    if example_segment.get('alignedSyllables') != example_segment.get('syllableCount'):
        return None, 'one or more sentence syllables did not align'
    if score < MIN_SEGMENT_SCORE:
        return None, f'alignment confidence {score:.3f} is below {MIN_SEGMENT_SCORE:.2f}'
    maximum_gap = max_allowed_syllable_gap(example_segment['text'])
    if example_segment.get('maxSyllableGap', 0.0) > maximum_gap:
        return None, f"sentence alignment contains a {example_segment['maxSyllableGap']:.2f}s gap"
    if example_segment.get('maxSyllableDuration', 0.0) > MAX_SYLLABLE_DURATION:
        return None, f"sentence alignment contains a stretched {example_segment['maxSyllableDuration']:.2f}s syllable"

    window_start = example_segment.get('windowStart')
    if window_start is None and word_segment and word_segment.get('end') is not None:
        window_start = float(word_segment['end'])
    window_end = example_segment.get('windowEnd')
    if window_end is None and next_segment and next_segment.get('start') is not None:
        window_end = float(next_segment['start'])

    if window_start is not None and start < float(window_start) - 0.15:
        return None, 'sentence alignment starts before vocabulary headword window'
    if window_end is not None and end > float(window_end) + 0.15:
        return None, 'sentence alignment bleeds past following vocabulary headword'

    # Add a small natural lead/tail while staying clear of the vocabulary
    # headword and the next aligned text segment.
    start = max(0.0, start - 0.06)
    if window_start is not None:
        start = max(start, float(window_start) + 0.04)
    end = min(track_duration, end + 0.14)
    if window_end is not None:
        end = min(end, float(window_end) - 0.04)
    if next_segment and next_segment.get('start') is not None:
        next_start = float(next_segment['start'])
        if window_start is None or next_start > float(window_start) + 0.5:
            end = min(end, next_start - 0.03)
    duration = end - start
    if not min_duration <= duration <= max_duration:
        return None, f'implausible sentence duration {duration:.2f}s for {han} Han characters'
    if end - start < min_duration:
        return None, 'padded clip became too short after guarding adjacent audio'

    audio = {
        'voice': 'book', 'file': file,
        'start': round(start, 2), 'end': round(end, 2),
    }
    return audio, None


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='write the reviewed full result to content/audio/')
    parser.add_argument('--book', type=int, choices=[1, 3])
    parser.add_argument('--lesson', type=int)
    parser.add_argument('--part', type=int)
    parser.add_argument('--device', choices=['auto', 'cpu', 'mps'], default='auto')
    return parser.parse_args()


def main():
    args = parse_args()
    filters = args.book is not None or args.lesson is not None or args.part is not None
    if args.apply and filters:
        raise ValueError('--apply requires the complete Books 1 and 3 corpus; filters are preview-only.')

    groups = {1: get_book_items(1), 3: get_book_items(3)}
    book1_course_records = load_book1_course_examples() if args.book != 3 else []
    book1_candidates = load_book1_candidates()
    book3_tracks = load_book3_tracks()
    book3_index = json.loads(BOOK3_INDEX.read_text())
    book1_manifest_files = manifest_files(BOOK1_MANIFEST)
    book3_manifest_files = manifest_files(BOOK3_MANIFEST)
    word_cache = {}
    signal_cache = {}
    track_hashes = {}
    track_durations = {}
    candidate_report = []
    selected_groups = []
    total_assignments = 0

    for book_id in (1, 3):
        for (lesson_id, part_id), items in sorted(groups[book_id].items()):
            if args.book is not None and book_id != args.book:
                continue
            if args.lesson is not None and lesson_id != args.lesson:
                continue
            if args.part is not None and part_id != args.part:
                continue
            examples = [(item, example_index, example) for item in items
                        for example_index, example in enumerate(item['_examples'], start=1)]
            course_extras = load_book1_course_extras(items, book1_course_records) if book_id == 1 else []
            if not examples:
                if not course_extras:
                    continue
            total_assignments += len(examples) + len(course_extras)
            if book_id == 1:
                candidates = book1_candidates.get((lesson_id, part_id), [])
                audio_root = BOOK1_AUDIO_ROOT
            else:
                track = book3_tracks.get((lesson_id, part_id))
                candidates = [track] if track else []
                audio_root = BOOK3_AUDIO_ROOT
            if not candidates:
                candidate_report.append({
                    'bookId': book_id, 'lessonId': lesson_id, 'partId': part_id,
                    'expectedExamples': len(examples) + len(course_extras), 'error': 'no indexed vocabulary track',
                })
                continue
            try:
                source_manifest = book1_manifest_files if book_id == 1 else book3_manifest_files
                valid_candidates = []
                candidate_hashes = {}
                candidate_warnings = []
                for candidate in candidates:
                    try:
                        candidate_hashes[candidate['file']] = verify_track(candidate, audio_root, source_manifest)
                        valid_candidates.append(candidate)
                    except Exception as error:
                        candidate_warnings.append(f"{candidate['file']}: {error}")
                if not valid_candidates:
                    raise ValueError('; '.join(candidate_warnings) or 'No tracks passed source-manifest validation.')
                best, ranked = classify_track(items, valid_candidates, audio_root, word_cache, signal_cache)
                signal_cache.clear()
                selected = best['track']
                track_path = audio_root / selected['file']
                track_hashes[selected['file']] = candidate_hashes[selected['file']]
                candidate_report.append({
                    'bookId': book_id, 'lessonId': lesson_id, 'partId': part_id,
                    'track': selected['file'], 'strongWordMatches': best['strong'],
                    'sampleWordCount': len(best['scores']), 'meanMatchScore': round(best['meanScore'], 3),
                    'sourceManifestVerified': True, 'candidateWarnings': candidate_warnings,
                    'candidates': [
                        {'file': entry['track']['file'], 'strongWordMatches': entry['strong'],
                         'meanMatchScore': round(entry['meanScore'], 3)}
                        for entry in ranked
                    ],
                    'expectedExamples': len(examples) + len(course_extras),
                })
                selected_groups.append((book_id, lesson_id, part_id, items, selected, track_path,
                                        len(examples) + len(course_extras), course_extras))
                print(f"Book {book_id} L{lesson_id:02d} P{part_id}: {selected['file']} "
                      f"({best['strong']}/{len(best['scores'])} word anchors)", flush=True)
            except Exception as error:
                candidate_report.append({
                    'bookId': book_id, 'lessonId': lesson_id, 'partId': part_id,
                    'expectedExamples': len(examples) + len(course_extras), 'error': str(error),
                })

    if not selected_groups:
        raise ValueError('No vocabulary tracks passed the fingerprint checks.')

    print('Loading MMS forced-alignment model…', flush=True)
    model = bundle.get_model().eval()
    dictionary = bundle.get_dict()
    aligner = bundle.get_aligner()
    requested_device = args.device
    if requested_device == 'auto':
        requested_device = 'mps' if torch.backends.mps.is_available() else 'cpu'
    device = torch.device(requested_device)
    try:
        model = model.to(device)
    except Exception as error:
        print(f'Model could not use {device}: {error}; falling back to CPU.', flush=True)
        device = torch.device('cpu')
        model = model.to(device)
    if device.type == 'cpu':
        torch.set_num_threads(min(6, torch.get_num_threads()))

    entries = {}
    segment_report = []
    for book_id, lesson_id, part_id, items, track, track_path, expected_count, course_extras in selected_groups:
        tokens, segments = build_alignment_segments(items)
        try:
            aligned, track_duration, emission, ratio, waveform = align_segments(
                model, dictionary, aligner, track_path, segments, tokens, device,
                items, word_cache, signal_cache,
            )
            signal_cache.pop(track_path, None)
            track_durations[track['file']] = round(track_duration, 3)
            if course_extras:
                word_segments = [segment for segment in aligned if segment['kind'] == 'word']
                for extra in course_extras:
                    own_word = next((segment for segment in word_segments
                                     if segment['sourceCardId'] == extra['sourceCardId']), None)
                    next_word = next((segment for segment in word_segments
                                      if own_word and segment['tokenStart'] > own_word['tokenStart']), None)
                    extra_tokens = []
                    for syllable in extra['syllables']:
                        token = [dictionary[char] for char in syllable if char in dictionary]
                        if not token:
                            raise ValueError(f"Course example {extra['exampleId']} has an unsupported MMS syllable: {syllable}")
                        extra_tokens.append(token)
                    win_start = own_word.get('windowStart', own_word.get('end')) if own_word else None
                    win_end = own_word.get('windowEnd', next_word.get('start') if next_word else track_duration) if own_word else track_duration
                    aligned.append({
                        'kind': 'example', 'sourceCardId': extra['sourceCardId'],
                        'exampleId': extra['exampleId'], 'text': extra['text'],
                        'pinyinSource': extra['pinyinSource'], 'tokenStart': 0, 'tokenEnd': 0,
                        'start': None, 'end': None, 'score': 0.0, 'maxSyllableGap': 0.0,
                        'maxSyllableDuration': 0.0,
                        'alignedSyllables': 0, 'syllableCount': len(extra_tokens),
                        'windowStart': win_start,
                        'windowEnd': win_end,
                        '_targetTokens': extra_tokens,
                        '_syllables': extra['syllables'],
                        '_localLower': win_start,
                        '_localUpper': win_end,
                        '_allowOverlap': True,
                        '_nextSegment': next_word,
                    })
                retry_unreliable_segments(
                    model, waveform, device, emission, ratio, aligner, aligned,
                    [[dictionary[char] for char in token if char in dictionary] for token in tokens],
                    track_duration,
                )
            for index, segment in enumerate(aligned):
                if segment['kind'] != 'example':
                    continue
                source_item = next(item for item in items if item['id'] == segment['sourceCardId'])
                word_segment = next((candidate for candidate in aligned
                                     if candidate['kind'] == 'word'
                                     and candidate['sourceCardId'] == segment['sourceCardId']), None)
                next_segment = segment.get('_nextSegment')
                if next_segment is not None and segment.get('end') is not None:
                    if next_segment.get('start') is None or float(next_segment['start']) < float(segment['end']) - 0.15:
                        next_segment = None
                if next_segment is None:
                    win_start = segment.get('windowStart')
                    win_end = segment.get('windowEnd')
                    min_next_start = (
                        float(segment['end']) - 0.15
                        if segment.get('end') is not None else
                        (float(win_start) + 0.15 if win_start is not None else 0.0)
                    )
                    # Prefer the next segment in sequence order that starts at or after the current segment's end
                    for candidate in aligned[index + 1:]:
                        if candidate.get('_targetTokens') or candidate.get('start') is None:
                            continue
                        if float(candidate['start']) < min_next_start:
                            continue
                        if (candidate.get('kind') == 'example'
                                and han_only(candidate.get('text', '')) == han_only(segment.get('text', ''))):
                            continue
                        next_segment = candidate
                        break
                    if next_segment is None and win_end is not None:
                        next_segment = {'start': win_end}
                file, drive_id = track_reference(book_id, track, book3_index)
                audio, issue = make_audio_entry(
                    book_id, file, segment['score'], word_segment,
                    segment, next_segment, track_duration,
                )
                entry = {
                    'bookId': book_id,
                    'lessonId': lesson_id,
                    'partId': part_id,
                    'sourceCardId': segment['sourceCardId'],
                    'traditional': segment['text'],
                    'audio': audio,
                    'alignment': {
                        'score': round(segment['score'], 3),
                        'pinyinSource': segment.get('pinyinSource', 'inferred'),
                        'alignedSyllables': segment.get('alignedSyllables', 0),
                        'syllableCount': segment.get('syllableCount', 0),
                        'track': track['file'],
                        'trackSha256': track_hashes[track['file']],
                        'driveFileId': drive_id,
                    },
                }
                if issue:
                    entry['issue'] = issue
                entries[segment['exampleId']] = entry
                segment_report.append({
                    'exampleId': segment['exampleId'],
                    'bookId': book_id,
                    'track': track['file'],
                    'start': segment['start'],
                    'end': segment['end'],
                    'maxSyllableGap': round(segment.get('maxSyllableGap', 0.0), 3),
                    'wordEnd': word_segment.get('end') if word_segment else None,
                    'nextStart': next_segment.get('start') if next_segment else None,
                    'score': round(segment['score'], 3),
                    'pinyinSource': segment.get('pinyinSource', 'inferred'),
                    'audio': audio,
                    'issue': issue,
                })
            print(f"  aligned {len([s for s in aligned if s['kind'] == 'example'])} examples "
                  f"from {track['file']} ({track_duration:.1f}s)", flush=True)
        except Exception as error:
            segment_report.append({
                'bookId': book_id, 'lessonId': lesson_id, 'partId': part_id,
                'track': track['file'], 'error': str(error),
            })

    shared_range_count = reuse_exact_sentence_ranges(entries)
    for row in segment_report:
        entry = entries.get(row.get('exampleId'))
        if entry:
            row['audio'] = entry['audio']
            row['score'] = entry['alignment']['score']
            row['alignedSyllables'] = entry['alignment']['alignedSyllables']
            row['syllableCount'] = entry['alignment']['syllableCount']
            row['issue'] = entry.get('issue')
            row['rangeSharedFrom'] = entry['alignment'].get('rangeSharedFrom')
    valid_count = sum(1 for entry in entries.values() if entry['audio'])
    report = {
        'schemaVersion': 1,
        'model': 'torchaudio.pipelines.MMS_FA',
        'device': str(device),
        'sampleRate': ALIGN_SAMPLE_RATE,
        'chunkSeconds': EMISSION_CHUNK_SECONDS,
        'overlapSeconds': EMISSION_OVERLAP_SECONDS,
        'expectedAssignments': total_assignments,
        'alignedAssignments': len(entries),
        'validAssignments': valid_count,
        'sharedRangeAssignments': shared_range_count,
        'coverage': round(valid_count / total_assignments, 4) if total_assignments else 0,
        'printedPinyinAssignments': sum(
            1 for entry in entries.values() if entry['alignment'].get('pinyinSource') == 'textbook'
        ),
        'inferredPinyinAssignments': sum(
            1 for entry in entries.values() if entry['alignment'].get('pinyinSource') == 'inferred'
        ),
        'inferredPinyinExampleIds': [
            example_id for example_id, entry in entries.items()
            if entry['alignment'].get('pinyinSource') == 'inferred'
        ],
        'trackSelection': candidate_report,
        'examples': segment_report,
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    draft = {
        'schemaVersion': 1,
        'generatedBy': 'scripts/audio/alignVocabularyExampleAudio.py',
        'source': 'Official TKU CLC Book 1 and Book 3 vocabulary audio; streamed by original track range.',
        'model': 'torchaudio.pipelines.MMS_FA',
        'tracks': {
            filename: {
                'sha256': sha,
                'source': 'book1-r2' if filename.startswith('B1-') else 'book3-r2',
                'durationSec': track_durations[filename],
            }
            for filename, sha in sorted(track_hashes.items())
        },
        'coverage': report['coverage'],
        'examples': entries,
    }
    DRAFT_PATH.parent.mkdir(parents=True, exist_ok=True)
    DRAFT_PATH.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + '\n')
    print(f"\n{valid_count}/{total_assignments} aligned examples passed; report: {REPORT_PATH}")
    print(f"preview manifest: {DRAFT_PATH}")

    if args.apply:
        if candidate_report and any(entry.get('error') for entry in candidate_report):
            raise ValueError('Cannot apply with unresolved vocabulary-track selection failures.')
        if len(entries) != total_assignments:
            raise ValueError('Cannot apply: every expected example needs an alignment result.')
        if report['coverage'] < 0.90:
            raise ValueError(f"Cannot apply: only {report['coverage']:.1%} of examples have verified recordings (90% required).")
        CONTENT_PATH.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + '\n')
        print(f'Applied complete manifest with {valid_count}/{total_assignments} verified recorded ranges: {CONTENT_PATH}')
    elif valid_count != total_assignments:
        print('Some clips need review; preview mode did not update content/audio/.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'ERROR: {error}', file=sys.stderr)
        sys.exit(1)

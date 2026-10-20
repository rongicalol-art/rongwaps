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
EMISSION_OVERLAP_SECONDS = 1
MIN_WORD_MATCH_SCORE = 0.68
MIN_SEGMENT_SCORE = 0.64
PINYIN_VARIANTS = {
    'shei': 'shui', 'zhei': 'zhe', 'nei': 'na', 'dei': 'de',
    'liao': 'le', 'zhongming': 'zhouming',
}
PUNCT = set('，。？！、：；“”‘’（）《》〈〉…—,.?!:;\'"()[]{}-/\\')
CN_DIGITS = '零一二三四五六七八九'
PINYIN_SYLLABLES = {
    to_normal(syllable).lower()
    for readings in PINYIN_DICT.values()
    for syllable in readings.split(',')
}
PINYIN_SYLLABLES.update({'shei', 'zhei'})


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
    def convert(match):
        number = int(match.group(0))
        if number == 0:
            return '零'
        if len(match.group(0).lstrip('0')) > 4:
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
    plain = ''.join(lazy_pinyin(char)).lower()
    for variant, canonical in PINYIN_VARIANTS.items():
        plain = plain.replace(variant, canonical)
    return plain


def split_pinyin_word(word):
    """Return plausible syllabifications of one printed, unspaced Pinyin word."""
    normalized = to_normal(word).lower().replace('ü', 'v')
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


def printed_pinyin_syllables(text, pinyin):
    """Parse source-book Pinyin, requiring one syllable for every spoken Hanzi."""
    if not pinyin:
        return None
    pinyin = re.sub(r'\b[A-Z]\s*:', ' ', pinyin)
    words = re.findall(r'[A-Za-zvV]+', to_normal(pinyin).lower())
    erhua_count = sum(1 for word in words if len(word) > 2 and word.endswith('r'))
    # In erhua words such as yìdiǎnr, 儿 is represented by the final r rather
    # than its own vowel-bearing syllable.
    words = [word[:-1] if len(word) > 2 and word.endswith('r') else word for word in words]
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


def load_book1_course_extras(items):
    """Return OCR vocabulary examples that differ from the primary vocab sentence."""
    if not BOOK1_COURSE_EXAMPLES.exists():
        return []
    pack = json.loads(BOOK1_COURSE_EXAMPLES.read_text())
    item_ids = {item['id'] for item in items}
    primary = {
        (item['id'], han_only(example['chinese']))
        for item in items for example in item['_examples']
    }
    extras = []
    for record in pack.get('records', []):
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


def infer_emission(model, waveform, device):
    """Run Wav2Vec2 in overlapping windows to bound attention memory."""
    chunk_samples = EMISSION_CHUNK_SECONDS * ALIGN_SAMPLE_RATE
    overlap_samples = EMISSION_OVERLAP_SECONDS * ALIGN_SAMPLE_RATE
    step_samples = chunk_samples - overlap_samples
    chunks = []
    with torch.inference_mode():
        for index, start in enumerate(range(0, waveform.size(1), step_samples)):
            end = min(waveform.size(1), start + chunk_samples)
            chunk = waveform[:, start:end].to(device)
            emission, _ = model(chunk)
            emission = emission[0].detach().to('cpu')
            if index:
                frames_per_sample = emission.size(0) / max(1, chunk.size(1))
                drop_frames = min(emission.size(0), round(overlap_samples * frames_per_sample))
                emission = emission[drop_frames:]
            chunks.append(emission)
            print(f"    audio model window {index + 1}: {start / ALIGN_SAMPLE_RATE:.0f}-{end / ALIGN_SAMPLE_RATE:.0f}s", flush=True)
    return torch.cat(chunks, dim=0)


def align_segments(model, dictionary, aligner, track_path, segments, tokens, device):
    waveform = decode_for_aligner(track_path)
    track_duration = waveform.size(1) / ALIGN_SAMPLE_RATE
    emission = infer_emission(model, waveform, device)
    ratio = waveform.size(1) / emission.size(0)
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
        all_states = [state for span in valid for state in span]
        token_bounds = [
            (min(state.start for state in span), max(state.end for state in span))
            for span in valid
        ]
        max_syllable_gap = max(
            (max(0, following[0] - previous[1]) * ratio / ALIGN_SAMPLE_RATE
             for previous, following in zip(token_bounds, token_bounds[1:])),
            default=0.0,
        )
        aligned.append({
            **segment,
            'start': max(0.0, min(state.start for state in all_states) * ratio / ALIGN_SAMPLE_RATE),
            'end': min(track_duration, max(state.end for state in all_states) * ratio / ALIGN_SAMPLE_RATE),
            'score': float(np.mean([state.score for state in all_states])),
            'maxSyllableGap': max_syllable_gap,
            'alignedSyllables': len(valid),
            'syllableCount': last - first,
            'alignmentMethod': 'sequence',
        })
    retry_unreliable_segments(emission, ratio, aligner, aligned, tokenized, track_duration)
    return aligned, track_duration, emission, ratio


def max_allowed_syllable_gap(text):
    if len(re.findall(r'[。？！?]', text)) > 1:
        return 5.0
    if re.search(r'[,，、;；:：]|[A-Z]\s*:', text):
        return 3.5
    return 1.5


def segment_quality_issue(segment):
    if segment.get('alignedSyllables') != segment.get('syllableCount'):
        return True
    han = han_count(segment['text'])
    duration = segment.get('end', 0) - segment.get('start', 0)
    min_duration = max(0.30, han * 0.055)
    max_duration = max(5.0, han * 0.72 + 1.0)
    maximum_gap = max_allowed_syllable_gap(segment['text'])
    return (
        segment.get('score', 0.0) < MIN_SEGMENT_SCORE
        or segment.get('maxSyllableGap', 0.0) > maximum_gap
        or not min_duration <= duration <= max_duration
    )


def retry_unreliable_segments(emission, ratio, aligner, aligned, tokenized, track_duration):
    """Retry weak whole-track alignments inside adjacent word-anchor bounds."""
    seconds_per_frame = ratio / ALIGN_SAMPLE_RATE
    previous_example_end = {}
    for index, segment in enumerate(aligned):
        if segment.get('kind') != 'example':
            continue

        own_word = next((candidate for candidate in reversed(aligned[:index])
                         if candidate.get('kind') == 'word'
                         and candidate.get('sourceCardId') == segment.get('sourceCardId')),
                        None)
        next_word = next((candidate for candidate in aligned[index + 1:]
                          if candidate.get('kind') == 'word'), None)
        lower = (float(own_word['end']) + 0.04
                 if own_word and own_word.get('end') is not None else
                 max(0.0, float(segment.get('start') or 0.0) - 2.0))
        if segment['sourceCardId'] in previous_example_end:
            lower = max(lower, previous_example_end[segment['sourceCardId']] + 0.10)
        local_upper = segment.get('_localUpper')
        upper = (float(local_upper) - 0.04 if local_upper is not None else
                 float(next_word['start']) - 0.04
                 if next_word and next_word.get('start') is not None else track_duration)

        if not segment_quality_issue(segment):
            previous_example_end[segment['sourceCardId']] = float(segment['end'])
            continue
        if upper - lower < 0.8:
            continue

        first, last = segment['tokenStart'], segment['tokenEnd']
        target_tokens = segment.get('_targetTokens') or tokenized[first:last]
        if not target_tokens:
            continue
        low_frame = max(0, math.floor(lower / seconds_per_frame))
        high_frame = min(emission.size(0), math.ceil(upper / seconds_per_frame))
        syllable_count = segment['syllableCount']
        # Search overlapping phrase-sized windows. CTC confidence then picks
        # the occurrence within the known word-to-word section.
        expected = max(1.6, min(9.0, syllable_count * 0.38 + 0.5))
        window_seconds = sorted({
            max(1.4, min(12.0, expected * scale))
            for scale in (0.8, 1.05, 1.35, 1.7)
        })
        step_frames = max(1, round(0.20 / seconds_per_frame))
        best = None
        for seconds in window_seconds:
            window_frames = max(1, round(seconds / seconds_per_frame))
            if window_frames > high_frame - low_frame:
                continue
            latest_start = high_frame - window_frames
            starts = list(range(low_frame, latest_start + 1, step_frames))
            if not starts or starts[-1] != latest_start:
                starts.append(latest_start)
            for window_start in starts:
                window = emission[window_start:window_start + window_frames]
                spans = aligner(window, target_tokens)
                valid = [span for span in spans if span]
                if len(valid) != len(target_tokens):
                    continue
                states = [state for span in valid for state in span]
                token_bounds = [
                    (min(state.start for state in span), max(state.end for state in span))
                    for span in valid
                ]
                start_frame = window_start + min(state.start for state in states)
                end_frame = window_start + max(state.end for state in states)
                start = start_frame * seconds_per_frame
                end = end_frame * seconds_per_frame
                score = float(np.mean([state.score for state in states]))
                max_gap = max(
                    (max(0, following[0] - previous[1]) * seconds_per_frame
                     for previous, following in zip(token_bounds, token_bounds[1:])),
                    default=0.0,
                )
                han = han_count(segment['text'])
                duration = end - start
                if score < MIN_SEGMENT_SCORE or max_gap > max_allowed_syllable_gap(segment['text']):
                    continue
                if not max(0.30, han * 0.055) <= duration <= max(5.0, han * 0.72 + 1.0):
                    continue
                rank = score - max_gap * 0.04
                if best is None or rank > best['rank']:
                    best = {
                        'start': start, 'end': end, 'score': score,
                        'maxSyllableGap': max_gap, 'rank': rank,
                    }
        if best:
            segment.update({
                'start': best['start'], 'end': best['end'], 'score': best['score'],
                'maxSyllableGap': best['maxSyllableGap'],
                'alignedSyllables': segment['syllableCount'],
                'alignmentMethod': 'local-window',
            })
            print(f"    recovered {segment['exampleId']} at {best['start']:.2f}-{best['end']:.2f}s "
                  f"(score {best['score']:.3f})", flush=True)
        if segment.get('end') is not None:
            previous_example_end[segment['sourceCardId']] = float(segment['end'])


def track_reference(book_id, track, book3_track_index):
    if book_id == 1:
        return track['file'], track['id']
    return book3_track_index['streamUrlPattern'].replace('{FILE_ID}', track['id']), track['id']


def make_audio_entry(book_id, file, score, word_segment, example_segment, next_segment, track_duration):
    start = float(example_segment['start'])
    end = float(example_segment['end'])
    if not math.isfinite(start) or not math.isfinite(end) or end <= start:
        return None, 'invalid alignment bounds'
    han = han_count(example_segment['text'])
    min_duration = max(0.30, han * 0.055)
    max_duration = max(5.0, han * 0.72 + 1.0)
    if example_segment.get('alignedSyllables') != example_segment.get('syllableCount'):
        return None, 'one or more sentence syllables did not align'
    if score < MIN_SEGMENT_SCORE:
        return None, f'alignment confidence {score:.3f} is below {MIN_SEGMENT_SCORE:.2f}'
    maximum_gap = max_allowed_syllable_gap(example_segment['text'])
    if example_segment.get('maxSyllableGap', 0.0) > maximum_gap:
        return None, f"sentence alignment contains a {example_segment['maxSyllableGap']:.2f}s gap"

    # Add a small natural lead/tail while staying clear of the vocabulary
    # headword and the next aligned text segment.
    start = max(0.0, start - 0.06)
    if word_segment and word_segment.get('end') is not None:
        start = max(start, float(word_segment['end']) + 0.04)
    end = min(track_duration, end + 0.14)
    if next_segment and next_segment.get('start') is not None:
        end = min(end, float(next_segment['start']) - 0.03)
    duration = end - start
    if not min_duration <= duration <= max_duration:
        return None, f'implausible sentence duration {duration:.2f}s for {han} Han characters'
    if end - start < min_duration:
        return None, 'padded clip became too short after guarding adjacent audio'

    audio = {
        'voice': 'book', 'file': file,
        'start': round(start, 2), 'end': round(end, 2),
    }
    if book_id == 3:
        audio['cache'] = False
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
    book1_candidates = load_book1_candidates()
    book3_tracks = load_book3_tracks()
    book3_index = json.loads(BOOK3_INDEX.read_text())
    book1_manifest_files = manifest_files(BOOK1_MANIFEST)
    book3_manifest_files = manifest_files(BOOK3_MANIFEST)
    word_cache = {}
    signal_cache = {}
    track_hashes = {}
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
            course_extras = load_book1_course_extras(items) if book_id == 1 else []
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
            aligned, track_duration, emission, ratio = align_segments(
                model, dictionary, aligner, track_path, segments, tokens, device,
            )
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
                    aligned.append({
                        'kind': 'example', 'sourceCardId': extra['sourceCardId'],
                        'exampleId': extra['exampleId'], 'text': extra['text'],
                        'pinyinSource': extra['pinyinSource'], 'tokenStart': 0, 'tokenEnd': 0,
                        'start': 0.0, 'end': 0.0, 'score': 0.0, 'maxSyllableGap': 0.0,
                        'alignedSyllables': 0, 'syllableCount': len(extra_tokens),
                        '_targetTokens': extra_tokens,
                        '_localUpper': next_word.get('start') if next_word else track_duration,
                        '_nextSegment': next_word,
                    })
                retry_unreliable_segments(
                    emission, ratio, aligner, aligned,
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
                next_segment = segment.get('_nextSegment') or next((candidate for candidate in aligned[index + 1:]
                                     if candidate.get('start') is not None), None)
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
                'source': 'book1-r2' if filename.startswith('B1-') else 'official-tku-drive',
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
        if len(entries) != total_assignments or valid_count != total_assignments:
            raise ValueError('Cannot apply: every Book 1 and Book 3 vocabulary example must pass alignment checks.')
        CONTENT_PATH.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + '\n')
        print(f'Applied complete manifest: {CONTENT_PATH}')
    elif valid_count != total_assignments:
        print('Some clips need review; preview mode did not update content/audio/.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'ERROR: {error}', file=sys.stderr)
        sys.exit(1)

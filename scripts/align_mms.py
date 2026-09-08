#!/usr/bin/env python3
"""Forced-align Book 1 reading audio to authored lines at CHARACTER resolution
using MMS (torchaudio.pipelines.MMS_FA), replacing the old Whisper pipeline.

Each line gets per-character onsets; a character's `end` is the NEXT character's
onset (seamless karaoke — a word lights from its first char's onset to the next
word's onset). Divergent recordings surface as low per-char/per-line scores.

Run: output/venv/bin/python scripts/align_mms.py [READING_ID ...]
Writes: content/dialogueAlignment.json, output/mms_alignment_report.json
"""
import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
import torch
from torchaudio.pipelines import MMS_FA as bundle
from pypinyin import lazy_pinyin

ROOT = Path(__file__).resolve().parent.parent
READINGS = json.loads((ROOT / 'output' / 'readings.json').read_text())
AUDIO_DIR = ROOT / 'output' / 'official-audio' / 'book1'
OUT_FILE = ROOT / 'content' / 'dialogueAlignment.json'
REPORT = ROOT / 'output' / 'mms_alignment_report.json'
MANIFEST_PATH = ROOT / 'docs' / 'audio_manifest_book1.json'

CN_DIGITS = '零一二三四五六七八九'
PINYIN_VARIANTS = {
    'shei': 'shui', 'zhei': 'zhe', 'nei': 'na', 'dei': 'de',
    'liao': 'le', 'zhongming': 'zhouming',
}
PUNCT = r'[，。？！、：；“”‘’（）《》〈〉…—\s,.?!:;"\'()\-]'
# Mean char score below this → line marked `unmatched` → client falls back to
# TTS (the recording diverges from the authored text, e.g. number readings).
UNMATCHED_SCORE_THRESHOLD = 0.5


def expand_digits(text: str) -> str:
    def convert(m):
        n = int(m.group(0))
        if n == 0:
            return '零'
        units = ['', '十', '百', '千']
        parts = []
        digits = [int(d) for d in str(n)]
        length = len(digits)
        for i, d in enumerate(digits):
            pos = length - 1 - i
            if d == 0:
                if parts and parts[-1] != '零' and any(x != '零' for x in digits[i + 1:]):
                    parts.append('零')
                continue
            if pos == 1 and d == 1 and not parts:
                parts.append('十')
            else:
                parts.append(CN_DIGITS[d] + units[pos])
        return ''.join(parts)
    return re.sub(r'\d+', convert, text)


def pinyin_syllable(char: str) -> str:
    """Tone-free pinyin for one hanzi, or '' when it is not a spoken syllable."""
    if re.match(PUNCT, char):
        return ''
    p = ''.join(lazy_pinyin(char)).lower()
    for variant, canonical in PINYIN_VARIANTS.items():
        p = p.replace(variant, canonical)
    return p


def normalize_to_syllables(line_text: str):
    """Return list of {charStart, charEnd, pinyin} for spoken syllables.

    Stage directions （…） are unspoken; Arabic digit runs expand to Chinese
    numerals and map back to the run's span; punctuation is skipped.
    """
    syllables = []
    i = 0
    depth = 0
    while i < len(line_text):
        c = line_text[i]
        if c in '（(':
            depth += 1
            i += 1
            continue
        if c in '）)':
            depth = max(0, depth - 1)
            i += 1
            continue
        if depth > 0:
            i += 1
            continue
        if c.isdigit():
            j = i
            while j < len(line_text) and line_text[j].isdigit():
                j += 1
            for nc in expand_digits(line_text[i:j]):
                syl = pinyin_syllable(nc)
                if syl:
                    syllables.append({'charStart': i, 'charEnd': j, 'pinyin': syl})
            i = j
            continue
        syl = pinyin_syllable(c)
        if syl:
            syllables.append({'charStart': i, 'charEnd': i + 1, 'pinyin': syl})
        i += 1
    return syllables


def pinyinize(text: str) -> str:
    """Tone-free pinyin for a whole string (for matching Whisper transcripts)."""
    text = re.sub(r'[（(][^）)]*[）)]', '', text)
    text = re.sub(r'[兒儿]', '', text)
    text = expand_digits(text)
    plain = re.sub(r'[^a-z]', '', ''.join(lazy_pinyin(text)).lower())
    for variant, canonical in PINYIN_VARIANTS.items():
        plain = plain.replace(variant, canonical)
    return plain


def find_reading_onset_whisper(audio_path, line1_text, whisper_model):
    """Onset (seconds) of line 1 on an un-trimmed track that opens with a spoken
    title: transcribe with Whisper and match line 1's pinyin prefix against the
    transcript. Returns 0.0 when no match is found (align the whole track)."""
    if whisper_model is None or not line1_text:
        return 0.0
    needle = pinyinize(line1_text)
    if not needle:
        return 0.0
    prefix = needle[:6]
    for seg in whisper_model.transcribe(str(audio_path)):
        text = (seg.text or '').strip()
        if not text:
            continue
        p = pinyinize(text)
        idx = p.find(prefix) if prefix else -1
        if idx == -1 and len(needle) >= 4:
            idx = p.find(needle[:4])
        if idx != -1:
            frac = idx / max(1, len(p))
            return seg.t0 / 100.0 + frac * (seg.t1 - seg.t0) / 100.0
    return 0.0


def decode_audio(path: Path):
    """Decode via the ffmpeg CLI (torchaudio.load's torchcodec backend needs
    FFmpeg shared libs that aren't present here). Returns (waveform, seconds)."""
    raw = subprocess.run(
        ['ffmpeg', '-v', 'quiet', '-i', str(path),
         '-f', 's16le', '-ac', '1', '-ar', str(bundle.sample_rate), '-'],
        capture_output=True).stdout
    samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    waveform = torch.from_numpy(samples).unsqueeze(0)  # (1, N)
    return waveform, waveform.size(1) / bundle.sample_rate


def align_reading(model, dictionary, aligner, reading, whisper_model=None, untrimmed=False):
    """Return (top_level_dict, report_lines) for one reading."""
    words = []    # pinyin per spoken syllable (global order)
    meta = []     # (lineIdx, charStart, charEnd) parallel to words
    for li, line in enumerate(reading['lines']):
        for s in normalize_to_syllables(line['traditional']):
            words.append(s['pinyin'])
            meta.append((li, s['charStart'], s['charEnd']))

    # Empty template lines -> mark every line unmatched.
    if not words:
        lines = [{
            'index': li, 'speaker': line.get('speaker', ''),
            'text': line['traditional'], 'start': 0, 'end': 0,
            'chars': [], 'words': [], 'unmatched': True,
        } for li, line in enumerate(reading['lines'])]
        return {
            'audioFile': reading['audioFile'],
            'lessonId': reading['lessonId'],
            'dialogueNumber': reading['dialogueNumber'],
            'lines': lines,
        }, []

    waveform, track_sec = decode_audio(AUDIO_DIR / reading['audioFile'])
    onset_sec = 0.0
    if untrimmed:
        onset_sec = find_reading_onset_whisper(
            AUDIO_DIR / reading['audioFile'],
            reading['lines'][0]['traditional'],
            whisper_model,
        )
        if onset_sec > 0:
            onset_samples = int(onset_sec * bundle.sample_rate)
            waveform = waveform[:, onset_samples:]
            track_sec = waveform.size(1) / bundle.sample_rate  # sliced duration
    with torch.inference_mode():
        emission, _ = model(waveform)
    emission = emission[0]  # (frames, tokens)
    ratio = waveform.size(1) / emission.size(0)  # samples per frame

    def to_sec(frame):
        return frame * ratio / bundle.sample_rate

    tokenized = [[dictionary[c] for c in w if c in dictionary] for w in words]
    spans = aligner(emission, tokenized)

    # Per-syllable onset + mean score.
    onsets = [None] * len(words)
    scores = [None] * len(words)
    for i, wspan in enumerate(spans):
        if wspan:
            onsets[i] = to_sec(wspan[0].start)
            scores[i] = float(np.mean([s.score for s in wspan]))

    # Effective end = next syllable's onset (global); last -> track end.
    next_onset = [track_sec] * len(words)
    for i in range(len(words) - 1):
        for j in range(i + 1, len(words)):
            if onsets[j] is not None:
                next_onset[i] = onsets[j]
                break

    # Times are relative to the (possibly sliced) waveform; shift back to the
    # full hosted file so the app can seek against it directly.
    if onset_sec:
        onsets = [None if o is None else o + onset_sec for o in onsets]
        next_onset = [n + onset_sec for n in next_onset]

    by_line = defaultdict(list)
    for gi, (li, cs, ce) in enumerate(meta):
        if onsets[gi] is None:
            continue
        by_line[li].append({
            'charStart': cs, 'charEnd': ce,
            'start': round(onsets[gi], 2),
            'end': round(next_onset[gi], 2),
            'score': round(scores[gi], 3),
        })

    lines = []
    report = []
    for li, line in enumerate(reading['lines']):
        chars = by_line.get(li, [])
        mean_score = float(np.mean([c['score'] for c in chars])) if chars else 0.0
        starts = [c['start'] for c in chars]
        ends = [c['end'] for c in chars]
        lines.append({
            'index': li,
            'speaker': line.get('speaker', ''),
            'text': line['traditional'],
            'start': round(min(starts), 2) if starts else 0,
            'end': round(max(ends), 2) if ends else 0,
            'score': round(mean_score, 3),
            'chars': chars,
            'words': [],
            'unmatched': not chars or mean_score < UNMATCHED_SCORE_THRESHOLD,
        })
        report.append({
            'readingId': reading['id'], 'lineIndex': li,
            'text': line['traditional'], 'chars': len(chars),
            'meanScore': round(mean_score, 3),
        })

    return {
        'audioFile': reading['audioFile'],
        'lessonId': reading['lessonId'],
        'dialogueNumber': reading['dialogueNumber'],
        'lines': lines,
    }, report


def main():
    only = set(sys.argv[1:]) if len(sys.argv) > 1 else None
    model = bundle.get_model()
    dictionary = bundle.get_dict()
    aligner = bundle.get_aligner()

    trim_by_file = {
        f['file']: f.get('trimmedIntroSec', 0)
        for f in json.loads(MANIFEST_PATH.read_text())['files']
    }
    # Whisper is only needed to find line-1 onset for un-trimmed 短文 tracks.
    needs_whisper = any(
        (not only or r['id'] in only) and not trim_by_file.get(r['audioFile'])
        for r in READINGS
    )
    whisper_model = None
    if needs_whisper:
        from pywhispercpp.model import Model
        whisper_model = Model('large-v3-turbo',
                              models_dir=str(ROOT / 'output' / 'whisper-models'),
                              language='zh')
    out = {}
    report = []
    for reading in READINGS:
        rid = reading['id']
        if only and rid not in only:
            continue
        top, rep = align_reading(
            model, dictionary, aligner, reading,
            whisper_model=whisper_model,
            untrimmed=not trim_by_file.get(reading['audioFile']),
        )
        top['trimSec'] = round(trim_by_file.get(reading['audioFile']) or 0, 2)
        out[rid] = top
        report.extend(rep)
        n_bad = sum(1 for l in top['lines'] if l.get('unmatched'))
        print(f"{rid}: {len(reading['lines'])} lines, "
              f"{sum(len(l['chars']) for l in top['lines'])} chars, "
              f"{n_bad} unmatched, "
              f"min line score {min((l['score'] for l in top['lines']), default=0):.3f}")

    OUT_FILE.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(f'wrote {OUT_FILE} ({len(out)} readings)')
    print(f'wrote {REPORT} ({len(report)} lines)')
    # Summarize lowest-scoring lines for review.
    low = sorted(report, key=lambda r: r['meanScore'])[:10]
    print('--- lowest-scoring lines (review for unmatched/divergence) ---')
    for r in low:
        print(f"  {r['readingId']} L{r['lineIndex']} score={r['meanScore']} "
              f"chars={r['chars']} :: {r['text'][:24]}")


if __name__ == '__main__':
    main()

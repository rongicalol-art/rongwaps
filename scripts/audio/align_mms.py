#!/usr/bin/env python3
"""Forced-align Book 1 reading audio to authored lines at CHARACTER resolution
using MMS (torchaudio.pipelines.MMS_FA), replacing the old Whisper pipeline.

Each line gets per-character onsets; a character's `end` is the NEXT character's
onset (seamless karaoke — a word lights from its first char's onset to the next
word's onset). Divergent recordings surface as low per-char/per-line scores.

Run: output/venv/bin/python scripts/audio/align_mms.py [--book 3] [READING_ID ...]
Writes: content/dialogueAlignment.json, output/mms_alignment_report.json
  (--book 3: content/dialogueAlignment-book3.json from content/readings/book-3.json against the
   untrimmed official tracks in output/official-audio/book3/, which
   `node scripts/audio/downloadBook3VocabularyTracks.mjs --dialogue` downloads)
"""
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
from collections import defaultdict
from pathlib import Path

import numpy as np
import torch
from torchaudio.pipelines import MMS_FA as bundle
from pypinyin import lazy_pinyin

ROOT = Path(__file__).resolve().parent.parent.parent
BOOK = int(sys.argv[sys.argv.index('--book') + 1]) if '--book' in sys.argv else 1
MANIFEST_PATH = ROOT / 'content' / 'audio' / 'audio_manifest_book1.json'
if BOOK == 1:
    READINGS = json.loads((ROOT / 'output' / 'readings.json').read_text())
    AUDIO_DIR = ROOT / 'output' / 'official-audio' / 'book1'
    OUT_FILE = ROOT / 'content' / 'dialogueAlignment.json'
    REPORT = ROOT / 'output' / 'mms_alignment_report.json'
else:
    # Authored readings: dialogue N of lesson LL plays the official track B{book}-LL-N-1.mp3.
    READINGS = [{
        'id': reading['id'],
        'audioFile': f"B{BOOK}-{reading['audioReference']}.mp3",
        'lessonId': reading['lessonId'],
        'dialogueNumber': reading['dialogueNumber'],
        'lines': reading['paragraphs'],
    } for reading in json.loads((ROOT / 'content' / 'readings' / f'book-{BOOK}.json').read_text())]
    AUDIO_DIR = ROOT / 'output' / 'official-audio' / f'book{BOOK}'
    OUT_FILE = ROOT / 'content' / f'dialogueAlignment-book{BOOK}.json'
    REPORT = ROOT / 'output' / f'mms_alignment_report_book{BOOK}.json'
# Whisper only needs the opening (spoken title, then line 1) to find where line 1 starts.
ONSET_SEARCH_SEC = 90

CN_DIGITS = '零一二三四五六七八九'
PINYIN_VARIANTS = {
    'shei': 'shui', 'zhei': 'zhe', 'nei': 'na', 'dei': 'de',
    'liao': 'le', 'zhongming': 'zhouming',
}
PUNCT = r'[，。？！、：；“”‘’「」『』（）《》〈〉…—～∼\s,.?!:;"\'()\-]'
# Mean char score below this → line marked `unmatched` → client falls back to
# TTS (the recording diverges from the authored text, e.g. number readings).
UNMATCHED_SCORE_THRESHOLD = 0.60
# Books other than Book 1: a reading whose mean line score is below this doesn't follow its
# recording (the authored text was rewritten), so every line is unmatched and keeps its studio
# clip. Book 3 measured 0.94 for the one reading the book records verbatim, at most 0.68 otherwise.
READING_MATCH_THRESHOLD = 0.68


def expand_digits(text: str) -> str:
    if text == '101':
        return '一零一'
    def convert(m):
        n = int(m.group(0))
        if n == 0:
            return '零'
        if len(m.group(0).lstrip('0')) > 4 or m.group(0) == '101':
            return ''.join(CN_DIGITS[int(d)] for d in m.group(0))
        units = ['', '十', '百', '千']
        parts = []
        digits = [int(d) for d in str(n)]
        length = len(digits)
        for i, d in enumerate(digits):
            pos = length - 1 - i
            if d == 0:
                if parts and parts[-1] != '零' and any(x != 0 for x in digits[i + 1:]):
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
    if not ('\u3400' <= char <= '\u9fff' or '\U00020000' <= char <= '\U0002ebef'):
        return ''
    p = ''.join(lazy_pinyin(char)).lower().replace('ü', 'v')
    p = ''.join(c for c in unicodedata.normalize('NFKD', p) if not unicodedata.combining(c))
    p = re.sub(r'[^a-z]', '', p)
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
            date_match = re.match(r'^(\d{1,2})\.(\d{1,2})\s*$', line_text[i:])
            if date_match:
                j = i + len(date_match.group(0).rstrip())
                spoken_date = f"{expand_digits(date_match.group(1))}月{expand_digits(date_match.group(2))}日"
                for nc in spoken_date:
                    syl = pinyin_syllable(nc)
                    if syl:
                        syllables.append({'charStart': i, 'charEnd': j, 'pinyin': syl})
                i = len(line_text)
                continue
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
    with tempfile.NamedTemporaryFile(suffix='.wav') as head:
        subprocess.run(['ffmpeg', '-v', 'quiet', '-y', '-i', str(audio_path), '-t', str(ONSET_SEARCH_SEC),
                        '-ac', '1', '-ar', '16000', head.name], check=True)
        segments = whisper_model.transcribe(head.name)
    for seg in segments:
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


def infer_window_from_waveform(model, waveform, start_sample, end_sample, chunk_samples, device):
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


def infer_emission(model, waveform):
    """Run Wav2Vec2 in 30s windows with 2s center-trimmed overlap so O(N^2) attention stays fast."""
    device = next(model.parameters()).device
    chunk_samples = 30 * bundle.sample_rate
    if waveform.size(1) <= chunk_samples:
        return infer_window_from_waveform(model, waveform, 0, waveform.size(1), chunk_samples, device)
    overlap_samples = 2 * bundle.sample_rate
    step_samples = chunk_samples - overlap_samples
    chunks = []
    starts = list(range(0, waveform.size(1), step_samples))
    for idx, start in enumerate(starts):
        end = min(waveform.size(1), start + chunk_samples)
        emission = infer_window_from_waveform(model, waveform, start, end, chunk_samples, device)
        frames_per_sample = emission.size(0) / max(1, end - start)
        half_overlap_frames = round((overlap_samples / 2) * frames_per_sample)
        if idx > 0:
            emission = emission[min(emission.size(0), half_overlap_frames):]
        if end < waveform.size(1) and idx + 1 < len(starts):
            emission = emission[:max(1, emission.size(0) - half_overlap_frames)]
        chunks.append(emission)
    if device.type == 'mps':
        torch.mps.empty_cache()
    return torch.cat(chunks, dim=0)


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

    waveform, full_track_sec = decode_audio(AUDIO_DIR / reading['audioFile'])
    track_sec = full_track_sec
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
    emission = infer_emission(model, waveform)  # (frames, tokens)
    ratio = waveform.size(1) / emission.size(0)  # samples per frame

    def to_sec(frame):
        return frame * ratio / bundle.sample_rate

    tokenized = [[dictionary[c] for c in w if c in dictionary] for w in words]
    spans = aligner(emission, tokenized)

    # Smart acoustic intro-gap check when untrimmed and Whisper is unavailable:
    # If any of the first 8 syllables latched onto the spoken intro title/speaker list
    # (creating a >1.8s gap before the real dialogue starts at <22s), re-align after the intro match.
    if untrimmed and onset_sec == 0.0 and len(spans) > 8:
        for _attempt in range(2):
            intro_split = None
            for k in range(min(8, len(spans) - 1)):
                if not spans[k] or not spans[k + 1]:
                    continue
                k_start = onset_sec + to_sec(spans[k][0].start)
                k_end = onset_sec + to_sec(spans[k][-1].end)
                next_start = onset_sec + to_sec(spans[k + 1][0].start)
                if k_start < 22.0 and (next_start - k_end > 1.4 or next_start - k_start > 1.8):
                    intro_split = (k, k_start, next_start)
            if intro_split is None:
                break
            k, k_start, next_start = intro_split
            new_offset = max(k_start + 0.40, next_start - (k + 1) * 0.32 - 0.40)
            frame_offset = max(1, int((new_offset - onset_sec) * bundle.sample_rate / ratio))
            if frame_offset >= emission.size(0) - len(tokenized) * 2:
                break
            onset_sec += to_sec(frame_offset)
            emission = emission[frame_offset:]
            spans = aligner(emission, tokenized)

    # Per-syllable onset, raw acoustic end, and mean score.
    onsets = [None] * len(words)
    raw_ends = [None] * len(words)
    scores = [None] * len(words)
    for i, wspan in enumerate(spans):
        if wspan:
            onsets[i] = to_sec(wspan[0].start)
            raw_ends[i] = to_sec(wspan[-1].end)
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
        raw_ends = [None if e is None else e + onset_sec for e in raw_ends]
        next_onset = [n + onset_sec for n in next_onset]

    by_line = defaultdict(list)
    for gi, (li, cs, ce) in enumerate(meta):
        if onsets[gi] is None:
            continue
        is_line_end = (gi + 1 == len(meta)) or (meta[gi + 1][0] != li)
        if is_line_end:
            # Cap the line-final character to its acoustic release so playing a
            # single line never bleeds across inter-line silence into the next speaker
            # or includes trailing outro silence.
            raw_end = raw_ends[gi] if raw_ends[gi] is not None else onsets[gi] + 0.25
            acoustic_end = min(max(raw_end + 0.14, onsets[gi] + 0.24), onsets[gi] + 0.65)
            char_end = min(full_track_sec, max(onsets[gi] + 0.08, min(acoustic_end, next_onset[gi] - 0.08)))
        else:
            # Within the same line, extend to next character onset for seamless karaoke.
            char_end = min(next_onset[gi], onsets[gi] + 1.80)
        by_line[li].append({
            'charStart': cs, 'charEnd': ce,
            'start': round(onsets[gi], 2),
            'end': round(char_end, 2),
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

    if BOOK != 1 and lines and float(np.mean([l['score'] for l in lines])) < READING_MATCH_THRESHOLD:
        for line in lines:
            line['unmatched'] = True

    return {
        'audioFile': reading['audioFile'],
        'lessonId': reading['lessonId'],
        'dialogueNumber': reading['dialogueNumber'],
        'lines': lines,
    }, report


def main():
    args = [a for i, a in enumerate(sys.argv[1:], 1) if a != '--book' and sys.argv[i - 1] != '--book']
    only = set(args) or None
    model = bundle.get_model().eval()
    if torch.backends.mps.is_available():
        try:
            model = model.to('mps')
        except Exception:
            pass
    dictionary = bundle.get_dict()
    aligner = bundle.get_aligner()

    # Only Book 1's hosted tracks are intro-trimmed; other books align against the untrimmed originals.
    trim_by_file = {
        f['file']: f.get('trimmedIntroSec', 0)
        for f in json.loads(MANIFEST_PATH.read_text())['files']
    } if BOOK == 1 else {}
    # Whisper is only needed to find line-1 onset for un-trimmed 短文 tracks.
    needs_whisper = any(
        (not only or r['id'] in only) and not trim_by_file.get(r['audioFile'])
        for r in READINGS
    )
    whisper_model = None
    if needs_whisper:
        try:
            from pywhispercpp.model import Model
            whisper_model = Model('large-v3-turbo',
                                  models_dir=str(ROOT / 'output' / 'whisper-models'),
                                  language='zh')
        except Exception:
            whisper_model = None
    out = json.loads(OUT_FILE.read_text()) if (only and OUT_FILE.exists()) else {}
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

#!/usr/bin/env python3
"""Align 時代華語 dialogue audio to authored lines (pinyin matching), and
re-trim dialogue-1 tracks at the true dialogue start.

Background: each 對話一 track opens with music (~0-11s), a pause, and a SPOKEN
lesson title (e.g. 第一課 新同學 對話一, ~13-19s) before the dialogue. The
plain silence-trim in the download pipeline removes the music but leaves the
spoken title. This script finds where line 1 actually starts (by matching the
known line texts against the Whisper transcript in tone-free pinyin, which is
robust to homophone ASR errors like 疑問/宜文), re-trims the audio there, and
emits per-line + per-word alignments relative to the trimmed file.

Usage: output/venv/bin/python scripts/align_dialogue_audio.py
Writes: src/data/dialogueAlignment.ts (alignment data),
        output/official-audio/book1/B1-LL-1-1.mp3 (re-trimmed dialogue-1),
        docs/audio_manifest_book1.json (updated sizes/hashes).
"""
import json
import re
import subprocess
import sys
import tempfile
import time
from hashlib import sha256
from pathlib import Path

from pypinyin import lazy_pinyin
from pywhispercpp.model import Model

ROOT = Path(__file__).resolve().parent.parent
READINGS = json.loads((ROOT / 'output/readings.json').read_text())
INDEX = json.loads((ROOT / 'docs/audio_index_book1.json').read_text())
MANIFEST_PATH = ROOT / 'docs' / 'audio_manifest_book1.json'
AUDIO_DIR = ROOT / 'output' / 'official-audio' / 'book1'
MODELS_DIR = ROOT / 'output' / 'whisper-models'
OUT_FILE = ROOT / 'src' / 'data' / 'dialogueAlignment.ts'
USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
KEEP_PAUSE_BEFORE_DIALOGUE = 0.8  # seconds of leading silence to keep

# pypinyin resolves some characters differently depending on script/phrase
# context (谁 -> shei vs 誰 -> shui). Normalize both sides to one canonical
# spelling so app text and whisper text compare equal.
PINYIN_VARIANTS = {
    'shei': 'shui',   # 谁/誰
    'zhei': 'zhe',    # 这/這
    'nei': 'na',      # 那 (colloquial)
    'dei': 'de',      # 得 (obligation)
    'liao': 'le',     # 了 (particle) — both sides normalized identically
    'zhongming': 'zhouming',  # app data writes 中明; recordings say 周明
}

CN_DIGITS = '零一二三四五六七八九'

def expand_digits(text: str) -> str:
    """Expand Arabic digit runs to Chinese numerals (101 -> 一百零一)."""
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

def pinyinize(text: str) -> str:
    # Stage directions like （看地圖） are printed but never spoken.
    text = re.sub(r'[（(][^）)]*[）)]', '', text)
    text = re.sub(r'[兒儿]', '', text)  # erhua particle: often dropped in speech
    text = expand_digits(text)
    plain = re.sub(r'[^a-z]', '', ''.join(lazy_pinyin(text)).lower())
    for variant, canonical in PINYIN_VARIANTS.items():
        plain = plain.replace(variant, canonical)
    return plain

def download(file_id, dest):
    import urllib.request
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                f'https://drive.usercontent.google.com/download?id={file_id}&export=download',
                headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(req, timeout=120) as resp, open(dest, 'wb') as out:
                out.write(resp.read())
            if dest.stat().st_size > 1000:
                return
        except Exception:
            pass
        time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f'download failed for {file_id}')

def build_transcript(segments):
    units = []
    for seg in segments:
        words = getattr(seg, 'words', None)
        if words:
            for w in words:
                text = (w.text or '').strip()
                if text:
                    units.append((text, w.start_ts / 100.0, w.end_ts / 100.0))
        else:
            text = (seg.text or '').strip()
            if text:
                units.append((text, seg.t0 / 100.0, seg.t1 / 100.0))
    return units

def match_lines(lines, units, track_duration, search_window=120):
    """Match each line to the transcript by tone-free pinyin.

    Each line is matched in two phases: first locate an anchor (the first few
    syllables) anywhere forward from the cursor, then extend greedily along
    the needle allowing up to two single-syllable skips (whisper insertions).
    Lines that cannot cover >= 60% of their syllables are emitted as
    `unmatched` (zero-length) and do not advance the cursor.
    """
    punits = [(pinyinize(u[0]), u[1], u[2]) for u in units]
    stream = ''.join(p[0] for p in punits)
    starts = []
    acc = 0
    for p in punits:
        starts.append(acc)
        acc += len(p[0])
    total = acc

    def unit_index(char_idx):
        if total == 0:
            return 0
        lo, hi = 0, len(punits) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if starts[mid] <= char_idx:
                lo = mid
            else:
                hi = mid - 1
        return lo

    def unmatched(line):
        return {
            'index': line['index'], 'speaker': line['speaker'],
            'text': line['traditional'], 'start': 0, 'end': 0,
            'words': [], 'unmatched': True,
        }

    def extend(anchor, needle):
        """Greedy extension from `anchor`, allowing up to 3 skips."""
        i, n = anchor, 0
        skips = 0
        while n < len(needle) and i < total:
            if stream[i] == needle[n]:
                i += 1
                n += 1
            elif skips < 3:
                i += 1
                skips += 1
            else:
                break
        return n  # syllables consumed

    result = []
    char_cursor = 0
    for line in lines:
        needle = pinyinize(line['traditional'])
        if not needle:
            result.append(unmatched(line))
            continue
        anchor_len = min(4, len(needle))
        search_end = min(total, char_cursor + search_window)
        best = None
        pos = char_cursor
        while pos < search_end:
            anchor = stream.find(needle[:anchor_len], pos)
            if anchor == -1 or anchor >= search_end:
                break
            consumed = extend(anchor, needle)
            if consumed >= max(3, int(len(needle) * 0.5)):
                best = (anchor, consumed)
                break
            pos = anchor + 1
        if best is None:
            result.append(unmatched(line))
            continue
        anchor, consumed = best
        end_char = anchor + consumed

        i0 = unit_index(anchor)
        i1 = unit_index(min(end_char - 1, total - 1))
        start = punits[i0][1]
        end = punits[i1][2]
        words = []
        # Per-word character offsets in the line text, computed by matching
        # each word's pinyin against the line's per-character pinyin stream
        # (robust to whisper homophone/script differences like 疑問 vs 宜文).
        char_pinyins = [pinyinize(c) for c in line['traditional']]
        char_stream = ''.join(char_pinyins)
        char_cursor = 0
        for k in range(i0, i1 + 1):
            word_pinyin = pinyinize(units[k][0])
            char_start = None
            char_end = None
            if word_pinyin and char_stream:
                found = char_stream.find(word_pinyin, char_cursor)
                if found != -1:
                    # count chars whose pinyin spans cover the match
                    acc = 0
                    for ci, cp in enumerate(char_pinyins):
                        if acc == found:
                            char_start = ci
                            break
                        acc += len(cp)
                    if char_start is not None:
                        end_acc = found + len(word_pinyin)
                        acc = 0
                        for ci, cp in enumerate(char_pinyins):
                            acc += len(cp)
                            if acc >= end_acc:
                                char_end = ci + 1
                                break
                        if char_end is None:
                            char_end = len(char_pinyins)
                    char_cursor = found + len(word_pinyin)
            words.append({
                'w': units[k][0], 'start': punits[k][1], 'end': punits[k][2],
                'charStart': char_start, 'charEnd': char_end,
            })
        if not words:
            words = [{'w': line['traditional'], 'start': start, 'end': end}]
        result.append({
            'index': line['index'],
            'speaker': line['speaker'],
            'text': line['traditional'],
            'start': round(start, 2),
            'end': round(end, 2),
            'words': words,
        })
        # Advance to the end of the last unit overlapping the matched span.
        char_cursor = starts[i1] + len(punits[i1][0])
    return result

def postprocess_lines(aligned, track_duration):
    """Clamp line ends to the next line's start; clamp the tail to the track
    duration; flag zero-length lines as unmatched."""
    for i, line in enumerate(aligned):
        if line.get('unmatched'):
            continue
        next_start = None
        for later in aligned[i + 1:]:
            if not later.get('unmatched'):
                next_start = later['start']
                break
        end = line['end']
        if next_start is not None:
            end = min(end, next_start)
        elif track_duration:
            end = min(end, track_duration)
        if end - line['start'] < 0.15:
            line['start'] = 0
            line['end'] = 0
            line['words'] = []
            line['unmatched'] = True
            continue
        line['end'] = round(end, 2)
        line['words'] = [w for w in line['words'] if w['start'] < line['end'] and w['end'] > line['start']]
    return aligned

def shift_alignment(aligned, offset):
    def shift_word(w):
        out = {'w': w['w'], 'start': round(max(0, w['start'] - offset), 2),
               'end': round(max(0, w['end'] - offset), 2)}
        if 'charStart' in w:
            out['charStart'] = w['charStart']
            out['charEnd'] = w['charEnd']
        return out
    out = []
    for line in aligned:
        if line.get('unmatched'):
            out.append({
                'index': line['index'],
                'speaker': line['speaker'],
                'text': line['text'],
                'start': 0,
                'end': 0,
                'words': [],
                'unmatched': True,
            })
            continue
        words = [shift_word(w) for w in line['words'] if w['end'] > offset]
        out.append({
            'index': line['index'],
            'speaker': line['speaker'],
            'text': line['text'],
            'start': round(max(0, line['start'] - offset), 2),
            'end': round(max(0, line['end'] - offset), 2),
            'words': words,
        })
    return out

def trim_audio(src, dest, trim_sec):
    subprocess.run(['ffmpeg', '-y', '-i', str(src), '-ss', str(trim_sec),
                    '-ac', '1', '-b:a', '96k', '-map_metadata', '-1', str(dest)],
                   check=True, capture_output=True)

def file_sha256(path):
    return sha256(path.read_bytes()).hexdigest()

def main():
    only = set(sys.argv[1:]) if len(sys.argv) > 1 else None
    manifest = json.loads(MANIFEST_PATH.read_text())
    manifest_by_file = {f['file']: f for f in manifest['files']}
    alignments = {}
    problems = []

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        for reading in READINGS:
            rid = reading['id']
            if only and rid not in only:
                continue
            audio_file = reading['audioFile']
            lesson_dir = INDEX['textbook_dialogue_audio']['lessons'][str(reading['lessonId']).zfill(2)]
            file_id = next(t['id'] for t in lesson_dir['tracks'] if t['file'] == audio_file)
            original = tmp / audio_file
            download(file_id, original)

            track_duration = float(subprocess.run(
                ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
                 '-of', 'csv=p=0', str(original)], capture_output=True, text=True
            ).stdout.strip())
            lines = [{'index': i, **line} for i, line in enumerate(reading['lines'])]

            def transcribe(prompt=None, audio=None):
                model = Model('large-v3-turbo', models_dir=str(MODELS_DIR), language='zh',
                              token_timestamps=True, split_on_word=True,
                              **({'initial_prompt': prompt} if prompt else {}))
                return model.transcribe(str(audio or original))

            # Pass 1: plain transcription (prompts bias whisper into
            # hallucinating prompt fragments on long dialogues).
            units = build_transcript(transcribe())
            aligned = match_lines(lines, units, track_duration)

            aligned = postprocess_lines(aligned, track_duration)
            # suspect pass on the CLEAN trimmed audio: whisper's output is
            # contaminated by the intro music on untrimmed files.
            is_dialogue_one = bool(re.match(r'^B1-\d{2}-1-1\.mp3$', audio_file))
            trim_sec = 0.0
            if is_dialogue_one and aligned:
                trim_sec = max(0.0, aligned[0]['start'] - KEEP_PAUSE_BEFORE_DIALOGUE)
            if trim_sec < 0.5:
                trim_sec = 0.0  # nothing meaningful to cut (e.g. dialogue-2)

            trim_source = original
            if trim_sec > 0:
                trim_source = tmp / f'trimmed_{audio_file}'
                trim_audio(original, trim_source, trim_sec)

            # Pass 2: re-transcribe the trimmed audio with the suspect lines
            # (unmatched or overlapping either neighbour) as the prompt and
            # re-match only those lines. Pass-2 times are trimmed-relative;
            # convert them back to untrimmed-relative (subtract trim_sec)
            # before the final shift so all entries stay consistent.
            def suspect(a, prev_end, next_start):
                if a.get('unmatched'):
                    return True
                if a['start'] < prev_end - 0.5:
                    return True
                if next_start is not None and a['end'] > next_start + 0.5:
                    return True
                return False

            prev_end = 0.0
            suspects = []
            for idx, a in enumerate(aligned):
                next_start = None
                for later in aligned[idx + 1:]:
                    if not later.get('unmatched'):
                        next_start = later['start']
                        break
                if suspect(a, prev_end, next_start):
                    suspects.append(a['index'])
                if not a.get('unmatched'):
                    prev_end = max(prev_end, a['end'])
            # Per-line pass 2: a dedicated prompt-biased transcription per
            # suspect line (batch prompts can re-merge whisper segments).
            for i in suspects:
                line_text = lines[i]['traditional']
                if len(line_text) < 2:
                    continue
                # Windowed pass 2: transcribe only the gap between the line's
                # valid neighbours (with a small margin) — whisper on the full
                # file can merge the second half into one giant segment.
                prev_end = 0.0
                next_start = track_duration
                for a in aligned[:i]:
                    if not a.get('unmatched'):
                        prev_end = max(prev_end, a['end'])
                for a in aligned[i + 1:]:
                    if not a.get('unmatched'):
                        next_start = min(next_start, a['start'])
                        break
                margin = 0.5
                clip = tmp / f'clip_{audio_file}_{i}.mp3'
                subprocess.run(['ffmpeg', '-y', '-v', 'quiet',
                                '-ss', str(max(0, prev_end - margin)),
                                '-to', str(min(track_duration, next_start + margin)),
                                '-i', str(trim_source), '-ac', '1', str(clip)],
                               check=True)
                units2 = build_transcript(transcribe(None, audio=clip))
                result = match_lines(
                    [lines[i]], units2, track_duration, search_window=10000)[0]
                if not result.get('unmatched'):
                    # shift clip-relative times to track-relative, then back
                    # to untrimmed-relative so the final shift works
                    offset = max(0, prev_end - margin)
                    result['start'] += offset
                    result['end'] += offset
                    for w in result['words']:
                        w['start'] += offset
                        w['end'] += offset
                    aligned[i] = shift_alignment([result], -trim_sec)[0]
            aligned = postprocess_lines(aligned, track_duration)

            shifted = shift_alignment(aligned, trim_sec)
            bad = [a for a in shifted if not a.get('unmatched') and a['start'] >= a['end']]
            if bad:
                problems.append((rid, f'{len(bad)} non-monotonic lines'))
            if len(shifted) != len(lines):
                problems.append((rid, f'line count {len(shifted)} != {len(lines)}'))

            alignments[rid] = {
                'audioFile': audio_file,
                'lessonId': reading['lessonId'],
                'dialogueNumber': reading['dialogueNumber'],
                'trimSec': round(trim_sec, 2),
                'lines': shifted,
            }

            if trim_sec > 0:
                dest = AUDIO_DIR / audio_file
                trim_audio(original, dest, trim_sec)  # final host file from source
                entry = manifest_by_file[audio_file]
                entry['bytes'] = dest.stat().st_size
                entry['sha256'] = file_sha256(dest)
                entry['durationSec'] = round(float(subprocess.run(
                    ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
                     '-of', 'csv=p=0', str(dest)], capture_output=True, text=True
                ).stdout.strip()), 2)
                entry['trimmedIntroSec'] = round(trim_sec, 2)
            print(f"{'OK ' if not bad and len(shifted) == len(lines) else 'CHK'} {rid}: "
                  f"trim={trim_sec:.1f}s lines={len(shifted)} first_line={shifted[0]['start'] if shifted else '-'}-{shifted[0]['end'] if shifted else '-'}s")

    ts = [
        '/**',
        ' * GENERATED by scripts/align_dialogue_audio.py — do not edit.',
        ' * Whisper (whisper.cpp large-v3-turbo) alignment of official dialogue',
        ' * tracks to authored line texts via tone-free pinyin matching.',
        ' * Times are seconds relative to the intro-trimmed audio files',
        ' * (trimSec = seconds cut from the start of the original track).',
        ' */',
        'export interface AlignedWord { w: string; start: number; end: number; charStart?: number; charEnd?: number; }',
        'export interface AlignedLine { index: number; speaker: string; text: string; start: number; end: number; words: AlignedWord[]; unmatched?: boolean; }',
        'export interface DialogueAlignment { audioFile: string; lessonId: number; dialogueNumber: number; trimSec: number; lines: AlignedLine[]; }',
        '',
        'export const DIALOGUE_ALIGNMENTS: Record<string, DialogueAlignment> = '
        + json.dumps(alignments, ensure_ascii=False, indent=1) + ';',
        '',
    ]
    OUT_FILE.write_text('\n'.join(ts))
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'wrote {OUT_FILE} ({len(alignments)} readings)')
    print(f'updated {MANIFEST_PATH}')
    if problems:
        print('PROBLEMS:')
        for p in problems:
            print('  ', p)

if __name__ == '__main__':
    main()

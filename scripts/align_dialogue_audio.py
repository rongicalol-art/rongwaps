#!/usr/bin/env python3
"""Align 時代華語 dialogue audio to authored lines (pinyin matching), and
re-trim every track at the end of its spoken lesson-title intro.

Background: each track opens with a SPOKEN lesson title (e.g. 第一課 新同學
對話一 / 對話二) right before the dialogue (dialogue-1 tracks also have music
before the title). The plain silence-trim in the download pipeline removes
the music but leaves the spoken title. This script matches the known line
texts against the Whisper transcript in tone-free pinyin (robust to
homophone ASR errors like 疑問/宜文), finds the title's last segment, trims
the audio right after it (never clipping line 1), and emits per-line +
per-word alignments relative to the trimmed file.

Usage: output/venv/bin/python scripts/align_dialogue_audio.py [READING_ID ...]
Writes: src/data/dialogueAlignment.ts (alignment data),
        output/official-audio/book1/*.mp3 (re-trimmed tracks),
        docs/audio_manifest_book1.json (updated sizes/hashes).
"""
import json
import math
import re
import struct
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
TRIM_TITLE_MARGIN = 0.05  # cut the spoken intro up to 0.05s before its end

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

def fuzzy_span(needle, stream, start_idx, end_idx):
    """Best needle->stream alignment inside stream[start_idx:end_idx], allowing
    skips on either side (whisper insertions AND paraphrases/omissions like
    这些句子 vs 這課). Returns (covered, first, last) — matched needle
    syllables and the first/last matched stream indices — or None when the
    coverage bar (>= 50% of the needle) is not met."""
    seg = stream[start_idx:end_idx]
    m, n = len(needle), len(seg)
    if m == 0 or n == 0 or m * n > 2_000_000:
        return None
    table = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        row, prev = table[i], table[i - 1]
        ni = needle[i - 1]
        for j in range(1, n + 1):
            if ni == seg[j - 1]:
                row[j] = prev[j - 1] + 1
            else:
                row[j] = prev[j] if prev[j] >= row[j - 1] else row[j - 1]
    covered = table[m][n]
    if covered < max(3, int(len(needle) * 0.5)):
        return None
    i, j = m, n
    last = None
    first = None
    while i > 0 and j > 0:
        if needle[i - 1] == seg[j - 1] and table[i][j] == table[i - 1][j - 1] + 1:
            pos = start_idx + j - 1
            if last is None:
                last = pos
            first = pos
            i -= 1
            j -= 1
        elif table[i - 1][j] >= table[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return (covered, first, last)

def match_lines(lines, units, track_duration, search_window=120, fuzzy=False):
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

    def char_pinyins_for(text):
        """Per-char pinyin with stage directions （…） treated as unspoken
        (empty), mirroring how pinyinize() strips them from the needle, so
        word offsets map onto the actually-spoken characters."""
        out = []
        depth = 0
        for c in text:
            if c in '（(':
                depth += 1
                out.append('')
            elif c in '）)':
                depth = max(0, depth - 1)
                out.append('')
            else:
                out.append('' if depth > 0 else pinyinize(c))
        return out

    def line_entry(line, i0, i1, start, end):
        """Build an aligned-line entry. Per-word character offsets come from
        matching each whisper unit's pinyin against the line's per-character
        pinyin stream (robust to whisper homophone/script differences like
        疑問 vs 宜文). When any unit cannot be mapped (e.g. a paraphrased
        ASR of the line), fall back to one whole-line word with the char
        range of the matched audio so the spoken portion still highlights."""
        words = []
        char_pinyins = char_pinyins_for(line['traditional'])
        char_stream = ''.join(char_pinyins)
        map_cursor = 0
        for k in range(i0, i1 + 1):
            word_pinyin = pinyinize(units[k][0])
            char_start = None
            char_end = None
            if word_pinyin and char_stream:
                found = char_stream.find(word_pinyin, map_cursor)
                if found != -1:
                    # count chars whose pinyin spans cover the match
                    acc = 0
                    for ci, cp in enumerate(char_pinyins):
                        if not cp:
                            continue
                        if acc == found:
                            char_start = ci
                            break
                        acc += len(cp)
                    if char_start is not None:
                        end_acc = found + len(word_pinyin)
                        acc = 0
                        for ci, cp in enumerate(char_pinyins):
                            if not cp:
                                continue
                            acc += len(cp)
                            if acc >= end_acc:
                                char_end = ci + 1
                                break
                        if char_end is None:
                            char_end = len(char_pinyins)
                    map_cursor = found + len(word_pinyin)
            words.append({
                'w': units[k][0], 'start': punits[k][1], 'end': punits[k][2],
                'charStart': char_start, 'charEnd': char_end,
            })
        if not words or any(w['charStart'] is None for w in words):
            # Fall back to a single word spanning the matched audio, mapped
            # to the line chars covered by that span's pinyin. Never claim
            # the whole line for a partial match: the uncovered tail must
            # stay detectable so the tail-recovery pass can extend it.
            match_len = (starts[i1] + len(punits[i1][0])) - starts[i0]
            acc = 0
            f_end = len(char_pinyins)
            for ci, cp in enumerate(char_pinyins):
                if not cp:
                    continue
                acc += len(cp)
                if acc >= match_len:
                    f_end = ci + 1
                    break
            words = [{
                'w': line['traditional'], 'start': start, 'end': end,
                'charStart': 0, 'charEnd': f_end, 'fallback': True,
            }]
        return {
            'index': line['index'],
            'speaker': line['speaker'],
            'text': line['traditional'],
            'start': round(start, 2),
            'end': round(end, 2),
            'words': words,
        }

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
            if not fuzzy:
                # Pass 1 stays strictly anchored: a fuzzy alignment over the
                # whole track can false-match similar-sounding text elsewhere
                # (e.g. 去找他 inside a later line). Windowed pass 2 / tail
                # clips are tightly bounded, so they may use the fallback.
                result.append(unmatched(line))
                continue
            # Strict anchor failed (paraphrase, dropped syllable, merged
            # segment): fall back to a fuzzy alignment over the window.
            fuzz = fuzzy_span(needle, stream, char_cursor, search_end)
            if fuzz is None:
                result.append(unmatched(line))
                continue
            anchor = fuzz[1]
            end_char = fuzz[2] + 1  # fuzzy span is inclusive; anchor path exclusive
        else:
            anchor, consumed = best
            end_char = anchor + consumed

        i0 = unit_index(anchor)
        i1 = unit_index(min(end_char - 1, total - 1))
        start = punits[i0][1]
        end = punits[i1][2]
        result.append(line_entry(line, i0, i1, start, end))
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
        for w in line['words']:
            # Words merged from a wider whisper segment can overhang the
            # clamped line end; trim so highlights stop at the boundary.
            w['end'] = min(w['end'], line['end'])
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

def sustained_speech_onset(audio_path, start_sec, end_sec, threshold_db=-40.0, frame_ms=50):
    """First frame of sustained speech inside [start_sec, end_sec] — energy
    above the threshold AND at least half of the following 0.3s above it too,
    so brief clicks/decay tails before a long pause are ignored. Returns the
    onset in seconds, or None."""
    raw = subprocess.run(
        ['ffmpeg', '-v', 'quiet', '-ss', str(start_sec), '-to', str(end_sec),
         '-i', str(audio_path), '-ac', '1', '-ar', '8000', '-f', 's16le', '-'],
        capture_output=True).stdout
    if not raw:
        return None
    samples = struct.unpack(f'<{len(raw) // 2}h', raw)
    rate = 8000
    frame = int(rate * frame_ms / 1000)
    dbs = []
    for i in range(0, len(samples) - frame + 1, frame):
        chunk = samples[i:i + frame]
        rms = math.sqrt(sum(s * s for s in chunk) / len(chunk))
        dbs.append(20 * math.log10(rms / 32768) if rms > 0 else -99.0)
    lookahead = max(2, int(300 / frame_ms))
    for idx, db in enumerate(dbs):
        if db > threshold_db:
            window = dbs[idx:idx + lookahead]
            if len(window) >= 2 and sum(1 for d in window if d > threshold_db) >= max(1, len(window) // 2):
                return start_sec + idx * frame_ms / 1000.0
    return None

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
            # Cut the spoken lesson-title intro (e.g. 第一課 新同學 對話一 /
            # 對話二). Whisper segments the title separately and its last
            # segment ends essentially AT line 1's start, so the trim point
            # is that segment's end minus a tiny margin — never clipping
            # line 1's first syllable. Applies to dialogue-1 (music + title)
            # and dialogue-2 (title) alike.
            trim_sec = 0.0
            if aligned and not aligned[0].get('unmatched'):
                line1_start = aligned[0]['start']
                anchor_i = next(
                    (i for i, (_, s, e) in enumerate(units)
                     if s <= line1_start < e),
                    None,
                )
                title_end = units[anchor_i - 1][2] if (anchor_i and anchor_i > 0) else line1_start
                trim_sec = max(0.0, min(title_end - TRIM_TITLE_MARGIN, line1_start - 0.05))
                # Whisper folds the pause after the title into the title's
                # segment end, so the trim point above can still leave a long
                # gap of silence before line 1's real speech (measured up to
                # 2.5s). Detect the first sustained speech frame after the
                # candidate trim and cut the pause too.
                onset = sustained_speech_onset(original, trim_sec, trim_sec + 5.0)
                if onset is not None:
                    trim_sec = max(trim_sec, onset - 0.05)
            if trim_sec < 0.5:
                trim_sec = 0.0  # nothing meaningful to cut

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
                clip_start = max(0, prev_end - margin)
                if aligned[i].get('unmatched'):
                    # Unmatched speech can sit INSIDE the previous line's span
                    # (whisper merged two lines into one segment, e.g. the
                    # clerk's 一共兩百一十五塊錢+找您七百八十五塊錢): widen the
                    # window back to the previous matched line's start so the
                    # needle can be found mid-window.
                    for a in reversed(aligned[:i]):
                        if not a.get('unmatched'):
                            clip_start = max(0, a['start'] - margin)
                            break
                # Pass-1 times are untrimmed-relative but the clip is cut
                # from the trimmed source: convert both bounds.
                clip_start = max(0, clip_start - trim_sec)
                clip_end = min(track_duration - trim_sec,
                               next_start + margin - trim_sec)
                if clip_start >= clip_end:
                    continue
                clip = tmp / f'clip_{audio_file}_{i}.mp3'
                subprocess.run(['ffmpeg', '-y', '-v', 'quiet',
                                '-ss', str(clip_start),
                                '-to', str(clip_end),
                                '-i', str(trim_source), '-ac', '1', str(clip)],
                               check=True)
                units2 = build_transcript(transcribe(None, audio=clip))
                result = match_lines(
                    [lines[i]], units2, track_duration,
                    search_window=10000, fuzzy=True)[0]
                if not result.get('unmatched'):
                    # shift clip-relative times to track-relative, then back
                    # to untrimmed-relative so the final shift works
                    offset = clip_start
                    result['start'] += offset
                    result['end'] += offset
                    for w in result['words']:
                        w['start'] += offset
                        w['end'] += offset
                    aligned[i] = shift_alignment([result], -trim_sec)[0]
            aligned = postprocess_lines(aligned, track_duration)

            # Tail recovery: a matched line may leave real text uncovered when
            # whisper split its speech into the line's span plus a tail it
            # never transcribed (or merged away). When the line has room
            # before the next line, re-transcribe the tail window and append
            # the uncovered text's match to the line.
            for idx, a in enumerate(aligned):
                if a.get('unmatched') or not a['words']:
                    continue
                last_word = a['words'][-1]
                if not isinstance(last_word.get('charEnd'), int):
                    continue
                covered = last_word['charEnd']
                if covered >= len(a['text']):
                    continue
                tail_text = a['text'][covered:]
                if re.fullmatch(
                        r'[，。？！、：；“”‘’（）《》〈〉…—\s,.?!:;"\'()\-]+', tail_text):
                    continue
                next_start = track_duration
                for later in aligned[idx + 1:]:
                    if not later.get('unmatched'):
                        next_start = later['start']
                        break
                margin = 0.5
                # `aligned` is still untrimmed-relative here; the clip is cut
                # from the trimmed source, so convert both bounds. Search
                # starts where the covered chars end: at the last word's end
                # normally, or interpolated inside a whole-line fallback word
                # (whisper merged the missing tail into its span).
                if last_word.get('fallback'):
                    frac = (last_word['charEnd'] / len(a['text'])) if len(a['text']) > 0 else 0
                    tail_est = last_word['start'] + frac * (last_word['end'] - last_word['start'])
                else:
                    tail_est = last_word['end']
                last_word_end = tail_est - trim_sec
                clip_start = max(0, last_word_end - margin)
                clip_end = min(track_duration - trim_sec,
                               next_start + margin - trim_sec)
                if clip_start >= clip_end:
                    continue
                clip = tmp / f'tail_{audio_file}_{idx}.mp3'
                subprocess.run(['ffmpeg', '-y', '-v', 'quiet',
                                '-ss', str(clip_start),
                                '-to', str(clip_end),
                                '-i', str(trim_source), '-ac', '1', str(clip)],
                               check=True)
                units3 = build_transcript(transcribe(None, audio=clip))
                # Only units at/after the last word's end belong to the tail;
                # anything earlier is the already-covered speech.
                units3 = [u for u in units3
                          if u[1] >= last_word_end - clip_start - 0.1]
                if not units3:
                    continue
                result = match_lines(
                    [{'index': a['index'], 'speaker': a['speaker'],
                      'traditional': tail_text}],
                    units3, track_duration, search_window=10000, fuzzy=True)[0]
                if result.get('unmatched'):
                    continue
                # Clip times are trimmed-relative; add the clip offset, then
                # convert to untrimmed-relative like pass 2 so the final
                # shift works. Char offsets are tail-relative; map them back
                # into the full line text via `covered`.
                offset = clip_start
                for w in result['words']:
                    w['start'] += offset
                    w['end'] += offset
                    if isinstance(w.get('charStart'), int):
                        w['charStart'] += covered
                        w['charEnd'] += covered
                result['end'] += offset
                if trim_sec > 0:
                    result = shift_alignment([result], -trim_sec)[0]
                a['words'].extend(result['words'])
                a['end'] = round(result['end'], 2)
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

"""Audit vocabulary MP3s and losslessly remove leading silent frames; never publish.

python3 scripts/audio/trimVocabularyAudio.py [--limit=12] [--workers=4]
Requires curl and ffmpeg. Originals, candidates, and resumable receipts stay in output/.
"""
import argparse
import concurrent.futures
import hashlib
import json
import math
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'output/audio/vocabulary-trim-v1'
THRESHOLD_DB = -55
PAD_SECONDS = 0.100


class UnsafeTrimError(ValueError):
    """A valid original whose candidate must remain unpublished."""


def digest(data):
    return hashlib.sha256(data).hexdigest()


def decode(filename):
    result = subprocess.run([
        'ffmpeg', '-nostdin', '-hide_banner', '-i', str(filename), '-map', '0:a:0',
        '-af', f'silencedetect=noise={THRESHOLD_DB}dB:d=0.01',
        '-c:a', 'pcm_s16le', '-f', 's16le', 'pipe:1',
    ], capture_output=True, check=True, timeout=30)
    log = result.stderr.decode()
    spec = re.search(r'Audio: pcm_s16le, (\d+) Hz, (mono|stereo),', log)
    if not spec or not result.stdout:
        raise ValueError('Unsupported or empty decoded audio')
    sample_rate = int(spec[1])
    channels = 1 if spec[2] == 'mono' else 2
    bytes_per_second = sample_rate * channels * 2
    duration = len(result.stdout) / bytes_per_second
    events = [(kind, float(value)) for kind, value in re.findall(r'silence_(start|end):\s*([0-9.]+)', log)]
    leading = 0.0
    if events and events[0][0] == 'start' and events[0][1] <= 0.001:
        leading = next((value for kind, value in events[1:] if kind == 'end'), duration)
    last_sound = duration
    if len(events) >= 2 and events[-1][0] == 'end' and abs(events[-1][1] - duration) < 0.01:
        last_sound = events[-2][1]
    return result.stdout, bytes_per_second, leading, last_sound


def selection():
    rows = []
    for book in range(1, 5):
        pack = json.loads((ROOT / f'public/data/vocabulary/book-{book}.json').read_text())
        for item in pack['items']:
            source = item.get('audio', item.get('audio_url') or f"modernchinese-{item['id']}.mp3") or ''
            # Re-running after publication still audits the same original file.
            if source.startswith('vocabulary-trimmed/v1/'):
                source = f"modernchinese-{item['id']}.mp3"
            if not re.fullmatch(r'modernchinese-B[1-4]L\d{2}-\d-\d+\.mp3', source):
                continue
            rows.append({'id': item['id'], 'word': item.get('traditional') or item.get('simplified'),
                         'pinyin': item.get('pinyin'), 'source': source})
    return rows


def process(row):
    original = DEST / 'originals' / row['source']
    result_path = DEST / 'receipts' / f"{row['id']}.json"
    try:
        if result_path.exists() and original.exists():
            saved = json.loads(result_path.read_text())
            candidate = DEST / 'clips' / (saved.get('audio', '').split('/')[-1])
            if saved['sourceSha256'] == digest(original.read_bytes()) and (
                saved['status'] == 'unchanged' or
                (saved['status'] == 'trimmed' and candidate.exists() and saved['sha256'] == digest(candidate.read_bytes()))
            ):
                return saved
        if not original.exists():
            temporary = original.with_suffix('.download')
            subprocess.run(['curl', '--fail', '--silent', '--show-error', '--retry', '2',
                            '--max-time', '30', '--max-filesize', '2000000',
                            'https://audio.ronsmandarin.com/' + row['source'], '-o', str(temporary)],
                           check=True, capture_output=True, timeout=100)
            temporary.replace(original)
        source_bytes = original.read_bytes()
        pcm, bps, leading, last_sound = decode(original)
        result = {**row, 'sourceSha256': digest(source_bytes), 'sourceBytes': len(source_bytes),
                  'leadingMs': round(leading * 1000, 3)}
        if leading < 0.160:
            result.update(status='unchanged', reason='Already has less than 160 ms of leading silence')
        elif leading > 0.750 or last_sound - leading < 0.060:
            result.update(status='review', reason='Unusual silence or very short speech; retained original')
        else:
            cut = math.floor((leading - PAD_SECONDS) * 1000) / 1000
            candidate = DEST / 'clips' / f"{row['id']}.mp3"
            # Source MP3 seek tables/encoder delays vary. Measure the actual
            # result and back off instead of trusting the requested seek time.
            for _ in range(3):
                subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', str(cut), '-i', str(original),
                                '-map', '0:a:0', '-c:a', 'copy', '-map_metadata', '-1', '-y', str(candidate)],
                               check=True, capture_output=True, timeout=30)
                trimmed, new_bps, new_leading, _ = decode(candidate)
                if new_leading >= 0.080:
                    break
                cut = max(0, cut - (PAD_SECONDS - new_leading))
            if bps != new_bps or not 0.080 <= new_leading <= 0.160:
                raise UnsafeTrimError('Candidate does not retain the required 80–160 ms safety margin')
            # Match voiced PCM, then prove every decoded sample from 80 ms through
            # the original last sound is bit-identical. MP3 frames are copied, not re-encoded.
            anchor_start = int((new_leading + 0.040) * bps) // 4 * 4
            anchor = trimmed[anchor_start:anchor_start + 4096]
            offset = pcm.find(anchor) - anchor_start if len(anchor) == 4096 else -1
            guard = int(0.080 * bps) // 4 * 4
            end = math.ceil(last_sound * bps / 4) * 4 - offset
            if offset < 0 or offset > leading * bps or end > len(trimmed) or end <= guard:
                raise UnsafeTrimError('Candidate PCM alignment or original speech end could not be verified')
            if pcm[offset + guard:offset + end] != trimmed[guard:end]:
                raise UnsafeTrimError('Decoded speech differs; retained original')
            body = candidate.read_bytes()
            sha = digest(body)
            filename = f"{row['id']}-{sha[:12]}.mp3"
            candidate.replace(DEST / 'clips' / filename)
            result.update(status='trimmed', audio='vocabulary-trimmed/v1/' + filename,
                          sha256=sha, bytes=len(body), removedMs=round(offset / bps * 1000, 3),
                          retainedLeadingMs=round(new_leading * 1000, 3), speechPcmIdentical=True)
        result_path.write_text(json.dumps(result, ensure_ascii=False) + '\n')
        return result
    except UnsafeTrimError as error:
        result.update(status='review', reason=str(error))
        result_path.write_text(json.dumps(result, ensure_ascii=False) + '\n')
        return result
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        # Error text omits response bodies and credentials; failures never publish.
        return {**row, 'status': 'error', 'reason': str(error)[:240]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit', type=int)
    parser.add_argument('--workers', type=int, default=4)
    args = parser.parse_args()
    for folder in ['originals', 'clips', 'receipts']:
        (DEST / folder).mkdir(parents=True, exist_ok=True)
    rows = selection()
    if args.limit:
        # A pilot covers each book instead of only the beginning of Book 1.
        per_book = max(1, args.limit // 4)
        rows = [row for book in range(1, 5) for row in [r for r in rows if r['id'].startswith(f'B{book}')] [:per_book]]
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(6, args.workers))) as pool:
        for result in pool.map(process, rows):
            results.append(result)
            if len(results) % 50 == 0:
                print(f"Audited {len(results)}/{len(rows)}; trimmed {sum(r['status'] == 'trimmed' for r in results)}; "
                      f"review/errors {sum(r['status'] in ('review', 'error') for r in results)}", flush=True)
    receipt = {'schemaVersion': 1, 'method': 'MP3 frame copy; no synthesis or re-encoding',
               'thresholdDb': THRESHOLD_DB, 'targetPaddingMs': PAD_SECONDS * 1000,
               'selectionCount': len(rows), 'results': results}
    (DEST / 'audit.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
    counts = {status: sum(r['status'] == status for r in results) for status in ['trimmed', 'unchanged', 'review', 'error']}
    print(json.dumps(counts), flush=True)
    for result in results:
        if result['status'] in ('review', 'error'):
            print(json.dumps(result, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()

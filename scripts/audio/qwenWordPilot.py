#!/usr/bin/env python3
"""Offline 10-word listening pilot; never updates packs or learner progress.

uv venv --python python3.11 output/qwen-pilot-venv
uv pip install --python output/qwen-pilot-venv/bin/python -r scripts/audio/qwen-pilot-requirements.txt
output/qwen-pilot-venv/bin/python scripts/audio/qwenWordPilot.py
output/qwen-pilot-venv/bin/python scripts/audio/qwenWordPilot.py --book-gaps

Outputs one WAV per word plus candidate syllable ranges under output/qwen-word-pilot.
Pinyin is copied from the current Book 1 pack, not inferred by the aligner.
Alignment confidence is NOT pronunciation verification. Listen before publishing.
--book-gaps writes six intact candidates to output/qwen-book-gaps; no cuts or publication.
--character-gaps aligns existing downloaded book sources for review only; never publishes cuts.
After the initial model downloads, set HF_HUB_OFFLINE=1 to run without internet.
"""
import argparse
import hashlib
import json
import math
import re
import subprocess
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output/qwen-word-pilot"
MODEL = "mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit"
# Explicit syllable boundaries only: concatenations must match the source exactly.
SELECTION = {
    "漂亮": ["piào", "liàng"], "老師": ["lǎo", "shī"],
    "學生": ["xué", "shēng"], "什麼": ["shén", "me"],
    "喜歡": ["xǐ", "huān"], "朋友": ["péng", "yǒu"],
    "快樂": ["kuài", "lè"], "東西": ["dōng", "xi"],
    "音樂": ["yīn", "yuè"], "銀行": ["yín", "háng"],
}
GAP_SELECTION = {
    "B2L07-2-27": ("阿里山小火車", "Ālǐ Shān xiǎo huǒchē"),
    "B2L12-1-02": ("職業", "zhíyè"),
    "B3L14-1-40": ("天帝", "Tiāndì"),
    "B3L14-1-41": ("王母娘娘", "Wángmǔ Niángniang"),
    "B2L06-1-30": ("玫瑰", "méigui"),
    "B4L11-1-44": ("人家", "rénjia"),
}


def gap_words():
    """Whole-word candidates only; intended pinyin is not a synthesis guarantee."""
    by_id = {}
    for book in range(1, 5):
        pack = json.loads((ROOT / f"public/data/vocabulary/book-{book}.json").read_text())
        by_id.update({item["id"]: item for item in pack["items"]})
    words = []
    for card_id, (text, reading) in GAP_SELECTION.items():
        item = by_id[card_id]
        if item["traditional"] != text or reading not in item["pinyin"].split("/"):
            raise ValueError(f"Book gap source changed: {card_id}")
        words.append({"id": card_id, "text": text, "pinyin": reading,
                      "sourcePinyin": item["pinyin"], "meaning": item["meaning"],
                      "synthesisText": item["simplified"], "file": card_id + ".wav"})
    return words


def intact_manifest(words):
    import soundfile as sf
    for word in words:
        path = OUT / word["file"]
        word.update(duration=round(sf.info(path).duration, 4),
                    sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                    reviewStatus="needs-listening-review", chars=[])
    (OUT / "manifest.json").write_text(json.dumps({
        "model": MODEL, "voice": "Vivian", "purpose": "book-gaps",
        "licenseUrl": "https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
        "words": words,
    }, ensure_ascii=False, indent=2))


def plain(syllable):
    return "".join(c for c in unicodedata.normalize("NFD", syllable.lower())
                   if not unicodedata.combining(c))


def source_words():
    pack = json.loads((ROOT / "public/data/vocabulary/book-1.json").read_text())
    by_text = {item["traditional"]: item for item in pack["items"]}
    words = []
    for text, syllables in SELECTION.items():
        item = by_text[text]
        if "".join(syllables).lower() != item["pinyin"].lower():
            raise ValueError(f"Source reading changed: {text}; review syllable boundaries")
        if len(syllables) != len(text):
            raise ValueError(f"Character/syllable mismatch: {text}")
        words.append({"id": item["id"], "text": text, "pinyin": item["pinyin"],
                      "meaning": item["meaning"], "syllables": syllables,
                      "synthesisText": item["simplified"], "file": item["id"] + ".wav"})
    return words


def generate(words):
    import mlx.core as mx
    import numpy as np
    import soundfile as sf
    from mlx_audio.tts.utils import load_model
    model = None
    for word in words:
        path = OUT / word["file"]
        cache_key = hashlib.sha256(json.dumps(
            [MODEL, "Vivian", "Chinese", 42, 256, 0.12, word["synthesisText"]], ensure_ascii=False
        ).encode()).hexdigest()
        key_path = path.with_suffix(".key")
        if path.exists() and key_path.exists() and key_path.read_text() == cache_key:
            continue
        if model is None:
            model = load_model(MODEL)
        mx.random.seed(42)
        results = list(model.generate(word["synthesisText"], voice="Vivian", lang_code="Chinese", max_tokens=256))
        if not results:
            raise ValueError(f"No generated audio: {word['text']}")
        audio = np.concatenate([np.asarray(result.audio).reshape(-1) for result in results])
        rate = results[0].sample_rate
        if not np.isfinite(audio).all() or not len(audio):
            raise ValueError(f"Invalid generated audio: {word['text']}")
        # Keep a short margin around speech; do not split or alter its internal rhythm.
        voiced = np.flatnonzero(np.abs(audio) > 0.003)
        if not len(voiced):
            raise ValueError(f"Silent generated audio: {word['text']}")
        margin = int(rate * 0.12)
        audio = audio[max(0, voiced[0] - margin): min(len(audio), voiced[-1] + margin + 1)]
        sf.write(path, audio, rate, subtype="PCM_16")
        key_path.write_text(cache_key)
        print(f"Generated {word['text']} ({len(audio) / rate:.2f}s)", flush=True)
    del model
    mx.clear_cache()


def ranges_from_spans(spans, seconds_per_frame, duration):
    if any(not span for span in spans):
        raise ValueError("A syllable could not be aligned")
    # CTC token endpoints can miss vowel tails. Preserve the word's outer edges;
    # use alignment only for internal syllable boundaries (as in align_mms.py).
    starts = [0.0]
    for previous, current in zip(spans, spans[1:]):
        if previous[-1].end > current[0].start:
            raise ValueError("Out-of-order syllable alignment")
        boundary = (previous[-1].end + current[0].start) * seconds_per_frame / 2
        starts.append(boundary)
    ends = starts[1:] + [duration]
    if any(not (math.isfinite(a) and math.isfinite(b) and 0 <= a < b <= duration)
           for a, b in zip(starts, ends)):
        raise ValueError("Invalid candidate audio ranges")
    return [(round(a, 4), round(b, 4)) for a, b in zip(starts, ends)]


def align(words):
    import numpy as np
    import torch
    import soundfile as sf
    from torchaudio.pipelines import MMS_FA
    model = MMS_FA.get_model().eval()
    dictionary, aligner = MMS_FA.get_dict(), MMS_FA.get_aligner()
    for word in words:
        path = OUT / word["file"]
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le",
                              "-ac", "1", "-ar", str(MMS_FA.sample_rate), "-"],
                             check=True, capture_output=True).stdout
        samples = np.frombuffer(raw, dtype=np.float32).copy()
        waveform = torch.from_numpy(samples).unsqueeze(0)
        with torch.inference_mode():
            emission, _ = model(waveform)
        tokens = [[dictionary[letter] for letter in plain(p)] for p in word["syllables"]]
        spans = aligner(emission[0], tokens)
        frame_seconds = len(samples) / MMS_FA.sample_rate / emission.shape[1]
        duration = sf.info(path).duration
        ranges = ranges_from_spans(spans, frame_seconds, duration)
        word.update(duration=round(duration, 4), sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                    reviewStatus="needs-listening-review", chars=[
                        {"char": char, "pinyin": pinyin, "start": start, "end": end,
                         "alignmentScore": round(float(np.mean([s.score for s in span])), 3)}
                        for char, pinyin, (start, end), span
                        in zip(word["text"], word["syllables"], ranges, spans)])
        print(f"Aligned {word['text']}: {ranges}", flush=True)
    (OUT / "manifest.json").write_text(json.dumps(
        {"model": MODEL, "voice": "Vivian", "words": words}, ensure_ascii=False, indent=2))


def preview():
    # Copy the real repo tokens; the standalone pilot has no app or progress endpoints.
    css = (ROOT / "src/index.css").read_text()
    tokens = "\n".join(re.findall(r"^  --(?:color-|radius-|depth-)[^;]+;", css, re.M))
    template = (Path(__file__).with_name("qwenWordPilot.html")).read_text()
    (OUT / "index.html").write_text(template.replace("/* REPO_TOKENS */", tokens))


def character_gap_preview():
    selection = json.loads((OUT / "selection.json").read_text())
    words = selection["words"]
    for word in words:
        source = OUT / (word["id"] + ".mp3")
        if hashlib.sha256(source.read_bytes()).hexdigest() != word["sourceSha256"]:
            raise ValueError("Book source hash changed")
        if len(word["text"]) != len(word["syllables"]):
            raise ValueError("Book character alignment changed")
        # The aligner must read the verified source, never an unrelated or stale WAV.
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(source), "-ac", "1",
                        "-ar", "24000", str(OUT / word["file"])], check=True)
    align(words)
    for word in words:
        # Display only the missing neutral positions; preserve all range evidence in the manifest.
        word["alignmentCandidates"] = word["chars"]
        readings = {target["pinyin"] for target in word["targets"]}
        word["chars"] = [char for char in word["chars"] if char["pinyin"] in readings]
        if not word["chars"]:
            raise ValueError(f"No candidate for {word['text']}")
        if any(char["end"] - char["start"] > 1.5 for char in word["chars"]):
            word["candidateNote"] = "Long candidate cut: check for repeated speech or silence and adjust its boundaries before approval."
    (OUT / "manifest.json").write_text(json.dumps({
        "model": "torchaudio MMS forced alignment (boundaries only)",
        "voice": "Existing book recordings and owner-approved supplements",
        "purpose": "character-gaps", "words": words, "deferred": selection["deferred"],
    }, ensure_ascii=False, indent=2))
    preview()


def self_check():
    from types import SimpleNamespace as Span
    words = source_words()
    assert len(words) == 10 and words[0]["pinyin"] == "piàoliàng"
    gaps = gap_words()
    assert len(gaps) == 6 and all("。" not in word["text"] for word in gaps)
    assert next(word for word in gaps if word["text"] == "人家")["pinyin"] == "rénjia"
    spans = [[Span(start=2, end=5)], [Span(start=6, end=9)]]
    ranges = ranges_from_spans(spans, 0.1, 1.2)
    assert ranges == [(0.0, 0.55), (0.55, 1.2)]
    for bad in ([[], spans[1]], [[Span(start=12, end=15)], spans[1]]):
        try:
            ranges_from_spans(bad, 0.1, 1.2)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid alignment was accepted")
    print("Pilot source and range checks passed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-check", action="store_true")
    parser.add_argument("--align-only", action="store_true")
    parser.add_argument("--book-gaps", action="store_true", help="Six intact book-gap candidates; no character extraction or publishing")
    parser.add_argument("--character-gaps", action="store_true", help="Review boundaries in existing word recordings; requires selection.json")
    args = parser.parse_args()
    if args.book_gaps and args.align_only:
        parser.error("Book gaps are reviewed as intact words, not aligned character cuts")
    if args.character_gaps and (args.book_gaps or args.align_only):
        parser.error("Character review is a separate mode")
    self_check()
    if not args.self_check:
        if args.character_gaps:
            OUT = ROOT / "output/wordbuild-character-review"
            character_gap_preview()
            raise SystemExit(0)
        if args.book_gaps:
            OUT = ROOT / "output/qwen-book-gaps"
        OUT.mkdir(parents=True, exist_ok=True)
        selected = gap_words() if args.book_gaps else source_words()
        if not args.align_only:
            generate(selected)
        if args.book_gaps:
            intact_manifest(selected)
        else:
            align(selected)
        preview()

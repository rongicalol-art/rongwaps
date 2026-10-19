#!/usr/bin/env python3
"""Pick the steadiest voice B (studio) take of every grammar sentence.

Qwen's pace wanders: a take can read 現在是幾點幾分 at 0.2 s a syllable and then slow to 0.4 s
on 十點十五分. This forced-aligns every rendered take (seeds from
`generateGrammarStudioAudio.py --takes N`) against its text with the same MMS aligner as the book
clips, measures each syllable's length (onset to next onset; the pause at punctuation or a turn
change doesn't count), and finds the take's slowest stretch: the longest run of 3 syllables
against the take's own median ("drag", 1.0 = perfectly even). A take must say every syllable
(each matched at 0.35 or better, else it can't be judged and loses); among those, the least
drag wins, then the clearest match.

  output/align-venv/bin/python scripts/audio/scoreGrammarStudioTakes.py
  HF_HUB_OFFLINE=1 output/qwen-pilot-venv/bin/python scripts/audio/scoreGrammarStudioTakes.py --verify-manifest

`--verify-manifest` checks delivered files, compares retained takes with their approved source,
and requires independent, unprompted ASR to match every recording. MMS scores are retained as
diagnostics, not treated as proof of correct pronunciation. This is automated QA, not a listening review.

Writes output/grammar-audio/studio-picks.json ({key: seed}) and studio-scores.json (every
take's numbers). Re-run the generator afterwards to point the manifest at the picked takes.
"""
import json
import statistics
import sys
from pathlib import Path

import torch
from torchaudio.pipelines import MMS_FA as bundle

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generateGrammarStudioAudio as studio  # noqa: E402
from align_mms import decode_audio, normalize_to_syllables, pinyinize  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]  # Repository root.
OUT_DIR = ROOT / "output/grammar-audio"  # Local studio artifacts.
PICKS = OUT_DIR / "studio-picks.json"  # Chosen seed per key, read by the generator.
SCORES = OUT_DIR / "studio-scores.json"  # Every take's numbers, best first.
MAX_SEED = studio.SEED + 20  # Look for takes up to this seed.
BREAK = "，。？！、；：,.?!;:"  # A pause after these is phrasing, not drag.
WINDOW = 3  # Syllables in a stretch.
MIN_SYLLABLE_SCORE = 0.35  # Below this a syllable may not have been said...
RELATIVE_SCORE = 0.5  # ...but only if another take scores it at least twice as well (numbers like 一 score low in every take).


def syllables_with_breaks(text):
    """Spoken syllables of the text, each flagged when punctuation follows it."""
    syllables = normalize_to_syllables(text)
    for syllable in syllables:
        syllable["break"] = text[syllable["charEnd"]:syllable["charEnd"] + 1] in tuple(BREAK)
    return syllables


def score_take(model, dictionary, aligner, audio_path, text):
    syllables = [s for s in syllables_with_breaks(text) if any(c in dictionary for c in s["pinyin"])]
    tokens = [[dictionary[c] for c in s["pinyin"] if c in dictionary] for s in syllables]
    waveform, seconds = decode_audio(audio_path)
    with torch.inference_mode():
        emission, _ = model(waveform)
    frame = seconds / emission.size(1)
    spans = aligner(emission[0], tokens)
    if len(spans) != len(syllables) or any(not span for span in spans):
        return {"ok": False, "drag": 99.0, "mean": 0.0, "min": 0.0, "weak": "", "scores": [], "slow": ""}
    onsets = [span[0].start * frame for span in spans]
    scores = [sum(float(token.score) for token in span) / len(span) for span in spans]
    # Lengths of syllables inside a clause, as runs split at every pause.
    runs, run = [], []
    for syllable, start, nxt in zip(syllables, onsets, onsets[1:]):
        if syllable["break"]:
            runs.append(run)
            run = []
        else:
            run.append((text[syllable["charStart"]:syllable["charEnd"]], nxt - start))
    runs.append(run)
    lengths = [length for run in runs for _, length in run]
    median = statistics.median(lengths) if lengths else 0.0
    drag, slow = 1.0, ""
    for run in runs:
        for index in range(max(0, len(run) - WINDOW + 1)):
            window = run[index:index + WINDOW]
            ratio = sum(length for _, length in window) / len(window) / median if median else 1.0
            if ratio > drag:
                drag, slow = ratio, "".join(char for char, _ in window)
    return {
        "ok": min(scores) >= MIN_SYLLABLE_SCORE,
        "drag": round(drag, 2),
        "mean": round(sum(scores) / len(scores), 3),
        "min": round(min(scores), 3),
        "weak": text[syllables[scores.index(min(scores))]["charStart"]],
        "scores": [round(score, 3) for score in scores],
        "slow": slow,
    }


def judge(takes):
    """A syllable counts as missing only when it is weak here and clearly heard in another take."""
    best = [max(take["scores"][i] for take in takes if len(take["scores"]) > i) for i in range(max(len(t["scores"]) for t in takes))]
    for take in takes:
        take["ok"] = bool(take["scores"]) and all(
            score >= MIN_SYLLABLE_SCORE or score >= RELATIVE_SCORE * best[i] for i, score in enumerate(take["scores"])
        )


def rank(take):
    """Best first: every syllable said, then least drag, then the clearest match."""
    return (not take["ok"], take["drag"], -take["mean"])


def main():
    model, dictionary, aligner = bundle.get_model(), bundle.get_dict(), bundle.get_aligner()
    targets = studio.collect_targets()[0]
    picks, scores = {}, {}
    for target in targets:
        text = "".join(target["turns"])
        takes = []
        for seed in range(studio.SEED, MAX_SEED):
            _, path, sidecar = studio.output_for(target["key"], target["turns"], seed)
            if path.is_file() and sidecar.is_file():
                takes.append({"seed": seed, **score_take(model, dictionary, aligner, path, text)})
        if not takes:
            continue
        judge(takes)
        takes.sort(key=rank)
        picks[target["key"]], scores[target["key"]] = takes[0]["seed"], takes
        best, first = takes[0], next(t for t in takes if t["seed"] == studio.SEED) if any(t["seed"] == studio.SEED for t in takes) else takes[0]
        print(f"{text[:22]:<24} seed {best['seed']:>2} drag {best['drag']:.2f} (seed 42: {first['drag']:.2f})"
              f"{'' if best['ok'] else '  CHECK: ' + best['weak'] + ' may be missing'}", flush=True)
    PICKS.write_text(json.dumps(picks, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    SCORES.write_text(json.dumps(scores, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    print(f"Picked {len(picks)} takes -> {PICKS.relative_to(ROOT)}")


def verify_manifest():
    """Verify this exact set of MP3s before the publisher can change references."""
    from mlx_audio.stt.utils import load_model

    manifest = OUT_DIR / "studio-manifest.json"
    entries = json.loads(manifest.read_text())
    targets = {target["key"]: target for target in studio.collect_targets()[0]}
    transcript_path = OUT_DIR / "studio-asr-report.json"
    transcripts = json.loads(transcript_path.read_text()) if transcript_path.exists() else {}
    asr_name = "mlx-community/Qwen3-ASR-0.6B-8bit"
    asr = None
    torch.set_num_threads(4)
    model, dictionary, aligner = bundle.get_model().eval(), bundle.get_dict(), bundle.get_aligner()
    failures = []
    for entry in entries:
        key, path = entry["key"], ROOT / entry["local"]
        if studio.file_sha256(path) != entry["sha256"]:
            raise ValueError(f"Changed MP3: {key}")
        duration, channels = studio.probe_audio(path)
        quality = studio.measure_quality(path)
        if channels != 1 or not -17 <= quality["integratedLufs"] <= -9 or quality["truePeakDbfs"] > -1:
            raise ValueError(f"Invalid delivered audio: {key}: {quality}")
        previous_path = studio.AUDIO_DIR / Path(entry["previousFile"]).name
        if studio.file_sha256(previous_path) != entry["previousSha256"]:
            raise ValueError(f"Changed approved source: {key}")
        expected = " ".join(targets[key]["turns"])
        transcript = transcripts.get(key)
        if not transcript or transcript["sha256"] != entry["sha256"]:
            if asr is None:
                asr = load_model(asr_name)
            result = asr.generate(str(path), language="Chinese", max_tokens=512, temperature=0, verbose=False)
            transcript = {"sha256": entry["sha256"], "expected": expected, "transcript": result.text}
            transcripts[key] = transcript
            transcript_path.write_text(json.dumps(transcripts, ensure_ascii=False, indent=2) + "\n")
        quality.update(transcript=transcript["transcript"], expectedSpoken=expected, asrModel=asr_name)
        if pinyinize(transcript["transcript"]) != pinyinize(expected):
            failures.append(key)
            print(f"CHECK {key}: {transcript['transcript']}", flush=True)
            continue
        if entry.get("regenerated"):
            alignment = score_take(model, dictionary, aligner, path, expected.replace("兒", "").replace("儿", ""))
            quality.update(transcript=transcript["transcript"], asrModel=asr_name,
                           alignmentMean=alignment["mean"], alignmentMin=alignment["min"],
                           contentCheck="Independent ASR matched spoken syllables; MMS alignment measured")
            pace = len(studio.han(entry["spoken"])) / duration
            if pace > 4:
                failures.append(key)
                print(f"CHECK {key}: {transcript['transcript']} ({pace:.2f} chars/s)", flush=True)
                continue
        else:
            original, _ = decode_audio(previous_path)
            current, _ = decode_audio(path)
            if abs(original.shape[1] - current.shape[1]) > bundle.sample_rate * 0.01:
                raise ValueError(f"Timing changed in retained take: {key}")
            count = min(original.shape[1], current.shape[1])
            size = int(bundle.sample_rate * 0.02)
            count = count // size * size
            original, current = original[0, :count].reshape(-1, size), current[0, :count].reshape(-1, size)
            active = original.square().mean(1).sqrt() > 0.01
            original, current = original[active], current[active]
            original = original - original.mean(1, keepdim=True)
            current = current - current.mean(1, keepdim=True)
            correlation = torch.nn.functional.cosine_similarity(original, current, dim=1)
            median, tenth = float(correlation.median()), float(torch.quantile(correlation, 0.1))
            if median < 0.98 or tenth < 0.95:
                raise ValueError(f"Speech waveform changed unexpectedly: {key}")
            quality.update(medianSpeechFrameCorrelation=round(median, 4),
                           speechFrameCorrelationP10=round(tenth, 4),
                           contentCheck="Independent ASR matched spoken syllables; approved speech waveform and duration preserved")
        quality["contentChecked"] = True
        entry["quality"] = quality
        print(f"PASS {key}: {quality['integratedLufs']:.1f} LUFS, {quality['truePeakDbfs']:.1f} dBFS true peak", flush=True)
    if failures:
        raise ValueError("Speech checks need another take: " + ", ".join(failures))
    studio.write_json(manifest, entries)
    studio.write_json(OUT_DIR / "studio-refresh-manifest.json", entries)
    print(f"Verified {len(entries)} delivered MP3s and independent speech matches.", flush=True)


if __name__ == "__main__":
    if "--verify-manifest" in sys.argv:
        verify_manifest()
    else:
        main()

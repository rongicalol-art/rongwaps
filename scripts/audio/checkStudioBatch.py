#!/usr/bin/env python3
"""Check a studio batch before it is published: every clip must say the whole sentence and end cleanly.

  HF_HUB_OFFLINE=1 output/qwen-pilot-venv/bin/python scripts/audio/checkStudioBatch.py output/grammar-audio/b1-gaps

For each clip in <batch>/manifest.json:
- independent, unprompted ASR (Qwen3-ASR) must hear the same syllables as the text (catches a clip
  that stops before the last word);
- its last speech frame must have faded (catches a final syllable cut off mid-sound);
- it must not drag (characters per voiced second at least MIN_VOICED_PACE).
Passing clips get `quality.contentChecked`; failures go to <batch>/rejected.json ({key: [take, ...]}),
which the generator reads to render those sentences again with another take. Transcripts are cached
by file hash in <batch>/asr.json. A transcript that differs only where ASR can't match the text (names,
numbers written in digits, sound-alikes such as 的/得 or 她/他) passes once a person has reviewed that
transcript and listed it in <batch>/asr-reviewed.json ({key: {"heard": [transcript, ...], "note": ...}}). This is automated QA, not a listening review.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from align_mms import pinyinize  # noqa: E402
from generateGrammarStudioAudio import ENDING_MAX, MIN_VOICED_PACE, attempt_id, ending_ratio, voiced_pace  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]  # Repository root.
ASR_MODEL = "mlx-community/Qwen3-ASR-0.6B-8bit"  # Independent transcription model.


def main():
    batch = ROOT / sys.argv[1]
    manifest_path = batch / "manifest.json"
    entries = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not entries:
        raise SystemExit(f"{manifest_path} lists no clips.")
    asr_path = batch / "asr.json"
    transcripts = json.loads(asr_path.read_text(encoding="utf-8")) if asr_path.exists() else {}
    rejected_path = batch / "rejected.json"
    rejected = json.loads(rejected_path.read_text(encoding="utf-8")) if rejected_path.exists() else {}
    reviewed_path = batch / "asr-reviewed.json"
    reviewed = json.loads(reviewed_path.read_text(encoding="utf-8")) if reviewed_path.exists() else {}
    asr = None
    failures = []
    for entry in entries:
        path = ROOT / entry["local"]
        cached = transcripts.get(entry["sha256"])
        if cached is None:
            if asr is None:
                from mlx_audio.stt.utils import load_model
                asr = load_model(ASR_MODEL)
            cached = asr.generate(str(path), language="Chinese", max_tokens=256, temperature=0, verbose=False).text
            transcripts[entry["sha256"]] = cached
            asr_path.write_text(json.dumps(transcripts, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        heard, expected = pinyinize(cached), pinyinize(entry["spoken"])
        ratio = ending_ratio(path)
        problems = []
        review = reviewed.get(entry["key"])
        if heard != expected and not (review and heard in {pinyinize(text) for text in review["heard"]}):
            problems.append(f"heard {cached!r}")
        if ratio > ENDING_MAX:
            problems.append(f"ends abruptly ({ratio:.2f})")
        pace = voiced_pace(path, entry["spoken"])
        if pace < MIN_VOICED_PACE:
            problems.append(f"drags ({pace:.2f} characters per voiced second)")
        quality = {**entry["quality"], "transcript": cached, "asrModel": ASR_MODEL, "endingRatio": round(ratio, 3), "voicedPace": round(pace, 2)}
        if heard != expected and not problems:
            quality["asrReview"] = review["note"]
        quality["contentChecked"] = not problems
        entry["quality"] = quality
        if problems:
            failures.append(entry["key"])
            take = attempt_id(entry["seed"], entry.get("take", "g" if entry.get("tailGuard") else ""))
            takes = rejected.setdefault(entry["key"], [])
            if take not in takes:
                takes.append(take)
            print(f"CHECK {entry['key']} (take {take}): {'; '.join(problems)}", flush=True)
    manifest_path.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    rejected_path.write_text(json.dumps(rejected, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(entries) - len(failures)}/{len(entries)} clips pass; {len(failures)} need another take.", flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

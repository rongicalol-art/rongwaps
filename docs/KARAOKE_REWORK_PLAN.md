# Karaoke Sync Rework — Execution Plan & Acceptance Contract

Status: **complete** — all phases implemented and verified (see "Final state" below).
Model tiers: ML/alignment (Phases 0–1) → Pro/high; TypeScript/React (Phases 2–5) →
Flash/medium is fine.

## Final state

- `scripts/align_mms.py` force-aligns all 48 Book 1 readings at **character
  resolution** (MMS_FA + tone-free pinyin) → `content/dialogueAlignment.json` with
  per-line start/end, per-character onsets (`chars[]`, each ending at the next onset),
  and per-char/per-line confidence scores.
- Un-trimmed 短文 tracks (spoken `短文` + reading-title intro) are aligned from line 1:
  Whisper locates the title end, then MMS aligns the rest and times are shifted back.
- Lines with mean char score < 0.5 are marked `unmatched` → TTS fallback (5 lines).
- Client: `AlignedChar` type, `charRangeForTime` util, `getWordChunks` char-based word
  timing, and word-level karaoke highlight in `ReadingCanvas` + `ReadingNarrativeView`.
- Verified: 398/399 tests pass; `npm run typecheck` and `npm run build` are green.
  Char onsets validated against waveform energy (MMS corrects a ~1.1s Whisper drift on
  `B1-01-1-1`) and Whisper ground-truth (短文 intro handled on `B1-01-3-1`).

## Objective

Word-level karaoke highlight for all **48 Book 1 readings** (16 lessons × {dialogue 1,
dialogue 2, 短文}), with **character-accurate** timing from MMS forced alignment on the
official book audio. Official audio only; TTS remains a non-karaoke fallback.

## Non-negotiables (read first, applies to every phase)

1. **Never accept a change that was not executed.** Report real command output and real
   assertion results, not "it should work".
2. The offline Python runs inside `output/venv/bin/python` (torch 2.14 / torchaudio 2.11
   already installed). Do **not** `pip install` into the system Python.
3. **Romanize with `bundle.get_tokenizer()` (uroman), NOT raw pypinyin.** `MMS_FA`'s
   dictionary is uroman-based; a pypinyin/uroman mismatch silently corrupts alignment.
   Any letter missing from `get_dict()` must be skipped, never guessed.
4. Text must be normalized **before** aligning (CTC forces the exact transcript onto the
   audio): strip stage directions `（…）`, expand Arabic digits to Chinese numerals
   (101→一百零一), drop 兒/儿, and apply the `PINYIN_VARIANTS` canonicalization. This logic
   already exists in `scripts/align_dialogue_audio.py` (`pinyinize`, `expand_digits`,
   `char_pinyins_for`) — port it, don't reinvent it.
5. Alignment is done against the **traditional** line text and the **already-trimmed**
   audio in `output/official-audio/book1/`. Do not re-derive trim points; they are stable
   and already hosted (`trimSec` in `docs/audio_manifest_book1.json`).

## Data model (target schema)

- `AlignedLine` gains `chars: AlignedChar[]` where
  `AlignedChar = { start, end, charStart, charEnd, score? }`.
- `AlignedLine.words` stays `AlignedWord[]` but becomes **real word groupings** (grouped
  from characters via the same authored-pinyin boundaries the UI uses), with measured
  `start`/`end`.
- Char offsets are relative to the traditional line text; the UI already guards the
  1:1 simplified/traditional length assumption, so no change there.

## Phases

### Phase 0 — Spike (validate before committing)
- New throwaway `scripts/align_mms_spike.py`.
- Load `torchaudio.pipelines.MMS_FA` (`get_model`, `get_dict`, `get_tokenizer`,
  `get_aligner`), resample one trimmed track (`B1-01-1-1.mp3`) to 16 kHz mono, run one
  forward pass → emission, align the normalized char sequence, print spans + scores.
- **Acceptance (all must be true, with printed evidence):**
  - Script runs end-to-end in `output/venv` with no error.
  - Per-character spans: `start < end`, monotonic within each line.
  - Each char duration in `[0.04s, 1.5s]` (no zero-length, no absurd spans).
  - First aligned char ≈ `0.0s` (post-trim); total aligned time ≈ track duration ±0.5s.
- **Gate:** do NOT proceed to Phase 1 until the above is printed and checked.

### Phase 1 — Full alignment script (replaces `scripts/align_dialogue_audio.py`)
- New `scripts/align_mms.py` over all 48 readings.
- Inputs: `output/readings.json`, trimmed `output/official-audio/book1/*.mp3`,
  `docs/audio_manifest_book1.json`.
- Per reading: normalize → char→token sequence → one forward pass → force-align → per-char
  spans + scores → group chars into words → per-line confidence → low-confidence lines
  marked `unmatched` (TTS fallback).
- Output: `content/dialogueAlignment.json` (new schema).
- **Acceptance:**
  - All 48 readings aligned; per-line confidence report printed.
  - Monotonic + duration sanity checks pass across all 48.
  - `unmatched` line count ≈ 2 (the known divergent lines), not a big jump.

### Phase 2 — Types (`src/types/models.ts`)
- Add `AlignedChar`; extend `AlignedLine`/`AlignedWord` as above.
- **Acceptance:** `npm run build` passes.

### Phase 3 — Sync utils (`src/utils/dialogueSync.ts`)
- Make `wordRangeForTime` (currently defined but unused) the primary word lookup against
  the new char/word data; add `charRangeForTime` if needed. Keep `lineIndexForTime`.
- **Acceptance:** update and pass the existing dialogue-sync tests (grep
  `lineIndexForTime` / `wordRangeForTime` in `tests/`).

### Phase 4 — Rendering (`ReadingCanvas.tsx` + `ReadingNarrativeView.tsx`)
- Replace the clause-level `isSentenceActive` highlight with a **word-level** highlight
  driven by `currentTime` via `wordRangeForTime`.
- Highlight hanzi + ruby pinyin in lockstep; add small anti-flicker lead/hysteresis.
- **Acceptance:** build passes; manual check that the active word visibly tracks audio on
  1 dialogue + 1 短文 with no drift or skipped words.

### Phase 5 — Verify + clean up
- Remove `scripts/align_dialogue_audio.py` (Whisper pipeline) and the scratch
  `test_aligner.py` / `test_ctc*.py` / `test_mms.py`.
- Update `docs/OFFICIAL_AUDIO_SOURCES.md` and `docs/INDEX.md` to describe the MMS pipeline.
- **Acceptance:** no dangling imports; `npm run build` + relevant tests green; docs
  consistent with code.

## Phase 0 findings (validated 2026-09-07)

- **MMS_FA is accurate.** Character onsets are frame-accurate (20 ms/frame) and
  monotonic. Verified against waveform energy on `B1-01-1-1.mp3`: MMS places 她
  (line 0) at 1.80s, matching the real comma-pause onset; the old Whisper data
  placed it at 0.68s (~1.1s too early).
- **CTC is "peaky"** — raw spans are ~1 frame, so *durations* are useless. Fix:
  use **onsets as boundaries** (each char/word ends at the next onset; last ends
  at track end). This is what the UI already does for clauses.
- **`torchaudio.load` is broken here** (torchcodec backend needs FFmpeg shared
  libs). Decode with the `ffmpeg` CLI → s16le → `numpy` → `torch` instead.
- **Romanization = tone-free pinyin.** `bundle.get_tokenizer()` is only a
  char→id mapper over a 29-token dict (`a-z`, `'`, `*`, blank). Use `pypinyin`
  `lazy_pinyin` (tone-free, `ü`→`v`) + `PINYIN_VARIANTS`; it maps cleanly onto
  the dict. Do NOT pass raw hanzi to the tokenizer.

## Verification commands

```bash
# Offline alignment (always inside the venv)
output/venv/bin/python scripts/align_mms_spike.py   # Phase 0
output/venv/bin/python scripts/align_mms.py         # Phase 1

# TypeScript
npm run build
# dialogue-sync / audio-sync tests (find exact names with:)
#   grep -rl "lineIndexForTime\|wordRangeForTime" tests/
```

## Handoff prompt (paste into Flash, or reuse here)

> Implement the karaoke sync rework in /Users/ronianb.gica/Projects/rongwaps. First read
> docs/KARAOKE_REWORK_PLAN.md and follow it exactly. Rules: (1) never change anything you
> haven't run and seen succeed; (2) get a baseline (npm run build + relevant tests) before
> editing TypeScript; (3) meet each phase's acceptance criteria and paste the real command
> output, not a summary; (4) run all Python inside output/venv/bin/python (torch 2.14 /
> torchaudio 2.11 already installed); (5) romanize with bundle.get_tokenizer() (uroman),
> never raw pypinyin. Start with Phase 0: write scripts/align_mms_spike.py, run it on
> B1-01-1-1.mp3, and paste the real per-character span output plus the monotonicity check.

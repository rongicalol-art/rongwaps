# 時代華語 (Modern Chinese) Official Audio Sources

Research notes (verified 2026-08-28) on where the official audio for the book
series behind RongWaps lives online, per-lesson dialogue tracks, and what
granularity is available. Full machine-readable index: `docs/audio_index_book1.json`.

## The book

- Series: **時代華語 / Modern Chinese** (淡江大學華語中心編著), published by 正中書局.
- Each printed book's **copyright page has a QR code** that links to the cloud
  audio for that book ("可下載雲端MP3音檔", "音檔隨掃隨聽") — the official
  full-book audio is included with the physical book.
- Official audio track naming: `B1-LL-P-T.mp3` — **LL** = lesson, **P** = part,
  **T** = track. This maps 1:1 onto the app's `audioReference` strings
  (`01-1-3` → `B1-01-1-3.mp3`).

## Official online sources (verified links)

### 1. 淡江大學華語中心 — 數位教材試用平臺 (official digital material platform)

- Platform: <https://sites.google.com/clc.tku.edu.tw/modernchinese2022trial>
- English mirror: <https://sites.google.com/clc.tku.edu.tw/modern-chinese>
- Intro on the CLC site:
  <https://www.clc.tku.edu.tw/about/about_publishing/content/01AFB5B398FB79330E4778762AFBF028>
- Contains the official 教材下載 page with per-lesson digital materials
  (slides, worksheets, comics, storybooks, Kahoot, VR360) and the official
  Drive folders below.

### 2. Official Google Drive folders (linked from the platform above)

| Folder | Drive ID | Contents |
|---|---|---|
| 時代華語電子書試閱版 (ebook trial) | `13AaR3zL8Jll2duFxZlo_oQKwANRkqKau` | E-book samples: B1-L1, B1-L2, series intro |
| Book 1 (第一冊 正式版) | `13dDs0muO0B0TCdS_qBiFkv-tx9esbjGW` | Textbook 1 + Workbook 1 |
| Textbook 1 → 2.對話-生詞-語法-短文 | `1gciBRMnoRbNKEmhPCRSjaiOl0DEbcgN7` | **Lesson 1–16 audio**, 8 MP3s per lesson (128 total) |
| Workbook 1 → Listening Tests | `1KJHqwiVHkp2tAF7_IejBSO6kAu2xJIG5` | **Lesson 1–16 listening-test audio** (58 MP3s, `B1-LL-A/B/C/D`) |

Folder URLs use the form
`https://drive.google.com/drive/folders/<ID>`.

### 3. Direct streaming URLs (work without login, verified)

- `https://drive.usercontent.google.com/download?id=<FILE_ID>&export=download`
  → `audio/mpeg`, supports Range requests, sets
  `Content-Disposition: attachment; filename="B1-…mp3"`.
- Every file ID for every track is in `docs/audio_index_book1.json`.

### 4. Other official/licensed channels

- **Printed books (Books 1–4)**: QR code on the copyright page → full-book
  cloud MP3s. This is the official channel for Books 2–4 audio, which is not
  otherwise public online.
- **HyRead ebook 有聲書** (audio-book editions, library-licensed), e.g.
  時代華語 1 作業本 有聲書: <https://hkdemo.hyread.hk/bookDetail.jsp?id=217014>
- Booksellers confirm the cloud-MP3 model, e.g.
  [文鶴 (時代華語4)](https://www.crane.com.tw/crane/index.php?action=product_detail&prod_no=P0116400196651),
  [師大書苑 (時代華語2)](https://www.shtabook.com/product.php?pid=310).

## Track structure per lesson (verified with Lesson 1, durations in seconds)

| Track | Length | Likely content |
|---|---|---|
| `B1-LL-1-1` | 47s | 對話一 Dialogue 1 (full) |
| `B1-LL-1-2` | 133s | 生詞 vocabulary |
| `B1-LL-1-3` | 113s | 語法/句型 grammar examples |
| `B1-LL-2-1` | 32s | 對話二 Dialogue 2 (full) |
| `B1-LL-2-2` | 68s | 生詞 vocabulary |
| `B1-LL-2-3` | 83s | 語法/句型 grammar examples |
| `B1-LL-3-1` | 33s | 短文 reading |
| `B1-LL-3-2` | 115s | 短文/生詞 related |

These match the app's `audioReference` usage: dialogue 1 = `LL-1-1`,
dialogue 2 = `LL-2-1`, grammar pages = `LL-P-3`.

## In-app hosting pipeline (implemented)

- Files are re-encoded to **96 kbps mono MP3** (~70% smaller than the ~320
  kbps stereo originals) and hosted in the existing public `vocabulary-audio`
  Supabase bucket under their official names (`B1-01-1-1.mp3`), so the client
  durable-cache → public URL → `/api/audio` proxy chain serves them with zero
  server changes.
- **對話一 tracks (`B1-LL-1-1.mp3`) are intro-trimmed at the true dialogue
  start.** Every dialogue-1 track opens with ~11s of music followed by a
  SPOKEN lesson title (e.g. 「第一課 新同學 對話一」, ~13–19s) before the
  dialogue. `scripts/align_dialogue_audio.py` finds where line 1 actually
  starts (Whisper + pinyin matching) and re-cuts the file there (keeping
  ~0.8s of pause). Trim points are in `docs/audio_manifest_book1.json`
  (`trimmedIntroSec`) and in the alignment data (`trimSec`).
- **Karaoke alignment**: `scripts/align_dialogue_audio.py` runs
  whisper.cpp `large-v3-turbo` over all 28 readings (L1–14 × 2 dialogues)
  with token timestamps, then matches every authored line to the transcript
  by tone-free pinyin (robust to homophones like 疑問/宜文, script
  differences, stage directions, dropped 兒, and digit readings like
  101→一百零一). Output: `src/data/dialogueAlignment.ts` — per-line and
  per-word time ranges + per-word character offsets (pinyin-mapped) for
  karaoke highlighting. 225/227 lines aligned; the 2 unmatched lines are
  verified audio/data divergences (the recording omits or alters them) and
  fall back to TTS.
- **Reader karaoke UI**: playback bar (play/pause + live progress), current
  line highlight, per-word highlight, and tap-a-line to hear just that line
  (`audioService.playRange`). Missing or failed alignments degrade to
  whole-track playback / TTS.
- Scripts:
  - `scripts/downloadOfficialAudio.mjs` — download from Drive + ffmpeg
    re-encode (no trim; alignment owns trimming).
  - `scripts/align_dialogue_audio.py` — Whisper alignment + intro re-trim +
    manifest update (venv: `output/venv`, model cache:
    `output/whisper-models`).
  - `scripts/uploadOfficialAudio.mjs` — upload `output/official-audio/book1/`
    to `vocabulary-audio` (needs `SUPABASE_SERVICE_ROLE_KEY` in env).
- The audio Cache API is versioned (`rongwaps-audio-v3` in
  `src/services/audioService.ts`): bump it whenever hosted audio changes so
  browsers re-fetch instead of playing stale files.

## Sentence-level audio: does not exist officially

The official set is **track-level only** (one full take per dialogue /
vocabulary / grammar block) — there are no per-sentence files. Options:

1. **Cut the official dialogue tracks** (`LL-1-1`, `LL-2-1`) per sentence using
   silence detection (takes are clean single-take recordings; dialogues run
   30–50s). Requires hosting the derived clips ourselves.
2. Keep the app's existing **TTS pipeline** for per-sentence audio and use
   official tracks only for whole-dialogue playback.
3. Ask 淡江大學華語中心 for per-sentence audio if one exists internally.

## Licensing caveats

- The official Drive folders are published by the 淡江 CLC for **trial /
  classroom use** (the platform asks schools to sign a 合作授權書 for
  redistribution). Hotlinking individual MP3s from the shared folder is fine
  for personal use; a public app that mirrors or re-hosts the files should
  confirm with 淡江大學華語中心 / 正中書局 first.
- Do not republish the audio; prefer streaming from the official URLs or
  serving only to learners who own the book.

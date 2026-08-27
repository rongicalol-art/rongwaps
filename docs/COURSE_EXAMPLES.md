# Course Example Sentences

Flashcard example sentences are shipped as versioned, per-book static JSON packs in
`public/data/course-examples/`. Each record includes the Chinese sentence, pinyin,
English meaning, curriculum location, source card, and extraction provenance.

## Runtime behavior

- `courseExamplePackService.ts` loads and validates the manifest and book packs.
- `vocabularyService.ts` prefers a matching rich static record, then falls back to
  Supabase or the vocabulary pack's Chinese-only example text.
- `courseExamples.ts` ranks the candidates against the learner's current Book,
  Lesson, and Part but never drops them: the exact block match is the highlighted
  Top match, same-lesson sentences are This lesson, earlier curriculum is Previous
  lesson, and anything not yet studied (later books and lessons, e.g. Book 2–4
  sentences on a Book 1 card) appears last as Other lesson.
- The flashcard keeps one fixed size for both faces and fetches examples lazily
  once the back is visible. The back is a scroll container: the answer stays
  centered and every ranked sentence scrolls beneath it in a calm, reference-style
  stream. The exact match leads as a plain row marked with a small star in the
  source book's accent on the left — no frame or label text; everything else
  flows as quiet per-book blocks — plain rows with only a bottom divider, grouped
  by book with no headers (order carries the ranking). Sentence pinyin and the
  B·L meta carry the source book's accent too.

## Matching a word to its sentences

Vocabulary forms are authored with notation, and matching expands it fully:

- `/` means "or": `護理師/護士` searches both, and mixed-script alternatives like
  `臺灣/台灣/台湾` work too.
- `(...)` means "optional": `有(一)點(兒)` expands to every spoken form —
  `有一點兒, 有一點, 有點兒, 有點` (capped at 3 optional groups per form).
- Both raw scripts are searched: cards carry their authored `traditional` and
  `simplified` forms, so a simplified sentence (`老板`) matches a traditional
  card (`老闆`) and vice versa. The display front is a fallback for data that
  only has one form.
- Within a ranked group the sentence using the longest form leads (a `一點兒`
  hit outranks a bare `點` hit), and highlighting uses the same expanded terms
  longest-first.
- Substring matching is deliberate: a short core (點, 事) is still a real word,
  so occurrences inside other words (點心, 同事) are included but sink below
  sentences where the form does real work.

## Book 1 import

Run:

```sh
npm run course-examples:export
```

The importer joins `output/ocr/modern_chinese_1/**/lesson.json` to the production
Book 1 vocabulary pack by curriculum location, explicit and optional vocabulary
variants, meaning, and available Chinese example text. It publishes only unique,
source-reviewed matches that contain Chinese, pinyin, and English. Ambiguous,
unmatched, or `needs-review` entries are excluded and written to
`output/course-examples/book-1-import-report.json` for manual review.

The textbook sometimes gives one example to a grouped set of related entries. The
pack preserves that source association, while runtime lookup shows the sentence
only for words that actually occur in it. A source-verified sentence from the same
Part's Reading supplies the term-specific example for 夏天.

For Lessons 7–10, the importer also publishes visually verified dialogue lines and
aligned Reading sentences as Part-scoped examples. Context extraction accepts
either lesson-wide pinyin verification or the narrower dialogue-and-Reading
verification flag. Raw OCR pinyin is never published for unverified sections.

The OCR source and review report are local generated inputs and are intentionally
ignored by Git. The generated manifest and per-book packs under `public/data/` are
the production artifacts and must be committed.

## Adding another book

Extract its textbook content into the same structured lesson shape, add its
vocabulary pack as an importer input, and publish a separate `book-N.json` entry in
the manifest. Keep the strict join and rejection report: missing translations must
fall back gracefully rather than being guessed or exposed from later lessons.

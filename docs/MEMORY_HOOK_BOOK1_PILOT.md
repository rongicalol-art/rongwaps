# Book 1 Character Memory-Hook Pilot

Status: local development V2 pilot only. No generated hook in this pilot is
publishable while its plan depends on the development-only V3 decomposition
candidate. The existing V3 licensing gate remains unchanged.

## Scope

- Traditional characters from Book 1 lesson vocabulary only.
- 825 vocabulary rows produce 656 unique Traditional Han characters.
- One canonical construction hook per character; lesson-specific vocabulary
  meanings remain separate in the inventory.
- No learner-triggered generation and no whole-word hooks.
- Existing Supabase mnemonic rows are retained but no longer learner-facing.

## Canonical meaning policy

The planner never takes the first vocabulary row blindly.

1. Preserve every standalone Book 1 sense and reading.
2. Split standalone meanings into short gloss candidates.
3. Prefer a lesson gloss that aligns lexically with the earliest matching
   character-dictionary gloss. An unmatched dictionary gloss never overrides a
   matching course sense.
4. If there is one standalone sense and no alignment signal, use that sense.
5. If there is no usable standalone sense, use the dictionary core gloss and
   record that method explicitly.
6. Multiple standalone senses/readings, missing meanings, or dictionary/lesson
   disagreement remain review reasons even when a deterministic selection is
   possible.
7. Sense-specific construction hooks require an explicit later override; the
   pilot does not create them automatically.

## Component-role policy

Component lexicon roles are hints, never target-character facts. A planner may
label a component semantic, phonetic, or visual only when a relationship record
for the exact target character and component contains supporting source
references. Without that relationship evidence, the role is `unclassified`.

Semantic FormationFrames may carry a target-specific `semanticBridge`. This is
only a short, source-backed relationship phrase, not a complete hook sentence:
the deterministic renderer supplies `connects to ... because ...` wording and
the explicit component-to-target pronunciation cue. Missing, mismatched, or
unsupported bridge data leaves the frame in review; it does not create a
NoHookFrame. The current pilot has bridge candidates for 情 and 請, while 媽
remains review-only.

Origin evidence is a separate target-character record. It must match the
canonical meaning and exact planned component keys, cite sources, and be marked
license-cleared. Otherwise the planner cannot label the output as an origin
hook. This prevents a structural decomposition from being presented as
etymology merely because its parts suggest a plausible story.

## Proposed 30-character set

| Character | Category | Selection reason |
| --- | --- | --- |
| 人 | Atomic | Verifies that structure-only data does not trigger an invented origin. |
| 心 | Atomic | High-frequency atomic character and component-family root. |
| 女 | Atomic | Atomic character that recurs inside common Book 1 characters. |
| 好 | Canonical meaning | Contrasts canonical “good” with the lesson-specific intensifier “very.” |
| 點 | Canonical meaning | Two lesson senses and a non-obvious 黑 + 占 structure. |
| 過 | Canonical meaning | Three standalone uses, including a grammatical particle. |
| 了 | Canonical meaning | Several grammatical senses with little useful component semantics. |
| 坐 | Canonical meaning | Tests canonical “sit” versus the transport usage. |
| 情 | Common pattern | No standalone entry; tests dictionary fallback and the 青 family. |
| 請 | Common pattern | Two lesson meanings plus 言 + 青. |
| 媽 | Common pattern | Tests relationship-specific handling of 女 + 馬. |
| 喝 | Common pattern | Common 口 pattern with a potentially misleading second component. |
| 吃 | Common pattern | Compact 口 + 乞 structure. |
| 休 | Common pattern | Natural 亻 + 木 baseline for concise wording. |
| 明 | Common pattern | Transparent 日 + 月 structure. |
| 問 | Common pattern | Tests spatial wording for 門 + 口 without historical claims. |
| 語 | Common pattern | Tests an encoded sound-family component without role evidence. |
| 學 | Encoded intermediate | Direct child 𦥯 is expandable; tests deliberate depth. |
| 愛 | Encoded intermediate | Direct rare glyph 𢖻 catches arbitrary flattening to 心. |
| 新 | Encoded intermediate | Direct structure 亲 + 斤 challenges the tree-and-axe story. |
| 說 | Encoded intermediate | Tests whether unsupported 言/兌 roles are withheld. |
| 聽 | Encoded intermediate | Three direct components including rare 𢛳. |
| 不 | Data edge | Contains a source-confirmed unencoded component. |
| 在 | Data edge | Unencoded component plus multiple lesson meanings. |
| 年 | Data edge | Unknown component must not receive an invented label. |
| 非 | Data edge | Both direct components are unknown. |
| 長 | Data edge | Five direct components including an unencoded shape. |
| 慶 | Data edge | Six direct components and a rare expandable glyph. |
| 旅 | Data edge | Three direct parts including an unencoded shape. |
| 飛 | Data edge | Variant glyphs surround an unknown component. |

This set intentionally includes characters that should be withheld from AI
generation. A safe automatic system must demonstrate that it can decline bad
inputs, not merely produce thirty fluent sentences.

## Generation gate

`npm run memory-hooks:prepare` makes no network calls. It writes ignored local
inventory, V2 plans, component profiles, evidence slots, and the pilot
selection under `output/memory-hooks/`.

`npm run memory-hooks:generate:pilot -- --execute --pilot-approved
--retry-invalid --retry-scene-style` is separately gated. It reads exactly the
12 V2 quality plans, renders Formation/Origin frames locally, sends only Scene
frames to DeepSeek, and leaves the two `no-useful-hook` plans withheld. Scene
retries are bounded at three attempts. It writes V2 draft candidates without
logging secrets. The current environment uses direct DeepSeek with
`deepseek-v4-flash`; the key is never printed. Existing V1 candidate artifacts
remain untouched for comparison.

`npm run memory-hooks:critic:pilot -- --execute --pilot-approved` runs the
optional style lint/critic against Scene candidates only. Formation and Origin
records are marked not applicable because their prose is deterministic.

For a deliberate controlled rerun of the same pilot, add
`--force-regenerate`. The generator snapshots the previous local V2 candidate
artifact before replacing it; this flag does not expand the plan or publish
anything.

## Latest V2 run

The controlled hybrid rerun made three DeepSeek calls for 點, 喝, and 吃, and
four deterministic renders for 坐, 情, 請, and 媽. It produced 10
deterministic-valid candidate records and 2 intentional no-hook outcomes. The
scene critic marked all six scene records clean; the benchmarks remain fixed
reviewed strings, not model variants. No scene needed a retry.

All scene candidates and relationship evidence remain development artifacts.
Scenes still need human approval, and the formation evidence remains
review-required. They are not learner-facing or publishable.

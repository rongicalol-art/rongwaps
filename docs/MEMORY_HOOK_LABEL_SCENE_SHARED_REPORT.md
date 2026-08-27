# Memory-Accept the strict Scene-viability v2 behavior as the current baseline.
Do not generate Scene hooks yet except possibly one isolated 家 test later.
Next, design a frame-recovery pass for frozen characters that are:
scene-not-useful
scene-weak
blocked by missing direct-component labels
The recovery pass should inspect existing Phase 4 decomposition hierarchy and existing metadata only. It may propose:
direct Scene frame
one-level pedagogical expansion
grouped intermediate component
Formation candidate requiring reviewed semantic/phonetic evidence
Origin candidate requiring reviewed source evidence
NoHook
It must not invent:
component meanings
semantic roles
phonetic roles
historical claims
target-specific bridges
For each target, show:
current direct frame
why Scene failed or was blocked
available alternate decomposition depths
candidate pedagogical frame(s)
what additional evidence/metadata would be required
whether the character should remain withheld if no safe frame exists
Prioritize these frozen examples:
哥、男、的、課、買、開、學、愛、新、看、語、得、比、會
Do not change planner behavior yet.
Do not call DeepSeek.
Do not generate hooks.
Do not publish anything.
Keep all outputs development-only and publishable:false.
I want to see whether alternate structure or Formation/Origin routes can rescue characters that the strict Scene gate correctly rejects.hook metadata and Scene-viability review

This is a shareable review brief for another AI or human reviewer. It combines the current component-label decisions with the prepared target-specific Scene-viability inputs.

## Status and scope

- Book: 1, Traditional Chinese.
- Frozen evaluation batch: 47 characters.
- Selected labels reviewed in this pass: 19.
- Global labels manually approved in the development-only review layer: 14.
- Global labels still under review: 5.
- Target characters affected by those labels: 15.
- Scene-viability targets and requests prepared: 15.
- Scene-viability requests executed: 7 (`ready` targets only).
- Scene-viability requests not called: 8 (`pending-global-label-review` or structurally blocked).
- Hooks generated: 0.
- API calls in the label-proposal pass: 27.
- API calls in the Scene-viability pass: 7.
- Production or pilot data changed: no.
- Publishable: false.
- V3-derived data remains development-only and blocked from publication.

The important separation is:

```text
global component label approval
        ≠
usefulness of that label in a particular target character
```

A globally approved label says only that the glyph may safely be shown with that learner-facing label. It does not assert that the component is semantic, phonetic, historically related, or useful in any particular character.

## Source artifacts

- Global-label review layer: `output/memory-hooks/book-1-component-label-review-v1.json`
- Global-label review table: `output/memory-hooks/book-1-component-label-review-v1.md`
- Frozen Scene-viability packet: `output/memory-hooks/book-1-frozen-47-scene-viability-packet-v1.json`
- Frozen Scene-viability table: `output/memory-hooks/book-1-frozen-47-scene-viability-packet-v1.md`
- Scene-viability results: `output/memory-hooks/book-1-frozen-47-scene-viability-results-v1.json`
- Scene-viability results table: `output/memory-hooks/book-1-frozen-47-scene-viability-results-v1.md`
- DeepSeek proposal telemetry: `output/memory-hooks/book-1-frozen-47-component-label-proposals-v1.json`
- Frozen 47 manifest: `output/memory-hooks/book-1-evaluation-batch-47-manifest.json`
- Frozen 47 quality plans: `output/memory-hooks/book-1-evaluation-batch-47-quality-plans-v2.json`

## 1. Global component-label review

These are metadata decisions only. They do not assign target-specific roles.

### Manually approved in the development-only review layer

| Glyph | Approved learner label | Raw definitions supplied | Readings | Affected target(s) | Approval note |
|---|---|---|---|---|---|
| 亼 | assemble | to assemble; to gather together | jí | 會 | Exact supplied candidate. |
| 力 | strength | strength; power; capability; influence | lì | 男 | Exact supplied candidate. |
| 勺 | spoon | spoon; ladle; unit of volume | sháo | 的 | Exact supplied candidate. |
| 可 | can | may; can; -able; possibly | kě | 哥 | Exact supplied candidate. |
| 宀 | roof | roof; house | gài, mián | 家 | Exact supplied candidate. |
| 开 | open | to open; to start; to initiate; to begin | kāi | 開 | Exact supplied candidate. |
| 彳 | step | to step with the left foot | chì | 得 | Manual concise simplification of “step with the left foot”. |
| 果 | fruit | fruit; nut; result | guǒ | 課 | Exact supplied candidate. |
| 田 | field | field; farm; arable land; cultivated | tián | 男, 畫 | Exact supplied candidate. |
| 白 | white | white; clear; pure; unblemished; bright | bái | 的 | Exact supplied candidate. |
| 目 | eye | eye; to look; to see; division; topic | mù | 看 | Exact supplied candidate. |
| 罒 | net | net; network | wǎng | 買 | Exact supplied candidate. |
| 豕 | pig | pig; boar | shǐ | 家 | Exact supplied candidate. |
| 貝 | shell | sea shell; money; currency | bèi | 買 | Manual concise simplification of “sea shell”. |

### Still under global review

These labels were selected by the proposal run but are not approved for use as global learner labels yet.

| Glyph | Provisional label | Raw definitions supplied | Reading | Affected target(s) | Why still under review |
|---|---|---|---|---|---|
| 㝵 | obtain | to obtain; to get; to acquire; ancient form of 得 | dé | 得 | Multiple senses include a historical/variant note. |
| 匕 | spoon | spoon; ladle; knife; dirk | bǐ | 比 | Several materially different concrete senses. |
| 吾 | I | I; my; our; to resist; to impede | wú | 語 | Pronoun and verb senses compete. |
| 广 | building | broad; vast; wide; building; house | guǎng | 慶 | Spatial/abstract senses and building/house senses compete. |
| 飞 | fly | to fly; to dart; high | fēi | 飛 | Verb, motion, and adjective senses compete. |

No label was approved for `壬`; its proposal was rejected by deterministic safety validation because “9th heavenly stem” is technical rather than a useful general learner label.

## 2. Target-specific Scene-viability evaluation

The packet was prepared for 15 targets. Only the 7 `ready` targets were sent to DeepSeek. The 3 pending-label targets and 5 structurally blocked targets were not called.

The evaluator is allowed to return only:

- `scene-viable`
- `scene-weak`
- `scene-not-useful`

It must provide a short pedagogical reason, but it must not write the hook itself.

It must not infer:

- semantic or phonetic roles;
- sound relationships;
- historical relationships, etymology, or origins;
- decomposition changes;
- unsupported component meanings;
- target-specific facts from the target character merely because a component appears there.

The packet marks every component with both its global label status and whether it is available for the viability assessment. A pending or missing label is not silently treated as approved.

### Gate summary

| Gate | Targets | Meaning |
|---|---|---|
| ready | 哥, 家, 男, 的, 課, 買, 開 | All direct visible component occurrences have labels available from the reviewed layer or existing approved lexicon. The viability question can be assessed without changing structure. |
| pending-global-label-review | 得, 比, 語 | A required component has a provisional label that is not globally approved. Viability should wait for that label decision. |
| blocked-missing-label-or-structure | 慶, 會, 畫, 看, 飛 | At least one required component is missing, unknown, unresolved, or the frozen plan has an excessive direct-component structure. |

### Prepared target inputs

`[approved]` means globally approved for this development-only review layer or already present in the existing approved component lexicon. `[pending]` means a proposal exists but is not globally approved. `[missing]` means no usable label is supplied.

| Target | Frozen canonical meaning | Direct visible components supplied | Gate | Frozen blocker summary |
|---|---|---|---|---|
| 哥 | elder brother | 可(can) `[approved]` + 可(can) `[approved]` | ready | Original plan lacked a label for 可. |
| 家 | house | 宀(roof) `[approved]` + 豕(pig) `[approved]` | ready | Original plan lacked labels for 宀 and 豕. |
| 得 | complement marker | 彳(step) `[approved]` + 㝵(obtain) `[pending]` | pending-global-label-review | 㝵 remains globally unresolved. |
| 慶 | congratulate | 广(building) `[pending]` + コ `[missing]` + 丨 `[missing]` + 丨 `[missing]` + 乛 `[missing]` + 𢖻 `[missing]` | blocked-missing-label-or-structure | Too many direct components plus several missing labels. |
| 會 | assemble | 亼(assemble) `[approved]` + 𭥴 `[missing]` | blocked-missing-label-or-structure | 𭥴 has no usable metadata. |
| 比 | than | 匕(spoon) `[pending]` + 匕(spoon) `[pending]` | pending-global-label-review | 匕 has several competing senses; repeated occurrence is preserved. |
| 男 | male | 田(field) `[approved]` + 力(strength) `[approved]` | ready | Original plan lacked labels for 田 and 力. |
| 畫 | painting (M: 張) | 𦘒 `[missing]` + 一(one) `[approved]` + 田(field) `[approved]` + 一(one) `[approved]` | blocked-missing-label-or-structure | 𦘒 is unencoded in the label layer; target meaning still contains the frozen classifier note. |
| 的 | possessive particle | 白(white) `[approved]` + 勺(spoon) `[approved]` | ready | Original plan lacked labels for 白 and 勺. |
| 看 | to look | 龵 `[missing]` + 目(eye) `[approved]` | blocked-missing-label-or-structure | 龵 has no usable metadata. |
| 語 | words | 言(speech) `[approved]` + 吾(I) `[pending]` | pending-global-label-review | 吾 has competing pronoun and verb senses. |
| 課 | subject | 言(speech) `[approved]` + 果(fruit) `[approved]` | ready | Original plan lacked a label for 果. |
| 買 | buy | 罒(net) `[approved]` + 貝(shell) `[approved]` | ready | Original plan lacked labels for 罒 and 貝. |
| 開 | open | 門(door) `[approved]` + 开(open) `[approved]` | ready | Original plan lacked a label for 开. |
| 飛 | fly | 飞(fly) `[pending]` + unknown component `[missing]` + 飞(fly) `[pending]` | blocked-missing-label-or-structure | Unknown direct component plus unresolved global label for 飞. |

### Executed viability results

These are model assessments only. They do not approve a hook, a role, a relationship, or publication.

| Target | Decision | Reason summary | Deterministic status | Interpretation |
|---|---|---|---|---|
| 哥 | `scene-weak` | Two `can` labels do not directly evoke elder brother; connection would stretch. | Needs review: model set `unsupportedInference: true`. | Do not generate from this assessment yet. |
| 家 | `scene-viable` | `roof` + `pig` can support a simple pig-under-a-roof house scene. | Valid assessment. | Best current candidate for a later scene-writing test. |
| 男 | `scene-viable` | `field` + `strength` can support a simple scene associated with male. | Valid assessment. | Human review still needed; the connection may be generic. |
| 的 | `scene-weak` | `white` + `spoon` do not naturally support the abstract possessive-particle meaning. | Needs review: model set `unsupportedInference: true`. | Withhold unless a better target-specific plan is found. |
| 課 | `scene-viable` | `speech` + `fruit` can support a scene involving discussion of fruit. | Valid assessment. | Human review needed; check whether canonical meaning `subject` is the right learner target. |
| 買 | `scene-viable` | `net` + `shell` can support a buying-associated scene. | Valid assessment. | Human review needed; the target connection is indirect. |
| 開 | `scene-viable` | `door` + `open` directly supports opening a door. | Valid assessment. | Human review needed; the `open` component risks a tautological hook. |

### Viability result counts

- `scene-viable`: 5 model assessments (`家、男、課、買、開`).
- `scene-weak`: 2 model assessments (`哥、的`).
- Deterministically valid assessments: 5.
- Needs review after deterministic checks: 2.
- Hooks generated: 0.
- Labels or target-specific roles auto-approved: 0.

The evaluator is intentionally only a gate. A valid `scene-viable` result means “the supplied labels might support a natural invented scene”; it does not mean the eventual prose will be concise, vivid, non-tautological, or worth publishing. In particular, `開`, `買`, `男`, and `課` deserve human scrutiny before any Scene generation.

The complete raw model responses, parsed JSON, immutable request packets, packet hashes, and deterministic validation results are stored in `book-1-frozen-47-scene-viability-results-v1.json`.

### Strict viability rerun (v2)

The same seven ready targets were rerun with a stricter evaluator contract. The planner, labels, frozen packet, Formation/Origin logic, and hook-generation prompts were not changed. No hooks were generated and no target-specific relationship was approved.

| Target | Previous decision | Strict decision | Strict issue codes | Strict validation | Assessment |
|---|---|---|---|---|---|
| 哥 | `scene-weak` | `scene-not-useful` | `arbitrary-target-connection`, `unsupported-extra-assumption` | Needs review: connection omitted glyphs in the required direct-connection sentence. | Repetition of `可(can)` does not explain elder brother. |
| 家 | `scene-viable` | `scene-viable` | none | Valid | `宀(roof)` covering `豕(pig)` gives a direct sheltered-dwelling image. |
| 男 | `scene-viable` | `scene-not-useful` | `arbitrary-target-connection`, `unsupported-extra-assumption` | Needs review: connection omitted glyphs in the required direct-connection sentence. | `田(field)` + `力(strength)` does not inherently indicate male without stereotype. |
| 的 | `scene-weak` | `scene-not-useful` | `abstract-target-mismatch`, `arbitrary-target-connection` | Needs review: connection omitted glyphs in the required direct-connection sentence. | `白(white)` + `勺(spoon)` does not explain a possessive particle. |
| 課 | `scene-viable` | `scene-not-useful` | `abstract-target-mismatch`, `weak-causal-link` | Needs review: connection omitted glyphs in the required direct-connection sentence. | `言(speech)` + `果(fruit)` does not make “subject” intuitive. |
| 買 | `scene-viable` | `scene-weak` | `weak-causal-link` | Needs review: connection omitted glyphs in the required direct-connection sentence. | `罒(net)` + `貝(shell)` only suggests an indirect exchange scenario. |
| 開 | `scene-viable` | `scene-weak` | `tautological` | Valid | `开(open)` repeats the target; `門(door)` adds context but little independent teaching value. |

Strict counts: 1 `scene-viable`, 2 `scene-weak`, and 4 `scene-not-useful`. The strict run made 7 calls and kept the other 8 entries gated. The five “needs review” validation statuses are schema-level flags because DeepSeek explained the labels in prose but did not repeat the glyphs there; the raw response, parsed JSON, and exact packet are retained for review. This does not weaken the stricter issue-code decisions.

Full strict telemetry: `output/memory-hooks/book-1-frozen-47-scene-viability-results-v2.json`.

Strict readable report: `output/memory-hooks/book-1-frozen-47-scene-viability-results-v2.md`.

v1/v2 comparison: `output/memory-hooks/book-1-frozen-47-scene-viability-comparison-v1-v2.md`.

## 3. What another AI should analyze

Please treat the tables above as evidence and keep the following boundaries:

1. Which of the 14 global approvals are genuinely safe as general learner labels? Identify any that should be reverted to review despite the manual approval.
2. Are `彳 → step` and `貝 → shell` acceptable controlled simplifications, or should the schema retain a more explicit learner-facing note?
3. For the five pending labels, what additional metadata would resolve the ambiguity without inventing a meaning?
4. Among the seven `ready` targets, which pairs of supplied labels plausibly support a natural invented scene for the target meaning, and which are likely `scene-weak` or `scene-not-useful`?
5. Which targets are blocked for a genuinely structural reason versus merely missing a label?
6. Does a repeated component such as `可 + 可` in 哥 or `匕 + 匕` in 比 need a special scene-viability rule, even when the global label is approved?
7. Are any canonical target meanings pedagogically unsuitable for a scene because they are grammatical particles or abstract function words (`的`, `得`, `語` as currently selected)?
8. Should target-specific viability be assessed only after every direct component has a globally approved label, or may a provisional label be assessed separately while remaining unusable for publication?
9. Which missing components should be solved through a deeper pedagogical decomposition rather than a new global label (`𭥴`, `𦘒`, `龵`, `𢖻`, and the unknown node in 飛)?
10. Does the current three-way viability scale need a fourth status such as `not-assessable-yet` for pending labels and unresolved structures, or is the separate gate field sufficient?

## 4. Non-goals and safety constraints

- This report does not approve target-specific semantic or phonetic roles.
- It does not claim that any decomposition is historical etymology.
- It does not generate or publish hooks.
- It does not change the frozen 47 results.
- Formation and Origin evidence requirements remain unchanged.
- Scene viability, if later executed, must remain a separate assessment from global label approval.

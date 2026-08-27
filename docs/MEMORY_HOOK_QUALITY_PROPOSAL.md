# Memory-Hook V2 Quality Architecture

Status: approved hybrid pilot foundation, with deterministic Formation/Origin
rendering and Scene-only DeepSeek generation exercised on the current
12-character review set. This does not approve publication, production writes,
or expansion beyond the current Book 1 pilot.

## Design decision

Use two small layers instead of a hierarchy of raw senses, learner labels,
reading labels, visual labels, and role records:

1. `ComponentProfile` stores raw dictionary facts and a short list of reusable,
   manually approved default meaning labels.
2. `PlannedComponentUse` stores the exact target-specific choice: occurrence,
   display label, label basis (`meaning`, `reading`, or `visual`), role, and
   relationship evidence.

Formation evidence may additionally carry a `TargetSemanticBridge`: a short,
source-backed relationship phrase such as `feelings and emotions are
associated with the heart`. The bridge stores target/occurrence identity and
provenance, but never learner-facing sentence prose. The deterministic renderer
owns the final wording and pronunciation cue. A missing or malformed bridge
keeps the FormationFrame reviewable; it never becomes `none` automatically.

This keeps raw metadata separate from learner-facing text without creating a
global visual-label dictionary. A visual label such as `从(two people)` belongs
only to the reviewed 坐 plan. Component roles are also target-specific; profiles
contain no globally fixed semantic or phonetic role.

## Hook frames

Every character receives one reviewed frame:

- `origin`: a sourced historical claim with explicit licensing status. Its
  historical components may differ from the modern structural decomposition;
  the curated claim is rendered without an AI prose rewrite.
- `formation`: supported target/component semantic, phonetic, or visual
  relationships rendered from deterministic role templates. Visual relations
  may carry a target-specific render hint such as 坐’s evidence-backed
  `sit-on` relation.
- `scene`: an invented mnemonic using the supplied components and optional,
  explicitly declared scene props; this is the only frame sent to DeepSeek.
- `none`: an intentional outcome when available structure does not yield a
  useful beginner hook.

All Book 1 scene hooks require human approval. Formation and origin frames may
become ready only when their exact evidence slots are verified, useful for a
modern beginner, and license-cleared. The V3 decomposition remains a
development-only structural input and is not publishable.

## Meaning policy

The hook has one canonical construction meaning per character. Selection is
deterministic:

1. Prefer a core dictionary gloss that aligns with a character-level Book 1
   entry.
2. When several course senses exist, prefer the core sense that best explains
   the construction; retain all lesson-specific senses separately.
3. Use a dictionary-only core gloss at low confidence when Book 1 contains the
   character only inside words.
4. Flag ambiguity, reading variation, and likely Traditional/Simplified
   metadata collisions for review.

This fixed the 裡 case: the optional course form `裡（面）` is recognized as a
character entry and selects `inside`, rather than inheriting the colliding 里
metadata gloss `unit of distance`.

## Quality gates

Truth and formatting remain deterministic. The validator checks:

- the exact decomposition occurrence IDs, including repeated components;
- every supplied component exactly once in `字(label)` form;
- the reviewed target token exactly once;
- no unplanned Han glyphs or changed meaning;
- no historical language outside an origin frame;
- exact evidence references;
- semantic bridges must match the target and semantic occurrence, contain a
  short source-backed relationship phrase, and never contain unplanned
  component/target tokens or a rendered sentence;
- one concise sentence, currently capped at 32 space-delimited words;
- declared mnemonic props are plain scene objects and appear in the hook;
- no malformed token grammar such as `乞(beg)s`.

Formation and Origin candidates do not use the style model: their prose is
deterministic and their factual validator/evidence gates remain authoritative.
For Scene candidates, deterministic style lint and an optional AI critic may
reject or flag awkward, vague, tautological, or boring prose, but they cannot
approve facts, change the plan, or silently rewrite the hook. The scene gate
requires one immediate causal/spatial aha, rejects template or logic-puzzle
wording, and allows only a bounded retry budget before leaving the candidate in
style review. Human review remains the final gate for scene hooks.

A useful hook must expose one clear `ahaConnection`: either a concrete scene or
a supported formation relationship. Merely naming the components and target is
not sufficient.

## Current 12-character review set

| Target | Frame | Status | Decision |
| --- | --- | --- | --- |
| 休 | scene | ready | Approved benchmark: `亻(person)` rests against `木(tree)`. |
| 明 | scene | ready | Approved benchmark: `日(sun)` and `月(moon)` create light. |
| 問 | scene | ready | Approved benchmark: `口(mouth)` calls through `門(door)`. |
| 點 | scene | candidate | Target-specific `占(takes a spot)` label; currently needs style review. |
| 喝 | scene | candidate | A cup may be an explicit mnemonic prop, never a component meaning. |
| 吃 | scene | candidate | Use a grammatical food-begging scene; avoid `乞(beg)s`. |
| 坐 | formation | candidate | Target-only `从(two people)` over `土(ground)`, pending evidence clearance. |
| 情 | formation | candidate | `忄(heart)` semantic and `青(qīng)` phonetic, pending clearance. |
| 請 | formation | candidate | `言(speech)` semantic and `青(qīng)` phonetic, pending clearance. |
| 媽 | formation | candidate | `女(woman)` semantic and `馬(mǎ)` phonetic, pending clearance. |
| 好 | none | no useful hook | Avoid an unsupported or culturally loaded `woman + child = good` claim. |
| 說 | none | no useful hook | The historical `兌(duì)` sound role is not useful for beginner `shuō`. |

Evidence slots for 坐, 情, 請, 媽, and 說 remain `candidate` and
`review-required`. Their source links are research pointers, not cleared data
for production publication.

## Scaling to all Book 1 characters

Do not curate all 522 direct component glyphs. Most are rare and many raw
definitions are multi-gloss. Curate on demand in this order:

1. reusable labels for frequent components;
2. exact evidence for high-value formation/origin frames;
3. human review of generated scene candidates;
4. `none` for genuinely weak cases.

Automation can safely build inventories, detect structural/data blockers,
choose high-confidence canonical meanings, assemble immutable plans, generate
candidates, render supported formation/origin frames, and run validators. Humans
should approve target-specific visual relations, evidence interpretation, scene
hooks, and publication.

## Current gate

The controlled hybrid rerun made three DeepSeek calls for 點, 喝, and 吃, and
four deterministic renders for 坐, 情, 請, and 媽. The three benchmarks stayed
fixed, while 好 and 說 remained intentional no-hook outcomes. All ten candidate
records pass deterministic validation; the scene critic marks all six scene
records clean, while formation records are not style-critiqued. Evidence slots
for 坐, 情, 請, and 媽 remain candidate/review-required. The next deterministic
formation render will use bridge candidates for 情 and 請; 媽 remains missing a
semantic bridge and review-only. No output is publishable, and the remaining
Book 1 characters must not be generated until this pilot is reviewed.

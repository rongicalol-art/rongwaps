# Book 1 V2 Memory-Hook Pilot Results

Development-only review artifact. These drafts are not learner-facing,
publishable, or approved for production. The V3 decomposition licensing gate
remains active.

Generator: `deepseek-v4-flash` via the existing direct DeepSeek configuration.
Prompt: `book1-pilot-hybrid-v1`. Style critic: `book1-style-critic-v1`, scene
candidates only, with deterministic style preflight.

## Controlled hybrid rerun

- 12 reviewed plans.
- 4 deterministic renders (坐, 情, 請, 媽), with zero provider calls.
- 3 DeepSeek scene calls (點, 喝, 吃); all completed in one attempt, so no
  scene retry was needed.
- 3 fixed benchmark scenes (休, 明, 問) and 2 intentional no-hook outcomes
  (好, 說) were not sent to the model.
- 10 candidate records pass deterministic validation; no deterministic rejects.
- Scene-only style preflight and critic: all 6 scene records are clean,
  including the three benchmarks; formation records are not style-critiqued.
- Formation evidence for 坐, 情, 請, 媽 remains candidate and license-review-required.
- `publishable` remains `false`; nothing was written to production.

The table below is the source-of-truth comparison for this controlled run. The
exact human-edited sentences discussed earlier were not supplied to DeepSeek as
expected outputs. `Ready` means ready as a reviewed benchmark or deterministic
candidate after its evidence gate; scene candidates still need human approval.

| Character | Route / retry count | Hook or decision | Validator | Scene style lint / critic | Readiness |
| --- | --- | --- | --- | --- | --- |
| 好 | No API | — | Invalid: intentional `no-useful-hook-frame` | n/a | Withheld; no neutral, non-tautological connection yet. |
| 點 | Scene / 1 attempt | `A 黑(black) mark 占(takes a spot) on paper, making a 點(dot).` | Valid; no issues | Clean / style-clean | Review-needed: good spot-to-dot image, but still needs human scene approval and slightly more natural wording. |
| 坐 | Deterministic / 0 | `Here, 从(two people) sit on 土(ground)—a clear picture of 坐(sit).` | Valid; no issues | Not applicable | Review-needed: target-specific visual evidence and licensing are not cleared. |
| 情 | Deterministic / 0 | `忄(heart) gives the meaning clue, while 青(qīng) hints at the sound of 情(emotion).` | Valid; no issues | Not applicable | Review-needed: evidence and licensing are not cleared; prose itself is stable. |
| 請 | Deterministic / 0 | `言(speech) gives the meaning clue, while 青(qīng) hints at the sound of 請(invite).` | Valid; no issues | Not applicable | Review-needed: evidence and licensing are not cleared; prose itself is stable. |
| 媽 | Deterministic / 0 | `女(woman) gives the meaning clue, while 馬(mǎ) hints at the sound of 媽(mother).` | Valid; no issues | Not applicable | Review-needed: evidence and licensing are not cleared; prose itself is stable. |
| 喝 | Scene / 1 attempt | `A cup tips toward 口(mouth), and 曷(what) quietly cues the action, so 喝(drink) happens.` | Valid; no issues | Clean / style-clean | Review-needed: much better physical action, but “quietly cues the action” is still somewhat abstract. |
| 吃 | Scene / 1 attempt | `The 口(mouth) must 乞(beg) for food before it can 吃(eat).` | Valid; no issues | Clean / style-clean | Review-needed: concise causal scene; retain human review because it is still a mnemonic, not etymology. |
| 休 | Fixed benchmark / 0 | `亻(person) rests against 木(tree)—that scene is 休(rest).` | Valid; no issues | Clean / style-clean | Ready benchmark. |
| 明 | Fixed benchmark / 0 | `日(sun) and 月(moon) fill the sky with light: 明(bright).` | Valid; no issues | Clean / style-clean | Ready benchmark. |
| 問 | Fixed benchmark / 0 | `A 口(mouth) calls through a 門(door) to 問(ask a question).` | Valid; no issues | Clean / style-clean | Ready benchmark. |
| 說 | No API | — | Invalid: intentional `no-useful-hook-frame` | n/a | Withheld; 兌(duì) remains an unhelpful beginner sound cue for shuō. |

No OriginFrame occurs in this 12-character pilot. The deterministic origin
renderer is covered by a unit test and conservatively requires a curated claim
that already contains the exact component and target `字(label)` tokens; it never
falls back to DeepSeek or invents historical wording.

The critic remains advisory for scene prose quality. The deterministic validator
remains the authority for components, roles, evidence, and licensing.

## Earlier V2 history (retained)

The following section records pre-hybrid runs for comparison; it is not the
current candidate output.

| Character | Status | Hook or decision |
| --- | --- | --- |
| 好 | No useful hook | `女(woman) + 子(child)` is withheld as tautological/culturally risky. |
| 點 | Style review | `In a scene, 黑(black) makes a 點(dot) that 占(takes a spot) on the page.` |
| 坐 | Style review; evidence pending | `Two people 从(two people) sit on the ground 土(ground): 坐(sit).` |
| 情 | Style review; evidence pending | `忄(heart) feels 青(qīng) as 情(emotion).` |
| 請 | Style review; evidence pending | `To 請(invite), you use 言(speech) to say words that cue the sound of 青(qīng).` |
| 媽 | Style review; evidence pending | `媽(mother) is 女(woman) plus 馬(mǎ), which cues the sound.` |
| 喝 | Style clean | `With 口(mouth) at a cup, 曷(what) asks what you 喝(drink)?` (`cup` is an explicit mnemonic prop.) |
| 吃 | Style clean | `When you 吃(eat), your 口(mouth) opens to 乞(beg) for food.` (`food` is an explicit mnemonic prop.) |
| 休 | Benchmark clean | `亻(person) rests against 木(tree)—that scene is 休(rest).` |
| 明 | Benchmark clean | `日(sun) and 月(moon) fill the sky with light: 明(bright).` |
| 問 | Benchmark clean | `A 口(mouth) calls through a 門(door) to 問(ask a question).` |
| 說 | No useful hook | The historical `兌(duì)` sound relationship is not useful for beginner `shuō`. |

## What the gates mean

`deterministic-clean` means the draft uses the exact planned occurrence IDs and
`字(label)` tokens, preserves the canonical meaning and evidence references,
contains no unsupported historical wording, and obeys the sentence/length
rules. It does not mean the draft is approved for learners.

`style-clean` means the optional critic found a concrete or supported aha
connection and no style objection. Scene hooks still require human approval;
formation hooks still require evidence and licensing clearance.

## Strict local style re-evaluation

The first AI critic was too permissive for the requested tone. A stricter
no-API preflight now requires read-aloud naturalness, one immediate causal or
spatial aha, a consequence-oriented target placement, and no template or
logic-puzzle wording. For semantic-plus-phonetic formation frames it requires
an explicit meaning clue and sound cue.

This stricter pass keeps the three benchmarks and proposes these revisions for
the other seven drafts. These are proposals only; they have not been sent to
DeepSeek or published. Every proposed string passes the existing deterministic
fact/format validator.

| Character | Current draft | Proposed revision | Reason |
| --- | --- | --- | --- |
| 點 | `In a scene, 黑(black) makes a 點(dot) that 占(takes a spot) on the page.` | `A 黑(black) mark claims one precise place—占(takes a spot)—and becomes a tiny 點(dot).` | Remove filler and make the spot-to-dot image causal. |
| 坐 | `Two people 从(two people) sit on the ground 土(ground): 坐(sit).` | `Here, 从(two people) sit on 土(ground)—that seated pair is 坐(sit).` | Contextualize the target-only visual label and use one spatial action. |
| 情 | `忄(heart) feels 青(qīng) as 情(emotion).` | `忄(heart) gives the meaning clue, while 青(qīng) hints at the sound of 情(emotion).` | State the semantic and phonetic relationship directly. |
| 請 | `To 請(invite), you use 言(speech) to say words that cue the sound of 青(qīng).` | `言(speech) gives the meaning clue, while 青(qīng) hints at the sound of 請(invite).` | Remove the template opening and make both roles explicit. |
| 媽 | `媽(mother) is 女(woman) plus 馬(mǎ), which cues the sound.` | `女(woman) gives the meaning clue, while 馬(mǎ) hints at the sound of 媽(mother).` | Remove A + B wording and put the target at the consequence. |
| 喝 | `With 口(mouth) at a cup, 曷(what) asks what you 喝(drink)?` | `口(mouth) wonders “曷(what) is in the cup” and opens to 喝(drink).` | Replace the question puzzle with one spatial/causal action; retain `cup` as a prop. |
| 吃 | `When you 吃(eat), your 口(mouth) opens to 乞(beg) for food.` | `口(mouth) has to 乞(beg) for food before it can 吃(eat).` | Remove the template opening and make the causal sequence immediate. |

The local review artifact is `output/memory-hooks/book-1-pilot-style-proposals-v2.json`; it records `apiCallsMade: 0` and is not publishable.

The machine-readable artifacts are ignored local files under
`output/memory-hooks/`:

- `book-1-pilot-quality-plans-v2.json`
- `book-1-pilot-candidates-v2.json`
- `book-1-pilot-validation-v2.json`
- `book-1-pilot-style-reviews-v2.json`

No prompt or candidate from the older V1 artifact was overwritten.

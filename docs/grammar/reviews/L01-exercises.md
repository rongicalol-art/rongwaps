# L01 exercises — GPT-6, 2026-10-16
Verdict: PASS

Authored-content checks only; repository gates and prototype parity were not verified.

## Checked
- Read `.agents/skills/grammar-author/SKILL.md` first; the `.claude/` copy agrees. The task explicitly unpauses practice and prohibits npm.
- Compared all 16 `exercises.json` entries with the transcript and attached scans; preserved their exact `source` strings and order across five grammar-page keys.
- Checked vocabulary and grammar against the two Lesson 1 parts and scope list. Part 1 has no 呢 or Part 2 liking/loving patterns; p.46 reading vocabulary is not introduced early.
- All items have one accepted completion, 2–3 taught tiles, a result sentence, and an individual repair for every distractor. Own items follow the book items.
- Inspected all picture crops together; cropped out answer labels and tightened edges to exclude neighboring material. Boxes use printed-page fractions and retain the relevant flags, expressions, work, or hearts.

## Design notes

### G01 · 叫、姓、是 · 5 items
Mistakes: confusing a surname with a given/full name; confusing a name with a nationality.
- p.38 #1: the Japanese portrait and the earlier book example identify 小林友美; 王宜文 is the American classmate. Both options name women, so gender does not decide it. The crop excludes the printed name.
- p.38 #2: the British flag/map decide 英國 versus 美國; 高 is supplied so the learner makes one decision.
- p.39 #3: the American flag/map decide 美國 versus 日本; 宜文 is supplied. Her surname and given name remain in the book's sentence.
- p.39 #4: 李 is supplied as the surname; 中明 requires 叫 rather than 姓. The Indonesian portrait retains the book context without copying either verb.
- Own: extends the given-name contrast to the full name 小林友美, which requires 叫 rather than 姓 under the book's rule.
Crops: p.38 portraits 1–4, including each flag/map and excluding name/nationality captions.

### G02 · 很／不 · 4 items
Mistakes: denying a positive description; overlooking the contrasting person; importing 是 before an adjective.
- p.39 #1: the brief positive appraisal makes 很 the intended answer; appearance alone would be subjective. Neither Chinese option is printed in the context.
- p.39 #2: the computer, paper piles, and flying sheets establish busy, selecting 很 over 不.
- p.39 #3: the slumped woman contrasts with upright, waving 中明, selecting 不累 for him.
- Own: 是 belongs before a noun identity; 漂亮 directly describes her, selecting 很. This tests the extra 是 mistake absent from the book's 很/不 choices.
Crops: p.39 exercise drawings 1, 2, and both people in 3; exclude captions and exercise text.

### G03 · 嗎 · 3 items
Mistakes: changing statement order when asking a question; placing 嗎 before the statement ends; giving the wrong polarity in reply.
- p.40 #1: retain the complete dialogue; order 王 then 嗎 after 中明姓. B's rejection of 王 and correction to 李 make 李 the tempting but incompatible surname for A's question.
- p.40 #2: order 日本人 then 嗎 after 李小姐是. The only other offered nationality is 臺灣人, which conflicts with B's 不是 correction. No other non-Taiwanese guesses are offered as competing correct answers.
- p.40 #3: supply the question ending, then complete the affirmative reply with 很 rather than 不; the hearts and smiling girl establish the book's positive answer.
Crop: p.40 exercise 3, the girl and hearts only. No own item: the three book items cover these decisions without importing untaught 呢.

### G04 · 呢 · 4 items
Mistakes: treating a bare new topic as a full 嗎 question; losing the predicate carried forward by 呢; using 呢 for a complete yes/no question.
- p.44 #1: B replies about their own nationality, so A needs 你 followed by 呢; 嗎 cannot carry the omitted predicate after 你.
- p.44 #2: reply as Gao Jiale; 高 is supplied and the inherited surname question selects 姓 rather than the identity verb 是.
- p.45 #3: supply the natural open reply 我不忙, leaving 你 then 呢 as the single question-building decision. The busy drawing describes 他, while B's 我 identifies the listener as the new topic.
- Own: reverse the contrast with the full statement 王先生累; an explicit request to ask whether he is tired selects 嗎 rather than 呢.
Crop: p.45 top busy-man drawing, without its 忙 caption. The open book reply is supplied rather than asking the picture to decide how busy the listener feels.

### G05 · Subject–Verb–Object · 4 items
Mistakes: substituting an identity for a liking statement; denying the depicted feeling; placing 不 after the verb or adding 是.
- p.45 #1: the short enjoyment context selects 喜歡 over 不喜歡; the learner is not asked to guess a personal preference.
- p.45 #2: supply 李小姐 as the open object; 喜歡 answers whom the speaker likes, whereas 是 would identify the speaker as Miss Li. Both forms make grammatical sentences, but only one answers A.
- p.45 #3: hearts in Mr. Wang's thought bubble select 愛 rather than 不愛; the subject and object stay supplied.
- Own: order 不 then 喜歡 before 王小姐, with 是 as the trap. This adds the negation-placement mistake that the book's open replies do not isolate.
Crop: p.45 lower thought bubble and thinker, including both people and hearts, without neighboring question/gloss text.

## Issues
- p.38 prints no instruction beyond “Exercise”; `exercises.json` records an empty instruction. Used the minimal learner-facing title “Complete the sentences.” rather than an empty title or the forbidden “Exercise.” This is editorial, not a book quotation.
- Multi-blank book items supply secondary answers to retain the whole sentence while isolating one decision; p.40 #1–2 expose adjacent short chunks for ordering. Open replies are constrained by context or supplied words, not accepted as multiple equally correct options.
- p.39 prints `kěài`; the p.40 reply follows that printed romanization. Other unprinted result pinyin is authored, not claimed to be visually verified.

## Unsure
- Prototype comparison unavailable: the web fetch could not open the artifact, and browser access to claude.ai was denied. No further access attempt was made.
- The source provides no English instruction for G01; the editorial title above is the only instruction exception.

## Verification
Python read-only assertions (no npm):
```
PASS JSON/schema-field checks: 5 points, 20 items.
PASS book coverage and order: 16/16; own items follow book items (4).
PASS unique answer combinations, exact result sentences, tile lengths/counts, and distractor repairs.
PASS picture bounds and source image existence: 12 crops.
PASS Part 1 guard: no later 呢/喜歡/愛 patterns or reading-only vocabulary in lines/options.
SKIPPED npm gates: user explicitly prohibited npm.
```
- PASS: manual source, scope, distractor, and crop review.
- SKIPPED: content export, content validation, and repository tests, per task instruction. No generated packs were edited.

## Review

GPT-6, 2026-10-16. Verdict: FIXES NEEDED (supersedes the earlier PASS).

### Flag verdicts
- **l1g3-p1 — ACCEPT.** Restored printed 王 in `中明姓王____？`; removed the surname slot, 王/李 tiles, and their repairs. The only blank now accepts 嗎. Source sentence, reply, result, and item coverage remain intact. The single remaining tile is deliberately provisional; see NEEDS-ENGINE below.
- **l1g4-p2 — ACCEPT.** Supplied 姓 in the reply and moved the decision to 高 versus 李. “Reply as Gao Jiale” supplies the identity; 呢 carries forward the surname question. Both choices form grammatical replies, but only 高 matches that identity. Replaced the distractor repair.
- **l1g5-p2 — ACCEPT.** Supplied 喜歡 in the reply and moved the decision to 李小姐 versus 王小姐. Added “You like Miss Li, but not Miss Wang,” tracing to the printed p.45 example `我喜歡李小姐，不喜歡王小姐。` Both objects fit syntactically; context decides. Replaced the distractor repair.

### Independent pass and edits
Reviewed all 20 items against the supplied scans, transcript, and within-lesson teaching order; retained all 16 book sources in order and all four own items.
- **l1g2-p3:** standing and waving does not prove someone is not tired. Added “Zhongming feels rested” and updated the repair/fallback; the picture and printed sentence remain. This supplies the missing state without printing 不.
- **l1g3-p2:** removed the mechanical ordering of unlike 日本人/嗎 tiles. Supplied final 嗎 and retained the nationality choice 日本人/臺灣人; B's negative correction rules out 臺灣人 as A's guess. Updated repair/fallback. This now tests reading the correction, rather than particle placement.
- **l1g4-p1, l1g4-p3:** supplied 你 and left only the ending choice 呢/嗎. Removed topic-placement repairs and updated the ending repair/fallback. The options are now peer particles; neither dialogue prints the selected ending elsewhere.
- **l1g5-own1:** replaced mixed 不/喜歡/是 ordering with the single polarity choice 喜歡/不喜歡. The existing negative preference prompt decides; updated repair/fallback. The result sentence is unchanged.
- The other 12 items needed no edit. Name/nationality options remain comparable; positive/negative options require the stated preference or depicted state. Retained 叫/姓 and 很/是 as direct tests of the book's named grammar contrasts, rather than adding unrelated decoys. The full-statement 嗎/呢 own item explicitly asks a yes/no question, excluding an unsupported 呢 reading.
- No source IDs, result sentences/pinyin, picture boxes, group instructions, or allowlists changed. Added no vocabulary or later grammar. English contexts constrain open book replies; they are editorial prompts, not printed-book quotations.

### NEEDS-ENGINE
- **l1g3-p1:** the current single fixed gap plus one 嗎 tile reveals the answer and fails the meaningful-distractor/no-giveaway standard. Do not treat this as a finished scored item. NEEDS-ENGINE: show the intact `中明姓王` statement and the printed B reply; let the learner choose where to insert the one 嗎 tile (before 中明, between 中明/姓, between 姓/王, or after 王). Only the final position is right; feedback explains that 嗎 follows the whole statement. This preserves printed 王 and tests placement without an untaught 呢/吧 or a nonsense distractor. Current fixed-slot data cannot offer those positions without adding blanks inside the printed sentence. Kept the book item for coverage and recorded the limitation; no engine files were edited.

### Verification
Read the verify-change skill; its npm gates are overridden by this task's explicit prohibition. Read-only Python checks produced:
```
PASS JSON, unique IDs, book coverage/order: 16 book items + 4 own items.
PASS single accepted fills, result reconstruction, tile limits, distractor repair coverage.
PASS scope guard and picture bounds/source existence: 12 unchanged crops.
OPEN meaningful distractor/interaction: l1g3-p1
SKIPPED npm gates: prohibited by user.
```
The local check initially needed two corrections: removal of unsupported `zip(strict=...)` for this Python version, and excluding taught 可愛 from the bare 愛 scope guard. The corrected check passed. These are authored-content checks, not repository schema validation or UI verification. No npm command was run.

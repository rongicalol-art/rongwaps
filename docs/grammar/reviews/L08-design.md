# L08 design — Claude, 2026-10-15
Verdict: FIXES NEEDED (content requests sent to Codex in step 5)

## Checked
- UI Previews at 1440: every L8 practice item; the G5 countdown scene (calendar 4/3→4/5, clock 11:50→12:00, 10/1→10/10).
- The live L8 Part 1 grammar page (read only, nothing continued).

## Engine / UI (Claude, done)
- New `countdown` scene: calendar or clock, now → next, "N days/min later" gap, Chinese captions open the dictionary.
- Exercise title uses `text-balance`, so a long book instruction no longer leaves "了." alone on the last line.

## Content requests (sent to Codex)
- Rule 8: items whose tiles are exactly the answer (G1 all, G3 p1, G4 p1/p2/p3, G2 p2) teach nothing. Add a tempting wrong tile for each.
- Rule 9: l8g5-p2 is only blanks; add a subject.
- 因為…，所以… results need the comma.
- G1 examples highlight the bare verb in the second clause (吃 in 我常吃, 唱 in 都會唱) as if it were the pattern. Only 好X/難X should be focus.

## For the owner (taste)
- The book prints each 好X/難X pair directly above its sentence. We show the table, then all 4 examples. Option: fold each sentence into its table row (tap a row to hear it), which is closer to the book with less scrolling. Prototype before building.

## Owner decision (2026-10-16): follow the book's layout
Option A ("book rows"), prototype https://claude.ai/artifact/4m8QtGSphU5bA2KXja55Xy. Where the book prints a sentence under a table row (e.g. L8 G1 好X/難X pairs), the page shows that sentence directly under its row. Where the book prints a table and then numbered examples, keep that. Build after the overnight run: let a pattern row point at its example, render it under the row, and have the content follow the transcript's layout.

## Phone check of L1 (2026-10-16)
- L1 practice titles say "Exercise" and prompts are authoring notes ("The surname verb is supplied."). Rule 14 was added for L2+. Fix L1 by hand.
- The final 。 wraps alone under the sentence (keep punctuation with the last word).
- A pattern-table cell touches the right edge at 375 (臺灣人。).
- L2 G1 (p.54): three book tables were merged into one 3-column table. 號 and 分 were dropped and the 星期 row has an empty cell. Rebuild as three subsections (rule 13a). Focus marking of numbers is also inconsistent (十點十五分).
- L3 G1 (375 wide): the 3-column pattern table overflows; the NOUN column (蛋糕) is cut off. Engine/UI fix: let tables scroll or wrap cells at phone width.
- SlotBuildExercise head/tail split: a 2-character last word before 。 (喜歡。) looks up 歡 alone. Keep the whole last token together.

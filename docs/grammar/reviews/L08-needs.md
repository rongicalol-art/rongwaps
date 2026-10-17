# L08 needs — GPT-6, 2026-10-16

NEEDS-ENGINE: p.186 #2 (`l8g1-p2`) — show 新的腳踏車很____。; accept the learner’s chosen riding/appearance assessment and return its matching sentence/pinyin/English. 好騎、難騎、好看、難看 all fit. The printed context cannot decide one answer.

NEEDS-ENGINE: p.186 #3 (`l8g1-p3`) — show 聽說游泳很____，我也想學。; accept 好學 or 難學 and explain the selected meaning. Wanting to learn does not establish difficulty.

NEEDS-ENGINE: p.186 #6 (`l8g1-p6`) — show 那個地方又遠又____，我不想跟你去。; accept a context-compatible description and return its meaning. Distance alone explains reluctance; it cannot prove 難找 or exclude 好找/難看.

NEEDS-ENGINE: p.187 #1 (`l8g2-p1`) — show the printed A line and B：因為____。; let the learner supply/select one complete reason, then return that reason’s sentence and feedback. Preserve the printed 因為 and do not append 所以. Current short-tile kinds require splitting/building the reason or testing a connector the book already supplies.

NEEDS-ENGINE: p.195 #1 (`l8g5-p1`) — show 我的日本朋友____ with the April 3/5 calendars (p.195 crop approximately [0.18, 0.67, 0.32, 0.15]); let the learner supply an event and receive feedback on 快（要）/要…了. Neither calendar identifies an arrival or any other event; do not invent one as a uniquely recoverable answer.

These five items are deferred under the task’s explicit remove-if-forced instruction. `slot-reels` permits open combinations but cannot meet the skill’s newer “exactly one right answer, decided by context” rule here. A new interaction alone cannot supply absent evidence: preserve open-answer grading or obtain an approved context before restoring them. This is a design requirement, not an engine implementation claim.

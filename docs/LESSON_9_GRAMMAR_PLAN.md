# Lesson 9 Grammar Plan: My Chinese Class

## Source Truth

Use local verified OCR source first:

- Source file: `output/ocr/modern_chinese_1/lesson-09/lesson.md`
- Book lesson: Lesson 9, `我的中文課 / My Chinese Class`
- Printed pages: 202-221
- Dialogues: 2
- Grammar points: 5
- Reading: `我喜歡學中文 / I Like to Learn Chinese`

Important mismatch: `src/data/books.ts` currently labels Lesson 9 as `Shopping`. Book source says Lesson 9 is `我的中文課 / My Chinese Class`. Before implementation, decide whether UI should rename Lesson 9 or whether the app is intentionally using a different book mapping. Do not build Shopping content from this source.

## Product Goal

Teach Lesson 9 as a study-life simulator, not a grammar worksheet.

Learner job: understand and describe what someone is doing now, when a schedule runs, what order events happen in, what is possible or allowed, and which option is comparatively better.

Beginner promise: after this lesson, a learner can explain a simple school day:

> Now I am studying. I have class from 9 to 12. First I do homework, then I ask a teacher. I can use the classroom on Monday. This room is comparatively quiet.

## Design Principle

Lesson 9 should feel like moving through one school day.

One reusable wrapper, five different interaction labs:

- `StudyDayShell`: calm canvas, one top progress bar, no nested cards.
- Center teaching surface changes by grammar.
- Bottom Learn/Practice dock stays standard.
- Every lab uses object movement, schedule manipulation, or visible comparison instead of repeated fill blanks.
- Chinese stays large and tappable. Pinyin and English are support layers, not main stars.
- Instructions must work for non-native English speakers: short verbs, icon support, visible examples, few idioms.

## Shared Lesson Template

Create a new data-level lesson template, not a new visual page type:

`Study Day Map`

The learner sees a simple illustrated school map:

- Dorm
- Classroom
- Library
- Teacher office
- Cafeteria
- Sports court

Each grammar unlocks one map tool:

- `在 V`: live activity bubbles
- `從...到...`: time-range ruler
- `先...再...`: route steps
- `能`: access/pass gates
- `比較`: compare panels

This creates one coherent lesson identity while avoiding repetitive grammar cards.

## Grammar 1: 在 V Indicating Ongoing Actions

Source:

- ID: `B1L09-G01`
- Pages: 205-206
- Pattern: `S + 在 + V(O)`
- Book idea: `在 V` marks an action happening now.
- Dialogue anchor: `現在他在上書法課。`

### Learner Promise

Say what someone is doing right now.

### Plain Teaching

`在` before an action means "happening now."

Do not teach it as location here. Show the difference visually:

- `他在教室。` = he is in the classroom.
- `他在上課。` = he is having class now.

### New Interactive: Live Classroom

Scene: small classroom with 4 students doing different activities.

Learner taps a student. Motion freezes. Sentence appears:

- `他在做功課。`
- `她在寫字。`
- `他們在看書。`
- `老師在教中文。`
- `學生在問問題。`

Interaction states:

- Tap person: hear sentence.
- Toggle `now` lamp on/off: with lamp on, sentence needs `在`; with lamp off, sentence becomes general habit and `在` disappears.
- Drag `在` tile into sentence gap.

### Examples To Add

- `我在寫功課。` I am writing homework.
- `友美在教國安中文。` Youmei is teaching Guoan Chinese.
- `家樂在圖書館看書。` Jiale is studying in the library.
- `老師在說話，學生在聽。` The teacher is speaking; students are listening.
- `他不在睡覺，他在讀書。` He is not sleeping; he is studying.

### Beginner Pitfalls

- Mixing location `在` and action `在`.
- Putting `在` after verb.
- Using `嗎` with positive-negative style by accident.

### Practice Ideas

- Watch 3-second mini animation, choose correct sentence.
- Repair sentence: `他上在課` becomes `他在上課`.
- Contrast choice: location or action?

## Grammar 2: 從...到... For Time

Source:

- ID: `B1L09-G02`
- Pages: 206-207
- Pattern: `從 + time + 到 + time`
- Dialogue anchor: `從四點到五點半我要上英文課。`

### Learner Promise

Say when something starts and ends.

### Plain Teaching

`從` marks start. `到` marks finish.

Use color and shape:

- `從` = green start pin
- `到` = red finish pin

No long explanation needed. Learner should see a line from start to finish.

### New Interactive: Time-Range Ruler

Scene: horizontal day ruler from morning to night.

Learner drags start pin and finish pin. Sentence builds live:

`我從上午九點到中午十二點上中文課。`

Modes:

- Time of day: `上午`, `下午`, `晚上`
- Calendar range: `從星期一到星期五`
- Date range: `從二月五號到二月二十號`

### Examples To Add

- `我從早上八點到十點在圖書館。`
- `中文課從星期一到星期五都有。`
- `他從下午一點到三點做功課。`
- `我們從四點到五點半上英文課。`
- `這家餐廳從二月五號到二月二十號休息。`

### Beginner Pitfalls

- Saying only one time.
- Reversing `從` and `到`.
- Thinking `到` always means physical arrival.

### Practice Ideas

- Drag labels onto schedule.
- Hear `4:00-5:30`, build sentence.
- Calendar sweep: select Monday through Friday, then read sentence.

## Grammar 3: 先...再...

Source:

- ID: `B1L09-G03`
- Pages: 207-208
- Pattern: `S1 + 先 + V1(O1), S2 + 再 + V2(O2)`
- Dialogue anchor: `我先回宿舍做功課，再跟你一起去找他。`

### Learner Promise

Say "first do A, then do B."

### Plain Teaching

`先` points to first action. `再` points to next action.

Make sequence physical: two stepping stones.

### New Interactive: Route Builder

Scene: school map route.

Learner drags two action cards into order:

1. `回宿舍做功課`
2. `去找家樂`

Sentence builds:

`我先回宿舍做功課，再去找家樂。`

If learner reverses cards, meaning changes visually. Character walks wrong route. Feedback names meaning, not "wrong".

### Examples To Add

- `我先看書，再寫字。`
- `我們先問老師，再去圖書館。`
- `他先上書法課，再做功課。`
- `你先坐捷運，再坐公車。`
- `我想先買東西，再去朋友家。`
- `姐姐先唱歌，妹妹再唱。`

### Beginner Pitfalls

- Treating `再` as "again" only. Here it means "then."
- Repeating subject when not needed.
- Using `和` for action sequence.

### Practice Ideas

- Put two route cards in order.
- Choose image that matches sentence.
- Repair: `我再做功課，先看書` becomes `我先看書，再做功課`.

## Grammar 4: 能

Source:

- ID: `B1L09-G04`
- Pages: 213-215
- Pattern: `能 + V`
- Book idea: physical ability, permission, or objective possibility.
- Dialogue anchors:
  - `我們每天都能用那間教室嗎？`
  - `我們班只能禮拜一跟禮拜二下午用。`
  - `不能去。`

### Learner Promise

Say whether something can happen because body, rules, or situation allow it.

### Plain Teaching

`能` is "can" when reality allows it.

Three doors:

- Body door: can your body do it?
- Rule door: do rules allow it?
- Situation door: does time/money/weather allow it?

Keep `可以` nearby but not equal:

- `可以` often feels like permission or okay-ness.
- `能` can be ability, permission, or real-world possibility.

### New Interactive: Can-Do Gate

Scene: three gates: Body, Rules, Situation.

Learner sees mini scene and chooses gate:

- Bird flying: `鳥能飛。`
- Library quiet sign: `在圖書館不能說話。`
- Homework pile: `我今天不能去玩。`
- Classroom schedule: `我們班只能禮拜一下午用。`

Gate opens if sentence and reason match.

### Examples To Add

- `鳥能飛，人不能飛。`
- `他現在只能走，不能跑。`
- `我不能喝太多咖啡，因為晚上不能睡覺。`
- `上課時間不能看手機。`
- `我能在這裡用電腦嗎？`
- `今天我有很多功課，不能去百貨公司。`
- `坐捷運很快，我們十點能到。`

### Beginner Pitfalls

- Using `會` for permission.
- Using `可以` for all "can" meanings without understanding.
- Forgetting `只` in `只能`.

### Practice Ideas

- Sort can/cannot examples into Body, Rules, Situation.
- Toggle rule sign. Sentence changes `能` to `不能`.
- Choose between `能`, `不能`, `只能`.

## Grammar 5: 比較

Source:

- ID: `B1L09-G05`
- Pages: 216-217
- Pattern: `S + (V + 得) + 比較 + Vs`
- Book idea: implicit comparison when compared item is known from context.
- Dialogue anchor: `我朋友最近比較忙。`

### Learner Promise

Say one option is more X than another known option.

### Plain Teaching

`比較` means "more / comparatively" when listener already knows the comparison.

Do not require English "than" every time. Show before/after or side-by-side.

### New Interactive: Compare Lens

Scene: two study spaces, two people, or two days.

Learner moves lens over one side. Sentence appears:

- `這間教室比較安靜。`
- `今天的天氣比較熱。`
- `哥哥跑得比較快。`
- `他唱得比較好聽。`

When full comparison is needed, show ghost label:

`A 比 B + adjective` is later grammar. Lesson 9 focuses on known-context `比較`.

### Examples To Add

- `圖書館比較安靜。`
- `這間教室比較大。`
- `我最近比較忙。`
- `坐捷運比較快。`
- `在那裡看書比較舒服。`
- `他唱歌唱得比較好聽。`
- `今天我比較緊張。`

### Beginner Pitfalls

- Expecting every comparison to include `比`.
- Putting `比較` after adjective.
- Over-translating `比較` as "compare" instead of "comparatively more."

### Practice Ideas

- Pick bigger/quieter/faster image and build sentence.
- Transform: `今天的天氣熱` becomes `今天的天氣比較熱`.
- Spoken choice: "Which room is more comfortable?"

## Lesson Flow

Recommended part structure:

- Part 1, Dialogue 1:
  - Grammar 1 `在 V`
  - Grammar 2 `從...到...`
  - Grammar 3 `先...再...`
- Part 2, Dialogue 2:
  - Grammar 4 `能`
  - Grammar 5 `比較`

Reading remains stored but hidden per current grammar-only direction unless dedicated Reading experience is built.

Completion copy:

> You can now talk through a study day: what is happening, when it happens, what comes first, what is possible, and what is comparatively better.

## New Reusable Interactives To Consider

### 1. `GrammarSceneLab`

General visual lab shell for one interactive grammar concept.

Props could include:

- `scene`
- `choices`
- `sentenceBuilder`
- `takeaway`
- `onOpenWord`

Use for `在 V`, `能`, and future visual grammar.

### 2. `TimeRangeBuilder`

Reusable timeline/range control.

Use for:

- Lesson 9 `從...到...`
- future duration grammar
- schedule reading activities

Must support time, weekday, and date labels.

### 3. `SequenceRouteBuilder`

Reusable two-step or three-step action sequencer.

Use for:

- `先...再...`
- route/direction lessons
- reading timeline rebuilds

### 4. `PermissionGateLab`

Reusable can/cannot situation sorter.

Use for:

- `能`
- `可以`
- rules/signs/campus role-play

### 5. `CompareLens`

Reusable side-by-side comparison tool.

Use for:

- `比較`
- later explicit `比` grammar
- adjective review

## Low-English Teaching Rules

Keep every explanation small:

- Use one sentence.
- Show one pattern.
- Show one animated/interactive example.
- Then give 4-7 varied examples.

Avoid:

- long grammar metalanguage
- idioms like "objective factors" in UI
- dense paragraphs
- repeated "choose the correct answer" screens

Prefer labels:

- Now
- Start
- Finish
- First
- Then
- Can
- Cannot
- More

## Example Bank For Lesson 9

Use familiar words from Lessons 1-9.

### School

- `中文課`
- `英文課`
- `書法課`
- `教室`
- `圖書館`
- `宿舍`
- `功課`
- `考試`

### Actions

- `看書`
- `寫字`
- `做功課`
- `問老師`
- `教中文`
- `用電腦`
- `上課`
- `練習說中文`

### Adjectives

- `忙`
- `舒服`
- `聰明`
- `安靜`
- `快`
- `熱`
- `好聽`
- `緊張`

## Practice Design

Each grammar should have 3 rounds:

1. Notice: identify grammar meaning with visual support.
2. Build: place the key grammar word in the right slot.
3. Use: answer a small school-life prompt.

Keep answer tiles compact. Feedback should say what changed in meaning:

- `在` missing: "This no longer sounds like happening now."
- `從/到` reversed: "Start and finish switched."
- `先/再` reversed: "Action order changed."
- `能` wrong gate: "This is a rule problem, not body ability."
- `比較` misplaced: "`比較` sits before the quality."

## Visual Direction

Use one calm study-day world:

- solid `bg-ui-canvas`
- white teaching surfaces only where learner manipulates sentence
- blue for active grammar slot
- green start marker for `從`
- red finish marker for `到`
- yellow-gold small repeated number badges
- quiet icon buttons through `AppIcon`
- no full-page texture
- no nested cards
- no default Tailwind grays

Illustration should be original RongWaps school assets:

- tiny classroom map
- students with books
- schedule ruler
- classroom door/signs
- comparison lens

## Implementation Notes Later

Data target:

- New file likely `src/data/grammar/lessonNine.ts`
- Register in `src/data/interactiveGrammarPages.ts`
- Keep lesson title source-accurate unless product mapping says otherwise.

Potential model additions:

- visual scene metadata for discovery labs
- timeline/range items
- sequence route actions
- capability category for `能`
- comparison pair data

Reuse before creating new grammar lesson components:

- `GrammarLabShell`
- `GrammarSlotMap`
- `GrammarRuleContrast`
- `SegmentedControl`
- `ActionButton`
- `IconActionButton`
- `ContextualChineseText`

## Build Priority

1. Fix or confirm Lesson 9 title mapping.
2. Build content data for all five grammar points with extra examples.
3. Implement `TimeRangeBuilder` first because it is most reusable.
4. Implement `SequenceRouteBuilder`.
5. Implement `PermissionGateLab`.
6. Implement `CompareLens`.
7. Add lightweight `LiveClassroom` behavior using same `GrammarSceneLab`.
8. Validate mobile at 390x844 and desktop at 1440x1000.

## Success Criteria

- Learner can explain each grammar without reading a paragraph.
- Every grammar has a distinct interaction.
- Same study-day visual world ties all interactions together.
- At least four examples per grammar, preferably six or seven.
- Chinese is tappable with dictionary support.
- Pinyin and English help but do not dominate.
- Practice feedback explains meaning, not only correctness.
- Lesson 9 no longer feels like five copies of same worksheet.

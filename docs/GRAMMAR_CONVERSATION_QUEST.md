# Grammar Conversation Quest Blueprint

> Current direction: the multi-step quest experiment was superseded by a book-faithful interactive grammar reader. The first candidate implements Grammar I from printed page 38 with the original explanation, pattern table, examples, profile exercise, drag/tap blanks, and a Dialogue 1 reference drawer. This document remains an exploration archive; the page-38 candidate is not yet a formal reusable template.

> Terminology correction: lesson Parts are organized by source-book **Readings**, not by dialogues. A dialogue is one possible Reading format alongside stories, narratives, introductions, and other text types. References to Dialogue 1 or Dialogue 2 below describe the format/content of those Readings, not the top-level Part model.

## Product decision

RongWaps should teach grammar as a tool for participating in a conversation, not as a separate reference section or a generic quiz category.

The primary learning unit is a **Lesson Part**. A Part gathers the vocabulary, grammar, dialogue, exercises, audio, and supporting material that belong to one communicative goal. Grammar activities culminate in a playable dialogue where the learner uses the structures they just acquired.

The experience should answer one learner-facing question:

> What can I do in Chinese after finishing this Part?

For Lesson 1, that answer is not “understand five grammar points.” It is “meet a new classmate, describe someone, ask a question, and keep the introduction going.”

## Why the Part must be canonical

The current app already exposes vocabulary Parts, but grammar and dialogue are not yet part of that model. The extracted Lesson 1 content shows the intended groupings:

| App Part | Extracted source grouping | Vocabulary | Grammar | Payoff |
| --- | --- | ---: | ---: | --- |
| Part 1 | `dialogue_1`, audio family `01-1-*` | 19 words | G01-G03 | Dialogue 1 |
| Part 2 | `dialogue_2` and `dialogue_2_phrase`, audio family `01-2-*` | 9 items | G04-G05 | Dialogue 2 |
| Part 3 | reading, names, and reading phrases | extension material | none in the source grouping | Reading/application |

This means a Part cannot assume that every unit contains grammar and a dialogue. RongWaps needs two initial Part kinds:

- **Scene Part:** vocabulary and grammar culminate in a dialogue performance.
- **Extension Part:** reading, culture, names, classroom activity, or other application material culminates in an appropriate challenge.

Future Part kinds can be added only when the content demands them; they should not be invented for visual variety.

## North-star learning loop

Each Scene Part follows the same five-beat arc:

1. **Meet the scene** — hear a short teaser and understand the situation.
2. **Notice the tools** — discover grammar inside real dialogue lines.
3. **Play with the pattern** — manipulate sentence meaning without penalty.
4. **Prove control** — complete a small adaptive challenge.
5. **Enter the scene** — take a role and finish the conversation.

This arc is reusable. Its situation, content, activity recipes, and difficulty change by Part.

## Curriculum hierarchy

The product hierarchy should be:

```text
Course
  Lesson
    Part
      Goal
      Vocabulary set(s)
      Grammar point(s)
      Dialogue or extension content
      Activity sequence
      Mastery state
```

The current flashcards, quiz, listening, and writing modes remain useful. They become supporting practice surfaces fed by the same Part selection rather than competing definitions of lesson progress.

## Canonical Part content

A Part needs the following product meaning. This is a content contract, not an implementation schema.

### Identity

- Stable Part ID and order
- Part kind: scene or extension
- Learner-facing title
- One short capability statement, such as “Introduce a classmate”
- Availability: complete, partial, coming later, or source missing

### Source relationships

- Vocabulary sections
- Grammar point IDs
- Dialogue ID, when present
- Associated exercise IDs
- Classroom activity, reading, culture, or usage-note IDs
- Audio references

### Authored learning layer

The extracted textbook archive should remain source-faithful. A separate app-authored layer should add the teaching information the source does not explicitly provide:

- Sentence slots and their roles
- Safe substitution pools
- Allowed transformations
- Common learner mistakes
- Grammar contrasts
- Recommended activity recipes
- Dialogue variations for replay
- Mastery thresholds

This separation prevents game logic from guessing grammar and prevents editorial additions from contaminating the source archive.

## Reusable activity system

RongWaps needs more than visual widgets. It needs four reusable layers.

### 1. Quest shell

Owns the session progress, close/back behavior, Part map, settings, pause/resume, and completion flow. It should feel related to the existing practice session shell without forcing grammar into flashcard behavior.

### 2. Activity recipes

Recipes define what the learner does. They accept content instead of knowing about a particular lesson.

| Recipe | Interaction | Primary learning job |
| --- | --- | --- |
| Spotlight | Tap the meaningful grammar chunk in a real sentence | Notice |
| Sentence Forge | Arrange semantic chunks into pattern slots | Construct |
| Meaning Switch | Change one element to satisfy a new meaning | Transform |
| Dialogue Repair | Fix a structurally incorrect character line | Diagnose |
| Best Reply | Choose the natural next turn in context | Interpret |
| Contrast Match | Choose between two related grammar structures | Distinguish |
| Scene Prompt | Describe a visual situation using the pattern | Produce |
| Roleplay | Assemble, type, or speak a dialogue response | Converse |

An activity recipe may render at several support levels. The content remains the same while help is gradually removed.

### 3. Feedback engine

Feedback should identify the learner's structural mistake:

- Correct meaning, wrong word order
- Missing particle
- Incorrect negation
- Wrong response for the conversational context
- Vocabulary mismatch
- Fully correct

The first response is a small repair hint. The complete explanation appears only when requested or after another failed attempt. Routine errors should not trigger dramatic red screens.

### 4. Scene presentation

The same recipe can feel different through its situation:

- Classroom introduction
- Café order
- Store purchase
- Hotel directions
- Weekend calendar
- Phone chat
- Celebration plan

The context changes; the interaction contract does not.

## Mastery model

Every grammar point has three independent stages:

- **Notice:** recognizes the structure in context.
- **Build:** constructs or transforms it correctly.
- **Use:** applies it in an appropriate dialogue turn.

The learner earns one Scene Star for each stage across the Part:

1. Understanding
2. Construction
3. Conversation

Finishing every screen is not mastery. A Part becomes complete when the learner successfully uses its target grammar in the payoff activity. Partial mastery remains visible and produces a specific review recommendation.

There should be no punitive lives system. Errors should feed a repair queue and later spaced review.

## Lesson 1 journey

### Lesson overview

**Title:** 新同學 — The New Classmate

**Capability promise:** Meet someone, introduce a classmate, and keep the conversation going.

The overview presents three Part destinations:

1. **Who is she?** — Scene Part; Dialogue 1; three grammar tools
2. **And you?** — Scene Part; Dialogue 2; two grammar tools
3. **Introduce yourself** — Extension Part; reading and classroom application

The primary action is **Start Part 1** or **Continue**. Secondary actions are Preview vocabulary and View lesson contents.

### Part 1: Who is she?

**Goal:** Identify and describe a new classmate, then ask a yes/no question.

**Grammar tools:**

- 叫、姓、是 — `N + (Neg) + 叫/姓/是 + N`
- 很／不 with state verbs — `S + 很/不 + Vs`
- 嗎 — `Statement + 嗎`

#### Screen 1: Scene teaser

Show the classroom setting and play a short exchange from Dialogue 1. The learner sees speaker names, Chinese lines, and an optional replay control. Translation is available but quiet.

Primary action: **Learn what they said**

#### Screen 2: Mission map

Show the Part as one compact route:

```text
Names → Descriptions → Questions → Conversation
```

Each grammar tool is described by function, not textbook terminology.

#### Screens 3-5: Names tool

1. Spotlight `是`, `叫`, and `姓` in dialogue lines.
2. Sentence Playground swaps the person, identity, surname, and negation.
3. Sentence Forge completes two or three meaningful prompts.

Checkpoint capability: **Introduce or identify someone.**

#### Screens 6-8: Description tool

1. Contrast `她是新同學` with `她很可愛` so learners notice that `是` is not inserted before the state verb.
2. Meaning Switch changes positive and negative descriptions.
3. Dialogue Repair fixes a common `是 + adjective/state verb` error.

Checkpoint capability: **Describe how someone is.**

#### Screens 9-11: Question tool

1. Turn a statement into a question by adding `嗎`.
2. Match yes/no questions to natural answers.
3. Respond to a new variation using the same pattern.

Checkpoint capability: **Ask and answer a yes/no question.**

#### Screen 12: Dialogue rehearsal

The learner chooses 中明 or 宜文. Their turns initially offer sentence chunks. The other character is voiced automatically. A mistake pauses the line and offers a structural hint.

#### Screen 13: Dialogue performance

Replay the scene with one or two controlled variations: identity, country, name, or description changes. Support is reduced based on earlier performance.

#### Screen 14: Part result

Show the three Scene Stars, one human capability statement, and at most one recommendation.

> You can introduce and describe a new classmate.

Primary action: **Continue to Part 2**

Secondary actions: Replay scene and Review one weak tool.

### Part 2: And you?

**Goal:** Return a question and talk about preferences.

**Grammar tools:**

- 呢 — `Statement, + N + 呢`
- Subject–Verb–Object — `S + (Neg)V + O`

Use the same arc but change the activities:

- Spotlight the missing repeated information that `呢` replaces.
- Best Reply distinguishes a natural `呢` response from an unrelated question.
- Sentence Forge builds preference sentences with `喜歡` and other compatible verbs.
- Meaning Switch changes subject, negation, verb, or object.
- The Dialogue 2 performance combines both structures.

### Part 3: Introduce yourself

This is an Extension Part rather than an artificial third dialogue quest.

Its experience uses the extracted self-introduction reading and classroom activities:

1. Read or listen to a model self-introduction.
2. Fill a personal profile using safe learner-selected information.
3. Assemble a personalized introduction.
4. Practice privately with audio playback.
5. Optionally type or record a final performance.

Its payoff is **My Introduction**, which can be saved to a learner-owned conversation collection.

## Lesson finale

After Parts 1 and 2, unlock a mixed scene that does not reproduce either dialogue verbatim.

The learner must:

- Identify someone with 是, 叫, or 姓
- Describe them with 很 or 不
- Ask one question with 嗎
- Return a question with 呢
- Express one preference with Subject–Verb–Object

The finale should feel like a conversation, not five visibly separate test items. Completing Part 3 can personalize the learner's side of the scene.

## Screen hierarchy and visual direction

### Lesson overview

The dominant visual is a horizontal storyboard on desktop and a vertical route on mobile. Each Part is a destination, not a small toggle beneath a generic lesson card.

- Use one course accent for progression.
- Give completed Scene Stars semantic success treatment.
- Reserve strong tactile depth for Start/Continue and active route nodes.
- Keep informational grammar summaries flatter and quieter.
- Use an original RongWaps classroom character only for the scene teaser, teaching moments, and celebration.

### Quest session

The learner should always see:

- Current capability or grammar tool
- Quest progress
- Close/back
- Audio when relevant
- One primary action

Settings, restart, reveals, and pace remain quiet session utilities. Grammar activities should not expose shuffle because their teaching sequence is intentional. Flow may later support dialogue listening and shadowing, but not construction activities.

### Mobile

Mobile is the primary interaction shape:

- One sentence or decision per viewport
- Bottom-anchored primary action
- Chunk trays remain reachable by thumb
- Dialogue bubbles never shrink Chinese text to fit
- Explanations open as a bottom sheet rather than competing with the activity

Desktop provides more scene atmosphere and room for simultaneous pattern explanation, but does not add extra mandatory controls.

## Adaptive behavior

The sequence is authored; support is adaptive.

- Correct quickly: reduce hints on the next item.
- Correct after repair: retain the same support level.
- Repeat the same structural error: insert one focused repair activity.
- Struggle across several tools: allow the dialogue with guided chunks rather than blocking progress.
- Strong performance: offer a harder replay variation after completion.

Adaptation should never silently change the grammar being taught or introduce vocabulary outside the Part's supported pool.

## Incomplete content behavior

The product must gracefully represent incomplete source material:

- Dialogue present, grammar unavailable: allow Listen and Explore; label Grammar Quest as coming later.
- Grammar present, dialogue unavailable: allow tool practice; use a checkpoint rather than inventing a scene.
- Partial lesson: show available Parts and a clear source-status note.
- Source-missing lesson: do not create placeholder teaching content.

This keeps Lesson 15 honest and Lesson 16 explicitly unavailable until their sources exist.

## Recommended first vertical slice

Build and validate **Lesson 1, Part 1 only** before generalizing the entire course.

The vertical slice must include:

1. Lesson overview entry
2. Scene teaser
3. Three grammar tools
4. Spotlight recipe
5. Sentence Forge recipe
6. Meaning Switch recipe
7. Guided Dialogue 1 roleplay
8. Scene Stars and Part completion
9. Mistake repair queue
10. Traditional/simplified, pinyin, English, and audio reveal behavior

The slice succeeds when a learner can explain less but do more: after one short session, they should be able to adapt a new-classmate exchange instead of only recognizing the original lines.

## Decisions to postpone

- AI-generated dialogue content
- Open-ended speech grading
- Multiplayer partner roleplay
- Competitive leaderboards
- Large narrative world or map
- More than the initial activity recipes
- Automatic conversion of every textbook exercise into a game

These can amplify a proven learning loop later. They should not define the first version.

## Product guardrails

- Conversation ability is the reward; XP is secondary.
- Do not require speed for grammar mastery.
- Do not punish experimentation in the Playground.
- Do not teach translation as the only path to meaning.
- Do not generate unsafe grammar variations from vocabulary alone.
- Do not make every grammar point use every activity recipe.
- Do not equate source completion with learner mastery.
- Do not overwrite the accepted source archive with app-authored teaching metadata.

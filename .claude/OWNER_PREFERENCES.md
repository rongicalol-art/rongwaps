# Owner preferences: taste, product, and how to work

A self-contained brief for any AI (Claude, Codex, others) working on Ron's Mandarin. Read it before UI, design, motion, or copy work. It sums up many sessions of corrections; treat the "always / never" lines as rules. Code facts live in `AGENTS.md`, `.claude/rules/`, and `docs/`; this file sits in `.claude/` but is written for every tool. This file is about taste and working style.

---

## 1. The product

- A Chinese-learning PWA built on the textbook *Modern Chinese* (Books 1–4): vocabulary flashcards with spaced repetition, a mixed vocab quiz, grammar lessons, readings with audio, character breakdowns and memory hooks.
- Target feel: **a calm, tactile, Duolingo-polished study companion.** Premium means deliberate hierarchy, quiet chrome, smooth motion, and every screen feeling authored as one system.
- Learning comes before decoration. Every feature has to help the learner remember the **meaning** of a word, its sound, and its characters.

## 2. Visual taste

**Calm, clean, few elements.**
- Use the fewest zones that do the job. When a screen feels empty, fix the composition (size, alignment, centring) before adding anything.
- Rejected again and again: description lines, "what you'll learn" lists, stats lines, breadcrumbs, status pills ("Review · 1 of 2", "Missed", "Done"), counts next to buttons, floating helper text.
- **No bordered box inside a bordered container.** A tile inside a card inside a bar reads as "messy". Inside a container, use plain text with hierarchy (size, weight, ink colour).

**Tactile, not flat.**
- Anything you can press looks like a real button: a border plus a solid, darker bottom edge that compresses when pressed.
- Selected = book accent border with a soft fill. Plain rows read as "not a button".
- Depth only means "press me". No drop shadows on docks, windows or stacks. No blur, glass, textures, or busy gradients.

**Plain over decorated.**
- Pinyin in feedback and lists is plain ink: no tone colours there.
- Small square badges are liked: the 1/2/3 number badges on answer choices are the model.
- Key hints ("Space") look like those badges: small, square, plain border, normal case. They hang just after the button label, and **the label stays centred**.
- Rounded pills look bad. Pills and chips are squarish.

**Colour has a job.**
- Two themes: warm off-white (light) and warm charcoal (dark, the "Dark mode" setting). Never pure white, never blue-tinted. Colour only through tokens, so both themes follow; never `text-white` or a hex in components.
- The book's accent colour carries progress, selection and done states.
- Green, red and amber are for answer feedback only.
- The review round uses a muted honey tone, and text and lines warm up with it.
- Nothing saturated enough to "hurt the eyes". Quiet answer buttons and docks.

**Shapes and type.**
- Compact, confident buttons. One radius family per surface.
- Nunito heavy for titles. The Chinese study font for characters. PingFang semibold for Chinese subtitles.
- Sibling blocks share exactly the same text styles. Short copy, no uppercase sentences.

**Images.** Native ratio, never cropped, no text over pictures.

**Layout.**
- Desktop keeps the side nav. Windows open beside it, never as a full-bleed takeover.
- Mobile gets its own hierarchy, not a stacked desktop.
- Content must not be covered by the feedback bar on a 900px-tall desktop window.
- Never ship disabled buttons: remove the action instead.

## 3. Motion taste (the owner cares most here)

- **Motion explains cause and effect.** The thing you touched becomes the next thing:
  - the last flashcard becomes the quiz's first question
  - a speaker tile turns into its word once matched
  - a tile flies into its slot, and the rest slide together to close the gap
- **Physical and complete.**
  - Whole objects move: the whole tile bounces, not just its inner part.
  - Presses go down into the element's own bottom edge.
  - Nothing stalls halfway, jumps, or leaves a gap or hole behind.
- **Choreographed in beats.** The main element first, then the rest staggered (40–110ms). Start quickly, settle with ease-out, and overshoot only for success.
  - A number counts only after its tile has landed.
  - A celebration leads with the mascot and the headline, not with the stats.
- **Always honour reduced motion** with an instant, correct end state, and let a tap skip a long entrance.
- **Engineering gotcha:** Tailwind v4 `translate-*` classes use the CSS `translate` property. Never animate `transform` translate on the same element, because both offsets apply: elements drift off-centre and sweeps stop halfway. Animate the same property the class sets, or don't put translate classes on animated elements.

## 4. Learning and product rules

- **Every quiz question tests meaning:** hanzi → meaning, audio → meaning, or meaning → hanzi. Never pinyin or hanzi alone.
- **Fair:** every question type is open to every word. Only the data limits it: listening needs audio, and build the word needs 2–4 characters.
- **Quick true or false:** one tap (No / Yes), no follow-up question. The feedback bar shows the real meaning, and a wrong meaning that was shown is struck through.
- **The learner picks the quiz:** Mixed (default, recommended) or any set of single types, before every vocab quiz (Cards done and the quiz button). Only types the deck can use are offered; words that fit none of the picked types are left out (a one-character word never appears in a Build-only quiz).
- **Full coverage:** every word in the quiz is asked exactly once per pass. Misses come back in the review round, in the same picked types.
- **Audio is the high-quality recording.** Avoid the robotic text-to-speech voice wherever a recording exists. Play the word after every answer.
- **Vocab quiz ≠ grammar quiz.** Sentence and grammar exercises come after grammar and reading, in a separate quiz.
- **Content that needs authoring** (goes-with match, situation pick, tap the group) needs owner review: never change data or packs without asking.

## 5. How to work with the owner

**Reading requests**
- Prompts are short, often a screenshot plus "looks bad / messy / unpolished / tight / not centred". Find the *specific* cause and name it in one line, e.g. "the badge is absolutely positioned, so the label shifts". Then fix exactly that.
- "Suggest / be creative / be a designer" = give a real opinion with **one recommendation**, plus honest pushback. Never a menu without a pick.
- The owner reverses quickly ("go back", "remove it"). Keep each change small and isolated so it reverts cleanly. After a reversal, move in half-steps.

**Process**
- **Small tweak or bug:** a one-line intent, then just do it.
- **Design or motion work:** a short plan, then a **clickable HTML prototype** (real tokens, phone 390 and desktop 1440, 2–3 named directions, one recommended), then wait for a pick or "go", then build. Iterate on the same prototype link.
- **Ask first:** new dependencies, new abstractions, moving or deleting files, multi-file refactors, schema or pack or data changes.
- **Work inline:** no subagents unless asked. The owner disliked a Codex session that silently restyled the quiz, so never restyle beyond the request.

**Verifying**
- Look at the result yourself at 390×844 and 1440×900 before saying "done". Use the DEV debug window: Ctrl+Shift+0 → **UI Previews**.
- **Testing on the owner's real account/deck is allowed** — the owner opted in; no need to ask. Use the DEV debug window for UI-only checks when it covers the flow.
- Report honestly what you checked and what you didn't.

**Answering**
- Terse. Lead with the result. No diff recap, no tool narration, no filler.
- Plain words. Few headers. Bullets only for parallel items.
- Questions: only when the answer changes what you'd do, with the recommended option first.

## 6. Design references

- **Duolingo:** chunky 3D buttons, one bold primary action, a mascot celebration at the end of a lesson, the progress bar as the only header chrome. Borrow the polish, not the saturated green or loud copy.
- **Du Chinese:** calm reading, tap a word for pinyin, meaning and audio.
- **HelloChinese:** tone practice, handwriting canvas.
- **Pleco / Skritter:** depth of data. Borrow the information, never the density.

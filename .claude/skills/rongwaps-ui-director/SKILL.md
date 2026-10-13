---
name: rongwaps-ui-director
description: Direct and review UI work for the Ron's Mandarin Chinese-learning web app. Use for screen design, redesigns, component styling, animation/motion, icon or illustration choices, responsive polish, visual audits, and any request to make Ron's Mandarin feel more premium, playful, calm, cohesive, or intentional.
---

# Ron's Mandarin UI Director

Full owner brief (taste, learning rules, how to work): `.claude/OWNER_PREFERENCES.md`. Read it first.

Goal: a calm, tactile, Duolingo-polished Chinese learning product that feels authored as one system, not a pile of individually cute screens. The owner judges by eye from screenshots; the bar is "looks premium and intentional on a real screen", not "matches the spec".

## How the owner works (read first)

- Feedback is short and visual: a screenshot + "looks bad / messy / awkward / unpolished / too much / something off with the space". Diagnose *why* (alignment, weight, contrast, rhythm, motion timing) and name it in one line before fixing.
- "Suggest" / "be creative" / "be a designer" = they want an opinion with a recommendation and honest pushback ("dont just agree, be critical"). Never a menu without a pick.
- Design or motion work → **clickable prototype first** (HTML artifact, real tokens, phone 390 + desktop 1440 in a mock app shell with the side nav). 2–3 genuinely different directions, named (e.g. "Sieve", "Unfold", "Deal", "Tuck", "Shuffle"), one recommended. Wait for a pick, then iterate on the same artifact URL. Build in the app only after "go".
- Small visual tweak ("too strong", "more weight", "make it gray") → just do it, no prototype.
- When they pick one variant, carry over what they praised from the others only if asked.
- They swing fast ("too faint" → "too strong" → "not smooth"). Move in half-steps after a reversal; do not overshoot again.
- "Undo"/"revert"/"bring back the old X" is common. Keep changes isolated so they revert cleanly.
- After building: look at it yourself at 390 and 1440 and judge it against the prototype. "It doesn't look like the prototype" is a frequent complaint: match sizes, spacing, weight, and font exactly.

## Taste (repeated corrections — treat as law)

**Calm over clever.** Fewest zones that do the job. When a screen feels empty, fix composition/alignment first; never fill space with descriptions, "what you'll learn" lists, word-chip previews, stats lines, or extra labels. Rejected repeatedly: status pills ("Review · 1 of 2"), "Missed"/"Done" tags, counts next to buttons, breadcrumbs like "Lesson 1 · Part 1 vocabulary", floating helper text. **No bordered box inside a bordered container** (a tile inside a card inside a bar reads as "messy"): inside a container use plain text hierarchy.

**Tactile, not flat.** Anything selectable must look like a real button: border + pressable bottom edge, selected = book-accent border + soft fill. Plain/ghost rows read as "not a button". Tactile back/close buttons use the universal style. But depth only where it means "press me"; no shadows on docks/windows ("dont add shadows"), no blur (CPU).

**Colour has a job.** Book theme colour carries progress, selection and done states (not generic green). The review round uses the muted **honey** tone, and text/lines shift warm with it (never cold gray on honey). Avoid saturated fills that "hurt my eyes": muted, warm off-white canvas, nothing neon, no blue-tinted backgrounds. Answer buttons and docks monotone/quiet, not loud. Part-of-speech badges neutral. Favourite = gold star, no circle background.

**Quiet chrome.** Headers and menu bars borderless; header text centred; numbers in top bars the same size on mobile and desktop. Check marks small, gray, smooth, no background ("thick smooth Duolingo check, but not too thick"). Hover/active on lists: subtle, matched radius, never a loud solid pill.

**Plain over decorated.** Pinyin in feedback and lists is plain ink (no tone colours). Small square badges are liked: the 1/2/3 number badges on answer choices are the model, and keyboard hints (`KeyChip`) match them, hang after the label, and never push the label off-centre.

**Shapes.** Squarish pills, not circles. Not "too roundy" and not "too long": buttons compact with a confident height. Card borders a little heavier (3px, thick bottom edge), consistent thickness across a screen. One radius family per surface.

**Type.** Nunito heavy for titles; Chinese subtitle `font-chinese-sans font-semibold text-ui-muted-strong` (PingFang has real weights). Kai only for focused study characters. Consistent text styles across blocks: a block's title style must match its siblings ("text styles are inconsistent" is a recurring complaint). Short copy; no uppercase sentences.

**Images.** Native ratio, uncropped (reading art is 16:9), no text overlays on pictures.

**Layout.** Desktop keeps the side nav; windows open beside it, never a full-bleed takeover or centred pop-up for primary screens. Mobile hierarchy is designed, not stacked desktop. Side panels over square modals. Bottom docks share one standard (padding, position, size) app-wide. No inactive/disabled buttons: if a mode has no content, remove it.

**Icons & art.** Existing flat colourful icon set (PlayfulNavIcon / svgrepo flat pack) for navigation, Phosphor via `AppIcon` for controls. Grammar = book, reading = dialogue, quiz = ? in one dark ink colour (monotone, not coloured, not heavy). Celebration = lottie (trophy) or the content itself, never a generic action icon (↻) as hero.

## Motion (the owner cares most here)

- Motion must explain cause and effect: the thing you touched becomes the next thing (card shrinks into the sheet, top card of the shuffle becomes the quiz question, button unfolds into answers). Continuity beats new elements appearing.
- Smooth and premium: no stutter, no layout shift on open, no element that jumps, fades in after moving, or "strolls" sideways at the end. Settle with a gentle ease-out; a touch of overshoot only for success/discovery.
- Choreograph in beats: main element first, then the rest staggered (40–60ms). Start quickly (no dead time before the first move) but don't rush the move itself.
- Exits must make sense: never drop cards downward or fade them in odd places; things leave by going where they belong (under the top card, into the deck, back to their slot).
- Stacks: "intentional messy" is fine only when calm; default to clean, straight, aligned. Back cards softer (lighter fill, same border family), pile peeks *beneath* the top card, never above it.
- Windows open per type (sheet from bottom, panel from side), unified and token-driven, not ad-hoc.
- Whole objects move: a tile bounces as a whole (frame and all), presses go down into the element's own bottom edge, remaining items reflow to close gaps (shared layout), nothing stalls halfway.
- Celebrations lead with the mascot and headline; numbers count only after their tile has landed; a tap skips the entrance.
- Gotcha: Tailwind v4 `translate-*` classes set the CSS `translate` property. Never animate `transform` translate on the same element (offsets add up: off-centre mascots, shines stopping on top of text). Animate the property the class sets.
- Always honour reduced motion with an instant, correct end state.

## References (what to borrow, what not)

- **Duolingo**: chunky 3D buttons (solid darker bottom edge that compresses on press, ~180ms), rounded friendly shapes, one bold primary action per screen, celebratory end-of-lesson moment with mascot/lottie, progress bar as the only header chrome. Borrow the polish and feedback clarity; *don't* borrow saturated owl-green everywhere, loud copy, or white-on-white flatness — our canvas is warm off-white and calmer.
- **Du Chinese**: reading-first calm, tap-a-word for pinyin/meaning/audio without leaving the text, generous Chinese type. Model for reading and breakdown screens.
- **HelloChinese**: game-like lesson path, tone colour practice, handwriting canvas. Model for tone colours per syllable and stroke practice (canvas always live, not a static glyph).
- **Pleco / Skritter**: depth of dictionary data, stroke order inline in the card. Borrow the information, never the density or chrome.
- Dribbble flashcard shots the owner shares: large card, minimal chrome, one clear pair of answer buttons.

## Workflow

0. Plan first for design work (see AGENTS.md); propose something better than the literal ask.
1. One sentence: the screen's primary user job. One primary action, ≤2 secondary.
2. Look at the live screen before redesigning. Never by answering on the owner's real deck (it writes SRS and syncs): use the DEV debug window, Ctrl+Shift+0 → UI Previews, or ask.
3. Prototype (artifact) → pick → build. Reuse widgets/tokens (`.claude/rules/ui.md`, `docs/WIDGETS.md`, [visual-system.md](references/visual-system.md)).
4. Verify yourself at 390x844 and 1440x900: compare to the prototype, check states (hover, pressed, empty, loading, long words), motion frame-by-frame where possible, reduced motion.

## Completion gate

- Looks like the approved prototype at both sizes; no clipped/overlapping text; long Chinese words fit.
- No new palette, icon family, hex value, or one-off button/card pattern; tokens only.
- One scroll container per workspace (shell `main`); sticky headers per `.claude/rules/ui.md`.
- No disabled buttons, no new labels/pills the owner didn't ask for.
- Typecheck + lint pass; update `docs/WIDGETS.md` for new shared widgets.

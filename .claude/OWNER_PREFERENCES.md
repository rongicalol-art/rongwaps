# Owner preferences: taste and learning rules

The one home for the owner's taste, for any AI (Claude, Codex, others). Read it before UI, design, motion or copy work. It sums up many sessions of corrections, and each line carries its reason so you can judge new cases yourself. When the owner corrects a design, change the matching line here; don't add a copy anywhere else. Working process and shipping live in `AGENTS.md`; code-level UI facts in `.claude/rules/ui.md`.

## 1. What good looks like

- **The feel:** playful, illustrated and polished, like Duolingo, in the app's own warm palette. Bright friendly illustrations, chunky buttons you want to press, smooth motion, every screen part of one system. Premium means clear hierarchy and finish, not plainness.
- **One bold idea, done cleanly.** The designs the owner loved each had a single idea carried all the way through: the last flashcard becomes the quiz's first question; a speaker tile turns into its word once matched; the 1/2/3 number badges on answer choices; a button that presses down into its own bottom edge.
- **The two ways a design misses.** Too plain: it follows every rule and has no idea in it. Too much: labels, boxes and effects added to fill space. Both are fixed the same way: find the one idea, then remove what doesn't serve it.
- **Design in the app's own voice.** Look at the existing screens and illustrations first and extend them. A new tab or state reuses its siblings' layout and text styles before inventing its own. The owner does not want the app reinterpreted in another style (flat, monochrome, ink, corporate).
- **Learning comes before decoration.** Every feature helps the learner remember a word's meaning, its sound and its characters.

## 2. Visual taste

**Few elements, each earning its place.**
- Use the fewest zones that do the job. When a screen feels empty, fix the composition (size, alignment, centring) before adding anything.
- An element belongs if it tells the learner something they need right now. Rejected again and again because they only repeated what the screen already showed: description lines, "what you'll learn" lists, word-chip previews, stats lines, breadcrumbs ("Lesson 1 · Part 1 vocabulary"), status pills ("Review · 1 of 2", "Missed", "Done"), counts next to buttons, floating helper text.
- A bordered box inside a bordered container (a tile inside a card inside a bar) reads as messy. Inside a container, use plain text with hierarchy: size, weight, ink colour.
- Helper content that isn't the main task (hints, examples) sits behind a quiet toggle. Settings are plain label-and-control pairs.
- A button that can't be used is clutter: if a mode has no content, leave the action out instead of showing it disabled.

**Tactile, not flat.**
- Anything you can press looks like a real button: a border plus a solid, darker bottom edge that compresses when pressed. Selected = book accent border with a soft fill. A plain row reads as "not a button".
- Depth only ever means "press me", so docks, windows and stacks carry no drop shadows. No blur (it also costs CPU), glass, background textures (dots, grids) or busy gradients. The two exceptions that exist: the soft fade under the top header, and the brief glow and shine on a celebration.
- Card borders are a little heavy (3px with a thick bottom edge) and the same thickness across a screen.

**Quiet chrome.**
- Headers and menu bars have no border or separator; header text is centred; numbers in top bars are the same size on phone and desktop.
- Check marks are small, gray and smooth with no background. Hover and active states on lists are subtle with a matched radius, never a loud solid pill.
- Gray outlines must read clearly: more contrast, not less.

**Plain over decorated.**
- Pinyin in feedback and lists is plain ink, no tone colours there.
- Small square badges are liked; the 1/2/3 badges on answer choices are the model. Key hints ("Space") look like them, hang just after the button label, and the label stays centred.
- Pills and chips are squarish. Fully rounded pills look bad to the owner. Part-of-speech badges are neutral. Favourite is a gold star with no circle behind it.

**Colour has a job.**
- Two themes: warm off-white, and warm charcoal for dark mode. Never pure white, never blue-tinted. Both themes must work, which is why colour goes through tokens.
- The book's accent colour carries progress, selection and done states. Green, red and amber are for answer feedback only.
- The review round uses a muted honey tone, and text and lines warm up with it (never cold gray on honey).
- Nothing saturated enough to "hurt the eyes". Answer buttons and docks stay quiet.

**Shapes and type.**
- Buttons are compact with a confident height: not too round, not too long. One radius family per surface.
- Nunito heavy for titles. Chinese text uses the study font (`font-chinese`), so the learner's chosen font applies everywhere.
- Sibling blocks share exactly the same text styles; "text styles are inconsistent" is a recurring complaint. Short copy, no uppercase sentences.
- App labels and titles are English. Chinese characters belong to the study content, not to buttons, tabs or screen titles.

**Pictures and icons.**
- The app's illustrations are the picture style: warm, colourful flat art (sunny rooms, wooden desks, plants; coral, navy and gold), rounded shapes, tiny expressive faces. Anything drawn for an exercise (clocks, calendars, objects) matches it. Pictures are generated illustrations in that style, not hand-drawn SVG scenes.
- Pictures keep their own colours in dark mode. Native ratio (reading art is 16:9), never cropped, no text laid over a picture; text that belongs to the drawn object, like a calendar's month, is fine.
- Navigation and modes use the flat colourful icon set; controls use Phosphor. Grammar = book, reading = dialogue, quiz = ?, in one dark ink colour.
- A celebration shows the mascot, a lottie (trophy) or the content itself, never a generic action icon as the hero.

**Layout.**
- Desktop keeps the side nav. Windows open beside it, never as a full-bleed takeover or a centred pop-up for a primary screen. Side panels over square modals.
- Mobile gets its own hierarchy, not a stacked desktop.
- Bottom docks share one standard (padding, position, size) across the app. The feedback bar must not cover content on a 900px-tall desktop window.

## 3. Motion (the owner cares most here)

- **Motion explains cause and effect.** The thing you touched becomes the next thing: a card shrinks into its sheet, a button unfolds into its answers, a tile flies into its slot and the rest slide together to close the gap. Continuity beats new elements appearing.
- **Physical and complete.** Whole objects move (the whole tile bounces, frame and all). Presses go down into the element's own bottom edge. Nothing stalls halfway, jumps, fades in after it has moved, drifts sideways at the end, shifts the layout on open, or leaves a hole behind.
- **Choreographed in beats.** The main element first, then the rest staggered 40-60ms apart (up to about 110ms between the big beats of a celebration). Start at once, settle with ease-out, overshoot only for success or discovery. A number counts only after its tile has landed. A celebration leads with the mascot and the headline, not the stats.
- **Exits make sense.** Things leave by going where they belong (under the top card, into the deck, back to their slot); cards never just drop downward or fade in odd places.
- **Stacks are tidy.** Clean, straight and aligned by default; back cards are softer; the pile peeks from beneath the top card, never above it.
- **Windows open by type:** a sheet from the bottom, a panel from the side, the same way everywhere.
- **Reduced motion** gets an instant, correct end state, and a tap skips a long entrance.

## 4. Learning and product rules

- **Every quiz question tests meaning:** hanzi → meaning, audio → meaning, or meaning → hanzi. Never pinyin or hanzi alone.
- **Fair:** every question type is open to every word. Only the data limits it: listening needs audio, and build-the-word needs 2-4 characters.
- **Quick true or false:** one tap (No / Yes), no follow-up question. The feedback bar shows the real meaning, and a wrong meaning that was shown is struck through.
- **The learner picks the quiz:** Mixed (default, recommended) or any set of single types, before every vocab quiz. Only types the deck can use are offered; words that fit none of the picked types are left out.
- **Full coverage:** every word in the quiz is asked exactly once per pass. Misses come back in the review round, in the same picked types.
- **Audio is the high-quality recording.** Avoid the robotic text-to-speech voice wherever a recording exists. Play the word after every answer.
- **Vocab quiz ≠ grammar quiz.** Sentence and grammar exercises come after grammar and reading, in a separate quiz.
- **Content that needs authoring** (goes-with match, situation pick, tap the group) needs the owner's review before data or packs change.

## 5. Reading the owner's feedback

- "Looks bad / messy / unpolished / tight / not centred" usually means one exact detail (a label off-centre, mismatched corners, a stalling animation, nested boxes). Find it and name it in a line, e.g. "the badge is absolutely positioned, so the label shifts", then fix exactly that. Restyling beyond the request is the mistake the owner dislikes most.
- "Suggest / be creative / be a designer" asks for a real opinion: one recommendation and honest pushback ("dont just agree, be critical"), never a menu without a pick.
- The owner swings fast ("too faint" → "too strong") and reverses often ("go back", "remove it"). Keep each change small and isolated so it reverts cleanly, and move in half-steps after a reversal.
- When the owner picks one direction, carry over ideas from the others only if asked.
- "It doesn't look like the prototype" is a frequent complaint: match sizes, spacing, weight and font exactly when you build.

## 6. References

- **Duolingo:** chunky 3D buttons, one bold primary action, a mascot celebration at the end of a lesson, the progress bar as the only header chrome. Borrow the polish, not the saturated green, loud copy or white-on-white flatness.
- **Du Chinese:** reading-first; tap a word for pinyin, meaning and audio without leaving the text; generous Chinese type.
- **HelloChinese:** game-like lesson path, tone practice, a handwriting canvas that is always live.
- **Pleco / Skritter:** depth of data, stroke order in the card. Borrow the information, never the density.
- **Dribbble flashcard shots the owner shares:** a large card, minimal chrome, one clear pair of answer buttons.

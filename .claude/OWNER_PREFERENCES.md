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
- Helper content that isn't the main task (hints, examples) sits behind a quiet toggle. Settings are plain label-and-control pairs. Longer study extras open from a button into a sheet (side panel on desktop) rather than unfolding into the screen: the owner picked the lesson test's Script sheet over a speaker that opens in place. In the mock test's Fix round, the feedback bar shows the reason. The answer text, pinyin, and translation belong in Script.
- On a long review page (the test's Scripts & answers), pinyin and English start hidden behind Pinyin and English buttons. Pinyin goes over the characters as in the Reader, never on a line of its own, and a line's play button sits at the end of its text, not in a column of its own: both pushed the text onto extra lines ("too much space").
- A button that can't be used is clutter: if a mode has no content, leave the action out instead of showing it disabled.
- An icon-only button hides what it does (phones have no hover): the lesson's Practice button carries its word. Beside the primary it stays plain white, so Start is plainly the one coloured action; a gold edge there competed with it.
- End screens keep few buttons: one suggested next step, Continue, and Review missed only when words were missed. "Study all again" after a quiz was cut as one too many.
- An optional, social extra on an end screen (Challenge a classmate on the quiz result) is a quiet accent text action under the buttons, never another boxed button: one more boxed button in the stack read as "too many buttons".
- A landing page for one action says its message once: the picture, one headline, one quiet line, the button. A "Mia challenged you" row plus a headline plus a lesson line plus a two-line legal note read as "too messy"; the sender's face sits on the picture's edge instead.

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
- Small square badges are liked; the 1/2/3 badges on answer choices are the model. Key hints ("Space") look like them, hang just after the button label, and the label stays centred. Hide the hint when it would crowd the button edge.
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
- The book's name in page titles and search text is English first: "Modern Chinese (時代華語)". Chinese first looked bad in Google results, which also dropped the space after it, and most people search the English name.

**Pictures and icons.**
- The app's illustrations are the picture style: warm, colourful flat art (sunny rooms, wooden desks, plants; coral, navy and gold), rounded shapes, tiny expressive faces. Anything drawn for an exercise (clocks, calendars, objects) matches it. Pictures are generated illustrations in that style, not hand-drawn SVG scenes.
- Pictures keep their own colours in dark mode. Native ratio (reading art is 16:9), never cropped, no text laid over a picture; text that belongs to the drawn object, like a calendar's month, is fine.
- Navigation and modes use the flat colourful icon set; controls use Phosphor. Grammar = book, reading = dialogue, quiz = ?, in one dark ink colour.
- A count that means something new rides on the real icon for it: new messages are the app's chat bubble (filled) with the number inside, on the corner of the faces. A hand-built shape (a square with a rotated-square tail) read as a map pin. A number keeps the meaning learners already learned: the one beside the faces is always "online".
- A celebration shows the mascot, a lottie (trophy) or the content itself, never a generic action icon as the hero.
- Drawn shapes stay simple and friendly; the richness goes into how they move and what happens around them. The streak fire is one clean flame: extra tongues read as "too many hairs", while the burst, glow and embers around it were liked. A hero and the number under it need clear air between them.

**Layout.**
- Desktop keeps the side nav. Windows open beside it, never as a full-bleed takeover or a centred pop-up for a primary screen. Side panels over square modals.
- Mobile gets its own hierarchy, not a stacked desktop.
- A profile's action (Add friend, Accept) sits on the right of the picture, just under the cover, the way familiar profile pages do it, not on its own row under the name.
- Tabs inside a panel (Chats / Online) are the underlined text tabs of the lesson window's parts, not a pill switcher; a count rides after the label.
- Bottom docks share one standard (padding, position, size) across the app. The feedback bar must not cover content on a 900px-tall desktop window.

## 3. Motion (the owner cares most here)

- **Motion explains cause and effect.** The thing you touched becomes the next thing: a card shrinks into its sheet, a button unfolds into its answers, a tile flies into its slot and the rest slide together to close the gap. Continuity beats new elements appearing.
- **Physical and complete.** Whole objects move (the whole tile bounces, frame and all). Presses go down into the element's own bottom edge. Nothing stalls halfway, jumps, fades in after it has moved, drifts sideways at the end, shifts the layout on open, or leaves a hole behind.
- **Choreographed in beats.** The main element first, then the rest staggered 40-60ms apart (up to about 110ms between the big beats of a celebration). Start at once, settle with ease-out, overshoot only for success or discovery. A number counts only after its tile has landed. A celebration leads with the mascot and the headline, not the stats.
- **Exam screens stay still.** The owner turned down a staggered entrance and a sliding question change for the test's reading screen ("no need for animations"): a test question just appears; only presses and the existing screen rise move.
- **Exits make sense.** Things leave by going where they belong (under the top card, into the deck, back to their slot); cards never just drop downward or fade in odd places.
- **Stacks are tidy.** Clean, straight and aligned by default; back cards are softer; the pile peeks from beneath the top card, never above it.
- **Windows open by type:** a sheet from the bottom, a panel from the side, the same way everywhere.
- **Reduced motion** gets an instant, correct end state, and a tap skips a long entrance.

## 4. Learning and product rules

- **Every quiz question tests meaning:** hanzi → meaning, audio → meaning, or meaning → hanzi. Never pinyin or hanzi alone.
- **Fair:** every question type is open to every word. Only the data limits it: listening needs audio, and build-the-word needs 2-4 characters.
- **Fast modes never pause for feedback.** In Type mode a right answer moves on at once; its word and meaning pop up as a small tile where the feedback bar lives and slide away on their own. A hold before the next word broke the flow, and a quiet line carried over above the input looked out of place.
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

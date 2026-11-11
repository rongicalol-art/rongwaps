---
name: rongwaps-ui-director
description: Direct and review UI work for the Ron's Mandarin Chinese-learning web app. Use for screen design, redesigns, component styling, animation/motion, icon or illustration choices, responsive polish, visual audits, and any request to make Ron's Mandarin feel more premium, playful, cohesive, or intentional.
---

# Ron's Mandarin UI director

The owner's taste lives in one file: `.claude/OWNER_PREFERENCES.md`. Read it now; it says what good looks like and why. Code-level facts (components, tokens, layout shell) are in `.claude/rules/ui.md`, token values in `docs/DESIGN_TOKENS.md`, widgets in `docs/WIDGETS.md`. The owner judges by eye from screenshots, so the bar is "looks intentional on a real screen", not "matches a spec".

## How a design task runs

1. Say the screen's main job for the learner in one sentence, and its one primary action.
2. Look at the live screen before changing it; the DEV window's UI Previews are the quickest way in.
3. Find the one idea (see "What good looks like"). Propose something better than the literal ask when you see it, and say why.
4. Polish, a new state of an existing screen, pictures, spacing: build it in the app and show real screenshots. A mock's fonts and spacing differ from the app's.
5. A new screen or a big redesign: publish a clickable HTML prototype first, with the app's real tokens, phone (390) and desktop (1440) inside a mock app shell with the side nav, and 2-3 named, clearly different directions with one recommended. Iterate on the same link. Keep text off images in a prototype: the owner's viewer drew such overlays as solid blue boxes. Build after the owner's pick, and match the prototype exactly.
6. Look at the result yourself (Checks in `AGENTS.md`), including its states (hover, pressed, empty, loading, long Chinese words), motion and reduced motion.

## Before calling it done

- It has one clear idea and nothing on screen that the owner didn't ask for and the learner doesn't need.
- No new palette, icon family or one-off button or card pattern.
- For a prototyped screen: it looks like the approved prototype at both sizes.

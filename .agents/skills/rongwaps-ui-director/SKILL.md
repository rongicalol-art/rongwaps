---
name: rongwaps-ui-director
description: Direct and review UI work for the RongWaps Chinese-learning web app. Use for screen design, redesigns, component styling, icon or illustration choices, responsive polish, visual audits, and any request to make RongWaps feel more premium, playful, cohesive, or intentional.
---

# RongWaps UI Director

Create a coherent premium-playful learning product, not a collection of individually cute screens. Preserve the app's tactile personality while making hierarchy, spacing, iconography, and illustration feel authored as one system.

## Start With Context

1. Read the project `AGENTS.md`, `WIDGETS.md`, and relevant screen/widget files.
2. Inspect the existing screen in a browser before redesigning it.
3. Reuse existing widgets and feature boundaries before creating components.
4. Read [visual-system.md](references/visual-system.md) when choosing colors, depth, icons, mascots, typography, or motion.
5. Treat `src/data/designTokens.ts` + the CSS variables in `src/index.css` as the single source of truth for color, depth, and radius. Never hardcode neutral hex values; use the `ui-*`/`brand-*`/`feedback-*` tokens (AGENTS.md rules 14–15). For prior design decisions and consistency audits, review `docs/UI_CONSISTENCY_AUDIT.md` and `DECISIONS.md` when relevant.

## Design Workflow

1. State the screen's primary user job in one sentence.
2. Identify one primary action and no more than two secondary actions.
3. Establish hierarchy using layout and type before adding decoration.
4. Use Phosphor icons through the semantic app icon layer for functional controls.
5. Use original RongWaps mascot assets only for navigation, celebration, empty states, and teaching moments.
6. Implement one complete screen or flow at a time.
7. Verify desktop and mobile screenshots, interaction states, loading, empty, error, and long-text behavior.

## Premium-Playful Standard

- Keep tactile depth purposeful: strongest on primary actions, lighter on cards, absent on plain page sections.
- Prefer clear full-width composition over nested cards.
- Use color to communicate meaning or course identity, not to fill every surface.
- Keep one dominant visual idea per viewport.
- Reserve large type for genuine screen-level moments.
- Give Chinese characters generous optical space and use the project Chinese type stack.
- Prefer solid color, subtle grid texture, and crisp edges over generic gradients or glass everywhere.
- Motion should confirm cause and effect. Keep routine transitions quick; save bounce for success and discovery.

## Icon And Asset Rules

- Use the semantic `AppIcon` widget. Add a semantic name there instead of importing a second icon for the same concept.
- Use one icon family per control surface; Phosphor is the default.
- Do not use pop-culture characters, unrelated stock mascots, or mixed illustration families.
- Generate original bitmap illustrations when a mascot or scene materially improves learning. Do not generate UI controls as images.
- Every unfamiliar icon-only action needs an accessible label and tooltip where appropriate.

## Completion Gate

- No direct Supabase access from screens or widgets.
- No raw reusable button/card pattern duplicated inside a screen.
- No new unapproved palette or icon family.
- No incoherent overlap or clipped text at mobile and desktop sizes.
- Mobile-first: validate every design at mobile AND desktop breakpoints. Mobile hierarchy must be intentional, not a stacked desktop layout.
- Exactly one scroll container per workspace (the shell `main`). Never wrap a screen in its own `overflow-y-auto`/`h-full` container, or sticky headers scroll away.
- Top-level workspace headers use the canonical gradient-fade sticky treatment at ALL breakpoints: `sticky top-0 z-40 bg-gradient-to-b from-ui-canvas via-ui-canvas/95 to-transparent backdrop-blur-[2px]` (AGENTS.md rule 32).
- Typecheck and production build pass.
- Browser review covers at least 390x844 and 1440x1000 for substantial UI work.
- Update `WIDGETS.md` for reusable widgets and update project documentation for new conventions.

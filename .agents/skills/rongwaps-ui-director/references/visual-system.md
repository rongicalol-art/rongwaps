# RongWaps Visual System

> **Source of truth:** `src/data/designTokens.ts` and the CSS variables in `src/index.css`. Always use the token identifiers below (or the `ui-*`/`brand-*`/`feedback-*` Tailwind classes) in code — never hardcode hex values for neutrals. Adjust neutral contrast centrally only (AGENTS.md rule 14).

## Personality

RongWaps is an encouraging Chinese-learning companion: curious, tactile, bright, and capable. Premium means deliberate hierarchy, coherent assets, and polished states, not muted colors or decorative complexity.

## Core Palette (real tokens)

| Semantic role | Token | Value |
| --- | --- | --- |
| Canvas | `--color-ui-canvas` | `#f2f3f4` |
| Practice canvas | `--color-ui-practice-canvas` | `#e9eef1` |
| Surface | `--color-ui-surface` | `#ffffff` |
| Surface hover | `--color-ui-surface-hover` | `#fafafa` |
| Ink strong | `--color-ui-ink-strong` | `#2f3237` |
| Ink | `--color-ui-ink` | `#4b4b4b` |
| Muted strong | `--color-ui-muted-strong` | `#777777` |
| Muted | `--color-ui-muted` | `#8c959b` |
| Border | `--color-ui-border` | `#c3c8cc` |
| Divider | `--color-ui-divider` | `#d6dade` |
| Hover fill | `--color-ui-hover` | `#f0f2f3` |

| Brand role | Token | Value |
| --- | --- | --- |
| Brand primary (learning blue) | `--color-brand-primary` | `#1cb0f6` |
| Primary edge | `--color-brand-primary-edge` | `#1899d6` |
| Primary deep | `--color-brand-primary-deep` | `#117cad` |
| Brand secondary (warm orange) | `--color-brand-secondary` | `#ff9600` |
| Secondary edge | `--color-brand-secondary-edge` | `#e58700` |
| Disabled | `--color-brand-disabled` / `--color-brand-disabled-edge` | `var(--color-ui-border)` / `var(--color-ui-muted)` |

| Feedback role | Token | Value |
| --- | --- | --- |
| Success | `--color-feedback-success` | `#58cc02` |
| Success edge | `--color-feedback-success-edge` | `#58a700` |
| Success hover | `--color-feedback-success-hover` | `#46a302` |
| Success surface | `--color-feedback-success-surface` | `#d7ffb8` |
| Warning (energy yellow) | `--color-feedback-warning` | `#ffc800` |
| Warning edge | `--color-feedback-warning-edge` | `#e0a900` |
| Danger | `--color-feedback-danger` | `#ff4b4b` |
| Danger edge | `--color-feedback-danger-edge` | `#ea2b2b` |
| Danger hover | `--color-feedback-danger-hover` | `#ff2b2b` |
| Danger surface | `--color-feedback-danger-surface` | `#ffdfe0` |

Course accents may vary, but neutral UI should remain stable across courses.

## Depth (real tokens)

| Role | Token | Value |
| --- | --- | --- |
| Compact action bottom edge / travel | `--depth-compact` | 4px |
| Primary action bottom edge / travel | `--depth-control` | 6px |
| Content card bottom edge | `--depth-card` | 4px |

- Primary action: 6px bottom edge and 6px active travel.
- Compact action: 4px bottom edge and 4px active travel.
- Content card: outline with a 4px bottom edge; do not animate unless clickable.
- Page section: unframed by default.
- Modal: one framed surface over a restrained backdrop; do not nest cards for layout.

## Shape (real tokens)

| Role | Token | Value |
| --- | --- | --- |
| Compact controls | `--radius-compact` | 14px |
| Controls | `--radius-control` | 20px |
| Feature cards / primary controls | `--radius-feature` | 24px |
| Icon buttons | circular or compact radius | per surrounding geometry |

- Use a smaller radius when information density rises.

## Typography

- `--font-sans`: Nunito UI stack (mixed Latin/Chinese) for interface copy.
- `--font-chinese`: LXGW WenKai-based Chinese stack for focused character display; every Chinese glyph uses this stack (AGENTS.md rule 15).
- Screen titles: bold, compact, and literal.
- Uppercase labels are short and secondary; avoid long uppercase sentences.
- Letter spacing is zero except for existing compact category labels where scanning benefits.

## Iconography

- Phosphor bold for controls and navigation concepts, exposed through the semantic `AppIcon` gateway widget.
- Filled icons for status, achievement, and selected states.
- Keep stroke weight and optical size consistent within a toolbar.
- Mascot art never substitutes for a familiar control icon.

## Illustration

- Original RongWaps characters share rounded geometry, crisp flat fills, tiny expressive faces, and one learning prop.
- Use blue, coral/orange, yellow, green, and dark ink across the family.
- Avoid references to existing entertainment characters.
- No text or logos inside generated illustrations.
- Prefer transparent or clean isolated assets that remain readable at 40-96px.
- Current Adventure Time SVGs are temporary; replace with licensed/original RongWaps art before public launch (AGENTS.md rule 13).

## Review Questions

1. Can a learner identify the next action in two seconds?
2. Does each color have a job?
3. Are depth and motion proportional to importance?
4. Do all illustrations appear to come from one world?
5. Does the mobile layout preserve hierarchy rather than merely stack desktop blocks?
6. Are empty, loading, error, disabled, hover, focus, and pressed states intentional?
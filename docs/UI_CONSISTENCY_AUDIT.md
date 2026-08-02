# RongWaps Application Audit — July 2026

This audit covers every user-reachable screen in the current application shell. Internal `DebugWindow` tooling is excluded because it is not a product route. The obsolete, unrendered `personal-vocab` activity was removed from the live activity contract during this pass.

Scores use a strict 10-point scale. The ten final category columns are Buttons/action hierarchy (Btn), Layout/spacing (Lay), Readability/typography (Type), State clarity (State), Responsive behavior (Resp), Accessibility (A11y), Functional reliability (Func), Performance (Perf), Architectural consistency (Arch), and Overall quality (Final). “Before” records the baseline overall score. All final scores are at least 8.5; remaining cross-application risks are listed below rather than hidden in the scores.

## Complete screen scorecard

| Screen or state | Before | Btn | Lay | Type | State | Resp | A11y | Func | Perf | Arch | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Books / curriculum dashboard | 8.0 | 8.8 | 8.9 | 8.8 | 8.8 | 8.9 | 8.7 | 8.9 | 8.6 | 8.7 | **8.8** |
| Dictionary home | 8.1 | 8.8 | 8.9 | 8.9 | 8.8 | 8.9 | 8.8 | 8.9 | 8.6 | 8.8 | **8.8** |
| Dictionary results | 7.4 | 8.8 | 8.8 | 8.8 | 8.8 | 8.9 | 8.9 | 9.0 | 8.7 | 8.9 | **8.9** |
| Dictionary details drawer | 7.2 | 8.7 | 8.8 | 8.8 | 8.8 | 8.9 | 8.9 | 8.9 | 8.6 | 8.8 | **8.8** |
| Character breakdown | 8.0 | 8.7 | 8.8 | 8.8 | 8.7 | 8.9 | 8.6 | 8.9 | 8.6 | 8.7 | **8.7** |
| Library home | 7.5 | 8.7 | 8.8 | 8.8 | 8.8 | 8.9 | 8.9 | 8.9 | 8.6 | 8.8 | **8.8** |
| Library folder / empty state | 7.2 | 8.7 | 8.8 | 8.7 | 8.8 | 8.9 | 8.9 | 8.9 | 8.6 | 8.8 | **8.8** |
| New-folder dialog | 6.8 | 8.8 | 8.7 | 8.7 | 8.9 | 8.9 | 9.0 | 8.9 | 8.7 | 8.9 | **8.8** |
| Card creator — front and back | 6.9 | 8.8 | 8.7 | 8.7 | 8.9 | 8.8 | 8.9 | 8.9 | 8.6 | 8.6 | **8.8** |
| Delete confirmations | 6.7 | 8.9 | 8.8 | 8.8 | 9.0 | 8.9 | 9.0 | 9.0 | 8.8 | 9.0 | **8.9** |
| Profile and vocabulary garden | 7.2 | 8.7 | 8.8 | 8.8 | 8.8 | 8.9 | 8.8 | 8.9 | 8.7 | 8.8 | **8.8** |
| App settings | 7.0 | 8.8 | 8.8 | 8.8 | 8.9 | 8.9 | 9.0 | 8.9 | 8.8 | 8.9 | **8.9** |
| Authentication drawer | 7.8 | 8.7 | 8.8 | 8.8 | 8.8 | 8.9 | 8.9 | 8.7 | 8.7 | 8.8 | **8.8** |
| Practice header, settings, and mode dock | 7.1 | 9.0 | 8.8 | 8.8 | 9.0 | 8.9 | 8.9 | 8.9 | 8.7 | 9.0 | **8.9** |
| Flashcards | 7.6 | 8.9 | 8.9 | 8.8 | 8.9 | 8.9 | 8.8 | 9.0 | 8.7 | 8.9 | **8.9** |
| Quiz and feedback states | 8.0 | 8.9 | 8.8 | 8.8 | 9.0 | 8.9 | 8.8 | 8.9 | 8.7 | 8.8 | **8.9** |
| Listening | 7.1 | 8.8 | 8.8 | 8.8 | 8.9 | 8.9 | 8.9 | 8.8 | 8.6 | 8.8 | **8.8** |
| Writing | 4.5 | 8.7 | 8.8 | 8.8 | 8.8 | 8.9 | 8.7 | 8.9 | 8.7 | 8.9 | **8.8** |
| Grammar — Learn | 7.4 | 9.2 | 9.0 | 8.8 | 9.3 | 8.9 | 8.8 | 9.0 | 8.7 | 8.9 | **9.0** |
| Grammar — Practice | 8.2 | 8.9 | 9.0 | 8.8 | 9.1 | 8.9 | 8.8 | 9.0 | 8.7 | 8.9 | **8.9** |
| Grammar — Complete | 8.1 | 8.9 | 8.8 | 8.8 | 8.9 | 8.8 | 8.8 | 8.9 | 8.7 | 8.8 | **8.8** |
| Reading — Read | 6.8 | 8.8 | 8.8 | 8.7 | 8.8 | 8.9 | 8.8 | 8.9 | 8.7 | 8.9 | **8.8** |
| Reading — Notice | 7.3 | 8.8 | 8.9 | 8.8 | 8.8 | 8.9 | 8.8 | 8.9 | 8.7 | 8.9 | **8.8** |
| Reading — Build | 7.1 | 8.9 | 8.8 | 8.7 | 8.9 | 8.9 | 8.9 | 8.9 | 8.7 | 8.9 | **8.8** |

## Verified changes

- Replaced ambiguous or unlabeled icon controls in global headers, drawers, library navigation, card creation, dictionary search, listening, and practice sessions with named semantic controls.
- Added consistent dialog names, Escape dismissal, prior-focus restoration, and focus containment to drawers, destructive confirmations, and full-screen activities.
- Rebuilt shared action hierarchy around `ActionButton`, `IconActionButton`, and `SegmentedControl`; selected mode states remain selected on hover.
- Kept permanent desktop navigation visible by applying workspace bounds to activities, lessons, breakdowns, drawers, and settings.
- Fixed mobile profile-stat truncation, noninteractive tactile styling, and mobile/desktop navigation synchronization after viewport changes.
- Fixed Writing’s blank canvas and runtime exception by resolving CSS design tokens to concrete colors before passing them to Hanzi Writer.
- Moved Hanzi, stroke-order, and Lottie network loading behind a cached service with in-flight request deduplication. No screen or widget now performs a direct network request.
- Fixed dictionary packs whose definitions were JSON-encoded strings; `你好` now renders as `hello; hi`, not `["hello; hi"]`. Numeric array indexes are no longer presented as parts of speech in the detail drawer.
- Removed the obsolete `personal-vocab` activity type that could produce an empty practice window, and centralized the live activity types in `src/types/models.ts`.
- Split the oversized activity orchestrator into a 211-line container plus focused animation and mode-dock presenters.
- Added an explicit keyboard/touch delete action for custom folders; long press and context-menu deletion remain optional shortcuts rather than the only path.
- Consolidated destructive library confirmations into one reusable alert dialog and corrected the folder-deletion explanation.

## Browser verification matrix

The application was exercised at 390×844, 768×900, and 1440×900. The top-level Books, Dictionary, Library, and Profile workspaces had zero document-width overflow and zero rendered unnamed buttons in the audited default states. Activity and breakdown bounds were measured at all three widths: full viewport on mobile and correctly offset from the permanent navigation at tablet/desktop.

Verified journeys and states:

- Books selection, lesson-part controls, Grammar Learn, Grammar Practice navigation, Reading Read → Notice → Build, and contextual dictionary entry.
- Dictionary home, suggestion search, results, saved-word utility, details, character drill-down, and definition normalization.
- Library home, folder empty state, new-folder disabled/enabled states, reversible guest-only folder creation/deletion, card-creator front/back progression, and retained front-face data when navigating back.
- Profile, garden empty/hydrated state, settings, reset entry, authentication drawer, and guest dismissal.
- Flashcard flip surface, practice mode switching, wrong-answer Quiz feedback, Listening controls, and rendered Writing strokes.
- Drawer focus loop, Escape dismissal, focus restoration, selected controls, disabled actions, empty states, and mobile touch-target sizing.

No production record, schema, deployment, commit, push, or git history was changed. The temporary guest-only QA folder was deleted during the same verification flow and the library returned to its original two collections.

## Validation and classified risks

- `npm run lint`: passes (`tsc --noEmit`).
- `npm run build`: passes; final output still reports the risks below.
- No automated test script exists in `package.json`; journey coverage is browser-based and should be converted into repeatable component/end-to-end tests.
- The primary JavaScript bundle remains approximately 1.9 MB (about 453 KB gzip). Vite also reports mixed static/dynamic imports for course and vocabulary modules. Route-level/activity-level chunking needs a measured follow-up rather than an unverified rewrite.
- `lottie-web` emits an `eval` warning in the production bundle. It is third-party behavior; the app now caches Lottie JSON loads but does not replace the renderer.
- Several hero image assets are approximately 1.1–1.3 MB and remain candidates for responsive WebP/AVIF conversion after visual comparison.
- OAuth completion was not executed because it would leave the safe local test boundary. The sign-in drawer and guest path were verified; provider callback behavior remains dependent on configured Supabase/OAuth environments.
- Audio controls and state changes were exercised, but audible output quality and iOS hardware mute/autoplay behavior still require device testing.
- Remote failure injection was not performed against production services. Existing safe error/empty UI paths were inspected; deterministic mocked service tests remain the right next step.

# Shared Widget Catalog

`src/lib/widgets/` holds presentation-first UI used by 2+ features. Import from the barrel (`../lib/widgets`); the barrel mirrors this catalog. Feature-only UI lives beside its screen or in `src/features/<domain>/`.

## Rules

- Widgets take data and callbacks via props. No fetching, no feature stores, no direct service imports.
- Use `ui-*` / `brand-*` / `feedback-*` tokens, token radii and shadows. No hardcoded hex, no manual `ring-*` stacks (`docs/DESIGN_TOKENS.md`). Keep `.focus-ring`, keyboard nav, reduced motion, loading/empty/error and long-text behavior.
- Never hand-roll what a widget owns: `fixed inset-0` + nav padding (use `WorkspaceWindow`), the popover surface (`popover-surface` in `src/index.css`), on/off rows (`SwitchRow`), header fade recipes (`ScreenHeader` `variant` + `tone`).
- Canvas ownership: `LayoutShell` paints the workspace canvas. Route containers and in-flow headers stay transparent; only full-screen windows and sticky fades reference canvas tokens. Loading/empty/error surfaces inherit the tone of the window they live in (`LoadingScreen` `tone`).
- Icons: add a semantic name to `AppIcon` rather than importing another icon set.
- Compound widgets (`Dialog`, `Drawer`, `DetailShell`, `FloatingDock`) also accept single-tag usage.

## Actions and selectors

| Widget | File | Purpose / notes |
| --- | --- | --- |
| ActionButton | `ActionButton.tsx` | Text action: `primary` `secondary` `quiet` `danger` `success` `warning`; `sm`/`md`/`lg`, `radius` (`control` default, `feature` for 24px media tiles), `fullWidth`, `loading`, `edgeColor`. One dominant action per surface. Labels default to ALL CAPS (`font-black uppercase tracking-wider`, set by the widget); call sites may opt out with `normal-case tracking-normal` for compact icon+word buttons (e.g. the quiz's Slow button). `secondary` and `quiet` labels take the book accent (`brand-primary-deep`), `quiet` has no box or depth. |
| IconActionButton | `IconActionButton.tsx` | Icon utility button; `icon` and `label` required (label = accessible name + tooltip). |
| KeyChip | `KeyChip.tsx` | Keyboard hint hanging after a button label (`Space`, `1`); place inside a `relative` label span; shown only on precise pointers, never touch; `visible={false}` removes it. |
| EdgeNavButtons | `EdgeNavButtons.tsx` | Invisible left/right tap zones for card/writing screens; `half` or `edge` mode. |
| SegmentedControl | `SegmentedControl.tsx` | Exclusive mode picker; requires `value`, `options`, `onChange`, `ariaLabel`. |
| SettingsDropdownPicker | `SettingsDropdownPicker.tsx` | Labelled tactile select for settings; snaps stored numeric values to nearest option. |
| ToggleSwitch | `ToggleSwitch.tsx` | Presentational on/off switch (`aria-hidden`); render inside a row `<button role="switch">`. |
| SwitchRow | `ToggleSwitch.tsx` | Full-width popover on/off row (`label`, `checked`, `onToggle`, `tinted`). |
| FolderSvg | `FolderSvg.tsx` | Library folder glyph; `isStarred`, `hasPlus`; size via `aspect-[25/21]` wrapper. |

## Icons, flags, branding

| Widget | File | Purpose / notes |
| --- | --- | --- |
| AppIcon | `AppIcon.tsx` | Semantic icon gateway (Phosphor + in-house glyphs/status badges). Includes semantic `camera` and `upload` controls. Decorative by default; pass `title`/`aria-label` to make it `role="img"`. |
| BrandWordmark | `BrandWordmark.tsx` | 文 tile + wordmark; `name`, `collapsed`. |
| CloudPuff | `CloudPuff.tsx` | Decorative cloud silhouette (`aria-hidden` container). |
| VideoBackground | `VideoBackground.tsx` | Looping decorative video with poster; needs `posterSrc` + `webmSrc`/`mp4Src`; honors reduced motion. |
| CountryFlag | `CountryFlag.tsx` | Vector flag by `code` (`GB` `ID` `JP` `US`); no emoji flags. |
| PlayfulNavIcon | `PlayfulNavIcon.tsx` | Flat illustration icon: nav (`books` `dictionary` `library` `profile` `favorite`, …) and quiz types (`meaning` `listening` `characters` `quiz` `trueFalse` `build`). |
| UserAvatar | `UserAvatar.tsx` | Avatar with fallback; `sm`-`xl`, `ring`. |
| ProfileAvatarButton | `ProfileAvatarButton.tsx` | Signed-in avatar button for `StickyWorkspaceHeader` `rightContent` (Books / Library / Dictionary). |
| RongWapsCharacterPortrait | `RongWapsCharacterPortrait.tsx` | 1:1 character bust; requires `character` + `label`. |
| PosBadge | `PosBadge.tsx` | Part-of-speech tag with hover explainer; renders nothing without `pos`. |

## Dialogs, drawers, docks, menus

| Widget | File | Purpose / notes |
| --- | --- | --- |
| ActivityModalWrapper | `ActivityModalWrapper.tsx` | Workspace-bounded activity dialog; requires `id`, `ariaLabel`, `onClose`. |
| Dialog | `Dialog.tsx` | Modal primitive; `Dialog.Root/Backdrop/Content/Header/Title/Description/Close/Body/Footer`; `size` and `depth` tiers, focus trap, portal. |
| Drawer | `Drawer.tsx` | Bottom sheet below `md` (drag-dismiss), floating card at `md+`, or right dock via `mdPlacement="side"`; opens and closes instantly; `tone` `surface`/`practice`/`canvas`; `Drawer.Root/Backdrop/Content/Handle/StickyHeader/Title/Close/Body`. |
| WorkspaceWindow | `WorkspaceWindow.tsx` | Frame for any surface taking over the workspace (Reader, Grammar, details, settings). `tone`; `layer` `overlay`/`window`/`window-detail`. Open/close motion comes from `windowMotion.ts` (`sheet`/`focus`/`pop`/`rise` all use a 120ms fade; reduced motion is instant). The frame owns the open motion: content inside mounts without its own entrance, defaulted by layer; never pass raw motion props. |
| DetailShell | `DetailShell.tsx` | Workspace-bounded detail view; `.Root/.Scroller/.Content/.Floating`. `windowed` opens it as its own `WorkspaceWindow`. |
| ConfirmationDialog | `ConfirmationDialog.tsx` | Destructive confirm on `Dialog`; focus starts on Cancel; `children` + `confirmDisabled` for type-to-confirm. |
| ResumeDialog | `ResumeDialog.tsx` | Opens before a flashcard/quiz window that has saved progress (gate: `useResumeLaunch`), including quiz question 1 and full-deck missed-word reviews. First positions save immediately. Icon, title, position line, optional bar, Continue (primary) or Start over. Copy comes from `resumeCopy` in `utils/srs/resumeState.ts`. |
| DisclosureLine | `DisclosureLine.tsx` | Closed-by-default `<details>` row. |
| DropdownMenu / DropdownMenuItem | `DropdownMenu.tsx` | Keyboard-navigable `popover-surface` menu. |
| ErrorBoundary | `ErrorBoundary.tsx` | Render fallback; `fallback`, `fallbackClassName`. Mounted in `main.tsx` and per tab screen. |
| FloatingDock | `FloatingDock.tsx` | `.Root/.Pill/.Popover` bottom dock; width `sm`-`xl`, `sleepOnIdle` ghost mode. Practice dock placement: `getPracticeDockLayout` in `src/screens/activities/components/practiceDockLayout.ts`; mode controls portal into this dock, never a second one. |
| StudyDrawer | `StudyDrawer.tsx` | Mobile (`lg`-hidden) study sheet; pair with `StudySidePanel`. |
| StudySidePanel | `StudySidePanel.tsx` | Desktop right companion column (`hidden lg:flex`); no bottom fade. |

## Feedback, progress, loading

| Widget | File | Purpose / notes |
| --- | --- | --- |
| AlertBanner | `AlertBanner.tsx` | `variant` danger/warning/info/success; `title`, `onDismiss`, action slot. |
| EmptyState | `EmptyState.tsx` | Icon badge + headline + copy + optional action; `compact` for drawers. |
| CircularProgress | `CircularProgress.tsx` | SVG ring; clamped `value`. |
| CustomProgressBar | `CustomProgressBar.tsx` | Rounded bar; `progress`, `accentClassName`. |
| PracticePartProgressRail | `part-progress/PracticePartProgressRail.tsx` | Default segmented part rail (`segments`, `currentIndex`, `totalCount`). |
| StudyPartProgressRail | `part-progress/StudyPartProgressRail.tsx` | Study variant of the rail. |
| SelectablePartProgressRail | `part-progress/SelectablePartProgressRail.tsx` | Clickable-segment variant. |
| StudyPartButton | `part-progress/StudyPartButton.tsx` | Segment button used by the study rails. |
| LoadingScreen | `LoadingScreen.tsx` | THE loader (no other variant): `fullScreen`, `inline`, `tone` (`canvas`/`practice`) must match the surface being preloaded. Never mount it directly on open: gate with `useOpenPhase` (hold 150ms before showing a loader; content appears immediately when ready). `preloadLoadingScreen()` warms it at idle (App). |
| LottiePlayer | `LottiePlayer.tsx` | Branded motion only. Prefer `loadAnimationData` (lazy import) over `animationData`; `src` for remote. Until loaded it is an empty box of its final size (no spinner); JSON + lottie-react are cached at module level (`preloadLottie`/`preloadAnimation`). Pauses outside the viewport or in a hidden tab, respects reduced motion, and renders authored frames without subframe interpolation. Course art plays once when selected; loading indicators may loop. |
| Skeleton | `Skeleton.tsx` | Generic placeholder. |

## Headers and shells

| Widget | File | Purpose / notes |
| --- | --- | --- |
| ScreenHeader | `ScreenHeader.tsx` | Study/window header. `variant`: `bar` (in-flow), `window` (sticky fade, full-viewport windows), `panel` (detail windows), `frosted` (translucent, Reading Mode). Fade/frost take `tone`. Width defaults `maxWidth="none"`. |
| ScreenLayout | `ScreenLayout.tsx` | Screen content wrapper (padding/width). |
| SectionEyebrow | `SectionEyebrow.tsx` | Uppercase section label; `count`, `icon`, `action`. |
| StickyWorkspaceHeader | `StickyWorkspaceHeader.tsx` | Sticky fade header for Books/Dictionary/Library (menu/back/search slots). |

## Teaching and metrics

| Widget | File | Purpose / notes |
| --- | --- | --- |
| ContextualChineseText | `ContextualChineseText.tsx` | Dictionary-aware Chinese text; requires `onOpenWord`; authored tokens win. |
| ExpandableSearch | `ExpandableSearch.tsx` | Compact trigger expanding to search input; `label` = accessible name. |
| ProgressMetricCard | `ProgressMetricCard.tsx` | Derived metric (`label`, `value`, `detail`, `icon`); real metrics only. |
| ReferenceRow | `ReferenceRow.tsx` | Row for reference sheets: glyph, pinyin over meaning, meta, `loading`; `accentClassName` tints glyph. |
| CharacterTile | `CharacterTile.tsx` | Tappable character tile; `known`, `upcoming`, `active`. |
| CharacterGlyph | `CharacterGlyph.tsx` | Character glyph with a puzzle-piece fallback when the active Chinese font cannot render it. |
| LevelTag | `LevelTag.tsx` | Course `B1 · L3` or TOCFL fallback from `ResolvedLevel` (`resolveLevel`/`useLevel`, `src/utils/lesson/levels.ts`); `row` or `chip`; estimates render `~B1`. Lesson wins over TOCFL. |
| SmartSentence | `SmartSentence.tsx` | Clickable sentence for lookup; `highlightTerms`. |

Performance behavior: `ScreenHeader` translates a full-width rounded fill behind the track mask rather than animating width, preserving the rounded end without scaling distortion. Its inset highlight shares the same spring and review story timer; reduced motion jumps directly to the final progress. Shared headers use an opaque canvas or fade without backdrop blur. Rectangular handoffs keep paper and text on independent transform layers; review headings lift away and remaining tiles gather toward the leading card together before the overlay is removed. Review tiles keep one bottom border, with no extra shadow lip; completion tiles begin settling alongside the main card morph. Mixed quiz review leads with the actual first question, including reordered rounds; review handoffs settle in 420 ms with a separate uniformly scaled word. Meaning/audio content crossfades on that same paper without a second visible border; answers enter as one group after the review sheet clears, and unlock at 480 ms. Match/build questions enter as a group. All handoff layers are inert and removed on completion or cancellation. The DEV Quiz → review quiz fixture runs the real shell lifecycle with fake misses. Completion counters publish at most 20 updates per second. All Motion components inherit the system motion preference from `MotionConfig`. Review tone changes use a 260 ms native root snapshot crossfade, with one palette update; hidden tabs, reduced motion and unsupported browsers apply immediately. Overlapping review owners and skipped callbacks keep the latest tone.

Practice completion lives in `features/practice/SessionComplete`: optional `headline` and `reviewLabel` customize the daily/practice finish while keeping the shared celebration. `SessionStats.trickyCardIds` carries Again/Hard words through the lesson quiz. The end action practices that subset without changing its SRS schedule; it is a finite optional pass. Safe UI checks: DEV → Daily review.

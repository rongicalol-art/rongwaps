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
| ActionButton | `ActionButton.tsx` | Text action: `primary` `secondary` `quiet` `danger` `success` `warning`; `sm`/`md`/`lg`, `fullWidth`, `loading`, `edgeColor`. One dominant action per surface. |
| IconActionButton | `IconActionButton.tsx` | Icon utility button; `icon` and `label` required (label = accessible name + tooltip). |
| EdgeNavButtons | `EdgeNavButtons.tsx` | Invisible left/right tap zones for card/writing screens; `half` or `edge` mode. |
| SegmentedControl | `SegmentedControl.tsx` | Exclusive mode picker; requires `value`, `options`, `onChange`, `ariaLabel`. |
| SettingsDropdownPicker | `SettingsDropdownPicker.tsx` | Labelled tactile select for settings; snaps stored numeric values to nearest option. |
| ToggleSwitch | `ToggleSwitch.tsx` | Presentational on/off switch (`aria-hidden`); render inside a row `<button role="switch">`. |
| SwitchRow | `ToggleSwitch.tsx` | Full-width popover on/off row (`label`, `checked`, `onToggle`, `tinted`). |
| FolderSvg | `FolderSvg.tsx` | Library folder glyph; `isStarred`, `hasPlus`; size via `aspect-[25/21]` wrapper. |

## Icons, flags, branding

| Widget | File | Purpose / notes |
| --- | --- | --- |
| AppIcon | `AppIcon.tsx` | Semantic icon gateway (Phosphor + in-house glyphs/status badges). Decorative by default; pass `title`/`aria-label` to make it `role="img"`. |
| BrandWordmark | `BrandWordmark.tsx` | 文 tile + wordmark; `name`, `collapsed`. |
| CloudPuff | `CloudPuff.tsx` | Decorative cloud silhouette (`aria-hidden` container). |
| VideoBackground | `VideoBackground.tsx` | Looping decorative video with poster; needs `posterSrc` + `webmSrc`/`mp4Src`; honors reduced motion. |
| CountryFlag | `CountryFlag.tsx` | Vector flag by `code` (`GB` `ID` `JP` `US`); no emoji flags. |
| PlayfulNavIcon | `PlayfulNavIcon.tsx` | Nav illustration: `books` `dictionary` `library` `profile` `favorite`. |
| UserAvatar | `UserAvatar.tsx` | Avatar with fallback; `sm`-`xl`, `ring`. |
| RongWapsCharacterPortrait | `RongWapsCharacterPortrait.tsx` | 1:1 character bust; requires `character` + `label`. |
| PosBadge | `PosBadge.tsx` | Part-of-speech tag with hover explainer; renders nothing without `pos`. |

## Dialogs, drawers, docks, menus

| Widget | File | Purpose / notes |
| --- | --- | --- |
| ActivityModalWrapper | `ActivityModalWrapper.tsx` | Workspace-bounded activity dialog; requires `id`, `ariaLabel`, `onClose`. |
| Dialog | `Dialog.tsx` | Modal primitive; `Dialog.Root/Backdrop/Content/Header/Title/Description/Close/Body/Footer`; `size` and `depth` tiers, focus trap, portal. |
| Drawer | `Drawer.tsx` | Bottom sheet below `md` (drag-dismiss), floating card at `md+`, or right dock via `mdPlacement="side"`; `tone` `surface`/`practice`/`canvas`; `Drawer.Root/Backdrop/Content/Handle/Header/StickyHeader/Title/Close/Body`. |
| WorkspaceWindow | `WorkspaceWindow.tsx` | Frame for any surface taking over the workspace (Reader, Grammar, details, settings). `tone`; `layer` `window`/`window-detail`. |
| DetailShell | `DetailShell.tsx` | Workspace-bounded detail view; `.Root/.Scroller/.Content/.Floating`. `windowed` opens it as its own `WorkspaceWindow`. |
| ConfirmationDialog | `ConfirmationDialog.tsx` | Destructive confirm on `Dialog`; focus starts on Cancel; `children` + `confirmDisabled` for type-to-confirm. |
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
| LoadingScreen | `LoadingScreen.tsx` | `fullScreen`, `inline`, `tone` (`canvas`/`practice`) must match the surface being preloaded. |
| LottiePlayer | `LottiePlayer.tsx` | Branded motion only. Prefer `loadAnimationData` (lazy import) over `animationData`; `src` for remote. |
| ScreenSkeleton | `ScreenSkeleton.tsx` | Activity skeleton (`type`); assumes practice header mounted. |
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
| LevelTag | `LevelTag.tsx` | Course `B1 · L3` or TOCFL fallback from `ResolvedLevel` (`resolveLevel`/`useLevel`, `src/utils/levels.ts`); `row` or `chip`; estimates render `~B1`. Lesson wins over TOCFL. |
| SmartSentence | `SmartSentence.tsx` | Clickable sentence for lookup; `highlightTerms`. |

# Shared Widget Catalog

`src/lib/widgets/` contains presentation-first UI used across screens and features. Import public widgets from the barrel:

```tsx
import { ActionButton, AppIcon, ScreenHeader } from '../lib/widgets';
```

Shared widgets accept data and callbacks through props. They do not fetch remote data or own feature stores. Use semantic `ui-*`, `brand-*`, and `feedback-*` tokens as well as token radii and ambient shadow tokens. Do not use hardcoded hex values (`#FFF`, `#E5E5E5`) or manual `ring-*` stackings. See `docs/DESIGN_TOKENS.md` for the full scale. Preserve focus rings via `.focus-ring`, keyboard navigation, reduced-motion, loading, empty, error, and long-text behavior.

## Actions and selectors

- **ActionButton** — text action with `primary`, `secondary`, `quiet`, `danger`, `success`, or `warning` hierarchy; supports `sm`/`md`/`lg`, `fullWidth`, `loading`, and custom `edgeColor` (e.g. course book or folder theme accents). Uses two-layer stationary base tactile depth (the bottom border remains completely stationary on press; button face sinks down into base with 0.00px layout shift). Use one dominant action per surface.
  ```tsx
  <ActionButton variant="primary" onClick={onContinue}>Continue</ActionButton>
  <ActionButton variant="primary" edgeColor={activeBook.edgeHex} onClick={onStart}>Start</ActionButton>
  ```
- **IconActionButton** — quiet, surface, primary, success, danger, or warning icon utility for close, back, next, audio, settings, and highlighted action triggers. Supports `edgeColor` and two-layer stationary base tactile depth. `icon` and a descriptive `label` are required; the label supplies the accessible name and tooltip.
  ```tsx
  <IconActionButton icon={<AppIcon name="close" />} label="Close" onClick={onClose} />
  ```
- **EdgeNavButtons** — transparent, accessible tap zones on the left and right edges of card-based practice screens (`FlashcardScreen`, `WritingScreen`). Supports `half` (50% each for full-screen flashcards) or `edge` (outer 20% margin strips for writing canvas), customizable `topOffset`, `bottomOffset`, and `zIndex`.
  ```tsx
  <EdgeNavButtons onPrevious={handlePrev} onNext={handleNext} canNavigatePrevious={hasPrev} canNavigateNext={hasNext} />
  ```
- **SegmentedControl** — mutually exclusive mode or preference selection. Requires `value`, `options`, `onChange`, and `ariaLabel`; options support labels, icons, disabled state, titles, and button props.
  ```tsx
  <SegmentedControl ariaLabel="Study mode" value={mode} options={options} onChange={setMode} />
  ```
- **SettingsDropdownPicker** — Duolingo-style settings select: field label above a full-width tactile value button (uppercase tracked value + chevron) opening a dropdown list. Generic over the string option value type; falls back to the numerically nearest option for stored custom numeric values.
  ```tsx
  <SettingsDropdownPicker label="Speech speed" ariaLabel="Speech speed" value={rate} options={options} onChange={setRate} />
  ```
- **ToggleSwitch** — canonical tactile on/off switch (white rounded knob + brand track) used by every toggle in the app. Presentational and `aria-hidden`: render it inside the row-level `<button role="switch" aria-checked>` that owns the state.
  ```tsx
  <button type="button" role="switch" aria-checked={on} onClick={toggle}>
    <span>Pinyin</span>
    <ToggleSwitch checked={on} />
  </button>
  ```
- **SwitchRow** — full-width popover row (`label`, `checked`, `onToggle`, optional `tinted`) rendering a `role="switch"` button with a `ToggleSwitch`; exported from `ToggleSwitch.tsx`. Use it for every on/off row in popovers instead of hand-rolling the button.

## Icons, flags, and branded presentation

- **AppIcon** — semantic gateway to the approved Phosphor icon family. Add a stable semantic name here instead of importing a competing icon directly. In-house glyphs are drawn in the same soft voice: `audio`/`pronounce` speaker, gold-filled `hint` study bulb, blue-filled `settings`/`appSettings` gear, and Duolingo-style 3D status badges (`statusCheck`, `statusCross`, `statusShuffle`, `statusUnshuffled`, `statusRestart`) with baked semantic tokens — flat, smooth, rounded, with tactile bottom rims. Everything else is Phosphor. Decorative by default (`aria-hidden`), because it sits beside visible text in nearly every call site; pass `title` or `aria-label` when the icon itself carries the meaning, which promotes it to an accessible `role="img"`.
  ```tsx
  <AppIcon name="search" size={18} />
  <AppIcon name="statusCheck" size={20} />
  <AppIcon name="lock" title="Locked" />
  ```
- **BrandWordmark** — app wordmark lockup: the yellow 文 brand tile plus owner/subject wordmark text. Used by the shell side navigation and the full-screen sign-in window. Optionally override the display `name` or pass `collapsed` to render only the brand tile.
  ```tsx
  <BrandWordmark />
  <BrandWordmark collapsed />
  ```
- **CloudPuff** — flat white puff-cloud silhouette for sky-themed decorative scenes (sign-in window, profile hero canopy). Purely decorative: render inside an `aria-hidden` container and vary depth/size via wrapper `opacity-*`/`scale-*` classes; `className` can narrow the width (e.g. `w-44`).
  ```tsx
  <CloudPuff className="w-44" />
  ```
- **VideoBackground** — silently looping video backdrop with an instant poster frame (no layout shift), a crossfade once decoding starts, and automatic `prefers-reduced-motion`/tab-visibility handling. Decorative only: pass `posterSrc` plus at least one of `webmSrc`/`mp4Src`, and override `scrimClassName` for a different tint; optional `children` render above the scrim.
  ```tsx
  <VideoBackground posterSrc={poster} webmSrc={clipWebm} mp4Src={clipMp4} />
  ```
- **CountryFlag** — consistent rectangular vector flag. Use `code` (`GB`, `ID`, `JP`, or `US`) instead of platform emoji.
  ```tsx
  <CountryFlag code="JP" alt="Japan" />
  ```
- **PlayfulNavIcon** — branded navigation illustration with `name: books | dictionary | library | profile | favorite`. Current Adventure Time assets are temporary.
  ```tsx
  <PlayfulNavIcon name="library" className="h-10 w-10" />
  ```
- **UserAvatar** — learner avatar component with image error fallback, profile icon placeholder, size presets (`sm` | `md` | `lg` | `xl`), and optional brand ring.
  ```tsx
  <UserAvatar src={avatarUrl} alt={displayName} size="md" />
  <UserAvatar src={avatarUrl} size="xl" ring />
  ```
- **RongWapsCharacterPortrait** — 1:1 bust portrait renderer for RongWaps character avatars. Requires a character and accessible `label`; the `RongWapsCharacter` id union is a domain model in `src/types/models.ts`.
  ```tsx
  <RongWapsCharacterPortrait character={character} label="Teacher" />
  ```
- **PosBadge** — compact color-coded tag expanding a vocabulary part-of-speech tag (`N`, `V-sep`, `Vs`) into a learner-friendly label ("NOUN", "SEPARABLE VERB"). Hovering opens a popover explaining the word class and its Chinese term (e.g. 名词). Mouse-hover only; renders nothing when `pos` is missing, so it can be dropped into any word row.
  ```tsx
  <PosBadge pos={card.pos} />
  ```

## Dialogs, drawers, menus, and boundaries

- **ActivityModalWrapper** — workspace-bounded activity dialog with motion, Escape dismissal, focus trapping, and dialog semantics. Requires `id`, `ariaLabel`, and `onClose`.
  ```tsx
  <ActivityModalWrapper id="quiz" ariaLabel="Quiz" onClose={onClose}>{children}</ActivityModalWrapper>
  ```
- **Dialog** — unified modal pop-up window primitive supporting both single-tag invocation (`<Dialog isOpen={open} onClose={onClose} title="...">`) and compound customization (`Dialog.Root`, `Dialog.Backdrop`, `Dialog.Content`, `Dialog.Header`, `Dialog.Title`, `Dialog.Description`, `Dialog.Close`, `Dialog.Body`, `Dialog.Footer`). Provides automatic ARIA dialog attributes (`aria-labelledby`, `aria-describedby`), spring physics, tactile depth tiers (`sm` | `md` | `lg` | `xl`), focus trapping with `useModalFocus`, and portaling.
  ```tsx
  // Single-tag usage:
  <Dialog isOpen={open} onClose={onClose} title="Folder Details" size="sm">{children}</Dialog>

  // Compound usage:
  <Dialog.Root open={isOpen} onClose={onClose}>
    <Dialog.Backdrop />
    <Dialog.Content size="md" depth="md">
      <Dialog.Header>
        <Dialog.Title>Dialog Title</Dialog.Title>
        <Dialog.Close />
      </Dialog.Header>
      <Dialog.Body>{children}</Dialog.Body>
      <Dialog.Footer><ActionButton onClick={onClose}>Done</ActionButton></Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
  ```
- **Drawer** — unified bottom sheet drawer primitive supporting both single-tag invocation (`<Drawer isOpen={open} onClose={onClose} title="...">`) and compound customization (`Drawer.Root`, `Drawer.Backdrop`, `Drawer.Content`, `Drawer.Handle`, `Drawer.Header`, `Drawer.StickyHeader`, `Drawer.Title`, `Drawer.Close`, `Drawer.Body`). Below `md` it is a bottom sheet with drag-to-dismiss; at `md+` it is a floating card centered in the workspace (no handle), or a right-docked panel (same depth-block look as the sidebar, no blur) with `mdPlacement="side"` (used by `StudyDrawer`). The scrim always covers the full viewport (sidebar dimmed too) while the card stays inside the workspace bounds. Also provides tone support (`surface` | `practice` | `canvas`), size presets (`sm` to `full`), and sticky gradient headers.
  ```tsx
  // Single-tag usage:
  <Drawer isOpen={open} onClose={onClose} title="Examples">{children}</Drawer>

  // Compound usage:
  <Drawer.Root open={isOpen} onClose={onClose} tone="practice" workspaceBound>
    <Drawer.Backdrop />
    <Drawer.Content size="lg" heightClassName="h-[85vh]">
      <Drawer.StickyHeader>
        <Drawer.Handle />
        <div className="flex items-center justify-between px-4 sm:px-6">
          <Drawer.Title variant="eyebrow">Study Guide</Drawer.Title>
          <Drawer.Close />
        </div>
      </Drawer.StickyHeader>
      <Drawer.Body>{content}</Drawer.Body>
    </Drawer.Content>
  </Drawer.Root>
  ```
- **FolderSvg** — the Library folder glyph (back tab + front face) from `colorFront`/`colorBack`; `isStarred` adds the star, `hasPlus` makes the New Folder tile. Fills its parent (`h-full w-full`); size it with an `aspect-[25/21]` wrapper. Used by `FolderItem`, `FolderModal` and the Save Word panel.
- **WorkspaceWindow** — the one frame for any surface that takes over the workspace (Reader, Grammar, their loaders, dictionary/breakdown details, practice settings). Paints the full viewport in its `tone` so nothing beneath peeks out behind the floating sidebar, and lays children out in the content box right of `--workspace-nav-width` (children may fill it with `absolute inset-0`). `layer`: `window` (study windows) or `window-detail` (a detail opened over a window). Fades in by default; pass motion props to override. Never hand-roll `fixed inset-0` + `paddingLeft: var(--workspace-nav-width)`.
  ```tsx
  <WorkspaceWindow ref={dialogRef} tone="practice" role="dialog" aria-modal="true" aria-label="Reading Mode">{content}</WorkspaceWindow>
  ```
- **DetailShell** — unified workspace-bounded detail view primitive supporting both single-tag invocation (`<DetailShell ariaLabel="Word detail" onClose={onClose} title="Details">`) and compound customization (`DetailShell.Root`, `DetailShell.Scroller`, `DetailShell.Content`, `DetailShell.Floating`). Separates scroll mechanics, sticky headers, inner animated content, and floating overlay layers (bottom tabs, modals).
  ```tsx
  // Single-tag usage:
  <DetailShell ariaLabel="Word detail" onClose={onClose} title="Breakdown">{content}</DetailShell>

  // Compound usage:
  <DetailShell.Root ariaLabel="Character breakdown" tone="practice" onEscape={onClose}>
    <DetailShell.Scroller ref={scrollRef} onScroll={handleScroll}>
      <ScreenHeader variant="panel" tone="practice" onClose={onClose} title="Breakdown" />
      <div className="mx-auto max-w-[1180px] p-6">{content}</div>
    </DetailShell.Scroller>
    <DetailShell.Floating>{bottomTabs}</DetailShell.Floating>
  </DetailShell.Root>
  ```
  Fills its nearest positioned host (`absolute inset-0`). `windowed` opens it as its own `WorkspaceWindow` (`z-window-detail`, portaled to the body) — e.g. `PracticeSettingsScreen`.
- **ConfirmationDialog** — destructive confirmation modal built on `Dialog.*` with safe Cancel focus, Escape dismissal, focus restoration, optional icon, loading, and error message. Optional `children` render under the description (e.g. a type-to-confirm input) and `confirmDisabled` holds Confirm until that safeguard is met.
  ```tsx
  <ConfirmationDialog title="Reset progress" description="This cannot be undone." confirmLabel="Reset" onConfirm={reset} onCancel={close} />
  ```
- **DisclosureLine** — native, closed-by-default `<details>` row for optional supporting content.
  ```tsx
  <DisclosureLine title="Interactive help">{help}</DisclosureLine>
  ```
- **DropdownMenu** / **DropdownMenuItem** — outlined, shadowless `popover-surface` menu (same class for every floating menu/popover: settings popovers, dock sub-menus; defined in `src/index.css`, never hand-roll it) with flat full-width rows; keyboard-navigable menu with arrows, Enter, Space, Tab, Escape, outside-click dismissal, and viewport-safe alignment.
  ```tsx
  <DropdownMenu label="Session controls" open={open} onOpenChange={setOpen} renderTrigger={renderTrigger} />
  ```
- **ErrorBoundary** — app-level rendering fallback, mounted around the whole app in `main.tsx` and per tab screen in `TabScreens`. `fallback` swaps the recovery panel; `fallbackClassName` replaces the default container sizing (`min-h-[300px] p-8`) when the boundary fills a window. Keep error recovery outside feature components unless a narrower boundary is intentional.
  ```tsx
  <ErrorBoundary fallbackClassName="min-h-[100dvh] p-8"><App /></ErrorBoundary>
  ```
- **FloatingDock** — canonical compound primitive for floating bottom docks (`FloatingDock.Root`, `FloatingDock.Pill`, `FloatingDock.Popover`). Provides spring entry/exit animations, safe-area offsets, width profiles (`sm` | `md` | `lg` | `xl`), integrated outside-click/Escape dismissal for popovers via `useDismiss`, and desktop Ghost / Sleep mode (quiet 20% opacity fade on idle, instantaneous wake on hover, keyboard interaction/outside click sleep, and 100% full vibrancy on mobile/touch screens).
  ```tsx
  <FloatingDock.Root>
    <FloatingDock.Pill maxWidth="md" sleepOnIdle>
      <SegmentedControl ... />
    </FloatingDock.Pill>
    <FloatingDock.Popover open={isOpen} onClose={() => setIsOpen(false)}>
      <div role="menu">{options}</div>
    </FloatingDock.Popover>
  </FloatingDock.Root>
  ```
  Practice dock placement is a persisted `dockStyle` preference (Study settings → Practice dock): `bottom-center` (default), `bottom-right`, `right-column`, `right-middle`, `top-right`, `left-column`. `getPracticeDockLayout` in `src/screens/activities/components/practiceDockLayout.ts` owns root classes, popover/tooltip side and window inset (header and content shrink like a side panel); vertical styles apply at `md+` only. A mode's own controls (writing: restart, stroke order, outline, exit) render inside this same dock through `PracticeDockSlotOutlet` / `WritingDock` portal, never as a second dock.
- **StudyDrawer** — shared mobile study drawer shell (`lg`-hidden): bottom sheet with drag handle, eyebrow title, close control, and a scrollable body over the given `tone`. Use it for any companion panel that becomes a `StudySidePanel` column on desktop. Screens own the content.
  ```tsx
  <StudyDrawer isOpen={isOpen} onClose={close} title="Study Guide" ariaLabel="Study Guide" tone="practice">
    <ReaderStudyPanel ... />
  </StudyDrawer>
  ```
- **StudySidePanel** — shared desktop study panel: right-hand, independently scrollable companion column (`hidden lg:flex`, eyebrow title + gap-stacked content, optional `onClose` to hide the panel). It carries no bottom fade; a screen's dock/footer belongs inside the content column beside it, so the fade never crosses the panel.
  ```tsx
  <StudySidePanel ariaLabel="Study Guide" title="Study Guide" onClose={() => setOpen(false)} closeLabel="Hide study guide">
    <ReaderStudyPanel ... />
  </StudySidePanel>
  ```

## Feedback, empty, and alert presentation

- **AlertBanner** — unified error, warning, info, and success alert banner with tactile border, semantic icon, optional title, action slot, and dismiss callback.
  ```tsx
  <AlertBanner variant="danger" message={error} />
  <AlertBanner variant="warning" title="Note" message="Review your cards before continuing." onDismiss={dismiss} />
  ```
- **EmptyState** — animated Duolingo-style empty state presenter featuring a centered circular icon badge, bold headline, muted descriptive copy, and optional action button. Supports `compact` mode for drawers and popovers.
  ```tsx
  <EmptyState icon="sparkles" title="No cards yet" description="Create your first flashcard." action={<ActionButton onClick={add}>Add Card</ActionButton>} />
  <EmptyState icon="search" title="No matching cards" description="Try a different query." />
  ```

## Progress, loading, and animation

- **CircularProgress** — accessible SVG ring with clamped `value`, optional label, size, stroke width, and semantic track/progress classes.
  ```tsx
  <CircularProgress value={progress} label={`${progress}%`} />
  ```
- **CustomProgressBar** — animated rounded bar with `progress`, optional text, size, and accent class.
  ```tsx
  <CustomProgressBar progress={progress} accentClassName="bg-brand-primary" />
  ```
- **PartProgressRail** — segmented lesson/part progress rail. `PracticePartProgressRail` (default, one segment per part), `StudyPartProgressRail`, and `SelectablePartProgressRail` share the same language and accept `segments`, `currentIndex`, and `totalCount`; see `ScreenHeader` for the composed header integration.
  ```tsx
  <PracticePartProgressRail segments={segments} currentIndex={index} totalCount={total} />
  ```
- **LoadingScreen** — loading state with animated logo. `fullScreen` spans the viewport; `tone` ('canvas' default | 'practice') must match the tone of the surface it preloads — e.g. `tone="practice"` when lazy-loading practice-toned content — so the loaded surface never flips color. `inline` renders as a transparent in-flow block for loading INSIDE an already-painted window (grammar lesson / Reader content streaming). Never paint a third surface.
  ```tsx
  <LoadingScreen message="Loading reading…" inline />
  ```
- **LottiePlayer** — controlled Lottie animation wrapper for existing branded motion assets; do not use it for UI controls. Prefer `loadAnimationData` (a module-level `() => import('…json').then((m) => m.default)`) over `animationData` for large animations: the JSON then loads on demand, off the caller's chunk, under the widget's own skeleton/error states. `animationData` (inline import) and `src` (remote URL) remain supported.
  ```tsx
  <LottiePlayer loadAnimationData={loadSleepingAnimation} />
  ```
- **ScreenSkeleton** — activity-content skeleton that assumes the shared practice header is already mounted and respects reduced motion.
  ```tsx
  <ScreenSkeleton type="quiz" />
  ```
- **Skeleton** — generic loading placeholder with semantic surface classes.
  ```tsx
  <Skeleton className="h-6 w-32" />
  ```

## Headers and workspace shells

> **Canvas ownership:** the shell (`LayoutShell`) paints the workspace viewport
> background (`bg-ui-canvas`, or `bg-ui-practice-canvas` during practice
> activities and column-only practice overlays via `practiceCanvasOpen`).
> The side navigation is a floating surface bar (rounded `[28px]`
> `bg-ui-surface` silhouette + tactile bottom block border; active item is a
> soft `bg-ui-canvas` chip, inactive items transparent with `hover:bg-ui-hover`).
> Full-viewport overlay windows (Reader = practice tone, Grammar = canvas tone)
> paint their canvas across the whole viewport including the sidebar lane and
> pad content by `var(--workspace-nav-width)` (see `GrammarLessonScreen`).
> Overlay windows confined to the workspace column (dictionary detail) must
> flag `practiceCanvasOpen` so the shell matches their tone. Loading, empty,
> and error surfaces inherit the tone of the window they live in
> (`LoadingScreen` `tone` prop) and never paint their own page-level fill.
> Route containers, workspace columns, and headers in normal flow stay
> transparent; only full-screen windows and the shared sticky gradient fades
> reference canvas tokens.

- **ScreenHeader** — canonical study/window header with title, progress, close/back, optional `leftContent` for left-anchored titles, and composed center/right content. Segmented progress rails accept optional `progressAriaLabel` and `progressUnitLabel` through `PracticePartProgressRail` when a screen needs domain-specific accessibility copy. Pick the chrome with `variant`: `bar` (default, bordered surface bar for screens in normal workspace flow), `window` (the canonical sticky fade for full-viewport study windows — Grammar, practice), `panel` (the same fade and row padding for workspace-bounded detail windows — word detail, character breakdown), or `frosted` (tone-matched translucent bar at the standard window-header height, with a backdrop blur and the universal 2px border edge — Reading Mode's header, overlaid on its scroller so content passes underneath without showing through). Fade/frost variants take `tone` (`canvas` | `practice`) so they blend into the canvas that owns the surface; never hand the fade recipe to `className` — the widget owns the recipe, the canvas owner owns the tone. Header width defaults to `maxWidth="none"` so controls span edge-to-edge across the window bounds (`px-4 sm:px-6 lg:px-10`), matching the practice screen's space utilization.
  ```tsx
  <ScreenHeader title="Practice" progress={progress} onClose={onClose} />
  <ScreenHeader variant="panel" tone="practice" title="Study settings" onClose={onClose} />
  <ScreenHeader variant="frosted" tone="practice" onBack={onClose} leftContent={<h1>Lesson 1 · Part 1</h1>} />
  ```
- **ScreenLayout** — consistent screen content wrapper for padding, width, and shell composition.
  ```tsx
  <ScreenLayout>{content}</ScreenLayout>
  ```
- **SectionEyebrow** — uppercase tracked label that heads every section on reading surfaces (character breakdown, word detail), keeping section headers at one size so Chinese glyphs stay the visual heroes. Supports an optional `count`, leading `icon`, and right-aligned `action`.
  ```tsx
  <SectionEyebrow title="In words" count={23} action={<button onClick={openAll}>See all</button>} />
  ```
- **StickyWorkspaceHeader** — canonical mobile-first sticky gradient-fade header for Books, Dictionary, and Library. Use its menu/back/search slots instead of recreating header chrome.
  ```tsx
  <StickyWorkspaceHeader title="Library" menuToggle={{ onClick: openMenu }} />
  ```

## Shared teaching and metric presentation

- **ContextualChineseText** — renders dictionary-aware Chinese teaching text. Requires `onOpenWord`; authored tokens and contextual meanings take priority.
  ```tsx
  <ContextualChineseText text={sentence} tokens={tokens} onOpenWord={openWord} />
  ```
- **ExpandableSearch** — search input that expands from a compact trigger; `label` supplies the accessible name.
  ```tsx
  <ExpandableSearch label="Search dictionary" value={query} onChange={setQuery} />
  ```
- **ProgressMetricCard** — compact derived metric with label, value, optional detail, optional semantic icon, and accent classes. Use for real metrics only.
  ```tsx
  <ProgressMetricCard label="Words learned" value={count} detail="This month" icon="progress" />
  ```
- **ReferenceRow** — the single row anatomy for reference sheets (character breakdown, word detail): Chinese glyph left, pinyin over meaning right, optional trailing meta, and a `loading` skeleton state. Keeps every supporting-information rail on the same row rhythm; `accentClassName` tints the glyph with the active book accent.
  ```tsx
  <ReferenceRow glyph="東" accentClassName={activeBook.accent} primary="dōng" secondary="east" onClick={() => open('東')} ariaLabel="Open breakdown for 東" />
  ```
- **CharacterTile** — compact tappable tile for grids of related characters (Library "Learn next"): glyph, optional pinyin, and a `LevelTag`. `known` adds a success check, `upcoming` dims a later-book character, `active` rings it (e.g. now playing).
  ```tsx
  <CharacterTile glyph="騎" pinyin="qí" bookId={1} lessonId={6} known={knownChars.has('騎')} onClick={() => open('騎')} />
  ```
- **LevelTag** — where a character or word sits for the learner. `row` (trailing meta on reference rows) shows the course lesson `B1 · L3`, falling back to a small outlined TOCFL label (`Novice A1 A2 B1 B2 C1 C2`, from TBCL level 1–7; `Rare` for hanzi on neither TBCL nor New HSK, radical combining forms like 亻 stay blank) for non-course items; `level` is a `ResolvedLevel` from `resolveLevel`/`useLevel` (`src/utils/levels.ts`) — estimates render dimmed as `~B1` (the `chip` variant spells out `TOCFL ~B1 · estimated`, since row tooltips are hover-only) — callers that keep the book-accent dot render `LevelTag` as the no-lesson branch; `chip` shows `TOCFL A2` as a quiet secondary header chip. Lesson always wins: the app follows the book.
  ```tsx
  <LevelTag bookId={rank?.bookId} lessonId={rank?.lessonId} level={resolveLevel(char, levels)} />
  ```
- **SmartSentence** — clickable Chinese sentence presentation for dictionary lookup. Use `highlightTerms` to emphasize the vocabulary currently being taught.
  ```tsx
  <SmartSentence text={sentence} highlightTerms={[currentWord]} />
  ```

Feature-specific widgets belong beside their screen or under `src/features/<domain>/`; they should not be added here merely to avoid a longer local file.

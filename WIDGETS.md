# Shared Widget Catalog

`src/lib/widgets/` contains presentation-first UI used across screens and features. Import public widgets from the barrel:

```tsx
import { ActionButton, AppIcon, ScreenHeader } from '../lib/widgets';
```

Shared widgets accept data and callbacks through props. They do not fetch remote data or own feature stores. Use semantic `ui-*`, `brand-*`, and `feedback-*` tokens as well as token radii and ambient shadow tokens. Do not use hardcoded hex values (`#FFF`, `#E5E5E5`) or manual `ring-*` stackings. See `docs/DESIGN_TOKENS.md` for the full scale. Preserve focus rings via `.focus-ring`, keyboard navigation, reduced-motion, loading, empty, error, and long-text behavior.

## Actions and selectors

- **ActionButton** — text action with `primary`, `secondary`, `quiet`, `danger`, `success`, or `warning` hierarchy; supports `sm`/`md`/`lg`, `fullWidth`, and loading. Use one dominant action per surface.
  ```tsx
  <ActionButton variant="primary" onClick={onContinue}>Continue</ActionButton>
  ```
- **IconActionButton** — quiet, surface, danger, or warning icon utility for close, back, next, audio, settings, and highlighted action triggers. `icon` and a descriptive `label` are required; the label supplies the accessible name and tooltip.
  ```tsx
  <IconActionButton icon={<AppIcon name="close" />} label="Close" onClick={onClose} />
  ```
- **SegmentedControl** — mutually exclusive mode or preference selection. Requires `value`, `options`, `onChange`, and `ariaLabel`; options support labels, icons, disabled state, titles, and button props.
  ```tsx
  <SegmentedControl ariaLabel="Study mode" value={mode} options={options} onChange={setMode} />
  ```

## Icons, flags, and branded presentation

- **AppIcon** — semantic gateway to the approved Phosphor icon family. Add a stable semantic name here instead of importing a competing icon directly.
  ```tsx
  <AppIcon name="search" size={18} />
  ```
- **CountryFlag** — consistent rectangular vector flag. Use `code` (`GB`, `ID`, `JP`, or `US`) instead of platform emoji.
  ```tsx
  <CountryFlag code="JP" alt="Japan" />
  ```
- **PlayfulNavIcon** — branded navigation illustration with `name: books | dictionary | library | profile | favorite`. Current Adventure Time assets are temporary.
  ```tsx
  <PlayfulNavIcon name="library" className="h-10 w-10" />
  ```
- **RongWapsCharacterPortrait** — 1:1 bust portrait renderer for RongWaps character avatars. Requires a character and accessible `label`.
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
- **BottomDrawer** — portal drawer for settings, dictionary, examples, and mnemonics. Handles focus, Escape, restoration, and desktop workspace bounds.
  ```tsx
  <BottomDrawer isOpen={open} onClose={onClose} title="Examples">{children}</BottomDrawer>
  ```
- **ConfirmationDialog** — destructive confirmation with safe Cancel focus, Escape, focus restoration, optional icon, loading, and error message.
  ```tsx
  <ConfirmationDialog title="Reset progress" description="This cannot be undone." confirmLabel="Reset" onConfirm={reset} onCancel={close} />
  ```
- **DisclosureLine** — native, closed-by-default `<details>` row for optional supporting content.
  ```tsx
  <DisclosureLine title="Interactive help">{help}</DisclosureLine>
  ```
- **DropdownMenu** / **DropdownMenuItem** — keyboard-navigable menu with arrows, Enter, Space, Tab, Escape, outside-click dismissal, and viewport-safe alignment.
  ```tsx
  <DropdownMenu label="Session controls" open={open} onOpenChange={setOpen} renderTrigger={renderTrigger} />
  ```
- **ErrorBoundary** — app-level rendering fallback. Keep error recovery outside feature components unless a narrower boundary is intentional.
  ```tsx
  <ErrorBoundary><App /></ErrorBoundary>
  ```
- **WorkspaceDetailShell** — seamless workspace-bounded detail window with header, close/back actions, focus trapping, Escape, and reduced-motion behavior.
  ```tsx
  <WorkspaceDetailShell ariaLabel="Character details" onClose={onClose}>{children}</WorkspaceDetailShell>
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
- **LoadingScreen** — full-screen loading state with animated logo and progress.
  ```tsx
  <LoadingScreen />
  ```
- **LottiePlayer** — controlled Lottie animation wrapper for existing branded motion assets; do not use it for UI controls.
  ```tsx
  <LottiePlayer animationData={animationData} />
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

- **DynamicBackground** — animated canvas background for the app shell; use `variant="practice"` for activity workspaces.
  ```tsx
  <DynamicBackground variant="practice" />
  ```
- **ScreenHeader** — canonical study/window header with title, progress, close/back, and composed center/right content. Segmented progress rails accept optional `progressAriaLabel` and `progressUnitLabel` through `PracticePartProgressRail` when a screen needs domain-specific accessibility copy.
  ```tsx
  <ScreenHeader title="Practice" progress={progress} onClose={onClose} />
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
- **ProgressMetricCard** — compact derived metric with label, value, detail, optional semantic icon, and accent classes. Use for real metrics only.
  ```tsx
  <ProgressMetricCard label="Words learned" value={count} detail="This month" icon="progress" />
  ```
- **SmartSentence** — clickable Chinese sentence presentation for dictionary lookup. Use `highlightTerms` to emphasize the vocabulary currently being taught.
  ```tsx
  <SmartSentence text={sentence} highlightTerms={[currentWord]} />
  ```

Feature-specific widgets belong beside their screen or under `src/features/<domain>/`; they should not be added here merely to avoid a longer local file.

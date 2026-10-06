import { FloatingDock, PlayfulNavIcon, SegmentedControl } from '../../../lib/widgets';

export type SearchMode = 'global' | 'curriculum';

interface SearchModeDockProps {
  mode: SearchMode;
  onChangeMode: (mode: SearchMode) => void;
  /** Hidden while scrolling down, restored on scroll up. */
  visible?: boolean;
}

export function SearchModeDock({ mode, onChangeMode, visible = true }: SearchModeDockProps) {
  return (
    <FloatingDock.Root visible={visible}>
      <SegmentedControl<SearchMode>
        value={mode}
        ariaLabel="Search mode"
        layoutId="search-mode-dock-pill"
        tone="soft"
        className="dock-pill pointer-events-auto w-[min(22rem,calc(100vw-2rem))] rounded-feature border-2 border-ui-border border-b-[length:var(--depth-md)] bg-ui-surface p-1.5 shadow-ambient-sm"
        options={[
          {
            value: 'global',
            label: 'Global',
            icon: <PlayfulNavIcon name="global" className="h-6 w-6" />,
          },
          {
            value: 'curriculum',
            label: 'Curriculum',
            icon: <PlayfulNavIcon name="curriculum" className="h-6 w-6" />,
          },
        ]}
        onChange={onChangeMode}
      />
    </FloatingDock.Root>
  );
}

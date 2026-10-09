import { cn } from '../../../../utils/cn';

export interface BreakdownTab<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface BreakdownTabsProps<T extends string> {
  tabs: BreakdownTab<T>[];
  active: T;
  onChange: (id: T) => void;
}

/** Underlined text tabs, same look as the lesson window's part tabs. */
export function BreakdownTabs<T extends string>({ tabs, active, onChange }: BreakdownTabsProps<T>) {
  return (
    <div role="tablist" aria-label="Character details" className="flex border-b-2 border-ui-divider">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`breakdown-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`breakdown-panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              '-mb-0.5 flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-b-[3px] px-1.5 pb-3 pt-3 text-[15px] font-black sm:text-base outline-none transition-colors focus-ring-inline',
              isActive ? 'border-brand-primary text-ui-ink-strong' : 'border-transparent text-ui-muted hover:text-ui-muted-strong',
            )}
          >
            <span className="truncate">{tab.label}</span>
            {tab.count !== undefined && <span className="text-sm font-extrabold text-ui-muted">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

import { AppIcon, SegmentedControl } from '../../../lib/widgets';

interface GrammarModeDockProps {
  mode: 'study' | 'exercise';
  onSelectStudy: () => void;
  onSelectExercise: () => void;
}

export function GrammarModeDock({ mode, onSelectStudy, onSelectExercise }: GrammarModeDockProps) {
  return (
    <footer className="z-20 shrink-0 border-t border-ui-divider bg-ui-surface px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2 sm:px-8 sm:pb-3">
      <nav className="mx-auto w-full max-w-[420px]" aria-label="Grammar mode">
        <SegmentedControl
          value={mode}
          ariaLabel="Choose Learn or Practice"
          onChange={(nextMode) => nextMode === 'study' ? onSelectStudy() : onSelectExercise()}
          options={[
            { value: 'study', label: 'Learn', icon: <AppIcon name="books" size={18} /> },
            { value: 'exercise', label: 'Practice', icon: <AppIcon name="practice" size={18} /> },
          ]}
        />
      </nav>
    </footer>
  );
}


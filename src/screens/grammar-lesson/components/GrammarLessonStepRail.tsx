import { AppIcon, Soft3DButton } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

type GrammarLessonView = 'study' | 'exercise' | 'dialogue' | 'complete';

interface GrammarLessonStepRailProps {
  activeView: GrammarLessonView;
  grammarIndex: number;
  grammarCount: number;
  grammarComplete: boolean;
  dialogueComplete: boolean;
  onSelectGrammar: () => void;
  onSelectDialogue: () => void;
}

export function GrammarLessonStepRail({
  activeView,
  grammarIndex,
  grammarCount,
  grammarComplete,
  dialogueComplete,
  onSelectGrammar,
  onSelectDialogue,
}: GrammarLessonStepRailProps) {
  const activeStep = activeView === 'dialogue' || activeView === 'complete' ? 'dialogue' : 'grammar';
  const steps = [
    {
      id: 'grammar',
      label: grammarCount > 1 ? `Grammar ${grammarIndex + 1}/${grammarCount}` : 'Grammar',
      complete: grammarComplete,
      onClick: onSelectGrammar,
    },
    { id: 'dialogue', label: 'Dialogue', complete: dialogueComplete, onClick: onSelectDialogue },
  ] as const;

  return (
    <nav className="w-full shrink-0 bg-transparent" aria-label="Grammar lesson stages">
      <ol className="mx-auto grid w-full max-w-none grid-cols-2 gap-1.5">
        {steps.map((step, index) => {
          const isActive = step.id === activeStep;
          return (
            <li key={step.id} className="relative min-w-0">
              {index > 0 && (
                <span className="absolute right-1/2 top-1/2 -z-0 h-0.5 w-full -translate-y-1/2 bg-ui-divider" aria-hidden="true" />
              )}
              <Soft3DButton
                type="button"
                variant="custom"
                depth="sm"
                onClick={step.onClick}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'relative z-10 rounded-[12px] px-2 text-[11px] normal-case tracking-normal sm:text-xs',
                  'min-h-8 py-1',
                  isActive
                    ? 'border-brand-primary-edge bg-brand-primary text-white'
                    : 'border-ui-border bg-ui-surface text-ui-muted-strong',
                )}
              >
                {step.complete && !isActive && (
                  <AppIcon name="check" size={15} className="hidden text-feedback-success sm:block" />
                )}
                <span className="truncate">{step.label}</span>
              </Soft3DButton>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}


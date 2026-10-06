import React, { useState } from 'react';
import {
  ActionButton,
  AppIcon,
  Drawer,
  SegmentedControl,
} from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import {
  useAppStore,
  type QuizQuestionType,
  type QuizChoiceType,
  type ListeningChoiceType,
  type TypingPromptType,
} from '../../../store/useAppStore';

export interface PracticeFormatMenuProps {
  mode: 'quiz-choices' | 'listening' | 'quiz-typing';
  className?: string;
}

type FormatType = QuizQuestionType | QuizChoiceType | ListeningChoiceType;

const FORMAT_OPTIONS = {
  hanzi: { value: 'hanzi', label: 'Character', icon: <span className="font-chinese font-black text-sm">字</span> },
  pinyin: { value: 'pinyin', label: 'Pinyin', icon: <span className="text-xs font-black">pīn</span> },
  meaning: { value: 'meaning', label: 'Meaning', icon: <AppIcon name="dictionary" size={16} /> },
} as const;

const formatOptions = <T extends FormatType>(...types: T[]) => types.map((type) => FORMAT_OPTIONS[type]);

const FormatField: React.FC<{ label: string; aside?: React.ReactNode; children: React.ReactNode }> = ({ label, aside, children }) => (
  <div className="space-y-2">
    {aside ? (
      <div className="flex items-center justify-between">
        <span className="block text-xs font-black uppercase tracking-wider text-ui-muted-strong">{label}</span>
        {aside}
      </div>
    ) : (
      <span className="block text-xs font-black uppercase tracking-wider text-ui-muted-strong">{label}</span>
    )}
    {children}
  </div>
);

function formatLabel(type: FormatType) {
  switch (type) {
    case 'hanzi':
      return {
        icon: <span className="font-chinese font-black text-sm leading-none">字</span>,
        text: 'Character',
      };
    case 'pinyin':
      return {
        icon: <span className="text-xs font-black leading-none text-brand-primary">pīn</span>,
        text: 'Pinyin',
      };
    case 'meaning':
      return {
        icon: <AppIcon name="dictionary" size={15} className="text-ui-muted-strong" />,
        text: 'Meaning',
      };
  }
}

/**
 * Tactical study format drawer opened via the format menu icon.
 * Features a soft frosted backdrop, tactile drawer container,
 * live question/answer preview flow, and rich character & icon selectors.
 */
export function PracticeFormatMenu({ mode, className = '' }: PracticeFormatMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const quizQuestionType = useAppStore((state) => state.quizQuestionType);
  const quizChoiceType = useAppStore((state) => state.quizChoiceType);
  const listeningChoiceType = useAppStore((state) => state.listeningChoiceType);
  const typingPromptType = useAppStore((state) => state.typingPromptType);
  const updatePreferences = useAppStore((state) => state.updatePreferences);

  const handleQuizQuestionChange = (newQuestion: QuizQuestionType) => {
    if (newQuestion === quizChoiceType) {
      const fallbackChoice: QuizChoiceType = newQuestion === 'hanzi' ? 'meaning' : 'hanzi';
      updatePreferences({ quizQuestionType: newQuestion, quizChoiceType: fallbackChoice });
    } else {
      updatePreferences({ quizQuestionType: newQuestion });
    }
  };

  const handleQuizChoiceChange = (newChoice: QuizChoiceType) => {
    if (newChoice === quizQuestionType) {
      const fallbackQuestion: QuizQuestionType = newChoice === 'meaning' ? 'hanzi' : 'meaning';
      updatePreferences({ quizChoiceType: newChoice, quizQuestionType: fallbackQuestion });
    } else {
      updatePreferences({ quizChoiceType: newChoice });
    }
  };

  const flow = (() => {
    const meta = (type: FormatType) => ({ ...formatLabel(type), tone: 'text-ui-ink' });
    const audio = { icon: <AppIcon name="audio" size={15} />, text: 'Audio', tone: 'text-brand-primary' };
    const typing = { icon: <AppIcon name="keyboard" size={15} />, text: 'Typing', tone: 'text-brand-primary' };
    if (mode === 'listening') return [audio, meta(listeningChoiceType)];
    if (mode === 'quiz-choices') return [meta(quizQuestionType), meta(quizChoiceType)];
    return [meta(typingPromptType), typing];
  })();

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Study format options"
        title="Study format options"
        className={cn(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-ui-muted-strong transition-colors hover:bg-ui-hover hover:text-ui-ink active:text-ui-ink focus-ring',
          className,
        )}
      >
        <AppIcon name="menu" size={22} />
      </button>

      <Drawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Study Format"
        ariaLabel="Study format options"
      >
        <div className="flex flex-col gap-5 py-1 text-left">
          {/* Live Flow Indicator */}
          <div className="mb-4 flex items-center justify-center gap-3 rounded-control border border-ui-border bg-ui-canvas/60 px-4 py-2.5">
            {flow.map((step, i) => (
              <React.Fragment key={step.text}>
                {i > 0 && <span className="text-xs font-black text-ui-muted-strong">➔</span>}
                <div className={`flex items-center gap-1.5 text-xs font-black ${step.tone}`}>
                  {step.icon}
                  <span>{step.text}</span>
                </div>
              </React.Fragment>
            ))}
          </div>

          {mode === 'quiz-choices' && (
            <>
              <FormatField label="Question Prompt">
                <SegmentedControl<QuizQuestionType>
                  ariaLabel="Question prompt format"
                  value={quizQuestionType}
                  onChange={handleQuizQuestionChange}
                  className="min-h-12"
                  options={formatOptions('hanzi', 'pinyin', 'meaning')}
                />
              </FormatField>
              <FormatField label="Answer Choices">
                <SegmentedControl<QuizChoiceType>
                  ariaLabel="Answer choices format"
                  value={quizChoiceType}
                  onChange={handleQuizChoiceChange}
                  className="min-h-12"
                  options={formatOptions('meaning', 'hanzi', 'pinyin')}
                />
              </FormatField>
            </>
          )}

          {mode === 'quiz-typing' && (
            <div className="space-y-3">
              <FormatField label="Question Prompt">
                <SegmentedControl<TypingPromptType>
                  ariaLabel="Question prompt format"
                  value={typingPromptType}
                  onChange={(val) => updatePreferences({ typingPromptType: val })}
                  className="min-h-12"
                  options={formatOptions('hanzi', 'meaning')}
                />
              </FormatField>
              <div className="flex items-center gap-2.5 rounded-control bg-ui-canvas/60 px-3.5 py-2.5 text-xs font-bold text-ui-muted-strong">
                <AppIcon name="keyboard" size={16} className="shrink-0 text-ui-muted-strong" />
                <span>Answers are entered as pinyin with tone marks or numbers.</span>
              </div>
            </div>
          )}

          {mode === 'listening' && (
            <>
              <FormatField
                label="Question Prompt"
                aside={(
                  <span className="rounded-xs bg-ui-canvas px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-ui-muted-strong">
                    Audio Fixed
                  </span>
                )}
              >
                <div className="flex items-center gap-3 rounded-feature border border-brand-primary/20 bg-brand-primary-soft/50 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-compact bg-brand-primary text-white shadow-ambient-xs">
                    <AppIcon name="audio" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-ui-ink leading-tight">Spoken Mandarin</p>
                    <p className="mt-0.5 text-xs font-bold text-ui-muted-strong leading-tight">
                      Listen to native speech and identify the corresponding answer
                    </p>
                  </div>
                </div>
              </FormatField>
              <FormatField label="Answer Choices">
                <SegmentedControl<ListeningChoiceType>
                  ariaLabel="Answer choices format"
                  value={listeningChoiceType}
                  onChange={(val) => updatePreferences({ listeningChoiceType: val })}
                  className="min-h-12"
                  options={formatOptions('meaning', 'hanzi', 'pinyin')}
                />
              </FormatField>
            </>
          )}

          <div className="pt-2">
            <ActionButton
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setIsOpen(false)}
              className="py-3 font-extrabold uppercase tracking-wider text-sm"
            >
              Done
            </ActionButton>
          </div>
        </div>
      </Drawer>
    </>
  );
}

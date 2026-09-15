import React, { useState } from 'react';
import {
  ActionButton,
  AppIcon,
  BottomDrawer,
  SegmentedControl,
} from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import {
  usePracticePreferencesStore,
  type QuizQuestionType,
  type QuizChoiceType,
  type ListeningChoiceType,
  type TypingPromptType,
} from '../../../store/usePracticePreferencesStore';

export interface PracticeFormatMenuProps {
  mode: 'quiz-choices' | 'listening' | 'quiz-typing';
  className?: string;
}

function formatLabel(type: QuizQuestionType | QuizChoiceType | ListeningChoiceType) {
  switch (type) {
    case 'hanzi':
      return {
        icon: <span className="font-chinese font-black text-sm leading-none">字</span>,
        text: 'Character',
      };
    case 'pinyin':
      return {
        icon: <span className="font-mono text-xs font-black leading-none text-brand-primary">pīn</span>,
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

  const quizQuestionType = usePracticePreferencesStore((state) => state.quizQuestionType);
  const quizChoiceType = usePracticePreferencesStore((state) => state.quizChoiceType);
  const listeningChoiceType = usePracticePreferencesStore((state) => state.listeningChoiceType);
  const typingPromptType = usePracticePreferencesStore((state) => state.typingPromptType);
  const updatePreferences = usePracticePreferencesStore((state) => state.updatePreferences);

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

  const renderLivePreview = () => {
    if (mode === 'listening') {
      const choiceMeta = formatLabel(listeningChoiceType);
      return (
        <div className="mb-4 flex items-center justify-center gap-3 rounded-control border border-ui-border bg-ui-canvas/60 px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-xs font-black text-brand-primary">
            <AppIcon name="audio" size={15} />
            <span>Audio</span>
          </div>
          <span className="text-xs font-black text-ui-muted-strong">➔</span>
          <div className="flex items-center gap-1.5 text-xs font-black text-ui-ink">
            {choiceMeta.icon}
            <span>{choiceMeta.text}</span>
          </div>
        </div>
      );
    }

    if (mode === 'quiz-choices') {
      const questionMeta = formatLabel(quizQuestionType);
      const choiceMeta = formatLabel(quizChoiceType);
      return (
        <div className="mb-4 flex items-center justify-center gap-3 rounded-control border border-ui-border bg-ui-canvas/60 px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-xs font-black text-ui-ink">
            {questionMeta.icon}
            <span>{questionMeta.text}</span>
          </div>
          <span className="text-xs font-black text-ui-muted-strong">➔</span>
          <div className="flex items-center gap-1.5 text-xs font-black text-ui-ink">
            {choiceMeta.icon}
            <span>{choiceMeta.text}</span>
          </div>
        </div>
      );
    }

    if (mode === 'quiz-typing') {
      const questionMeta = formatLabel(typingPromptType);
      return (
        <div className="mb-4 flex items-center justify-center gap-3 rounded-control border border-ui-border bg-ui-canvas/60 px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-xs font-black text-ui-ink">
            {questionMeta.icon}
            <span>{questionMeta.text}</span>
          </div>
          <span className="text-xs font-black text-ui-muted-strong">➔</span>
          <div className="flex items-center gap-1.5 text-xs font-black text-brand-primary">
            <AppIcon name="keyboard" size={15} />
            <span>Typing</span>
          </div>
        </div>
      );
    }

    return null;
  };

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

      <BottomDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Study Format"
        ariaLabel="Study format options"
      >
        <div className="flex flex-col gap-5 py-1 text-left">
          {/* Live Flow Indicator */}
          {renderLivePreview()}

          {mode === 'quiz-choices' && (
            <>
              <div className="space-y-2">
                <span className="block text-xs font-black uppercase tracking-wider text-ui-muted-strong">
                  Question Prompt
                </span>
                <SegmentedControl<QuizQuestionType>
                  ariaLabel="Question prompt format"
                  value={quizQuestionType}
                  onChange={handleQuizQuestionChange}
                  className="min-h-12"
                  options={[
                    {
                      value: 'hanzi',
                      label: 'Character',
                      icon: <span className="font-chinese font-black text-sm">字</span>,
                    },
                    {
                      value: 'pinyin',
                      label: 'Pinyin',
                      icon: <span className="font-mono text-xs font-black">pīn</span>,
                    },
                    {
                      value: 'meaning',
                      label: 'Meaning',
                      icon: <AppIcon name="dictionary" size={16} />,
                    },
                  ]}
                />
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-black uppercase tracking-wider text-ui-muted-strong">
                  Answer Choices
                </span>
                <SegmentedControl<QuizChoiceType>
                  ariaLabel="Answer choices format"
                  value={quizChoiceType}
                  onChange={handleQuizChoiceChange}
                  className="min-h-12"
                  options={[
                    {
                      value: 'meaning',
                      label: 'Meaning',
                      icon: <AppIcon name="dictionary" size={16} />,
                    },
                    {
                      value: 'hanzi',
                      label: 'Character',
                      icon: <span className="font-chinese font-black text-sm">字</span>,
                    },
                    {
                      value: 'pinyin',
                      label: 'Pinyin',
                      icon: <span className="font-mono text-xs font-black">pīn</span>,
                    },
                  ]}
                />
              </div>
            </>
          )}

          {mode === 'quiz-typing' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <span className="block text-xs font-black uppercase tracking-wider text-ui-muted-strong">
                  Question Prompt
                </span>
                <SegmentedControl<TypingPromptType>
                  ariaLabel="Question prompt format"
                  value={typingPromptType}
                  onChange={(val) => updatePreferences({ typingPromptType: val })}
                  className="min-h-12"
                  options={[
                    {
                      value: 'hanzi',
                      label: 'Character',
                      icon: <span className="font-chinese font-black text-sm">字</span>,
                    },
                    {
                      value: 'meaning',
                      label: 'Meaning',
                      icon: <AppIcon name="dictionary" size={16} />,
                    },
                  ]}
                />
              </div>
              <div className="flex items-center gap-2.5 rounded-control bg-ui-canvas/60 px-3.5 py-2.5 text-xs font-bold text-ui-muted">
                <AppIcon name="keyboard" size={16} className="shrink-0 text-ui-muted-strong" />
                <span>Answers are entered as pinyin with tone marks or numbers.</span>
              </div>
            </div>
          )}

          {mode === 'listening' && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-black uppercase tracking-wider text-ui-muted-strong">
                    Question Prompt
                  </span>
                  <span className="rounded-xs bg-ui-canvas px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-ui-muted-strong">
                    Audio Fixed
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-feature border border-brand-primary/20 bg-brand-primary-soft/50 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-compact bg-brand-primary text-white shadow-ambient-xs">
                    <AppIcon name="audio" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-ui-ink leading-tight">Spoken Mandarin</p>
                    <p className="mt-0.5 text-xs font-medium text-ui-muted leading-tight">
                      Listen to native speech and identify the corresponding answer
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-black uppercase tracking-wider text-ui-muted-strong">
                  Answer Choices
                </span>
                <SegmentedControl<ListeningChoiceType>
                  ariaLabel="Answer choices format"
                  value={listeningChoiceType}
                  onChange={(val) => updatePreferences({ listeningChoiceType: val })}
                  className="min-h-12"
                  options={[
                    {
                      value: 'meaning',
                      label: 'Meaning',
                      icon: <AppIcon name="dictionary" size={16} />,
                    },
                    {
                      value: 'hanzi',
                      label: 'Character',
                      icon: <span className="font-chinese font-black text-sm">字</span>,
                    },
                    {
                      value: 'pinyin',
                      label: 'Pinyin',
                      icon: <span className="font-mono text-xs font-black">pīn</span>,
                    },
                  ]}
                />
              </div>
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
      </BottomDrawer>
    </>
  );
}

import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import type { GrammarConfusion } from '../../../types/models';
import { InteractiveGrammarSentence } from './InteractiveGrammarSentence';

interface GrammarConfusionSectionProps {
  confusion: GrammarConfusion;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onOpenWord: (word: string) => void;
}

/**
 * Collapsible "don't mix these up" clarifiers for one grammar page. Hidden by
 * default so the study page stays calm; the header toggles the list open.
 * Each item names one real mix-up, answers it in plain words, then contrasts a
 * struck-through wrong form with the tappable sentence to say instead.
 */
export function GrammarConfusionSection({
  confusion,
  characterPreference,
  showPinyin,
  showTranslation,
  onOpenWord,
}: GrammarConfusionSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const contentId = useId();
  if (confusion.items.length === 0) return null;

  return (
    <section aria-label={confusion.title} className="mt-10">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-left outline-none transition-colors duration-150 hover:bg-ui-surface-hover focus-visible:ring-2 focus-visible:ring-brand-primary/60"
      >
        <AppIcon name="lightbulb" size={17} className="text-feedback-warning-edge" />
        <span className="text-sm font-black uppercase tracking-[0.08em] text-ui-muted-strong">
          {confusion.title}
        </span>
        <AppIcon
          name="expand"
          size={15}
          className={cn('shrink-0 text-ui-muted transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={contentId}
            initial={{ opacity: 0, height: reduceMotion ? 'auto' : 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: reduceMotion ? 'auto' : 0 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <ol className="divide-y-2 divide-ui-divider">
              {confusion.items.map((item) => {
                const wrongText = characterPreference === 'simplified'
                  ? (item.wrongSimplified ?? item.wrongTraditional)
                  : item.wrongTraditional;
                const pinyinLine = showPinyin && item.right.pinyin ? item.right.pinyin : null;
                const englishLine = showTranslation && item.right.english ? item.right.english : null;

                return (
                  <li key={item.id} className="py-4 first:pt-3 last:pb-2">
                    <p className="text-[15px] font-extrabold leading-snug text-ui-ink-strong sm:text-base">
                      {item.question}
                    </p>
                    <p className="mt-1 max-w-2xl text-sm font-normal leading-6 text-ui-ink sm:text-[15px]">
                      {item.answer}
                    </p>
                    <div className="mt-2.5 space-y-1">
                      <span className="sr-only">Wrong:</span>
                      <div className="flex items-center gap-x-2">
                        <AppIcon name="close" size={13} className="shrink-0 translate-y-px text-feedback-danger" />
                        <span className="min-w-0 font-chinese font-black text-sm leading-tight line-through decoration-feedback-danger/60 decoration-2 text-ui-muted sm:text-base">
                          {wrongText}
                        </span>
                      </div>
                      <span className="sr-only">A better way to say it:</span>
                      <div className="flex items-start gap-x-2">
                        <AppIcon name="check" size={14} className="mt-[3px] shrink-0 text-feedback-success-edge" />
                        <div className="min-w-0">
                          <InteractiveGrammarSentence
                            words={item.right.words}
                            characterPreference={characterPreference}
                            showPinyin={false}
                            size="sm"
                            tone="accent"
                            onOpenWord={onOpenWord}
                          />
                          {(pinyinLine || englishLine) && (
                            <p className="mt-0.5 text-xs font-bold leading-relaxed text-ui-muted-strong sm:text-[13px]">
                              {pinyinLine}
                              {pinyinLine && englishLine ? ' · ' : ''}
                              {englishLine}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

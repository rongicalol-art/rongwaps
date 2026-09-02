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
      <div className="overflow-hidden rounded-feature bg-ui-surface border-b-[length:var(--depth-md)] border-ui-border">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="flex w-full items-center justify-between gap-3 p-4 text-left outline-none transition-colors duration-150 hover:bg-ui-surface-hover focus-ring sm:p-5"
        >
          <div className="flex items-center gap-3">
            <AppIcon name="lightbulb" size={24} className="shrink-0 text-feedback-warning-edge" />
            <span className="text-base font-black tracking-tight text-ui-ink-strong sm:text-lg">
              {confusion.title}
            </span>
          </div>
          <AppIcon
            name="expand"
            size={20}
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
              className="px-4 pb-4 sm:px-5 sm:pb-5"
            >
              <div className="flex flex-col gap-3.5 sm:gap-4">
                {confusion.items.map((item) => {
                  const wrongText = characterPreference === 'simplified'
                    ? (item.wrongSimplified ?? item.wrongTraditional)
                    : item.wrongTraditional;
                  const pinyinLine = showPinyin && item.right.pinyin ? item.right.pinyin : null;
                  const englishLine = showTranslation && item.right.english ? item.right.english : null;

                  return (
                    <article
                      key={item.id}
                      className="rounded-feature bg-ui-canvas/60 p-4 sm:p-5"
                    >
                      <h3 className="text-base font-black leading-snug text-ui-ink-strong sm:text-[17px]">
                        {item.question}
                      </h3>
                      <p className="mt-1 text-sm font-bold leading-relaxed text-ui-muted-strong sm:text-[15px]">
                        {item.answer}
                      </p>

                      <div className="mt-4 flex flex-col gap-2.5">
                        {/* Wrong form */}
                        <div className="flex items-center gap-3 rounded-control bg-ui-surface px-4 py-3">
                          <AppIcon name="close" size={18} className="shrink-0 text-feedback-danger" />
                          <span className="font-chinese text-lg font-black leading-tight text-ui-muted line-through decoration-feedback-danger/80 decoration-2 sm:text-xl">
                            {wrongText}
                          </span>
                        </div>

                        {/* Right form */}
                        <div className="flex items-start gap-3 rounded-control bg-ui-surface px-4 py-3">
                          <AppIcon name="check" size={18} className="shrink-0 text-feedback-success-edge mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <InteractiveGrammarSentence
                              words={item.right.words}
                              characterPreference={characterPreference}
                              showPinyin={false}
                              size="lg"
                              tone="accent"
                              onOpenWord={onOpenWord}
                            />
                            {(pinyinLine || englishLine) && (
                              <p className="mt-1 text-xs font-bold leading-relaxed text-ui-muted sm:text-sm">
                                {pinyinLine}
                                {pinyinLine && englishLine ? ' · ' : ''}
                                {englishLine}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

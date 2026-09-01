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
      <div className="overflow-hidden rounded-feature bg-ui-surface border-b-[length:var(--depth-md)] border-ui-divider">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="flex w-full items-center justify-between gap-3 p-4 text-left outline-none transition-colors duration-150 hover:bg-ui-surface-hover focus-ring sm:p-5"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-feedback-warning/15 text-feedback-warning-edge">
              <AppIcon name="lightbulb" size={17} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black uppercase tracking-[0.08em] text-ui-ink-strong">
                  {confusion.title}
                </span>
                <span className="rounded-full bg-ui-hover px-2 py-0.5 text-[11px] font-black text-ui-muted-strong">
                  {confusion.items.length} {confusion.items.length === 1 ? 'tip' : 'traps'}
                </span>
              </div>
              <p className="text-xs font-bold text-ui-muted">
                {isOpen ? 'Tap to collapse' : 'Common beginner mistakes to avoid'}
              </p>
            </div>
          </div>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ui-hover text-ui-muted transition-colors">
            <AppIcon
              name="expand"
              size={15}
              className={cn('shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
            />
          </span>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              id={contentId}
              initial={{ opacity: 0, height: reduceMotion ? 'auto' : 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: reduceMotion ? 'auto' : 0 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: 'easeOut' }}
              className="overflow-hidden border-t border-ui-divider bg-ui-canvas/30 px-4 pb-4 pt-2 sm:px-5 sm:pb-5"
            >
              <ol className="divide-y divide-ui-divider">
                {confusion.items.map((item) => {
                  const wrongText = characterPreference === 'simplified'
                    ? (item.wrongSimplified ?? item.wrongTraditional)
                    : item.wrongTraditional;
                  const pinyinLine = showPinyin && item.right.pinyin ? item.right.pinyin : null;
                  const englishLine = showTranslation && item.right.english ? item.right.english : null;

                  return (
                    <li key={item.id} className="py-4 first:pt-2 last:pb-1">
                      <p className="text-[15px] font-extrabold leading-snug text-ui-ink-strong sm:text-base">
                        {item.question}
                      </p>
                      <p className="mt-1 max-w-2xl text-sm font-normal leading-6 text-ui-ink sm:text-[15px]">
                        {item.answer}
                      </p>
                      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                        {/* Wrong form */}
                        <div className="flex items-start gap-2 rounded-xl bg-feedback-danger/8 p-3">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-feedback-danger/15 text-feedback-danger">
                            <AppIcon name="close" size={12} />
                          </span>
                          <div className="min-w-0">
                            <span className="block text-[10px] font-black uppercase tracking-wider text-feedback-danger">
                              Avoid
                            </span>
                            <span className="font-chinese font-black text-sm leading-tight line-through decoration-feedback-danger/60 decoration-2 text-ui-muted sm:text-base">
                              {wrongText}
                            </span>
                          </div>
                        </div>

                        {/* Right form */}
                        <div className="flex items-start gap-2 rounded-xl bg-feedback-success/8 p-3">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-feedback-success/15 text-feedback-success-edge">
                            <AppIcon name="check" size={12} />
                          </span>
                          <div className="min-w-0">
                            <span className="block text-[10px] font-black uppercase tracking-wider text-feedback-success-edge">
                              Say instead
                            </span>
                            <InteractiveGrammarSentence
                              words={item.right.words}
                              characterPreference={characterPreference}
                              showPinyin={false}
                              size="sm"
                              tone="accent"
                              onOpenWord={onOpenWord}
                            />
                            {(pinyinLine || englishLine) && (
                              <p className="mt-1 text-xs font-bold leading-relaxed text-ui-muted-strong">
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
      </div>
    </section>
  );
}

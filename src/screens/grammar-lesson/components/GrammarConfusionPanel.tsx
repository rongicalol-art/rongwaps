import { AppIcon } from '../../../lib/widgets';
import type { GrammarConfusion } from '../../../types/models';
import { InteractiveGrammarSentence } from './InteractiveGrammarSentence';

interface GrammarConfusionPanelProps {
  confusion: GrammarConfusion;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onOpenWord: (word: string) => void;
}

/**
 * The "don't mix these up" clarifier list. Rendered inside the header-triggered
 * `GrammarConfusionDrawer`: each item names one real mix-up, answers it in plain
 * words, then contrasts a struck-through wrong form with the tappable sentence
 * to say instead.
 */
export function GrammarConfusionPanel({
  confusion,
  characterPreference,
  showPinyin,
  showTranslation,
  onOpenWord,
}: GrammarConfusionPanelProps) {
  if (confusion.items.length === 0) return null;

  return (
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
            className="rounded-feature bg-ui-surface p-4 sm:p-5"
          >
            <h3 className="text-base font-black leading-snug text-ui-ink-strong sm:text-[17px]">
              {item.question}
            </h3>
            <p className="mt-1 text-sm font-bold leading-relaxed text-ui-muted-strong sm:text-[15px]">
              {item.answer}
            </p>

            <div className="mt-4 flex flex-col gap-2.5">
              {/* Wrong form */}
              <div className="flex items-center gap-3 rounded-control bg-ui-canvas/60 px-4 py-3">
                <AppIcon name="statusCross" size={20} className="shrink-0" />
                <span className="font-chinese text-lg font-black leading-tight text-ui-muted line-through decoration-feedback-danger/80 decoration-2 sm:text-xl">
                  {wrongText}
                </span>
              </div>

              {/* Right form */}
              <div className="flex items-start gap-3 rounded-control bg-ui-canvas/60 px-4 py-3">
                <AppIcon name="statusCheck" size={20} className="shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <InteractiveGrammarSentence
                    words={item.right.words ?? []}
                    characterPreference={characterPreference}
                    showPinyin={false}
                    size="lg"
                    tone="accent"
                    onOpenWord={onOpenWord}
                  />
                  {(pinyinLine || englishLine) && (
                    <p className="ui-translation mt-1 text-xs sm:text-sm">
                      {pinyinLine && <span className="font-bold text-brand-primary">{pinyinLine}{englishLine ? ' · ' : ''}</span>}
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
  );
}

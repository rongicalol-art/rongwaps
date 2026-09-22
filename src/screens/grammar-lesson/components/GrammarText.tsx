import { ContextualChineseText } from '../../../lib/widgets';
import type { GrammarLessonText, GrammarWordToken } from '../../../types/models';
import { splitDialogueText } from '../utils/grammarDialogueLayout';

export function getGrammarText(
  text: GrammarLessonText,
  characterPreference: 'traditional' | 'simplified',
) {
  return characterPreference === 'simplified' && text.simplified
    ? text.simplified
    : text.traditional;
}

interface GrammarTextProps {
  text: GrammarLessonText;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

export function GrammarText({
  text,
  characterPreference,
  showPinyin,
  showTranslation,
  contextTokens,
  onOpenWord,
}: GrammarTextProps) {
  const dialogue = splitDialogueText(text, characterPreference);

  if (dialogue) {
    return (
      <div className="flex flex-col gap-4">
        {dialogue.turns.map((turn, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-1 shrink-0 select-none font-sans text-[13px] font-black tracking-wider text-brand-primary sm:text-sm">
              {turn.speaker}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-chinese text-xl font-black leading-relaxed text-ui-ink-strong sm:text-2xl">
                <ContextualChineseText
                  text={turn.raw}
                  tokens={contextTokens}
                  characterPreference={characterPreference}
                  onOpenWord={onOpenWord}
                />
              </p>
              {showPinyin && turn.pinyin && (
                <p className="mt-1 text-[13px] font-bold leading-relaxed text-brand-primary sm:text-sm">
                  {turn.pinyin}
                </p>
              )}
              {showTranslation && turn.english && (
                <p className="ui-translation mt-1 text-[15px] sm:text-base">
                  {turn.english}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <p className="font-chinese text-xl font-black leading-relaxed text-ui-ink-strong sm:text-2xl">
        <ContextualChineseText
          text={getGrammarText(text, characterPreference)}
          tokens={contextTokens}
          characterPreference={characterPreference}
          onOpenWord={onOpenWord}
        />
      </p>
      {showPinyin && text.pinyin && (
        <p className="mt-1 text-[13px] font-bold leading-relaxed text-brand-primary sm:text-sm">{text.pinyin}</p>
      )}
      {showTranslation && text.english && (
        <p className="ui-translation mt-1.5 text-[15px] sm:text-base">{text.english}</p>
      )}
    </div>
  );
}


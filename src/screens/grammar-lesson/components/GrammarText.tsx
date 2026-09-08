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
      <div>
        <div className="space-y-1">
          {dialogue.turns.map((turn, i) => (
            <div key={i} className="flex items-start gap-1.5 font-chinese text-base font-black leading-relaxed text-ui-ink-strong sm:text-lg">
              <span className="font-sans text-xs font-black tracking-wider text-brand-primary select-none shrink-0 mt-1">
                {turn.speaker}
              </span>
              <p>
                <ContextualChineseText
                  text={turn.raw}
                  tokens={contextTokens}
                  characterPreference={characterPreference}
                  onOpenWord={onOpenWord}
                />
              </p>
            </div>
          ))}
        </div>
        {showPinyin && dialogue.turns.some((t) => t.pinyin) && (
          <div className="mt-1.5 space-y-0.5">
            {dialogue.turns.filter((t) => t.pinyin).map((turn, i) => (
              <p key={i} className="text-xs font-bold leading-relaxed text-brand-primary">
                <span className="font-black mr-1.5 select-none opacity-80">{turn.speaker}</span>
                {turn.pinyin}
              </p>
            ))}
          </div>
        )}
        {showTranslation && dialogue.turns.some((t) => t.english) && (
          <div className="mt-1.5 space-y-0.5">
            {dialogue.turns.filter((t) => t.english).map((turn, i) => (
              <p key={i} className="text-sm font-medium leading-relaxed text-ui-muted-strong">
                <span className="font-bold mr-1.5 select-none text-ui-ink">{turn.speaker}</span>
                {turn.english}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="font-chinese text-base font-black leading-relaxed text-ui-ink-strong sm:text-lg">
        <ContextualChineseText
          text={getGrammarText(text, characterPreference)}
          tokens={contextTokens}
          characterPreference={characterPreference}
          onOpenWord={onOpenWord}
        />
      </p>
      {showPinyin && text.pinyin && (
        <p className="mt-1 text-xs font-bold leading-relaxed text-brand-primary">{text.pinyin}</p>
      )}
      {showTranslation && text.english && (
        <p className="mt-1.5 text-sm font-medium leading-relaxed text-ui-muted-strong">{text.english}</p>
      )}
    </div>
  );
}


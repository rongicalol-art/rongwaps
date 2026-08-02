import { ContextualChineseText } from '../../../lib/widgets';
import type { GrammarLessonText, GrammarWordToken } from '../../../types/models';

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
  return (
    <div>
      <p className="font-chinese text-base font-bold leading-relaxed text-ui-ink-strong sm:text-lg">
        <ContextualChineseText
          text={getGrammarText(text, characterPreference)}
          tokens={contextTokens}
          characterPreference={characterPreference}
          onOpenWord={onOpenWord}
        />
      </p>
      {showPinyin && text.pinyin && (
        <p className="mt-1 text-xs font-bold leading-relaxed text-brand-primary sm:text-[13px]">{text.pinyin}</p>
      )}
      {showTranslation && text.english && (
        <p className="mt-1 text-sm font-bold leading-relaxed text-ui-muted-strong">{text.english}</p>
      )}
    </div>
  );
}

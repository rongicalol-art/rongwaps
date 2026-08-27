import { useState } from 'react';
import { LinkedTranslationText } from './LinkedTranslationText';
import type { GrammarLessonText, GrammarWordToken } from '../../../types/models';
import { GrammarText } from './GrammarText';
import { InteractiveGrammarSentence } from './InteractiveGrammarSentence';

interface GrammarExampleTextProps {
  text: GrammarLessonText;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  focusTerms?: string[];
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

export function GrammarExampleText({
  text,
  characterPreference,
  showPinyin,
  showTranslation,
  focusTerms,
  contextTokens,
  onOpenWord,
}: GrammarExampleTextProps) {
  const [activeAlignmentId, setActiveAlignmentId] = useState<string | null>(null);

  if (!text.words) {
    return (
      <GrammarText
        text={text}
        characterPreference={characterPreference}
        showPinyin={showPinyin}
        showTranslation={showTranslation}
        contextTokens={contextTokens}
        onOpenWord={onOpenWord}
      />
    );
  }

  return (
    <>
      <InteractiveGrammarSentence
        words={text.words}
        characterPreference={characterPreference}
        showPinyin={false}
        focusTerms={focusTerms}
        size="md"
        className="gap-y-2"
        activeAlignmentId={activeAlignmentId}
        onActiveAlignmentChange={setActiveAlignmentId}
        onOpenWord={onOpenWord}
      />
      {showPinyin && text.pinyin && (
        <p className="mt-1.5 text-xs font-bold leading-relaxed text-brand-primary sm:text-[13px]">
          {text.pinyin}
        </p>
      )}
      {showTranslation && text.translationSegments ? (
        <LinkedTranslationText
          segments={text.translationSegments}
          activeAlignmentId={activeAlignmentId}
          onActiveAlignmentChange={setActiveAlignmentId}
          className="mt-2"
        />
      ) : showTranslation && text.english ? (
        <p className="mt-2 text-sm font-bold leading-relaxed text-ui-muted-strong">{text.english}</p>
      ) : null}
    </>
  );
}

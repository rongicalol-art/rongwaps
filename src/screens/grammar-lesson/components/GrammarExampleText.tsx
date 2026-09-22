import { useState } from 'react';
import { LinkedTranslationText } from './LinkedTranslationText';
import type { GrammarLessonText, GrammarWordToken } from '../../../types/models';
import { GrammarText } from './GrammarText';
import { InteractiveGrammarSentence } from './InteractiveGrammarSentence';
import { splitDialogueText } from '../utils/grammarDialogueLayout';

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
              <InteractiveGrammarSentence
                words={turn.words}
                characterPreference={characterPreference}
                showPinyin={false}
                focusTerms={focusTerms}
                size="lg"
                className="gap-y-2"
                activeAlignmentId={activeAlignmentId}
                onActiveAlignmentChange={setActiveAlignmentId}
                onOpenWord={onOpenWord}
              />
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
    <>
      <InteractiveGrammarSentence
        words={text.words}
        characterPreference={characterPreference}
        showPinyin={false}
        focusTerms={focusTerms}
        size="lg"
        className="gap-y-2"
        activeAlignmentId={activeAlignmentId}
        onActiveAlignmentChange={setActiveAlignmentId}
        onOpenWord={onOpenWord}
      />
      {showPinyin && text.pinyin && (
        <p className="mt-1 text-[13px] font-bold leading-relaxed text-brand-primary sm:text-sm">
          {text.pinyin}
        </p>
      )}
      {showTranslation && text.translationSegments ? (
        <LinkedTranslationText
          segments={text.translationSegments}
          activeAlignmentId={activeAlignmentId}
          onActiveAlignmentChange={setActiveAlignmentId}
          className="mt-1.5"
        />
      ) : showTranslation && text.english ? (
        <p className="ui-translation mt-1.5 text-[15px] sm:text-base">{text.english}</p>
      ) : null}
    </>
  );
}


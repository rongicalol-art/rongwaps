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
      <div className="flex items-start gap-1">
        <div className="min-w-0">
          <GrammarText
            text={text}
            characterPreference={characterPreference}
            showPinyin={showPinyin}
            showTranslation={showTranslation}
            contextTokens={contextTokens}
            onOpenWord={onOpenWord}
          />
        </div>
      </div>
    );
  }

  const dialogue = splitDialogueText(text, characterPreference);

  if (dialogue) {
    return (
      <div className="space-y-3 sm:space-y-3.5">
        {dialogue.turns.map((turn, i) => (
          <div key={i} className="min-w-0">
            <div className="min-w-0">
              <div className="flex items-start gap-1">
                <InteractiveGrammarSentence
                  words={turn.words}
                  characterPreference={characterPreference}
                  showPinyin={showPinyin}
                  focusTerms={focusTerms}
                  size="lg"
                  className="inline-flex min-w-0 flex-wrap gap-y-2"
                  activeAlignmentId={activeAlignmentId}
                  onActiveAlignmentChange={setActiveAlignmentId}
                  onOpenWord={onOpenWord}
                />
              </div>
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
      <div className="flex items-start gap-1">
        <InteractiveGrammarSentence
          words={text.words}
          characterPreference={characterPreference}
          showPinyin={showPinyin}
          focusTerms={focusTerms}
          size="lg"
          className="min-w-0 gap-y-2"
          activeAlignmentId={activeAlignmentId}
          onActiveAlignmentChange={setActiveAlignmentId}
          onOpenWord={onOpenWord}
        />
      </div>
      {showTranslation && text.translationSegments ? (
        <LinkedTranslationText
          segments={text.translationSegments}
          activeAlignmentId={activeAlignmentId}
          onActiveAlignmentChange={setActiveAlignmentId}
          className="mt-1"
        />
      ) : showTranslation && text.english ? (
        <p className="ui-translation mt-1 text-[15px] sm:text-base">{text.english}</p>
      ) : null}
    </>
  );
}


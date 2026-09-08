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
      <>
        <div className="space-y-2">
          {dialogue.turns.map((turn, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="font-sans text-xs font-black tracking-wider text-brand-primary select-none shrink-0 mt-0.5">
                {turn.speaker}
              </span>
              <InteractiveGrammarSentence
                words={turn.words}
                characterPreference={characterPreference}
                showPinyin={false}
                focusTerms={focusTerms}
                size="md"
                className="gap-y-2 flex-1"
                activeAlignmentId={activeAlignmentId}
                onActiveAlignmentChange={setActiveAlignmentId}
                onOpenWord={onOpenWord}
              />
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
      </>
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
        <p className="mt-1 text-xs font-bold leading-relaxed text-brand-primary">
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
        <p className="mt-1.5 text-sm font-medium leading-relaxed text-ui-muted-strong">{text.english}</p>
      ) : null}
    </>
  );
}


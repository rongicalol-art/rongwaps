import { useState } from 'react';
import { AppIcon } from '../../../lib/widgets';
import { LinkedTranslationText } from './LinkedTranslationText';
import type { GrammarLessonText, GrammarWordToken } from '../../../types/models';
import { GrammarText } from './GrammarText';
import { InteractiveGrammarSentence } from './InteractiveGrammarSentence';
import { splitDialogueText } from '../utils/grammarDialogueLayout';
import { cn } from '../../../utils/cn';

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
      <div className="space-y-3 sm:space-y-3.5">
        {dialogue.turns.map((turn, i) => (
          <div key={i} className={cn('min-w-0', i > 0 && 'flex items-start gap-2 pt-1')}>
            {i > 0 && (
              <AppIcon
                name="followUp"
                size={18}
                className="mt-1 shrink-0 text-ui-muted/60"
              />
            )}
            <div className="flex-1 min-w-0">
              <InteractiveGrammarSentence
                words={turn.words}
                characterPreference={characterPreference}
                showPinyin={false}
                focusTerms={focusTerms}
                size="lg"
                className="inline-flex flex-wrap gap-y-2"
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
                <p className="ui-translation mt-1 text-[14px] sm:text-[15px]">
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


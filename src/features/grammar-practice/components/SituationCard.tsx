import { useState } from 'react';
import { ContextualChineseText } from '../../../lib/widgets';
import type { GrammarWordToken, PracticeSituation } from '../../../types/models';
import { textIn, type PracticeScript } from '../practiceTypes';
import { PracticeBubble } from './PracticeBubble';

/** The book's situation, with its translation kept one tap away. */
export function SituationCard({ situation, script, showPinyin, contextTokens, onOpenWord }: {
  situation: PracticeSituation; script: PracticeScript; showPinyin: boolean; contextTokens: GrammarWordToken[]; onOpenWord: (word: string) => void;
}) {
  const [showEnglish, setShowEnglish] = useState(false);
  return (
    <div className="flex flex-col items-start gap-2">
      <PracticeBubble side="them" notes={showPinyin && situation.pinyin ? [situation.pinyin] : []}>
        <ContextualChineseText wordClassName="font-chinese font-semibold" text={textIn(situation, script)} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />
      </PracticeBubble>
      <button type="button" aria-expanded={showEnglish} className="text-sm font-extrabold text-brand-primary-text focus-ring-inline" onClick={() => setShowEnglish((value) => !value)}>
        {showEnglish ? 'Hide English' : 'Show in English'}
      </button>
      {showEnglish && <p className="text-sm font-bold text-ui-muted-strong">{situation.english}</p>}
    </div>
  );
}

import { useState } from 'react';
import {
  ActionButton,
  AppIcon,
  GrammarFocusText,
} from '../../../lib/widgets';
import type { InteractiveGrammarPage } from '../../../types/models';
import { getGrammarTeachingTokens } from '../../../utils/grammarTeachingTokens';
import { BookPageViewer } from './BookPageViewer';
import { GrammarExamplesSection } from './GrammarExamplesSection';
import { GrammarInteractiveHelp } from './GrammarInteractiveHelp';
import { GrammarPatternSection } from './GrammarPatternSection';

interface GrammarStudyPageProps {
  page: InteractiveGrammarPage;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onOpenWord: (word: string) => void;
  hideHeader?: boolean;
}

export function GrammarStudyPage({
  page,
  characterPreference,
  showPinyin,
  showTranslation,
  onOpenWord,
  hideHeader = false,
}: GrammarStudyPageProps) {
  const [isBookPageOpen, setIsBookPageOpen] = useState(false);
  const teachingTokens = getGrammarTeachingTokens(page);

  return (
    <article className="mx-auto w-full max-w-5xl pb-8">
      {!hideHeader && <header className="border-b border-ui-divider pb-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.55rem,4.5vw,2.25rem)] font-black leading-[1.15] text-ui-ink-strong">
              <GrammarFocusText
                text={page.titleEnglish}
                terms={page.focusTerms}
                variant="title"
                contextTokens={teachingTokens}
                characterPreference={characterPreference}
                onOpenWord={onOpenWord}
              />
            </h1>
          </div>
          <ActionButton
            variant="quiet"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => setIsBookPageOpen(true)}
          >
            <AppIcon name="dictionary" size={16} />
            {page.printedPages.length === 1
              ? `View page ${page.printedPages[0]}`
              : `View pages ${page.printedPages[0]}–${page.printedPages.at(-1)}`}
          </ActionButton>
        </div>
        <p className="mt-3 max-w-3xl text-[15px] font-bold leading-7 text-ui-ink sm:text-[17px] sm:leading-8">
          <GrammarFocusText
            text={page.explanation}
            terms={page.focusTerms}
            contextTokens={teachingTokens}
            characterPreference={characterPreference}
            onOpenWord={onOpenWord}
          />
        </p>
      </header>}

      <GrammarPatternSection
        page={page}
        characterPreference={characterPreference}
        showPinyin={showPinyin}
        showTranslation={showTranslation}
        onOpenWord={onOpenWord}
        contextTokens={teachingTokens}
      />
      <GrammarExamplesSection
        page={page}
        characterPreference={characterPreference}
        showPinyin={showPinyin}
        showTranslation={showTranslation}
        onOpenWord={onOpenWord}
        contextTokens={teachingTokens}
      />
      <GrammarInteractiveHelp
        page={page}
        characterPreference={characterPreference}
        showPinyin={showPinyin}
        showTranslation={showTranslation}
        contextTokens={teachingTokens}
        onOpenWord={onOpenWord}
      />
      {isBookPageOpen && (
        <BookPageViewer
          bookId={page.bookId}
          lessonId={page.lessonId}
          grammarTitle={page.titleEnglish}
          pages={page.printedPages}
          onClose={() => setIsBookPageOpen(false)}
        />
      )}
    </article>
  );
}

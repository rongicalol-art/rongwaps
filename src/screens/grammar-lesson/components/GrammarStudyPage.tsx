import { ActionButton, AppIcon } from '../../../lib/widgets';
import type { RefObject } from 'react';
import type { InteractiveGrammarPage } from '../../../types/models';
import { getGrammarTeachingTokens } from '../../../utils/grammarTeachingTokens';
import { GrammarConfusionSection } from './GrammarConfusionSection';
import { GrammarExamplesSection } from './GrammarExamplesSection';
import { GrammarFocusText } from './GrammarFocusText';
import { GrammarPatternSection } from './GrammarPatternSection';

interface GrammarStudyPageProps {
  page: InteractiveGrammarPage;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onOpenWord: (word: string) => void;
  onOpenBookPage: () => void;
  bookPageButtonRef?: RefObject<HTMLButtonElement | null>;
  hideHeader?: boolean;
}

export function GrammarStudyPage({
  page,
  characterPreference,
  showPinyin,
  showTranslation,
  onOpenWord,
  onOpenBookPage,
  bookPageButtonRef,
  hideHeader = false,
}: GrammarStudyPageProps) {
  const teachingTokens = getGrammarTeachingTokens(page);

  return (
    <article className="mx-auto w-full max-w-3xl">
      {!hideHeader && (
        <header className="pb-2">
          <h1 className="max-w-none text-[clamp(1.75rem,4.5vw,2.35rem)] font-black leading-[1.12] text-ui-ink-strong">
            <GrammarFocusText
              text={page.titleEnglish}
              terms={page.focusTerms}
              variant="title"
              contextTokens={teachingTokens}
              characterPreference={characterPreference}
              onOpenWord={onOpenWord}
            />
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            {(page.bookPageAvailable ?? true) && (
              <ActionButton
                ref={bookPageButtonRef}
                variant="quiet"
                size="sm"
                className="-ml-2 whitespace-nowrap text-ui-muted-strong hover:text-brand-primary"
                onClick={onOpenBookPage}
              >
                <AppIcon name="dictionary" size={16} />
                {page.printedPages.length === 1
                  ? `View book page ${page.printedPages[0]}`
                  : `View book pages ${page.printedPages[0]}–${page.printedPages.at(-1)}`}
              </ActionButton>
            )}
          </div>
          <p className="mt-4 max-w-2xl text-[15px] font-bold leading-7 text-ui-ink sm:text-[17px] sm:leading-8">
            <GrammarFocusText
              text={page.explanation}
              terms={page.focusTerms}
              contextTokens={teachingTokens}
              characterPreference={characterPreference}
              onOpenWord={onOpenWord}
            />
          </p>
        </header>
      )}

      <GrammarPatternSection
        page={page}
        characterPreference={characterPreference}
        showPinyin={showPinyin}
        showTranslation={showTranslation}
        onOpenWord={onOpenWord}
      />
      <GrammarExamplesSection
        page={page}
        characterPreference={characterPreference}
        showPinyin={showPinyin}
        showTranslation={showTranslation}
        onOpenWord={onOpenWord}
        contextTokens={teachingTokens}
      />
      {page.confusion && (
        <GrammarConfusionSection
          confusion={page.confusion}
          characterPreference={characterPreference}
          showPinyin={showPinyin}
          showTranslation={showTranslation}
          onOpenWord={onOpenWord}
        />
      )}
    </article>
  );
}

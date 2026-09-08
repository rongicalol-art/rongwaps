import { ActionButton, AppIcon } from '../../../lib/widgets';
import type { RefObject } from 'react';
import type { InteractiveGrammarPage } from '../../../types/models';
import { getGrammarTeachingTokens } from '../../../utils/grammarTeachingTokens';
import { cn } from '../../../utils/cn';
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
  const hasSubsections = Boolean(page.subsections && page.subsections.length > 0);

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

      {/* Multi-Part Continuous Scroll Flow */}
      {hasSubsections && page.subsections ? (
        <div className="mt-8 space-y-12">
          {page.subsections.map((section, idx) => {
            const sectionExamples = section.examples ?? (
              section.exampleIds
                ? page.examples.filter((e) => section.exampleIds?.includes(e.id))
                : []
            );

            const sectionPatternRows = section.patternRows ?? (page.patternRows.length > 0 ? page.patternRows : []);

            return (
              <section
                key={section.id}
                className={cn(
                  'space-y-6',
                  idx > 0 && 'border-t border-ui-divider/80 pt-10'
                )}
                aria-labelledby={`subsection-heading-${section.id}`}
              >
                {/* Part Header & Explanation */}
                <div>
                  <h2
                    id={`subsection-heading-${section.id}`}
                    className="text-lg font-black text-ui-ink-strong sm:text-xl"
                  >
                    <span className="mr-2 font-sans font-black text-brand-primary">
                      {section.sectionNumber ?? idx + 1}.
                    </span>
                    <span className="text-ui-ink-strong">{section.title}</span>
                  </h2>

                  {section.explanation && (
                    <p className="mt-2 text-[15px] font-medium leading-relaxed text-ui-ink sm:text-[16px]">
                      <GrammarFocusText
                        text={section.explanation}
                        terms={page.focusTerms}
                        contextTokens={teachingTokens}
                        characterPreference={characterPreference}
                        onOpenWord={onOpenWord}
                      />
                    </p>
                  )}
                </div>

                {/* Pattern Table */}
                {sectionPatternRows.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.08em] text-ui-muted-strong">
                      Sentence Pattern
                    </span>
                    <GrammarPatternSection
                      page={page}
                      patternColumns={section.patternColumns}
                      patternColumnDetails={section.patternColumnDetails}
                      patternRows={sectionPatternRows}
                      characterPreference={characterPreference}
                      showPinyin={showPinyin}
                      showTranslation={showTranslation}
                      onOpenWord={onOpenWord}
                      hideHeader

                    />
                  </div>
                )}

                {/* Examples */}
                {sectionExamples.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.08em] text-ui-muted-strong">
                      Examples
                    </span>
                    <GrammarExamplesSection
                      page={page}
                      examples={sectionExamples}
                      characterPreference={characterPreference}
                      showPinyin={showPinyin}
                      showTranslation={showTranslation}
                      onOpenWord={onOpenWord}
                      contextTokens={teachingTokens}
                      hideHeader
                      variant="clean"
                    />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <>
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
            variant="clean"
          />
        </>
      )}

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

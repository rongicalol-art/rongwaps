import { ActionButton, AppIcon } from '../../../lib/widgets';
import type { RefObject } from 'react';
import type { InteractiveGrammarPage } from '../../../types/models';
import { getGrammarTeachingTokens } from '../../../utils/grammarTeachingTokens';
import { cn } from '../../../utils/cn';
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
          <p className="prose-chinese mt-7 max-w-2xl text-base font-bold leading-7 text-ui-ink sm:mt-8 sm:text-lg sm:leading-8">
            <GrammarFocusText
              text={page.explanation}
              terms={page.focusTerms}
              contextTokens={teachingTokens}
              characterPreference={characterPreference}
              onOpenWord={onOpenWord}
            />
            {(page.bookPageAvailable ?? true) && (
              <ActionButton
                ref={bookPageButtonRef}
                variant="quiet"
                size="sm"
                className="ml-1.5 -my-2 inline-flex min-h-0 items-center gap-1 whitespace-nowrap rounded-compact px-1.5 py-2 align-middle text-[13px] leading-none text-ui-muted-strong hover:text-brand-primary sm:text-sm"
                onClick={onOpenBookPage}
                aria-label={
                  page.printedPages.length === 1
                    ? `View book page ${page.printedPages[0]}`
                    : `View book pages ${page.printedPages[0]}–${page.printedPages.at(-1)}`
                }
              >
                <AppIcon name="dictionary" size={14} />
                {page.printedPages.length === 1
                  ? `Page ${page.printedPages[0]}`
                  : `Pages ${page.printedPages[0]}–${page.printedPages.at(-1)}`}
              </ActionButton>
            )}
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
                    <p className="prose-chinese mt-3.5 text-base font-bold leading-relaxed text-ui-muted-strong sm:mt-4 sm:text-lg">
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
                  <GrammarPatternSection
                    page={page}
                    patternColumns={section.patternColumns}
                    patternColumnDetails={section.patternColumnDetails}
                    patternRows={sectionPatternRows}
                    characterPreference={characterPreference}
                    showPinyin={showPinyin}
                    showTranslation={showTranslation}
                    onOpenWord={onOpenWord}
                  />
                )}

                {/* Examples */}
                {sectionExamples.length > 0 && (
                  <GrammarExamplesSection
                    page={page}
                    examples={sectionExamples}
                    characterPreference={characterPreference}
                    showPinyin={showPinyin}
                    showTranslation={showTranslation}
                    onOpenWord={onOpenWord}
                    contextTokens={teachingTokens}
                  />
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 space-y-6">
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
        </div>
      )}

    </article>
  );
}

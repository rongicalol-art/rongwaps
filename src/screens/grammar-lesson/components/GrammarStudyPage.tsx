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
  const teachingTokens = getGrammarTeachingTokens(page);
  const hasSubsections = Boolean(page.subsections && page.subsections.length > 0);

  return (
    <article className="w-full max-w-3xl sm:max-w-4xl mx-auto">
      {!hideHeader && (
        <header className="space-y-4 sm:space-y-5">
          <h1 className="max-w-none text-2xl font-black leading-tight text-ui-ink-strong sm:text-3xl lg:text-4xl">
            <GrammarFocusText
              text={page.titleEnglish}
              terms={page.focusTerms}
              variant="title"
              contextTokens={teachingTokens}
              characterPreference={characterPreference}
              onOpenWord={onOpenWord}
            />
          </h1>
          <p className="prose-chinese max-w-none text-base font-bold leading-7 text-ui-ink sm:text-lg sm:leading-8">
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
        <div className="mt-8 space-y-10 sm:mt-10 sm:space-y-12">
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
                  'space-y-8 sm:space-y-10',
                  idx > 0 && 'border-t-2 border-ui-divider pt-8 sm:pt-10'
                )}
                aria-labelledby={`subsection-heading-${section.id}`}
              >
                {/* Part Header & Explanation */}
                <div>
                  <h2
                    id={`subsection-heading-${section.id}`}
                    className="text-xl font-black leading-snug text-ui-ink-strong sm:text-2xl"
                  >
                    <span className="mr-2 font-sans font-black text-brand-primary">
                      {section.sectionNumber ?? idx + 1}.
                    </span>
                    <span className="text-ui-ink-strong">{section.title}</span>
                  </h2>

                  {section.explanation && (
                    <p className="prose-chinese mt-4 max-w-none text-base font-bold leading-7 text-ui-ink sm:mt-5 sm:text-lg sm:leading-8">
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
                    patternAccentColumn={section.patternAccentColumn}
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
        <div className="mt-8 space-y-8 sm:mt-10 sm:space-y-10">
          <GrammarPatternSection
            page={page}
            patternAccentColumn={page.patternAccentColumn}
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

import type { InteractiveGrammarPage } from '../../../types/models';
import { getGrammarTeachingTokens } from '../../../utils/grammar/grammarTeachingTokens';
import { cn } from '../../../utils/cn';
import { GrammarExamplesSection } from './GrammarExamplesSection';
import { GrammarExplanation } from './GrammarExplanation';

import { GrammarFocusText } from './GrammarFocusText';
import { GrammarPatternSection } from './GrammarPatternSection';

/** Which explanation the page shows (picked in the lesson menu). */
export type GrammarExplanationView = 'summary' | 'full' | 'chinese';

interface GrammarStudyPageProps {
  page: InteractiveGrammarPage;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onOpenWord: (word: string) => void;
  hideHeader?: boolean;
  /** Already resolved for this page: `summary` only when it has one, `chinese` only when it has both languages. */
  explanationView?: GrammarExplanationView;
}

export function GrammarStudyPage({
  page,
  characterPreference,
  showPinyin,
  showTranslation,
  onOpenWord,
  hideHeader = false,
  explanationView = 'full',
}: GrammarStudyPageProps) {
  const summary = explanationView === 'summary' ? page.summary : undefined;
  // The summary covers every section, and so does Book 1's printed explanation: their section notes would repeat it.
  const showSectionNotes = !summary && !(explanationView === 'full' && page.bookId === 1 && page.explanationEnglish);
  const teachingTokens = getGrammarTeachingTokens(page);
  const hasSubsections = Boolean(page.subsections && page.subsections.length > 0);
  // Examples the book prints under a table row show there, not again in the list.
  const rowExampleIds = new Set([...page.patternRows, ...(page.subsections ?? []).flatMap((s) => s.patternRows ?? [])]
    .flatMap((row) => row.exampleId ?? []));
  const listed = (examples: InteractiveGrammarPage['examples']) => examples.filter((e) => !rowExampleIds.has(e.id));

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
          {summary ? (
            <ul className="prose-chinese max-w-none list-disc space-y-2 pl-5 text-base font-bold leading-7 text-ui-ink marker:text-brand-primary-text sm:text-lg sm:leading-8">
              {summary.map((line) => (
                <li key={line}>
                  <GrammarFocusText
                    text={line}
                    terms={page.focusTerms}
                    contextTokens={teachingTokens}
                    characterPreference={characterPreference}
                    onOpenWord={onOpenWord}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <GrammarExplanation
              text={page.explanationEnglish && explanationView !== 'chinese' ? page.explanationEnglish : page.explanation}
              terms={page.focusTerms}
              contextTokens={teachingTokens}
              characterPreference={characterPreference}
              onOpenWord={onOpenWord}
            />
          )}
        </header>
      )}

      {/* Multi-Part Continuous Scroll Flow */}
      {hasSubsections && page.subsections ? (
        <div className="mt-8 space-y-10 sm:mt-10 sm:space-y-12">
          {page.subsections.map((section, idx) => {
            const sectionExamples = listed(section.examples ?? (
              section.exampleIds
                ? page.examples.filter((e) => section.exampleIds?.includes(e.id))
                : []
            ));

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
                    <span className="mr-2 font-sans font-black text-brand-primary-text">
                      {section.sectionNumber ?? idx + 1}.
                    </span>
                    <span className="text-ui-ink-strong">{section.title}</span>
                  </h2>

                  {section.explanation && showSectionNotes && (
                    <GrammarExplanation
                      className="mt-4 sm:mt-5"
                      text={section.explanation}
                      terms={page.focusTerms}
                      contextTokens={teachingTokens}
                      characterPreference={characterPreference}
                      onOpenWord={onOpenWord}
                    />
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
                    contextTokens={teachingTokens}
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
            contextTokens={teachingTokens}
            characterPreference={characterPreference}
            showPinyin={showPinyin}
            showTranslation={showTranslation}
            onOpenWord={onOpenWord}
          />
          <GrammarExamplesSection
            page={page}
            examples={listed(page.examples)}
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

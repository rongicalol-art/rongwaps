import { AppIcon, IconActionButton } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import type { GrammarLessonExample, GrammarWordToken, InteractiveGrammarPage } from '../../../types/models';
import { getGrammarText } from './GrammarText';
import { GrammarExampleText } from './GrammarExampleText';
import { SAMPLE_BOOKS } from '../../../data/books';

interface GrammarExamplesSectionProps {
  page: InteractiveGrammarPage;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onOpenWord: (word: string) => void;
  contextTokens: GrammarWordToken[];
  examples?: GrammarLessonExample[];
}

export function GrammarExamplesSection({
  page,
  characterPreference,
  showPinyin,
  showTranslation,
  onOpenWord,
  contextTokens,
  examples,
}: GrammarExamplesSectionProps) {
  const activeExamples = examples ?? page.examples;

  const speakExample = (exampleIndex: number) => {
    const example = activeExamples[exampleIndex];
    return audioService.speakText(
      getGrammarText(example.text, characterPreference),
      characterPreference === 'traditional' ? 'zh-TW' : 'zh-CN',
      0.9,
    );
  };

  if (activeExamples.length === 0) return null;

  const book = SAMPLE_BOOKS.find((b) => b.id === page.bookId) || SAMPLE_BOOKS[0];

  // A neutral sibling of the pattern table: same frame, depth and header band, in grey.
  return (
    <section
      aria-labelledby={`examples-${page.id}`}
      className="overflow-hidden rounded-feature border-2 border-ui-border border-b-[length:var(--depth-lg)] bg-ui-surface"
    >
      <h2
        id={`examples-${page.id}`}
        className="flex items-center gap-1.5 border-b-2 border-ui-divider bg-ui-canvas px-5 py-3 text-[13px] font-black uppercase tracking-widest text-ui-muted-strong sm:px-6"
      >
        Examples
        <span className="opacity-60 normal-case tracking-normal">{activeExamples.length}</span>
      </h2>
      {/* Same rhythm as the pattern table: full-width dividers, a quiet play icon in the gutter. */}
      <ul className="divide-y-2 divide-ui-divider">
        {activeExamples.map((example, index) => (
          <li key={example.id} className="flex items-start gap-2 py-4 pl-3 pr-5 sm:pl-4 sm:pr-6">
            <IconActionButton
              onClick={() => speakExample(index)}
              size="sm"
              variant="quiet"
              icon={<AppIcon name="audio" size={22} />}
              label={`Play example ${example.number ?? index + 1}`}
              style={{ color: book.theme.primary }}
              className="-mt-0.5 hover:brightness-90"
            />
            <div className="min-w-0 flex-1">
              <GrammarExampleText
                text={example.text}
                characterPreference={characterPreference}
                showPinyin={showPinyin}
                showTranslation={showTranslation}
                focusTerms={page.focusTerms}
                contextTokens={contextTokens}
                onOpenWord={onOpenWord}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

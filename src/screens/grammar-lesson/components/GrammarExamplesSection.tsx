import { AppIcon, IconActionButton } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import type { GrammarLessonExample, GrammarWordToken, InteractiveGrammarPage } from '../../../types/models';
import { getGrammarText } from './GrammarText';
import { GrammarExampleText } from './GrammarExampleText';

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

  return (
    <section aria-label="Examples" className="rounded-feature bg-ui-surface">
      <h3 className="px-4 pb-1 pt-4 text-sm font-black uppercase text-ui-ink-strong sm:px-5 sm:pt-5">
        Examples
      </h3>
      {activeExamples.map((example, index) => (
        <div
          key={example.id}
          className="flex items-start gap-3.5 px-4 pb-4 pt-3 sm:gap-4 sm:px-5 sm:pb-5 sm:pt-3.5"
        >
          {/* Number Index */}
          <span
            className="mt-0.5 flex h-6 w-6 shrink-0 select-none items-center justify-center rounded-full bg-feedback-warning font-sans text-xs font-black text-ui-ink-strong sm:h-7 sm:w-7"
            aria-hidden="true"
          >
            {example.number ?? index + 1}
          </span>

          {/* Sentence Content */}
          <div className="flex-1 min-w-0 pt-0.5">
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

          {/* Audio Button */}
          <IconActionButton
            onClick={() => speakExample(index)}
            size="sm"
            variant="quiet"
            icon={<AppIcon name="audio" size={20} />}
            label={`Play example ${example.number ?? index + 1}`}
            className="shrink-0 text-brand-primary hover:text-brand-primary/80 -mt-0.5 -mr-1"
          />
        </div>
      ))}
    </section>
  );
}

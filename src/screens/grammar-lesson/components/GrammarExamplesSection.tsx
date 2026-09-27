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
    <section aria-label="Examples">
      <div className="overflow-hidden rounded-feature border-2 border-ui-border border-b-[length:var(--depth-md)] bg-ui-surface divide-y-2 divide-ui-border/50">
        {activeExamples.map((example, index) => (
          <div
            key={example.id}
            className="flex items-start gap-3.5 sm:gap-4 p-4 sm:p-5"
          >
            {/* Number Index */}
            <span
              className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 select-none items-center justify-center rounded-full bg-ui-hover font-mono text-xs font-black text-ui-ink-strong mt-0.5"
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
      </div>
    </section>
  );
}

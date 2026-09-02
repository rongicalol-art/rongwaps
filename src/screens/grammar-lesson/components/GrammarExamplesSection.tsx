import { AppIcon, IconActionButton } from '../../../lib/widgets';
import { GrammarFocusText } from './GrammarFocusText';
import { audioService } from '../../../services/audioService';
import type { GrammarWordToken, InteractiveGrammarPage } from '../../../types/models';
import { getGrammarText } from './GrammarText';
import { GrammarExampleText } from './GrammarExampleText';

interface GrammarExamplesSectionProps {
  page: InteractiveGrammarPage;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onOpenWord: (word: string) => void;
  contextTokens: GrammarWordToken[];
}

export function GrammarExamplesSection({
  page,
  characterPreference,
  showPinyin,
  showTranslation,
  onOpenWord,
  contextTokens,
}: GrammarExamplesSectionProps) {
  const speakExample = (exampleIndex: number) => {
    const example = page.examples[exampleIndex];
    return audioService.speakText(
      getGrammarText(example.text, characterPreference),
      characterPreference === 'traditional' ? 'zh-TW' : 'zh-CN',
      0.9,
    );
  };

  return (
    <section aria-labelledby="examples-heading" className="mt-10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="examples-heading" className="text-sm font-black uppercase tracking-[0.08em] text-ui-muted-strong">
          Examples
        </h2>
        <span className="text-xs font-bold text-ui-muted">
          {page.examples.length} {page.examples.length === 1 ? 'sentence' : 'sentences'}
        </span>
      </div>
      <div className="space-y-3">
        {page.examples.map((example, index) => (
          <div
            key={example.id}
            className="flex items-start gap-3.5 rounded-feature bg-ui-surface p-4 border-b-[length:var(--depth-md)] border-ui-border sm:gap-4 sm:p-5"
          >
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 select-none items-center justify-center rounded-full bg-feedback-warning text-xs sm:text-sm font-black text-ui-ink-strong border-b-[length:var(--depth-sm)] border-feedback-warning-edge mt-0.5">
              {example.number}
            </span>

            <div className="flex-1 min-w-0">
              {example.teachingNote && (
                <p className="mb-2 text-xs font-bold leading-snug text-ui-muted-strong">
                  <span className="font-black text-brand-primary">Focus · </span>
                  <GrammarFocusText
                    text={example.teachingNote}
                    terms={page.focusTerms}
                    contextTokens={contextTokens}
                    characterPreference={characterPreference}
                    onOpenWord={onOpenWord}
                  />
                </p>
              )}

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

            <IconActionButton
              onClick={() => speakExample(index)}
              size="sm"
              variant="quiet"
              icon={<AppIcon name="audio" size={16} />}
              label={`Play example ${example.number}`}
              className="shrink-0 text-ui-muted hover:text-brand-primary -mt-1 -mr-1"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

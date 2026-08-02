import { AppIcon, GrammarFocusText, IconActionButton } from '../../../lib/widgets';
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
    <section aria-labelledby="examples-heading" className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="examples-heading" className="text-sm font-black uppercase tracking-[0.08em] text-ui-muted-strong">
          Examples
        </h2>
        <span className="text-[10px] font-bold text-ui-muted">Audio {page.audioReference}</span>
      </div>
      <ol className="divide-y-2 divide-ui-divider border-y-2 border-ui-divider">
        {page.examples.map((example, index) => (
          <li
            key={example.id}
            className="grid grid-cols-[32px_minmax(0,1fr)_40px] items-start gap-x-3 py-4 sm:grid-cols-[32px_minmax(0,1fr)_40px] sm:gap-x-4 sm:py-5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-feedback-warning text-sm font-black text-ui-ink-strong shadow-[0_3px_0_var(--color-feedback-warning-edge)]">
              {example.number}
            </span>
            <div className="min-w-0 pt-0.5">
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
              className="text-ui-muted hover:text-brand-primary"
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

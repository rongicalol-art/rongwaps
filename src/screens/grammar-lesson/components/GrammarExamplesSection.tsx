import { AppIcon, IconActionButton } from '../../../lib/widgets';
import { GrammarFocusText } from './GrammarFocusText';
import { audioService } from '../../../services/audioService';
import type { GrammarLessonExample, GrammarWordToken, InteractiveGrammarPage } from '../../../types/models';
import { getGrammarText } from './GrammarText';
import { GrammarExampleText } from './GrammarExampleText';
import { cn } from '../../../utils/cn';

interface GrammarExamplesSectionProps {
  page: InteractiveGrammarPage;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onOpenWord: (word: string) => void;
  contextTokens: GrammarWordToken[];
  examples?: GrammarLessonExample[];
  hideHeader?: boolean;
  title?: string;
  variant?: 'cards' | 'clean';
}

export function GrammarExamplesSection({
  page,
  characterPreference,
  showPinyin,
  showTranslation,
  onOpenWord,
  contextTokens,
  examples,
  hideHeader = false,
  title = 'Examples',
  variant = 'clean',
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

  const headingId = `examples-heading-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <section aria-labelledby={headingId} className={cn(!hideHeader && 'mt-10')}>
      {!hideHeader && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={headingId} className="text-xs font-black uppercase tracking-[0.08em] text-ui-muted-strong">
            {title}
          </h2>
        </div>
      )}
      <div
        className={cn(
          variant === 'cards'
            ? 'space-y-3'
            : 'rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface divide-y divide-ui-divider/60 overflow-hidden'
        )}
      >
        {activeExamples.map((example, index) => (
          <div
            key={example.id}
            className={cn(
              'flex items-start gap-3.5 transition-colors sm:gap-4',
              variant === 'cards'
                ? 'rounded-feature bg-ui-surface p-4 border-b-[length:var(--depth-md)] border-ui-border sm:p-5'
                : 'p-3.5 sm:p-4 hover:bg-ui-hover/40'
            )}
          >
            <span
              className="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full bg-feedback-warning text-xs font-black text-ui-ink-strong border-b-[length:var(--depth-sm)] border-feedback-warning-edge sm:h-8 sm:w-8 sm:text-sm mt-0.5"
            >
              {example.number}
            </span>

            <div className="flex-1 min-w-0">
              {example.teachingNote && (
                <p className="mb-2 text-xs font-bold leading-snug text-ui-muted-strong">
                  <span className="font-black text-brand-primary">Focus · </span>
                  <GrammarFocusText
                    text={example.teachingNote.replace(/^Part\s+\d+\s*·\s*/i, '')}
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

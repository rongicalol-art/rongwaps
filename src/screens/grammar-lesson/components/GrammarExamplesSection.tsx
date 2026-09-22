import { useId, useState } from 'react';
import { AppIcon, IconActionButton } from '../../../lib/widgets';
import { GrammarFocusNote } from './GrammarFocusNote';
import { audioService } from '../../../services/audioService';
import type { GrammarLessonExample, GrammarWordToken, InteractiveGrammarPage } from '../../../types/models';
import { cn } from '../../../utils/cn';
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
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const noteIdBase = useId();

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
      <div className="flex flex-col gap-5 sm:gap-6">
        {activeExamples.map((example, index) => {
          const note = example.teachingNote?.replace(/^Part\s+\d+\s*·\s*/i, '');
          const noteId = `${noteIdBase}-${example.id}`;
          const isNoteOpen = note !== undefined && openNoteId === example.id;

          return (
            <div key={example.id} className="flex items-start gap-2.5 sm:gap-3">
              <div className="flex shrink-0 flex-col">
                <IconActionButton
                  onClick={() => speakExample(index)}
                  size="sm"
                  variant="quiet"
                  icon={<AppIcon name="audio" size={22} />}
                  label={`Play example ${example.number}`}
                  className="-ml-1.5 -mt-1.5 text-brand-primary hover:text-brand-primary/80"
                />

                {note !== undefined && (
                  <IconActionButton
                    onClick={() => setOpenNoteId(isNoteOpen ? null : example.id)}
                    aria-expanded={isNoteOpen}
                    aria-controls={noteId}
                    size="sm"
                    variant="quiet"
                    icon={<AppIcon name="lightbulb" size={18} />}
                    label={isNoteOpen ? `Hide note for example ${example.number}` : `Show note for example ${example.number}`}
                    className={cn(
                      '-ml-1.5 mt-0.5',
                      isNoteOpen
                        ? 'bg-brand-primary/10 text-brand-primary'
                        : 'text-ui-muted-strong hover:text-ui-ink-strong',
                    )}
                  />
                )}
              </div>

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

                {note !== undefined && (
                  <GrammarFocusNote
                    id={noteId}
                    open={isNoteOpen}
                    note={note}
                    terms={page.focusTerms}
                    contextTokens={contextTokens}
                    characterPreference={characterPreference}
                    onOpenWord={onOpenWord}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

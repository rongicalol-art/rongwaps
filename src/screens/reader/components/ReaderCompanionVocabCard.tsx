import React, { useState } from 'react';
import type { ReaderTargetWord } from '../hooks/useReaderStudyData';
import { AppIcon, PosBadge } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import { formatPosLabel } from '../../../utils/posLabels';
import { cn } from '../../../utils/cn';

export interface ReaderCompanionVocabCardProps {
  allLessonWords: ReaderTargetWord[];
  wordsInDialogue: ReaderTargetWord[];
  characterPreference: 'traditional' | 'simplified';
  isLoading: boolean;
  /** User-facing message when the vocabulary fetch failed, or null on success. */
  error: string | null;
  /** Re-runs the vocabulary fetch; the card offers it in the error state. */
  onRetry: () => void;
  onOpenWord?: (word: string) => void;
}

/** Formats part-of-speech into clean, concise token labels (e.g. Noun, Verb, Adjective). */
function getPosTokenLabel(pos?: string | null): string | null {
  if (!pos) return null;
  const first = pos.split('/')[0].trim().toLowerCase();
  if (first.startsWith('n') || first === 'name') return 'Noun';
  if (first.startsWith('vs') && !first.startsWith('v-sep')) return 'Adjective';
  if (first.startsWith('v')) return 'Verb';
  if (first.startsWith('adv')) return 'Adverb';
  if (first.startsWith('m')) return 'Measure';
  if (first.startsWith('prep')) return 'Prep';
  if (first.startsWith('conj')) return 'Conj';
  if (first.startsWith('part') || first.startsWith('prc')) return 'Particle';
  if (first.startsWith('pron')) return 'Pronoun';
  if (first.startsWith('num')) return 'Number';
  return formatPosLabel(pos) ?? pos;
}

export const ReaderCompanionVocabCard = React.memo(function ReaderCompanionVocabCard({
  allLessonWords,
  wordsInDialogue,
  characterPreference,
  isLoading,
  error,
  onRetry,
  onOpenWord,
}: ReaderCompanionVocabCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Directly show dialogue words (falls back to lesson words if no dialogue words exist, e.g. solo narrative)
  const displayedWords = wordsInDialogue.length > 0 ? wordsInDialogue : allLessonWords;

  const handleSpeak = (text: string, audioFile?: string) => {
    const voice =
      characterPreference === 'traditional' ? 'zh-TW-HsiaoChenNeural' : 'zh-CN-XiaoxiaoNeural';
    void audioService.play(audioFile, 1.0, text, voice);
  };

  return (
    <section
      aria-label="Target Vocabulary"
      className="shrink-0 rounded-l-[36px] rounded-r-2xl bg-ui-surface border-2 border-brand-primary-edge border-b-[length:var(--depth-md)] shadow-xs p-3.5 pl-4 sm:pl-4.5 flex flex-col gap-2.5"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <AppIcon name="cards" size={16} className="text-brand-primary shrink-0" />
          <h3 className="font-sans text-xs font-black uppercase tracking-wider text-ui-ink-strong">
            Vocabulary
          </h3>
          {!error && (
            <span className="font-sans text-[10px] font-black px-1.5 py-0.5 rounded-full bg-ui-surface-soft text-ui-muted-strong">
              {displayedWords.length}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="p-1 rounded-lg text-ui-muted hover:text-ui-ink-strong hover:bg-ui-surface-soft transition-colors focus-ring"
          title={isCollapsed ? 'Expand vocabulary' : 'Collapse vocabulary'}
          aria-expanded={!isCollapsed}
        >
          <AppIcon
            name="dropdown"
            size={15}
            className={cn('transition-transform duration-200', !isCollapsed && 'rotate-180')}
          />
        </button>
      </div>

      {!isCollapsed && (
        <div className="flex flex-col gap-1 pt-0.5">
          {/* Borderless "In words" style list (clean rows directly on card surface) */}
          {isLoading ? (
            <div className="py-4 text-center font-sans text-xs font-bold text-ui-muted">
              Loading…
            </div>
          ) : error ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-2 py-3 px-2 text-center"
            >
              <p className="font-sans text-xs font-bold leading-snug text-ui-muted">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-compact px-2.5 font-sans text-xs font-extrabold text-brand-primary transition-colors hover:bg-brand-primary/10 focus-ring"
              >
                <AppIcon name="restart" size={14} />
                Retry
              </button>
            </div>
          ) : displayedWords.length === 0 ? (
            <div className="py-4 text-center font-sans text-xs font-bold text-ui-muted">
              No vocabulary words for this dialogue.
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {displayedWords.map((word) => {
                const text =
                  characterPreference === 'simplified' && word.simplified
                    ? word.simplified
                    : word.traditional;
                const posLabel = getPosTokenLabel(word.pos);

                return (
                  <button
                    type="button"
                    key={word.id}
                    onClick={() => onOpenWord?.(text)}
                    aria-label={`Open dictionary for ${text}`}
                    className="group flex min-h-[48px] w-full items-center gap-3 rounded-compact px-2 py-1.5 text-left transition-colors hover:bg-ui-hover focus-ring outline-none select-none"
                  >
                    {/* Chinese Glyph */}
                    <span className="min-w-[3.25rem] shrink-0 font-chinese text-2xl font-bold leading-none text-ui-ink-strong group-hover:text-brand-primary transition-colors">
                      {text}
                    </span>

                    {/* Pinyin and English Definition */}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-sans text-xs font-extrabold leading-tight text-brand-primary">
                        {word.pinyin}
                      </span>
                      <span className="block font-sans text-sm font-bold leading-snug text-ui-ink line-clamp-2">
                        {word.english}
                      </span>
                    </span>

                    {/* Right-side Token & Audio Action */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {word.pos && (
                        <PosBadge
                          pos={word.pos}
                          label={posLabel ?? undefined}
                          characterPreference={characterPreference}
                          className="text-[10px] px-1.5 py-0.5 rounded-xs"
                        />
                      )}
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpeak(text, word.audio);
                        }}
                        className="shrink-0 p-1.5 rounded-full text-ui-muted hover:text-brand-primary hover:bg-brand-primary-soft/60 transition-colors"
                        title={`Listen to ${text}`}
                        aria-label={`Listen to ${text}`}
                      >
                        <AppIcon name="audio" size={16} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
});

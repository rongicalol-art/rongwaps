import React, { useState } from 'react';
import type { ReaderStudyTargetWord } from '../utils/readerStudyTargets';
import { AppIcon } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import { cn } from '../../../utils/cn';
import type { ReaderLocateMode } from '../utils/readerLocate';
import { getPosTokenLabel, ReaderCompanionVocabRow } from './ReaderCompanionVocabRow';

export interface ReaderCompanionVocabCardProps {
  targetWords: ReaderStudyTargetWord[];
  lessonWords: ReaderStudyTargetWord[];
  usingLessonFallback: boolean;
  characterPreference: 'traditional' | 'simplified';
  isLoading: boolean;
  /** User-facing message when the vocabulary fetch failed, or null on success. */
  error: string | null;
  /** Re-runs the vocabulary fetch; the card offers it in the error state. */
  onRetry: () => void;
  onOpenWord?: (word: string) => void;
  /** Highlights (or clears) a located word in the reading text. */
  onLocateWord?: (word: ReaderStudyTargetWord | null) => void;
  locateMode?: ReaderLocateMode;
  locatedWordId?: string | null;
}

export const ReaderCompanionVocabCard = React.memo(function ReaderCompanionVocabCard({
  targetWords,
  lessonWords,
  usingLessonFallback,
  characterPreference,
  isLoading,
  error,
  onRetry,
  onOpenWord,
  onLocateWord,
  locateMode = 'hover',
  locatedWordId = null,
}: ReaderCompanionVocabCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Prefer the reading's own course part; fall back to the lesson list (labelled
  // in the card) only when the part has no words at all.
  const displayedWords = targetWords.length > 0 ? targetWords : lessonWords;
  const inTextCount = displayedWords.filter((word) => word.inText).length;

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
            <span
              className="font-sans text-[10px] font-black px-1.5 py-0.5 rounded-full bg-ui-surface-soft text-ui-muted-strong"
              title="Used in this reading"
            >
              {inTextCount}
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
          {/* Only warn when the part list is missing: the fallback words are
              not this reading's targets, and the dimming cannot say that. */}
          {!error && !isLoading && usingLessonFallback && displayedWords.length > 0 && (
            <p className="px-2.5 font-sans text-[11px] font-bold leading-snug text-ui-muted-strong">
              This dialogue's word list is missing — showing the lesson list.
            </p>
          )}

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
              <p className="font-sans text-xs font-bold leading-snug text-ui-muted-strong">{error}</p>
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
            <div className="py-4 text-center font-sans text-xs font-bold text-ui-muted-strong">
              No vocabulary words for this dialogue.
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {displayedWords.map((word) => {
                const text =
                  characterPreference === 'simplified' && word.simplified
                    ? word.simplified
                    : word.traditional;
                return (
                  <ReaderCompanionVocabRow
                    key={word.id}
                    word={word}
                    displayText={text}
                    posLabel={getPosTokenLabel(word.pos)}
                    characterPreference={characterPreference}
                    isInText={word.inText}
                    isLocated={locatedWordId === word.id}
                    locateMode={locateMode}
                    onOpenWord={onOpenWord}
                    onLocateWord={onLocateWord}
                    onSpeak={handleSpeak}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
});

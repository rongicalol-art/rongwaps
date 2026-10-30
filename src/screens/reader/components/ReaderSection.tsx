import { lazy, Suspense, useCallback, useMemo, useRef, type RefObject } from 'react';
import type { ReadingRecord, ReaderTextSize } from '../../../types/models';
import { useAppStore } from '../../../store/useAppStore';
import { AppIcon, IconActionButton } from '../../../lib/widgets';
import { useDialogueAlignment } from '../hooks/useDialogueAlignment';
import { useReaderStudyData } from '../hooks/useReaderStudyData';
import { isEssayReading } from '../../../utils/lesson/readingKind';
import type { ReaderStudyTargetWord } from '../utils/readerStudyTargets';
import { ReaderSummary } from './ReaderSummary';

const ReadingCanvas = lazy(() => import('./ReadingCanvas').then((m) => ({ default: m.ReadingCanvas })));
const ReadingNarrativeView = lazy(() => import('./ReadingNarrativeView').then((m) => ({ default: m.ReadingNarrativeView })));

export type ReaderPlayTarget = { lineIndex: number; onlyThisLine?: boolean } | { startSec: number };

interface ReaderSectionProps {
  reading: ReadingRecord;
  index: number;
  grouped: boolean;
  first: boolean;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showMeaning: boolean;
  showHoverDefinitions: boolean;
  textSize: ReaderTextSize;
  activeLineIndex: number | null;
  currentTime: number;
  hasFinished: boolean;
  followAudioRef: RefObject<boolean>;
  onPlay: (index: number, target: ReaderPlayTarget) => void;
  onOpenGrammar?: (partId: string, pageId?: string) => void;
}

/** One reading keeps its own vocabulary, grammar and alignment inside the shared scroller. */
export function ReaderSection({ reading, index, grouped, first, onPlay, onOpenGrammar, ...viewProps }: ReaderSectionProps) {
  const rootRef = useRef<HTMLElement>(null);
  const alignment = useDialogueAlignment(reading.bookId, reading.id);
  const { targetWords, grammarPoints, usingLessonFallback } = useReaderStudyData({ reading });
  const newWords = useMemo(() => usingLessonFallback ? [] : targetWords.filter((word) => word.inText), [targetWords, usingLessonFallback]);
  const partGrammarPoints = useMemo(() => grammarPoints.filter((point) => point.group === 'part'), [grammarPoints]);
  const playLine = useCallback((lineIndex: number) => onPlay(index, { lineIndex }), [index, onPlay]);
  const playRange = useCallback((startSec: number) => onPlay(index, { startSec }), [index, onPlay]);
  const playLineOnly = useCallback((lineIndex: number) => onPlay(index, { lineIndex, onlyThisLine: true }), [index, onPlay]);
  const locateWord = useCallback((word: ReaderStudyTargetWord) => {
    const chunk = [...(rootRef.current?.querySelectorAll<HTMLElement>('[data-reader-chunk]') ?? [])]
      .find((el) => word.variants.includes(el.dataset.chunkText ?? ''));
    if (!chunk) { useAppStore.getState().setDictionaryWord(word.traditional); return; }
    viewProps.followAudioRef.current = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    chunk.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    if (!reduced) chunk.animate(
      [{ backgroundColor: 'var(--color-brand-primary-soft-edge)' }, { backgroundColor: 'transparent' }],
      { duration: 1600, delay: 350, easing: 'ease-out' },
    );
  }, [viewProps.followAudioRef]);
  const props = {
    ...viewProps, reading, alignment, newWords, compactTop: grouped,
    onPlayLine: playLine, onPlayRange: playRange,
    footer: <ReaderSummary reading={reading} characterPreference={viewProps.characterPreference}
      hasFinished={viewProps.hasFinished} words={newWords} grammarPoints={partGrammarPoints}
      onPlayLine={playLineOnly} onOpenGrammar={onOpenGrammar} onLocateWord={locateWord} />,
  };
  return (
    <section ref={rootRef} aria-label={`Lesson ${reading.lessonId}, Part ${reading.dialogueNumber}`} data-reading-id={reading.id}>
      {grouped && (
        <div className="mx-auto max-w-4xl px-4 sm:px-8">
          {!first && <hr className="mb-8 border-t-2 border-ui-border" />}
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-black text-ui-muted-strong">Lesson {reading.lessonId} · Part {reading.dialogueNumber}</h2>
            <IconActionButton variant="quiet" label={`Play Lesson ${reading.lessonId}, Part ${reading.dialogueNumber}`} icon={<AppIcon name="audio" size={20} />} onClick={() => playLine(0)} />
          </div>
        </div>
      )}
      <Suspense fallback={null}>
        {isEssayReading(reading) ? <ReadingNarrativeView {...props} /> : <ReadingCanvas {...props} />}
      </Suspense>
    </section>
  );
}

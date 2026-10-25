import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'motion/react';
import { ActionButton, AppIcon, Drawer, PlayfulNavIcon, WorkspaceWindow } from '../../../lib/widgets';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useModalFocus } from '../../../hooks/useModalFocus';
import type { ActivityType, CourseLessonProgress } from '../../../types/models';
import { getEnglishLessonTitle } from '../../../utils/lesson/lessonTitle';
import { preloadPracticeChunks, prefetchPractice } from '../../activities';
import { getLessonSelectionKey } from '../../../utils/lesson/lessonPartSelection';
import { LessonActions, ModeButtons } from './ModePanel';
import { LessonPicture } from './LessonPicture';
import { PartTabs } from './PartTabs';
import { ChallengeCard, HereButton, lessonKey } from '../../../features/social';
import { useAppStore } from '../../../store/useAppStore';
import { fetchCourseExampleRecords, fetchReadingsPack } from '../../../services/contentPacks';
import {
  getAggregatedPart,
  getDefaultMode,
  getFirstOpenPartId,
  isModeAvailable,
  useLessonWindowParts,
  type LessonWindowPart,
  type PartModeKey,
} from './useLessonWindowParts';

export interface LessonWindowTarget {
  lessonId: number;
  /** Last viewed part; null opens the first unfinished one. */
  partId: number | null;
}

interface LessonWindowProps {
  bookId: number;
  lesson: CourseLessonProgress | null;
  partId: number | null;
  /** Hidden (not closed) while a practice activity is on top, so "back" lands here. */
  isHidden: boolean;
  onPartChange: (partId: number) => void;
  onClose: () => void;
  onStartPractice: (lessonId: number, partId: number | number[], activity: ActivityType) => void;
  onOpenGrammarPart: (manifestId: string, onComplete?: () => void) => void;
  onOpenReadingPart: (target: { bookId: number; lessonId: number; partId: number }) => void;
}

type BodyProps = Omit<LessonWindowProps, 'lesson' | 'isHidden'> & {
  lesson: CourseLessonProgress;
  isDesktop: boolean;
  /** Mode picked per part; lives above the body so it survives a practice round. */
  modes: Record<number, PartModeKey>;
  onModeChange: (partId: number, mode: PartModeKey) => void;
};

function LessonTitle({ lesson, part, isDesktop }: { lesson: CourseLessonProgress; part: LessonWindowPart; isDesktop: boolean }) {
  const [, lessonChinese] = lesson.title.split('·').map((piece) => piece.trim());
  const [partChinese, ...partEnglish] = part.title.split(' · ');
  const english = partEnglish.length > 0 ? partEnglish.join(' · ') : getEnglishLessonTitle(lesson.title);
  const chinese = partEnglish.length > 0 ? partChinese : lessonChinese;
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-ui-muted">{lesson.label}</p>
      <h2 className={isDesktop ? 'mt-1 text-4xl font-black leading-tight text-ui-ink-strong' : 'text-2xl font-black leading-tight text-ui-ink-strong md:text-3xl'}>
        {english}
      </h2>
      {chinese && (
        <p className={`mt-1 font-chinese-sans font-semibold tracking-wide text-ui-muted-strong ${isDesktop ? 'text-2xl' : 'text-xl'}`}>
          {chinese}
        </p>
      )}
    </div>
  );
}

/**
 * Whether these parts have sentences (Sentences is offered only then). Book 1 has course-example
 * records; a book without them (Book 3) reads its dialogues (dialogue n = part n) and its words'
 * own examples, so any part with words or a dialogue has some.
 */
function useHasPartSentences(bookId: number, lessonId: number, partIds: number[], hasWords: boolean): boolean {
  const [hasSentences, setHasSentences] = useState(false);
  const partsKey = partIds.join(',');
  useEffect(() => {
    let current = true;
    const parts = new Set(partsKey.split(',').map(Number));
    void Promise.all([fetchCourseExampleRecords(), fetchReadingsPack(bookId)]).then(([records, readings]) => {
      if (!current) return;
      const hasCourseRecords = records.some((r) => r.bookId === bookId);
      setHasSentences(hasCourseRecords
        ? records.some((r) => r.bookId === bookId && r.lessonId === lessonId && parts.has(r.partId))
        : hasWords || Boolean(readings?.some((r) => r.lessonId === lessonId && parts.has(r.dialogueNumber))));
    });
    return () => { current = false; };
  }, [bookId, hasWords, lessonId, partsKey]);
  return hasSentences;
}

function PracticeHubDrawer({
  canQuiz,
  canReadSentences,
  isOpen,
  onClose,
  onQuizIntent,
  onPinyinIntent,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  canQuiz: boolean;
  canReadSentences: boolean;
  onQuizIntent: () => void;
  onPinyinIntent: () => void;
  onSelect: (activity: 'quiz' | 'writing' | 'pinyin' | 'tones' | 'sentences') => void;
}) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <PlayfulNavIcon name="practiceHub" className="h-6 w-6" />
          <Drawer.Title>Practice hub</Drawer.Title>
        </div>
      }
      tone="practice"
      size="md"
      mdPlacement="side"
      heightClassName="max-h-[60vh] md:max-h-full"
    >
      <div className="flex flex-col gap-3">
        {canQuiz && (
          <>
            <ActionButton
              variant="secondary"
              size="lg"
              fullWidth
              edgeColor="var(--color-ui-border)"
              onClick={() => onSelect('quiz')}
              onPointerEnter={onQuizIntent}
              onPointerDown={onQuizIntent}
              onFocus={onQuizIntent}
              className="justify-start gap-3 normal-case tracking-normal !border-ui-border !text-ui-ink-strong"
            >
              <PlayfulNavIcon name="quiz" className="h-8 w-8" />
              <span>Quiz</span>
              <AppIcon name="next" size={18} className="ml-auto text-ui-muted-strong" />
            </ActionButton>
            <ChallengeCard onOpen={onClose} />
            <div aria-hidden="true" className="border-t border-ui-divider" />
          </>
        )}
        <ActionButton
          variant="secondary"
          size="lg"
          fullWidth
          edgeColor="var(--color-ui-border)"
          onClick={() => onSelect('writing')}
          className="justify-start gap-3 normal-case tracking-normal !border-ui-border !text-ui-ink-strong"
        >
          <PlayfulNavIcon name="writing" className="h-8 w-8" />
          <span>Writing</span>
        </ActionButton>
        <ActionButton
          variant="secondary"
          size="lg"
          fullWidth
          edgeColor="var(--color-ui-border)"
          onPointerEnter={onPinyinIntent}
          onPointerDown={onPinyinIntent}
          onFocus={onPinyinIntent}
          onClick={() => onSelect('pinyin')}
          className="justify-start gap-3 normal-case tracking-normal !border-ui-border !text-ui-ink-strong"
        >
          <PlayfulNavIcon name="pinyinPractice" className="h-8 w-8" />
          <span>Pinyin</span>
        </ActionButton>
        <ActionButton
          variant="secondary"
          size="lg"
          fullWidth
          edgeColor="var(--color-ui-border)"
          onClick={() => onSelect('tones')}
          className="justify-start gap-3 normal-case tracking-normal !border-ui-border !text-ui-ink-strong"
        >
          <PlayfulNavIcon name="tonesPractice" className="h-8 w-8" />
          <span>Tones</span>
        </ActionButton>
        {canReadSentences && (
          <ActionButton
            variant="secondary"
            size="lg"
            fullWidth
            edgeColor="var(--color-ui-border)"
            onPointerEnter={() => { void preloadPracticeChunks('sentences').catch(() => {}); }}
            onClick={() => onSelect('sentences')}
            className="justify-start gap-3 normal-case tracking-normal !border-ui-border !text-ui-ink-strong"
          >
            <PlayfulNavIcon name="reading" className="h-8 w-8" />
            <span>Sentences</span>
          </ActionButton>
        )}
      </div>
    </Drawer>
  );
}

function LessonBody({
  bookId,
  lesson,
  partId,
  isDesktop,
  modes,
  onModeChange,
  onPartChange,
  onClose,
  onStartPractice,
  onOpenGrammarPart,
  onOpenReadingPart,
}: BodyProps) {
  const { parts, illustrationsByPart, fallbackImageSrc, fallbackIsIllustration } = useLessonWindowParts(bookId, lesson);
  const rootRef = useRef<HTMLDivElement>(null);
  const [isPracticeHubOpen, setIsPracticeHubOpen] = useState(false);

  const resolvedPartId = partId !== null && parts.some((part) => part.id === partId)
    ? partId
    : getFirstOpenPartId(parts);

  const [selectedPartIds, setSelectedPartIds] = useState<number[]>(() => (
    resolvedPartId !== null ? [resolvedPartId] : []
  ));

  useEffect(() => {
    if (resolvedPartId !== null && selectedPartIds.length <= 1 && !selectedPartIds.includes(resolvedPartId)) {
      setSelectedPartIds([resolvedPartId]);
    }
  }, [resolvedPartId, selectedPartIds]);

  const activeIndex = Math.max(0, parts.findIndex((p) => p.id === (selectedPartIds[0] ?? resolvedPartId)));
  const selectedParts = parts.filter((p) => selectedPartIds.includes(p.id));
  const activePart = selectedParts.length > 0 ? getAggregatedPart(selectedParts) : parts[activeIndex];
  const hasSentences = useHasPartSentences(bookId, lesson.id, selectedPartIds.length > 0 ? selectedPartIds : activePart ? [activePart.id] : [], Boolean(activePart && activePart.vocab.total > 0));

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      // Reader/grammar windows open over this one; they own the arrow keys.
      const dialogs = document.querySelectorAll('[aria-modal="true"]');
      if (!dialogs[dialogs.length - 1]?.contains(rootRef.current)) return;
      const next = parts[activeIndex + (event.key === 'ArrowLeft' ? -1 : 1)];
      if (next) {
        setSelectedPartIds([next.id]);
        onPartChange(next.id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeIndex, onPartChange, parts]);

  if (!activePart) return null;

  const imageSrc = illustrationsByPart[activePart.id] ?? fallbackImageSrc;
  const isIllustration = Boolean(illustrationsByPart[activePart.id]) || fallbackIsIllustration;

  const stored = modes[activePart.id];
  const mode = stored && isModeAvailable(activePart, stored) ? stored : getDefaultMode(activePart);

  const handleStart = () => {
    const practiceTarget = selectedPartIds.length > 1 ? selectedPartIds : activePart.id;
    if (mode === 'vocab') onStartPractice(lesson.id, practiceTarget, 'flashcards');
    else if (mode === 'grammar' && activePart.grammar) onOpenGrammarPart(activePart.grammar.manifestId, () => {
      setSelectedPartIds([activePart.id]);
      onPartChange(activePart.id);
      onModeChange(activePart.id, 'reading');
    });
    else onOpenReadingPart({ bookId, lessonId: lesson.id, partId: selectedPartIds[0] ?? activePart.id });
  };
  const swipe = (step: 1 | -1) => {
    const next = parts[activeIndex + step];
    if (next) {
      setSelectedPartIds([next.id]);
      onPartChange(next.id);
    }
  };
  const handleSelectPart = (id: number) => {
    setSelectedPartIds([id]);
    onPartChange(id);
  };
  const handleTogglePart = (id: number) => {
    setSelectedPartIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        const next = prev.filter((p) => p !== id);
        onPartChange(next[0]);
        return next;
      }
      return [...prev, id].sort((a, b) => a - b);
    });
  };

  const modeButtons = (
    <ModeButtons part={activePart} selected={mode} large={isDesktop} onSelect={(next) => onModeChange(activePart.id, next)} />
  );
  const actions = (
    <LessonActions
      onStart={handleStart}
      onStartIntent={() => {
        if (mode === 'vocab') void prefetchPractice({
          activeBookId: bookId,
          selectedLessons: [lesson.id],
          selectedLessonParts: { [getLessonSelectionKey(bookId, lesson.id)]: selectedPartIds },
          activity: 'flashcards',
        });
      }}
      onOpenPracticeHub={() => setIsPracticeHubOpen(true)}
      isPracticeHubOpen={isPracticeHubOpen}
    />
  );
  const practiceHubDrawer = (
    <PracticeHubDrawer
      canQuiz={activePart.vocab.total > 0}
      canReadSentences={hasSentences}
      isOpen={isPracticeHubOpen}
      onClose={() => setIsPracticeHubOpen(false)}
      onQuizIntent={() => { void preloadPracticeChunks('quiz').catch(() => {}); }}
      onPinyinIntent={() => { void preloadPracticeChunks('pinyin').catch(() => {}); }}
      onSelect={(activity) => {
        setIsPracticeHubOpen(false);
        const practiceTarget = selectedPartIds.length > 1 ? selectedPartIds : activePart.id;
        onStartPractice(lesson.id, practiceTarget, activity);
      }}
    />
  );

  const backButton = (
    <button
      type="button"
      onClick={onClose}
      className="-ml-2 mb-3 flex w-fit items-center gap-1 rounded-compact px-2 py-1.5 text-base font-black text-ui-muted-strong outline-none hover:text-ui-ink-strong focus-ring"
    >
      <AppIcon name="next" size={18} className="-scale-x-100" />
      <span>Books</span>
    </button>
  );

  if (isDesktop) {
    // Picture width follows both the free width and the free height (16:9), so it grows with the window.
    const pictureWidth = 'min(calc(100cqw - 7rem - 21.25rem - 3.5rem), calc((100cqh - 10.5rem) * 16 / 9))';
    return (
      <div ref={rootRef} className="flex min-h-0 flex-1 overflow-y-auto pb-[4dvh] [container-type:size] custom-scrollbar">
        <div
          className="m-auto grid grid-cols-[var(--picture-w)_21.25rem] gap-x-14 px-14 py-8"
          style={{ '--picture-w': pictureWidth } as React.CSSProperties}
        >
          <div className="flex flex-col">
            {backButton}
            <LessonPicture src={imageSrc} isIcon={!isIllustration} onSwipe={swipe} className="rounded-modal" />
            <PartTabs
              parts={parts}
              selectedPartIds={selectedPartIds}
              onSelectPart={handleSelectPart}
              onTogglePart={handleTogglePart}
              className="mt-3.5"
            />
          </div>
          <div className="mt-12 flex flex-col">
            <LessonTitle lesson={lesson} part={activePart} isDesktop />
            <HereButton lesson={lessonKey(bookId, lesson.id)} />
            <div className="mt-6">{modeButtons}</div>
            <div className="mt-auto pt-5">{actions}</div>
          </div>
        </div>
        {practiceHubDrawer}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        <div className="mx-auto w-full max-w-xl">
          <div className="px-4 pt-3">
            {backButton}
            <LessonPicture src={imageSrc} isIcon={!isIllustration} onSwipe={swipe} className="max-h-[38vh] rounded-modal" />
          </div>
          <PartTabs
            parts={parts}
            selectedPartIds={selectedPartIds}
            onSelectPart={handleSelectPart}
            onTogglePart={handleTogglePart}
            className="mx-4 mt-2"
          />
          <div className="px-4 pt-4"><LessonTitle lesson={lesson} part={activePart} isDesktop={false} /><HereButton lesson={lessonKey(bookId, lesson.id)} /></div>
          <div className="px-4 pb-3 pt-3">
            {modeButtons}
          </div>
        </div>
      </div>
      <div className="relative shrink-0">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-full h-8 bg-gradient-to-t from-ui-canvas to-transparent" />
        <div className="mx-auto w-full max-w-xl px-4 pb-sheet-safe pt-2">{actions}</div>
      </div>
      {practiceHubDrawer}
    </div>
  );
}

function LessonFrame({ ariaLabel, onClose, children }: { ariaLabel: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const modalFocus = useModalFocus({ containerRef: ref, isActive: true, onEscape: onClose });
  return (
    <WorkspaceWindow
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      tabIndex={-1}
      onKeyDown={modalFocus.onKeyDown}
      // Its own rung, below the grammar/reader windows that open over it.
      layer="overlay"
    >
      {children}
    </WorkspaceWindow>
  );
}

/**
 * One lesson, one part at a time. A full-screen page at every size (WorkspaceWindow pads by the side nav, so the nav
 * stays usable); lg+ is two columns, below that one centred column.
 */
export function LessonWindow({ lesson, isHidden, onClose, ...bodyProps }: LessonWindowProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [modeState, setModeState] = useState<{ lessonId: number | null; byPart: Record<number, PartModeKey> }>({
    lessonId: null,
    byPart: {},
  });
  const lessonId = lesson?.id ?? null;
  const modes = modeState.lessonId === lessonId ? modeState.byPart : {};
  const onModeChange = (partId: number, mode: PartModeKey) => setModeState({
    lessonId,
    byPart: { ...modes, [partId]: mode },
  });

  const isOpen = Boolean(lesson) && !isHidden;
  const viewing = lesson ? lessonKey(bodyProps.bookId, lesson.id) : null;
  useEffect(() => {
    useAppStore.getState().setSocial({ socialViewingLesson: viewing });
    return () => useAppStore.getState().setSocial({ socialViewingLesson: null });
  }, [viewing]);
  const ariaLabel = lesson ? `${lesson.label}: ${getEnglishLessonTitle(lesson.title)}` : 'Lesson';
  const body = lesson && (
    <LessonBody
      lesson={lesson}
      isDesktop={isDesktop}
      modes={modes}
      onModeChange={onModeChange}
      onClose={onClose}
      {...bodyProps}
    />
  );

  return createPortal(
    <AnimatePresence>
      {isOpen && <LessonFrame key="lesson-window" ariaLabel={ariaLabel} onClose={onClose}>{body}</LessonFrame>}
    </AnimatePresence>,
    document.body,
  );
}

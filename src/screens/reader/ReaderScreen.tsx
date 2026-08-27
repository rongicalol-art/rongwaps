import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AppIcon,
  DropdownMenu,
  DropdownMenuItem,
  IconActionButton,
  ScreenHeader,
} from '../../lib/widgets';
import { SAMPLE_LESSONS } from '../../data/books';
import { audioService } from '../../services/audioService';
import { useAppStore } from '../../store/useAppStore';
import type { ReadingRecord } from '../../types/models';
import { cn } from '../../utils/cn';
import { officialAudioFileName } from '../../utils/officialAudio';
import { ReadingProse } from './ReadingProse';

interface ReaderScreenProps {
  readings: ReadingRecord[];
  index: number;
  onNavigate: (targetIndex: number) => void;
  onClose: () => void;
}

interface LessonTitle {
  english: string;
  chinese: string;
}

const LESSON_TITLES = new Map<number, LessonTitle>(
  SAMPLE_LESSONS
    .filter((lesson) => lesson.title.includes(' · '))
    .map((lesson) => [lesson.id, {
      english: lesson.title.split(' · ')[0],
      chinese: lesson.title.split(' · ').slice(1).join(' · '),
    }]),
);

export function ReaderScreen({ readings, index, onNavigate, onClose }: ReaderScreenProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null);
  const [showPinyin, setShowPinyin] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  const [aidsOpen, setAidsOpen] = useState(false);
  const [audioMode, setAudioMode] = useState<'book' | 'tts'>('book');

  const characterPreference = useAppStore((state) => state.characterPreference);
  const setCharacterPreference = useAppStore((state) => state.setCharacterPreference);

  const reading = readings[index];
  const lessonTitle = LESSON_TITLES.get(reading.lessonId);
  const activeParagraph = reading.paragraphs[activeParagraphIndex ?? -1] ?? null;

  // Official 時代華語 dialogue track for this reading (null → TTS only).
  const bookAudioFileName = useMemo(
    () => officialAudioFileName(reading.bookId, reading.audioReference),
    [reading],
  );

  const readingsByLesson = useMemo(() => {
    const grouped = new Map<number, ReadingRecord[]>();
    readings.forEach((candidate) => {
      const lessonReadings = grouped.get(candidate.lessonId) ?? [];
      lessonReadings.push(candidate);
      grouped.set(candidate.lessonId, lessonReadings);
    });
    return Array.from(grouped.entries());
  }, [readings]);

  const fullText = useMemo(
    () => reading.paragraphs
      .map((paragraph) => characterPreference === 'simplified' ? paragraph.simplified : paragraph.traditional)
      .join(''),
    [characterPreference, reading],
  );

  // A fresh page every time the reading changes.
  useEffect(() => {
    setActiveParagraphIndex(null);
    mainRef.current?.scrollTo({ top: 0 });
  }, [reading.id]);

  // Warm the official dialogue track ahead of the first Listen so playback
  // is instant; missing files simply skip (playback falls back to TTS).
  useEffect(() => {
    if (bookAudioFileName) {
      void audioService.preload([bookAudioFileName]);
    }
  }, [bookAudioFileName]);

  // Freeze the workspace behind the reader and manage focus (mirrors the lesson modals).
  useEffect(() => {
    const dialog = dialogRef.current;
    const root = document.getElementById('root');
    const siblings = root
      ? Array.from(root.children).filter((element) => element !== dialog) as HTMLElement[]
      : [];
    const targets = siblings.map((element) => (
      (element.querySelector('[data-workspace-content]') as HTMLElement | null) ?? element
    ));
    const previousStates = targets.map((target) => ({
      target,
      inert: target.hasAttribute('inert'),
      ariaHidden: target.getAttribute('aria-hidden'),
    }));
    targets.forEach((target) => {
      target.setAttribute('inert', '');
      target.setAttribute('aria-hidden', 'true');
    });
    dialog?.focus();

    return () => {
      audioService.stop();
      previousStates.forEach(({ target, inert, ariaHidden }) => {
        if (!inert) target.removeAttribute('inert');
        if (ariaHidden === null) target.removeAttribute('aria-hidden');
        else target.setAttribute('aria-hidden', ariaHidden);
      });
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || aidsOpen) return;
      onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [aidsOpen, onClose]);

  const toggleParagraph = (paragraphIndex: number) => {
    setActiveParagraphIndex((current) => current === paragraphIndex ? null : paragraphIndex);
  };

  const handleListen = () => {
    const locale = characterPreference === 'simplified' ? 'zh-CN' : 'zh-TW';
    if (audioMode === 'book' && bookAudioFileName) {
      // Official book track; neural TTS of the full text is the automatic
      // fallback if the file is missing or fails to load.
      void audioService.play(bookAudioFileName, 1, fullText);
      return;
    }
    void audioService.speakText(fullText, locale, 0.84);
  };

  const closeAids = () => setAidsOpen(false);

  return (
    <motion.div
      ref={dialogRef}
      tabIndex={-1}
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
      className="workspace-window fixed inset-0 z-[500] flex flex-col overflow-hidden bg-ui-surface outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Reading: ${lessonTitle?.english ?? `Lesson ${reading.lessonId}`}`}
    >
      <ScreenHeader
        onClose={onClose}
        maxWidth="none"
        className="z-30 border-b-0 bg-transparent shadow-none"
        rightAction={(
          <DropdownMenu
            label="Reading aids"
            open={aidsOpen}
            onOpenChange={setAidsOpen}
            align="end"
            widthClassName="w-56"
            renderTrigger={(props) => (
              <IconActionButton
                {...props}
                size="lg"
                variant="surface"
                icon={<AppIcon name="controls" size={22} />}
                label="Reading aids"
              />
            )}
          >
            <DropdownMenuItem
              active={characterPreference === 'traditional'}
              onClick={() => { setCharacterPreference('traditional'); closeAids(); }}
            >
              繁體 · Traditional
            </DropdownMenuItem>
            <DropdownMenuItem
              active={characterPreference === 'simplified'}
              onClick={() => { setCharacterPreference('simplified'); closeAids(); }}
            >
              简体 · Simplified
            </DropdownMenuItem>
            <div className="my-1 h-px bg-ui-divider" aria-hidden="true" />
            <DropdownMenuItem
              active={showPinyin}
              onClick={() => { setShowPinyin((value) => !value); closeAids(); }}
            >
              Pinyin
            </DropdownMenuItem>
            <DropdownMenuItem
              active={showMeaning}
              onClick={() => { setShowMeaning((value) => !value); closeAids(); }}
            >
              Meaning
            </DropdownMenuItem>
            <div className="my-1 h-px bg-ui-divider" aria-hidden="true" />
            {bookAudioFileName && (
              <>
                <DropdownMenuItem
                  active={audioMode === 'book'}
                  onClick={() => { setAudioMode('book'); closeAids(); }}
                >
                  Book audio
                </DropdownMenuItem>
                <DropdownMenuItem
                  active={audioMode === 'tts'}
                  onClick={() => { setAudioMode('tts'); closeAids(); }}
                >
                  Text-to-speech
                </DropdownMenuItem>
                <div className="my-1 h-px bg-ui-divider" aria-hidden="true" />
              </>
            )}
            <DropdownMenuItem
              icon={<AppIcon name="audio" size={19} />}
              onClick={handleListen}
            >
              Listen
            </DropdownMenuItem>
          </DropdownMenu>
        )}
      />

      <main
        ref={mainRef}
        className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <article className="mx-auto w-full max-w-[44rem] px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
          {/* Book title */}
          <header>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-primary">
              Lesson {reading.lessonId} · {reading.title}
            </p>
            <h1 className="mt-2 font-chinese text-[34px] font-black leading-tight text-ui-ink-strong sm:text-[40px]">
              {lessonTitle?.chinese ?? reading.title}
            </h1>
            <p className="mt-1.5 text-sm font-bold text-ui-muted sm:text-base">
              {lessonTitle?.english ?? ''}{lessonTitle ? ' · ' : ''}{reading.setting}
            </p>
          </header>

          {/* Index of readings, grouped by lesson */}
          <nav aria-label="Readings" className="mt-9 border-y-2 border-ui-divider py-1.5">
            {readingsByLesson.map(([lessonId, lessonReadings]) => {
              const groupTitle = LESSON_TITLES.get(lessonId);
              return (
                <section key={lessonId}>
                  <h2 className="px-3 pb-1 pt-3 text-[10px] font-black uppercase tracking-[0.14em] text-ui-muted">
                    Lesson {lessonId}{groupTitle ? ` · ${groupTitle.english}` : ''}
                  </h2>
                  <ul className="divide-y divide-ui-divider">
                    {lessonReadings.map((candidate) => {
                      const candidateIndex = readings.findIndex((item) => item.id === candidate.id);
                      const isCurrent = candidateIndex === index;
                      return (
                        <li key={candidate.id}>
                          <button
                            type="button"
                            onClick={() => onNavigate(candidateIndex)}
                            aria-current={isCurrent ? 'page' : undefined}
                            className={cn(
                              'flex w-full items-baseline gap-3 rounded-[12px] px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-4 focus-visible:ring-brand-primary/25',
                              isCurrent
                                ? 'bg-brand-primary-soft'
                                : 'hover:bg-ui-hover active:bg-ui-hover/70',
                            )}
                          >
                            <span className="w-5 shrink-0 text-right text-xs font-black tabular-nums text-ui-muted">
                              {candidate.dialogueNumber}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={cn(
                                'block font-chinese text-lg font-bold leading-snug',
                                isCurrent ? 'text-brand-primary' : 'text-ui-ink-strong',
                              )}>
                                {candidate.title}
                              </span>
                              <span className="block truncate text-xs font-bold text-ui-muted">
                                {candidate.setting}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </nav>

          {/* Prose */}
          <div className="mt-10">
            <ReadingProse
              reading={reading}
              characterPreference={characterPreference}
              showPinyin={showPinyin}
              activeParagraphIndex={activeParagraphIndex}
              onToggleParagraph={toggleParagraph}
            />

            {activeParagraph ? (
              <aside aria-live="polite" className="mt-8 border-l-[3px] border-brand-primary pl-4 sm:pl-5">
                <p className="font-chinese text-[19px] font-bold leading-relaxed text-ui-ink-strong">
                  {characterPreference === 'simplified' ? activeParagraph.simplified : activeParagraph.traditional}
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-brand-primary">{activeParagraph.pinyin}</p>
                <p className="mt-1 text-[15px] font-bold leading-relaxed text-ui-muted">{activeParagraph.english}</p>
              </aside>
            ) : (
              <p className="mt-8 text-xs font-bold text-ui-muted">
                Tap any line to see its pinyin and meaning.
              </p>
            )}

            {showMeaning && (
              <section className="mt-9 border-t-2 border-ui-divider pt-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-ui-muted">
                  Translation
                </h2>
                <p className="mt-2 text-[15px] font-bold leading-relaxed text-ui-muted">
                  {reading.paragraphs.map((paragraph) => paragraph.english).join(' ')}
                </p>
              </section>
            )}
          </div>
        </article>
      </main>
    </motion.div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AppIcon,
  IconActionButton,
  ScreenHeader,
  SegmentedControl,
} from '../../../lib/widgets';
import type { ReaderTextSize, ReadingRecord } from '../../../types/models';
import { cn } from '../../../utils/cn';

interface ReaderHeaderProps {
  reading: ReadingRecord;
  textSize: ReaderTextSize;
  onTextSizeChange: (size: ReaderTextSize) => void;
  showPinyin: boolean;
  onTogglePinyin: () => void;
  showMeaning: boolean;
  onToggleMeaning: () => void;
  showHoverDefinitions?: boolean;
  onToggleHoverDefinitions?: () => void;
  onClose: () => void;
}

export function getLessonTitles(lessonTitle?: string, fallbackTitle?: string): {
  chineseTitle: string;
  englishTitle: string;
} {
  const parts = lessonTitle?.split(' · ') ?? [];
  if (parts.length >= 2) {
    return {
      chineseTitle: parts[1].trim(),
      englishTitle: parts[0].trim(),
    };
  }
  return {
    chineseTitle: lessonTitle || fallbackTitle || '',
    englishTitle: '',
  };
}

export function getReaderHeaderTitles(reading: ReadingRecord, lessonTitle?: string): {
  chineseTitle: string;
  englishTitle: string;
} {
  const parts = reading.title.split(' · ').map((s) => s.trim());

  // 3-part title (e.g. "短文 · 自我介紹 · Self-Introduction" or "對話一 · 在機場 · At the Airport")
  if (parts.length >= 3) {
    return {
      chineseTitle: parts[1],
      englishTitle: parts[2],
    };
  }

  // 2-part title that is not a generic dialogue tag (e.g. "有趣的十二生肖 · The Interesting Zodiac")
  if (parts.length === 2) {
    const isGenericTag =
      /^(對話[一二三四五]|Dialogue\s*\d|短文|Reading)/i.test(parts[0]) ||
      /^(Dialogue\s*\d|Reading)/i.test(parts[1]);
    if (!isGenericTag) {
      return {
        chineseTitle: parts[0],
        englishTitle: parts[1],
      };
    }
    // If parts[0] is generic prefix (e.g. "短文 · 自我介紹"), treat parts[1] as chinese title
    if (/^(短文|Reading)/i.test(parts[0])) {
      const lessonParts = lessonTitle?.split(' · ') ?? [];
      return {
        chineseTitle: parts[1],
        englishTitle: lessonParts[0] ?? '',
      };
    }
  }

  // Fallback to lesson title (e.g. "The New Classmate · 新同學")
  const lessonParts = lessonTitle?.split(' · ') ?? [];
  return {
    chineseTitle: lessonParts[1] ?? reading.title,
    englishTitle: lessonParts[0] ?? '',
  };
}

export function ReaderHeader({
  reading,
  textSize,
  onTextSizeChange,
  showPinyin,
  onTogglePinyin,
  showMeaning,
  onToggleMeaning,
  showHoverDefinitions = true,
  onToggleHoverDefinitions,
  onClose,
}: ReaderHeaderProps) {
  const [isAidsOpen, setIsAidsOpen] = useState(false);
  const aidsRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isAidsOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!aidsRef.current?.contains(event.target as Node)) setIsAidsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAidsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAidsOpen]);

  // For narrative view (Dialogue 3), distinguish narrative reading from dialogue
  const isNarrative = reading.dialogueNumber === 3 || reading.title.includes('短文');

  return (
    <div
      className={cn(
        "sticky top-0 z-30 flex w-full origin-top flex-col items-center pb-2 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] backdrop-blur-[2px] transition-all duration-300 ease-out bg-gradient-to-b from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent"
      )}
    >
      <ScreenHeader
        onClose={onClose}
        maxWidth="4xl"
        className="!h-auto !min-h-0 !border-0 !bg-transparent !px-4 !py-1 !shadow-none sm:!px-8"
        centerContent={
          <div className="min-w-0 text-center">
            <h1 className="truncate text-xs sm:text-sm font-black uppercase tracking-wider text-ui-ink-strong">
              <span className="text-brand-primary">Lesson {reading.lessonId}</span>
              <span className="mx-1.5 text-ui-muted-strong">·</span>
              <span>{isNarrative ? 'Reading' : `Dialogue ${reading.dialogueNumber}`}</span>
            </h1>
          </div>
        }
        rightAction={
          <div ref={aidsRef} className="relative">
            <IconActionButton
              size="md"
              onClick={() => setIsAidsOpen((open) => !open)}
              className={isAidsOpen ? 'text-brand-primary hover:text-brand-primary' : undefined}
              icon={
                <motion.span
                  animate={{ rotate: isAidsOpen ? 90 : 0 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
                >
                  <AppIcon name="settings" size={20} />
                </motion.span>
              }
              label="Reading settings"
              title="Reading settings"
              aria-haspopup="dialog"
              aria-expanded={isAidsOpen}
            />

            <AnimatePresence>
              {isAidsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute right-0 top-full z-50 mt-2 w-64 sm:w-72 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-2.5 shadow-ambient-lg text-left space-y-3"
                >
                  {/* Font Size */}
                  <div className="space-y-1.5">
                    <span className="block px-1 text-xs font-black uppercase tracking-wider text-ui-muted-strong">
                      Font Size
                    </span>
                    <SegmentedControl<ReaderTextSize>
                      value={textSize}
                      onChange={onTextSizeChange}
                      ariaLabel="Font size preference"
                      options={[
                        { value: 'normal', label: <span>Standard</span> },
                        { value: 'large', label: <span>Large</span> },
                        { value: 'extra-large', label: <span>Huge</span> },
                      ]}
                    />
                  </div>

                  <div className="h-px bg-ui-divider" />

                  {/* Reading Aids Toggles */}
                  <div role="menu" aria-label="Reading aids" className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showMeaning}
                      onClick={onToggleMeaning}
                      className={cn(
                        'flex min-h-11 w-full items-center justify-between rounded-compact px-3 py-2 text-sm font-extrabold transition-colors outline-none focus-ring',
                        showMeaning
                          ? 'bg-brand-primary/10 text-brand-primary'
                          : 'text-ui-ink-strong hover:bg-ui-hover'
                      )}
                    >
                      <span>Translation</span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
                          showMeaning ? 'bg-brand-primary' : 'bg-ui-divider'
                        )}
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-4 w-4 rounded-full bg-ui-surface border-0 border-b-px border-b-ui-border ring-0 transition duration-200 ease-in-out translate-y-0.5',
                            showMeaning ? 'translate-x-[18px]' : 'translate-x-0.5'
                          )}
                        />
                      </span>
                    </button>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={showPinyin}
                      onClick={onTogglePinyin}
                      className={cn(
                        'flex min-h-11 w-full items-center justify-between rounded-compact px-3 py-2 text-sm font-extrabold transition-colors outline-none focus-ring',
                        showPinyin
                          ? 'bg-brand-primary/10 text-brand-primary'
                          : 'text-ui-ink-strong hover:bg-ui-hover'
                      )}
                    >
                      <span>Pinyin</span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
                          showPinyin ? 'bg-brand-primary' : 'bg-ui-divider'
                        )}
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-4 w-4 rounded-full bg-ui-surface border-0 border-b-px border-b-ui-border ring-0 transition duration-200 ease-in-out translate-y-0.5',
                            showPinyin ? 'translate-x-[18px]' : 'translate-x-0.5'
                          )}
                        />
                      </span>
                    </button>

                    {onToggleHoverDefinitions && (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showHoverDefinitions}
                      onClick={onToggleHoverDefinitions}
                      className={cn(
                        'flex min-h-11 w-full items-center justify-between rounded-compact px-3 py-2 text-sm font-extrabold transition-colors outline-none focus-ring',
                        showHoverDefinitions
                          ? 'bg-brand-primary/10 text-brand-primary'
                          : 'text-ui-ink-strong hover:bg-ui-hover'
                      )}
                    >
                      <span>Hover Definitions</span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
                          showHoverDefinitions ? 'bg-brand-primary' : 'bg-ui-divider'
                        )}
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-4 w-4 rounded-full bg-ui-surface border-0 border-b-px border-b-ui-border ring-0 transition duration-200 ease-in-out translate-y-0.5',
                            showHoverDefinitions ? 'translate-x-[18px]' : 'translate-x-0.5'
                          )}
                        />
                      </span>
                    </button>
                  )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        }
    />
  </div>
);
}

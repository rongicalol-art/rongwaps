import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AppIcon,
  IconActionButton,
  ScreenHeader,
  SettingsDropdownPicker,
  ToggleSwitch,
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
  onOpenStudyGuide?: () => void;
  isStudyGuideOpen?: boolean;
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
  onOpenStudyGuide,
  isStudyGuideOpen,
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
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsAidsOpen(false);
      }
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
        maxWidth="none"
        className="!h-auto !min-h-0 !border-0 !bg-transparent !px-4 !py-1 !shadow-none sm:!px-6 lg:!px-10 w-full"
        centerContent={
          <div className="flex items-center justify-center">
            <h1 className="truncate text-xs sm:text-sm font-black uppercase tracking-wider text-ui-ink-strong">
              <span className="text-brand-primary">Lesson {reading.lessonId}</span>
              <span className="mx-1.5 text-ui-muted-strong">·</span>
              <span>{isNarrative ? 'Reading' : `Part ${reading.dialogueNumber}`}</span>
            </h1>
          </div>
        }
        rightAction={
          <div className="flex items-center gap-1.5 sm:gap-2">
            {onOpenStudyGuide && (
              <IconActionButton
                size="md"
                onClick={onOpenStudyGuide}
                className={cn(
                  'lg:hidden',
                  isStudyGuideOpen && 'text-brand-primary hover:text-brand-primary',
                )}
                icon={<AppIcon name="sparkles" size={20} />}
                label="Study guide"
                title="Study guide"
                aria-haspopup="dialog"
                aria-expanded={isStudyGuideOpen}
              />
            )}

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
                  className="absolute right-0 top-full z-50 mt-2 w-64 sm:w-72 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-2.5 shadow-ambient-lg text-left space-y-3.5"
                >
                  {/* Font Size */}
                  <div className="pb-0.5">
                    <SettingsDropdownPicker<ReaderTextSize>
                      label="Font size"
                      ariaLabel="Font size preference"
                      value={textSize}
                      onChange={onTextSizeChange}
                      options={[
                        { value: 'normal', label: 'Standard' },
                        { value: 'large', label: 'Large' },
                        { value: 'extra-large', label: 'Huge' },
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
                      className="flex min-h-11 w-full items-center justify-between rounded-compact px-3 py-2 text-sm font-extrabold text-ui-ink-strong transition-colors outline-none hover:bg-ui-hover focus-ring"
                    >
                      <span>Translation</span>
                      <ToggleSwitch checked={showMeaning} />
                    </button>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={showPinyin}
                      onClick={onTogglePinyin}
                      className="flex min-h-11 w-full items-center justify-between rounded-compact px-3 py-2 text-sm font-extrabold text-ui-ink-strong transition-colors outline-none hover:bg-ui-hover focus-ring"
                    >
                      <span>Pinyin</span>
                      <ToggleSwitch checked={showPinyin} />
                    </button>

                    {onToggleHoverDefinitions && (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showHoverDefinitions}
                      onClick={onToggleHoverDefinitions}
                      className="flex min-h-11 w-full items-center justify-between rounded-compact px-3 py-2 text-sm font-extrabold text-ui-ink-strong transition-colors outline-none hover:bg-ui-hover focus-ring"
                    >
                      <span>Hover Definitions</span>
                      <ToggleSwitch checked={showHoverDefinitions} />
                    </button>
                  )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>
        }
      />
    </div>
  );
}


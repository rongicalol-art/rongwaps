import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AppIcon,
  IconActionButton,
  ScreenHeader,
  SegmentedControl,
} from '../../../lib/widgets';
import { SAMPLE_LESSONS } from '../../../data/books';
import type { ReadingRecord } from '../../../types/models';
import { cn } from '../../../utils/cn';

interface ReaderHeaderProps {
  reading: ReadingRecord;
  characterPreference: 'traditional' | 'simplified';
  onCharacterPreferenceChange: (pref: 'traditional' | 'simplified') => void;
  audioMode: 'book' | 'tts';
  onAudioModeChange: (mode: 'book' | 'tts') => void;
  hasOfficialAudio: boolean;
  textSize: 'normal' | 'large';
  onTextSizeChange: (size: 'normal' | 'large') => void;
  showPinyin: boolean;
  onTogglePinyin: () => void;
  showMeaning: boolean;
  onToggleMeaning: () => void;
  onClose: () => void;
}

export function ReaderHeader({
  reading,
  characterPreference,
  onCharacterPreferenceChange,
  audioMode,
  onAudioModeChange,
  hasOfficialAudio,
  textSize,
  onTextSizeChange,
  showPinyin,
  onTogglePinyin,
  showMeaning,
  onToggleMeaning,
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

  const lessonInfo = SAMPLE_LESSONS.find((l) => l.id === reading.lessonId);
  const parts = lessonInfo?.title.split(' · ') ?? [];
  const englishTitle = parts[0] ?? reading.title;
  const chineseTitle = parts[1] ?? reading.title;

  return (
    <div className="sticky top-0 z-30 flex w-full origin-top flex-col items-center bg-gradient-to-b from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent pb-2 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] backdrop-blur-[2px]">
      <ScreenHeader
        onClose={onClose}
        maxWidth="4xl"
        className="!h-auto !min-h-0 !border-0 !bg-transparent !px-4 !py-1 !shadow-none sm:!px-8"
        centerContent={
          <div className="min-w-0 text-center">
            <h1 className="truncate font-chinese text-base sm:text-lg font-black text-ui-ink-strong">
              {chineseTitle}
            </h1>
            <p className="truncate text-xs font-bold text-ui-muted">
              {englishTitle}
            </p>
          </div>
        }
        rightAction={
          <div ref={aidsRef} className="relative">
            <IconActionButton
              size="lg"
              variant="quiet"
              onClick={() => setIsAidsOpen((open) => !open)}
              className={isAidsOpen ? 'text-brand-primary hover:text-brand-primary' : undefined}
              icon={
                <motion.span
                  animate={{ rotate: isAidsOpen ? 180 : 0 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
                >
                  <AppIcon name="dropdown" size={24} />
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
                  className="absolute right-0 top-full z-50 mt-2 w-72 rounded-feature border-0 border-b-[length:var(--depth-md)] border-b-ui-border bg-ui-surface p-4 sm:w-80 text-left space-y-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <AppIcon name="dropdown" size={16} className="text-brand-primary" />
                      <h3 className="text-sm font-black text-ui-ink-strong">Display Settings</h3>
                    </div>
                    <p className="mt-0.5 text-xs font-bold text-ui-muted">Customize reading experience</p>
                  </div>

                  {/* Character Script */}
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-black uppercase tracking-wider text-ui-muted-strong">
                      Character Script
                    </span>
                    <SegmentedControl
                      value={characterPreference}
                      onChange={onCharacterPreferenceChange}
                      ariaLabel="Character script format"
                      options={[
                        { value: 'traditional', label: <span>Traditional (繁體)</span> },
                        { value: 'simplified', label: <span>Simplified (简体)</span> },
                      ]}
                    />
                  </div>

                  {/* Text Size */}
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-black uppercase tracking-wider text-ui-muted-strong">
                      Font Size
                    </span>
                    <SegmentedControl
                      value={textSize}
                      onChange={onTextSizeChange}
                      ariaLabel="Font size preference"
                      options={[
                        { value: 'normal', label: <span>Standard</span> },
                        { value: 'large', label: <span>Large</span> },
                      ]}
                    />
                  </div>

                  {/* Audio Source (if official audio available) */}
                  {hasOfficialAudio && (
                    <div className="space-y-1.5">
                      <span className="block text-[11px] font-black uppercase tracking-wider text-ui-muted-strong">
                        Audio Source
                      </span>
                      <SegmentedControl
                        value={audioMode}
                        onChange={onAudioModeChange}
                        ariaLabel="Audio source mode"
                        options={[
                          { value: 'book', label: <span>Book Track</span> },
                          { value: 'tts', label: <span>Neural TTS</span> },
                        ]}
                      />
                    </div>
                  )}

                  {/* Reading Aids Toggles */}
                  <div className="space-y-2">
                    <span className="block text-[11px] font-black uppercase tracking-wider text-ui-muted-strong">
                      Reading Aids
                    </span>
                    <div className="overflow-hidden rounded-control bg-ui-hover/60 divide-y divide-ui-divider/70">
                      {/* Pinyin Toggle */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={showPinyin}
                        onClick={onTogglePinyin}
                        className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors outline-none hover:bg-ui-surface focus-visible:bg-ui-surface"
                      >
                        <div className="min-w-0">
                          <span className="block text-xs font-black text-ui-ink-strong">Pinyin Annotations</span>
                          <span className="block text-[11px] font-bold text-ui-muted">Pronunciation above characters</span>
                        </div>
                        <span
                          aria-hidden="true"
                          className={cn(
                            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
                            showPinyin ? 'bg-brand-primary' : 'bg-ui-hover',
                          )}
                        >
                          <span
                            className={cn(
                              'pointer-events-none inline-block h-5 w-5 rounded-full bg-ui-surface border-0 border-b-[length:var(--depth-sm)] border-b-ui-border ring-0 transition duration-200 ease-in-out',
                              showPinyin ? 'translate-x-5' : 'translate-x-0',
                            )}
                          />
                        </span>
                      </button>

                      {/* Translation Toggle */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={showMeaning}
                        onClick={onToggleMeaning}
                        className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors outline-none hover:bg-ui-surface focus-visible:bg-ui-surface"
                      >
                        <div className="min-w-0">
                          <span className="block text-xs font-black text-ui-ink-strong">English Translation</span>
                          <span className="block text-[11px] font-bold text-ui-muted">Sentence-by-sentence meaning</span>
                        </div>
                        <span
                          aria-hidden="true"
                          className={cn(
                            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
                            showMeaning ? 'bg-brand-primary' : 'bg-ui-hover',
                          )}
                        >
                          <span
                            className={cn(
                              'pointer-events-none inline-block h-5 w-5 rounded-full bg-ui-surface border-0 border-b-[length:var(--depth-sm)] border-b-ui-border ring-0 transition duration-200 ease-in-out',
                              showMeaning ? 'translate-x-5' : 'translate-x-0',
                            )}
                          />
                        </span>
                      </button>
                    </div>
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

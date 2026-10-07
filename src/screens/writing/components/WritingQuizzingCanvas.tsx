import { motion } from 'motion/react';
import { cn } from '../../../utils/cn';
import { SingleChar } from '../HanziCanvas';
import { numberToToneMarks } from '../../../utils/pinyin/pinyin';
import { SAMPLE_BOOKS } from '../../../data/books';
import type { Flashcard } from '../../../data/flashcards';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface WritingCharProgressionProps {
  chars: string[];
  activeCharIndex: number;
  completedChars: Set<number>;
  jumpToChar: (index: number) => void;
  activeBook: CourseBook;
}

function WritingCharProgression({
  chars,
  activeCharIndex,
  completedChars,
  jumpToChar,
  activeBook,
}: WritingCharProgressionProps) {
  if (chars.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col items-center gap-1.5 select-none sm:mt-6">
      {/* Character glyphs (only completed characters are revealed) */}
      <div className="flex flex-row items-center justify-center gap-2">
        {chars.map((char, index) => {
          const isCompleted = completedChars.has(index);
          const isCurrent = index === activeCharIndex;
          const isClickable = isCompleted && index < activeCharIndex;

          return (
            <button
              key={`char-${index}`}
              type="button"
              disabled={!isClickable}
              onClick={isClickable ? () => jumpToChar(index) : undefined}
              aria-label={
                isCompleted
                  ? `Character ${index + 1}: ${char}, completed. Tap to revisit.`
                  : `Character ${index + 1}: unwritten.`
              }
              className={cn(
                'flex h-8 items-center justify-center transition-all duration-300 ease-out sm:h-9',
                isCompleted ? 'w-8 sm:w-10' : isCurrent ? 'w-12 sm:w-14' : 'w-8 sm:w-10',
                isClickable && 'cursor-pointer hover:opacity-80 active:scale-95 focus-ring-inline',
                !isClickable && 'cursor-default pointer-events-none'
              )}
            >
              <span
                className={cn(
                  'font-chinese text-2xl font-bold leading-none select-none transition-opacity duration-200 sm:text-3xl',
                  isCompleted ? activeBook.accent : 'invisible opacity-0'
                )}
              >
                {char}
              </span>
            </button>
          );
        })}
      </div>

      {/* Progress Lines Indicator */}
      <div className="flex flex-row items-center justify-center gap-2">
        {chars.map((_, index) => {
          const isFinished = completedChars.has(index);
          const isCurrent = index === activeCharIndex;
          const isClickable = index < activeCharIndex;
          return (
            <button
              key={`dot-${index}`}
              type="button"
              disabled={!isClickable}
              onClick={() => jumpToChar(index)}
              title={isClickable ? `Go back to character ${index + 1}` : undefined}
              aria-label={`Character ${index + 1}`}
              className={cn(
                'h-2.5 rounded-full transition-all duration-300 ease-out focus-ring-inline',
                isFinished
                  ? `w-8 sm:w-10 ${activeBook.accentBg}`
                  : isCurrent
                  ? `w-12 sm:w-14 ${activeBook.accentBg}`
                  : 'w-8 sm:w-10 bg-brand-primary-track',
                isClickable ? 'cursor-pointer hover:opacity-80 active:scale-95' : 'cursor-default'
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

export interface WritingQuizzingCanvasProps {
  currentCard: Flashcard;
  chars: string[];
  activeCharIndex: number;
  completedChars: Set<number>;
  resetCounter: number;
  canvasSize: number;
  showOutline: boolean;
  animateStrokesSignal: number;
  activeBook: CourseBook;
  reduceMotion: boolean | null;
  onCharComplete: () => void;
  onAnimationStart: () => void;
  onAnimationEnd: () => void;
  jumpToChar: (index: number) => void;
}

export function WritingQuizzingCanvas({
  currentCard,
  chars,
  activeCharIndex,
  completedChars,
  resetCounter,
  canvasSize,
  showOutline,
  animateStrokesSignal,
  activeBook,
  reduceMotion,
  onCharComplete,
  onAnimationStart,
  onAnimationEnd,
  jumpToChar,
}: WritingQuizzingCanvasProps) {
  return (
    <motion.div
      key={`quizzing-${currentCard.id}`}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -8 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="flex max-h-full w-full flex-col items-center"
    >
      {/* Meaning and Pinyin Above */}
      <div className="mb-3 mt-2 flex w-full shrink-0 flex-col items-center justify-center px-4 select-none sm:mb-5 sm:mt-4">
        <p className="text-center text-xl font-extrabold leading-tight text-ui-ink sm:text-2xl">
          {currentCard.back}
        </p>
        {currentCard.pinyin && (
          <p className="mt-1 text-center text-base font-bold tracking-widest text-ui-muted select-none sm:text-lg">
            {numberToToneMarks(currentCard.pinyin)}
          </p>
        )}
      </div>

      <motion.div
        key={`char-canvas-${currentCard.id}-${activeCharIndex}-${resetCounter}`}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0.7, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="pointer-events-auto"
      >
        <SingleChar
          char={chars[activeCharIndex]}
          status={completedChars.has(activeCharIndex) ? 'completed' : 'quizzing'}
          onComplete={onCharComplete}
          size={canvasSize}
          showOutline={showOutline}
          animateSignal={animateStrokesSignal}
          onAnimationStart={onAnimationStart}
          onAnimationEnd={onAnimationEnd}
          accentHex={activeBook.accentHex}
        />
      </motion.div>

      {/* Word Character Progression */}
      <WritingCharProgression
        chars={chars}
        activeCharIndex={activeCharIndex}
        completedChars={completedChars}
        jumpToChar={jumpToChar}
        activeBook={activeBook}
      />
    </motion.div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Flashcard } from '../../../data/flashcards';
import { SAMPLE_BOOKS } from '../../../data/books';
import { PracticeChoiceButton, getPracticeChoiceState } from '../../../features/practice';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import { useAppStore } from '../../../store/useAppStore';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import { cn } from '../../../utils/cn';
import { CARD_SURFACE_CLASS } from '../../flashcard';
import { QuizHanziPrompt } from '../QuizShell';
import { useQuizShuffle, type QuizHandoff } from '../quizShuffle';

export type PickPrompt = 'hanzi' | 'audio' | 'meaning';
export type PickChoice = 'meaning' | 'hanzi';

type Book = (typeof SAMPLE_BOOKS)[number];

/** Plays the word's audio; a tap is a user gesture, so it works in Safari. */
export const PromptAudioButton: React.FC<{ card: Flashcard; className?: string }> = ({ card, className }) => {
  const rate = useAppStore((state) => state.pronunciationRate);
  return (
    <button
      type="button"
      aria-label="Play audio"
      onClick={() => { void audioService.playCard(card, rate); }}
      className={cn(
        'flex items-center justify-center rounded-control text-ui-muted-strong transition-colors hover:bg-ui-hover hover:text-ui-ink focus-ring',
        'h-10 w-10',
        className,
      )}
    >
      <AppIcon name="audio" size={26} />
    </button>
  );
};

/** Listen and pick: one big speaker button and the answers, nothing else. The feedback bar shows the word. */
const ListenPrompt: React.FC<{ card: Flashcard }> = ({ card }) => {
  const rate = useAppStore((state) => state.pronunciationRate);
  return (
    <div className="flex justify-center py-4">
      <ActionButton
        aria-label="Play audio"
        data-quiz-launch-target
        size="lg"
        radius="feature"
        onClick={() => { void audioService.playCard(card, rate); }}
        className="h-32 w-32 !p-0 md:h-36 md:w-36"
      >
        <AppIcon name="audio" size={64} className="text-brand-primary-soft" />
      </ActionButton>
    </div>
  );
};

export function useAudioOnMount(card: Flashcard, enabled: boolean) {
  const rate = useAppStore((state) => state.pronunciationRate);
  const autoPlayAudio = useAppStore((state) => state.autoPlayAudio);
  const played = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !autoPlayAudio || played.current === card.id) return;
    played.current = card.id;
    void audioService.playCard(card, rate);
  }, [enabled, autoPlayAudio, card, rate]);
}

interface PickOneProps {
  card: Flashcard;
  options: Flashcard[];
  prompt: PickPrompt;
  choice: PickChoice;
  isChecked: boolean;
  /** `pickedId` is the chosen word, so a wrong pick can be remembered as a mix-up. */
  onAnswer: (correct: boolean, pickedId: string) => void;
  onOpenBreakdown: (index: number) => void;
  breakdownOpen: boolean;
  activeBook: Book;
  /** Set only on the first question after Cards done or a review intro. */
  handoff: QuizHandoff | null;
  /** Replaces the choices once answered (the measure-word follow-up). */
  afterAnswer?: React.ReactNode;
}

export const PickOne: React.FC<PickOneProps> = ({
  card, options, prompt, choice, isChecked, onAnswer, onOpenBreakdown, breakdownOpen, activeBook, handoff, afterAnswer,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);
  const reduceMotion = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const landing = useQuizShuffle(handoff, gridRef, promptRef);
  useAudioOnMount(card, prompt !== 'meaning' && !isChecked && !breakdownOpen && !landing);

  const select = (option: Flashcard) => {
    if (isChecked || selectedId) return;
    setSelectedId(option.id);
    onAnswer(option.id === card.id, option.id);
  };
  useNumberKeySelection({
    items: options,
    onSelect: select,
    disabled: isChecked || breakdownOpen || landing,
    onDebugAnswer: () => select(card),
  });

  return (
    <motion.div
      initial={handoff || reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      className="flex w-full flex-col gap-4"
    >
      {prompt === 'audio' ? <ListenPrompt card={card} /> : (
        <div
          ref={promptRef}
          data-quiz-card
          className={cn(CARD_SURFACE_CLASS, 'relative flex h-44 w-full flex-col items-center justify-center sm:h-55 [@media(min-height:960px)]:md:h-65')}
        >
          {prompt === 'hanzi' && (
            <>
              <QuizHanziPrompt front={card.front} onOpenBreakdown={onOpenBreakdown} className="" />
              {card.audio && <PromptAudioButton card={card} className="absolute right-2 top-2" />}
            </>
          )}
          {prompt === 'meaning' && (
            <span className="px-6 text-center text-2xl font-extrabold leading-snug text-ui-ink sm:text-3xl">
              {(simpleDefinitions && card.simple) ? card.simple : card.back}
            </span>
          )}
        </div>
      )}

      {isChecked && afterAnswer ? afterAnswer : (
        <div ref={gridRef} className={cn('grid w-full grid-cols-1 gap-3', landing && 'pointer-events-none')}>
          {options.map((option, i) => (
            <PracticeChoiceButton
              key={option.id}
              index={i}
              state={getPracticeChoiceState(selectedId === option.id, isChecked, option.id === card.id)}
              disabled={isChecked}
              onClick={() => select(option)}
              selectedClassName={`${activeBook.bg} ${activeBook.accentBorder} ${activeBook.accent}`}
              selectedEdgeColor={activeBook.accentHex}
            >
              <span className={choice === 'hanzi' ? 'font-chinese text-2xl font-bold sm:text-3xl' : ''}>
                {choice === 'hanzi' ? option.front : ((simpleDefinitions && option.simple) ? option.simple : option.back)}
              </span>
            </PracticeChoiceButton>
          ))}
        </div>
      )}
    </motion.div>
  );
};

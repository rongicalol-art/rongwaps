import { motion } from 'motion/react';
import type { Flashcard } from '../../../data/flashcards';
import { FlashcardBackFace, type FlashcardBackFaceProps } from '../../../features/flashcards';

interface WritingCompletedCardProps {
  card: Flashcard;
  cardWidth: number;
  reduceMotion: boolean | null;
  showPinyin: boolean;
  showTranslation: boolean;
  examples?: FlashcardBackFaceProps['examples'];
  isExamplesLoading: boolean;
  onSelectBreakdown: (char: string) => void;
}

export function WritingCompletedCard({
  card,
  cardWidth,
  reduceMotion,
  showPinyin,
  showTranslation,
  examples,
  isExamplesLoading,
  onSelectBreakdown,
}: WritingCompletedCardProps) {
  return (
    <motion.div
      key={`finished-${card.id}`}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -14 }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 28, mass: 0.8 }}
      className="flex max-h-full w-full flex-col items-center"
    >
      <div
        data-canvas-container="true"
        className="relative mx-auto flex h-[clamp(320px,50vh,520px)] max-h-[calc(100dvh-220px)] w-full select-none flex-col overflow-hidden rounded-feature border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface p-4 pb-6 shadow-ambient-sm pointer-events-auto sm:p-6 sm:pb-8"
        style={{ maxWidth: cardWidth }}
      >
        <FlashcardBackFace
          card={card}
          setActiveBreakdown={onSelectBreakdown}
          showPinyin={showPinyin}
          showTranslation={showTranslation}
          examples={examples}
          isExamplesLoading={isExamplesLoading}
        />
      </div>
    </motion.div>
  );
}

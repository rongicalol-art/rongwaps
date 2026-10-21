import { planQuizRound, type PlanOptions } from '../utils/vocabulary/quizDirector';
import type { Flashcard } from '../data/flashcards';
import type { PlannedBeat } from './quizPlanner';

self.onmessage = ({ data }: MessageEvent<{ cards: Flashcard[]; options: PlanOptions }>) => {
  try {
    const beats: PlannedBeat[] = planQuizRound(data.cards, data.options).map((beat) => ({
      ...beat, cards: beat.cards.map((card) => card.id), options: beat.options?.map((card) => card.id), shown: beat.shown?.id,
    }));
    self.postMessage({ beats });
  } catch { self.postMessage({ error: 'Quiz preparation failed' }); }
};

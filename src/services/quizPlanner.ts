import type { Flashcard } from '../data/flashcards';
import type { PlanOptions, QuizBeat } from '../utils/vocabulary/quizDirector';

export interface PlannedBeat extends Omit<QuizBeat, 'cards' | 'options' | 'shown'> {
  cards: string[];
  options?: string[];
  shown?: string;
}

// Only quiz fields cross the worker boundary; examples, images and breakdowns stay on the UI thread.
function compactCard({ id, front, back, pinyin, audio, traditional, simplified, bookId, lessonId }: Flashcard): Flashcard {
  return { id, front, back, pinyin, audio, traditional, simplified, bookId, lessonId };
}

/** One short-lived worker per round; cancellation releases its deck and heap immediately. */
export async function prepareQuizPlan(cards: readonly Flashcard[], options: PlanOptions, signal: AbortSignal): Promise<QuizBeat[]> {
  signal.throwIfAborted();
  if (typeof Worker === 'undefined') {
    const { planQuizRound } = await import('../utils/vocabulary/quizDirector');
    await new Promise((resolve) => setTimeout(resolve, 0));
    signal.throwIfAborted();
    return planQuizRound(cards, options);
  }
  const byId = new Map([...(options.extraCards ?? []), ...cards].map((card) => [card.id, card]));
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./quizPlanner.worker.ts', import.meta.url), { type: 'module' });
    let settled = false;
    const finish = (error?: Error, beats?: QuizBeat[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      worker.terminate();
      if (error) reject(error);
      else resolve(beats!);
    };
    const abort = () => finish(new DOMException('Aborted', 'AbortError'));
    const timeout = setTimeout(() => finish(new Error('Quiz preparation timed out')), 15_000);
    signal.addEventListener('abort', abort, { once: true });
    const fail = () => finish(new Error('Quiz preparation failed'));
    worker.onerror = fail;
    worker.onmessageerror = fail;
    worker.onmessage = ({ data }: MessageEvent<{ beats?: PlannedBeat[]; error?: string }>) => {
      if (settled) return;
      try {
        if (!data.beats) throw new Error(data.error || 'Quiz preparation failed');
        const cardFor = (id: string) => {
          const card = byId.get(id);
          if (!card) throw new Error('Unknown quiz word');
          return card;
        };
        finish(undefined, data.beats.map((beat) => ({
          ...beat, cards: beat.cards.map(cardFor), options: beat.options?.map(cardFor),
          shown: beat.shown ? cardFor(beat.shown) : undefined,
        })));
      } catch (error) { finish(error instanceof Error ? error : new Error('Invalid quiz plan')); }
    };
    try {
      worker.postMessage({ cards: cards.map(compactCard), options: { ...options, extraCards: options.extraCards?.map(compactCard) } });
    } catch (error) { finish(error instanceof Error ? error : new Error('Quiz preparation failed')); }
    if (signal.aborted) abort();
  });
}

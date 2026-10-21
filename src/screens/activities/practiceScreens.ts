import type { ComponentType } from 'react';
import type { FlashcardScreen } from '../flashcard';
import type { ListeningScreen } from '../listening';
import type { QuizScreen } from '../quiz';
import type { ToneScreen } from '../tones';
import type { WritingScreen } from '../writing';
import type { PinyinScreen } from '../pinyin';
import type { ActivityType } from '../../types/models';

/**
 * Practice screens are code-split, but never rendered through `React.lazy`: a lazy
 * component suspends for one tick even when its chunk is cached, which is the blank
 * frame users saw. Instead the modal waits for `loadPracticeScreen` (readiness), then
 * `getPracticeScreen` returns the component synchronously.
 */
interface PracticeScreens {
  flashcards: typeof FlashcardScreen;
  listening: typeof ListeningScreen;
  quiz: typeof QuizScreen;
  writing: typeof WritingScreen;
  pinyin: typeof PinyinScreen;
  tones: typeof ToneScreen;
}
export type PracticeScreenKey = keyof PracticeScreens;

const loaders: { [K in PracticeScreenKey]: () => Promise<PracticeScreens[K]> } = {
  flashcards: () => import('../flashcard').then((m) => m.FlashcardScreen),
  listening: () => import('../listening').then((m) => m.ListeningScreen),
  quiz: () => import('../quiz').then((m) => m.QuizScreen),
  writing: () => import('../writing').then((m) => m.WritingScreen),
  pinyin: () => import('../pinyin').then((m) => m.PinyinScreen),
  tones: () => import('../tones').then((m) => m.ToneScreen),
};

const loaded: Partial<{ [K in PracticeScreenKey]: PracticeScreens[K] }> = {};
const pending: Partial<Record<PracticeScreenKey, Promise<void>>> = {};

export function practiceScreenKey(activity: ActivityType): PracticeScreenKey | null {
  if (activity === 'flashcards' || activity === 'flashcards-library' || activity === 'flashcards-review') return 'flashcards';
  if (activity === 'listening' || activity === 'quiz' || activity === 'writing' || activity === 'pinyin' || activity === 'tones') return activity;
  return null;
}

export function loadPracticeScreen(key: PracticeScreenKey): Promise<void> {
  pending[key] ??= (loaders[key]() as Promise<PracticeScreens[PracticeScreenKey]>).then((component) => {
    (loaded as Record<PracticeScreenKey, unknown>)[key] = component;
  }).catch((error) => { delete pending[key]; throw error; });
  return pending[key];
}

export function isPracticeScreenLoaded(key: PracticeScreenKey): boolean {
  return key in loaded;
}

export function getPracticeScreen<K extends PracticeScreenKey>(key: K): ComponentType<React.ComponentProps<PracticeScreens[K]>> | null {
  return (loaded[key] as ComponentType<React.ComponentProps<PracticeScreens[K]>> | undefined) ?? null;
}

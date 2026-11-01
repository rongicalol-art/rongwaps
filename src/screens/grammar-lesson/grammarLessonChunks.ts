import type { GrammarPractice } from '../../types/models';
import { preloadedModule } from '../../utils/browser/preloadAssets';

// Code-split parts of the lesson window, loaded ahead so they render on the frame they are needed.
// Dynamic imports only: a static import would pull them into the main bundle.
export const studyPageModule = preloadedModule(() => import('./components/GrammarStudyPage'));
export const practiceModule = preloadedModule(() => import('../../features/grammar-practice'));

/** Resolves once the first study page can draw complete; the grammar window keeps its loader up until then. */
export function prepareGrammarLesson(): Promise<void> {
  return studyPageModule.load().then(() => undefined, () => undefined);
}

/** Resolves once the book exercise's code and first pictures are ready. */
export function prepareGrammarPractice(practice: GrammarPractice): Promise<void> {
  return practiceModule.load().then((module) => module.preparePracticePictures(practice));
}

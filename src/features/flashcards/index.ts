/**
 * Flashcard domain UI shared by the flashcard study screen and the writing
 * activity: the card answer face, its example-sentence stream, and the review
 * card geometry both surfaces size themselves with.
 */
export { FlashcardBackFace } from './components/FlashcardBackFace';
export type { FlashcardBackFaceProps } from './components/FlashcardBackFace';
export { getCardWidth } from './utils/cardLayout';
export { useCurriculumExamples } from './hooks/useCurriculumExamples';

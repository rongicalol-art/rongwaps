/** Study together (presence, lesson chat, quiz races). The live root (`SocialRoot`) is lazy-loaded by the app shell. */
export { LessonFaces, HereButton, ChallengeCard } from './components/Presence';
export { PracticeFaces } from './components/PracticeFaces';
export { RaceBar, useRaceFill } from './components/RaceRiders';
export { useRaceQuiz, useRaceReady, useRaceReporter } from './useRaceQuiz';
export { lessonKey } from '../../store/slices/socialSlice';

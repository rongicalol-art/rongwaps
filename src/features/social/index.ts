/** Study together (presence, the class chat, quiz races, challenge links). The live root (`SocialRoot`) is lazy-loaded by the app shell. */
export { GlobalPresenceButton, LessonFaces, HereButton, ChallengeCard } from './components/Presence';
export { PracticeFaces } from './components/PracticeFaces';
export { RaceBar, useRaceFill } from './components/RaceRiders';
export { useRaceQuiz, useRaceReady, useRaceReporter } from './useRaceQuiz';
export { ChallengeGhost, useChallengeRide } from './components/ChallengeGhost';
export { ChallengeResult } from './components/ChallengeResult';
export { challengeSelection, endChallenge, playChallenge, shareChallenge, useChallengeQuiz } from './challenge';
export { ChallengeInvite, challengeLessonLine } from './components/ChallengeInvite';
export { lessonKey } from '../../store/slices/socialSlice';
export { BlockedPeople } from './components/BlockedPeople';
export { StudyTogetherSettings } from './components/StudyTogetherSettings';
/** Before the account is deleted: the Lobby removes its class chat lines and notices (best effort, never waits long). */
export async function forgetStudyTogether() {
  const sent = await import('./lobbyController').then(module => module.lobby.forget(), () => false);
  if (sent) await new Promise(resolve => setTimeout(resolve, 250));
}

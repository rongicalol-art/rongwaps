import { useAppStore } from '../../store/useAppStore';
import { fetchAllVocabularyPacks } from '../../services/contentPacks';
import { getProfileMediaUrl } from '../../services/profileMedia';
import { characterForms, computeStreak, countKnownCharacters, firstReviewAt } from '../../utils/srs/profileStats';
import { computeReviewOverview } from '../../utils/srs/reviewOverview';
import type { ProfileCard } from '../../../shared/lobby';

const FRESH_MS = 30_000;
let cached: { card: ProfileCard | null; at: number; user: string } | null = null;

/**
 * This learner's visit card, built only when a classmate asks (the vocabulary packs load on the first visit).
 * Null when they turned "Show my profile" off.
 */
export async function buildProfileCard(): Promise<ProfileCard | null> {
  const state = useAppStore.getState();
  const user = state.currentUser?.id;
  if (!user || !state.showProfile) return null;
  const now = Date.now();
  if (cached && cached.user === user && now - cached.at < FRESH_MS) return cached.card;
  const [rows, cover] = await Promise.all([
    fetchAllVocabularyPacks(),
    state.coverPath ? getProfileMediaUrl(user, state.coverPath).catch(() => undefined) : Promise.resolve(undefined),
  ]);
  const since = firstReviewAt(state.reviewEvents, now);
  const card: ProfileCard = {
    cv: state.coverPreset,
    b: state.activeBookId,
    w: computeReviewOverview(state.srsData, state.learnedCards, now).knownTotal,
    st: computeStreak(state.reviewEvents, now).streak,
    ...(rows ? { k: countKnownCharacters(state.learnedCards, characterForms(rows, state.characterPreference)) } : {}),
    ...(since !== null ? { s: since } : {}),
    ...(cover ? { ci: cover } : {}),
  };
  cached = { card, at: now, user };
  return card;
}

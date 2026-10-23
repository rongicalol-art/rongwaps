import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import type { QuizTypeId } from '../../utils/vocabulary/quizDirector';
import { leaveRace, raceSend, reportRaceProgress } from './raceController';
import type { RaceSelection } from '../../../shared/quizRace';

/** While a race is on screen: its quiz types, a session key of its own, and the shared seed (same quiz on every phone). */
export function useRaceQuiz(): { types: readonly QuizTypeId[]; sessionKey: string; seed: string; selection: RaceSelection; phase: 'lobby' | 'preparing' | 'race' | 'review' | 'results'; preparedCount: number; playerCount: number } | null {
  const race = useAppStore(useShallow(state => {
    const active = state.racePlaying ? state.race : null;
    return {
      selection: active?.selection, code: active?.code, round: active?.round, seed: active?.seed, phase: active?.phase,
      preparedCount: active?.players.filter(player => !player.left && player.preparedAt != null).length ?? 0,
      playerCount: active?.players.filter(player => !player.left).length ?? 0,
    };
  }));
  if (!race.selection || !race.seed) return null;
  return { types: race.selection.types, sessionKey: `race:${race.code}:${race.round}`, seed: race.seed, selection: race.selection, phase: race.phase!, preparedCount: race.preparedCount, playerCount: race.playerCount };
}

/** Report readiness only after the seeded deck and first card/audio are ready on this device. */
export function useRaceReady(planHash: string | null) {
  const race = useAppStore(useShallow(state => ({
    code: state.racePlaying ? state.race?.code : undefined,
    round: state.racePlaying ? state.race?.round : undefined,
    phase: state.racePlaying ? state.race?.phase : undefined,
    prepared: Boolean(state.racePlaying && state.race?.players.find(player => player.id === state.socialMe)?.preparedAt),
    status: state.raceStatus,
  })));
  useEffect(() => {
    if (planHash && race.phase === 'preparing' && !race.prepared && race.status === 'live') raceSend({ type: 'ready', planHash, reviewFlow: 1 });
  }, [planHash, race.code, race.round, race.phase, race.prepared, race.status]);
}

/** Reports first-pass progress to the room; does nothing outside a race. */
export function useRaceReporter(answered: number, total: number, correct: number, firstPassDone: boolean, reviewComplete: boolean) {
  const race = useAppStore(useShallow(state => ({ playing: state.racePlaying, phase: state.racePlaying ? state.race?.phase : undefined })));
  useEffect(() => {
    if (!race.playing) return;
    if (total === 0 && (race.phase === 'preparing' || race.phase === 'race')) {
      useAppStore.getState().showFeedbackToast('No words can use these quiz types. Pick another quiz.');
      leaveRace();
      return;
    }
    if (race.phase !== 'race' && race.phase !== 'review') return;
    reportRaceProgress(firstPassDone ? total : Math.min(answered, total), total, correct, reviewComplete);
  }, [race.playing, race.phase, answered, total, correct, firstPassDone, reviewComplete]);
}

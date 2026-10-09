import { useCallback, useLayoutEffect, useRef } from 'react';
import type { PartSegment, PracticeHeaderActions } from '../types/models';
import { useAppStore } from '../store/useAppStore';
import { currentItemProgress } from '../utils/srs/progress';

interface PracticeHeaderRegistration extends PracticeHeaderActions {
  currentIndex: number;
  totalCount: number;
  showLightbulb: boolean;
  partSegments?: PartSegment[];
  isRetry?: boolean;
  cleanupPhase?: { currentIndex: number; totalCount: number } | null;
  /** Close button only: no progress bar, counter or session controls (completion screens). */
  minimal?: boolean;
}

export function usePracticeHeaderRegistration({
  currentIndex,
  totalCount,
  showLightbulb,
  partSegments = [],
  isRetry,
  cleanupPhase,
  minimal = false,
  ...actions
}: PracticeHeaderRegistration) {
  const setPracticeHeader = useAppStore((state) => state.setPracticeHeader);
  const setPracticeHeaderActions = useAppStore((state) => state.setPracticeHeaderActions);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const callLightbulb = useCallback(() => actionsRef.current.onLightbulbClick?.(), []);
  const callSettings = useCallback(() => actionsRef.current.onSettingsClick?.(), []);
  const callShuffle = useCallback(() => actionsRef.current.onShuffleClick?.(), []);
  const callFlow = useCallback(() => actionsRef.current.onFlowClick?.(), []);
  const callRestart = useCallback(() => actionsRef.current.onRestartClick?.(), []);

  const hasLightbulbAction = !minimal && Boolean(actions.onLightbulbClick);
  const hasSettingsAction = !minimal && Boolean(actions.onSettingsClick);
  const hasShuffleAction = !minimal && Boolean(actions.onShuffleClick);
  const hasFlowAction = !minimal && Boolean(actions.onFlowClick);
  const hasRestartAction = !minimal && Boolean(actions.onRestartClick);

  // Layout effects flush their store update before paint: the header never shows "close only" first.
  useLayoutEffect(() => {
    setPracticeHeader({
      progress: minimal ? undefined : currentItemProgress(currentIndex, totalCount),
      currentIndex: minimal ? 0 : currentIndex,
      totalCount: minimal ? 0 : totalCount,
      showLightbulb,
      partSegments,
      isRetry,
      cleanupPhase,
    });
  }, [cleanupPhase, currentIndex, isRetry, minimal, partSegments, setPracticeHeader, showLightbulb, totalCount]);

  useLayoutEffect(() => {
    setPracticeHeaderActions({
      onLightbulbClick: hasLightbulbAction ? callLightbulb : undefined,
      onSettingsClick: hasSettingsAction ? callSettings : undefined,
      onShuffleClick: hasShuffleAction ? callShuffle : undefined,
      onFlowClick: hasFlowAction ? callFlow : undefined,
      onRestartClick: hasRestartAction ? callRestart : undefined,
      flowStatus: actions.flowStatus,
      isShuffled: actions.isShuffled,
    });
  }, [
    callFlow,
    callLightbulb,
    callRestart,
    callSettings,
    callShuffle,
    actions.flowStatus,
    actions.isShuffled,
    hasFlowAction,
    hasLightbulbAction,
    hasRestartAction,
    hasSettingsAction,
    hasShuffleAction,
    setPracticeHeaderActions,
  ]);

  useLayoutEffect(() => () => setPracticeHeaderActions({}), [setPracticeHeaderActions]);
}

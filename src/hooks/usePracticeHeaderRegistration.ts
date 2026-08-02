import { useCallback, useEffect, useRef } from 'react';
import type { PartSegment, PracticeHeaderActions } from '../types/models';
import { useAppStore } from '../store/useAppStore';
import { currentItemProgress } from '../utils/progress';

interface PracticeHeaderRegistration extends PracticeHeaderActions {
  currentIndex: number;
  totalCount: number;
  showLightbulb: boolean;
  partSegments?: PartSegment[];
}

export function usePracticeHeaderRegistration({
  currentIndex,
  totalCount,
  showLightbulb,
  partSegments = [],
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

  const hasLightbulbAction = Boolean(actions.onLightbulbClick);
  const hasSettingsAction = Boolean(actions.onSettingsClick);
  const hasShuffleAction = Boolean(actions.onShuffleClick);
  const hasFlowAction = Boolean(actions.onFlowClick);
  const hasRestartAction = Boolean(actions.onRestartClick);

  useEffect(() => {
    setPracticeHeader({
      progress: currentItemProgress(currentIndex, totalCount),
      currentIndex,
      totalCount,
      showLightbulb,
      partSegments,
    });
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
    currentIndex,
    hasFlowAction,
    hasLightbulbAction,
    hasRestartAction,
    hasSettingsAction,
    hasShuffleAction,
    setPracticeHeader,
    setPracticeHeaderActions,
    showLightbulb,
    partSegments,
    totalCount,
  ]);

  useEffect(() => () => setPracticeHeaderActions({}), [setPracticeHeaderActions]);
}

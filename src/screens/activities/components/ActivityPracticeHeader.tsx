import { useShallow } from 'zustand/react/shallow';
import { PracticeHeader } from '../../../features/practice';
import { useAppStore, selectPracticePreferences } from '../../../store/useAppStore';
import type { ActivityType, CourseLessonPartProgress } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { useReviewTone } from '../../../hooks/useReviewTone';

interface ActivityPracticeHeaderProps {
  resolvedActivity: ActivityType;
  activeActivity: ActivityType;
  isOverlayOpen: boolean;
  accentBgClassName: string;
  studyParts: CourseLessonPartProgress[];
  onSelectStudyPart: (partId: number) => void;
  onToggleStudyPart: (partId: number) => void;
  onClose: () => void;
  onWritingClose: () => void;
  activeBookId?: number;
  /** Keeps the header clear of a vertical practice dock. */
  insetClassName?: string;
}

export function ActivityPracticeHeader({
  resolvedActivity,
  activeActivity,
  isOverlayOpen,
  accentBgClassName,
  studyParts,
  onSelectStudyPart,
  onToggleStudyPart,
  onClose,
  onWritingClose,
  activeBookId,
  insetClassName,
}: ActivityPracticeHeaderProps) {
  const practiceHeader = useAppStore((state) => state.practiceHeader);
  const practiceHeaderActions = useAppStore((state) => state.practiceHeaderActions);
  const characterPreference = useAppStore((state) => state.characterPreference);
  const setCharacterPreference = useAppStore((state) => state.setCharacterPreference);
  const practicePreferences = useAppStore(useShallow(selectPracticePreferences));
  const updatePracticePreferences = useAppStore((state) => state.updatePreferences);

  useReviewTone(Boolean(practiceHeader.cleanupPhase));

  if (activeActivity === 'create-card') return null;

  // Flashcards and quiz stay on one part: no part rail to switch mid-round. Flashcards get quiet muted controls.
  const isFlashcards = resolvedActivity === 'flashcards';
  const isPartFocused = isFlashcards || resolvedActivity === 'quiz';

  return (
    <div className={cn('absolute top-0 left-0 right-0 z-activity-header', isOverlayOpen && 'invisible', insetClassName)}>
      <PracticeHeader
        // Remounts once the screen has registered its counts, so the progress rail starts at its value instead of animating from 0.
        key={`${resolvedActivity}:${practiceHeader.totalCount > 0 ? 'registered' : 'pending'}`}
        maxWidth="none"
        onClose={activeActivity === 'writing' ? onWritingClose : onClose}
        progress={practiceHeader.progress}
        currentIndex={practiceHeader.currentIndex}
        totalCount={practiceHeader.totalCount}
        isRetry={practiceHeader.isRetry}
        cleanupPhase={practiceHeader.cleanupPhase}
        partSegments={practiceHeader.partSegments}
        studyParts={isPartFocused ? [] : studyParts}
        onSelectStudyPart={onSelectStudyPart}
        onToggleStudyPart={onToggleStudyPart}
        accentBgClassName={accentBgClassName}
        activeBookId={activeBookId}
        onSettingsClick={practiceHeaderActions.onSettingsClick}
        onShuffleClick={practiceHeaderActions.onShuffleClick}
        onFlowClick={practiceHeaderActions.onFlowClick}
        onRestartClick={practiceHeaderActions.onRestartClick}
        isShuffled={practiceHeaderActions.isShuffled}
        flowStatus={practiceHeaderActions.flowStatus}
        showFlow={isFlashcards}
        quietControls={isFlashcards}
        settings={{
          preferences: practicePreferences,
          onPreferencesChange: updatePracticePreferences,
          characterPreference,
          onCharacterPreferenceChange: setCharacterPreference,
        }}
      />
    </div>
  );
}

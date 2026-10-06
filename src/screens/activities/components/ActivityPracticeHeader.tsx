import { useShallow } from 'zustand/react/shallow';
import { PracticeHeader } from '../../../features/practice';
import { useAppStore, selectPracticePreferences } from '../../../store/useAppStore';
import type { ActivityType, CourseLessonPartProgress } from '../../../types/models';
import type { FlashcardViewMode } from '../../flashcard';
import { cn } from '../../../utils/cn';

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
  flashcardMode: FlashcardViewMode;
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
  flashcardMode,
  activeBookId,
  insetClassName,
}: ActivityPracticeHeaderProps) {
  const practiceHeader = useAppStore((state) => state.practiceHeader);
  const practiceHeaderActions = useAppStore((state) => state.practiceHeaderActions);
  const characterPreference = useAppStore((state) => state.characterPreference);
  const setCharacterPreference = useAppStore((state) => state.setCharacterPreference);
  const practicePreferences = useAppStore(useShallow(selectPracticePreferences));
  const updatePracticePreferences = useAppStore((state) => state.updatePreferences);

  if (activeActivity === 'create-card') return null;

  return (
    <div className={cn('absolute top-0 left-0 right-0 z-activity-header', isOverlayOpen && 'invisible', insetClassName)}>
      <PracticeHeader
        key={resolvedActivity}
        maxWidth="none"
        onClose={activeActivity === 'writing' ? onWritingClose : onClose}
        progress={practiceHeader.progress}
        currentIndex={practiceHeader.currentIndex}
        totalCount={practiceHeader.totalCount}
        isRetry={practiceHeader.isRetry}
        cleanupPhase={practiceHeader.cleanupPhase}
        partSegments={practiceHeader.partSegments}
        studyParts={studyParts}
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
        showFlow={resolvedActivity === 'flashcards' && flashcardMode === 'cards'}
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

import React, { lazy, Suspense, useState } from 'react';
import type { AppSettingsDrawer as AppSettingsDrawerType } from './AppSettingsDrawer';
import { GrammarWindow } from './GrammarWindow';
import { ReaderWindow } from './ReaderWindow';
import { DebugToolsOverlay } from './DebugToolsOverlay';
import { DictionaryDetailOverlay } from '../../features/dictionary';
import { useAppStore } from '../../store/useAppStore';
import { LoadingScreen, WorkspaceWindow } from '../../lib/widgets';

const AppSettingsDrawer = lazy(() => import('./AppSettingsDrawer').then((m) => ({ default: m.AppSettingsDrawer })));
const SaveWordModal = lazy(() => import('../../features/library').then((m) => ({ default: m.SaveWordModal })));

type GrammarWindowProps = React.ComponentProps<typeof GrammarWindow>;
type ReaderWindowProps = React.ComponentProps<typeof ReaderWindow>;
type AppSettingsDrawerProps = React.ComponentProps<typeof AppSettingsDrawerType>;

interface AppOverlaysProps {
  isGrammarOpen: GrammarWindowProps['isOpen'];
  grammarPart: GrammarWindowProps['part'];
  grammarLoadError: boolean;
  onRetryGrammar: () => void;
  grammarPageId: GrammarWindowProps['initialPageId'];
  onCloseGrammar: GrammarWindowProps['onClose'];
  onProceedToReading: GrammarWindowProps['onProceedToReading'];
  onNavigateGrammarPart: GrammarWindowProps['onNavigatePart'];

  isReaderOpen: ReaderWindowProps['isOpen'];
  readerLoadError: boolean;
  onRetryReader: () => void;
  readings: ReaderWindowProps['readings'];
  readingIndex: ReaderWindowProps['index'];
  onReaderNext: ReaderWindowProps['onNext'];
  onReaderPrevious: ReaderWindowProps['onPrevious'];
  onCloseReader: ReaderWindowProps['onClose'];
  onOpenGrammarPart: ReaderWindowProps['onOpenGrammarPart'];

  isSettingsOpen: AppSettingsDrawerProps['isOpen'];
  onCloseSettings: AppSettingsDrawerProps['onClose'];
  onResetProgress: AppSettingsDrawerProps['onResetProgress'];
}

/**
 * Every window and overlay that lives outside the workspace shell: grammar
 * and reader study windows, dictionary/save-word overlays, settings, and
 * dev tools.
 */
export function AppOverlays({
  isGrammarOpen,
  grammarPart,
  grammarLoadError,
  onRetryGrammar,
  grammarPageId,
  onCloseGrammar,
  onProceedToReading,
  onNavigateGrammarPart,
  isReaderOpen,
  readerLoadError,
  onRetryReader,
  readings,
  readingIndex,
  onReaderNext,
  onReaderPrevious,
  onCloseReader,
  onOpenGrammarPart,
  isSettingsOpen,
  onCloseSettings,
  onResetProgress,
}: AppOverlaysProps) {
  const saveWordTarget = useAppStore((state) => state.saveWordTarget);
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [saveOpened, setSaveOpened] = useState(false);
  if (isSettingsOpen && !settingsOpened) setSettingsOpened(true);
  if (saveWordTarget && !saveOpened) setSaveOpened(true);
  return (
    <>
      {/* Reader and Grammar share the `z-window` rung; Grammar renders after
          the Reader so a grammar part opened from a reading sits on top. */}
      <ReaderWindow
        isOpen={isReaderOpen}
        loadError={readerLoadError}
        onRetry={onRetryReader}
        readings={readings}
        index={readingIndex}
        onNext={onReaderNext}
        onPrevious={onReaderPrevious}
        onClose={onCloseReader}
        onOpenGrammarPart={onOpenGrammarPart}
      />

      <GrammarWindow
        isOpen={isGrammarOpen}
        part={grammarPart}
        loadError={grammarLoadError}
        onRetry={onRetryGrammar}
        initialPageId={grammarPageId}
        onClose={onCloseGrammar}
        onProceedToReading={onProceedToReading}
        onNavigatePart={onNavigateGrammarPart}
      />

      <DictionaryDetailOverlay />
      <Suspense fallback={<WorkspaceWindow tone="canvas"><LoadingScreen tone="canvas" /></WorkspaceWindow>}>
      {saveOpened && <SaveWordModal />}
      {settingsOpened && <AppSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={onCloseSettings}
        onResetProgress={onResetProgress}
      />}
      </Suspense>

      <DebugToolsOverlay />
    </>
  );
}

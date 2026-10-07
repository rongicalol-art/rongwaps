import React from 'react';
import { AppSettingsDrawer } from './AppSettingsDrawer';
import { GrammarWindow } from './GrammarWindow';
import { ReaderWindow } from './ReaderWindow';
import { DebugToolsOverlay } from './DebugToolsOverlay';
import { DictionaryDetailOverlay } from '../../features/dictionary';
import { SaveWordModal } from '../../features/library';

type GrammarWindowProps = React.ComponentProps<typeof GrammarWindow>;
type ReaderWindowProps = React.ComponentProps<typeof ReaderWindow>;
type AppSettingsDrawerProps = React.ComponentProps<typeof AppSettingsDrawer>;

interface AppOverlaysProps {
  isGrammarOpen: GrammarWindowProps['isOpen'];
  grammarPart: GrammarWindowProps['part'];
  grammarPageId: GrammarWindowProps['initialPageId'];
  onCloseGrammar: GrammarWindowProps['onClose'];
  onProceedToReading: GrammarWindowProps['onProceedToReading'];
  onNavigateGrammarPart: GrammarWindowProps['onNavigatePart'];

  isReaderOpen: ReaderWindowProps['isOpen'];
  readings: ReaderWindowProps['readings'];
  readingIndex: ReaderWindowProps['index'];
  onReaderNext: ReaderWindowProps['onNext'];
  onReaderPrevious: ReaderWindowProps['onPrevious'];
  onCloseReader: ReaderWindowProps['onClose'];
  onOpenGrammarPart: ReaderWindowProps['onOpenGrammarPart'];

  isSettingsOpen: AppSettingsDrawerProps['isOpen'];
  onCloseSettings: AppSettingsDrawerProps['onClose'];
  characterPreference: AppSettingsDrawerProps['characterPreference'];
  onCharacterPreferenceChange: AppSettingsDrawerProps['onCharacterPreferenceChange'];
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
  grammarPageId,
  onCloseGrammar,
  onProceedToReading,
  onNavigateGrammarPart,
  isReaderOpen,
  readings,
  readingIndex,
  onReaderNext,
  onReaderPrevious,
  onCloseReader,
  onOpenGrammarPart,
  isSettingsOpen,
  onCloseSettings,
  characterPreference,
  onCharacterPreferenceChange,
  onResetProgress,
}: AppOverlaysProps) {
  return (
    <>
      {/* Reader and Grammar share the `z-window` rung; Grammar renders after
          the Reader so a grammar part opened from a reading sits on top. */}
      <ReaderWindow
        isOpen={isReaderOpen}
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
        initialPageId={grammarPageId}
        onClose={onCloseGrammar}
        onProceedToReading={onProceedToReading}
        onNavigatePart={onNavigateGrammarPart}
      />

      <DictionaryDetailOverlay />
      <SaveWordModal />
      <AppSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={onCloseSettings}
        characterPreference={characterPreference}
        onCharacterPreferenceChange={onCharacterPreferenceChange}
        onResetProgress={onResetProgress}
      />

      <DebugToolsOverlay />
    </>
  );
}

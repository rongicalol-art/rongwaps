import { useLocation } from 'react-router';
import { LoadingScreen } from './lib/widgets';
import { AppWorkspace } from './app/components/AppWorkspace';
import { AppOverlays } from './app/components/AppOverlays';
import { PwaUpdatePrompt } from './app/components/PwaUpdatePrompt';
import { useAppShell } from './app/hooks/useAppShell';
import { legalPageFromPathname } from './app/routes';
import { LegalScreen } from './screens/legal';

/**
 * Public legal pages render on their own, outside the shell: no sign-in, sync,
 * or side nav runs for them. Everything else is the workspace.
 */
export default function App() {
  const legalPage = legalPageFromPathname(useLocation().pathname);
  return legalPage ? <LegalScreen page={legalPage} /> : <AppShell />;
}

function AppShell() {
  const { isLoading, nav, reader, grammar, activity, settings, overlays } = useAppShell();

  if (isLoading) {
    return <LoadingScreen message="Loading RongWaps…" fullScreen tone="canvas" />;
  }

  return (
    <>
      <AppWorkspace
        shell={{
          activeTab: nav.activeTab,
          activeActivity: overlays.isOverlayActive ? null : activity.activeActivity,
          activeBook: activity.activeBook,
          isNavOpen: nav.isNavOpen,
          isCollapsed: nav.isCollapsed,
          isDesktopOrTablet: nav.isDesktopOrTablet,
          onToggleCollapse: nav.toggleCollapse,
          setIsNavOpen: nav.setResponsiveNavOpen,
          isOverlayActive: overlays.isOverlayActive,
          showSidebarCollapse: nav.showSidebarCollapse,
          onSettingsClick: settings.onOpen,
          onTabChange: nav.handleTabChange,
        }}
        activityModals={{
          activeActivity: activity.activeActivity,
          setActiveActivity: activity.onSetActiveActivity,
          activeBookId: activity.activeBook.id,
          selectedLessons: activity.selectedLessons,
          isLibraryMode: nav.activeTab === 'library',
          isShellOverlayOpen: overlays.isOverlayActive,
          onNavigateToPractice: activity.onNavigateToPractice,
          onOpenGrammarPart: grammar.onOpenPart,
          onOpenReading: activity.onOpenReading,
        }}
        routes={{
          activeTab: nav.activeTab,
          activeBookId: nav.activeBookId,
          setActiveBookId: nav.setActiveBookId,
          selectedLessons: activity.selectedLessons,
          toggleLesson: activity.toggleLesson,
          startPathPractice: activity.onStartPathPractice,
          setActiveTab: nav.handleTabChange,
          setActiveActivity: activity.onSetActiveActivity,
          onOpenGrammarPart: grammar.onOpenPart,
          onToggleNav: nav.handleNavToggle,
        }}
      />

      <AppOverlays
        isGrammarOpen={grammar.isOpen}
        grammarPart={grammar.part ?? null}
        grammarPageId={grammar.pageId ?? undefined}
        onCloseGrammar={grammar.onClose}
        onProceedToReading={grammar.onProceedToReading}
        onNavigateGrammarPart={grammar.onOpenPart}
        isReaderOpen={reader.isOpen}
        readings={reader.readings}
        readingIndex={reader.index}
        onReaderNext={reader.onNext}
        onReaderPrevious={reader.onPrevious}
        onCloseReader={reader.onClose}
        onOpenGrammarPart={grammar.onOpenPart}
        isSettingsOpen={settings.isOpen}
        onCloseSettings={settings.onClose}
        characterPreference={settings.characterPreference}
        onCharacterPreferenceChange={settings.setCharacterPreference}
        onResetProgress={settings.onResetProgress}
        isAuthOpen={overlays.isAuthOpen}
        onCloseAuth={overlays.closeAuth}
      />

      <PwaUpdatePrompt />
    </>
  );
}

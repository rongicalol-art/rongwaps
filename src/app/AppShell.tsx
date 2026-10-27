import { lazy, Suspense, useEffect, useState } from 'react';
import { LoadingScreen } from '../lib/widgets';
import { AppWorkspace } from './components/AppWorkspace';
import { AppOverlays } from './components/AppOverlays';
import { LegalUpdateNotice } from './components/LegalUpdateNotice';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import { ResumeLaunch } from '../features/practice';
import { useAppShell } from './hooks/useAppShell';
import { SignInWindow } from '../screens/auth';

/** Study together loads in its own chunk after first idle; nothing social is in the boot bundle. */
const SocialRoot = lazy(() => import('../features/social/SocialRoot'));

export default function AppShell() {
  useEffect(() => {
    const run = () => {
      void import('../services/performanceMetrics').then((m) => m.startVitalsMonitoring());
    };
    if (window.requestIdleCallback) {
      const id = window.requestIdleCallback(run);
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 200);
    return () => window.clearTimeout(id);
  }, []);

  const { isLoading, isSignedOut, nav, reader, grammar, activity, settings, overlays } = useAppShell();

  const ready = !isLoading && !isSignedOut;
  const [socialReady, setSocialReady] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const run = () => { setSocialReady(true); void import('./warmBreakdownData').then((m) => m.warmBreakdownData()); };
    if (window.requestIdleCallback) {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 1500);
    return () => window.clearTimeout(id);
  }, [ready]);

  if (isLoading) {
    return <LoadingScreen message="Loading Ron's Mandarin…" fullScreen tone="canvas" />;
  }

  // Accounts are required: signed out, the only thing on screen is the
  // (non-dismissable) sign-in window.
  if (isSignedOut) {
    return <SignInWindow />;
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
          onOpenGrammarPart: grammar.onOpenPart,
          onOpenReading: activity.onOpenReading,
        }}
        routes={{
          activeTab: nav.activeTab,
          activeBookId: nav.activeBookId,
          setActiveBookId: nav.setActiveBookId,
          startPartPractice: activity.onStartPartPractice,
          startPathPractice: activity.onStartPathPractice,
          setActiveTab: nav.handleTabChange,
          setActiveActivity: activity.onSetActiveActivity,
          onOpenGrammarPart: grammar.onOpenPart,
          onOpenReadingPart: activity.onOpenReadingPart,
          onToggleNav: nav.handleNavToggle,
        }}
      />

      <AppOverlays
        isGrammarOpen={grammar.isOpen}
        grammarPart={grammar.part ?? null}
        grammarLoadError={grammar.loadError}
        onRetryGrammar={grammar.onRetry}
        grammarPageId={grammar.pageId ?? undefined}
        onCloseGrammar={grammar.onClose}
        onProceedToReading={grammar.onProceedToReading}
        isReaderOpen={reader.isOpen}
        readerLoadError={reader.loadError}
        onRetryReader={reader.onRetry}
        readings={reader.readings}
        readingSessionIndices={reader.sessionIndices}
        onSelectReading={reader.onSelectReading}
        readingIndex={reader.index}
        onReaderNext={reader.onNext}
        onReaderPrevious={reader.onPrevious}
        onCloseReader={reader.onClose}
        onOpenGrammarPart={grammar.onOpenPart}
        isSettingsOpen={settings.isOpen}
        onCloseSettings={settings.onClose}
        onResetProgress={settings.onResetProgress}
      />

      {activity.resumeLaunch.pending && (
        <ResumeLaunch
          pending={activity.resumeLaunch.pending}
          onContinue={activity.resumeLaunch.onContinue}
          onStartOver={activity.resumeLaunch.onStartOver}
          onClose={activity.resumeLaunch.onClose}
        />
      )}

      {socialReady && (
        <Suspense fallback={null}>
          <SocialRoot setActiveActivity={activity.onSetActiveActivity} />
        </Suspense>
      )}

      <PwaUpdatePrompt />
      <LegalUpdateNotice />
    </>
  );
}

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppIcon, IconActionButton, LoadingScreen } from '../../lib/widgets';

// Dev-only debug tools. import.meta.env.DEV is statically false in production
// builds, so the dynamic import chunk is dropped from the bundle graph.
const DebugWindow = import.meta.env.DEV
  ? lazy(() => import('../../screens/debug').then((m) => ({ default: m.DebugWindow })))
  : null;

/** Ctrl+Shift+0 debug window; renders nothing in production builds. */
export function DebugToolsOverlay() {
  const [showDebugWindow, setShowDebugWindow] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (event.key === '0' && event.ctrlKey && event.shiftKey) {
        setShowDebugWindow((previous) => !previous);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AnimatePresence>
      {showDebugWindow && DebugWindow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="workspace-window absolute inset-0 z-[1000] bg-ui-surface flex flex-col overflow-auto overscroll-none"
        >
          <div className="sticky top-0 right-0 p-4 shrink-0 flex justify-end bg-ui-surface/90 backdrop-blur-sm shadow-sm z-10">
            <IconActionButton
              onClick={() => setShowDebugWindow(false)}
              label="Close debug tools"
              icon={<AppIcon name="close" size={24} />}
              className="h-12 w-12 rounded-full"
            />
          </div>
          <div className="relative isolate flex min-h-0 flex-1">
            <Suspense fallback={<LoadingScreen message="Loading debug tools..." />}>
              {DebugWindow && <DebugWindow />}
            </Suspense>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useEffect, useState } from 'react';

/**
 * True once a window showed its loader since it last closed. The screen that
 * replaces the loader sits on the same canvas, so it skips its enter animation
 * instead of fading in a second time.
 */
export function useReplacesLoader(isLoading: boolean, isRendered: boolean) {
  const [cameFromLoader, setCameFromLoader] = useState(false);
  useEffect(() => {
    if (!isRendered) setCameFromLoader(false);
    else if (isLoading) setCameFromLoader(true);
  }, [isLoading, isRendered]);
  return cameFromLoader;
}

import { lazy } from 'react';

/** Code-split entry for the signed-out app; the prerender imports `LandingPage` directly. */
export const LazyLandingPage = lazy(() => import('./LandingPage').then((m) => ({ default: m.LandingPage })));

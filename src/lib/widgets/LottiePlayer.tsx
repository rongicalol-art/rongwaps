import { debugLogger } from '../../utils/debug/debugLogger';
import React, { useState, useEffect } from 'react';
import type { ComponentType } from 'react';
import type { LottieComponentProps } from 'lottie-react';

// The lottie-react chunk and each animation's JSON are cached at module level so a
// remounted player renders its animation on the first frame. Until they are loaded the
// player is an empty box of its final size: no spinner, nothing to swap out.
let LottieComponent: ComponentType<LottieComponentProps> | null = null;
let lottieLoad: Promise<void> | null = null;
const animationCache = new Map<() => Promise<unknown>, unknown>();

/** Fetches the lottie-react chunk; safe to call early (idle after boot) and repeatedly. */
export function preloadLottie(): Promise<void> {
  lottieLoad ??= import('lottie-react').then((m) => { LottieComponent = m.default as ComponentType<LottieComponentProps>; });
  return lottieLoad;
}

/** Warms a `loadAnimationData` loader's JSON into the player cache. */
export function preloadAnimation(load: () => Promise<unknown>): Promise<void> {
  return load().then((data) => { animationCache.set(load, data); });
}

type LottieAnimationData = LottieComponentProps['animationData'];

export interface LottiePlayerProps extends Omit<LottieComponentProps, 'animationData'> {
  /**
   * Directly imported JSON data (e.g., `import animation from '../assets/anim.json'`)
   */
  animationData?: LottieAnimationData;
  /**
   * Or a URL to a Lottie JSON file to fetch from the web
   */
  src?: string;
  /**
   * Or a dynamic import of a local animation JSON, e.g.
   * `() => import('../assets/anim.json').then((m) => m.default)`. Use this for
   * large branded animations: the JSON stays out of the caller's chunk and
   * loads on demand under the built-in skeleton/error states instead of being
   * parsed with the screen. MUST be a module-level constant — an inline arrow
   * gets a new identity each render and reloads the animation.
   */
  loadAnimationData?: () => Promise<LottieAnimationData>;
  width?: number | string;
  height?: number | string;
}

export const LottiePlayer: React.FC<LottiePlayerProps> = ({ 
  animationData, 
  src, 
  loadAnimationData,
  width = '100%', 
  height = '100%',
  style,
  ...props 
}) => {
  const cached = loadAnimationData ? (animationCache.get(loadAnimationData) as LottieAnimationData | undefined) : undefined;
  const [data, setData] = useState<LottieAnimationData>(animationData ?? cached);
  const [loading, setLoading] = useState<boolean>(!animationData && !cached && (!!src || !!loadAnimationData));
  const [, setLottieReady] = useState(LottieComponent !== null);
  useEffect(() => { if (!LottieComponent) void preloadLottie().then(() => setLottieReady(true)); }, []);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    // If the data object itself updates, update state
    if (animationData) {
      setData(animationData);
      setError(false);
      setLoading(false);
      return;
    }

    // Otherwise load from the src URL or the provided dynamic import
    if (!src && !loadAnimationData) return;

    let isCurrent = true;
    setLoading(true);
    setError(false);

    void (async () => {
      try {
        let json: LottieAnimationData;
        if (src) {
          const res = await fetch(src);
          if (!res.ok) throw new Error(`Asset request failed (${res.status})`);
          json = (await res.json()) as LottieAnimationData;
        } else if (loadAnimationData) {
          json = await loadAnimationData();
        } else {
          return;
        }
        if (!isCurrent) return;
        if (loadAnimationData) animationCache.set(loadAnimationData, json);
        setData(json);
        setLoading(false);
      } catch (err) {
        if (!isCurrent) return;
        debugLogger.error('App', "Failed to load Lottie source:", err);
        setError(true);
        setLoading(false);
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [src, animationData, loadAnimationData]);

  if (loading || (!data && !error)) {
    return <div style={{ width, height, ...style }} />;
  }

  if (error || !data) {
    return (
      <div 
        style={{ width, height, ...style }} 
        className="flex items-center justify-center p-4 text-center"
      >
        <span className="text-ui-muted-strong font-bold text-sm">Failed to load animation</span>
      </div>
    );
  }

  return (
    <div style={{ width, height, ...style }} className="flex justify-center items-center">
      {LottieComponent && <LottieComponent animationData={data} {...props} style={{ width: '100%', height: '100%' }} />}
    </div>
  );
};

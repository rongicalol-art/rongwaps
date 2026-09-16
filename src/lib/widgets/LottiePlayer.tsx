import React, { lazy, Suspense, useState, useEffect } from 'react';
import type { LottieComponentProps } from 'lottie-react';

const Lottie = lazy(() => import('lottie-react'));

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
  const [data, setData] = useState<LottieAnimationData>(animationData);
  const [loading, setLoading] = useState<boolean>(!animationData && (!!src || !!loadAnimationData));
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
        setData(json);
        setLoading(false);
      } catch (err) {
        if (!isCurrent) return;
        console.error("Failed to load Lottie source:", err);
        setError(true);
        setLoading(false);
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [src, animationData, loadAnimationData]);

  if (loading) {
    return (
      <div 
        style={{ width, height, ...style }} 
        className="animate-pulse bg-ui-border rounded-feature flex items-center justify-center"
      />
    );
  }

  if (error || !data) {
    return (
      <div 
        style={{ width, height, ...style }} 
        className="bg-ui-canvas border-2 border-ui-border rounded-feature flex items-center justify-center p-4 text-center"
      >
        <span className="text-ui-muted font-bold text-sm">Failed to load animation</span>
      </div>
    );
  }

  return (
    <div style={{ width, height, ...style }} className="flex justify-center items-center">
      <Suspense fallback={<div className="h-full w-full animate-pulse rounded-feature bg-ui-border" />}>
        <Lottie animationData={data} {...props} style={{ width: '100%', height: '100%' }} />
      </Suspense>
    </div>
  );
};

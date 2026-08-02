import React, { lazy, Suspense, useState, useEffect } from 'react';
import type { LottieComponentProps } from 'lottie-react';
import { loadJsonAsset } from '../../services/contentAssetService';

const Lottie = lazy(() => import('lottie-react'));

export interface LottiePlayerProps extends Omit<LottieComponentProps, 'animationData'> {
  /**
   * Directly imported JSON data (e.g., `import animation from '../assets/anim.json'`)
   */
  animationData?: LottieComponentProps['animationData'];
  /**
   * Or a URL to a Lottie JSON file to fetch from the web
   */
  src?: string;
  width?: number | string;
  height?: number | string;
}

export const LottiePlayer: React.FC<LottiePlayerProps> = ({ 
  animationData, 
  src, 
  width = '100%', 
  height = '100%',
  style,
  ...props 
}) => {
  const [data, setData] = useState<LottieComponentProps['animationData']>(animationData);
  const [loading, setLoading] = useState<boolean>(!animationData && !!src);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    // If the data object itself updates, update state
    if (animationData) {
      setData(animationData);
      setLoading(false);
      return;
    }

    // Otherwise, fetch from src URL
    if (src && !animationData) {
      let isCurrent = true;
      setLoading(true);
      setError(false);
      loadJsonAsset<LottieComponentProps['animationData']>(src)
        .then(json => {
          if (!isCurrent) return;
          setData(json);
          setLoading(false);
        })
        .catch(err => {
          if (!isCurrent) return;
          console.error("Failed to load Lottie source:", err);
          setError(true);
          setLoading(false);
        });

      return () => {
        isCurrent = false;
      };
    }
  }, [src, animationData]);

  if (loading) {
    return (
      <div 
        style={{ width, height, ...style }} 
        className="animate-pulse bg-ui-border rounded-[24px] flex items-center justify-center"
      />
    );
  }

  if (error || !data) {
    return (
      <div 
        style={{ width, height, ...style }} 
        className="bg-ui-canvas border-2 border-ui-border rounded-[24px] flex items-center justify-center p-4 text-center"
      >
        <span className="text-ui-muted font-bold text-sm">Failed to load animation</span>
      </div>
    );
  }

  return (
    <div style={{ width, height, ...style }} className="flex justify-center items-center">
      <Suspense fallback={<div className="h-full w-full animate-pulse rounded-[24px] bg-ui-border" />}>
        <Lottie animationData={data} {...props} style={{ width: '100%', height: '100%' }} />
      </Suspense>
    </div>
  );
};

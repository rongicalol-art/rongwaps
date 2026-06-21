import React, { useState, useEffect } from 'react';
import Lottie, { LottieComponentProps } from 'lottie-react';

export interface LottiePlayerProps extends Omit<LottieComponentProps, 'animationData'> {
  /**
   * Directly imported JSON data (e.g., `import animation from '../assets/anim.json'`)
   */
  animationData?: any;
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
  const [data, setData] = useState<any>(animationData);
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
      setLoading(true);
      setError(false);
      fetch(src)
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then(json => {
          setData(json);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load Lottie source:", err);
          setError(true);
          setLoading(false);
        });
    }
  }, [src, animationData]);

  if (loading) {
    return (
      <div 
        style={{ width, height, ...style }} 
        className="animate-pulse bg-[#E5E5E5] rounded-[24px] flex items-center justify-center"
      />
    );
  }

  if (error || !data) {
    return (
      <div 
        style={{ width, height, ...style }} 
        className="bg-[#F7F7F7] border-[3px] border-[#E5E5E5] rounded-[24px] flex items-center justify-center p-4 text-center"
      >
        <span className="text-[#AFB6BB] font-bold text-sm">Failed to load animation</span>
      </div>
    );
  }

  return (
    <div style={{ width, height, ...style }} className="flex justify-center items-center">
      <Lottie animationData={data} {...props} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

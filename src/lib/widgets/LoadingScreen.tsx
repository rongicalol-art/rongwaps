import React from 'react';
import { LottiePlayer } from './LottiePlayer';
import sandyLoadingData from '../../assets/animations/sandy-loading.json';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="absolute inset-0 w-full h-full bg-ui-canvas flex flex-col justify-center items-center overflow-hidden z-[100]">
      <LottiePlayer 
        animationData={sandyLoadingData} 
        width={200} 
        height={200} 
        loop={true} 
      />
      <p className="mt-2 text-ui-muted font-bold tracking-widest text-sm uppercase animate-pulse">
        {message}
      </p>
    </div>
  );
};

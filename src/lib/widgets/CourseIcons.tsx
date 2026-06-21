import React, { memo } from 'react';
import { LottiePlayer } from './LottiePlayer';
import sleepingAnimation from '../../assets/animations/Sleeping.json';
import rainbowAnimation from '../../assets/animations/rainbow_twist.json';
import runningAnimation from '../../assets/animations/Cute Boy Running.json';
import sandyLoadingAnimation from '../../assets/animations/sandy-loading.json';
import book2Animation from '../../assets/animations/book 2logo.json';
import book3Animation from '../../assets/animations/book 3 logo.json';

import gymAnimation from '../../assets/animations/Lifestyle of when weighing gym.json';

export const CourseIcon = memo(({ id, className = '' }: { id: number; className?: string }) => {
  switch (id) {
    case 1:
      // Book 1 - Sleeping Lottie
      return (
        <div className={className}>
          <LottiePlayer animationData={sleepingAnimation} loop={true} />
        </div>
      );
    case 2:
      // Book 2
      return (
        <div className={`${className} flex items-center justify-center`}>
          <div className="w-[95%] h-[95%] transform -translate-y-2 scale-100">
            <LottiePlayer animationData={book2Animation} loop={true} />
          </div>
        </div>
      );
    case 3:
      // Book 3
      return (
        <div className={`${className} flex items-center justify-center`}>
          <div className="w-[70%] h-[70%]">
            <LottiePlayer animationData={book3Animation} loop={true} />
          </div>
        </div>
      );
    case 4:
      // Book 4 - Sandy Loading Lottie
      return (
        <div className={`${className} flex items-center justify-center`}>
          <div className="w-[85%] h-[85%]">
            <LottiePlayer animationData={sandyLoadingAnimation} loop={true} />
          </div>
        </div>
      );
    default:
      return null;
  }
});

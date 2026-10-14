import React, { memo, useCallback, useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import type { LottieRefCurrentProps } from 'lottie-react';
import { LottiePlayer } from '../../../lib/widgets';

// Branded book animations load on demand: the JSON files are 87–176 KB each
// and used to be inlined into the curriculum chunk, where they were ~90% of
// its weight. Module-level loaders keep a stable identity for LottiePlayer.
const loadSleepingAnimation = () =>
  import('../../../assets/animations/Sleeping.json').then((m) => m.default);
const loadSandyLoadingAnimation = () =>
  import('../../../assets/animations/sandy-loading.json').then((m) => m.default);
const loadBook2Animation = () =>
  import('../../../assets/animations/book 2logo.json').then((m) => m.default);
const loadBook3Animation = () =>
  import('../../../assets/animations/book 3 logo.json').then((m) => m.default);

export const CourseIcon = memo(({ id, className = '', active = true }: { id: number; className?: string; active?: boolean }) => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const reduceMotion = useReducedMotion();
  const finishWithoutMotion = useCallback(() => {
    if (!reduceMotion) return;
    const totalFrames = lottieRef.current?.animationItem?.totalFrames;
    if (totalFrames && totalFrames > 0) lottieRef.current?.goToAndStop(totalFrames - 1, true);
  }, [reduceMotion]);
  useEffect(finishWithoutMotion, [finishWithoutMotion]);

  switch (id) {
    case 1:
      // Book 1 - Sleeping Lottie
      return (
        <div className={className}>
          <LottiePlayer
            key={String(active)}
            loadAnimationData={loadSleepingAnimation}
            loop={false}
            autoplay={active}
            replayOnVisible={active}
            lottieRef={lottieRef}
            onDOMLoaded={finishWithoutMotion}
          />
        </div>
      );
    case 2:
      // Book 2
      return (
        <div className={`${className} flex items-center justify-center`}>
          <div className="w-[95%] h-[95%] transform -translate-y-2 scale-100">
            <LottiePlayer
              key={String(active)}
              loadAnimationData={loadBook2Animation}
              loop={false}
              autoplay={active}
              replayOnVisible={active}
              lottieRef={lottieRef}
              onDOMLoaded={finishWithoutMotion}
            />
          </div>
        </div>
      );
    case 3:
      // Book 3
      return (
        <div className={`${className} flex items-center justify-center`}>
          <div className="w-[70%] h-[70%]">
            <LottiePlayer
              key={String(active)}
              loadAnimationData={loadBook3Animation}
              loop={false}
              autoplay={active}
              replayOnVisible={active}
              lottieRef={lottieRef}
              onDOMLoaded={finishWithoutMotion}
            />
          </div>
        </div>
      );
    case 4:
      // Book 4 - Sandy Loading Lottie
      return (
        <div className={`${className} flex items-center justify-center`}>
          <div className="w-[85%] h-[85%]">
            <LottiePlayer
              key={String(active)}
              loadAnimationData={loadSandyLoadingAnimation}
              loop={false}
              autoplay={active}
              replayOnVisible={active}
              lottieRef={lottieRef}
              onDOMLoaded={finishWithoutMotion}
            />
          </div>
        </div>
      );
    default:
      return null;
  }
});

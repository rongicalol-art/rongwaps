import { LottiePlayer } from './LottiePlayer';

const loadRocket = () => import('../../assets/animations/rocket.json').then((m) => m.default);

/**
 * The flying rocket (LottieFiles emoji): the lesson test's "go". `loop` keeps it flying (the part curtain);
 * otherwise it flies one pass and rests, so nothing keeps running on a screen that waits for a tap.
 */
export function RocketLottie({ loop = false, className }: { loop?: boolean; className?: string }) {
  return (
    <div aria-hidden className={className}>
      <LottiePlayer loadAnimationData={loadRocket} loop={loop} autoplay />
    </div>
  );
}

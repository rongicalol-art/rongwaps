import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { LottieRefCurrentProps } from 'lottie-react';
import { ActionButton, AppIcon, LottiePlayer, type AppIconName } from '../../../lib/widgets';

// Module-level so the player keeps one stable loader identity.
const loadBird = () => import('../../../assets/animations/deck-complete-bird.json').then((m) => m.default);
const BIRD_LAST_FRAME = 203;
const SPRING = [0.34, 1.56, 0.64, 1] as const;
const RISE = [0.2, 0.8, 0.2, 1] as const;

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

interface DeckCompleteProps {
  wordCount: number;
  firstTryPct: number;
  seconds: number;
  isPerfect: boolean;
  onContinue: () => void;
  /** Button label; "Test me" when a quiz follows. */
  actionLabel?: string;
}

interface StatTileProps {
  label: string;
  icon: AppIconName;
  value: number;
  format: (value: number) => string;
  frameClass: string;
  inkClass: string;
  index: number;
  reduceMotion: boolean;
}

/** Coloured frame, white label band, white body with a count-up value. */
function StatTile({ label, icon, value, format, frameClass, inkClass, index, reduceMotion }: StatTileProps) {
  const [shown, setShown] = useState(reduceMotion ? value : 0);
  const [popped, setPopped] = useState(false);

  useEffect(() => {
    if (reduceMotion) return undefined;
    let frame = 0;
    const timer = window.setTimeout(() => {
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / 700);
        setShown(Math.round(value * (1 - (1 - p) ** 3)));
        if (p < 1) frame = requestAnimationFrame(step);
        else setPopped(true);
      };
      frame = requestAnimationFrame(step);
    }, 1150 + index * 140);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [index, reduceMotion, value]);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 22, scale: 0.86 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.9 + index * 0.14, ease: SPRING }}
      className={`rounded-sm border-b-4 p-0.5 ${frameClass}`}
    >
      <span className="block py-1 text-center text-[11px] font-black uppercase tracking-[0.09em] text-white">{label}</span>
      <span className={`flex h-14 items-center justify-center gap-1.5 rounded-[10px] bg-white md:h-16 ${inkClass}`}>
        <AppIcon name={icon} size={22} className="shrink-0" />
        <motion.b
          animate={popped ? { scale: [1, 1.22, 1] } : undefined}
          transition={{ duration: 0.35, ease: SPRING }}
          className="text-[23px] font-black tabular-nums md:text-[26px]"
        >
          {format(shown)}
        </motion.b>
      </span>
    </motion.div>
  );
}

/** End of a flashcard deck: bird, headline, three stats, one Continue. */
export function DeckComplete({ wordCount, firstTryPct, seconds, isPerfect, onContinue, actionLabel = 'Continue' }: DeckCompleteProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const birdRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat) return;
      event.preventDefault();
      onContinue();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue]);

  const rise = (delay: number, duration = 0.5) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration, delay, ease: RISE },
  });

  return (
    <div className="absolute inset-0 flex flex-col items-center overflow-y-auto overscroll-contain px-4 pb-sheet-safe md:pb-14">
      {/* The bird scales with the viewport height so short desktop windows keep Continue in view. */}
      <div
        className="relative mt-[clamp(72px,12dvh,112px)] h-[var(--bb)] w-full shrink-0"
        style={{ '--bb': 'clamp(200px,34dvh,330px)' } as CSSProperties}
      >
        <div className="absolute bottom-3.5 left-1/2 h-[calc(var(--bb)*1.3)] w-[calc(var(--bb)*1.27)] -translate-x-1/2">
          <LottiePlayer
            loadAnimationData={loadBird}
            loop={false}
            autoplay={!reduceMotion}
            lottieRef={birdRef}
            onDOMLoaded={() => {
              if (reduceMotion) birdRef.current?.goToAndStop(BIRD_LAST_FRAME, true);
            }}
          />
        </div>
      </div>

      <motion.h1
        {...rise(0.55)}
        className={`text-center text-[30px] font-black md:text-[38px] ${isPerfect ? 'text-feedback-success-edge' : 'text-ui-ink-strong'}`}
      >
        {isPerfect ? 'Perfect deck!' : 'Deck complete!'}
      </motion.h1>

      <div className="mt-[22px] grid w-full max-w-[400px] grid-cols-3 gap-2.5 md:mt-7 md:max-w-[460px] md:gap-3.5">
        <StatTile
          label="Words" icon="cards" value={wordCount} format={String} index={0} reduceMotion={reduceMotion}
          frameClass="bg-brand-primary border-brand-primary-edge" inkClass="text-brand-primary-edge"
        />
        <StatTile
          label="First try" icon="target" value={firstTryPct} format={(v) => `${v}%`} index={1} reduceMotion={reduceMotion}
          frameClass="bg-feedback-success border-feedback-success-edge" inkClass="text-feedback-success-edge"
        />
        <StatTile
          label="Time" icon="clock" value={seconds} format={formatTime} index={2} reduceMotion={reduceMotion}
          frameClass="bg-palette-purple border-palette-purple-edge" inkClass="text-palette-purple-edge"
        />
      </div>

      <div className="min-h-6 flex-1 md:flex-none md:basis-14" />
      <motion.div {...rise(1.6)} className="w-full max-w-md md:max-w-[340px]">
        <ActionButton size="lg" fullWidth onClick={onContinue}>
          <span className="text-[17px] font-black">{actionLabel}</span>
        </ActionButton>
      </motion.div>
    </div>
  );
}

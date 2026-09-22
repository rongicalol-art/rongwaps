import { motion } from 'motion/react';

export interface ScoreGaugeProps {
  displayPct: number;
  animatedPct: number;
  isCardSession: boolean;
  isFlawless: boolean;
  isQuiz: boolean;
  learnedCount?: number;
  unlearnedCount?: number;
  learnedRatio: number;
  unlearnedRatio: number;
  quizAccuracyRatio: number;
  reduceMotion: boolean | null;
}

export function ScoreGauge({
  displayPct,
  animatedPct,
  isCardSession,
  isFlawless,
  isQuiz,
  learnedCount,
  unlearnedCount,
  learnedRatio,
  unlearnedRatio,
  quizAccuracyRatio,
  reduceMotion,
}: ScoreGaugeProps) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const totalCards = isCardSession ? (learnedCount ?? 0) + (unlearnedCount ?? 0) : 0;
  const hasBothCardSegments =
    totalCards > 1 && (learnedCount ?? 0) > 0 && (unlearnedCount ?? 0) > 0;
  const segmentGap = hasBothCardSegments ? 5 : 0;

  const learnedStrokeLength = Math.max(0, learnedRatio * circumference - segmentGap);
  const unlearnedStrokeLength = Math.max(0, unlearnedRatio * circumference - segmentGap);
  const quizStrokeLength = quizAccuracyRatio * circumference;

  return (
    <div className="relative my-5 flex items-center justify-center">
      <svg
        width="148"
        height="148"
        viewBox="0 0 148 148"
        className="overflow-visible"
        aria-label={`Score: ${displayPct}%`}
        role="img"
      >
        {/* Soft inner canvas disc */}
        <circle cx="74" cy="74" r={radius - 6} className="fill-ui-canvas/50" />

        {/* Background track circle */}
        <circle
          cx="74"
          cy="74"
          r={radius}
          fill="none"
          strokeWidth="11"
          className="stroke-ui-border/40"
        />

        {/* Card session: Learned arc */}
        {isCardSession && (learnedCount ?? 0) > 0 && (
          <motion.circle
            cx="74"
            cy="74"
            r={radius}
            fill="none"
            strokeWidth="11"
            strokeLinecap="round"
            className={isFlawless ? 'stroke-feedback-success' : 'stroke-brand-primary'}
            strokeDasharray={`${learnedStrokeLength} ${circumference}`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.85, delay: 0.1, ease: [0.16, 1, 0.3, 1] }
            }
            transform="rotate(-90 74 74)"
          />
        )}

        {/* Card session: Mistakes/Unlearned arc */}
        {isCardSession && (unlearnedCount ?? 0) > 0 && (
          <motion.circle
            cx="74"
            cy="74"
            r={radius}
            fill="none"
            strokeWidth="11"
            strokeLinecap="round"
            className="stroke-brand-secondary"
            strokeDasharray={`${unlearnedStrokeLength} ${circumference}`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.85, delay: 0.2, ease: [0.16, 1, 0.3, 1] }
            }
            transform={`rotate(${-90 + learnedRatio * 360} 74 74)`}
          />
        )}

        {/* Quiz session: Accuracy arc */}
        {isQuiz && (
          <motion.circle
            cx="74"
            cy="74"
            r={radius}
            fill="none"
            strokeWidth="11"
            strokeLinecap="round"
            className={isFlawless ? 'stroke-feedback-success' : 'stroke-brand-primary'}
            strokeDasharray={`${quizStrokeLength} ${circumference}`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.85, delay: 0.1, ease: [0.16, 1, 0.3, 1] }
            }
            transform="rotate(-90 74 74)"
          />
        )}
      </svg>

      {/* Inside the pie: animated percentage + small label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
        <span className="text-3xl sm:text-4xl font-black tracking-tight text-ui-ink-strong leading-none">
          {animatedPct}%
        </span>
        <span className="mt-1 text-[10px] font-black uppercase tracking-wider text-ui-muted-strong">
          {isCardSession ? 'Mastery' : 'Accuracy'}
        </span>
      </div>
    </div>
  );
}

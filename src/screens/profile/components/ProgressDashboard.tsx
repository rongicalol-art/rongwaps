import { AppIcon } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';

interface ProgressDashboardProps {
  compact?: boolean;
}

export function ProgressDashboard({ compact = false }: ProgressDashboardProps) {
  const {
    currentStreak,
    totalXp,
    sessionProgress,
    learnedCards,
    srsData,
  } = useAppStore();

  const cardsToReview = Object.values(srsData).filter(
    (card) => card.nextReviewDate <= Date.now()
  ).length;

  const todayXp = sessionProgress.xpEarned;
  const todayCards = sessionProgress.cardsReviewed;

  if (compact) {
    return (
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <AppIcon name="flame" className="text-brand-secondary" size={18} />
          <span className="text-[13px] font-extrabold text-ui-ink">{currentStreak}</span>
        </div>
        <div className="w-[2px] h-4 bg-ui-divider rounded-full" />
        <div className="flex items-center gap-1.5">
          <AppIcon name="actions" className="text-feedback-warning" size={18} />
          <span className="text-[13px] font-extrabold text-ui-ink">{totalXp + todayXp}</span>
        </div>
        {cardsToReview > 0 && (
          <>
            <div className="w-[2px] h-4 bg-ui-divider rounded-full" />
            <div className="flex items-center gap-1.5">
              <AppIcon name="target" className="text-brand-primary" size={18} />
              <span className="text-[13px] font-extrabold text-brand-primary">{cardsToReview}</span>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Today's Session Summary */}
      {(todayXp > 0 || todayCards > 0) && (
        <div className="mb-4 bg-feedback-success-surface border-b-[length:var(--depth-md)] border-feedback-success-edge rounded-feature p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[13px] font-extrabold uppercase tracking-widest text-feedback-success-edge">Today's Session</h4>
            <AppIcon name="check" className="text-feedback-success" size={20} />
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <AppIcon name="actions" className="text-feedback-warning" size={20} />
              <span className="text-lg font-extrabold text-ui-ink">+{todayXp} XP</span>
            </div>
            <div className="flex items-center gap-2">
              <AppIcon name="book" className="text-brand-primary" size={20} />
              <span className="text-lg font-extrabold text-ui-ink">{todayCards} cards</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {/* Streak */}
        <div className="bg-ui-surface border-b-[length:var(--depth-md)] border-ui-divider rounded-feature p-4 flex items-start gap-3 hover:bg-ui-hover transition-[background-color,border-color] cursor-default">
          <div className="w-10 h-10 shrink-0 rounded-full bg-brand-secondary/10 flex items-center justify-center mt-1">
            <AppIcon name="flame" className="text-brand-secondary" size={24} />
          </div>
          <div className="text-left flex flex-col justify-center min-w-0">
            <h3 className="text-xl md:text-2xl font-extrabold text-ui-ink truncate">{currentStreak}</h3>
            <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-ui-muted truncate mt-0.5">Day Streak</p>
          </div>
        </div>

        {/* Total XP */}
        <div className="bg-ui-surface border-b-[length:var(--depth-md)] border-ui-divider rounded-feature p-4 flex items-start gap-3 hover:bg-ui-hover transition-[background-color,border-color] cursor-default">
          <div className="w-10 h-10 shrink-0 rounded-full bg-feedback-warning/10 flex items-center justify-center mt-1">
            <AppIcon name="actions" className="text-feedback-warning" size={24} />
          </div>
          <div className="text-left flex flex-col justify-center min-w-0">
            <h3 className="text-xl md:text-2xl font-extrabold text-ui-ink truncate">{totalXp + todayXp}</h3>
            <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-ui-muted truncate mt-0.5">Total XP</p>
          </div>
        </div>

        {/* Words Learned */}
        <div className="bg-ui-surface border-b-[length:var(--depth-md)] border-ui-divider rounded-feature p-4 flex items-start gap-3 hover:bg-ui-hover transition-[background-color,border-color] cursor-default">
          <div className="w-10 h-10 shrink-0 rounded-full bg-brand-primary/10 flex items-center justify-center mt-1">
            <AppIcon name="book" className="text-brand-primary" size={24} />
          </div>
          <div className="text-left flex flex-col justify-center min-w-0">
            <h3 className="text-xl md:text-2xl font-extrabold text-ui-ink truncate">{learnedCards.length}</h3>
            <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-ui-muted truncate mt-0.5">Words Learned</p>
          </div>
        </div>

        {/* Total Reviews */}
        <div className="bg-ui-surface border-b-[length:var(--depth-md)] border-ui-divider rounded-feature p-4 flex items-start gap-3 hover:bg-ui-hover transition-[background-color,border-color] cursor-default">
          <div className="w-10 h-10 shrink-0 rounded-full bg-feedback-success/10 flex items-center justify-center mt-1">
            <AppIcon name="check" className="text-feedback-success" size={24} />
          </div>
          <div className="text-left flex flex-col justify-center min-w-0">
            <h3 className="text-xl md:text-2xl font-extrabold text-ui-ink truncate">{Object.keys(srsData).length}</h3>
            <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-ui-muted truncate mt-0.5">Total Reviews</p>
          </div>
        </div>
      </div>

      {/* Cards Due Banner */}
      {cardsToReview > 0 && (
        <div className="mt-4 bg-brand-primary-soft border-b-[length:var(--depth-md)] border-brand-primary-soft-edge rounded-feature p-4 flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-full bg-brand-primary/10 flex items-center justify-center">
            <AppIcon name="analytics" className="text-brand-primary" size={22} />
          </div>
          <div className="flex-1">
            <p className="text-brand-primary-edge font-bold text-[15px]">
              {cardsToReview} card{cardsToReview === 1 ? '' : 's'} due for review
            </p>
            <p className="text-brand-primary/70 text-[13px] font-bold mt-0.5">
              Keep your streak going!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

import { PiFireFill, PiLightningFill, PiBookOpenFill, PiCheckCircleFill, PiChartBarFill, PiTargetFill } from 'react-icons/pi';
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
          <PiFireFill className="text-brand-secondary" size={18} />
          <span className="text-[13px] font-extrabold text-ui-ink">{currentStreak}</span>
        </div>
        <div className="w-[2px] h-4 bg-[#E5E5E5] rounded-full" />
        <div className="flex items-center gap-1.5">
          <PiLightningFill className="text-feedback-warning" size={18} />
          <span className="text-[13px] font-extrabold text-ui-ink">{totalXp + todayXp}</span>
        </div>
        {cardsToReview > 0 && (
          <>
            <div className="w-[2px] h-4 bg-[#E5E5E5] rounded-full" />
            <div className="flex items-center gap-1.5">
              <PiTargetFill className="text-brand-primary" size={18} />
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
        <div className="mb-4 bg-[#D7FFB8] border-2 border-b-2 border-[#A5ED5B] rounded-[24px] p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[13px] font-extrabold uppercase tracking-widest text-[#58A700]">Today's Session</h4>
            <PiCheckCircleFill className="text-feedback-success" size={20} />
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <PiLightningFill className="text-feedback-warning" size={20} />
              <span className="text-lg font-extrabold text-ui-ink">+{todayXp} XP</span>
            </div>
            <div className="flex items-center gap-2">
              <PiBookOpenFill className="text-brand-primary" size={20} />
              <span className="text-lg font-extrabold text-ui-ink">{todayCards} cards</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {/* Streak */}
        <div className="bg-white border-2 border-b-2 border-[#E5E5E5] rounded-[24px] p-4 flex items-start gap-3 hover:bg-[#F7F7F7] transition-all cursor-default">
          <div className="w-10 h-10 shrink-0 rounded-full bg-brand-secondary/10 flex items-center justify-center mt-1">
            <PiFireFill className="text-brand-secondary" size={24} />
          </div>
          <div className="text-left flex flex-col justify-center min-w-0">
            <h3 className="text-xl md:text-2xl font-extrabold text-ui-ink truncate">{currentStreak}</h3>
            <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-[#AFB6BB] truncate mt-0.5">Day Streak</p>
          </div>
        </div>

        {/* Total XP */}
        <div className="bg-white border-2 border-b-2 border-[#E5E5E5] rounded-[24px] p-4 flex items-start gap-3 hover:bg-[#F7F7F7] transition-all cursor-default">
          <div className="w-10 h-10 shrink-0 rounded-full bg-feedback-warning/10 flex items-center justify-center mt-1">
            <PiLightningFill className="text-feedback-warning" size={24} />
          </div>
          <div className="text-left flex flex-col justify-center min-w-0">
            <h3 className="text-xl md:text-2xl font-extrabold text-ui-ink truncate">{totalXp + todayXp}</h3>
            <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-[#AFB6BB] truncate mt-0.5">Total XP</p>
          </div>
        </div>

        {/* Words Learned */}
        <div className="bg-white border-2 border-b-2 border-[#E5E5E5] rounded-[24px] p-4 flex items-start gap-3 hover:bg-[#F7F7F7] transition-all cursor-default">
          <div className="w-10 h-10 shrink-0 rounded-full bg-brand-primary/10 flex items-center justify-center mt-1">
            <PiBookOpenFill className="text-brand-primary" size={24} />
          </div>
          <div className="text-left flex flex-col justify-center min-w-0">
            <h3 className="text-xl md:text-2xl font-extrabold text-ui-ink truncate">{learnedCards.length}</h3>
            <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-[#AFB6BB] truncate mt-0.5">Words Learned</p>
          </div>
        </div>

        {/* Total Reviews */}
        <div className="bg-white border-2 border-b-2 border-[#E5E5E5] rounded-[24px] p-4 flex items-start gap-3 hover:bg-[#F7F7F7] transition-all cursor-default">
          <div className="w-10 h-10 shrink-0 rounded-full bg-feedback-success/10 flex items-center justify-center mt-1">
            <PiCheckCircleFill className="text-feedback-success" size={24} />
          </div>
          <div className="text-left flex flex-col justify-center min-w-0">
            <h3 className="text-xl md:text-2xl font-extrabold text-ui-ink truncate">{Object.keys(srsData).length}</h3>
            <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-[#AFB6BB] truncate mt-0.5">Total Reviews</p>
          </div>
        </div>
      </div>

      {/* Cards Due Banner */}
      {cardsToReview > 0 && (
        <div className="mt-4 bg-brand-primary-soft border-2 border-b-2 border-brand-primary-soft-edge rounded-[24px] p-4 flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-full bg-brand-primary/10 flex items-center justify-center">
            <PiChartBarFill className="text-brand-primary" size={22} />
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

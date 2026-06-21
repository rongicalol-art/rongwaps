import { PiFireFill, PiLightningFill, PiBookOpenFill, PiCheckCircleFill, PiChartBarFill, PiTargetFill } from 'react-icons/pi';
import { useAppStore } from '../../store/useAppStore';

interface ProgressDashboardProps {
  compact?: boolean;
}

export function ProgressDashboard({ compact = false }: ProgressDashboardProps) {
  const {
    currentStreak,
    totalXp,
    totalCardsLearned,
    totalCardsReviewed,
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
          <PiFireFill className="text-[#FF9600]" size={18} />
          <span className="text-[13px] font-extrabold text-[#4B4B4B]">{currentStreak}</span>
        </div>
        <div className="w-[2px] h-4 bg-[#E5E5E5] rounded-full" />
        <div className="flex items-center gap-1.5">
          <PiLightningFill className="text-[#FFC800]" size={18} />
          <span className="text-[13px] font-extrabold text-[#4B4B4B]">{totalXp + todayXp}</span>
        </div>
        {cardsToReview > 0 && (
          <>
            <div className="w-[2px] h-4 bg-[#E5E5E5] rounded-full" />
            <div className="flex items-center gap-1.5">
              <PiTargetFill className="text-[#1CB0F6]" size={18} />
              <span className="text-[13px] font-extrabold text-[#1CB0F6]">{cardsToReview}</span>
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
        <div className="mb-4 bg-[#D7FFB8] border-[3px] border-b-[4px] border-[#A5ED5B] rounded-[24px] p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[13px] font-extrabold uppercase tracking-widest text-[#58A700]">Today's Session</h4>
            <PiCheckCircleFill className="text-[#58CC02]" size={20} />
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <PiLightningFill className="text-[#FFC800]" size={20} />
              <span className="text-lg font-extrabold text-[#4B4B4B]">+{todayXp} XP</span>
            </div>
            <div className="flex items-center gap-2">
              <PiBookOpenFill className="text-[#1CB0F6]" size={20} />
              <span className="text-lg font-extrabold text-[#4B4B4B]">{todayCards} cards</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {/* Streak */}
        <div className="bg-white border-[3px] border-b-[4px] border-[#E5E5E5] rounded-[24px] p-4 flex items-start gap-3 hover:bg-[#F7F7F7] transition-all cursor-default">
          <div className="w-10 h-10 shrink-0 rounded-full bg-[#FF9600]/10 flex items-center justify-center mt-1">
            <PiFireFill className="text-[#FF9600]" size={24} />
          </div>
          <div className="text-left flex flex-col justify-center min-w-0">
            <h3 className="text-xl md:text-2xl font-extrabold text-[#4B4B4B] truncate">{currentStreak}</h3>
            <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-[#AFB6BB] truncate mt-0.5">Day Streak</p>
          </div>
        </div>

        {/* Total XP */}
        <div className="bg-white border-[3px] border-b-[4px] border-[#E5E5E5] rounded-[24px] p-4 flex items-start gap-3 hover:bg-[#F7F7F7] transition-all cursor-default">
          <div className="w-10 h-10 shrink-0 rounded-full bg-[#FFC800]/10 flex items-center justify-center mt-1">
            <PiLightningFill className="text-[#FFC800]" size={24} />
          </div>
          <div className="text-left flex flex-col justify-center min-w-0">
            <h3 className="text-xl md:text-2xl font-extrabold text-[#4B4B4B] truncate">{totalXp + todayXp}</h3>
            <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-[#AFB6BB] truncate mt-0.5">Total XP</p>
          </div>
        </div>

        {/* Words Learned */}
        <div className="bg-white border-[3px] border-b-[4px] border-[#E5E5E5] rounded-[24px] p-4 flex items-start gap-3 hover:bg-[#F7F7F7] transition-all cursor-default">
          <div className="w-10 h-10 shrink-0 rounded-full bg-[#1CB0F6]/10 flex items-center justify-center mt-1">
            <PiBookOpenFill className="text-[#1CB0F6]" size={24} />
          </div>
          <div className="text-left flex flex-col justify-center min-w-0">
            <h3 className="text-xl md:text-2xl font-extrabold text-[#4B4B4B] truncate">{learnedCards.length}</h3>
            <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-[#AFB6BB] truncate mt-0.5">Words Learned</p>
          </div>
        </div>

        {/* Total Reviews */}
        <div className="bg-white border-[3px] border-b-[4px] border-[#E5E5E5] rounded-[24px] p-4 flex items-start gap-3 hover:bg-[#F7F7F7] transition-all cursor-default">
          <div className="w-10 h-10 shrink-0 rounded-full bg-[#58CC02]/10 flex items-center justify-center mt-1">
            <PiCheckCircleFill className="text-[#58CC02]" size={24} />
          </div>
          <div className="text-left flex flex-col justify-center min-w-0">
            <h3 className="text-xl md:text-2xl font-extrabold text-[#4B4B4B] truncate">{Object.keys(srsData).length}</h3>
            <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-[#AFB6BB] truncate mt-0.5">Total Reviews</p>
          </div>
        </div>
      </div>

      {/* Cards Due Banner */}
      {cardsToReview > 0 && (
        <div className="mt-4 bg-[#E5F5FF] border-[3px] border-b-[4px] border-[#BBE3FF] rounded-[24px] p-4 flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-full bg-[#1CB0F6]/10 flex items-center justify-center">
            <PiChartBarFill className="text-[#1CB0F6]" size={22} />
          </div>
          <div className="flex-1">
            <p className="text-[#1899D6] font-bold text-[15px]">
              {cardsToReview} card{cardsToReview === 1 ? '' : 's'} due for review
            </p>
            <p className="text-[#1CB0F6]/70 text-[13px] font-bold mt-0.5">
              Keep your streak going!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

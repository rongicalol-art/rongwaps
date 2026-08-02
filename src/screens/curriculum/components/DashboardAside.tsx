import {
  AppIcon,
  CircularProgress,
  CustomProgressBar,
  GraphPaperPanel,
  Soft3DButton,
  type AppIconName,
} from '../../../lib/widgets';

interface DashboardAsideProps {
  todayXp: number;
  dailyGoalXp?: number;
  canPractice: boolean;
  onEditGoal?: () => void;
  onContinue?: () => void;
  onStartListening?: () => void;
  onStartQuiz?: () => void;
}

interface Recommendation {
  title: string;
  detail: string;
  icon: AppIconName;
  iconClassName: string;
  iconBackgroundClassName: string;
  onClick?: () => void;
}

export function DashboardAside({
  todayXp,
  dailyGoalXp = 30,
  canPractice,
  onEditGoal,
  onContinue,
  onStartListening,
  onStartQuiz,
}: DashboardAsideProps) {
  const dailyPercent = dailyGoalXp > 0
    ? Math.min(100, Math.round((todayXp / dailyGoalXp) * 100))
    : 0;
  const recommendations: Recommendation[] = [
    {
      title: 'Essential 500 Words',
      detail: 'Expand your vocabulary',
      icon: 'bookmark',
      iconClassName: 'text-feedback-success',
      iconBackgroundClassName: 'bg-[#E8F9DC]',
      onClick: onContinue,
    },
    {
      title: 'Listening Practice',
      detail: 'Improve your listening skills',
      icon: 'audio',
      iconClassName: 'text-[#8E5BD9]',
      iconBackgroundClassName: 'bg-[#F0E7FF]',
      onClick: onStartListening,
    },
    {
      title: 'Grammar Basics',
      detail: 'Review key grammar points',
      icon: 'exam',
      iconClassName: 'text-[#D89C00]',
      iconBackgroundClassName: 'bg-[#FFF3C4]',
      onClick: onStartQuiz,
    },
  ];

  return (
    <aside className="grid min-h-0 content-start gap-4 lg:h-full lg:gap-[clamp(0.65rem,1.5dvh,1rem)]">
      <GraphPaperPanel gridSize="compact" className="rounded-[20px] p-4 lg:p-[clamp(0.75rem,1.7dvh,1rem)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-brand-primary">
            <AppIcon name="target" size={20} />
            <h2 className="text-[12px] font-black uppercase tracking-[0.08em]">Daily goal</h2>
          </div>
          <Soft3DButton
            type="button"
            variant="custom"
            depth="sm"
            onClick={onEditGoal}
            className="w-auto rounded-[10px] border-transparent bg-transparent px-2 py-1 text-[10px] text-brand-primary shadow-none normal-case tracking-normal hover:scale-100"
          >
            Edit
          </Soft3DButton>
        </div>

        <div className="mt-3 flex items-center gap-4 lg:mt-[clamp(0.45rem,1.2dvh,0.75rem)] lg:gap-[clamp(0.75rem,1.7dvh,1rem)]">
          <CircularProgress
            value={dailyPercent}
            size={66}
            strokeWidth={7}
            progressClassName="text-[#FFC800]"
            label={`${dailyPercent}%`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-black text-ui-ink-strong">
              {todayXp} / {dailyGoalXp} XP
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-ui-muted">
              {todayXp > 0 ? 'Great job! Keep going!' : 'Start a lesson to earn XP.'}
            </p>
            <CustomProgressBar
              progress={dailyPercent}
              accentClassName="bg-[#FFC800]"
              className="mt-3 h-2 lg:mt-[clamp(0.45rem,1.2dvh,0.75rem)]"
            />
          </div>
        </div>
      </GraphPaperPanel>

      <GraphPaperPanel gridSize="compact" className="min-h-0 rounded-[20px] p-4 lg:p-[clamp(0.75rem,1.7dvh,1rem)]">
        <div className="mb-2 flex items-center gap-2 text-brand-primary lg:mb-[clamp(0.35rem,1dvh,0.5rem)]">
          <AppIcon name="sparkles" size={18} />
          <h2 className="text-[12px] font-black uppercase tracking-[0.08em]">Recommended for you</h2>
        </div>

        <div className="grid gap-1.5 lg:gap-[clamp(0.25rem,0.8dvh,0.375rem)]">
          {recommendations.map((item) => (
            <Soft3DButton
              key={item.title}
              type="button"
              variant="custom"
              depth="sm"
              disabled={!canPractice || !item.onClick}
              onClick={item.onClick}
              className="min-h-[54px] justify-start rounded-[14px] border-ui-border bg-ui-surface px-2.5 py-2 text-left text-ui-ink-strong shadow-none normal-case tracking-normal hover:scale-[1.01] lg:min-h-[clamp(44px,6.5dvh,54px)] lg:py-[clamp(0.35rem,1dvh,0.5rem)]"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] lg:h-[clamp(32px,4.8dvh,36px)] lg:w-[clamp(32px,4.8dvh,36px)] ${item.iconBackgroundClassName} ${item.iconClassName}`}>
                <AppIcon name={item.icon} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-black">{item.title}</span>
                <span className="block truncate text-[10px] font-bold text-ui-muted">{item.detail}</span>
              </span>
              <AppIcon name="next" size={16} className="text-ui-muted" />
            </Soft3DButton>
          ))}
        </div>
      </GraphPaperPanel>
    </aside>
  );
}

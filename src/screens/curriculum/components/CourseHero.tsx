import heroLandscape from '../../../assets/images/mandarin-dashboard-hero.png';
import { AppIcon, CustomProgressBar, Soft3DButton } from '../../../lib/widgets';
import type { AppIconName } from '../../../lib/widgets';

interface CourseHeroProps {
  displayName: string;
  progressPercent: number;
  totalXp: number;
  completedLessons: number;
  courseLevel: string;
  isLoading: boolean;
  canContinue: boolean;
  onContinue: () => void;
}

interface HeroStatProps {
  icon: AppIconName;
  value: string | number;
  label: string;
  iconClassName: string;
}

function HeroStat({ icon, value, label, iconClassName }: HeroStatProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <AppIcon name={icon} size={27} className={iconClassName} />
      <div className="min-w-0 leading-tight">
        <p className="text-[15px] font-black text-ui-ink-strong">{value}</p>
        <p className="truncate text-[11px] font-bold text-ui-muted">{label}</p>
      </div>
    </div>
  );
}

function HeroCopy({
  displayName,
  progressPercent,
  isLoading,
  canContinue,
  onContinue,
}: Pick<
  CourseHeroProps,
  'displayName' | 'progressPercent' | 'isLoading' | 'canContinue' | 'onContinue'
>) {
  return (
    <div className="min-w-0">
      <h2 className="text-[25px] font-black leading-tight text-ui-ink-strong lg:text-[clamp(22px,3.1dvh,28px)]">
        Welcome back, {displayName}!
      </h2>
      <p className="mt-1 text-[14px] font-bold text-ui-ink lg:text-[clamp(12px,1.55dvh,14px)]">
        Keep it up! You&apos;re making great progress.
      </p>

      <div className="mt-5 max-w-[430px] lg:mt-[clamp(0.65rem,2dvh,1.25rem)]">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[11px] font-black uppercase tracking-[0.12em] text-brand-primary">
            Course progress
          </span>
          <span className="text-[12px] font-black text-ui-ink-strong">
            {isLoading ? 'Loading…' : `${progressPercent}%`}
          </span>
        </div>
        <CustomProgressBar progress={progressPercent} />
      </div>

      <Soft3DButton
        type="button"
        variant="primary"
        depth="md"
        disabled={!canContinue || isLoading}
        onClick={onContinue}
        className="mt-5 w-auto rounded-[16px] px-5 py-2.5 text-[12px] lg:mt-[clamp(0.65rem,2dvh,1.25rem)] lg:py-[clamp(0.45rem,1.25dvh,0.625rem)]"
      >
        <AppIcon name="play" size={16} />
        Continue Learning
      </Soft3DButton>
    </div>
  );
}

export function CourseHero(props: CourseHeroProps) {
  const backgroundStyle = { backgroundImage: `url(${heroLandscape})` };
  const stats = (
    <>
      <HeroStat icon="star" value={props.totalXp} label="Total XP" iconClassName="text-[#FFC800]" />
      <HeroStat icon="check" value={props.completedLessons} label="Lessons Completed" iconClassName="text-[#46B96A]" />
      <HeroStat icon="level" value={props.courseLevel} label="Current Level" iconClassName="text-[#8E5BD9]" />
    </>
  );

  return (
    <>
      <section className="overflow-hidden rounded-[22px] border border-ui-divider bg-ui-surface shadow-[0_6px_18px_rgba(47,50,55,0.06)] lg:hidden">
        <div
          className="aspect-[3/1] w-full bg-cover bg-center"
          style={backgroundStyle}
          role="img"
          aria-label="Blue reading mascot in a Mandarin landscape"
        />
        <div className="p-5">
          <HeroCopy {...props} />
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-ui-divider pt-4">{stats}</div>
        </div>
      </section>

      <section
        aria-label="Course welcome and progress"
        className="relative hidden h-[clamp(150px,22dvh,258px)] shrink-0 overflow-hidden rounded-[22px] border border-ui-divider bg-cover bg-center shadow-[0_6px_18px_rgba(47,50,55,0.06)] lg:block"
        style={backgroundStyle}
      >
        <div className="grid h-full grid-cols-[minmax(0,1fr)_190px] items-center gap-5 pl-[33%] pr-6 lg:grid-cols-[minmax(0,1fr)_clamp(168px,15vw,190px)] lg:gap-[clamp(0.75rem,1.8dvh,1.25rem)] lg:pr-[clamp(1rem,2.3dvh,1.5rem)]">
          <HeroCopy {...props} />
          <div className="flex flex-col gap-5 rounded-[18px] border border-white/80 bg-white/86 p-4 shadow-[0_6px_18px_rgba(47,50,55,0.06)] backdrop-blur-sm lg:gap-[clamp(0.75rem,2dvh,1.25rem)] lg:p-[clamp(0.75rem,1.8dvh,1rem)]">
            {stats}
          </div>
        </div>
      </section>
    </>
  );
}

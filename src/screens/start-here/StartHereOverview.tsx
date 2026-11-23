import startHereHeroImg from '../../assets/images/start-here-hero.webp';
import { ActionButton, AppIcon, Drawer, ScreenHeader } from '../../lib/widgets';
import { cn } from '../../utils/cn';
import type { PartId, StartHereLesson, StartHerePartMeta } from './data/types';

interface StartHereOverviewProps {
  parts: StartHerePartMeta[];
  lessons: StartHereLesson[];
  activeTab: PartId | 'test';
  completedLessons: number[];
  passed: boolean;
  onSelectTab: (tab: PartId | 'test') => void;
  onStartLesson: (lessonId: number) => void;
  onStartReadyCheck: () => void;
  onGoToLesson1: () => void;
  onClose: () => void;
  skipOpen: boolean;
  onSetSkipOpen: (open: boolean) => void;
}

export function StartHereOverview({
  parts,
  lessons,
  activeTab,
  completedLessons,
  passed,
  onSelectTab,
  onStartLesson,
  onStartReadyCheck,
  onGoToLesson1,
  onClose,
  skipOpen,
  onSetSkipOpen,
}: StartHereOverviewProps) {
  const completedSet = new Set(completedLessons);
  const completedCount = lessons.filter((l) => completedSet.has(l.id)).length;
  const nextUnfinished = lessons.find((l) => !completedSet.has(l.id)) ?? lessons[lessons.length - 1];

  const activePart = typeof activeTab === 'number' ? parts.find((p) => p.id === activeTab) ?? parts[0] : null;
  const partLessons = activePart ? lessons.filter((l) => l.partId === activePart.id) : [];
  const nextInPart = partLessons.find((l) => !completedSet.has(l.id)) ?? partLessons[0];

  const primaryLessonTarget = nextInPart ?? nextUnfinished;
  const primaryButtonLabel =
    activeTab === 'test'
      ? passed
        ? 'Retake Ready check'
        : 'Start Ready check'
      : primaryLessonTarget
        ? completedSet.has(primaryLessonTarget.id)
          ? `Review Lesson ${primaryLessonTarget.id}`
          : completedCount === 0 && primaryLessonTarget.id === 1
            ? 'Start'
            : `Continue Lesson ${primaryLessonTarget.id}`
        : 'Start Ready check';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader
        variant="window"
        onBack={onClose}
        centerContent={(
          <div className="text-center">
            <h1 className="text-lg font-black text-ui-ink-strong">Start here</h1>
            <p className="text-xs font-extrabold text-ui-muted-strong">{completedCount} of {lessons.length} completed</p>
          </div>
        )}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] overflow-hidden px-4 pb-4 pt-2 md:grid-cols-[minmax(0,1fr)_minmax(0,460px)] md:grid-rows-[auto_auto_1fr_auto] md:gap-x-14 md:px-14 md:pb-9 md:pt-5">
        {/* Hero card */}
        <div className="max-h-[24dvh] sm:max-h-[26dvh] md:max-h-none md:row-span-4 md:flex md:flex-col md:justify-center">
          <div className="aspect-video h-full max-h-[24dvh] w-full overflow-hidden md:h-auto md:max-h-none rounded-[22px] border-2 border-ui-divider bg-ui-hover">
            <img src={startHereHeroImg} alt="Start here overview illustration" className="h-full w-full object-contain" />
          </div>
          <div className="mt-3 hidden md:flex md:items-center md:justify-between md:px-1">
            <p className="m-0 text-sm font-extrabold text-ui-muted-strong">
              {passed
                ? 'Ready check passed — you can start Book 1 Lesson 1 anytime.'
                : 'Short interactive steps for Mandarin sounds, tones, pinyin, and your first 13 words.'}
            </p>
          </div>
        </div>

        {/* Underline tabs: Parts 1-6 + Test */}
        <div className="mt-2.5 flex justify-between gap-2 overflow-x-auto sm:gap-4 border-b-2 border-ui-divider px-1 md:mt-0 md:px-0">
          {parts.map((part) => {
            const isActive = activeTab === part.id;
            const partDone = part.lessonIds.length > 0 && part.lessonIds.every((id) => completedSet.has(id));
            return (
              <button
                key={part.id}
                type="button"
                onClick={() => onSelectTab(part.id)}
                className={cn(
                  '-mb-[2px] shrink-0 cursor-pointer whitespace-nowrap border-b-[3px] py-2 text-[15px] font-extrabold transition-colors focus-ring',
                  isActive
                    ? 'border-brand-primary text-brand-primary-deep'
                    : partDone
                      ? 'border-transparent text-ui-muted-strong hover:text-ui-ink-strong'
                      : 'border-transparent text-ui-muted hover:text-ui-ink-strong',
                )}
              >
                Part {part.id}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onSelectTab('test')}
            className={cn(
              '-mb-[2px] shrink-0 cursor-pointer whitespace-nowrap border-b-[3px] py-2 text-[15px] font-extrabold transition-colors focus-ring',
              activeTab === 'test'
                ? 'border-brand-primary text-brand-primary-deep'
                : passed
                  ? 'border-transparent text-ui-muted-strong hover:text-ui-ink-strong'
                  : 'border-transparent text-ui-muted hover:text-ui-ink-strong',
            )}
          >
            Test
          </button>
        </div>

        {/* Part title & description */}
        <div className="pt-3.5">
          {activePart ? (
            <>
              <h2 className="m-0 text-[24px] font-black leading-tight text-ui-ink-strong md:text-[30px]">
                {activePart.title}
              </h2>
              <p className="mt-1 text-sm font-bold text-ui-muted-strong">{activePart.subtitle}</p>
            </>
          ) : (
            <>
              <h2 className="m-0 text-[24px] font-black leading-tight text-ui-ink-strong md:text-[30px]">
                Ready check
              </h2>
              <p className="mt-1 text-sm font-bold text-ui-muted-strong">
                13 quick questions across sounds, tones, pinyin rules, and your first words. Score 11+ to check off Start here.
              </p>
            </>
          )}
        </div>

        {/* Scrollable lesson list / test summary */}
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-3 pr-0.5">
          {activePart ? (
            partLessons.map((lesson) => {
              const isDone = completedSet.has(lesson.id);
              const isCurrent = primaryLessonTarget?.id === lesson.id && !isDone;
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => onStartLesson(lesson.id)}
                  className={cn(
                    'flex min-h-[58px] shrink-0 cursor-pointer items-center gap-3.5 rounded-control border-2 border-b-[5px] px-3.5 py-2.5 text-left transition-[transform,border-color,background-color] duration-100 active:mb-[3px] active:translate-y-[3px] active:border-b-2 focus-ring',
                    isCurrent
                      ? 'border-brand-primary bg-brand-primary-soft'
                      : 'border-ui-divider bg-ui-surface hover:bg-ui-hover',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-xs border-2 text-xs font-black tabular-nums',
                      isCurrent
                        ? 'border-brand-primary text-brand-primary-deep'
                        : 'border-ui-border text-ui-muted-strong',
                    )}
                  >
                    {lesson.id}
                  </span>

                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block text-[16px] font-extrabold leading-snug',
                        isCurrent || isDone ? 'text-ui-ink-strong' : 'text-ui-muted-strong',
                      )}
                    >
                      {lesson.title}
                    </span>
                    <span className="block text-xs font-bold text-ui-muted">
                      ~{lesson.minutes} min · {lesson.goal}
                    </span>
                  </div>

                  {isDone ? (
                    <AppIcon name="check" className="size-5 shrink-0 text-feedback-success-text" />
                  ) : (
                    <AppIcon
                      name="next"
                      className={cn('size-4 shrink-0', isCurrent ? 'text-brand-primary' : 'text-ui-muted')}
                    />
                  )}
                </button>
              );
            })
          ) : (
            <div className="flex flex-col gap-3 rounded-control border-2 border-b-[5px] border-ui-divider bg-ui-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-black text-ui-ink-strong">13 checks · ~3 min</span>
                {passed && (
                  <span className="rounded-sm bg-feedback-success-surface px-2.5 py-1 text-xs font-black uppercase tracking-wider text-feedback-success-text">
                    Passed
                  </span>
                )}
              </div>
              <p className="m-0 text-sm font-bold leading-relaxed text-ui-muted-strong">
                Missed items repeat once at the end so you know what to practice before Book 1 Lesson 1.
              </p>
            </div>
          )}
        </div>

        {/* Bottom action dock */}
        <div className="flex flex-col items-center gap-1 pt-2">
          <ActionButton
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => {
              if (activeTab === 'test') {
                onStartReadyCheck();
              } else if (primaryLessonTarget) {
                onStartLesson(primaryLessonTarget.id);
              }
            }}
          >
            {primaryButtonLabel}
          </ActionButton>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => onSetSkipOpen(true)}
              className="cursor-pointer py-1.5 text-sm font-extrabold text-ui-muted-strong underline decoration-ui-border underline-offset-4 hover:text-ui-ink-strong focus-ring"
            >
              I know this already
            </button>
            {passed && <button
              type="button"
              onClick={onGoToLesson1}
              className="cursor-pointer py-1.5 text-sm font-extrabold text-brand-primary-deep underline decoration-brand-primary-soft-edge underline-offset-4 hover:brightness-95 focus-ring"
            >
              Go to Lesson 1
            </button>}
          </div>
        </div>
      </div>

      <Drawer
        isOpen={skipOpen}
        onClose={() => onSetSkipOpen(false)}
        mdPlacement="side"
        phoneSheet
        title="Already know pinyin and tones?"
      >
        <p className="mb-4 text-base font-bold text-ui-muted-strong">
          Take the Ready check or go straight to Book 1 Lesson 1.
        </p>
        <div className="flex flex-col gap-2">
          <ActionButton variant="primary" size="lg" fullWidth onClick={() => {
            onSetSkipOpen(false);
            onStartReadyCheck();
          }}>
            Take the Ready check
          </ActionButton>
          <ActionButton variant="quiet" fullWidth onClick={onGoToLesson1}>
            Skip straight to Lesson 1
          </ActionButton>
        </div>
      </Drawer>
    </div>
  );
}

import { useCallback, useMemo, useRef, useState } from 'react';
import type { MockTestPool } from '../../../hooks/useMockTestPool';
import type { MockTestAttempt } from '../../../store/slices/mockTestSlice';
import { useAppStore } from '../../../store/useAppStore';
import { lessonTestScreens, scoreLessonTest, type LessonTestScore } from '../../../utils/lesson/lessonTestPlan';
import { scaleToAbility } from '../../../utils/mockTest/adaptiveScale';
import { BAND_PAPER } from '../../../utils/mockTest/bandScore';
import { extendAdaptivePlan, mockConfigKey, scoreMockTest, startMockPlan, type MockConfig, type MockResult } from '../../../utils/mockTest/mockRun';
import { useFixRound } from '../hooks/useFixRound';

export type MockStage = 'intro' | 'question' | 'results' | 'fix';

/** Times each question was shown before, in a mock test or a lesson test, so a new test picks others. */
function seenCounts(): Record<string, number> {
  const state = useAppStore.getState();
  const seen = { ...state.mockTestSeen };
  for (const record of Object.values(state.lessonTests)) {
    for (const [id, count] of Object.entries(record.seen)) seen[id] = (seen[id] ?? 0) + count;
  }
  return seen;
}

/**
 * Where the adaptive test starts looking: the learner's last adaptive result, else the middle of the band their
 * book belongs to, else the official start. A closer start wastes fewer questions; the answers still decide.
 */
function startAbility(): number | undefined {
  const state = useAppStore.getState();
  const last = state.mockTests.find((record) => record.kind === 'adaptive');
  const scores = last ? [last.listening?.[0], last.reading?.[0]].filter((score): score is number => score !== undefined) : [];
  if (scores.length) return scaleToAbility(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  if (state.activeBookId === 1) return BAND_PAPER.A.listening.mean - 1;
  if (state.activeBookId === 2) return BAND_PAPER.A.listening.mean + 1;
  if (state.activeBookId === 3) return BAND_PAPER.B.listening.mean;
  return undefined;
}

/** The saved run, when it is this kind of test and its questions still exist. */
export function savedMockAttempt(data: MockTestPool, config?: MockConfig): MockTestAttempt | null {
  const saved = useAppStore.getState().mockTestAttempt;
  if (!saved || !saved.plan.items.every((item) => data.items.has(item.itemId))) return null;
  return !config || mockConfigKey(saved.config) === mockConfigKey(config) ? saved : null;
}

export function newMockAttempt(data: MockTestPool, config: MockConfig): MockTestAttempt {
  const seed = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const start = config.kind === 'adaptive' ? startAbility() : undefined;
  const plan = startMockPlan(data.pool, config, seenCounts(), seed, start);
  return { config, plan, answers: {}, screen: 0, startedAt: Date.now(), startAbility: start, readingMs: 0 };
}

export interface MockRunResult {
  result: MockResult;
  score: LessonTestScore;
}

/**
 * A mock test's flow: part intro → questions → the score → a Fix round over the misses, back to the score. A fixed
 * paper's plan is whole from the start; the adaptive test adds its next question after each answer. The run is saved
 * after every answer, so closing the app resumes it.
 */
export function useMockTestRun(data: MockTestPool, initial: MockTestAttempt) {
  const [attempt, setAttempt] = useState(initial);
  const { config } = attempt;
  const adaptive = config.kind === 'adaptive';
  const screens = useMemo(() => lessonTestScreens(data.items, attempt.plan), [data.items, attempt.plan]);
  const [stage, setStage] = useState<MockStage>(() => (attempt.screen > 0 ? 'question' : 'intro'));
  const [finished, setFinished] = useState<MockRunResult | null>(null);
  const seen = useRef<Record<string, number> | null>(null);

  const save = useCallback((next: MockTestAttempt) => {
    setAttempt(next);
    useAppStore.getState().saveMockTestAttempt(next);
  }, []);

  const answer = useCallback((questionId: string, choice: number | undefined) => {
    const answers = { ...attempt.answers };
    if (choice === undefined) delete answers[questionId];
    else answers[questionId] = choice;
    save({ ...attempt, answers });
  }, [attempt, save]);

  /** A test ends once: the clock, the answer bar and a tap can all ask for it at the same moment. */
  const ended = useRef(false);
  const finish = useCallback((run: MockTestAttempt) => {
    if (ended.current) return;
    ended.current = true;
    const result = scoreMockTest(data.pool, run.config, run.plan, run.answers, run.startAbility);
    useAppStore.getState().recordMockTest({ config: run.config, plan: run.plan, answers: run.answers, result });
    setAttempt(run);
    setFinished({ result, score: scoreLessonTest(data.items, run.plan, run.answers) });
    setStage('results');
  }, [data]);

  /** The next screen. The adaptive test picks it now, from the answers so far; a new part opens with its intro. */
  const next = useCallback((readingMs = attempt.readingMs) => {
    const index = attempt.screen + 1;
    let { plan } = attempt;
    let list = screens;
    if (index >= screens.length) {
      if (!adaptive) { finish({ ...attempt, readingMs }); return; }
      seen.current ??= seenCounts();
      const step = extendAdaptivePlan(data.pool, config, plan, attempt.answers, seen.current, attempt.startAbility);
      if (step.done) { finish({ ...attempt, readingMs }); return; }
      plan = step.plan;
      list = lessonTestScreens(data.items, plan);
    }
    save({ ...attempt, plan, screen: index, readingMs });
    setStage(list[index].part !== list[index - 1].part ? 'intro' : 'question');
  }, [adaptive, attempt, config, data, finish, save, screens]);

  /** A fixed paper's reading part allows going back, as the official one does. */
  const canGoBack = !adaptive && attempt.screen > 0 && screens[attempt.screen]?.part === 'reading' && screens[attempt.screen - 1]?.part === 'reading';
  const back = useCallback((readingMs = attempt.readingMs) => {
    if (canGoBack) save({ ...attempt, screen: attempt.screen - 1, readingMs });
  }, [attempt, canGoBack, save]);

  /** Time is up: the test ends with what has been answered. */
  const timeUp = useCallback((readingMs: number) => finish({ ...attempt, readingMs }), [attempt, finish]);

  const missedIds = useMemo(() => (finished ? finished.score.missed.map(({ question }) => question.id) : null), [finished]);
  const fix = useFixRound(screens, missedIds);
  const { start: restartFix, advance: advanceFix } = fix;
  const startFix = useCallback(() => { if (restartFix()) setStage('fix'); }, [restartFix]);
  const continueFix = useCallback(() => { if (!advanceFix()) setStage('results'); }, [advanceFix]);

  return {
    config,
    adaptive,
    plan: attempt.plan,
    stage,
    setStage,
    screens,
    screen: screens[attempt.screen],
    screenIndex: attempt.screen,
    answers: attempt.answers,
    readingMs: attempt.readingMs,
    answer,
    next,
    back,
    canGoBack,
    timeUp,
    finished,
    fix,
    startFix,
    continueFix,
  };
}

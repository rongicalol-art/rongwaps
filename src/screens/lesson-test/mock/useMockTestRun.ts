import { useCallback, useMemo, useRef, useState } from 'react';
import type { MockTestPool } from '../../../hooks/useMockTestPool';
import type { MockTestAttempt } from '../../../store/slices/mockTestSlice';
import { useAppStore } from '../../../store/useAppStore';
import { lessonTestScreens, planFitsItems, scoreLessonTest, type LessonTestScore } from '../../../utils/lesson/lessonTestPlan';
import { scaleToAbility } from '../../../utils/mockTest/adaptiveScale';
import { BAND_PAPER } from '../../../utils/mockTest/bandScore';
import { extendAdaptivePlan, mockConfigKey, scoreMockTest, startMockPlan, type MockConfig, type MockResult } from '../../../utils/mockTest/mockRun';
import { RECIPE_BANDS } from '../../../utils/mockTest/recipes';
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
  const scores = last ? [last.listening?.[0], last.reading?.[0]].filter((score): score is number => score !== undefined && score > 0) : [];
  if (scores.length) return scaleToAbility(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  if (state.activeBookId === 1) return BAND_PAPER.A.listening.mean - 1;
  if (state.activeBookId === 2) return BAND_PAPER.A.listening.mean + 1;
  if (state.activeBookId === 3) return BAND_PAPER.B.listening.mean;
  return undefined;
}

const KINDS: readonly string[] = ['adaptive', ...RECIPE_BANDS];

/** A config as this device saved it, checked before use (saved state can be old or damaged). */
function validConfig(config: Partial<MockConfig> | undefined): config is MockConfig {
  return Boolean(config) && KINDS.includes(config!.kind as string) && (config!.length === 'quick' || config!.length === 'full')
    && Array.isArray(config!.parts) && config!.parts.length > 0 && config!.parts.every((part) => part === 'listening' || part === 'reading');
}

/**
 * The saved run, when it can still be picked up: its questions and their choices still exist (a pack update can
 * drop one), its place is inside the test, and it is the asked kind of test.
 */
export function savedMockAttempt(data: MockTestPool, config?: MockConfig): MockTestAttempt | null {
  const saved = useAppStore.getState().mockTestAttempt;
  if (!saved || !validConfig(saved.config) || !planFitsItems(data.items, saved.plan) || saved.plan.items.length === 0
    || !saved.answers || typeof saved.answers !== 'object') return null;
  const screens = lessonTestScreens(data.items, saved.plan).length;
  if (!Number.isInteger(saved.screen) || saved.screen < 0 || saved.screen >= screens) return null;
  const readingMs = Number.isFinite(saved.readingMs) && saved.readingMs >= 0 ? saved.readingMs : 0;
  if (config && mockConfigKey(saved.config) !== mockConfigKey(config)) return null;
  return { ...saved, readingMs };
}

/** A new run, or null when the pool has nothing to ask for it. */
export function newMockAttempt(data: MockTestPool, config: MockConfig): MockTestAttempt | null {
  const seed = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const start = config.kind === 'adaptive' ? startAbility() : undefined;
  const plan = startMockPlan(data.pool, config, seenCounts(), seed, start);
  if (plan.items.length === 0) return null;
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
  // The run as of this instant: a tap and a timer can land in one tick, and each must see the other's change.
  const current = useRef(initial);
  const { config } = attempt;
  const adaptive = config.kind === 'adaptive';
  const screens = useMemo(() => lessonTestScreens(data.items, attempt.plan), [data.items, attempt.plan]);
  const [stage, setStage] = useState<MockStage>(() => (attempt.screen > 0 ? 'question' : 'intro'));
  const [finished, setFinished] = useState<MockRunResult | null>(null);
  const seen = useRef<Record<string, number> | null>(null);
  /** A test ends once: the clock, the answer bar and a tap can all ask for it at the same moment. */
  const ended = useRef(false);

  const save = useCallback((next: MockTestAttempt) => {
    if (ended.current) return;
    current.current = next;
    setAttempt(next);
    useAppStore.getState().saveMockTestAttempt(next);
  }, []);

  /** `readingMs`: the reading clock right now, saved with the answer so closing the test never gives time back. */
  const answer = useCallback((questionId: string, choice: number | undefined, readingMs = current.current.readingMs) => {
    const answers = { ...current.current.answers };
    if (choice === undefined) delete answers[questionId];
    else answers[questionId] = choice;
    save({ ...current.current, answers, readingMs });
  }, [save]);

  /** Saves the reading clock alone (the test is being closed or hidden). */
  const saveClock = useCallback((readingMs: number) => {
    if (readingMs !== current.current.readingMs) save({ ...current.current, readingMs });
  }, [save]);

  const finish = useCallback((readingMs: number) => {
    if (ended.current) return;
    const run = { ...current.current, readingMs };
    ended.current = true;
    current.current = run;
    const result = scoreMockTest(data.pool, run.config, run.plan, run.answers, run.startAbility);
    useAppStore.getState().recordMockTest({ config: run.config, plan: run.plan, answers: run.answers, result });
    setAttempt(run);
    setFinished({ result, score: scoreLessonTest(data.items, run.plan, run.answers) });
    setStage('results');
  }, [data]);

  /** The next screen. The adaptive test picks it now, from the answers so far; a new part opens with its intro. */
  const next = useCallback((readingMs = current.current.readingMs) => {
    if (ended.current) return;
    const run = current.current;
    const index = run.screen + 1;
    let { plan } = run;
    let list = lessonTestScreens(data.items, plan);
    if (index >= list.length) {
      if (!adaptive) { finish(readingMs); return; }
      seen.current ??= seenCounts();
      const step = extendAdaptivePlan(data.pool, run.config, plan, run.answers, seen.current, run.startAbility);
      if (step.done) { finish(readingMs); return; }
      plan = step.plan;
      list = lessonTestScreens(data.items, plan);
    }
    save({ ...run, plan, screen: index, readingMs });
    setStage(list[index].part !== list[index - 1].part ? 'intro' : 'question');
  }, [adaptive, data, finish, save]);

  /** A fixed paper's reading part allows going back, as the official one does. */
  const canGoBack = !adaptive && attempt.screen > 0 && screens[attempt.screen]?.part === 'reading' && screens[attempt.screen - 1]?.part === 'reading';
  const back = useCallback((readingMs = current.current.readingMs) => {
    const run = current.current;
    if (canGoBack && run.screen > 0) save({ ...run, screen: run.screen - 1, readingMs });
  }, [canGoBack, save]);

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
    /** Time is up: the test ends with what has been answered. */
    timeUp: finish,
    saveClock,
    finished,
    fix,
    startFix,
    continueFix,
  };
}

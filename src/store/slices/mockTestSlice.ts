import type { LessonTestPart } from '../../types/lessonTest';
import type { LessonTestPlan } from '../../utils/lesson/lessonTestPlan';
import type { MockConfig, MockResult } from '../../utils/mockTest/mockRun';

/** One finished mock test. A type alias (not an interface) so it is assignable to the settings jsonb column type. */
export type MockTestRecord = {
  at: string;
  kind: MockConfig['kind'];
  parts: LessonTestPart[];
  length: MockConfig['length'];
  /** The top of the score scale: 80 (band test) or 700 (adaptive test). */
  scale: 80 | 700;
  listening?: [score: number, right: number, asked: number];
  reading?: [score: number, right: number, asked: number];
  /** The level reached (0.5 and 0.9 are Novice 1 and 2), or null below `floor`, the test's first level. */
  level: number | null;
  floor: number;
  /** The level is "this or above": the answers reached past the hardest questions. */
  atCeiling: boolean;
};

/** The mock test in progress (one at a time), so closing the app resumes it. */
export interface MockTestAttempt {
  config: MockConfig;
  /** The adaptive test's plan grows by one recording or text after each answer. */
  plan: LessonTestPlan;
  /** Question id → original choice index. */
  answers: Record<string, number>;
  /** Index of the screen to show. */
  screen: number;
  startedAt: number;
  /** Where the adaptive test started its estimate (kept so the run is scored the way it was chosen). */
  startAbility?: number;
  /** Reading time used so far, in milliseconds (the reading part runs on a clock). */
  readingMs: number;
}

/** The last finished mock test, for Answers. */
export interface MockTestReview {
  config: MockConfig;
  plan: LessonTestPlan;
  answers: Record<string, number>;
  at: string;
}

export interface MockTestState {
  /** Finished tests, newest first. */
  mockTests: MockTestRecord[];
  /** Times each question was shown in a mock test, so the next one picks others. */
  mockTestSeen: Record<string, number>;
  mockTestAttempt: MockTestAttempt | null;
  mockTestLast: MockTestReview | null;
  saveMockTestAttempt: (attempt: MockTestAttempt | null) => void;
  recordMockTest: (run: { config: MockConfig; plan: LessonTestPlan; answers: Record<string, number>; result: MockResult }) => void;
  resetMockTests: () => void;
}

/** Enough for a history, small enough for the synced settings. */
export const MOCK_TEST_HISTORY = 30;

type SetState = (partial: Partial<MockTestState> | ((state: MockTestState) => Partial<MockTestState>)) => void;

export function mockTestRecord(config: MockConfig, result: MockResult, at: string): MockTestRecord {
  const skill = (part: LessonTestPart): Pick<MockTestRecord, LessonTestPart> => {
    const entry = result.skills[part];
    return entry ? { [part]: [entry.score, entry.correct, entry.total] } : {};
  };
  return {
    at, kind: config.kind, parts: config.parts, length: config.length, scale: result.scale,
    ...skill('listening'), ...skill('reading'),
    level: result.level, floor: result.floor, atCeiling: result.atCeiling,
  };
}

export function createMockTestSlice(set: SetState): MockTestState {
  return {
    mockTests: [],
    mockTestSeen: {},
    mockTestAttempt: null,
    mockTestLast: null,
    saveMockTestAttempt: (attempt) => set({ mockTestAttempt: attempt }),
    recordMockTest: ({ config, plan, answers, result }) => set((state) => {
      const at = new Date().toISOString();
      const seen = { ...state.mockTestSeen };
      for (const { itemId } of plan.items) seen[itemId] = (seen[itemId] ?? 0) + 1;
      return {
        mockTests: [mockTestRecord(config, result, at), ...state.mockTests].slice(0, MOCK_TEST_HISTORY),
        mockTestSeen: seen,
        mockTestAttempt: null,
        mockTestLast: { config, plan, answers, at },
      };
    }),
    resetMockTests: () => set({ mockTests: [], mockTestSeen: {}, mockTestAttempt: null, mockTestLast: null }),
  };
}

const KINDS = new Set(['adaptive', 'A', 'B', 'C']);
const PARTS = new Set(['listening', 'reading']);
const count = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const triple = (value: unknown): value is [number, number, number] => Array.isArray(value) && value.length === 3 && value.every(count);

/** A record as another device saved it, or null when it is not one (the cloud copy is untrusted input). */
function validRecord(value: unknown): MockTestRecord | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as Partial<MockTestRecord>;
  if (typeof r.at !== 'string' || Number.isNaN(Date.parse(r.at)) || !KINDS.has(r.kind as string)
    || !Array.isArray(r.parts) || r.parts.length === 0 || !r.parts.every((part) => PARTS.has(part))
    || (r.length !== 'quick' && r.length !== 'full') || (r.scale !== 80 && r.scale !== 700)
    || (r.level !== null && !count(r.level)) || !count(r.floor)
    || (r.listening !== undefined && !triple(r.listening)) || (r.reading !== undefined && !triple(r.reading))) return null;
  return {
    at: r.at, kind: r.kind as MockTestRecord['kind'], parts: r.parts, length: r.length, scale: r.scale,
    ...(r.listening ? { listening: r.listening } : {}), ...(r.reading ? { reading: r.reading } : {}),
    level: r.level ?? null, floor: r.floor, atCeiling: r.atCeiling === true,
  };
}

/**
 * Mock test results from another device, merged into this one's: every test once (by its finish time), newest
 * first, the oldest dropped past the history's length. Returns only what changes locally.
 */
export function mergeMockTests(local: MockTestRecord[], cloud: unknown): { mockTests?: MockTestRecord[] } {
  if (!Array.isArray(cloud)) return {};
  const have = new Set(local.map((record) => record.at));
  const theirs = cloud.map(validRecord).filter((record): record is MockTestRecord => record !== null && !have.has(record.at));
  if (theirs.length === 0) return {};
  const merged = [...local, ...theirs].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, MOCK_TEST_HISTORY);
  // Only tests older than the whole local history came in: nothing changes here.
  if (merged.length === local.length && merged.every((record, index) => record.at === local[index].at)) return {};
  return { mockTests: merged };
}

/**
 * `mockTests` (the results) is synced inside the settings blob's `grammarProgress`, beside the lesson tests' scores,
 * so the server's progress reset clears it too. The attempt in progress, the last finished run and the seen counts
 * stay on this device.
 */
export const MOCK_TEST_SYNCED_KEYS = ['mockTests'] as const;
export const MOCK_TEST_PERSISTED_KEYS = ['mockTests', 'mockTestSeen', 'mockTestAttempt', 'mockTestLast'] as const;

export const MOCK_TEST_ACCOUNT_SWITCH_DEFAULTS = {
  mockTests: [],
  mockTestSeen: {},
  mockTestAttempt: null,
  mockTestLast: null,
};

import { levelLabel } from '../../../utils/mockTest/adaptiveScale';
import type { MockConfig, MockKind } from '../../../utils/mockTest/mockRun';

/** The words the mock test's screens share. */

export const MOCK_KINDS: ReadonlyArray<{ kind: MockKind; label: string; detail: string }> = [
  { kind: 'adaptive', label: 'Adaptive', detail: 'Finds your level' },
  { kind: 'A', label: 'Band A', detail: 'Levels 1-2' },
  { kind: 'B', label: 'Band B', detail: 'Levels 3-4' },
  { kind: 'C', label: 'Band C', detail: 'Levels 5-6' },
];

export const kindLabel = (kind: MockKind) => MOCK_KINDS.find((entry) => entry.kind === kind)?.label ?? kind;

/** The test's name on its intro and its answers: "Adaptive test", "Band A test". */
export const mockTestTitle = (config: Pick<MockConfig, 'kind'>) => `${kindLabel(config.kind)} test`;

/** "Level 3", "Level 3 or above", or "Below Level 1" when the test's first level wasn't reached. */
export function levelText(result: { level: number | null; floor: number; atCeiling: boolean }): string {
  if (result.level === null) return `Below ${levelLabel(result.floor)}`;
  return result.atCeiling ? `${levelLabel(result.level)} or above` : levelLabel(result.level);
}

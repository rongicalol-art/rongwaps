import type {
  CharacterHookPlanV2,
  HookStyleIssue,
  MemoryHookCandidateV2,
} from '../../src/features/character-memory-hooks/model';

export interface StylePreflightResult {
  issues: HookStyleIssue[];
  reasons: string[];
}

const FILLER_LANGUAGE = /\b(?:in (?:a|this) scene|recall|helps? you remember|suggests?|together forms?)\b/i;
const TEMPLATE_LANGUAGE = /\b(?:plus|combine|combines|forming|forms|formed|make|makes|as if)\b/i;
const LOGIC_PUZZLE_LANGUAGE = /\basks?\s+what\b|\bwhat\s+you\b/i;
const SCENE_TEMPLATE_START = /^(?:with|when|in a scene|to)\b/i;
const SCENE_ACTION = /\b(?:rests?|leans?|calls?|sits?|stands?|opens?|holds?|marks?|takes?|begs?|fills?|touches?|lies?|points?|asks?|drinks?|eats?|puts?|covers?|claims?|becomes?)\b/i;
const SPATIAL_ACTION = /\b(?:on|under|against|beside|between|inside|through|sits?|standing|rests?|ground|place|spot)\b/i;

function add(result: StylePreflightResult, issue: HookStyleIssue, reason: string): void {
  if (!result.issues.includes(issue)) result.issues.push(issue);
  result.reasons.push(reason);
}

function targetNearEnd(plan: CharacterHookPlanV2, hook: string): boolean {
  const targetToken = `${plan.character}(${plan.targetDisplayLabel})`;
  const words = hook.trim().split(/\s+/).filter(Boolean);
  const index = words.findIndex((word) => word.includes(targetToken));
  return index >= Math.max(0, words.length - 4);
}

/**
 * Style-only preflight. It never evaluates evidence or decomposition truth;
 * it only blocks prose patterns that repeatedly produced weak pilot hooks.
 */
export function evaluateHookStylePreflight(
  plan: CharacterHookPlanV2,
  candidate: MemoryHookCandidateV2,
): StylePreflightResult {
  const result: StylePreflightResult = { issues: [], reasons: [] };
  if (plan.frame.kind === 'none') return result;
  if (plan.frame.kind === 'scene' && plan.frame.benchmarkHook === candidate.hook) return result;

  if (FILLER_LANGUAGE.test(candidate.hook)) {
    add(result, 'awkward', 'The hook contains explicit filler instead of entering the action directly.');
  }
  if (TEMPLATE_LANGUAGE.test(candidate.hook)) {
    add(result, 'component-list-only', 'The wording resembles a component-list or A + B = C template.');
  }

  if (plan.frame.kind === 'scene') {
    if (SCENE_TEMPLATE_START.test(candidate.hook)) {
      add(result, 'awkward', 'The sentence starts with a generic instructional/template frame.');
    }
    if (LOGIC_PUZZLE_LANGUAGE.test(candidate.hook)) {
      add(result, 'vague', 'The scene is phrased as a question puzzle instead of one immediate causal action.');
    }
    if (!SCENE_ACTION.test(candidate.hook)) {
      add(result, 'vague', 'The scene does not contain a concrete action that leads to the target.');
    }
    if (!targetNearEnd(plan, candidate.hook)) {
      add(result, 'awkward', 'The target appears before the consequence of the scene is complete.');
    }
  }

  if (plan.frame.kind === 'formation') {
    const hasSemantic = plan.frame.components.some((component) => component.role === 'semantic');
    const hasPhonetic = plan.frame.components.some((component) => component.role === 'phonetic');
    if (hasSemantic && hasPhonetic) {
      const hasMeaningClue = /\b(?:meaning|semantic)\b/i.test(candidate.hook);
      const hasSoundClue = /\b(?:sound|reading|pronunciation|cues?|hints?)\b/i.test(candidate.hook);
      if (!hasMeaningClue || !hasSoundClue) {
        add(result, 'vague', 'A semantic-plus-phonetic frame should explicitly state the meaning clue and sound cue.');
      }
    }
    if (plan.frame.components.some((component) => component.labelBasis === 'visual') && !/\b(?:here|in this character|as drawn|shown)\b/i.test(candidate.hook)) {
      add(result, 'awkward', 'A target-specific visual label needs contextual wording rather than a global-sounding assertion.');
    }
    if (!targetNearEnd(plan, candidate.hook)) {
      add(result, 'awkward', 'The formation explanation should resolve on the target token at the end.');
    }
  }

  if (!candidate.ahaConnection.trim()) {
    add(result, 'vague', 'The candidate does not state one reviewable aha connection.');
  }
  return result;
}

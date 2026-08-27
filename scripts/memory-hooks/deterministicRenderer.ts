import type {
  CharacterHookPlanV2,
  FormationHookFrame,
  HookFrame,
  MemoryHookCandidateV2,
  OriginHookFrameV2,
  PlannedComponentUse,
} from '../../src/features/character-memory-hooks/model';
import { validateTargetSemanticBridge } from './semanticBridge';

export interface DeterministicRenderResult {
  candidate: MemoryHookCandidateV2 | null;
  error: string | null;
}

function token(component: PlannedComponentUse): string {
  return `${component.glyph}(${component.displayLabel})`;
}

function targetToken(plan: CharacterHookPlanV2): string {
  if (!plan.targetDisplayLabel) throw new Error('The plan has no learner-facing target label.');
  return `${plan.character}(${plan.targetDisplayLabel})`;
}

function expectedEvidence(frame: Exclude<HookFrame, { kind: 'none' }>): string[] {
  if (frame.kind === 'origin') return [...new Set(frame.sourceRefs)];
  return [...new Set([
    ...frame.components.flatMap((component) => component.evidenceRefs),
    ...(frame.kind === 'formation' ? frame.semanticBridge?.sourceRefs ?? [] : []),
  ])];
}

function baseCandidate(
  plan: CharacterHookPlanV2,
  frameKind: Exclude<HookFrame['kind'], 'none'>,
  hook: string,
  ahaConnection: string,
): MemoryHookCandidateV2 {
  if (plan.frame.kind === 'none') throw new Error('A no-hook frame cannot be rendered.');
  return {
    character: plan.character,
    frameKind,
    canonicalMeaning: plan.canonicalMeaning ?? '',
    hook,
    componentOccurrenceRefs: plan.frame.components.flatMap((component) => component.occurrenceIds),
    mnemonicProps: [],
    ahaConnection,
    evidenceRefs: expectedEvidence(plan.frame),
  };
}

function componentByOccurrence(frame: FormationHookFrame, occurrenceId: string): PlannedComponentUse {
  const component = frame.components.find((candidate) => candidate.occurrenceIds.includes(occurrenceId));
  if (!component) throw new Error(`The visual relation references an unplanned occurrence: ${occurrenceId}.`);
  return component;
}

function renderFormation(plan: CharacterHookPlanV2): MemoryHookCandidateV2 {
  if (plan.frame.kind !== 'formation') throw new Error('Expected a formation frame.');
  const frame = plan.frame;
  const semantic = frame.components.filter((component) => component.role === 'semantic');
  const phonetic = frame.components.filter((component) => component.role === 'phonetic');

  if (semantic.length === 1 && phonetic.length === 1) {
    const bridgeIssues = validateTargetSemanticBridge(frame.semanticBridge, plan.character, semantic[0].occurrenceIds);
    if (bridgeIssues.length > 0) {
      throw new Error(bridgeIssues.map((bridgeIssue) => `${bridgeIssue.code}: ${bridgeIssue.message}`).join(' '));
    }
    if (!plan.canonicalPinyin) throw new Error('missing-target-pronunciation: The phonetic FormationFrame has no target pronunciation.');
    const semanticToken = token(semantic[0]);
    const phoneticToken = token(phonetic[0]);
    const target = targetToken(plan);
    return baseCandidate(
      plan,
      'formation',
      `${semanticToken} connects to ${target} because ${frame.semanticBridge?.phrase}, while ${phoneticToken} hints at the pronunciation—${plan.canonicalPinyin}.`,
      `${semanticToken} has a target-specific meaning connection through ${frame.semanticBridge?.phrase}; ${phoneticToken} cues the target pronunciation ${plan.canonicalPinyin}.`,
    );
  }

  const renderSpec = frame.renderSpec;
  if (renderSpec?.kind !== 'visual-relation') {
    throw new Error('No deterministic formation renderer supports this role combination.');
  }
  const subject = componentByOccurrence(frame, renderSpec.subjectOccurrenceId);
  const object = componentByOccurrence(frame, renderSpec.objectOccurrenceId);
  if (renderSpec.relation !== 'sit-on') throw new Error(`Unsupported visual formation relation: ${renderSpec.relation}.`);
  const target = targetToken(plan);
  return baseCandidate(
    plan,
    'formation',
    `Here, ${token(subject)} sit on ${token(object)}—a clear picture of ${target}.`,
    `The target-scoped visual relation shows two people sitting on the ground, creating the image of ${target}.`,
  );
}

function normalizeClaim(claim: string): string {
  const normalized = claim.trim().replace(/\s+/g, ' ');
  if (!normalized) throw new Error('The origin frame has no curated claim.');
  return /[.!?。！？]$/.test(normalized) ? normalized : `${normalized}.`;
}

function renderOrigin(plan: CharacterHookPlanV2): MemoryHookCandidateV2 {
  if (plan.frame.kind !== 'origin') throw new Error('Expected an origin frame.');
  const hook = normalizeClaim(plan.frame.claim);
  const target = targetToken(plan);
  const requiredTokens = [
    ...plan.frame.components.map(token),
    target,
  ];
  const missingTokens = requiredTokens.filter((required) => !hook.includes(required));
  if (missingTokens.length > 0) {
    throw new Error(`The curated origin claim must contain exact 字(label) tokens: ${missingTokens.join(', ')}.`);
  }
  return baseCandidate(
    plan,
    'origin',
    hook,
    'The source-backed claim supplies the character’s formation explanation.',
  );
}

export function renderDeterministicCandidate(plan: CharacterHookPlanV2): DeterministicRenderResult {
  try {
    if (plan.frame.kind === 'formation') {
      return { candidate: renderFormation(plan), error: null };
    }
    if (plan.frame.kind === 'origin') {
      return { candidate: renderOrigin(plan), error: null };
    }
    return { candidate: null, error: `Frame ${plan.frame.kind} is not deterministic-rendered.` };
  } catch (error: unknown) {
    return {
      candidate: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

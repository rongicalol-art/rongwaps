import type {
  BookCharacterInventoryEntry,
  CharacterHookPlanV2,
  DeterministicHookQualityResult,
  FormationHookFrame,
  HookFrame,
  MemoryHookCandidateV2,
  PlannedComponentUse,
} from '../../src/features/character-memory-hooks/model';
import {
  PILOT_EVIDENCE_BY_ID,
  PILOT_FRAME_REVIEWS_BY_CHARACTER,
  type PilotFrameReview,
  type ReviewedComponentSelection,
} from '../../src/data/memoryHooks/pilotFrameReviews';
import { getDirectVisibleRuntimeComponents, type RuntimePlanRecord } from './pipeline';
import { validateEvidenceSlotSemanticBridge, validateTargetSemanticBridge } from './semanticBridge';

function occurrenceId(character: string, treePath: string): string {
  return `${character}:${treePath}`;
}

function sameStrings(left: string[], right: string[]): boolean {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function buildComponentUse(
  character: string,
  selection: ReviewedComponentSelection,
  direct: ReturnType<typeof getDirectVisibleRuntimeComponents>,
  reviewReasons: string[],
): PlannedComponentUse {
  const occurrences = selection.treePaths.map((treePath) => direct.find((component) => (
    component.treePath === treePath && component.glyph === selection.glyph
  )));
  if (occurrences.some((component) => !component)) {
    reviewReasons.push(`reviewed-component-not-in-runtime:${selection.glyph}:${selection.treePaths.join(',')}`);
  }

  const ids = selection.treePaths.map((treePath) => occurrenceId(character, treePath));
  const evidence = selection.evidenceSlotId ? PILOT_EVIDENCE_BY_ID.get(selection.evidenceSlotId) : null;
  if (selection.evidenceSlotId && !evidence) {
    reviewReasons.push(`missing-evidence-slot:${selection.evidenceSlotId}`);
  }
  if (evidence && (
    evidence.targetCharacter !== character
    || !sameStrings(evidence.componentOccurrenceIds, ids)
    || evidence.proposedRole !== selection.role
    || evidence.proposedDisplayLabel !== selection.displayLabel
    || evidence.labelBasis !== selection.labelBasis
  )) {
    reviewReasons.push(`evidence-slot-mismatch:${evidence.id}`);
  }

  return {
    occurrenceIds: ids,
    profileKey: `g:${selection.glyph}`,
    glyph: selection.glyph,
    treePaths: selection.treePaths,
    displayLabel: selection.displayLabel,
    labelBasis: selection.labelBasis,
    role: selection.role,
    evidenceRefs: evidence?.sourceRefs ?? [],
  };
}

function buildReviewedFrame(
  review: PilotFrameReview,
  components: PlannedComponentUse[],
): HookFrame {
  if (review.decision === 'no-useful-hook') {
    return {
      kind: 'none',
      reason: review.noHookReason ?? 'reviewed-no-useful-hook',
      detail: review.rationale,
    };
  }
  if (review.decision === 'formation-candidate') {
    const semanticSelection = review.components.find((component) => component.role === 'semantic');
    const semanticBridge = semanticSelection?.evidenceSlotId
      ? PILOT_EVIDENCE_BY_ID.get(semanticSelection.evidenceSlotId)?.semanticBridge
      : undefined;
    return {
      kind: 'formation',
      components,
      evidenceSlotIds: review.components.flatMap((component) => component.evidenceSlotId ? [component.evidenceSlotId] : []),
      learnerUsefulness: 'strong',
      renderSpec: review.formationRenderSpec,
      semanticBridge,
    };
  }
  return {
    kind: 'scene',
    components,
    requiresHumanApproval: true,
    reviewStatus: review.decision === 'approved-scene' ? 'approved' : 'review-required',
    sceneGuidance: review.sceneGuidance ?? '',
    requiredMnemonicProps: review.requiredMnemonicProps,
    benchmarkHook: review.benchmarkHook,
    benchmarkAhaConnection: review.benchmarkAhaConnection,
  };
}

function frameComponents(frame: HookFrame): PlannedComponentUse[] {
  return frame.kind === 'none' ? [] : frame.components;
}

export function buildPilotQualityPlan(options: {
  inventory: BookCharacterInventoryEntry;
  runtimeRecord: RuntimePlanRecord | null;
  decompositionVersion: string;
}): CharacterHookPlanV2 {
  const { inventory, runtimeRecord, decompositionVersion } = options;
  const review = PILOT_FRAME_REVIEWS_BY_CHARACTER.get(inventory.character);
  const reviewReasons = [...inventory.meaningDecision.reviewReasons];
  const direct = runtimeRecord ? getDirectVisibleRuntimeComponents(runtimeRecord.tree) : [];

  if (!review) {
    return {
      schemaVersion: 2,
      character: inventory.character,
      bookId: inventory.bookId,
      canonicalMeaning: inventory.meaningDecision.selectedMeaning,
      targetDisplayLabel: inventory.meaningDecision.selectedMeaning,
      canonicalPinyin: inventory.meaningDecision.selectedPinyin,
      meaningReviewReasons: inventory.meaningDecision.reviewReasons,
      decompositionVersion,
      decompositionRecordId: runtimeRecord?.recordId ?? null,
      distribution: 'development-only-candidate',
      publishable: false,
      status: 'blocked',
      frame: { kind: 'none', reason: 'insufficient-data', detail: 'No manually reviewed pilot frame exists.' },
      reviewReasons: [...reviewReasons, 'missing-reviewed-pilot-frame'],
    };
  }

  const components = review.components.map((selection) => buildComponentUse(
    inventory.character,
    selection,
    direct,
    reviewReasons,
  ));
  const frame = buildReviewedFrame(review, components);

  if (frame.kind === 'formation') {
    for (const slotId of frame.evidenceSlotIds) {
      const slot = PILOT_EVIDENCE_BY_ID.get(slotId);
      if (!slot || slot.evidenceStatus !== 'verified') reviewReasons.push(`evidence-not-verified:${slotId}`);
      if (!slot || slot.licenseStatus !== 'cleared') reviewReasons.push(`evidence-license-not-cleared:${slotId}`);
      if (slot?.modernLearnerUsefulness !== 'strong') reviewReasons.push(`weak-modern-learner-utility:${slotId}`);
      if (slot) {
        for (const bridgeIssue of validateEvidenceSlotSemanticBridge(slot)) {
          reviewReasons.push(`${bridgeIssue.code}:${slotId}`);
        }
      }
    }
    const semanticComponent = frame.components.find((component) => component.role === 'semantic');
    if (semanticComponent) {
      for (const bridgeIssue of validateTargetSemanticBridge(frame.semanticBridge, inventory.character, semanticComponent.occurrenceIds)) {
        reviewReasons.push(`${bridgeIssue.code}:formation`);
      }
    }
  }

  const structuralMismatch = reviewReasons.some((reason) => (
    reason.startsWith('reviewed-component-not-in-runtime')
    || reason.startsWith('missing-evidence-slot')
    || reason.startsWith('evidence-slot-mismatch')
    || reason.startsWith('semantic-bridge-target-mismatch')
    || reason.startsWith('semantic-bridge-component-mismatch')
    || reason.startsWith('unsupported-semantic-bridge')
  ));
  let status: CharacterHookPlanV2['status'];
  if (structuralMismatch || !runtimeRecord || !inventory.meaningDecision.selectedMeaning) status = 'blocked';
  else if (frame.kind === 'none') status = 'no-useful-hook';
  else if (frame.kind === 'scene' && frame.reviewStatus === 'approved') status = 'ready';
  else if (frame.kind === 'formation' && reviewReasons.every((reason) => (
    !reason.startsWith('evidence-not-verified') && !reason.startsWith('evidence-license-not-cleared')
  ))) status = 'ready';
  else status = 'candidate';

  return {
    schemaVersion: 2,
    character: inventory.character,
    bookId: inventory.bookId,
    canonicalMeaning: inventory.meaningDecision.selectedMeaning,
    targetDisplayLabel: review.targetDisplayLabel ?? inventory.meaningDecision.selectedMeaning,
    canonicalPinyin: inventory.meaningDecision.selectedPinyin,
    meaningReviewReasons: inventory.meaningDecision.reviewReasons,
    decompositionVersion,
    decompositionRecordId: runtimeRecord?.recordId ?? null,
    distribution: 'development-only-candidate',
    publishable: false,
    status,
    frame,
    reviewReasons: [...new Set(reviewReasons)],
  };
}

function countOccurrences(value: string, token: string): number {
  if (!token) return 0;
  return value.split(token).length - 1;
}

function expectedEvidence(frame: Exclude<HookFrame, { kind: 'none' }>): string[] {
  if (frame.kind === 'origin') return frame.sourceRefs;
  return [...new Set([
    ...frame.components.flatMap((component) => component.evidenceRefs),
    ...(frame.kind === 'formation' ? frame.semanticBridge?.sourceRefs ?? [] : []),
  ])];
}

const HISTORICAL_LANGUAGE = /\b(ancient|historically|history|originally|origin|evolved|pictograph|oracle bone|bronze script|was created|was formed|comes from|symbolized|represented)\b/i;
const FILLER_LANGUAGE = /\b(recall|helps? you remember|suggests?|together forms?|in (?:a|this) scene)\b/i;
const COMPONENT_LIST_ONLY = /\b(and|plus)\b.*\b(make|makes|form|forms|forming|combine|combines|mean|means|recall|suggest|suggests)\b/i;

export function validateHookQualityDeterministically(
  plan: CharacterHookPlanV2,
  candidate: MemoryHookCandidateV2,
): DeterministicHookQualityResult {
  const issues: DeterministicHookQualityResult['issues'] = [];
  const add = (code: string, severity: 'error' | 'flag', message: string) => issues.push({ code, severity, message });
  if (plan.frame.kind === 'none') {
    add('no-hook-frame', 'error', 'The reviewed plan explicitly has no useful hook frame.');
    return { character: plan.character, valid: false, issues };
  }

  if (candidate.character !== plan.character) add('character-mismatch', 'error', 'Candidate character differs from its plan.');
  if (candidate.frameKind !== plan.frame.kind) add('frame-kind-mismatch', 'error', 'Candidate frame kind differs from its plan.');
  if (candidate.canonicalMeaning !== plan.canonicalMeaning) add('meaning-mismatch', 'error', 'Candidate changed the canonical meaning.');

  const expectedRefs = frameComponents(plan.frame).flatMap((component) => component.occurrenceIds).sort();
  if (!sameStrings(expectedRefs, candidate.componentOccurrenceRefs)) {
    add('component-occurrence-mismatch', 'error', 'Candidate must reference every exact planned occurrence once.');
  }

  for (const component of frameComponents(plan.frame)) {
    const token = `${component.glyph}(${component.displayLabel})`;
    if (countOccurrences(candidate.hook, token) !== 1) {
      add('component-token-count', 'error', `Hook must contain ${token} exactly once.`);
    }
  }
  const targetLabel = plan.targetDisplayLabel;
  if (!targetLabel || countOccurrences(candidate.hook, `${plan.character}(${targetLabel})`) !== 1) {
    add('target-token-count', 'error', 'Hook must contain the reviewed target token exactly once.');
  }

  if (/\([^)]*\p{Script=Han}/u.test(candidate.hook) || /\p{Script=Han}+\([^)]+\)\)/u.test(candidate.hook)) {
    add('nested-or-reversed-token', 'error', 'Component and target tokens must use plain 字(label) form.');
  }
  if (/\p{Script=Han}+\([^)]+\)[A-Za-z]/u.test(candidate.hook)) {
    add('grammar-attached-to-token', 'error', 'Do not attach English morphology directly to 字(label).');
  }

  const sentenceCount = candidate.hook.split(/[.!?。！？]+/).filter((part) => part.trim()).length;
  if (sentenceCount > 1) add('too-many-sentences', 'error', 'Pilot hooks must use one sentence.');
  const wordCount = candidate.hook.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 32) add('too-many-words', 'error', 'Pilot hooks must use at most 32 space-delimited words.');
  if (!candidate.ahaConnection.trim()) add('missing-aha-connection', 'error', 'Candidate must state its proposed aha connection for review.');

  const allowedHan = new Set([
    plan.character,
    ...frameComponents(plan.frame).flatMap((component) => Array.from(component.glyph)),
  ]);
  const unexpectedHan = [...new Set(Array.from(candidate.hook).filter((glyph) => (
    /\p{Script=Han}/u.test(glyph) && !allowedHan.has(glyph)
  )))];
  if (unexpectedHan.length > 0) add('unexpected-han-glyph', 'error', `Unplanned Han glyphs: ${unexpectedHan.join(' ')}.`);

  if (plan.frame.kind !== 'origin' && HISTORICAL_LANGUAGE.test(candidate.hook)) {
    add('unsupported-history', 'error', 'Only an evidence-backed origin frame may make historical claims.');
  }
  const evidence = [...new Set(candidate.evidenceRefs)].sort();
  if (!sameStrings(expectedEvidence(plan.frame).sort(), evidence)) {
    add('evidence-mismatch', 'error', 'Candidate evidence must exactly match its immutable plan.');
  }
  if (candidate.mnemonicProps.some((prop) => /\p{Script=Han}|[()]/u.test(prop))) {
    add('invalid-mnemonic-prop', 'error', 'Mnemonic props must remain plain non-Han scene objects, never component tokens.');
  }
  if (plan.frame.kind === 'scene') {
    const allowedProps = new Set(plan.frame.allowedMnemonicProps ?? plan.frame.requiredMnemonicProps ?? []);
    for (const prop of candidate.mnemonicProps) {
      if (allowedProps.size > 0 && !allowedProps.has(prop)) {
        add('unplanned-mnemonic-prop', 'error', `Mnemonic prop is not allowed by the reviewed scene: ${prop}.`);
      }
    }
    for (const prop of plan.frame.requiredMnemonicProps ?? []) {
      if (!candidate.mnemonicProps.includes(prop)) {
        add('missing-mnemonic-prop', 'error', `Reviewed scene requires mnemonic prop: ${prop}.`);
      }
    }
  } else if (candidate.mnemonicProps.length > 0) {
    add('formation-mnemonic-prop', 'error', 'Formation and origin hooks cannot introduce scene props.');
  }
  for (const prop of candidate.mnemonicProps) {
    if (!candidate.hook.toLowerCase().includes(prop.toLowerCase())) {
      add('unused-mnemonic-prop', 'error', `Declared mnemonic prop is absent from the hook: ${prop}.`);
    }
  }

  if (FILLER_LANGUAGE.test(candidate.hook)) add('filler-language', 'flag', 'Hook uses filler instead of a concrete connection.');
  if (COMPONENT_LIST_ONLY.test(candidate.hook)) add('component-list-only', 'flag', 'Hook may merely restate A + B = target.');
  if (plan.frame.kind === 'formation' && plan.frame.components.some((component) => component.role === 'phonetic' && component.labelBasis === 'reading') && /\b(?:horse|horses|neigh(?:s|ed|ing)?|blue|green)\b/i.test(`${candidate.hook} ${candidate.ahaConnection}`)) {
    add('phonetic-literal-prop', 'flag', 'A phonetic component was turned into a literal scene object instead of a sound cue.');
  }
  if (plan.frame.kind === 'formation') {
    const semantic = plan.frame.components.filter((component) => component.role === 'semantic');
    const phonetic = plan.frame.components.filter((component) => component.role === 'phonetic');
    if (semantic.length === 1 && phonetic.length === 1) {
      for (const bridgeIssue of validateTargetSemanticBridge(plan.frame.semanticBridge, plan.character, semantic[0].occurrenceIds)) {
        add(bridgeIssue.code, bridgeIssue.severity, bridgeIssue.message);
      }
      if (!plan.canonicalPinyin) {
        add('missing-target-pronunciation', 'error', 'A phonetic FormationFrame requires the target pronunciation for its sound cue.');
      }
    }
  }

  return {
    character: plan.character,
    valid: issues.every((issue) => issue.severity !== 'error'),
    issues,
  };
}

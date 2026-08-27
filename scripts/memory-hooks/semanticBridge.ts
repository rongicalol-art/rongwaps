import type {
  DeterministicHookQualityIssue,
  RelationshipEvidenceSlot,
  TargetSemanticBridge,
} from '../../src/features/character-memory-hooks/model';

const BRIDGE_MAX_WORDS = 18;

function sameStrings(left: string[], right: string[]): boolean {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function issue(code: string, message: string): DeterministicHookQualityIssue {
  return { code, severity: 'error', message };
}

/**
 * Validates the bridge as data, not as learner-facing prose. The phrase must
 * remain a short English relationship fragment; the renderer owns sentence
 * structure and all 字(label) tokens.
 */
export function validateTargetSemanticBridge(
  bridge: TargetSemanticBridge | undefined,
  targetCharacter: string,
  semanticComponentOccurrenceIds: string[],
): DeterministicHookQualityIssue[] {
  if (!bridge) return [issue('missing-semantic-bridge', 'A semantic FormationFrame requires a target-specific semantic bridge.')];

  const issues: DeterministicHookQualityIssue[] = [];
  if (bridge.targetCharacter !== targetCharacter) {
    issues.push(issue('semantic-bridge-target-mismatch', 'The semantic bridge targets a different character than the FormationFrame.'));
  }
  if (!sameStrings(bridge.componentOccurrenceIds, semanticComponentOccurrenceIds)) {
    issues.push(issue('semantic-bridge-component-mismatch', 'The semantic bridge does not identify the planned semantic component occurrence.'));
  }
  const phrase = bridge.phrase.trim();
  const wordCount = phrase.split(/\s+/).filter(Boolean).length;
  if (!phrase || wordCount > BRIDGE_MAX_WORDS || /\p{Script=Han}/u.test(phrase) || /[.!?。！？]$/.test(phrase)) {
    issues.push(issue(
      'unsupported-semantic-bridge',
      'The semantic bridge must be a short source-backed relationship phrase, not a rendered sentence or a new component claim.',
    ));
  }
  if (bridge.sourceRefs.length === 0) {
    issues.push(issue('unsupported-semantic-bridge', 'A semantic bridge requires at least one supporting source reference.'));
  }
  if (bridge.evidenceStatus !== 'candidate' && bridge.evidenceStatus !== 'verified') {
    issues.push(issue('unsupported-semantic-bridge', 'The semantic bridge has an unsupported evidence status.'));
  }
  if (bridge.licenseStatus !== 'review-required' && bridge.licenseStatus !== 'cleared') {
    issues.push(issue('unsupported-semantic-bridge', 'The semantic bridge has an unsupported license status.'));
  }
  return issues;
}

/** Validate a bridge attached to an evidence slot before it is copied to a plan. */
export function validateEvidenceSlotSemanticBridge(
  slot: RelationshipEvidenceSlot,
): DeterministicHookQualityIssue[] {
  if (!slot.semanticBridge) return [];
  if (slot.proposedRole !== 'semantic') {
    return [issue('unsupported-semantic-bridge', 'A semantic bridge may only attach to a semantic relationship slot.')];
  }
  return validateTargetSemanticBridge(slot.semanticBridge, slot.targetCharacter, slot.componentOccurrenceIds);
}

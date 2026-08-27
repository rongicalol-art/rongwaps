export type MemoryHookKind = 'origin' | 'formation-clue' | 'memory-aid';
export type MemoryHookStatus = 'eligible' | 'needs-review' | 'no-hook';
export type RelationshipRole = 'semantic' | 'phonetic' | 'visual' | 'unclassified';

export interface LessonMeaningOccurrence {
  vocabularyId: string;
  word: string;
  pinyin: string;
  meaning: string;
  standalone: boolean;
}

export interface ClassifierAnnotation {
  raw: string;
  entries: Array<{
    character: string;
    pinyin: string | null;
  }>;
  source: 'lesson-vocabulary';
}

export interface CanonicalMeaningDecision {
  selectedMeaning: string | null;
  selectedPinyin: string | null;
  /** Learner-facing meaning is kept separate from classifier/course notes. */
  selectedClassifier?: ClassifierAnnotation | null;
  method:
    | 'lesson-dictionary-alignment'
    | 'single-standalone-sense'
    | 'dictionary-core-gloss'
    | 'unresolved';
  confidence: 'high' | 'medium' | 'low';
  lessonSpecificMeanings: LessonMeaningOccurrence[];
  dictionaryDefinition: string | null;
  reviewReasons: string[];
}

export interface BookCharacterInventoryEntry {
  character: string;
  bookId: number;
  firstVocabularyId: string;
  occurrences: LessonMeaningOccurrence[];
  meaningDecision: CanonicalMeaningDecision;
}

export interface ComponentSense {
  id: string;
  label: string;
  pinyin?: string;
  sourceRefs: string[];
  safeForMemoryAid: boolean;
}

export interface ComponentLexiconEntry {
  key: `g:${string}`;
  glyph: string;
  family?: string;
  senses: ComponentSense[];
  /** Hints only. They never become a target-character relationship assertion. */
  roleHints?: Exclude<RelationshipRole, 'unclassified'>[];
}

export interface RelationshipEvidence {
  targetCharacter: string;
  componentKey: `g:${string}`;
  role: Exclude<RelationshipRole, 'unclassified'>;
  senseId: string;
  sourceRefs: string[];
  confidence: 'high' | 'medium';
}

export interface CharacterOriginEvidence {
  targetCharacter: string;
  canonicalMeaning: string;
  componentKeys: string[];
  claim: string;
  sourceRefs: string[];
  confidence: 'high' | 'medium';
  licenseStatus: 'cleared' | 'review-required';
}

export interface PlannedHookComponent {
  key: string;
  kind: 'glyph' | 'unencoded-component' | 'unknown-component' | 'source-entity';
  glyph: string | null;
  treePath: string;
  senseId: string | null;
  label: string | null;
  role: RelationshipRole;
  roleEvidenceRefs: string[];
}

export interface CharacterMemoryHookPlan {
  character: string;
  bookId: number;
  decompositionVersion: string;
  decompositionRecordId: string | null;
  decompositionSourceId: string | null;
  distribution: 'development-only-candidate';
  publishable: false;
  meaningDecision: CanonicalMeaningDecision;
  components: PlannedHookComponent[];
  status: MemoryHookStatus;
  proposedKind: MemoryHookKind | null;
  originClaim: string | null;
  evidenceRefs: string[];
  blockers: string[];
}

export interface GeneratedMemoryHookCandidate {
  character: string;
  kind: MemoryHookKind;
  canonicalMeaning: string;
  hook: string;
  componentRefs: string[];
  evidenceRefs: string[];
  model: string;
  promptVersion: string;
}

export interface MemoryHookValidationIssue {
  code: string;
  message: string;
}

export interface MemoryHookValidationResult {
  character: string;
  valid: boolean;
  issues: MemoryHookValidationIssue[];
}

// V2 pilot planning types. The V1 generation contract above remains intact
// until the reviewed V2 plans are accepted and the prompt is deliberately migrated.
export type DisplayLabelBasis = 'meaning' | 'reading' | 'visual';
export type HookPlanStatus = 'ready' | 'candidate' | 'blocked' | 'no-useful-hook';

export interface ApprovedDefaultLabel {
  id: string;
  label: string;
  sourceRefs: string[];
}

export interface ComponentProfile {
  key: `g:${string}`;
  glyph: string;
  rawGlosses: string[];
  readings: string[];
  approvedDefaultLabels: ApprovedDefaultLabel[];
  sourceRefs: string[];
}

export type ComponentLabelCandidateDisposition =
  | 'already-approved'
  | 'candidate-review'
  | 'review-required'
  | 'withhold';

export interface ComponentLabelCandidate {
  schemaVersion: 1;
  key: `g:${string}`;
  glyph: string;
  rawGlosses: string[];
  readings: string[];
  labelCandidates: Array<{
    label: string;
    basis: 'meaning' | 'reading';
    confidence: 'high' | 'medium' | 'low';
    warnings: string[];
  }>;
  disposition: ComponentLabelCandidateDisposition;
  reasons: string[];
  sourceRefs: string[];
  targetSpecificUse: 'not-evaluated';
}

export interface PlannedComponentUse {
  /** Exact source occurrences represented by this one learner-facing token. */
  occurrenceIds: string[];
  profileKey: `g:${string}`;
  glyph: string;
  treePaths: string[];
  displayLabel: string;
  labelBasis: DisplayLabelBasis;
  role: RelationshipRole;
  evidenceRefs: string[];
}

export type RelationshipEvidenceStatus = 'candidate' | 'verified';
export type EvidenceLicenseStatus = 'review-required' | 'cleared';

/**
 * A target-specific semantic relationship fragment. This is deliberately a
 * short evidence-backed phrase, not learner-facing sentence prose.
 */
export interface TargetSemanticBridge {
  targetCharacter: string;
  componentOccurrenceIds: string[];
  phrase: string;
  sourceRefs: string[];
  evidenceStatus: RelationshipEvidenceStatus;
  licenseStatus: EvidenceLicenseStatus;
}

export interface RelationshipEvidenceSlot {
  id: string;
  targetCharacter: string;
  componentOccurrenceIds: string[];
  proposedRole: Exclude<RelationshipRole, 'unclassified'>;
  proposedDisplayLabel: string;
  labelBasis: DisplayLabelBasis;
  sourceRefs: string[];
  evidenceStatus: RelationshipEvidenceStatus;
  licenseStatus: EvidenceLicenseStatus;
  modernLearnerUsefulness: 'strong' | 'limited';
  semanticBridge?: TargetSemanticBridge;
}

/**
 * A small, target-scoped relation registry for visual formation frames.
 * It is deliberately not a global component meaning or role hint.
 */
export interface FormationVisualRelationSpec {
  kind: 'visual-relation';
  subjectOccurrenceId: string;
  relation: 'sit-on';
  objectOccurrenceId: string;
}

export interface FormationHookFrame {
  kind: 'formation';
  components: PlannedComponentUse[];
  evidenceSlotIds: string[];
  learnerUsefulness: 'strong' | 'limited';
  renderSpec?: FormationVisualRelationSpec;
  semanticBridge?: TargetSemanticBridge;
}

export interface OriginHookFrameV2 {
  kind: 'origin';
  components: PlannedComponentUse[];
  claim: string;
  sourceRefs: string[];
  licenseStatus: EvidenceLicenseStatus;
  modernVisibility: 'clear' | 'partial' | 'opaque';
}

export interface SceneHookFrame {
  kind: 'scene';
  components: PlannedComponentUse[];
  requiresHumanApproval: true;
  reviewStatus: 'approved' | 'review-required';
  sceneGuidance: string;
  /** Optional props that a scene may introduce; they are never component meanings. */
  allowedMnemonicProps?: string[];
  /** Props the reviewed scene guidance specifically asks the model to include. */
  requiredMnemonicProps?: string[];
  benchmarkHook?: string;
  benchmarkAhaConnection?: string;
}

export interface NoHookFrame {
  kind: 'none';
  reason:
    | 'insufficient-data'
    | 'unhelpful-components'
    | 'weak-modern-phonetic-relationship'
    | 'reviewed-no-useful-hook';
  detail: string;
}

export type HookFrame = FormationHookFrame | OriginHookFrameV2 | SceneHookFrame | NoHookFrame;

export interface CharacterHookPlanV2 {
  schemaVersion: 2;
  character: string;
  bookId: number;
  canonicalMeaning: string | null;
  targetDisplayLabel: string | null;
  canonicalPinyin: string | null;
  meaningReviewReasons: string[];
  decompositionVersion: string;
  decompositionRecordId: string | null;
  distribution: 'development-only-candidate';
  publishable: false;
  status: HookPlanStatus;
  frame: HookFrame;
  reviewReasons: string[];
}

export interface MemoryHookCandidateV2 {
  character: string;
  frameKind: Exclude<HookFrame['kind'], 'none'>;
  canonicalMeaning: string;
  hook: string;
  componentOccurrenceRefs: string[];
  mnemonicProps: string[];
  ahaConnection: string;
  evidenceRefs: string[];
}

export type HookStyleIssue =
  | 'awkward'
  | 'vague'
  | 'tautological'
  | 'component-list-only'
  | 'phonetic-literal-prop'
  | 'unsupported-relationship'
  | 'unhelpful-label';

export interface HookStyleReview {
  connectionType: 'concrete-scene' | 'supported-formation' | 'none';
  ahaConnection: string | null;
  issues: HookStyleIssue[];
  culturallyNeutral: boolean;
  accepted: boolean;
}

export interface DeterministicHookQualityIssue {
  code: string;
  severity: 'error' | 'flag';
  message: string;
}

export interface DeterministicHookQualityResult {
  character: string;
  valid: boolean;
  issues: DeterministicHookQualityIssue[];
}

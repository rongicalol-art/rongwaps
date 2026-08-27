import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { COMPONENT_LEXICON_BY_KEY } from '../../src/data/memoryHooks/componentLexicon';
import { PILOT_RELATIONSHIP_EVIDENCE_SLOTS } from '../../src/data/memoryHooks/pilotFrameReviews';
import type { RuntimeTreeNode } from '../../src/features/character-decomposition/runtimePack';

type Role = 'semantic' | 'phonetic' | 'visual' | 'origin' | 'none';
type DirectSupport = 'target-specific' | 'component-general-only' | 'structure-only' | 'no-support';
type Confidence = 'high' | 'medium' | 'low' | 'none';
type MetadataStatus = 'approved' | 'lexicon-only' | 'review-required' | 'unlabeled' | 'missing';

interface RuntimeRecord {
  r: string;
  s: number;
  t: RuntimeTreeNode;
}

interface RuntimeShard {
  records: Record<string, RuntimeRecord>;
}

interface RuntimeSource {
  id: string;
  version: string;
  redistributionStatus: string;
  license: string;
  attribution: string;
}

interface RuntimeManifest {
  version: string;
  recordCount: number;
  maximumTreeDepth: number;
  sources: RuntimeSource[];
  licenseGate: {
    status: string;
    publishable: false;
    openBlockers: string[];
    note: string;
  };
}

interface ComponentProfile {
  key: string;
  glyph: string;
  rawGlosses: string[];
  readings: string[];
  approvedDefaultLabels: Array<{ label: string; sourceRefs: string[] }>;
  sourceRefs: string[];
}

interface ComponentProfileArtifact {
  profiles: ComponentProfile[];
}

interface ReviewedLabel {
  glyph: string;
  proposedLabel: string;
  rawDefinitions: string[];
  readings: string[];
  metadataStatus: string;
  globalApproval: 'approved' | 'review-required';
  approvedLabel: string | null;
  approvalScope: string;
  targetSpecificUse: 'not-evaluated';
  affectedCharacters: string[];
  source: {
    proposalArtifact: string;
    packetHash: string;
    provider: string;
    model: string;
    proposalWarnings: string[];
  };
}

interface ReviewedLabelArtifact {
  entries: ReviewedLabel[];
}

interface FrozenMeaning {
  selectedMeaning: string | null;
  selectedPinyin: string | null;
  method: string;
  confidence: Confidence;
  lessonSpecificMeanings: Array<{
    vocabularyId: string;
    word: string;
    pinyin: string;
    meaning: string;
    standalone: boolean;
  }>;
  dictionaryDefinition: string | null;
  reviewReasons: string[];
}

interface FrozenPlan {
  character: string;
  canonicalMeaning: string | null;
  targetDisplayLabel: string | null;
  canonicalPinyin: string | null;
  status: string;
  frame: { kind: string; reason: string; detail?: string };
  meaningReviewReasons: string[];
  reviewReasons: string[];
  decompositionRecordId: string;
  decompositionSourceId: string;
  decompositionVersion: string;
}

interface QualityPlansArtifact {
  publishable: false;
  plans: Array<FrozenPlan & { meaningDecision?: FrozenMeaning }>;
}

interface BookPlan {
  character: string;
  meaningDecision: FrozenMeaning;
}

interface BookPlansArtifact {
  plans: BookPlan[];
}

interface StrictResult {
  character: string;
  assessmentGate: string;
  normalizedAssessment?: {
    decision?: string;
    issueCodes?: string[];
    reason?: string;
  } | null;
  deterministicValidation: {
    valid: boolean;
    issues: Array<{ code: string; message: string }>;
  };
  finalStatus: string;
}

interface StrictArtifact {
  records: StrictResult[];
}

interface MetadataView {
  glyph: string;
  rawGlosses: string[];
  readings: string[];
  labels: string[];
  approvedLabel: string | null;
  status: MetadataStatus;
  sourceRefs: string[];
  warnings: string[];
  labelProvenance: string[];
}

interface DirectComponent {
  glyph: string | null;
  path: string;
  kind: 'glyph' | 'unencoded-component' | 'unknown-component' | 'source-entity';
  token: string;
}

interface RelationshipFinding {
  componentOrGroup: string;
  proposedRole: Role;
  exactSourceEvidence: string[];
  sourceRefs: string[];
  directSupport: DirectSupport;
  confidence: Confidence;
  licensingProvenance: string[];
  safeForDeterministicFormationOrOrigin: boolean;
  missingBeforeApproval: string[];
  assessment: string;
}

interface GroupedObservation {
  component: string;
  existingPhase4Record: string | null;
  directChildTree: string | null;
  rawMetadata: string[];
  structuralStatus: 'encoded-group' | 'layout-group-only' | 'no-expandable-record';
  pedagogicalAssessment: string;
  relationshipSupport: 'none' | 'structure-only' | 'component-general-only';
  safeToUseAsFormationEvidence: false;
  missingBeforeApproval: string[];
}

interface ReconRecord {
  target: string;
  canonicalLearnerMeaning: string | null;
  canonicalPinyin: string | null;
  meaningDecision: {
    method: string;
    confidence: Confidence;
    lessonSpecificMeanings: FrozenMeaning['lessonSpecificMeanings'];
    dictionaryDefinition: string | null;
    reviewReasons: string[];
    mnemonicSuitability: 'good' | 'moderate' | 'poor' | 'unresolved';
    mnemonicSuitabilityReason: string;
  };
  phase4Record: {
    recordId: string | null;
    sourceId: string | null;
    sourceVersion: string | null;
    rawTree: string | null;
    sourceEvidence: string;
  };
  directVisibleComponents: DirectComponent[];
  componentMetadata: MetadataView[];
  currentFrozenPlan: {
    status: string;
    frameKind: string;
    frameReason: string;
    blockers: string[];
    meaningReviewReasons: string[];
    strictSceneAssessment: string;
  };
  relationshipFindings: RelationshipFinding[];
  groupedComponentObservations: GroupedObservation[];
  recommendedDisposition: {
    recommendation: 'review-meaning-first' | 'scene-only-review' | 'NoHook-unless-new-evidence';
    reason: string;
    deterministicFormationSafeNow: false;
    deterministicOriginSafeNow: false;
    remainWithheldIfEvidenceDoesNotAppear: true;
  };
}

interface ReconArtifact {
  schemaVersion: 1;
  artifact: 'book-1-target-relationship-evidence-reconnaissance-v1';
  distribution: 'development-only-analysis';
  publishable: false;
  hooksGenerated: false;
  apiCalls: 0;
  plannerChanged: false;
  metadataChanged: false;
  sourceInputs: string[];
  relationshipRegistryAudit: {
    registry: string;
    targetSpecificSlotTargets: string[];
    requestedTargetsWithSlots: string[];
    requestedTargetsWithoutSlots: string[];
    originEvidenceRecordsFound: number;
    note: string;
  };
  runtimeLicenseGate: RuntimeManifest['licenseGate'];
  targetCount: number;
  records: ReconRecord[];
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const RUNTIME_ROOT = resolve(ROOT, 'output/decomposition-runtime/phase4-candidate');
const RUNTIME_MANIFEST_PATH = resolve(RUNTIME_ROOT, 'manifest.json');
const PROFILE_PATH = resolve(OUTPUT_DIR, 'book-1-component-profiles-v2.json');
const REVIEW_LABEL_PATH = resolve(OUTPUT_DIR, 'book-1-component-label-review-v1.json');
const BOOK_PLANS_PATH = resolve(OUTPUT_DIR, 'book-1-plans.json');
const QUALITY_PLANS_PATH = resolve(OUTPUT_DIR, 'book-1-evaluation-batch-47-quality-plans-v2.json');
const STRICT_RESULTS_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-scene-viability-results-v2.json');
const OUTPUT_JSON_PATH = resolve(OUTPUT_DIR, 'book-1-target-relationship-evidence-reconnaissance-v1.json');
const OUTPUT_MD_PATH = resolve(OUTPUT_DIR, 'book-1-target-relationship-evidence-reconnaissance-v1.md');

const TARGETS = ['哥', '男', '的', '課', '買', '開', '學', '愛', '新', '看', '語', '得', '比', '會'];

const SOURCE_INPUTS = [
  'output/memory-hooks/book-1-plans.json',
  'output/memory-hooks/book-1-evaluation-batch-47-quality-plans-v2.json',
  'output/memory-hooks/book-1-frozen-47-scene-viability-results-v2.json',
  'output/memory-hooks/book-1-component-profiles-v2.json',
  'output/memory-hooks/book-1-component-label-review-v1.json',
  'src/data/memoryHooks/componentLexicon.ts',
  'src/data/memoryHooks/pilotFrameReviews.ts',
  'output/decomposition-runtime/phase4-candidate/manifest.json',
  'output/decomposition-runtime/phase4-candidate/records/shard-00.json … shard-63.json',
  'docs/CHARACTER_DECOMPOSITION_FOUNDATION.md',
  'docs/CHARACTER_DECOMPOSITION_PHASE3A_ACCEPTANCE.md',
];

interface TargetNote {
  suitability: ReconRecord['meaningDecision']['mnemonicSuitability'];
  suitabilityReason: string;
  checks: Array<{
    componentOrGroup: string;
    role: Role;
    exactEvidence: string;
    directSupport: DirectSupport;
    confidence: Confidence;
    assessment: string;
    missing: string[];
  }>;
  grouped: Record<string, {
    assessment: string;
    relationshipSupport: GroupedObservation['relationshipSupport'];
    missing: string[];
  }>;
  disposition: ReconRecord['recommendedDisposition'];
}

const NO_ORIGIN_EVIDENCE = 'No target-specific CharacterOriginEvidence record, curated origin claim, or source-backed historical claim is present in the frozen repository artifacts for this target.';
const NO_RELATIONSHIP_SLOT = 'No RelationshipEvidenceSlot or TargetSemanticBridge exists for this target in the repository registry. The registry currently contains slots only for 坐、情、請、媽、說.';

const TARGET_NOTES: Record<string, TargetNote> = {
  哥: {
    suitability: 'unresolved',
    suitabilityReason: 'The canonical label is dictionary-only (elder brother) with no Book 1 character-entry occurrence, so even a good-looking hook would start from a low-confidence target meaning.',
    checks: [
      { componentOrGroup: '可 + 可', role: 'semantic', exactEvidence: 'Both direct glyphs have raw glosses may/can/-able/possibly and a manually approved global label 可(can). No source connects either occurrence to elder brother; repetition is the only shared structure.', directSupport: 'component-general-only', confidence: 'none', assessment: 'No supported semantic relationship. Repetition of 可(can) does not explain 哥(elder brother).', missing: ['target-specific semantic evidence or a cleared origin claim', 'a learner-meaning decision backed by a Book 1 character entry'] },
      { componentOrGroup: '可', role: 'phonetic', exactEvidence: 'Component reading is kě; target reading is gē. No target-specific phonetic slot exists.', directSupport: 'no-support', confidence: 'none', assessment: 'Do not infer a phonetic role.', missing: ['source-backed phonetic relationship with evidence beyond the readings'] },
      { componentOrGroup: '可 + 可', role: 'visual', exactEvidence: 'Phase 4 CJKVI/CHISE IDS record U+54E5:alt-0:neutral is ⿱可可. The record asserts layout only.', directSupport: 'structure-only', confidence: 'none', assessment: 'The visible repetition is structural, not a useful target-specific visual relation.', missing: ['reviewed visual relation that explains elder brother without extra assumptions'] },
    ],
    grouped: { 可: { assessment: '可 is already the direct child. Its existing expansion to 丁 + 口 is a structural expansion, not a supported relationship for 哥; 丁 also lacks an approved learner label.', relationshipSupport: 'structure-only', missing: ['approved 丁 label if expansion is inspected', 'target-specific usefulness evidence'] } },
    disposition: { recommendation: 'NoHook-unless-new-evidence', reason: 'No semantic, phonetic, visual, or origin relationship is supported; keep withheld.', deterministicFormationSafeNow: false, deterministicOriginSafeNow: false, remainWithheldIfEvidenceDoesNotAppear: true },
  },
  男: {
    suitability: 'moderate',
    suitabilityReason: 'The meaning male is a valid lexical target, but a scene linking field and strength to gender would require a stereotype or an unsupported social assumption.',
    checks: [
      { componentOrGroup: '田 + 力', role: 'semantic', exactEvidence: '田 has raw field/farm/arable land/cultivated and approved 田(field); 力 has raw strength/power/capability/influence and approved 力(strength). No target-specific bridge or source claim explains male.', directSupport: 'component-general-only', confidence: 'none', assessment: 'The labels are real, but the target connection is not supported and must not rely on who works in fields.', missing: ['target-specific semantic/origin evidence that is neutral and source-backed'] },
      { componentOrGroup: '田 + 力', role: 'phonetic', exactEvidence: 'Readings are tián and lì; target reading is nán. No phonetic evidence slot exists.', directSupport: 'no-support', confidence: 'none', assessment: 'No phonetic route is supported.', missing: ['source-backed phonetic relationship'] },
      { componentOrGroup: '田 + 力', role: 'origin', exactEvidence: `${NO_ORIGIN_EVIDENCE} The IDS tree alone is not an etymology claim.`, directSupport: 'structure-only', confidence: 'none', assessment: 'A historical/ideographic explanation may be worth researching separately, but it cannot be used from this repository snapshot.', missing: ['licensed source-backed origin claim with exact meaning and component relation'] },
    ],
    grouped: { 田: { assessment: '田 expands to 冂 + 土 and 力 expands to stroke-like pieces. These existing structures do not improve the target relation and would add unsupported assumptions.', relationshipSupport: 'structure-only', missing: ['no deeper expansion should be attempted without a target-specific evidence reason'] }, 力: { assessment: '力 is a direct component whose expansion is stroke-level; no pedagogically safer grouped component is supplied.', relationshipSupport: 'structure-only', missing: ['none beyond target-specific evidence'] } },
    disposition: { recommendation: 'NoHook-unless-new-evidence', reason: 'The strict Scene gate correctly rejects a stereotype-dependent connection; no deterministic Formation/Origin route is currently safe.', deterministicFormationSafeNow: false, deterministicOriginSafeNow: false, remainWithheldIfEvidenceDoesNotAppear: true },
  },
  的: {
    suitability: 'poor',
    suitabilityReason: 'The selected meaning is a grammatical possessive particle. White and spoon are concrete meanings but do not explain this function-word use.',
    checks: [
      { componentOrGroup: '白 + 勺', role: 'semantic', exactEvidence: '白 has raw white/clear/pure/unblemished/bright and approved 白(white); 勺 has raw spoon/ladle/unit of volume and approved 勺(spoon). No source connects either to the possessive-particle function.', directSupport: 'component-general-only', confidence: 'none', assessment: 'No semantic bridge is supported; gloss overlap would be invented.', missing: ['target-specific evidence for the grammatical function, if any exists'] },
      { componentOrGroup: '白 + 勺', role: 'phonetic', exactEvidence: 'Readings are bái and sháo; target reading is de. No target-specific phonetic evidence exists.', directSupport: 'no-support', confidence: 'none', assessment: 'No phonetic route is supported.', missing: ['source-backed phonetic relationship'] },
      { componentOrGroup: '白 + 勺', role: 'origin', exactEvidence: NO_ORIGIN_EVIDENCE, directSupport: 'structure-only', confidence: 'none', assessment: 'Do not turn the structural tree into a historical explanation.', missing: ['licensed source-backed origin claim, if the function-word history is genuinely useful'] },
    ],
    grouped: { 白: { assessment: '白 expands through 日 and unknown/stroke nodes; no target-specific relation appears.', relationshipSupport: 'structure-only', missing: ['none without new evidence'] }, 勺: { assessment: '勺 expands to 勹 + 丶; neither is approved as a useful target-specific explanation.', relationshipSupport: 'structure-only', missing: ['approved labels and target-specific usefulness evidence'] } },
    disposition: { recommendation: 'NoHook-unless-new-evidence', reason: 'The current target is a grammatical function word and the supplied concrete components do not explain it.', deterministicFormationSafeNow: false, deterministicOriginSafeNow: false, remainWithheldIfEvidenceDoesNotAppear: true },
  },
  課: {
    suitability: 'poor',
    suitabilityReason: 'The frozen canonical label subject is low-confidence and does not align with the two Book 1 senses class and measure word for lessons.',
    checks: [
      { componentOrGroup: '言', role: 'semantic', exactEvidence: '言 has raw words/speech/to speak/to say, an approved speech label, and a generic semantic role hint in componentLexicon. No target-specific bridge connects speech to 課 as subject/class.', directSupport: 'component-general-only', confidence: 'none', assessment: '“Speech about fruit” is not evidence that the character means subject or class; it is an arbitrary scene.', missing: ['canonical meaning decision aligned to Book 1', 'target-specific semantic bridge or cleared origin evidence'] },
      { componentOrGroup: '果', role: 'phonetic', exactEvidence: '果 has raw fruit/nut/result and approved 果(fruit); reading guǒ does not establish a relationship to target reading kè. No phonetic slot exists.', directSupport: 'component-general-only', confidence: 'none', assessment: 'No phonetic relationship is supported.', missing: ['source-backed phonetic evidence'] },
      { componentOrGroup: '言 + 果', role: 'origin', exactEvidence: NO_ORIGIN_EVIDENCE, directSupport: 'structure-only', confidence: 'none', assessment: 'The direct IDS structure is not historical evidence.', missing: ['cleared source claim for the exact target meaning selected'] },
    ],
    grouped: { 果: { assessment: '果 expands to 日 + 木, but this is existing structure only; it does not make class/subject intuitive.', relationshipSupport: 'structure-only', missing: ['canonical meaning resolution and target-specific evidence'] } },
    disposition: { recommendation: 'review-meaning-first', reason: 'Resolve the learner-facing meaning before deciding whether any relationship is worth researching; current subject framing should remain withheld.', deterministicFormationSafeNow: false, deterministicOriginSafeNow: false, remainWithheldIfEvidenceDoesNotAppear: true },
  },
  買: {
    suitability: 'moderate',
    suitabilityReason: 'Buy is a concrete lexical verb, but the current labels net and shell only suggest an indirect shopping scene and do not establish why the character means buy.',
    checks: [
      { componentOrGroup: '貝', role: 'semantic', exactEvidence: '貝 raw metadata includes sea shell, money, currency; the reviewed learner label is 貝(shell). No target-specific evidence authorizes using money/currency or a historical shell-money claim for 買.', directSupport: 'component-general-only', confidence: 'none', assessment: 'The shell label is globally safe, but it is not evidence of a buying relationship.', missing: ['explicit source-backed semantic/origin relationship; do not promote money/currency from raw glosses'] },
      { componentOrGroup: '罒 + 貝', role: 'visual', exactEvidence: 'Direct Phase 4 tree is ⿱罒貝. 罒 has net/network and is globally labeled net; the only strict Scene result was scene-weak with weak-causal-link.', directSupport: 'structure-only', confidence: 'low', assessment: 'A net-and-shell situation is indirect and is not a deterministic formation explanation.', missing: ['a reviewed target-specific visual relation with a direct causal link'] },
      { componentOrGroup: '貝', role: 'origin', exactEvidence: `${NO_ORIGIN_EVIDENCE} Raw shell/money glosses are not a historical source claim.`, directSupport: 'component-general-only', confidence: 'none', assessment: 'Do not infer the shell-to-money-to-buy story from metadata alone.', missing: ['licensed historical evidence and a learner-safe claim'] },
    ],
    grouped: { 貝: { assessment: '貝 expands to 目 + 八; 罒 expands through an unknown node. The deeper pieces do not provide a safer target relation.', relationshipSupport: 'structure-only', missing: ['no deeper expansion without target-specific evidence'] } },
    disposition: { recommendation: 'scene-only-review', reason: 'If retained at all, this is a Scene-only review candidate; it is not a Formation/Origin candidate and should not be forced.', deterministicFormationSafeNow: false, deterministicOriginSafeNow: false, remainWithheldIfEvidenceDoesNotAppear: true },
  },
  開: {
    suitability: 'moderate',
    suitabilityReason: 'Open is a concrete lexical verb, but the direct component 开(open) repeats the target meaning and 門(door) adds context without an independent aha connection.',
    checks: [
      { componentOrGroup: '門', role: 'semantic', exactEvidence: '門 has raw gate/door/entrance/opening and an approved door label. The repository contains no target-specific semantic bridge for 開.', directSupport: 'component-general-only', confidence: 'none', assessment: 'Door is context, not evidence of the full target relation.', missing: ['target-specific semantic bridge or source-backed origin evidence'] },
      { componentOrGroup: '开', role: 'phonetic', exactEvidence: '开 has raw to open/to start/to initiate/to begin, approved global label open, and reading kāi, matching target reading kāi. The repository still has no phonetic relationship slot.', directSupport: 'component-general-only', confidence: 'none', assessment: 'Reading similarity alone is not enough to assign a phonetic role.', missing: ['source-backed phonetic relationship and a non-tautological pedagogical explanation'] },
      { componentOrGroup: '門 + 开', role: 'visual', exactEvidence: 'Direct Phase 4 tree is ⿵門开. Strict Scene v2 marked it scene-weak with issue tautological.', directSupport: 'structure-only', confidence: 'low', assessment: 'Door plus open is a tautological frame: 开(open) simply repeats 開(open).', missing: ['a reviewed visual relation where both supplied tokens add independent value'] },
    ],
    grouped: { 門: { assessment: '門 expands to unencoded/stroke-like nodes; no safer grouped component is available.', relationshipSupport: 'structure-only', missing: ['none without target-specific evidence'] }, 开: { assessment: '开 expands to 一 + 廾; this does not repair the tautology and introduces unapproved structure pieces.', relationshipSupport: 'structure-only', missing: ['no deeper expansion without a specific evidence-backed reason'] } },
    disposition: { recommendation: 'scene-only-review', reason: 'A future scene could be tested separately, but no deterministic Formation/Origin hook is supported and the strict baseline is weak.', deterministicFormationSafeNow: false, deterministicOriginSafeNow: false, remainWithheldIfEvidenceDoesNotAppear: true },
  },
  學: {
    suitability: 'good',
    suitabilityReason: 'Learn/study is a construction-core Book 1 verb, but the direct group 𦥯 has no learner label and its repository note only describes component membership.',
    checks: [
      { componentOrGroup: '𦥯 + 子', role: 'semantic', exactEvidence: '子 has raw son/child/seed/egg/fruit/small thing and an approved child label. 𦥯 raw metadata says only “Component cluster used in 學, 覺, 攪, etc.”; it does not state a semantic relation to learn.', directSupport: 'component-general-only', confidence: 'none', assessment: 'Child is a supplied meaning, but no target-specific bridge connects it to learning.', missing: ['target-specific semantic bridge or source-backed formation evidence', 'approved learner label for 𦥯'] },
      { componentOrGroup: '𦥯', role: 'visual', exactEvidence: 'Phase 4 keeps 𦥯 as a separate encoded direct child of 學; docs/CHARACTER_DECOMPOSITION_FOUNDATION.md and the Phase 3A acceptance document establish this as an independently expandable structural record.', directSupport: 'structure-only', confidence: 'high', assessment: 'The grouped component is structurally meaningful, but the source does not provide a learner-facing visual meaning or historical claim.', missing: ['approved label for 𦥯', 'target-specific usefulness/evidence review'] },
      { componentOrGroup: '𦥯 + 子', role: 'origin', exactEvidence: NO_ORIGIN_EVIDENCE, directSupport: 'structure-only', confidence: 'none', assessment: 'Do not turn the 𦥯 hierarchy into etymology.', missing: ['licensed source-backed origin claim matching 學(learn)'] },
    ],
    grouped: { 𦥯: { assessment: '𦥯 is the strongest existing grouped-component candidate in this set: it has its own Phase 4 record and a cluster note. The note is membership/structure metadata, not a relationship to the meaning learn.', relationshipSupport: 'structure-only', missing: ['approved learner label and target-specific evidence before any frame'] }, 子: { assessment: '子 is already a direct learner-labeled component; its internal 了 + 一 expansion is not useful for this target.', relationshipSupport: 'structure-only', missing: ['none; do not expand merely to create a hook'] } },
    disposition: { recommendation: 'NoHook-unless-new-evidence', reason: 'Keep withheld until 𦥯 receives a reviewed learner label and a target-specific relationship or source-backed origin claim; do not recursively flatten it.', deterministicFormationSafeNow: false, deterministicOriginSafeNow: false, remainWithheldIfEvidenceDoesNotAppear: true },
  },
  愛: {
    suitability: 'good',
    suitabilityReason: 'Love is a construction-core lexical verb, but the selected direct tree contains an unlabeled group 𢖻 and two small structural pieces without a target-specific relation.',
    checks: [
      { componentOrGroup: '𢖻 → 心', role: 'semantic', exactEvidence: 'The direct Phase 4 child 𢖻 expands to 心 + 夊. 心 has raw heart/mind/soul and an approved heart label; 𢖻 itself has no raw gloss or reading. No target-specific bridge connects heart to 愛(love) in the repository.', directSupport: 'component-general-only', confidence: 'none', assessment: 'A heart-to-love association would be a plausible mnemonic idea, but it is not supported by this evidence registry and cannot be promoted automatically.', missing: ['approved relation evidence for the exact target and selected component path', 'approved label for 𢖻 or an explicitly reviewed one-level pedagogical expansion'] },
      { componentOrGroup: '爫 + 冖 + 𢖻', role: 'visual', exactEvidence: 'Direct Phase 4 tree is ⿱(⿱爫冖)𢖻. 爫 and 冖 have general raw metadata (claws; cover); 𢖻 is unlabeled. The nested layout is structural only.', directSupport: 'structure-only', confidence: 'none', assessment: 'No safe visual relation is available without inventing meanings for the group or treating the layout as history.', missing: ['reviewed labels and target-specific visual evidence'] },
      { componentOrGroup: '𢖻', role: 'origin', exactEvidence: NO_ORIGIN_EVIDENCE, directSupport: 'structure-only', confidence: 'none', assessment: 'The existing expansion to 心 + 夊 is not an origin claim.', missing: ['licensed origin evidence with exact component scope'] },
    ],
    grouped: { 𢖻: { assessment: '𢖻 is an encoded intermediate with an existing record, but it has no raw learner metadata. Its expansion to 心 + 夊 is available; recursive use is not justified by current evidence.', relationshipSupport: 'structure-only', missing: ['approved label or reviewed one-level frame', 'target-specific evidence'] } },
    disposition: { recommendation: 'NoHook-unless-new-evidence', reason: 'Do not flatten 𢖻 merely to obtain 心(heart); with current evidence no deterministic Formation/Origin hook is safe.', deterministicFormationSafeNow: false, deterministicOriginSafeNow: false, remainWithheldIfEvidenceDoesNotAppear: true },
  },
  新: {
    suitability: 'good',
    suitabilityReason: 'New is a construction-core Book 1 adjective, but the direct source tree is 亲 + 斤; the familiar tree-and-axe explanation is not a supported direct relationship in the current repository.',
    checks: [
      { componentOrGroup: '亲 + 斤', role: 'semantic', exactEvidence: '亲 has raw relatives/parents/intimate/hazelnut tree and no approved learner label; 斤 has raw catty/axe/keen/shrewd and an existing lexicon label axe, but no target-specific relation is stored.', directSupport: 'component-general-only', confidence: 'none', assessment: 'The labels do not establish why 新 means new; a tree-and-axe story would require a deeper expansion and an unsupported relation.', missing: ['approved 亲 label if used', 'target-specific semantic/origin evidence'] },
      { componentOrGroup: '斤', role: 'phonetic', exactEvidence: '斤 reading is jīn and target 新 reading is xīn. The resemblance is not enough to infer a phonetic role, and no slot exists.', directSupport: 'component-general-only', confidence: 'none', assessment: 'No phonetic relationship is supported.', missing: ['source-backed phonetic evidence'] },
      { componentOrGroup: '亲 + 斤', role: 'origin', exactEvidence: `${NO_ORIGIN_EVIDENCE} The Phase 4 record is an IDS structure record, not an etymology source.`, directSupport: 'structure-only', confidence: 'none', assessment: 'Do not use the popular tree-and-axe story as historical fact or as a deterministic OriginFrame.', missing: ['licensed historical source claim with exact traditional formation and learner meaning'] },
    ],
    grouped: { 亲: { assessment: '亲 is an existing encoded group with ambiguous raw meanings; it expands to 立 + 朩, but 朩 has no raw metadata. Expansion does not safely recover a tree label.', relationshipSupport: 'component-general-only', missing: ['reviewed 亲 label or evidence-backed alternative frame'] }, 斤: { assessment: '斤 is an existing group with stroke-like expansion. Its lexicon label axe is not target-specific evidence.', relationshipSupport: 'component-general-only', missing: ['target-specific evidence; no recursive expansion needed'] } },
    disposition: { recommendation: 'NoHook-unless-new-evidence', reason: 'Keep the direct frame withheld; research origin only if a licensed source-backed claim is supplied, not from the tree alone.', deterministicFormationSafeNow: false, deterministicOriginSafeNow: false, remainWithheldIfEvidenceDoesNotAppear: true },
  },
  看: {
    suitability: 'good',
    suitabilityReason: 'Look/read/watch is a construction-core Book 1 verb, but direct 龵 is unencoded/unlabeled and 目 alone cannot explain the full target.',
    checks: [
      { componentOrGroup: '目', role: 'semantic', exactEvidence: '目 has raw eye/to look/to see/division/topic and an approved eye label. The repository has no target-specific semantic bridge connecting 目 to 看.', directSupport: 'component-general-only', confidence: 'none', assessment: 'Eye is relevant as a general label, but gloss overlap is not target-specific evidence.', missing: ['target-specific semantic or visual evidence and a usable label for 龵'] },
      { componentOrGroup: '龵 + 目', role: 'visual', exactEvidence: 'Phase 4 direct tree is ⿱龵目; 龵 has no raw gloss, reading, or approved label. The structure alone does not prove “hand over eye” as a relationship.', directSupport: 'structure-only', confidence: 'none', assessment: 'A hand-over-eye mnemonic cannot be used until 龵 is identified and the relation is reviewed.', missing: ['authoritative identity/meaning for 龵', 'target-specific visual evidence'] },
      { componentOrGroup: '龵 + 目', role: 'origin', exactEvidence: NO_ORIGIN_EVIDENCE, directSupport: 'structure-only', confidence: 'none', assessment: 'Do not treat the unencoded shape or layout as historical formation.', missing: ['licensed source-backed origin claim'] },
    ],
    grouped: { 目: { assessment: '目 expands to 口 + 二; this does not improve the target relation.', relationshipSupport: 'structure-only', missing: ['none without target-specific evidence'] }, 龵: { assessment: '龵 has no separate usable metadata in the repository; it is the blocking direct component.', relationshipSupport: 'none', missing: ['authoritative component identity and learner label'] } },
    disposition: { recommendation: 'NoHook-unless-new-evidence', reason: 'Withhold until 龵 is identified and a target-specific visual/semantic relationship is reviewed; do not substitute deeper 目 descendants.', deterministicFormationSafeNow: false, deterministicOriginSafeNow: false, remainWithheldIfEvidenceDoesNotAppear: true },
  },
  語: {
    suitability: 'poor',
    suitabilityReason: 'The canonical label words is dictionary-only with no Book 1 character entry, and language/words is abstract enough that a concrete scene would need a real component relationship.',
    checks: [
      { componentOrGroup: '言', role: 'semantic', exactEvidence: '言 has raw words/speech/to speak/to say, an approved speech label, and a generic semantic role hint. No target-specific bridge explains 語(words/language).', directSupport: 'component-general-only', confidence: 'none', assessment: 'Speech-to-words is gloss overlap/general knowledge, not a reviewed target-specific relationship.', missing: ['Book 1 meaning/entry evidence', 'target-specific semantic bridge or origin evidence'] },
      { componentOrGroup: '吾', role: 'phonetic', exactEvidence: '吾 has raw I/my/our/to resist/to impede, reading wú, and a review-only proposal I; target reading is yǔ. No phonetic slot exists.', directSupport: 'component-general-only', confidence: 'none', assessment: 'No phonetic relationship is supported.', missing: ['global label decision and source-backed phonetic evidence'] },
      { componentOrGroup: '言 + 吾', role: 'origin', exactEvidence: NO_ORIGIN_EVIDENCE, directSupport: 'structure-only', confidence: 'none', assessment: 'The direct IDS structure cannot supply an origin explanation.', missing: ['learner-meaning decision and licensed origin evidence'] },
    ],
    grouped: { 吾: { assessment: '吾 expands to 五 + 口, but 五 is not represented with usable metadata and the alternate depth does not clarify words/language.', relationshipSupport: 'structure-only', missing: ['global 吾 label decision only if still useful; target-specific evidence'] } },
    disposition: { recommendation: 'review-meaning-first', reason: 'Resolve the dictionary-only target meaning first; under the current meaning and evidence, recommend NoHook.', deterministicFormationSafeNow: false, deterministicOriginSafeNow: false, remainWithheldIfEvidenceDoesNotAppear: true },
  },
  得: {
    suitability: 'poor',
    suitabilityReason: 'The Book 1 target is the grammatical complement marker de, not the concrete dictionary sense obtain/get. This function-word meaning is a poor direct scene target.',
    checks: [
      { componentOrGroup: '彳 + 㝵', role: 'semantic', exactEvidence: '彳 has raw “to step with the left foot” and approved step; 㝵 has raw obtain/get/acquire and “ancient form of 得,” but remains globally review-required. No bridge connects these to the complement-marker function.', directSupport: 'component-general-only', confidence: 'none', assessment: 'The raw glosses describe component metadata, not a target-specific semantic relationship.', missing: ['global 㝵 decision', 'target-specific evidence for the grammatical function, if available'] },
      { componentOrGroup: '㝵', role: 'phonetic', exactEvidence: '㝵 reading is dé and target reading is de; the raw “ancient form of 得” note is not a phonetic-role assertion. No phonetic slot exists.', directSupport: 'component-general-only', confidence: 'none', assessment: 'Do not infer a phonetic role from a related form or similar reading.', missing: ['source-backed phonetic relationship'] },
      { componentOrGroup: '彳 + 㝵', role: 'origin', exactEvidence: NO_ORIGIN_EVIDENCE, directSupport: 'structure-only', confidence: 'none', assessment: 'The raw variant note and Phase 4 tree do not constitute a licensed historical claim.', missing: ['meaning-aligned origin evidence, with explicit scope and provenance'] },
    ],
    grouped: { 㝵: { assessment: '㝵 expands to 旦 + 寸, but the raw “ancient form of 得” note does not make those descendants a learner-safe explanation.', relationshipSupport: 'component-general-only', missing: ['global label decision and target-specific evidence'] } },
    disposition: { recommendation: 'NoHook-unless-new-evidence', reason: 'Keep the grammatical target withheld; do not use the dictionary sense obtain as a replacement meaning.', deterministicFormationSafeNow: false, deterministicOriginSafeNow: false, remainWithheldIfEvidenceDoesNotAppear: true },
  },
  比: {
    suitability: 'poor',
    suitabilityReason: 'The Book 1 target is the comparative marker than, an abstract grammatical function rather than the concrete core sense compare.',
    checks: [
      { componentOrGroup: '匕 + 匕', role: 'visual', exactEvidence: 'Make Me a Hanzi Phase 4 record 比 has direct structure ⿰匕匕. 匕 raw glosses compete between spoon/ladle and knife/dirk and remain globally review-required.', directSupport: 'component-general-only', confidence: 'none', assessment: 'Repeated ambiguous components do not by themselves explain comparison or than.', missing: ['global 匕 label decision', 'target-specific visual/semantic evidence'] },
      { componentOrGroup: '匕', role: 'phonetic', exactEvidence: '匕 reading bǐ matches 比 bǐ, but no target-specific phonetic role is stored. Reading identity alone is not sufficient.', directSupport: 'component-general-only', confidence: 'none', assessment: 'Do not infer phonetic function merely from identical readings.', missing: ['source-backed phonetic relationship with pedagogical usefulness'] },
      { componentOrGroup: '匕 + 匕', role: 'origin', exactEvidence: NO_ORIGIN_EVIDENCE, directSupport: 'structure-only', confidence: 'none', assessment: 'The repeated shape is not an origin claim.', missing: ['licensed source-backed origin evidence for the comparative function'] },
    ],
    grouped: { 匕: { assessment: 'Each 匕 expands to 乚 + 一; this is stroke-level structure and does not make than/comparison intuitive.', relationshipSupport: 'structure-only', missing: ['none; do not expand further merely to create a hook'] } },
    disposition: { recommendation: 'NoHook-unless-new-evidence', reason: 'Keep the abstract grammatical meaning withheld; a repeated spoon/knife label is not a safe mnemonic.', deterministicFormationSafeNow: false, deterministicOriginSafeNow: false, remainWithheldIfEvidenceDoesNotAppear: true },
  },
  會: {
    suitability: 'poor',
    suitabilityReason: 'The frozen canonical meaning assemble is the dictionary core, while Book 1 teaches can and will. This is both a meaning-selection problem and a grammatical/modal target.',
    checks: [
      { componentOrGroup: '亼', role: 'semantic', exactEvidence: '亼 has raw assemble/gather together and a manually approved global label 亼(assemble). No target-specific bridge connects it to the Book 1 meanings can/will; using assemble would be tautological with the dictionary gloss.', directSupport: 'component-general-only', confidence: 'none', assessment: 'A global label is not evidence of target usefulness, especially while the canonical target meaning is unresolved.', missing: ['canonical Book 1 meaning decision', 'target-specific evidence for the selected meaning'] },
      { componentOrGroup: '亼 + 𭥴', role: 'visual', exactEvidence: 'Phase 4 CJKVI/CHISE record U+6703:alt-0:neutral is ⿱亼𭥴. 𭥴 has no raw gloss, reading, or approved label; its expansion to 囗 + ⺌ + 日 is structural only.', directSupport: 'structure-only', confidence: 'none', assessment: 'No useful visual relation is available from the supplied metadata.', missing: ['usable label for 𭥴 and target-specific usefulness evidence'] },
      { componentOrGroup: '亼 + 𭥴', role: 'origin', exactEvidence: NO_ORIGIN_EVIDENCE, directSupport: 'structure-only', confidence: 'none', assessment: 'Do not infer assembly, meeting, or modal meanings from the IDS tree.', missing: ['meaning-aligned licensed origin claim'] },
    ],
    grouped: { 𭥴: { assessment: '𭥴 is an encoded group with no raw metadata; its descendants include unapproved/unknown pieces. This is not a safe rescue route.', relationshipSupport: 'structure-only', missing: ['authoritative component metadata and target-specific evidence'] }, 亼: { assessment: '亼 expands to 人 + 一; the direct label assemble is already a target-meaning mismatch for Book 1 and should not drive a hook.', relationshipSupport: 'component-general-only', missing: ['canonical meaning resolution'] } },
    disposition: { recommendation: 'review-meaning-first', reason: 'Resolve whether the learner target is can or will before any evidence research; under the current frozen meaning and data, recommend NoHook.', deterministicFormationSafeNow: false, deterministicOriginSafeNow: false, remainWithheldIfEvidenceDoesNotAppear: true },
  },
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function runtimeChildren(node: RuntimeTreeNode): RuntimeTreeNode[] {
  if (node[0] === 's') return node[2];
  if (node[0] === 'g' && node.length === 3) return node[2];
  return [];
}

function runtimeGlyph(node: RuntimeTreeNode): string | null {
  return node[0] === 'g' ? node[1] : null;
}

function formatTree(node: RuntimeTreeNode): string {
  if (node[0] === 's') return `${node[1]}(${node[2].map(formatTree).join(', ')})`;
  if (node[0] === 'g') return node[1];
  if (node[0] === 'u') return `u:${node[1]}${node.length === 3 ? `:${node[2]}` : ''}`;
  if (node[0] === '?') return node[1] ? `?:${node[1]}` : '?';
  return `e:${node[1]}`;
}

function nodeKind(node: RuntimeTreeNode): DirectComponent['kind'] {
  if (node[0] === 'g') return 'glyph';
  if (node[0] === 'u') return 'unencoded-component';
  if (node[0] === '?') return 'unknown-component';
  return 'source-entity';
}

function directVisibleComponents(root: RuntimeTreeNode, metadata: Map<string, MetadataView>): DirectComponent[] {
  const result: DirectComponent[] = [];
  function visit(node: RuntimeTreeNode, path: string): void {
    if (node[0] === 's') {
      node[2].forEach((child, index) => visit(child, path ? `${path}.${index}` : `${index}`));
      return;
    }
    const glyph = runtimeGlyph(node);
    const label = glyph ? metadata.get(glyph)?.approvedLabel : null;
    const display = glyph && label ? `${glyph}(${label})` : glyph ?? formatTree(node);
    result.push({ glyph, path, kind: nodeKind(node), token: display });
  }
  visit(root, '');
  return result;
}

function sourceStatusLabel(status: MetadataStatus): string {
  return status === 'approved' ? 'approved' : status === 'lexicon-only' ? 'lexicon-only' : status;
}

function buildMetadataMap(
  profiles: ComponentProfileArtifact,
  reviewed: ReviewedLabelArtifact,
): Map<string, MetadataView> {
  const result = new Map<string, MetadataView>();
  for (const profile of profiles.profiles) {
    const profileLabels = profile.approvedDefaultLabels.map((label) => label.label);
    result.set(profile.glyph, {
      glyph: profile.glyph,
      rawGlosses: profile.rawGlosses,
      readings: profile.readings,
      labels: profileLabels,
      approvedLabel: profileLabels[0] ?? null,
      status: profileLabels.length > 0 ? 'approved' : profile.rawGlosses.length > 0 || profile.readings.length > 0 ? 'unlabeled' : 'missing',
      sourceRefs: profile.sourceRefs,
      warnings: [],
      labelProvenance: profileLabels.length > 0 ? ['project-curated-component-defaults-v2'] : [],
    });
  }
  for (const entry of reviewed.entries) {
    const current = result.get(entry.glyph) ?? {
      glyph: entry.glyph,
      rawGlosses: [],
      readings: [],
      labels: [],
      approvedLabel: null,
      status: 'missing' as MetadataStatus,
      sourceRefs: [],
      warnings: [],
      labelProvenance: [],
    };
    const label = entry.approvedLabel ?? entry.proposedLabel;
    result.set(entry.glyph, {
      ...current,
      rawGlosses: entry.rawDefinitions.length > 0 ? entry.rawDefinitions : current.rawGlosses,
      readings: entry.readings.length > 0 ? entry.readings : current.readings,
      labels: label ? [label] : current.labels,
      approvedLabel: entry.approvedLabel ?? current.approvedLabel,
      status: entry.globalApproval === 'approved' && entry.approvedLabel ? 'approved' : 'review-required',
      sourceRefs: [...new Set([...current.sourceRefs, 'book-1-component-label-review-v1'])],
      warnings: entry.source.proposalWarnings,
      labelProvenance: [...new Set([...current.labelProvenance, entry.approvedLabel ? `manual-review:${entry.approvalScope}` : 'deepseek-proposal-review-only'])],
    });
  }
  for (const [key, entry] of COMPONENT_LEXICON_BY_KEY) {
    const glyph = key.slice(2);
    const current = result.get(glyph) ?? {
      glyph,
      rawGlosses: [],
      readings: [],
      labels: [],
      approvedLabel: null,
      status: 'missing' as MetadataStatus,
      sourceRefs: [],
      warnings: [],
      labelProvenance: [],
    };
    const safeLabels = entry.senses.filter((sense) => sense.safeForMemoryAid).map((sense) => sense.label);
    if (safeLabels.length === 0) continue;
    const approved = current.approvedLabel ?? null;
    result.set(glyph, {
      ...current,
      labels: [...new Set([...current.labels, ...safeLabels])],
      approvedLabel: approved,
      status: approved ? current.status : current.status === 'missing' || current.status === 'unlabeled' ? 'lexicon-only' : current.status,
      sourceRefs: [...new Set([...current.sourceRefs, 'src/data/memoryHooks/componentLexicon.ts'])],
      labelProvenance: [...new Set([...current.labelProvenance, 'project-curated-component-labels-v1'])],
    });
  }
  return result;
}

function buildRuntimeMap(): { records: Map<string, RuntimeRecord>; manifest: RuntimeManifest } {
  const manifest = readJson<RuntimeManifest>(RUNTIME_MANIFEST_PATH);
  const records = new Map<string, RuntimeRecord>();
  for (let shard = 0; shard < 64; shard += 1) {
    const path = resolve(RUNTIME_ROOT, `records/shard-${String(shard).padStart(2, '0')}.json`);
    const shardData = readJson<RuntimeShard>(path);
    for (const [character, record] of Object.entries(shardData.records)) records.set(character, record);
  }
  return { records, manifest };
}

function metadataEvidence(metadata: MetadataView): string {
  const glosses = metadata.rawGlosses.length > 0 ? metadata.rawGlosses.join('; ') : 'none';
  const readings = metadata.readings.length > 0 ? metadata.readings.join('; ') : 'none';
  const labels = metadata.labels.length > 0 ? metadata.labels.map((label) => `${metadata.glyph}(${label})`).join(', ') : 'none';
  return `g:${metadata.glyph} rawGlosses=[${glosses}], readings=[${readings}], available labels=[${labels}], metadataStatus=${sourceStatusLabel(metadata.status)}, sourceRefs=[${metadata.sourceRefs.join(', ') || 'none'}]`;
}

function sourceRefsForFinding(metadata: MetadataView[], target: string): string[] {
  return [...new Set([
    ...metadata.flatMap((item) => item.sourceRefs),
    'output/decomposition-runtime/phase4-candidate/manifest.json',
    'src/data/memoryHooks/pilotFrameReviews.ts',
    `target-specific-registry:no-slot:${target}`,
  ])];
}

function licenseNotes(sourceId: string | null, metadata: MetadataView[]): string[] {
  const notes = [
    'This is a development-only reconnaissance artifact; no relationship is cleared for publication.',
    `Component metadata provenance is ${metadata.map((item) => item.sourceRefs.join('/')).filter(Boolean).join('; ') || 'unresolved/missing'}; the profile artifact does not state a redistribution license.`,
  ];
  if (sourceId === 'cjkvi-ids') notes.push('Phase 4 CJKVI/CHISE structural source is license-gated blocked (inherited/mixed terms unresolved); it may support private analysis only.');
  if (sourceId === 'makemeahanzi-dictionary') notes.push('Make Me a Hanzi structural source is under license review; local derivative lineage is unresolved.');
  return notes;
}

function buildFinding(
  target: string,
  note: TargetNote['checks'][number],
  metadata: MetadataView[],
  sourceId: string | null,
  runtimeTree: string | null,
): RelationshipFinding {
  const exactSourceEvidence = [
    note.exactEvidence,
    ...metadata.map(metadataEvidence),
    `Phase 4 raw tree for ${target}: ${runtimeTree ?? 'no runtime tree'}.`,
    NO_RELATIONSHIP_SLOT,
  ];
  return {
    componentOrGroup: note.componentOrGroup,
    proposedRole: note.role,
    exactSourceEvidence,
    sourceRefs: sourceRefsForFinding(metadata, target),
    directSupport: note.directSupport,
    confidence: note.confidence,
    licensingProvenance: licenseNotes(sourceId, metadata),
    safeForDeterministicFormationOrOrigin: false,
    missingBeforeApproval: note.missing,
    assessment: note.assessment,
  };
}

function buildGroupedObservations(
  target: string,
  root: RuntimeTreeNode | null,
  records: Map<string, RuntimeRecord>,
  metadata: Map<string, MetadataView>,
  note: TargetNote,
): GroupedObservation[] {
  if (!root) return [];
  const directGlyphs = directVisibleComponents(root, metadata).filter((item) => item.glyph).map((item) => item.glyph as string);
  const result: GroupedObservation[] = [];
  for (const glyph of [...new Set(directGlyphs)]) {
    const record = records.get(glyph);
    const meta = metadata.get(glyph) ?? {
      glyph,
      rawGlosses: [],
      readings: [],
      labels: [],
      approvedLabel: null,
      status: 'missing' as MetadataStatus,
      sourceRefs: [],
      warnings: [],
      labelProvenance: [],
    };
    const groupNote = note.grouped[glyph];
    const rawMetadata = [metadataEvidence(meta)];
    if (!record || runtimeChildren(record.t).length === 0) {
      result.push({
        component: glyph,
        existingPhase4Record: record?.r ?? null,
        directChildTree: record ? formatTree(record.t) : null,
        rawMetadata,
        structuralStatus: record ? 'no-expandable-record' : 'no-expandable-record',
        pedagogicalAssessment: groupNote?.assessment ?? 'No separate expandable record or reviewed grouped-component note is available.',
        relationshipSupport: groupNote?.relationshipSupport ?? 'none',
        safeToUseAsFormationEvidence: false,
        missingBeforeApproval: groupNote?.missing ?? ['no target-specific relationship evidence'],
      });
      continue;
    }
    const structuralStatus: GroupedObservation['structuralStatus'] = 'encoded-group';
    result.push({
      component: glyph,
      existingPhase4Record: record.r,
      directChildTree: formatTree(record.t),
      rawMetadata,
      structuralStatus,
      pedagogicalAssessment: groupNote?.assessment ?? 'An existing expandable glyph is present, but the repository gives no target-specific pedagogical relationship for this target.',
      relationshipSupport: groupNote?.relationshipSupport ?? 'structure-only',
      safeToUseAsFormationEvidence: false,
      missingBeforeApproval: groupNote?.missing ?? ['target-specific relationship evidence', 'reviewed learner usefulness decision'],
    });
  }
  if (result.length === 0) {
    const childCount = runtimeChildren(root).length;
    result.push({
      component: '(none)',
      existingPhase4Record: null,
      directChildTree: null,
      rawMetadata: [`The root has ${childCount} layout children, but no direct glyph with an expandable Phase 4 record was found.`],
      structuralStatus: 'layout-group-only',
      pedagogicalAssessment: 'No grouped intermediate differs from the direct learner-visible frame.',
      relationshipSupport: 'structure-only',
      safeToUseAsFormationEvidence: false,
      missingBeforeApproval: ['target-specific relationship evidence'],
    });
  }
  return result;
}

function buildRecord(
  target: string,
  bookPlans: BookPlansArtifact,
  qualityPlans: QualityPlansArtifact,
  strictResults: StrictArtifact,
  records: Map<string, RuntimeRecord>,
  manifest: RuntimeManifest,
  metadata: Map<string, MetadataView>,
): ReconRecord {
  const bookPlan = bookPlans.plans.find((plan) => plan.character === target);
  const frozen = qualityPlans.plans.find((plan) => plan.character === target);
  if (!bookPlan || !frozen) throw new Error(`Missing frozen plan for ${target}`);
  const runtime = records.get(target);
  const root = runtime?.t ?? null;
  const direct = root ? directVisibleComponents(root, metadata) : [];
  const strict = strictResults.records.find((result) => result.character === target);
  const strictSceneAssessment = strict
    ? `${strict.finalStatus}; decision=${strict.normalizedAssessment?.decision ?? 'none'}; issueCodes=${strict.normalizedAssessment?.issueCodes?.join(', ') || 'none'}; validation=${strict.deterministicValidation.valid ? 'valid' : `invalid (${strict.deterministicValidation.issues.map((issue) => issue.code).join(', ')})`}`
    : 'not-called / gated; no Scene viability result exists for this target.';
  const note = TARGET_NOTES[target];
  const componentMetadata = direct.filter((item) => item.glyph).map((item) => metadata.get(item.glyph as string) ?? {
    glyph: item.glyph as string,
    rawGlosses: [],
    readings: [],
    labels: [],
    approvedLabel: null,
    status: 'missing' as MetadataStatus,
    sourceRefs: [],
    warnings: [],
    labelProvenance: [],
  });
  const source = runtime ? manifest.sources[runtime.s] : null;
  const phase4SourceEvidence = runtime && source
    ? `Runtime record ${runtime.r} from source ${source.id} (${source.version}); raw Phase 4 tree=${formatTree(runtime.t)}. This source record is structural only.`
    : 'No Phase 4 runtime record was found.';
  return {
    target,
    canonicalLearnerMeaning: frozen.canonicalMeaning,
    canonicalPinyin: frozen.canonicalPinyin,
    meaningDecision: {
      method: bookPlan.meaningDecision.method,
      confidence: bookPlan.meaningDecision.confidence,
      lessonSpecificMeanings: bookPlan.meaningDecision.lessonSpecificMeanings,
      dictionaryDefinition: bookPlan.meaningDecision.dictionaryDefinition,
      reviewReasons: bookPlan.meaningDecision.reviewReasons,
      mnemonicSuitability: note.suitability,
      mnemonicSuitabilityReason: note.suitabilityReason,
    },
    phase4Record: {
      recordId: runtime?.r ?? null,
      sourceId: source?.id ?? null,
      sourceVersion: source?.version ?? null,
      rawTree: runtime ? formatTree(runtime.t) : null,
      sourceEvidence: phase4SourceEvidence,
    },
    directVisibleComponents: direct,
    componentMetadata,
    currentFrozenPlan: {
      status: frozen.status,
      frameKind: frozen.frame.kind,
      frameReason: frozen.frame.detail ?? frozen.frame.reason,
      blockers: frozen.reviewReasons,
      meaningReviewReasons: frozen.meaningReviewReasons,
      strictSceneAssessment,
    },
    relationshipFindings: note.checks.map((check) => buildFinding(target, check, componentMetadata, source?.id ?? null, runtime ? formatTree(runtime.t) : null)),
    groupedComponentObservations: buildGroupedObservations(target, root, records, metadata, note),
    recommendedDisposition: note.disposition,
  };
}

function mdCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', '<br>');
}

function list(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- none';
}

function renderMarkdown(artifact: ReconArtifact): string {
  const lines: string[] = [];
  lines.push('# Book 1 target-specific relationship/evidence reconnaissance', '');
  lines.push('> Development-only, read-only audit of the new Phase 4 decomposition/runtime data. No hooks were generated, no DeepSeek/API calls were made, no planner or metadata files were changed, and `publishable` remains `false`.', '');
  lines.push('## Scope and guardrails', '');
  lines.push(`- Targets: ${artifact.records.map((record) => record.target).join('、')}`);
  lines.push('- Structural source: the Phase 4 candidate runtime pack, not the old Character Breakdown data.');
  lines.push('- Structural decomposition is reported separately from target-specific semantic, phonetic, visual, and origin evidence.');
  lines.push('- No reading similarity, dictionary-gloss overlap, or IDS layout was promoted to a relationship.');
  lines.push('- `Formation` and `Origin` remain unavailable unless their evidence gates are cleared.');
  lines.push(`- Runtime license gate: **${artifact.runtimeLicenseGate.status}**; ${artifact.runtimeLicenseGate.openBlockers.join('; ')}.`, '');
  lines.push('## Evidence registry audit', '');
  lines.push(`- Existing target-specific relationship registry: \`${artifact.relationshipRegistryAudit.registry}\`.`);
  lines.push(`- Registry targets with slots: ${artifact.relationshipRegistryAudit.targetSpecificSlotTargets.join('、')}.`);
  lines.push(`- Requested targets with slots: ${artifact.relationshipRegistryAudit.requestedTargetsWithSlots.length > 0 ? artifact.relationshipRegistryAudit.requestedTargetsWithSlots.join('、') : 'none'}.`);
  lines.push(`- Requested targets without slots: ${artifact.relationshipRegistryAudit.requestedTargetsWithoutSlots.join('、')}.`);
  lines.push(`- Target-specific origin records found: ${artifact.relationshipRegistryAudit.originEvidenceRecordsFound}.`);
  lines.push(`- ${artifact.relationshipRegistryAudit.note}`, '');
  lines.push('## Summary', '');
  lines.push('| Target | Canonical meaning | Meaning quality | Direct Phase 4 frame | Evidence conclusion | Recommended disposition |');
  lines.push('|---|---|---|---|---|---|');
  for (const record of artifact.records) {
    const unsupported = record.relationshipFindings.filter((finding) => finding.proposedRole !== 'none' && !finding.safeForDeterministicFormationOrOrigin).length;
    lines.push(`| ${record.target} | ${mdCell(`${record.canonicalLearnerMeaning ?? 'none'} (${record.canonicalPinyin ?? 'no reading'})`)} | ${record.meaningDecision.mnemonicSuitability} | ${mdCell(record.phase4Record.rawTree ?? 'missing')} | ${unsupported === 0 ? 'no supported relationship' : `${unsupported} candidate checks, all unapproved`} | ${record.recommendedDisposition.recommendation} |`);
  }
  lines.push('', '## Poor mnemonic candidates and meaning warnings', '');
  for (const record of artifact.records.filter((item) => item.meaningDecision.mnemonicSuitability === 'poor' || item.meaningDecision.mnemonicSuitability === 'unresolved')) {
    lines.push(`- **${record.target}** — ${record.canonicalLearnerMeaning ?? 'no canonical meaning'}: ${record.meaningDecision.mnemonicSuitabilityReason}`);
  }
  lines.push('', '## Detailed target findings', '');
  for (const record of artifact.records) {
    lines.push(`### ${record.target} — ${record.canonicalLearnerMeaning ?? 'no canonical meaning'} (${record.canonicalPinyin ?? 'no reading'})`, '');
    lines.push(`**Meaning decision:** method=\`${record.meaningDecision.method}\`, confidence=\`${record.meaningDecision.confidence}\`; ${record.meaningDecision.mnemonicSuitabilityReason}`);
    lines.push(`**Book 1 lesson senses/readings:** ${record.meaningDecision.lessonSpecificMeanings.length > 0 ? record.meaningDecision.lessonSpecificMeanings.map((meaning) => `${meaning.meaning} [${meaning.pinyin}] (${meaning.vocabularyId})`).join('; ') : 'none recorded'}.`);
    lines.push(`**Dictionary definition:** ${record.meaningDecision.dictionaryDefinition ?? 'none recorded'}.`);
    lines.push(`**Meaning review reasons:** ${record.meaningDecision.reviewReasons.length > 0 ? record.meaningDecision.reviewReasons.join('; ') : 'none'}.`);
    lines.push(`**Phase 4 record:** ${record.phase4Record.sourceEvidence}`);
    lines.push(`**Direct visible components:** ${record.directVisibleComponents.map((component) => `${component.token} [path ${component.path || 'root'}; ${component.kind}]`).join(' + ') || 'none'}.`);
    lines.push(`**Frozen plan:** status=\`${record.currentFrozenPlan.status}\`, frame=\`${record.currentFrozenPlan.frameKind}\`; reason=${record.currentFrozenPlan.frameReason}.`);
    lines.push(`**Planner/review blockers:** ${record.currentFrozenPlan.blockers.length > 0 ? record.currentFrozenPlan.blockers.join('; ') : 'none'}.`);
    lines.push(`**Strict Scene result:** ${record.currentFrozenPlan.strictSceneAssessment}`, '');
    lines.push('#### Component metadata available to the planner', '');
    lines.push('| Glyph | Raw definitions | Readings | Labels available | Current status | Provenance/warnings |');
    lines.push('|---|---|---|---|---|---|');
    for (const metadata of record.componentMetadata) {
      lines.push(`| ${metadata.glyph} | ${mdCell(metadata.rawGlosses.join('; ') || 'none')} | ${mdCell(metadata.readings.join('; ') || 'none')} | ${mdCell(metadata.labels.join(', ') || 'none')} | ${metadata.status} | ${mdCell([...metadata.labelProvenance, ...metadata.warnings].join('; ') || 'none')} |`);
    }
    lines.push('', '#### Relationship/evidence checks', '');
    lines.push('| Component/group | Proposed role | Exact source/evidence available | Direct support | Confidence | Deterministic Formation/Origin safe? |');
    lines.push('|---|---|---|---|---|---|');
    for (const finding of record.relationshipFindings) {
      lines.push(`| ${mdCell(finding.componentOrGroup)} | ${finding.proposedRole} | ${mdCell(finding.exactSourceEvidence.join(' '))} | ${finding.directSupport} | ${finding.confidence} | no |`);
    }
    lines.push('');
    for (const finding of record.relationshipFindings) {
      lines.push(`**${finding.componentOrGroup} / ${finding.proposedRole}:** ${finding.assessment}`);
      lines.push(`- Licensing/provenance: ${finding.licensingProvenance.join(' ')}`);
      lines.push(`- Missing before approval: ${finding.missingBeforeApproval.join('; ')}`);
    }
    lines.push('', '#### Existing grouped/intermediate components', '');
    lines.push('| Component | Existing Phase 4 record | Direct child tree | Structural status | What the repository actually supports | Safe relationship evidence? | Missing before approval |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const group of record.groupedComponentObservations) {
      lines.push(`| ${group.component} | ${group.existingPhase4Record ?? 'none'} | ${mdCell(group.directChildTree ?? 'none')} | ${group.structuralStatus} | ${mdCell(group.pedagogicalAssessment)} | no (${group.relationshipSupport}) | ${mdCell(group.missingBeforeApproval.join('; '))} |`);
    }
    lines.push('', `**Recommendation:** ${record.recommendedDisposition.recommendation}. ${record.recommendedDisposition.reason}`);
    lines.push(`- Deterministic Formation safe now: no.`);
    lines.push(`- Deterministic Origin safe now: no.`);
    lines.push(`- Remain withheld if no safe evidence appears: yes.`, '');
  }
  lines.push('## Provenance and licensing boundary', '');
  lines.push('- `legacy-breakdown-metadata` supplies raw component glosses/readings, but the profile artifact does not record a redistribution license; it is not evidence of target-specific formation.');
  lines.push('- `project-curated-component-defaults-v2`, `componentLexicon.ts`, and the reviewed label layer supply learner-label candidates only. Their approval scope does not assign target-specific roles.');
  lines.push('- Phase 4 `cjkvi-ids` structural data is license-gated blocked; `makemeahanzi-dictionary` is under review. Neither source was treated as an origin authority.');
  lines.push('- No production or pilot data was modified. This artifact is development-only and publishable=false.', '');
  lines.push('## Exact inputs read', '');
  for (const input of artifact.sourceInputs) lines.push(`- \`${input}\``);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const profiles = readJson<ComponentProfileArtifact>(PROFILE_PATH);
  const reviewed = readJson<ReviewedLabelArtifact>(REVIEW_LABEL_PATH);
  const bookPlans = readJson<BookPlansArtifact>(BOOK_PLANS_PATH);
  const qualityPlans = readJson<QualityPlansArtifact>(QUALITY_PLANS_PATH);
  const strictResults = readJson<StrictArtifact>(STRICT_RESULTS_PATH);
  const { records, manifest } = buildRuntimeMap();
  const metadata = buildMetadataMap(profiles, reviewed);
  const registryTargets = [...new Set(PILOT_RELATIONSHIP_EVIDENCE_SLOTS.map((slot) => slot.targetCharacter))];
  const requestedWithSlots = TARGETS.filter((target) => registryTargets.includes(target));
  const artifact: ReconArtifact = {
    schemaVersion: 1,
    artifact: 'book-1-target-relationship-evidence-reconnaissance-v1',
    distribution: 'development-only-analysis',
    publishable: false,
    hooksGenerated: false,
    apiCalls: 0,
    plannerChanged: false,
    metadataChanged: false,
    sourceInputs: SOURCE_INPUTS,
    relationshipRegistryAudit: {
      registry: 'src/data/memoryHooks/pilotFrameReviews.ts',
      targetSpecificSlotTargets: registryTargets,
      requestedTargetsWithSlots: requestedWithSlots,
      requestedTargetsWithoutSlots: TARGETS.filter((target) => !requestedWithSlots.includes(target)),
      originEvidenceRecordsFound: 0,
      note: 'The frozen quality-plan artifact has manualMetadata.relationshipEvidence=[], frameOverrides=[], and no origin claims for these targets. Existing source URLs in pilotFrameReviews.ts belong to other pilot characters and were not reused here.',
    },
    runtimeLicenseGate: manifest.licenseGate,
    targetCount: TARGETS.length,
    records: TARGETS.map((target) => buildRecord(target, bookPlans, qualityPlans, strictResults, records, manifest, metadata)),
  };
  writeFileSync(OUTPUT_JSON_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(OUTPUT_MD_PATH, renderMarkdown(artifact));
  console.log(`Wrote ${OUTPUT_JSON_PATH}`);
  console.log(`Wrote ${OUTPUT_MD_PATH}`);
  console.log(`Targets=${artifact.targetCount}; API calls=${artifact.apiCalls}; hooksGenerated=${artifact.hooksGenerated}; publishable=${artifact.publishable}`);
}

main();

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  CharacterHookPlanV2,
  HookFrame,
  PlannedComponentUse,
} from '../../src/features/character-memory-hooks/model';
import {
  BOOK_ONE_EVALUATION_BATCH_47,
  BOOK_ONE_EVALUATION_BATCH_CHARACTERS,
} from '../../src/data/memoryHooks/book1EvaluationBatch';

interface GenericComponentPlan {
  key: string;
  kind: 'glyph' | 'unencoded-component' | 'unknown-component' | 'source-entity';
  glyph: string | null;
  treePath: string;
  senseId: string | null;
  label: string | null;
  role: 'semantic' | 'phonetic' | 'visual' | 'unclassified';
  roleEvidenceRefs: string[];
}

interface GenericCharacterPlan {
  character: string;
  bookId: number;
  decompositionVersion: string;
  decompositionRecordId: string | null;
  distribution: 'development-only-candidate';
  publishable: false;
  meaningDecision: {
    selectedMeaning: string | null;
    selectedPinyin: string | null;
    reviewReasons: string[];
  };
  components: GenericComponentPlan[];
  status: 'eligible' | 'needs-review' | 'no-hook';
  blockers: string[];
}

interface GenericPlanArtifact {
  schemaVersion: number;
  componentLexiconVersion: string;
  decompositionVersion: string;
  distribution: 'development-only-candidate';
  publishable: false;
  plans: GenericCharacterPlan[];
}

interface InventoryArtifact {
  schemaVersion: number;
  bookId: number;
  script: 'traditional';
  characterCount: number;
  entries: Array<{ character: string }>;
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const GENERIC_PLAN_PATH = resolve(OUTPUT_DIR, 'book-1-plans.json');
const INVENTORY_PATH = resolve(OUTPUT_DIR, 'book-1-inventory.json');
const MANIFEST_PATH = resolve(OUTPUT_DIR, 'book-1-evaluation-batch-47-manifest.json');
const QUALITY_PLAN_PATH = resolve(OUTPUT_DIR, 'book-1-evaluation-batch-47-quality-plans-v2.json');

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function occurrenceId(character: string, treePath: string): string {
  return `${character}:${treePath}`;
}

function toSceneComponent(character: string, component: GenericComponentPlan): PlannedComponentUse | null {
  if (component.kind !== 'glyph' || !component.glyph || !component.label) return null;
  return {
    occurrenceIds: [occurrenceId(character, component.treePath)],
    profileKey: component.key as `g:${string}`,
    glyph: component.glyph,
    treePaths: [component.treePath],
    displayLabel: component.label,
    labelBasis: 'meaning',
    role: 'unclassified',
    evidenceRefs: [],
  };
}

function buildAutoFrame(plan: GenericCharacterPlan): {
  frame: HookFrame;
  status: CharacterHookPlanV2['status'];
  reviewReasons: string[];
} {
  const reviewReasons = [
    ...plan.meaningDecision.reviewReasons,
    ...plan.blockers.map((blocker) => `generic-planner:${blocker}`),
  ];
  const components = plan.components.map((component) => toSceneComponent(plan.character, component));
  const canAutoScene = plan.status === 'eligible'
    && plan.meaningDecision.selectedMeaning
    && components.length === plan.components.length
    && components.length >= 2;

  if (canAutoScene) {
    return {
      frame: {
        kind: 'scene',
        components: components as PlannedComponentUse[],
        requiresHumanApproval: true,
        reviewStatus: 'review-required',
        sceneGuidance: 'Use one concise causal or spatial action involving every supplied component that leads to the target meaning. This is an invented mnemonic, not etymology; do not add historical claims or new component meanings.',
      },
      status: 'candidate',
      reviewReasons: [...reviewReasons, 'batch-auto-scene-frame'],
    };
  }

  const reason = plan.status === 'no-hook'
    ? 'insufficient-data'
    : 'insufficient-data';
  return {
    frame: {
      kind: 'none',
      reason,
      detail: plan.blockers.length > 0
        ? `Automatically withheld by the existing generic plan: ${plan.blockers.join('; ')}.`
        : 'Automatically withheld because no safe generic frame was available.',
    },
    status: plan.status === 'no-hook' ? 'no-useful-hook' : 'blocked',
    reviewReasons: [...reviewReasons, 'batch-auto-withheld-frame'],
  };
}

function toQualityPlan(plan: GenericCharacterPlan): CharacterHookPlanV2 {
  const auto = buildAutoFrame(plan);
  return {
    schemaVersion: 2,
    character: plan.character,
    bookId: plan.bookId,
    canonicalMeaning: plan.meaningDecision.selectedMeaning,
    targetDisplayLabel: plan.meaningDecision.selectedMeaning,
    canonicalPinyin: plan.meaningDecision.selectedPinyin,
    meaningReviewReasons: plan.meaningDecision.reviewReasons,
    decompositionVersion: plan.decompositionVersion,
    decompositionRecordId: plan.decompositionRecordId,
    distribution: 'development-only-candidate',
    publishable: false,
    status: auto.status,
    frame: auto.frame,
    reviewReasons: [...new Set(auto.reviewReasons)],
  };
}

function main(): void {
  if (!existsSync(GENERIC_PLAN_PATH) || !existsSync(INVENTORY_PATH)) {
    throw new Error('Missing generated Book 1 inventory/plans. Run the existing no-network preparation command first.');
  }
  const generic = readJson<GenericPlanArtifact>(GENERIC_PLAN_PATH);
  const inventory = readJson<InventoryArtifact>(INVENTORY_PATH);
  if (generic.publishable || generic.distribution !== 'development-only-candidate') {
    throw new Error('Refusing to prepare from a publishable or non-candidate generic plan artifact.');
  }
  if (inventory.bookId !== 1 || inventory.script !== 'traditional') {
    throw new Error('Evaluation batch requires the Book 1 Traditional inventory.');
  }

  const inventoryCharacters = new Set(inventory.entries.map((entry) => entry.character));
  const uniqueCharacters = [...new Set(BOOK_ONE_EVALUATION_BATCH_CHARACTERS)];
  if (uniqueCharacters.length !== 47) throw new Error(`Expected 47 unique batch characters, found ${uniqueCharacters.length}.`);
  const missing = uniqueCharacters.filter((character) => !inventoryCharacters.has(character));
  if (missing.length > 0) throw new Error(`Batch characters missing from Book 1 inventory: ${missing.join(' ')}`);

  const genericByCharacter = new Map(generic.plans.map((plan) => [plan.character, plan]));
  const missingPlans = uniqueCharacters.filter((character) => !genericByCharacter.has(character));
  if (missingPlans.length > 0) throw new Error(`Batch characters missing from generic plans: ${missingPlans.join(' ')}`);

  const pilotCharacters = new Set(['好', '點', '坐', '情', '請', '媽', '喝', '吃', '休', '明', '問', '說']);
  const overlap = uniqueCharacters.filter((character) => pilotCharacters.has(character));
  if (overlap.length > 0) throw new Error(`Batch overlaps the original 12-character pilot: ${overlap.join(' ')}`);

  const orderedCharacters = uniqueCharacters;
  const selectionHash = createHash('sha256').update(orderedCharacters.join('')).digest('hex');
  const plans = orderedCharacters.map((character) => toQualityPlan(genericByCharacter.get(character)!));
  const frameCounts = plans.reduce<Record<string, number>>((counts, plan) => {
    counts[plan.frame.kind] = (counts[plan.frame.kind] ?? 0) + 1;
    return counts;
  }, {});
  const statusCounts = plans.reduce<Record<string, number>>((counts, plan) => {
    counts[plan.status] = (counts[plan.status] ?? 0) + 1;
    return counts;
  }, {});

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(MANIFEST_PATH, `${JSON.stringify({
    schemaVersion: 1,
    ...BOOK_ONE_EVALUATION_BATCH_47,
    characters: orderedCharacters,
    selectionHash,
    sourceInventory: 'book-1-inventory.json',
    sourceGenericPlans: 'book-1-plans.json',
    originalPilotExcluded: [...pilotCharacters],
    ruleFreeze: {
      planner: 'existing generic planner output; no new relationship/label/frame overrides',
      renderer: 'existing deterministicRenderer.ts',
      scenePrompt: 'existing generatePilotHooksV2.ts prompt',
      validator: 'existing qualityPlanner.ts deterministic validator',
      styleLint: 'existing stylePreflight.ts',
      critic: 'existing criticPilotHooksV2.ts',
      retryBehavior: 'existing bounded Scene retry behavior',
    },
    publishable: false,
  }, null, 2)}\n`);
  writeFileSync(QUALITY_PLAN_PATH, `${JSON.stringify({
    schemaVersion: 2,
    batchId: BOOK_ONE_EVALUATION_BATCH_47.batchId,
    distribution: 'development-only-candidate',
    publishable: false,
    promptChanged: false,
    hooksRegenerated: false,
    manualMetadata: BOOK_ONE_EVALUATION_BATCH_47.manualMetadata,
    selectionHash,
    plans,
  }, null, 2)}\n`);
  console.log(JSON.stringify({
    batchId: BOOK_ONE_EVALUATION_BATCH_47.batchId,
    selected: orderedCharacters.length,
    selectionHash,
    frameCounts,
    statusCounts,
    manualMetadata: BOOK_ONE_EVALUATION_BATCH_47.manualMetadata,
    apiCallsMade: 0,
    publishable: false,
  }, null, 2));
}

main();


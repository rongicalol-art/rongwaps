import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
  CharacterHookPlanV2,
  HookFrame,
  PlannedComponentUse,
} from '../../src/features/character-memory-hooks/model';
import {
  BOOK_ONE_EVALUATION_BATCH_47,
} from '../../src/data/memoryHooks/book1EvaluationBatch';
import type { ComponentLexiconEntry } from '../../src/features/character-memory-hooks/model';
import { STROKE_GLYPHS } from './componentRules';
import { loadPlanningLexicon } from './planningLexicon';
import { loadRuntimeDirectComponents, type RuntimeDirectComponent } from './runtimeIndex';

export interface GenericComponentPlan {
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
const DEFAULT_BATCH_STEM = 'book-1-evaluation-batch-47';

interface BatchDescriptor {
  batchId: string;
  bookId: number;
  script: 'traditional';
  groups: readonly { id: string; purpose: string; characters: readonly string[] }[];
  manualMetadata: {
    relationshipEvidence: readonly string[];
    targetSpecificLabels: readonly string[];
    frameOverrides: readonly string[];
  };
}

/**
 * `--batch <stem> --characters "字 字 …"` prepares a V2 rollout batch under
 * `<stem>-manifest.json` / `<stem>-quality-plans-v2.json`. Without arguments the
 * frozen batch-47 evaluation artifacts are rebuilt exactly as before.
 */
function parseBatchArgs(): { stem: string; descriptor: BatchDescriptor; isDefault: boolean } {
  const args = process.argv.slice(2);
  const batchIndex = args.indexOf('--batch');
  if (batchIndex === -1) {
    return { stem: DEFAULT_BATCH_STEM, descriptor: BOOK_ONE_EVALUATION_BATCH_47, isDefault: true };
  }
  const stem = args[batchIndex + 1];
  const charactersArg = args[args.indexOf('--characters') + 1];
  if (!stem || !stem.startsWith('book-1-')) throw new Error('--batch requires a book-1-* file stem.');
  if (!charactersArg) throw new Error('--batch requires --characters "字 字 …".');
  const characters = [...new Set(charactersArg.split(/[\s,]+/u).filter(Boolean))];
  if (characters.length === 0 || characters.some((character) => [...character].length !== 1)) {
    throw new Error('--characters must be a list of single Han characters.');
  }
  return {
    stem,
    descriptor: {
      batchId: `${stem}-v1`,
      bookId: 1,
      script: 'traditional',
      groups: [{ id: 'v2-rollout-batch', purpose: 'Book 1 V2 rollout drafting batch.', characters }],
      manualMetadata: { relationshipEvidence: [], targetSpecificLabels: [], frameOverrides: [] },
    },
    isDefault: false,
  };
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function occurrenceId(character: string, treePath: string): string {
  return `${character}:${treePath}`;
}

/** Reviewed shape-only frames: fragmentary or single-part forms, the hook describes the exact visible form. */
const SHAPE_ONLY_CHARACTERS = new Set<string>(['長', '上']);

/**
 * Curated learner-facing token labels for characters whose canonical meaning is
 * too long to work as a hook token. The canonical meaning stays authoritative
 * (meaning audit, lesson alignment); only the `字(label)` token text shortens.
 */
const TARGET_DISPLAY_OVERRIDES: Record<string, string> = {
  '們': 'plural marker',
  '嗎': 'question particle',
  '台': 'platform',
  '本': 'book',
  '麼': 'suffix',
  '道': 'way',
  '久': 'long',
  '妳': 'you',
  '姓': 'surname',
  '呢': 'how-about particle',
  '請': 'please',
  '問': 'ask',
  '期': 'period',
  '圖': 'map',
  '要': 'want',
  '題': 'topic',
  '見': 'see',
  '個': 'unit',
  '朵': 'blossom',
  '枝': 'branch',
  '塊': 'lump',
  '件': 'item',
  '便': 'convenient',
  '宜': 'suitable',
  '文': 'language',
  '元': 'dollar',
  '怎': 'how',
  '做': 'do',
  '位': 'seat',
  '杯': 'cup',
  '瓶': 'bottle',
  '淇': 'ice cream',
  '您': 'you',
  '吧': 'suggestion',
  '給': 'give',
  '共': 'common',
  '棟': 'pillar',
  '張': 'stretch',
  '隻': 'single',
  '曬': 'sun-dry',
  '晒': 'sun-dry',
  '陽': 'sun',
  '機': 'machine',
  '發': 'send',
  '游': 'swim',
  '支': 'support',
  '首': 'song',
  '封': 'envelope',
  '地': 'ground',
  '汽': 'steam',
  '到': 'arrive',
  '走': 'walk',
  '輛': 'vehicle',
  '兩': 'two',
  '短': 'short',
  '斤': 'catty',
  '雙': 'pair',
  '聰': 'sharp',
  '作': 'do',
  '經': 'pass through',
};

export interface SceneComponentOptions {
  lexicon?: Map<string, ComponentLexiconEntry>;
  childComponentsByGlyph?: Map<string, RuntimeDirectComponent[]>;
}

function isRareGlyph(glyph: string): boolean {
  return [...glyph].some((character) => (character.codePointAt(0) ?? 0) > 0x9fff);
}

function lexiconLabel(options: SceneComponentOptions, glyph: string): string | null {
  const entry = options.lexicon?.get(`g:${glyph}`);
  return entry?.senses.find((sense) => sense.safeForMemoryAid)?.label ?? null;
}

/**
 * A rare glyph (beyond the common CJK block) never becomes a learner-facing
 * token. It expands into its direct children: each child becomes a token when
 * it is a common, labeled glyph, otherwise a described part, so the hook names
 * every inner component instead of flattening the part. Only when the part has
 * no usable children does it stay a single described part.
 */
function componentToSceneParts(
  character: string,
  component: GenericComponentPlan,
  options: SceneComponentOptions,
): PlannedComponentUse[] | null {
  if (component.kind === 'glyph' && component.glyph && component.label) {
    const tokenPart = (glyph: string, label: string, key: string, treePath: string, occurrence: string): PlannedComponentUse => ({
      occurrenceIds: [occurrence],
      profileKey: key,
      glyph,
      treePaths: [treePath],
      displayLabel: label,
      labelBasis: 'meaning',
      role: 'unclassified',
      evidenceRefs: [],
    });
    const describedPart = (key: string, treePath: string, occurrence: string): PlannedComponentUse => ({
      occurrenceIds: [occurrence],
      profileKey: key,
      glyph: null,
      treePaths: [treePath],
      displayLabel: null,
      labelBasis: 'visual',
      role: 'unclassified',
      evidenceRefs: [],
    });
    if (!isRareGlyph(component.glyph) || !options.childComponentsByGlyph) {
      return [tokenPart(component.glyph, component.label, component.key, component.treePath, occurrenceId(character, component.treePath))];
    }
    const children = options.childComponentsByGlyph.get(component.glyph) ?? [];
    const parts = children.flatMap((child, index) => {
      const treePath = `${component.treePath}.${index}`;
      const occurrence = `${occurrenceId(character, component.treePath)}.${index}`;
      if (child.glyph && STROKE_GLYPHS.has(child.glyph)) return [];
      const label = child.glyph ? lexiconLabel(options, child.glyph) : null;
      if (child.kind === 'glyph' && child.glyph && !isRareGlyph(child.glyph) && label) {
        return [tokenPart(child.glyph, label, child.key, treePath, occurrence)];
      }
      return [describedPart(child.key, treePath, occurrence)];
    });
    return parts.length > 0
      ? parts
      : [describedPart(component.key, component.treePath, occurrenceId(character, component.treePath))];
  }
  if (component.kind === 'unencoded-component' || component.kind === 'unknown-component') {
    return [{
      occurrenceIds: [occurrenceId(character, component.treePath)],
      profileKey: component.key,
      glyph: null,
      treePaths: [component.treePath],
      displayLabel: null,
      labelBasis: 'visual',
      role: 'unclassified',
      evidenceRefs: [],
    }];
  }
  return null;
}

/**
 * Repeated occurrences of the same token (e.g. 月 + 月 in 朋) become one
 * component whose occurrenceIds cover every appearance, matching the pilot
 * contract. Described parts always stay separate.
 */
export function mergeSceneComponents(
  character: string,
  components: GenericComponentPlan[],
  options: SceneComponentOptions = {},
): PlannedComponentUse[] | null {
  const merged: PlannedComponentUse[] = [];
  const glyphIndex = new Map<string, PlannedComponentUse>();
  for (const component of components) {
    const sceneParts = componentToSceneParts(character, component, options);
    if (!sceneParts) return null;
    for (const sceneComponent of sceneParts) {
      if (!sceneComponent.glyph) {
        merged.push(sceneComponent);
        continue;
      }
      const key = `${sceneComponent.glyph}|${sceneComponent.displayLabel}`;
      const existing = glyphIndex.get(key);
      if (existing) {
        existing.occurrenceIds.push(...sceneComponent.occurrenceIds);
        existing.treePaths.push(...sceneComponent.treePaths);
        continue;
      }
      glyphIndex.set(key, sceneComponent);
      merged.push(sceneComponent);
    }
  }
  return merged;
}

function buildAutoFrame(
  plan: GenericCharacterPlan,
  options: SceneComponentOptions,
): {
  frame: HookFrame;
  status: CharacterHookPlanV2['status'];
  reviewReasons: string[];
} {
  const reviewReasons = [
    ...plan.meaningDecision.reviewReasons,
    ...plan.blockers.map((blocker) => `generic-planner:${blocker}`),
  ];
  // Reviewed shape-only frames carry no component tokens, so they do not depend
  // on component-count eligibility; only real blockers (missing runtime, meaning,
  // or unresolved parts) keep them withheld.
  if (SHAPE_ONLY_CHARACTERS.has(plan.character) && plan.meaningDecision.selectedMeaning && plan.blockers.length === 0) {
    return {
      frame: {
        kind: 'scene',
        components: [],
        requiresHumanApproval: true,
        reviewStatus: 'review-required',
        sceneGuidance: 'Describe the exact visible form of the whole character part by part ("the top part looks like…", "the base…") and land on the meaning; no component tokens and no invented component meanings.',
      },
      status: 'candidate',
      reviewReasons: [...reviewReasons, 'reviewed-shape-only-frame'],
    };
  }
  const components = mergeSceneComponents(plan.character, plan.components, options);
  const occurrenceCount = components?.reduce((total, component) => total + component.occurrenceIds.length, 0) ?? 0;
  if (plan.status === 'eligible' && plan.meaningDecision.selectedMeaning && components && occurrenceCount >= 2) {
    return {
      frame: {
        kind: 'scene',
        components,
        requiresHumanApproval: true,
        reviewStatus: 'review-required',
        sceneGuidance: 'Use one concise causal or spatial action involving every supplied component that leads to the target meaning. This is an invented mnemonic, not etymology; do not add historical claims or new component meanings. For any component with no glyph, describe its visible shape in plain English and declare the phrase in describedParts; never invent a Han token for it.',
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

function toQualityPlan(plan: GenericCharacterPlan, options: SceneComponentOptions): CharacterHookPlanV2 {
  const auto = buildAutoFrame(plan, options);
  return {
    schemaVersion: 2,
    character: plan.character,
    bookId: plan.bookId,
    canonicalMeaning: plan.meaningDecision.selectedMeaning,
    targetDisplayLabel: TARGET_DISPLAY_OVERRIDES[plan.character] ?? plan.meaningDecision.selectedMeaning,
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

  const { stem, descriptor, isDefault } = parseBatchArgs();
  const manifestPath = resolve(OUTPUT_DIR, `${stem}-manifest.json`);
  const qualityPlanPath = resolve(OUTPUT_DIR, `${stem}-quality-plans-v2.json`);

  const inventoryCharacters = new Set(inventory.entries.map((entry) => entry.character));
  const uniqueCharacters = [...new Set(descriptor.groups.flatMap((group) => group.characters))];
  if (isDefault && uniqueCharacters.length !== 47) throw new Error(`Expected 47 unique batch characters, found ${uniqueCharacters.length}.`);
  const missing = uniqueCharacters.filter((character) => !inventoryCharacters.has(character));
  if (missing.length > 0) throw new Error(`Batch characters missing from Book 1 inventory: ${missing.join(' ')}`);

  const genericByCharacter = new Map(generic.plans.map((plan) => [plan.character, plan]));
  const missingPlans = uniqueCharacters.filter((character) => !genericByCharacter.has(character));
  if (missingPlans.length > 0) throw new Error(`Batch characters missing from generic plans: ${missingPlans.join(' ')}`);

  const pilotCharacters = new Set(['好', '點', '坐', '情', '請', '媽', '喝', '吃', '休', '明', '問', '說']);
  const overlap = uniqueCharacters.filter((character) => pilotCharacters.has(character));
  if (isDefault && overlap.length > 0) throw new Error(`Batch overlaps the original 12-character pilot: ${overlap.join(' ')}`);

  const orderedCharacters = uniqueCharacters;
  const selectionHash = createHash('sha256').update(orderedCharacters.join('')).digest('hex');
  const sceneOptions: SceneComponentOptions = {
    lexicon: loadPlanningLexicon(),
    childComponentsByGlyph: loadRuntimeDirectComponents(),
  };
  const plans = orderedCharacters.map((character) => toQualityPlan(genericByCharacter.get(character)!, sceneOptions));
  const frameCounts = plans.reduce<Record<string, number>>((counts, plan) => {
    counts[plan.frame.kind] = (counts[plan.frame.kind] ?? 0) + 1;
    return counts;
  }, {});
  const statusCounts = plans.reduce<Record<string, number>>((counts, plan) => {
    counts[plan.status] = (counts[plan.status] ?? 0) + 1;
    return counts;
  }, {});

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify({
    schemaVersion: 1,
    ...descriptor,
    characters: orderedCharacters,
    selectionHash,
    sourceInventory: 'book-1-inventory.json',
    sourceGenericPlans: 'book-1-plans.json',
    originalPilotExcluded: [...pilotCharacters],
    ruleFreeze: {
      planner: 'generic planner over the merged planning lexicon (pilot labels + approved curated labels + high-confidence batch proposals); rare glyphs expand to labeled common children or become described parts; reviewed shape-only frames have no components; no relationship overrides',
      renderer: 'existing deterministicRenderer.ts',
      scenePrompt: 'existing generatePilotHooksV2.ts prompt',
      validator: 'existing qualityPlanner.ts deterministic validator',
      styleLint: 'existing stylePreflight.ts',
      critic: 'existing criticPilotHooksV2.ts',
      retryBehavior: 'existing bounded Scene retry behavior',
    },
    publishable: false,
  }, null, 2)}\n`);
  writeFileSync(qualityPlanPath, `${JSON.stringify({
    schemaVersion: 2,
    batchId: descriptor.batchId,
    distribution: 'development-only-candidate',
    publishable: false,
    promptChanged: false,
    hooksRegenerated: false,
    manualMetadata: descriptor.manualMetadata,
    selectionHash,
    plans,
  }, null, 2)}\n`);
  console.log(JSON.stringify({
    batchId: descriptor.batchId,
    selected: orderedCharacters.length,
    selectionHash,
    frameCounts,
    statusCounts,
    manualMetadata: descriptor.manualMetadata,
    apiCallsMade: 0,
    publishable: false,
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}


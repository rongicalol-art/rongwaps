import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
  CharacterHookPlanV2,
  HookFrame,
  PlannedComponentUse,
} from '../../src/types/memoryHooks';
import {
  BOOK_ONE_EVALUATION_BATCH_47,
} from '../../src/data/memoryHooks/book1EvaluationBatch';
import type { ComponentLexiconEntry } from '../../src/types/memoryHooks';
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

/** Reviewed single-part scenes: the showable direct part becomes a token even
 * when the character has only one planned occurrence; characters with nothing
 * showable (也/己) keep the reviewed shape-only frame. */
const SINGLE_PART_SCENE_CHARACTERS = new Set<string>([
  '小', '太', '中', '介', '今', '也', '少', '千', '桌', '戶', '山', '以', '方', '司', '毛', '成', '己', '十', '兔', '尺',
]);

/**
 * Reviewed full-frame overrides for forms whose showable parts sit below the
 * planned direct level (桌: 杲's 日/朩 children) or whose skipped scaffold was
 * reviewed back in as a real token (上/桌: ⺊ divination crack).
 */
const SCENE_FRAME_OVERRIDES: Record<string, Array<{ occurrenceIds: string[]; treePaths: string[]; key: string; glyph: string; label: string }>> = {
  '上': [
    { occurrenceIds: ['上:0'], treePaths: ['0'], key: 'g:⺊', glyph: '⺊', label: 'divination crack' },
    { occurrenceIds: ['上:1'], treePaths: ['1'], key: 'g:一', glyph: '一', label: 'one' },
  ],
  '桌': [
    { occurrenceIds: ['桌:0'], treePaths: ['0'], key: 'g:⺊', glyph: '⺊', label: 'divination crack' },
    { occurrenceIds: ['桌:1.0'], treePaths: ['1.0'], key: 'g:日', glyph: '日', label: 'sun' },
    { occurrenceIds: ['桌:1.1'], treePaths: ['1.1'], key: 'g:朩', glyph: '朩', label: 'split wood' },
  ],
};

const SCENE_GUIDANCE = 'Use one concise causal or spatial action involving every supplied component that leads to the target meaning. This is an invented mnemonic, not etymology; do not add historical claims or new component meanings. For any component with no glyph, describe its visible shape in plain English and declare the phrase in describedParts; never invent a Han token for it.';

/**
 * Reviewed contextual labels for parts that were described by the early batches
 * but expose a real glyph (rare parents without children, and rare-glyph
 * children that had no lexicon label yet). Each part is shown as a token with
 * the label the scene reads it as; the glyphs are bundled in the RW-Extras
 * webfont so they render in the app's Chinese font stack. Parts with no glyph
 * (unencoded/unknown shapes like 興's hands or 班's blade) stay described.
 */
const DESCRIBED_PART_UPGRADES: Record<string, { glyph: string; label: string }> = {
  '學:0.0': { glyph: '𦥑', label: 'hands' },
  '覺:0.0': { glyph: '𦥑', label: 'hands' },
  '師:0.1': { glyph: '㠯', label: 'mound' },
  '先:0': { glyph: '𠂒', label: 'leading steps' },
  '友:0': { glyph: '𠂇', label: 'left hand' },
  '午:0': { glyph: '𠂉', label: 'lying person' },
  '有:0': { glyph: '𠂇', label: 'reaching hand' },
  '貴:0.0': { glyph: '中', label: 'stack' },
  '色:0': { glyph: '𠂊', label: 'soft claw' },
  '常:0.0': { glyph: '龸', label: 'cap' },
  '衣:1': { glyph: '𧘇', label: 'draped fabric' },
  '餐:0.0': { glyph: '歺', label: 'dining board' },
  '春:0.0': { glyph: '三', label: 'sprouts' },
  '每:0': { glyph: '𠂉', label: 'lying person' },
  '弟:1.0': { glyph: '弔', label: 'coil' },
  '發:1.1': { glyph: '殳', label: 'striking hand' },
  '步:1': { glyph: '𣥂', label: 'footprint' },
  '腦:1.0': { glyph: '巛', label: 'hair' },
  '腦:1.1': { glyph: '囟', label: 'skull' },
  '賽:0.1': { glyph: '𠀎', label: 'offering' },
  '旅:1.0': { glyph: '𠂉', label: 'lying person' },
  '鐵:1.0': { glyph: '𢦏', label: 'blade' },
  '歲:1.1': { glyph: '𣥂', label: 'footprint' },
  '兩:1.1.0': { glyph: '入', label: 'upside-down person' },
  '舞:0.0': { glyph: '𠂉', label: 'lying person' },
  '斤:0': { glyph: '𠂆', label: 'cliff' },
  '關:1.0': { glyph: '𢆶', label: 'silk threads' },
  '關:1.1': { glyph: '丱', label: 'twin posts' },
  '望:0.1.0': { glyph: '𠂊', label: 'bound hand' },
  '告:0': { glyph: '𠂒', label: 'ox head' },
  '然:0.0.0': { glyph: '𠂊', label: 'bound hand' },
  '算:1.1': { glyph: '廾', label: 'two hands' },
  '參:0.0': { glyph: '厽', label: 'stacked mounds' },
  '當:0.0': { glyph: '龸', label: 'small roof' },
  '而:1.1': { glyph: '𦉫', label: 'beard strands' },
  '備:1.2': { glyph: '用', label: 'barred frame' },
  '右:0': { glyph: '𠂇', label: 'right hand' },
  '左:0': { glyph: '𠂇', label: 'left hand' },
  '展:1.1.0': { glyph: '𠄌', label: 'hooked corner' },
  '第:1.0': { glyph: '弔', label: 'bent bow' },
  '表:1': { glyph: '𧘇', label: 'clothing top' },
  '魚:0': { glyph: '𠂊', label: 'fish head' },
  '堂:0.0': { glyph: '龸', label: 'small roof' },
  '傷:1.0': { glyph: '𠂉', label: 'lying person' },
  '賓:0.1.1': { glyph: '𣥂', label: 'footprint' },
  '長:2.0': { glyph: '𠄌', label: 'hooked corner' },
};

/** Upgrades an outlined rare part to a token when the reviewed map names it. */
function withDescribedUpgrades(components: PlannedComponentUse[] | null): PlannedComponentUse[] | null {
  if (!components) return components;
  return components.map((component) => {
    if (component.glyph) return component;
    const upgrade = DESCRIBED_PART_UPGRADES[component.occurrenceIds[0] ?? ''];
    if (!upgrade) return component;
    return { ...component, glyph: upgrade.glyph, displayLabel: upgrade.label, labelBasis: 'meaning' };
  });
}

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
  '約': 'appointment',
  '照': 'photo',
  '相': 'photo',
  '辦': 'handle',
  '然': 'then',
  '重': 'heavy',
  '喂': 'hello',
  '第': 'ordinal',
  '剛': 'just',
  '次': 'time',
  '屬': 'belong to',
  '查': 'look up',
  '著': 'particle',
  '合': 'join',
  '份': 'copy',
  '里': 'li',
  '戶': 'household',
  '方': 'direction',
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
  const overlay = SCENE_FRAME_OVERRIDES[plan.character];
  if (overlay && plan.meaningDecision.selectedMeaning && plan.blockers.length === 0) {
    return {
      frame: {
        kind: 'scene',
        components: overlay.map((part) => ({
          occurrenceIds: part.occurrenceIds,
          profileKey: part.key,
          glyph: part.glyph,
          treePaths: part.treePaths,
          displayLabel: part.label,
          labelBasis: 'meaning',
          role: 'unclassified',
          evidenceRefs: [],
        })),
        requiresHumanApproval: true,
        reviewStatus: 'review-required',
        sceneGuidance: SCENE_GUIDANCE,
      },
      status: 'candidate',
      reviewReasons: [...reviewReasons, 'reviewed-frame-override'],
    };
  }
  // Reviewed single-part scenes carry their one showable part as a token; only
  // characters with nothing showable keep the reviewed shape-only frame.
  if (SINGLE_PART_SCENE_CHARACTERS.has(plan.character) && plan.meaningDecision.selectedMeaning && plan.blockers.length === 0) {
    const components = withDescribedUpgrades(mergeSceneComponents(plan.character, plan.components, options));
    if (components && components.some((component) => component.glyph)) {
      return {
        frame: {
          kind: 'scene',
          components,
          requiresHumanApproval: true,
          reviewStatus: 'review-required',
          sceneGuidance: SCENE_GUIDANCE,
        },
        status: 'candidate',
        reviewReasons: [...reviewReasons, 'reviewed-single-part-scene'],
      };
    }
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
  const components = withDescribedUpgrades(mergeSceneComponents(plan.character, plan.components, options));
  const occurrenceCount = components?.reduce((total, component) => total + component.occurrenceIds.length, 0) ?? 0;
  if (plan.status === 'eligible' && plan.meaningDecision.selectedMeaning && components && occurrenceCount >= 2) {
    return {
      frame: {
        kind: 'scene',
        components,
        requiresHumanApproval: true,
        reviewStatus: 'review-required',
        sceneGuidance: SCENE_GUIDANCE,
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


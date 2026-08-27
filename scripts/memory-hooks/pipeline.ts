import type {
  BookCharacterInventoryEntry,
  CanonicalMeaningDecision,
  CharacterOriginEvidence,
  ClassifierAnnotation,
  CharacterMemoryHookPlan,
  ComponentLexiconEntry,
  GeneratedMemoryHookCandidate,
  LessonMeaningOccurrence,
  MemoryHookValidationResult,
  PlannedHookComponent,
  RelationshipEvidence,
} from '../../src/features/character-memory-hooks/model';
import type { RuntimeTreeNode } from '../../src/features/character-decomposition/runtimePack';

export interface LegacyCharacterMetadata {
  character: string;
  definition: string | null;
  pinyin: string[] | null;
}

export interface RuntimePlanRecord {
  recordId: string;
  sourceId: string;
  tree: RuntimeTreeNode;
}

export interface PilotSelectionEntry {
  character: string;
  category: 'atomic' | 'canonical-meaning' | 'common-pattern' | 'encoded-intermediate' | 'data-edge';
  reason: string;
}

export const BOOK_ONE_PILOT_SELECTION: PilotSelectionEntry[] = [
  { character: '人', category: 'atomic', reason: 'Atomic character; verifies that structure-only data does not trigger an invented origin.' },
  { character: '心', category: 'atomic', reason: 'Atomic character and high-frequency component family root.' },
  { character: '女', category: 'atomic', reason: 'Atomic character that also recurs as a component in common Book 1 characters.' },
  { character: '好', category: 'canonical-meaning', reason: 'Two standalone lesson meanings; tests canonical good versus lesson-specific very.' },
  { character: '點', category: 'canonical-meaning', reason: 'Two distinct lesson senses and a non-obvious 黑 + 占 structure.' },
  { character: '過', category: 'canonical-meaning', reason: 'Three standalone uses; tests lexical meaning versus grammatical particle uses.' },
  { character: '了', category: 'canonical-meaning', reason: 'Several grammatical senses with little useful component semantics.' },
  { character: '坐', category: 'canonical-meaning', reason: 'Transport and sit senses; canonical construction meaning should favor sit.' },
  { character: '情', category: 'common-pattern', reason: 'No standalone Book 1 entry; tests dictionary-derived canonical meaning and the 青 sound family.' },
  { character: '請', category: 'common-pattern', reason: 'Two lesson meanings plus 言 + 青, useful for relationship-specific role evidence.' },
  { character: '媽', category: 'common-pattern', reason: 'Classic 女 + 馬 formation candidate; tests that 馬 is not globally forced phonetic.' },
  { character: '喝', category: 'common-pattern', reason: 'Common 口 component with 曷; exposes the difference between formation and invented association.' },
  { character: '吃', category: 'common-pattern', reason: 'Common 口 component with a compact two-part structure.' },
  { character: '休', category: 'common-pattern', reason: 'Memorable 亻 + 木 structure and a strong natural-language baseline.' },
  { character: '明', category: 'common-pattern', reason: 'Transparent 日 + 月 combination suitable for concise output testing.' },
  { character: '問', category: 'common-pattern', reason: '門 + 口 tests spatial wording without claiming unsupported history.' },
  { character: '語', category: 'common-pattern', reason: '言 plus an encoded sound-family component; tests missing relationship evidence.' },
  { character: '學', category: 'encoded-intermediate', reason: 'Direct child 𦥯 is expandable; tests deliberate component depth.' },
  { character: '愛', category: 'encoded-intermediate', reason: 'Direct rare glyph 𢖻 expands further; catches arbitrary flattening to 心.' },
  { character: '新', category: 'encoded-intermediate', reason: 'Direct structure is 亲 + 斤, challenging the popular tree-and-axe story.' },
  { character: '說', category: 'encoded-intermediate', reason: '言 + 兌 tests whether unsupported phonetic/semantic claims are withheld.' },
  { character: '聽', category: 'encoded-intermediate', reason: 'Three direct components including rare 𢛳; tests metadata gaps.' },
  { character: '不', category: 'data-edge', reason: 'Contains a source-confirmed unencoded component.' },
  { character: '在', category: 'data-edge', reason: 'Unencoded component plus multiple lesson meanings.' },
  { character: '年', category: 'data-edge', reason: 'Contains an unknown component and must not receive an invented label.' },
  { character: '非', category: 'data-edge', reason: 'Both direct components are unknown.' },
  { character: '長', category: 'data-edge', reason: 'Five direct components including an unencoded shape.' },
  { character: '慶', category: 'data-edge', reason: 'Six direct components and a rare expandable glyph.' },
  { character: '旅', category: 'data-edge', reason: 'Three direct parts including an unencoded shape.' },
  { character: '飛', category: 'data-edge', reason: 'Variant glyphs surround an unknown component.' },
];

function splitGlossParts(value: string): string[] {
  return value.replace(CLASSIFIER_NOTE, '').split(/[;,/]/).map((part) => part.trim()).filter(Boolean);
}

const CLASSIFIER_NOTE = /\s*\((?:M|CL)\s*:\s*([^)]*)\)\s*$/iu;

export function parseClassifierAnnotation(value: string): ClassifierAnnotation | null {
  const match = value.match(CLASSIFIER_NOTE);
  if (!match) return null;
  const entries = match[1].split(',').map((entry) => {
    const characters = [...entry].filter((character) => /\p{Script=Han}/u.test(character));
    const pinyin = entry
      .replace(/[\p{Script=Han}]/gu, '')
      .replace(/[^A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü' -]/giu, '')
      .trim() || null;
    return {
      character: characters[0] ?? '',
      pinyin,
    };
  }).filter((entry) => entry.character.length > 0);
  return {
    raw: match[0].trim(),
    entries,
    source: 'lesson-vocabulary',
  };
}

function coreGloss(value: string): string {
  return (splitGlossParts(value)[0] ?? '')
    .replace(/^\([^)]*\)\s*/, '')
    .replace(CLASSIFIER_NOTE, '')
    .replace(/^to\s+/i, '')
    .trim();
}

function glosses(value: string): string[] {
  return splitGlossParts(value).map((part) => coreGloss(part)).filter(Boolean);
}

function lexicalTokens(value: string): Set<string> {
  return new Set(
    coreGloss(value)
      .toLowerCase()
      .replace(/[^a-z\s-]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 1 && !['the', 'with', 'for', 'used', 'something'].includes(token)),
  );
}

function overlaps(left: string, right: string): boolean {
  const leftTokens = lexicalTokens(left);
  const rightTokens = lexicalTokens(right);
  return [...leftTokens].some((token) => rightTokens.has(token));
}

export function isCharacterEntryVariant(word: string, character: string): boolean {
  return word.normalize('NFKC').split('/').map((part) => part.trim()).filter(Boolean).some((part) => {
    const withoutOptional = part.replace(/\([^)]*\)/g, '');
    return part === character || withoutOptional === character;
  });
}

export function flagPossibleMetadataCollisions(
  inventory: BookCharacterInventoryEntry[],
): BookCharacterInventoryEntry[] {
  const groups = new Map<string, string[]>();
  for (const entry of inventory) {
    const definition = entry.meaningDecision.dictionaryDefinition;
    const pinyin = entry.meaningDecision.selectedPinyin;
    if (!definition || !pinyin) continue;
    const key = `${pinyin}|${definition}`;
    const characters = groups.get(key) ?? [];
    characters.push(entry.character);
    groups.set(key, characters);
  }
  const collisionCharacters = new Set(
    [...groups.values()].filter((characters) => characters.length > 1).flat(),
  );
  return inventory.map((entry) => {
    if (!collisionCharacters.has(entry.character)) return entry;
    return {
      ...entry,
      meaningDecision: {
        ...entry.meaningDecision,
        confidence: 'low',
        reviewReasons: [...new Set([
          ...entry.meaningDecision.reviewReasons,
          'possible-variant-metadata-collision',
        ])],
      },
    };
  });
}

export function chooseCanonicalMeaning(
  lessonSpecificMeanings: LessonMeaningOccurrence[],
  metadata: LegacyCharacterMetadata | null,
): CanonicalMeaningDecision {
  const standalone = lessonSpecificMeanings.filter((occurrence) => occurrence.standalone);
  const uniqueStandalone = [...new Map(
    standalone.map((occurrence) => [`${occurrence.pinyin}|${occurrence.meaning}`, occurrence]),
  ).values()];
  const dictionaryDefinition = metadata?.definition?.trim() || null;
  const dictionaryCore = dictionaryDefinition ? coreGloss(dictionaryDefinition) : '';
  const dictionaryGlosses = dictionaryDefinition ? glosses(dictionaryDefinition) : [];
  const reviewReasons: string[] = [];
  const classifierFor = (occurrence: LessonMeaningOccurrence | undefined): ClassifierAnnotation | null => (
    occurrence ? parseClassifierAnnotation(occurrence.meaning) : null
  );

  if (uniqueStandalone.length > 1) {
    reviewReasons.push('multiple-standalone-lesson-senses');
  }
  if (new Set(uniqueStandalone.map((occurrence) => occurrence.pinyin)).size > 1) {
    reviewReasons.push('multiple-standalone-readings');
  }

  if (dictionaryCore) {
    const lessonGlosses = uniqueStandalone.flatMap((occurrence) => (
      glosses(occurrence.meaning).map((gloss) => ({ occurrence, gloss }))
    ));
    const aligned = dictionaryGlosses.flatMap((dictionaryGloss) => (
      lessonGlosses.map((lessonGloss) => ({ ...lessonGloss, dictionaryGloss }))
    )).find(({ gloss, dictionaryGloss }) => overlaps(gloss, dictionaryGloss));
    if (aligned) {
      return {
        selectedMeaning: aligned.gloss,
        selectedPinyin: aligned.occurrence.pinyin || metadata?.pinyin?.[0] || null,
        selectedClassifier: classifierFor(aligned.occurrence),
        method: 'lesson-dictionary-alignment',
        confidence: reviewReasons.length === 0 ? 'high' : 'medium',
        lessonSpecificMeanings,
        dictionaryDefinition,
        reviewReasons,
      };
    }
  }

  if (uniqueStandalone.length === 1) {
    return {
      selectedMeaning: coreGloss(uniqueStandalone[0].meaning),
      selectedPinyin: uniqueStandalone[0].pinyin || metadata?.pinyin?.[0] || null,
      selectedClassifier: classifierFor(uniqueStandalone[0]),
      method: 'single-standalone-sense',
      confidence: 'medium',
      lessonSpecificMeanings,
      dictionaryDefinition,
      reviewReasons,
    };
  }

  if (dictionaryCore) {
    if (uniqueStandalone.length > 0) reviewReasons.push('dictionary-core-not-aligned-to-lesson-senses');
    else reviewReasons.push('dictionary-only-no-character-entry-evidence');
    return {
      selectedMeaning: dictionaryCore,
      selectedPinyin: metadata?.pinyin?.[0] || uniqueStandalone[0]?.pinyin || null,
      selectedClassifier: null,
      method: 'dictionary-core-gloss',
      confidence: 'low',
      lessonSpecificMeanings,
      dictionaryDefinition,
      reviewReasons,
    };
  }

  return {
    selectedMeaning: null,
    selectedPinyin: uniqueStandalone.length === 1 ? uniqueStandalone[0].pinyin : null,
    selectedClassifier: null,
    method: 'unresolved',
    confidence: 'low',
    lessonSpecificMeanings,
    dictionaryDefinition,
    reviewReasons: [...reviewReasons, 'missing-canonical-character-meaning'],
  };
}

export interface VisibleRuntimeComponent {
  key: string;
  kind: PlannedHookComponent['kind'];
  glyph: string | null;
  treePath: string;
}

export function getDirectVisibleRuntimeComponents(root: RuntimeTreeNode): VisibleRuntimeComponent[] {
  function children(node: RuntimeTreeNode): RuntimeTreeNode[] {
    if (node[0] === 's') return node[2];
    if (node[0] === 'g' && node.length === 3) return node[2];
    return [];
  }

  function visit(node: RuntimeTreeNode, path: number[]): VisibleRuntimeComponent[] {
    if (node[0] === 's') {
      return children(node).flatMap((child, index) => visit(child, [...path, index]));
    }
    if (node[0] === 'g') {
      return [{ key: `g:${node[1]}`, kind: 'glyph', glyph: node[1], treePath: path.join('.') }];
    }
    if (node[0] === 'u') {
      return [{ key: `u:${node[1]}`, kind: 'unencoded-component', glyph: null, treePath: path.join('.') }];
    }
    if (node[0] === '?') {
      return [{ key: node[1] ? `?:${node[1]}` : '?', kind: 'unknown-component', glyph: null, treePath: path.join('.') }];
    }
    return [{ key: `e:${node[1]}`, kind: 'source-entity', glyph: null, treePath: path.join('.') }];
  }

  return children(root).flatMap((child, index) => visit(child, [index]));
}

export function buildCharacterPlan(options: {
  inventory: BookCharacterInventoryEntry;
  runtimeRecord: RuntimePlanRecord | null;
  decompositionVersion: string;
  lexicon: Map<string, ComponentLexiconEntry>;
  relationshipEvidence?: RelationshipEvidence[];
  originEvidence?: CharacterOriginEvidence[];
}): CharacterMemoryHookPlan {
  const { inventory, runtimeRecord, decompositionVersion, lexicon } = options;
  const relationshipEvidence = options.relationshipEvidence ?? [];
  const originEvidence = options.originEvidence ?? [];
  const blockers: string[] = [];
  const direct = runtimeRecord ? getDirectVisibleRuntimeComponents(runtimeRecord.tree) : [];

  if (!runtimeRecord) blockers.push('missing-v3-runtime-record');
  if (!inventory.meaningDecision.selectedMeaning) blockers.push('missing-canonical-meaning');
  if (direct.length > 4) blockers.push('too-many-direct-components');
  if (direct.some((component) => component.kind !== 'glyph')) blockers.push('unresolved-direct-component');

  const components: PlannedHookComponent[] = direct.map((component) => {
    const lexiconEntry = lexicon.get(component.key);
    const safeSenses = lexiconEntry?.senses.filter((sense) => sense.safeForMemoryAid) ?? [];
    const relation = relationshipEvidence.find((item) => (
      item.targetCharacter === inventory.character && item.componentKey === component.key
    ));
    const selectedSense = relation
      ? lexiconEntry?.senses.find((sense) => sense.id === relation.senseId) ?? null
      : safeSenses.length === 1 ? safeSenses[0] : null;

    if (component.kind === 'glyph' && !selectedSense) blockers.push(`missing-component-sense:${component.key}`);
    if (relation && relation.sourceRefs.length === 0) blockers.push(`unsupported-component-role:${component.key}`);

    return {
      ...component,
      senseId: selectedSense?.id ?? null,
      label: selectedSense?.label ?? null,
      role: relation?.role ?? 'unclassified',
      roleEvidenceRefs: relation?.sourceRefs ?? [],
    };
  });

  const uniqueBlockers = [...new Set(blockers)];
  const directKeys = direct.map((component) => component.key).sort();
  const origin = originEvidence.find((item) => (
    item.targetCharacter === inventory.character
    && item.canonicalMeaning === inventory.meaningDecision.selectedMeaning
    && item.licenseStatus === 'cleared'
    && item.sourceRefs.length > 0
    && JSON.stringify([...new Set(item.componentKeys)].sort()) === JSON.stringify(directKeys)
  ));
  if (direct.length === 0 && !origin) uniqueBlockers.push('atomic-character-requires-origin-evidence');
  const hasSupportedRoles = components.length > 0 && components.every((component) => (
    component.role !== 'unclassified' && component.roleEvidenceRefs.length > 0
  ));
  const canGenerateOrigin = Boolean(origin) && uniqueBlockers.length === 0;
  const canGenerateMemoryAid = uniqueBlockers.length === 0 && components.length >= 2;
  const eligible = canGenerateOrigin || canGenerateMemoryAid;

  return {
    character: inventory.character,
    bookId: inventory.bookId,
    decompositionVersion,
    decompositionRecordId: runtimeRecord?.recordId ?? null,
    decompositionSourceId: runtimeRecord?.sourceId ?? null,
    distribution: 'development-only-candidate',
    publishable: false,
    meaningDecision: inventory.meaningDecision,
    components,
    status: eligible ? 'eligible' : direct.length === 0 ? 'no-hook' : 'needs-review',
    proposedKind: canGenerateOrigin ? 'origin' : canGenerateMemoryAid ? (hasSupportedRoles ? 'formation-clue' : 'memory-aid') : null,
    originClaim: origin?.claim ?? null,
    evidenceRefs: canGenerateOrigin
      ? origin!.sourceRefs
      : hasSupportedRoles
        ? [...new Set(components.flatMap((component) => component.roleEvidenceRefs))]
        : [],
    blockers: [...new Set(uniqueBlockers)],
  };
}

const FORBIDDEN_ORIGIN_LANGUAGE = /\b(ancient|historically|history|originally|origin|evolved|pictograph|oracle bone|bronze script|the chinese believed|was created|was formed|comes from|symbolized|represented)\b/i;

export function validateGeneratedCandidate(
  plan: CharacterMemoryHookPlan,
  candidate: GeneratedMemoryHookCandidate,
): MemoryHookValidationResult {
  const issues: MemoryHookValidationResult['issues'] = [];
  const add = (code: string, message: string) => issues.push({ code, message });

  if (plan.status !== 'eligible') add('plan-not-eligible', 'The source plan is not eligible for generation.');
  if (candidate.character !== plan.character) add('character-mismatch', 'Candidate character differs from its plan.');
  if (candidate.kind !== plan.proposedKind) add('kind-mismatch', 'Candidate kind differs from the planned kind.');
  if (candidate.canonicalMeaning !== plan.meaningDecision.selectedMeaning) {
    add('meaning-mismatch', 'Candidate changed the canonical meaning selected by the planner.');
  }
  if (candidate.hook.length < 20 || candidate.hook.length > 280) add('invalid-length', 'Hook must be 20–280 characters.');
  const selectedMeaning = plan.meaningDecision.selectedMeaning;
  if (selectedMeaning && !candidate.hook.toLowerCase().includes(selectedMeaning.toLowerCase())) {
    add('missing-canonical-meaning', 'Hook text must include the selected canonical meaning.');
  }

  const sentenceCount = candidate.hook.split(/[.!?。！？]+/).filter((part) => part.trim()).length;
  if (sentenceCount > 2) add('too-many-sentences', 'Hook must use at most two sentences.');

  const plannedKeys = plan.components.map((component) => component.key).sort();
  const candidateKeys = [...new Set(candidate.componentRefs)].sort();
  if (JSON.stringify(candidateKeys) !== JSON.stringify(plannedKeys)) {
    add('component-reference-mismatch', 'Candidate component references must exactly match the planned direct components.');
  }

  for (const component of plan.components) {
    if (!component.glyph || !component.label) continue;
    if (!candidate.hook.includes(`${component.glyph}(${component.label})`)) {
      add('missing-component-token', `Hook must contain ${component.glyph}(${component.label}).`);
    }
  }

  const allowedHan = new Set([
    plan.character,
    ...plan.components.flatMap((component) => component.glyph ? Array.from(component.glyph) : []),
  ]);
  const unexpectedHan = [...new Set(Array.from(candidate.hook).filter((value) => (
    /\p{Script=Han}/u.test(value) && !allowedHan.has(value)
  )))];
  if (unexpectedHan.length > 0) {
    add('unexpected-han-glyph', `Hook contains unplanned Han glyphs: ${unexpectedHan.join(' ')}.`);
  }

  const expectedTokens = new Set(plan.components.flatMap((component) => (
    component.glyph && component.label ? [`${component.glyph}(${component.label})`] : []
  )));
  const componentTokens = candidate.hook.match(/\p{Script=Han}+\([^)]+\)/gu) ?? [];
  if (componentTokens.some((token) => !expectedTokens.has(token))) {
    add('unexpected-component-token', 'Hook contains a component token not supplied by the plan.');
  }

  if (candidate.kind !== 'origin' && FORBIDDEN_ORIGIN_LANGUAGE.test(candidate.hook)) {
    add('unsupported-origin-language', 'Only sourced origin hooks may use historical-origin language.');
  }
  if (candidate.kind === 'origin' && (!plan.originClaim || candidate.evidenceRefs.length === 0)) {
    add('missing-origin-evidence', 'Origin hooks require at least one evidence reference.');
  }
  const plannedEvidence = [...new Set(plan.evidenceRefs)].sort();
  const candidateEvidence = [...new Set(candidate.evidenceRefs)].sort();
  if (JSON.stringify(plannedEvidence) !== JSON.stringify(candidateEvidence)) {
    add('evidence-reference-mismatch', 'Candidate evidence references must exactly match the source plan.');
  }

  return { character: plan.character, valid: issues.length === 0, issues };
}

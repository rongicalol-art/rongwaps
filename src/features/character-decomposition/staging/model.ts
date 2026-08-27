import { createHash } from 'node:crypto';
import type {
  NormalizedCharacterDecomposition,
  NormalizedDecompositionNode,
} from '../../../types/decomposition';
import type {
  AdaptedDecompositionRecord,
  CjkviCharacterRecord,
  Cns11643Record,
  MakeMeAHanziRawRecord,
} from '../sources';
import {
  getVisibleCardChildren,
  projectLearnerDecomposition,
  resolveExplorableCharacterTree,
} from '../../../utils/idsParser';

export const DECOMPOSITION_IMPORTER_VERSION = 'phase3-v1';
export const DECOMPOSITION_PARSER_VERSION = 'normalized-ids-v2';
export const TAIWAN_SELECTION_POLICY_VERSION = 'zh-Hant-TW-v1';

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface StagingSourceInput {
  id: string;
  name: string;
  version: string;
  sourceUrl: string | null;
  license: string | null;
  licenseUrl: string | null;
  attribution: string | null;
  checksum: string;
  retrievedAt: string | null;
  localeScope: string[];
  redistributionStatus: 'cleared' | 'review' | 'blocked';
  notes: string | null;
}

export interface StagingBuildInput {
  sources: StagingSourceInput[];
  makeMeAHanzi: AdaptedDecompositionRecord<MakeMeAHanziRawRecord>[];
  cjkvi: CjkviCharacterRecord[];
  cns11643: Cns11643Record[];
  traditionalCourse: Set<string>;
  simplifiedCourse: Set<string>;
  phase2Metrics?: JsonObject | null;
}

export interface StagingPlan {
  decomposition_sources: JsonObject[];
  decomposition_import_batches: JsonObject[];
  decomposition_source_records: JsonObject[];
  decomposition_source_preferences: JsonObject[];
  decomposition_course_characters: JsonObject[];
  decomposition_node_references: JsonObject[];
  decomposition_component_metadata: JsonObject[];
  decomposition_diagnostics: JsonObject[];
  decomposition_releases: JsonObject[];
  decomposition_release_sources: JsonObject[];
  decomposition_release_blockers: JsonObject[];
  decomposition_selection_decisions: JsonObject[];
  decomposition_conflicts: JsonObject[];
  decomposition_conflict_assertions: JsonObject[];
  metrics: StagingMetrics;
  comparison: Phase2StagedComparison;
}

export interface CoverageMetrics {
  total: number;
  selected: number;
  unresolved: number;
  unresolvedCharacters: string[];
}

export interface StagingMetrics {
  sourceRecords: number;
  parsedRecords: number;
  failedRecords: number;
  missingDecompositionRecords: number;
  metadataOnlyRecords: number;
  unencodedComponentOccurrences: number;
  unknownComponentOccurrences: number;
  sourceEntityOccurrences: number;
  selectedCjkviUnencodedComponentOccurrences: number;
  makeMeAHanziUnknownComponentOccurrences: number;
  regionalVariantCharacters: number;
  taiwanSpecificVariantCharacters: number;
  taiwanSpecificAlternatives: number;
  unsupportedRegionalCharacters: number;
  directChildConflicts: number;
  missingReferencedGlyphs: number;
  selectedCjkviMissingReferencedGlyphs: number;
  maximumTreeDepth: number;
  traditionalCourse: CoverageMetrics;
  simplifiedCourse: CoverageMetrics;
  specialTraditionalCharacters: Record<string, 'selected' | 'unresolved'>;
  releaseStatus: 'blocked';
  licensingBlockers: number;
}

export interface Phase2StagedComparison {
  phase2Available: boolean;
  checks: Array<{
    metric: string;
    expected: number | null;
    actual: number;
    matches: boolean | null;
  }>;
}

interface RecordWithId {
  record: AdaptedDecompositionRecord;
  id: string;
  parseStatus: 'parsed' | 'atomic' | 'missing' | 'failed' | 'metadata-only';
}

function canonicalize(value: unknown): JsonValue {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)]));
  }
  return String(value);
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value: unknown): string {
  return createHash('sha256').update(typeof value === 'string' ? value : canonicalJson(value)).digest('hex');
}

export function deterministicUuid(namespace: string, value: unknown): string {
  const bytes = Buffer.from(sha256(`${namespace}\0${canonicalJson(value)}`).slice(0, 32), 'hex');
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isAtomicSelf(normalized: NormalizedCharacterDecomposition | null): boolean {
  return normalized?.tree.kind === 'glyph'
    && normalized.tree.glyph === normalized.character
    && normalized.tree.children.length === 0;
}

function parseStatus(record: AdaptedDecompositionRecord): RecordWithId['parseStatus'] {
  if (record.normalized) return isAtomicSelf(record.normalized) ? 'atomic' : 'parsed';
  if (record.source.id === 'cns11643-open-data') return 'metadata-only';
  if (record.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) return 'failed';
  return 'missing';
}

function walkTree(
  node: NormalizedDecompositionNode,
  path: number[] = [],
): Array<{ node: NormalizedDecompositionNode; path: number[] }> {
  return [
    { node, path },
    ...node.children.flatMap((child, index) => walkTree(child, [...path, index])),
  ];
}

function treeDepth(node: NormalizedDecompositionNode): number {
  return 1 + (node.children.length ? Math.max(...node.children.map(treeDepth)) : 0);
}

function visibleChildren(record: AdaptedDecompositionRecord | null | undefined): string[] | null {
  if (!record?.normalized || isAtomicSelf(record.normalized)) return null;
  const projected = projectLearnerDecomposition(resolveExplorableCharacterTree(record.normalized, new Map()));
  return getVisibleCardChildren(projected.root).map((node) => {
    if (node.kind === 'glyph') return node.glyph;
    if (node.kind === 'unencoded-component') return `unencoded:${node.componentSourceId}`;
    if (node.kind === 'source-entity') return `entity:${node.entity}`;
    return 'unknown-component';
  });
}

function diagnosticCategory(code: string): string {
  if (code.includes('operand')) return 'invalid-operand';
  if (code.includes('unknown')) return 'unknown-component';
  if (code.includes('missing-decomposition')) return 'missing-decomposition';
  if (code.includes('region') || code.includes('taiwan-compatible')) return 'unsupported-region';
  if (code.includes('cycle')) return 'cycle';
  if (code.includes('parse') || code.includes('expression') || code.includes('token')) return 'malformed-expression';
  return 'other';
}

function addMetadataRows(
  output: JsonObject[],
  recordId: string,
  glyph: string,
  locale: string,
  fields: Array<[string, unknown[]]>,
) {
  for (const [fieldName, values] of fields) {
    values.forEach((value, ordinal) => {
      const identity = { glyph, locale, fieldName, ordinal, recordId, value };
      output.push({
        id: deterministicUuid('decomposition-component-metadata', identity),
        glyph,
        locale,
        field_name: fieldName,
        ordinal,
        value: canonicalize(value),
        qualifiers: {},
        source_record_id: recordId,
        checksum: sha256(identity),
      });
    });
  }
}

function sourceRecordRow(record: AdaptedDecompositionRecord, batchId: string): RecordWithId & { row: JsonObject } {
  const identity = {
    sourceId: record.source.id,
    sourceVersion: record.source.version,
    sourceRecordId: record.source.recordId,
  };
  const id = deterministicUuid('decomposition-source-record', identity);
  const status = parseStatus(record);
  const payload = {
    rawRecord: record.rawRecord,
    rawIdsExpression: record.rawIdsExpression,
    normalizedTree: record.normalized?.tree ?? null,
    diagnostics: record.diagnostics,
  };
  return {
    record,
    id,
    parseStatus: status,
    row: {
      id,
      source_id: record.source.id,
      source_version: record.source.version,
      source_record_id: record.source.recordId,
      character: record.character,
      region_qualifiers: record.regionalQualifiers,
      locale: record.locale,
      parsing_dialect: record.normalized?.dialect ?? null,
      adapter_id: record.normalized?.adapterId ?? (
        record.source.id === 'cns11643-open-data' ? 'cns11643-bulk-v1' : 'unknown-adapter'
      ),
      raw_record: canonicalize(record.rawRecord),
      raw_ids_expression: record.rawIdsExpression,
      normalized_tree: record.normalized ? canonicalize(record.normalized.tree) : null,
      parse_status: status,
      diagnostics: canonicalize(record.diagnostics),
      checksum: sha256(payload),
      import_batch_id: batchId,
    },
  };
}

function expectedMetric(phase2: JsonObject | null | undefined, path: string[]): number | null {
  let value: JsonValue | undefined = phase2 ?? undefined;
  for (const key of path) {
    if (!value || Array.isArray(value) || typeof value !== 'object') return null;
    value = value[key];
  }
  if (typeof value === 'number') return value;
  return Array.isArray(value) ? value.length : null;
}

export function buildDecompositionStagingPlan(input: StagingBuildInput): StagingPlan {
  const allAdaptedRecords: AdaptedDecompositionRecord[] = [
    ...input.makeMeAHanzi,
    ...input.cjkvi.flatMap((record) => record.alternatives),
    ...input.cns11643,
  ];
  const manifest = input.sources.map((source) => ({ id: source.id, version: source.version, checksum: source.checksum }));
  const inputManifestChecksum = sha256(manifest);
  const batchId = deterministicUuid('decomposition-import-batch', {
    importer: DECOMPOSITION_IMPORTER_VERSION,
    parser: DECOMPOSITION_PARSER_VERSION,
    policy: TAIWAN_SELECTION_POLICY_VERSION,
    inputManifestChecksum,
  });
  const releaseId = deterministicUuid('decomposition-release', {
    key: `taiwan-course-hybrid-${inputManifestChecksum.slice(0, 12)}`,
  });
  const records = allAdaptedRecords.map((record) => sourceRecordRow(record, batchId));
  const recordByKey = new Map(records.map((item) => [
    `${item.record.source.id}:${item.record.source.version}:${item.record.source.recordId}`,
    item,
  ]));
  const decomposition_source_records = records.map((item) => item.row);
  const decomposition_node_references: JsonObject[] = [];
  const decomposition_component_metadata: JsonObject[] = [];
  const decomposition_diagnostics: JsonObject[] = [];

  for (const item of records) {
    if (item.record.normalized) {
      for (const { node, path } of walkTree(item.record.normalized.tree)) {
        decomposition_node_references.push({
          id: deterministicUuid('decomposition-node-reference', { recordId: item.id, nodeId: node.id }),
          import_batch_id: batchId,
          source_record_id: item.id,
          node_id: node.id,
          node_path: path,
          node_kind: node.kind,
          glyph: node.kind === 'glyph' ? node.glyph : null,
          component_source_id: node.kind === 'unencoded-component' || node.kind === 'unknown-component'
            ? node.componentSourceId ?? null
            : null,
          source_entity: node.kind === 'source-entity' ? node.entity : null,
          ids_operator: node.kind === 'structure' ? node.operator : null,
        });
        if (node.kind === 'unencoded-component' || node.kind === 'unknown-component' || node.kind === 'source-entity') {
          const category = node.kind === 'unencoded-component'
            ? 'unencoded-component'
            : node.kind === 'unknown-component' ? 'unknown-component' : 'source-entity';
          const diagnostic = {
            batchId,
            recordId: item.id,
            nodeId: node.id,
            category,
            rawToken: node.rawToken,
          };
          decomposition_diagnostics.push({
            id: deterministicUuid('decomposition-diagnostic', diagnostic),
            import_batch_id: batchId,
            source_record_id: item.id,
            character: item.record.character,
            locale: item.record.locale,
            category,
            code: `normalized-${node.kind}`,
            severity: node.kind === 'unknown-component' ? 'warning' : 'info',
            message: `${node.kind} preserved from source operand ${node.rawToken}`,
            node_id: node.id,
            token_index: null,
            details: { rawToken: node.rawToken },
            checksum: sha256(diagnostic),
          });
        }
      }
    }
    for (const diagnostic of item.record.diagnostics) {
      const identity = { batchId, recordId: item.id, diagnostic };
      decomposition_diagnostics.push({
        id: deterministicUuid('decomposition-diagnostic', identity),
        import_batch_id: batchId,
        source_record_id: item.id,
        character: item.record.character,
        locale: item.record.locale,
        category: diagnosticCategory(diagnostic.code),
        code: diagnostic.code,
        severity: diagnostic.severity,
        message: diagnostic.message,
        node_id: null,
        token_index: diagnostic.tokenIndex ?? null,
        details: {},
        checksum: sha256(identity),
      });
    }
  }

  for (const item of records) {
    if (item.record.source.id === 'makemeahanzi-dictionary') {
      const raw = item.record.rawRecord as MakeMeAHanziRawRecord;
      addMetadataRows(decomposition_component_metadata, item.id, item.record.character, item.record.locale, [
        ['radical', raw.radical ? [raw.radical] : []],
        ['pinyin', Array.isArray(raw.pinyin) ? raw.pinyin : raw.pinyin ? [raw.pinyin] : []],
        ['definition', raw.definition ? [raw.definition] : []],
        ['historical-component', raw.components_historical ?? []],
      ]);
    }
  }
  for (const record of input.cns11643) {
    const item = recordByKey.get(`${record.source.id}:${record.source.version}:${record.source.recordId}`)!;
    addMetadataRows(decomposition_component_metadata, item.id, record.character, record.locale, [
      ['cns-code', [record.cnsCode]],
      ['unicode-code-point', [record.unicodeCodePoint]],
      ['zhuyin', record.zhuyin],
      ['romanization', record.romanizations],
      ['radical-number', record.radicalNumbers],
      ['stroke-count', record.strokeCounts],
      ['stroke-sequence', record.strokeSequences],
      ['flat-component', record.components],
      ['identity-source', record.identitySources],
    ]);
  }

  const cjkviByCharacter = new Map(input.cjkvi.map((record) => [record.character, record]));
  const makeByCharacter = new Map(input.makeMeAHanzi.map((record) => [record.character, record]));
  const selectedForCharacter = new Map<string, { item: RecordWithId; reason: string; status: 'selected' | 'atomic-leaf' }>();
  const selectionUniverse = new Set([...cjkviByCharacter.keys(), ...makeByCharacter.keys()]);
  for (const character of selectionUniverse) {
    const cjkvi = cjkviByCharacter.get(character)?.selected ?? null;
    const make = makeByCharacter.get(character) ?? null;
    let selected: AdaptedDecompositionRecord | null = null;
    let reason = '';
    let status: 'selected' | 'atomic-leaf' = 'selected';
    if (cjkvi?.normalized && !isAtomicSelf(cjkvi.normalized)) {
      selected = cjkvi;
      reason = cjkvi.regionalQualifiers.includes('T') ? 'cjkvi-explicit-t' : 'cjkvi-neutral';
    } else if (make?.normalized && !isAtomicSelf(make.normalized)) {
      selected = make;
      reason = 'makemeahanzi-structural-fallback';
    } else if (cjkvi?.normalized || make?.normalized) {
      selected = cjkvi?.normalized ? cjkvi : make;
      reason = 'atomic-leaf';
      status = 'atomic-leaf';
    }
    if (selected) {
      const item = recordByKey.get(`${selected.source.id}:${selected.source.version}:${selected.source.recordId}`)!;
      selectedForCharacter.set(character, { item, reason, status });
    }
  }

  const visitState = new Map<string, 'visiting' | 'visited'>();
  const visitStack: string[] = [];
  const seenCycles = new Set<string>();
  const visit = (character: string) => {
    const state = visitState.get(character);
    if (state === 'visited') return;
    if (state === 'visiting') {
      const start = visitStack.lastIndexOf(character);
      const cycle = [...visitStack.slice(start), character];
      const cycleKey = [...new Set(cycle)].sort().join('|');
      if (seenCycles.has(cycleKey)) return;
      seenCycles.add(cycleKey);
      const cycleDiagnostic = { batchId, cycle };
      decomposition_diagnostics.push({
        id: deterministicUuid('decomposition-diagnostic', cycleDiagnostic),
        import_batch_id: batchId,
        source_record_id: selectedForCharacter.get(character)?.item.id ?? null,
        character,
        locale: 'zh-Hant-TW',
        category: 'cycle',
        code: 'selected-record-reference-cycle',
        severity: 'warning',
        message: `Selected decomposition reference cycle: ${cycle.join(' → ')}`,
        node_id: null,
        token_index: null,
        details: { cycle },
        checksum: sha256(cycleDiagnostic),
      });
      return;
    }
    const selected = selectedForCharacter.get(character);
    if (!selected?.item.record.normalized || selected.status === 'atomic-leaf') {
      visitState.set(character, 'visited');
      return;
    }
    visitState.set(character, 'visiting');
    visitStack.push(character);
    const referenced = new Set(walkTree(selected.item.record.normalized.tree)
      .map(({ node }) => node.kind === 'glyph' ? node.glyph : null)
      .filter((glyph): glyph is string => Boolean(glyph && glyph !== character && selectedForCharacter.has(glyph))));
    for (const glyph of referenced) visit(glyph);
    visitStack.pop();
    visitState.set(character, 'visited');
  };
  for (const character of selectionUniverse) visit(character);

  const decomposition_selection_decisions: JsonObject[] = [...selectionUniverse].sort().map((character) => {
    const selected = selectedForCharacter.get(character);
    const identity = { releaseId, character, locale: 'zh-Hant-TW' };
    return {
      id: deterministicUuid('decomposition-selection-decision', identity),
      release_id: releaseId,
      character,
      locale: 'zh-Hant-TW',
      selected_source_record_id: selected?.item.id ?? null,
      manual_override_id: null,
      selection_status: selected?.status ?? 'unresolved',
      selection_reason: selected?.reason ?? 'no-source-record',
      quality_score: selected?.reason.startsWith('cjkvi') ? 0.9 : selected?.status === 'atomic-leaf' ? 1 : 0.7,
      quality_status: !selected ? 'unresolved'
        : selected.status === 'atomic-leaf' ? 'atomic'
          : selected.reason.startsWith('cjkvi') ? 'source-preferred' : 'fallback',
      reviewed: false,
    };
  });
  const decomposition_source_preferences: JsonObject[] = input.cjkvi.map((sourceRecord) => {
    const selected = sourceRecord.selected
      ? recordByKey.get(`${sourceRecord.selected.source.id}:${sourceRecord.selected.source.version}:${sourceRecord.selected.source.recordId}`)
      : null;
    const identity = {
      batchId,
      sourceId: 'cjkvi-ids',
      sourceVersion: input.sources.find((source) => source.id === 'cjkvi-ids')?.version ?? '',
      character: sourceRecord.character,
      locale: 'zh-Hant-TW',
      policyVersion: TAIWAN_SELECTION_POLICY_VERSION,
    };
    return {
      id: deterministicUuid('decomposition-source-preference', identity),
      import_batch_id: batchId,
      source_id: 'cjkvi-ids',
      source_version: identity.sourceVersion,
      character: sourceRecord.character,
      locale: 'zh-Hant-TW',
      policy_version: TAIWAN_SELECTION_POLICY_VERSION,
      selected_source_record_id: selected?.id ?? null,
      selection_status: selected
        ? selected.parseStatus === 'failed' ? 'parse-failure' : 'selected'
        : 'unsupported-region',
      selection_reason: sourceRecord.selectionReason,
    };
  });
  const decomposition_course_characters: JsonObject[] = [
    ...[...input.traditionalCourse].map((character) => ({
      import_batch_id: batchId, course_variant: 'traditional', character,
    })),
    ...[...input.simplifiedCourse].map((character) => ({
      import_batch_id: batchId, course_variant: 'simplified', character,
    })),
  ];

  const decomposition_conflicts: JsonObject[] = [];
  const decomposition_conflict_assertions: JsonObject[] = [];
  for (const make of input.makeMeAHanzi) {
    const cjkvi = cjkviByCharacter.get(make.character)?.selected;
    const makeChildren = visibleChildren(make);
    const cjkviChildren = visibleChildren(cjkvi);
    if (!makeChildren || !cjkviChildren || canonicalJson(makeChildren) === canonicalJson(cjkviChildren)) continue;
    const makeItem = recordByKey.get(`${make.source.id}:${make.source.version}:${make.source.recordId}`)!;
    const cjkviItem = recordByKey.get(`${cjkvi!.source.id}:${cjkvi!.source.version}:${cjkvi!.source.recordId}`)!;
    const selected = selectedForCharacter.get(make.character);
    const identity = { releaseId, character: make.character, makeChildren, cjkviChildren };
    const conflictId = deterministicUuid('decomposition-conflict', identity);
    decomposition_conflicts.push({
      id: conflictId,
      release_id: releaseId,
      character: make.character,
      locale: 'zh-Hant-TW',
      conflict_kind: 'learner-visible-direct-children',
      selected_source_record_id: selected?.item.id ?? cjkviItem.id,
      resolution_reason: 'Taiwan policy prefers explicit [T], then neutral CJKVI; disagreement remains preserved.',
      resolution_method: 'automatic',
      reviewed_by: null,
      reviewed_at: null,
      checksum: sha256(identity),
    });
    decomposition_conflict_assertions.push(
      { conflict_id: conflictId, source_record_id: makeItem.id, assertion: { directChildren: makeChildren } },
      { conflict_id: conflictId, source_record_id: cjkviItem.id, assertion: { directChildren: cjkviChildren } },
    );
    const conflictDiagnostic = { batchId, conflictId, character: make.character };
    decomposition_diagnostics.push({
      id: deterministicUuid('decomposition-diagnostic', conflictDiagnostic),
      import_batch_id: batchId,
      source_record_id: null,
      character: make.character,
      locale: 'zh-Hant-TW',
      category: 'source-conflict',
      code: 'learner-visible-direct-child-conflict',
      severity: 'warning',
      message: 'Make Me a Hanzi and selected CJKVI direct children disagree.',
      node_id: null,
      token_index: null,
      details: { conflictId, makeMeAHanzi: makeChildren, cjkvi: cjkviChildren },
      checksum: sha256(conflictDiagnostic),
    });
  }

  const identityBySource = new Map<string, Set<string>>();
  for (const item of records) {
    const key = `${item.record.source.id}:${item.record.source.version}`;
    const set = identityBySource.get(key) ?? new Set<string>();
    set.add(item.record.character);
    identityBySource.set(key, set);
  }
  let missingReferencedGlyphs = 0;
  for (const item of records) {
    if (!item.record.normalized) continue;
    const identity = identityBySource.get(`${item.record.source.id}:${item.record.source.version}`)!;
    for (const { node } of walkTree(item.record.normalized.tree)) {
      if (node.kind !== 'glyph' || node.glyph === item.record.character || identity.has(node.glyph)) continue;
      missingReferencedGlyphs += 1;
      const detail = { batchId, recordId: item.id, glyph: node.glyph, nodeId: node.id };
      decomposition_diagnostics.push({
        id: deterministicUuid('decomposition-diagnostic', detail),
        import_batch_id: batchId,
        source_record_id: item.id,
        character: item.record.character,
        locale: item.record.locale,
        category: 'missing-reference',
        code: 'missing-referenced-glyph-record',
        severity: 'warning',
        message: `No ${item.record.source.id} record exists for referenced glyph ${node.glyph}`,
        node_id: node.id,
        token_index: null,
        details: { glyph: node.glyph },
        checksum: sha256(detail),
      });
    }
  }
  const selectedCjkviIdentity = new Set(input.cjkvi
    .filter((record) => record.selected)
    .map((record) => record.character));
  const selectedCjkviMissing = new Set<string>();
  for (const sourceRecord of input.cjkvi) {
    const selected = sourceRecord.selected;
    if (!selected?.normalized) continue;
    const item = recordByKey.get(`${selected.source.id}:${selected.source.version}:${selected.source.recordId}`)!;
    for (const { node } of walkTree(selected.normalized.tree)) {
      if (node.kind !== 'glyph' || node.glyph === selected.character || selectedCjkviIdentity.has(node.glyph)) continue;
      selectedCjkviMissing.add(node.glyph);
      const detail = { batchId, recordId: item.id, glyph: node.glyph, nodeId: node.id, locale: 'zh-Hant-TW' };
      decomposition_diagnostics.push({
        id: deterministicUuid('decomposition-diagnostic', detail),
        import_batch_id: batchId,
        source_record_id: item.id,
        character: selected.character,
        locale: 'zh-Hant-TW',
        category: 'missing-reference',
        code: 'missing-selected-locale-glyph-record',
        severity: 'warning',
        message: `Referenced glyph ${node.glyph} has no Taiwan-compatible selected CJKVI record.`,
        node_id: node.id,
        token_index: null,
        details: { glyph: node.glyph, sourceId: 'cjkvi-ids' },
        checksum: sha256(detail),
      });
    }
  }

  const coverage = (course: Set<string>): CoverageMetrics => {
    const unresolvedCharacters = [...course].filter((character) => !selectedForCharacter.has(character)).sort();
    return {
      total: course.size,
      selected: course.size - unresolvedCharacters.length,
      unresolved: unresolvedCharacters.length,
      unresolvedCharacters,
    };
  };
  const allNodes = records.flatMap((item) => item.record.normalized ? walkTree(item.record.normalized.tree).map(({ node }) => node) : []);
  const selectedCjkviNodes = input.cjkvi.flatMap((record) => (
    record.selected?.normalized ? walkTree(record.selected.normalized.tree).map(({ node }) => node) : []
  ));
  const makeMeAHanziNodes = input.makeMeAHanzi.flatMap((record) => (
    record.normalized ? walkTree(record.normalized.tree).map(({ node }) => node) : []
  ));
  const licensingBlockers = input.sources.filter((source) => source.redistributionStatus !== 'cleared').length;
  const metrics: StagingMetrics = {
    sourceRecords: records.length,
    parsedRecords: records.filter((item) => item.parseStatus === 'parsed' || item.parseStatus === 'atomic').length,
    failedRecords: records.filter((item) => item.parseStatus === 'failed').length,
    missingDecompositionRecords: records.filter((item) => item.parseStatus === 'missing').length,
    metadataOnlyRecords: records.filter((item) => item.parseStatus === 'metadata-only').length,
    unencodedComponentOccurrences: allNodes.filter((node) => node.kind === 'unencoded-component').length,
    unknownComponentOccurrences: allNodes.filter((node) => node.kind === 'unknown-component').length,
    sourceEntityOccurrences: allNodes.filter((node) => node.kind === 'source-entity').length,
    selectedCjkviUnencodedComponentOccurrences: selectedCjkviNodes
      .filter((node) => node.kind === 'unencoded-component').length,
    makeMeAHanziUnknownComponentOccurrences: makeMeAHanziNodes
      .filter((node) => node.kind === 'unknown-component').length,
    regionalVariantCharacters: input.cjkvi.filter((record) => (
      record.alternatives.some((alternative) => alternative.regionalQualifiers.length > 0)
    )).length,
    taiwanSpecificVariantCharacters: input.cjkvi.filter((record) => (
      record.alternatives.some((alternative) => alternative.regionalQualifiers.includes('T'))
    )).length,
    taiwanSpecificAlternatives: input.cjkvi.flatMap((record) => record.alternatives)
      .filter((record) => record.regionalQualifiers.includes('T')).length,
    unsupportedRegionalCharacters: input.cjkvi.filter((record) => record.selectionReason === 'no-taiwan-compatible-variant').length,
    directChildConflicts: decomposition_conflicts.length,
    missingReferencedGlyphs,
    selectedCjkviMissingReferencedGlyphs: selectedCjkviMissing.size,
    maximumTreeDepth: records.reduce((maximum, item) => (
      Math.max(maximum, item.record.normalized ? treeDepth(item.record.normalized.tree) : 0)
    ), 0),
    traditionalCourse: coverage(input.traditionalCourse),
    simplifiedCourse: coverage(input.simplifiedCourse),
    specialTraditionalCharacters: Object.fromEntries(['嚐', '溼', '汙'].map((character) => [
      character,
      selectedForCharacter.has(character) ? 'selected' : 'unresolved',
    ])),
    releaseStatus: 'blocked',
    licensingBlockers,
  };

  const phase2Expected = {
    traditionalCourse: expectedMetric(input.phase2Metrics, ['courseCharacters', 'traditional']),
    simplifiedCourse: expectedMetric(input.phase2Metrics, ['courseCharacters', 'simplified']),
    directChildConflicts: expectedMetric(input.phase2Metrics, ['conflicts', 'makeMeAHanziVsSelectedCjkvi']),
    regionalVariants: expectedMetric(input.phase2Metrics, ['sources', 'cjkvi', 'regionalVariantCharacters']),
    taiwanVariants: expectedMetric(input.phase2Metrics, ['sources', 'cjkvi', 'taiwanSpecificVariantCharacters']),
    selectedUnencoded: expectedMetric(input.phase2Metrics, ['sources', 'cjkvi', 'unencodedComponentOccurrences']),
    unknown: expectedMetric(input.phase2Metrics, ['sources', 'makeMeAHanzi', 'unknownComponentOccurrences']),
    failedAlternatives: expectedMetric(input.phase2Metrics, ['sources', 'cjkvi', 'failedAlternatives']),
    cnsRecords: expectedMetric(input.phase2Metrics, ['sources', 'cns11643', 'metadataParsedRecords']),
    cjkviMissingReferences: expectedMetric(input.phase2Metrics, ['sources', 'cjkvi', 'missingReferencedGlyphs']),
  };
  const checks = [
    ['Traditional course characters', phase2Expected.traditionalCourse, metrics.traditionalCourse.total],
    ['Traditional unresolved', 0, metrics.traditionalCourse.unresolved],
    ['Simplified course characters', phase2Expected.simplifiedCourse, metrics.simplifiedCourse.total],
    ['Simplified unresolved', 0, metrics.simplifiedCourse.unresolved],
    ['Direct-child conflicts', phase2Expected.directChildConflicts, metrics.directChildConflicts],
    ['Regional-variant characters', phase2Expected.regionalVariants, metrics.regionalVariantCharacters],
    ['Taiwan-specific variant characters', phase2Expected.taiwanVariants, metrics.taiwanSpecificVariantCharacters],
    ['Selected CJKVI unencoded components', phase2Expected.selectedUnencoded, metrics.selectedCjkviUnencodedComponentOccurrences],
    ['Make Me a Hanzi unknown components', phase2Expected.unknown, metrics.makeMeAHanziUnknownComponentOccurrences],
    ['Failed CJKVI alternatives', phase2Expected.failedAlternatives, metrics.failedRecords],
    ['CNS metadata records', phase2Expected.cnsRecords, metrics.metadataOnlyRecords],
    ['Selected CJKVI missing referenced glyphs', phase2Expected.cjkviMissingReferences, metrics.selectedCjkviMissingReferencedGlyphs],
  ] as const;
  const comparison: Phase2StagedComparison = {
    phase2Available: Boolean(input.phase2Metrics),
    checks: checks.map(([metric, expected, actual]) => ({
      metric,
      expected,
      actual,
      matches: expected === null ? null : expected === actual,
    })),
  };

  const releaseKey = `taiwan-course-hybrid-${inputManifestChecksum.slice(0, 12)}`;
  const decomposition_releases: JsonObject[] = [{
    id: releaseId,
    release_key: releaseKey,
    locale: 'zh-Hant-TW',
    policy_version: TAIWAN_SELECTION_POLICY_VERSION,
    status: 'blocked',
    description: 'Phase 3 evaluation release. Not distributable while CJKVI and local Make Me a Hanzi lineage remain uncleared.',
    metrics: canonicalize(metrics),
  }];
  const decomposition_release_sources: JsonObject[] = input.sources.map((source) => ({
    release_id: releaseId,
    source_id: source.id,
    source_version: source.version,
    purpose: source.id === 'cns11643-open-data' ? 'metadata'
      : source.id === 'cjkvi-ids' ? 'structure' : 'fallback',
  }));
  const decomposition_release_blockers: JsonObject[] = input.sources
    .filter((source) => source.redistributionStatus !== 'cleared')
    .map((source) => {
      const identity = { releaseId, sourceId: source.id, version: source.version };
      return {
        id: deterministicUuid('decomposition-release-blocker', identity),
        release_id: releaseId,
        blocker_type: 'licensing',
        source_id: source.id,
        source_version: source.version,
        code: `license-not-cleared:${source.id}:${source.version}`,
        message: `${source.name} is ${source.redistributionStatus}; production redistribution is blocked.`,
        status: 'open',
      };
    });

  return {
    decomposition_sources: input.sources.map((source) => ({
      id: source.id,
      version: source.version,
      name: source.name,
      source_url: source.sourceUrl,
      license: source.license,
      license_url: source.licenseUrl,
      attribution: source.attribution,
      checksum: source.checksum,
      retrieved_at: source.retrievedAt,
      locale_scope: source.localeScope,
      redistribution_status: source.redistributionStatus,
      notes: source.notes,
    })),
    decomposition_import_batches: [{
      id: batchId,
      importer_version: DECOMPOSITION_IMPORTER_VERSION,
      parser_version: DECOMPOSITION_PARSER_VERSION,
      policy_version: TAIWAN_SELECTION_POLICY_VERSION,
      input_manifest_checksum: inputManifestChecksum,
      status: 'validated',
      metrics: canonicalize(metrics),
      completed_at: new Date(0).toISOString(),
      notes: 'Deterministic Phase 3 import; completed_at is fixed for reproducible fixtures and set by the database writer in live runs.',
    }],
    decomposition_source_records,
    decomposition_source_preferences,
    decomposition_course_characters,
    decomposition_node_references,
    decomposition_component_metadata,
    decomposition_diagnostics,
    decomposition_releases,
    decomposition_release_sources,
    decomposition_release_blockers,
    decomposition_selection_decisions,
    decomposition_conflicts,
    decomposition_conflict_assertions,
    metrics,
    comparison,
  };
}

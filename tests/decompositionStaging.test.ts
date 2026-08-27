import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  adaptCjkviText,
  adaptCns11643Bulk,
  adaptMakeMeAHanziRecords,
} from '../src/features/character-decomposition';
import {
  buildDecompositionStagingPlan,
  canonicalJson,
  sha256,
  type StagingBuildInput,
} from '../src/features/character-decomposition/staging';
import { writeDecompositionStagingPlan } from '../scripts/lib/decompositionStagingSupabase';

function buildFixtureInput(): StagingBuildInput {
  const makeVersion = 'fixture-mmh-v1';
  const cjkviVersion = 'fixture-cjkvi-v1';
  const cnsVersion = 'fixture-cns-v1';
  const makeMeAHanzi = adaptMakeMeAHanziRecords([
    { character: '學', decomposition: '⿱⿰臼爻子', radical: '子', pinyin: ['xue2'] },
    { character: '𦥯', decomposition: '⿱⿰臼爻冖' },
    { character: '一', decomposition: '一' },
    { character: '疑', decomposition: '⿰匕？' },
  ], { sourceVersion: makeVersion });
  const cjkvi = adaptCjkviText([
    'U+5B78\t學\t⿱𦥯子[T]\t⿱𦥯子[G]',
    'U+2696F\t𦥯\t⿱⿴𦥑爻冖',
    'U+4E00\t一\t一',
    'U+E000\t測\t⿰水①[T]',
  ].join('\n'), { sourceVersion: cjkviVersion });
  const cns11643 = adaptCns11643Bulk({
    unicodeMappings: ['1-4421\t5B78'],
    component: '1-4421\t0001,0002',
    componentRef: '0001\t1-4421\t5B78\t學\n0002\t\t2696F\t𦥯',
    phonetic: '1-4421\tㄒㄩㄝˊ',
    pinyinTables: ['ㄒㄩㄝˊ\txue2'],
    radical: '1-4421\t39',
    source: '1-4421\t常用國字標準字體表',
    stroke: '1-4421\t16',
    strokeSequence: '1-4421\t1234',
  }, { sourceVersion: cnsVersion });
  return {
    sources: [
      {
        id: 'makemeahanzi-dictionary', name: 'MMH', version: makeVersion,
        sourceUrl: null, license: 'review', licenseUrl: null, attribution: null,
        checksum: sha256('mmh'), retrievedAt: null, localeScope: ['zh-Hans'],
        redistributionStatus: 'review', notes: null,
      },
      {
        id: 'cjkvi-ids', name: 'CJKVI', version: cjkviVersion,
        sourceUrl: null, license: 'unresolved', licenseUrl: null, attribution: null,
        checksum: sha256('cjkvi'), retrievedAt: null, localeScope: ['zh-Hant-TW'],
        redistributionStatus: 'blocked', notes: null,
      },
      {
        id: 'cns11643-open-data', name: 'CNS11643', version: cnsVersion,
        sourceUrl: null, license: 'OGDL 1.0', licenseUrl: null, attribution: 'CNS11643',
        checksum: sha256('cns'), retrievedAt: null, localeScope: ['zh-Hant-TW'],
        redistributionStatus: 'cleared', notes: null,
      },
    ],
    makeMeAHanzi,
    cjkvi,
    cns11643,
    traditionalCourse: new Set(['學', '𦥯', '一']),
    simplifiedCourse: new Set(['一']),
    phase2Metrics: null,
  };
}

test('staging plan is deterministic and preserves source conflicts', () => {
  const input = buildFixtureInput();
  const first = buildDecompositionStagingPlan(input);
  const second = buildDecompositionStagingPlan(input);
  assert.equal(canonicalJson(first), canonicalJson(second));

  const recordsFor學 = first.decomposition_source_records.filter((row) => row.character === '學');
  assert.equal(recordsFor學.length, 4, 'MMH, two CJKVI alternatives, and CNS remain separate');
  assert.equal(first.decomposition_conflicts.length, 2);
  assert.equal(first.decomposition_conflict_assertions.length, 4);
  assert.deepEqual(first.metrics.traditionalCourse, {
    total: 3, selected: 3, unresolved: 0, unresolvedCharacters: [],
  });
});

test('selection points to exact immutable records and atomic leaves do not self-expand', () => {
  const plan = buildDecompositionStagingPlan(buildFixtureInput());
  const learning = plan.decomposition_selection_decisions.find((row) => row.character === '學')!;
  const one = plan.decomposition_selection_decisions.find((row) => row.character === '一')!;
  const selectedLearning = plan.decomposition_source_records.find((row) => row.id === learning.selected_source_record_id)!;
  const selectedOne = plan.decomposition_source_records.find((row) => row.id === one.selected_source_record_id)!;

  assert.deepEqual(selectedLearning.region_qualifiers, ['T']);
  assert.equal(learning.selection_reason, 'cjkvi-explicit-t');
  assert.equal(one.selection_status, 'atomic-leaf');
  assert.equal(selectedOne.parse_status, 'atomic');
  assert.equal((selectedOne.normalized_tree as { kind: string }).kind, 'glyph');
});

test('unencoded, unknown, and structure nodes retain distinct persisted semantics', () => {
  const plan = buildDecompositionStagingPlan(buildFixtureInput());
  const kinds = new Set(plan.decomposition_node_references.map((row) => row.node_kind));
  assert(kinds.has('structure'));
  assert(kinds.has('unencoded-component'));
  assert(kinds.has('unknown-component'));
  assert.equal(plan.decomposition_node_references.some((row) => (
    row.node_kind === 'structure' && row.component_source_id !== null
  )), false);
  assert.equal(plan.decomposition_diagnostics.some((row) => row.category === 'unencoded-component'), true);
  assert.equal(plan.decomposition_diagnostics.some((row) => row.category === 'unknown-component'), true);
});

test('metadata is field-provenanced and CNS flat components never become trees', () => {
  const plan = buildDecompositionStagingPlan(buildFixtureInput());
  const cnsRecord = plan.decomposition_source_records.find((row) => row.source_id === 'cns11643-open-data')!;
  assert.equal(cnsRecord.parse_status, 'metadata-only');
  assert.equal(cnsRecord.normalized_tree, null);
  const fields = new Set(plan.decomposition_component_metadata
    .filter((row) => row.source_record_id === cnsRecord.id)
    .map((row) => row.field_name));
  assert(fields.has('zhuyin'));
  assert(fields.has('stroke-count'));
  assert(fields.has('flat-component'));
});

test('selected-record cycles become structured diagnostics', () => {
  const input = buildFixtureInput();
  input.makeMeAHanzi.push(...adaptMakeMeAHanziRecords([
    { character: '甲', decomposition: '乙' },
    { character: '乙', decomposition: '甲' },
  ], { sourceVersion: 'fixture-mmh-v1' }));
  input.traditionalCourse.add('甲');
  input.traditionalCourse.add('乙');
  const plan = buildDecompositionStagingPlan(input);
  const cycle = plan.decomposition_diagnostics.find((row) => row.category === 'cycle');
  assert(cycle);
  assert.equal(cycle.code, 'selected-record-reference-cycle');
});

test('release is blocked by uncleared sources and never emits a production pack', () => {
  const plan = buildDecompositionStagingPlan(buildFixtureInput());
  assert.equal(plan.decomposition_releases[0].status, 'blocked');
  assert.deepEqual(new Set(plan.decomposition_release_blockers.map((row) => row.source_id)), new Set([
    'cjkvi-ids', 'makemeahanzi-dictionary',
  ]));
  assert.equal('production_pack' in plan, false);
});

test('Supabase writer is repeatable and uses duplicate-safe immutable inserts', async () => {
  const calls: Array<{ table: string; ignoreDuplicates: boolean }> = [];
  const rpcCalls: string[] = [];
  const client = {
    from(table: string) {
      return {
        upsert(_rows: unknown[], options?: { ignoreDuplicates?: boolean }) {
          calls.push({ table, ignoreDuplicates: options?.ignoreDuplicates ?? false });
          return Promise.resolve({ error: null });
        },
      };
    },
    rpc(name: string) {
      rpcCalls.push(name);
      return Promise.resolve({ error: null });
    },
  } as unknown as SupabaseClient;
  const plan = buildDecompositionStagingPlan(buildFixtureInput());
  const first = await writeDecompositionStagingPlan(client, plan);
  const second = await writeDecompositionStagingPlan(client, plan);
  assert.deepEqual(first.attemptedRows, second.attemptedRows);
  assert(calls.filter((call) => call.table === 'decomposition_source_records').every((call) => call.ignoreDuplicates));
  assert(calls.filter((call) => call.table === 'decomposition_source_preferences').every((call) => call.ignoreDuplicates));
  assert(calls.filter((call) => call.table === 'decomposition_import_batches').every((call) => !call.ignoreDuplicates));
  assert.deepEqual(rpcCalls, [
    'analyze_decomposition_staging',
    'refresh_character_decomposition_projection',
    'analyze_decomposition_staging',
    'refresh_character_decomposition_projection',
  ]);
});

test('migration makes staging private, immutable, override-reviewed, and license-gated', async () => {
  const sql = await readFile(resolve(import.meta.dirname, '../supabase/migrations_archive/20260811_decomposition_staging.sql'), 'utf8');
  for (const required of [
    'FORCE ROW LEVEL SECURITY',
    'REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',
    'decomposition_source_records_immutable',
    'decomposition_source_preferences_immutable',
    'decomposition_source_license_reviews_immutable',
    'character_decompositions_projection_only',
    'replacement_source_record_id uuid NOT NULL REFERENCES public.decomposition_source_records(id)',
    "review_status = 'pending'",
    'decomposition_manual_override_audit',
    'extensions.digest',
    "NEW.status IN ('approved', 'published')",
    "review_status <> 'approved'",
    'unreviewed manual override(s)',
    'review.redistribution_status',
    "source.redistribution_status) <> 'cleared'",
    'get_decomposition_staging_metrics',
    'analyze_decomposition_staging',
  ]) assert.match(sql, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(sql, /(?:ALTER|UPDATE|INSERT INTO|DELETE FROM)\s+(?:public\.)?character_breakdowns_v2/iu);
});

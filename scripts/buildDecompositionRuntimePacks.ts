import 'dotenv/config';
import { createHash } from 'node:crypto';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedDecompositionNode } from '../src/types/decomposition';
import {
  createDecompositionStagingClient,
} from './lib/decompositionStagingSupabase';
import {
  encodeRuntimeTree,
  getRuntimeDirectComponentKeys,
  type RuntimeComponentKey,
  type RuntimeTreeNode,
} from '../src/features/character-decomposition/runtimePack';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const DEFAULT_OUTPUT = resolve(PROJECT_ROOT, 'output/decomposition-runtime/phase4-candidate');
const DEFAULT_REPORT = resolve(PROJECT_ROOT, 'output/decomposition-runtime/phase4-report.json');
const DEFAULT_FULL_COVERAGE_OUTPUT = resolve(PROJECT_ROOT, 'output/decomposition-runtime/phase4-full-coverage-candidate');
const DEFAULT_FULL_COVERAGE_REPORT = resolve(PROJECT_ROOT, 'output/decomposition-runtime/phase4-full-coverage-report.json');
const RECORD_SHARDS = 64;
const INDEX_SHARDS = 64;
const PAGE_SIZE = 1_000;
const GENERATOR_VERSION = 'phase4-runtime-packs-v1';
const PACK_SCHEMA_VERSION = 1;

type RuntimeSelectionMode = 'course-plus-recursive-glyph-closure' | 'all-selected-structural-records';

interface DbRelease {
  id: string;
  release_key: string;
  locale: string;
  policy_version: string;
  status: string;
  metrics: Record<string, unknown>;
}

interface DbSource {
  id: string;
  version: string;
  name: string;
  checksum: string;
  license: string | null;
  attribution: string | null;
  redistribution_status: 'cleared' | 'review' | 'blocked';
}

interface DbReleaseSource {
  source_id: string;
  source_version: string;
  purpose: string;
}

interface DbBlocker {
  code: string;
  message: string;
  source_id: string | null;
  status: string;
}

interface DbCharacterDecomposition {
  character: string;
  locale: string;
  release_id: string;
  selected_source_record_id: string;
  normalized_tree: NormalizedDecompositionNode;
  selection_reason: string;
  quality_score: number | null;
  quality_status: string;
}

interface DbCourseCharacter {
  course_variant: 'traditional' | 'simplified';
  character: string;
}

interface RuntimeRecord {
  r: string;
  s: number;
  t: RuntimeTreeNode;
}

interface PackFile {
  path: string;
  bytes: Buffer;
}

interface ShardDescriptor {
  shard: number;
  count: number;
  path: string;
  bytes: number;
  sha256: string;
  gzipBytes: number;
  brotliBytes: number;
}

interface PackInput {
  release: DbRelease;
  sources: DbSource[];
  releaseSources: DbReleaseSource[];
  blockers: DbBlocker[];
  decompositions: DbCharacterDecomposition[];
  stagingProjectionCount: number;
  courses: DbCourseCharacter[];
  selectionMode: RuntimeSelectionMode;
  runtimeSeedCount: number;
}

interface BuildResult {
  files: PackFile[];
  manifest: Record<string, unknown>;
  report: Record<string, unknown>;
}

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value)}\n`, 'utf8');
}

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function compareStrings(left: string, right: string): number {
  const leftPoints = [...left].map((char) => char.codePointAt(0) ?? 0);
  const rightPoints = [...right].map((char) => char.codePointAt(0) ?? 0);
  for (let index = 0; index < Math.min(leftPoints.length, rightPoints.length); index += 1) {
    if (leftPoints[index] !== rightPoints[index]) return leftPoints[index] - rightPoints[index];
  }
  return leftPoints.length - rightPoints.length;
}

function getShard(value: string, shardCount: number): number {
  return (value.codePointAt(0) ?? 0) % shardCount;
}

function sourceKey(id: string, version: string): string {
  return `${id}\u0000${version}`;
}

function encodeFile(path: string, value: unknown): PackFile {
  return { path, bytes: jsonBytes(value) };
}

function describeFile(file: PackFile): ShardDescriptor {
  return {
    shard: Number(file.path.match(/(\d+)\.json$/u)?.[1] ?? -1),
    count: 0,
    path: file.path,
    bytes: file.bytes.byteLength,
    sha256: sha256(file.bytes),
    gzipBytes: gzipSync(file.bytes, { level: 9 }).byteLength,
    brotliBytes: brotliCompressSync(file.bytes).byteLength,
  };
}

function buildShards<T>(
  values: Map<number, T>,
  prefix: string,
  shardCount: number,
  countFor: (value: T) => number,
  field: string,
): PackFile[] {
  return Array.from({ length: shardCount }, (_, shard) => {
    const value = values.get(shard) ?? ({} as T);
    const count = countFor(value);
    return encodeFile(`${prefix}/shard-${String(shard).padStart(2, '0')}.json`, {
      schemaVersion: PACK_SCHEMA_VERSION,
      shard,
      count,
      [field]: value,
    });
  });
}

function buildRuntimeTreeStats(decompositions: DbCharacterDecomposition[]) {
  const counts: Record<string, number> = {
    structure: 0,
    glyph: 0,
    'unencoded-component': 0,
    'unknown-component': 0,
    'source-entity': 0,
  };
  let maximumDepth = 0;
  let inlineGlyphChildren = 0;
  for (const row of decompositions) {
    const tree = row.normalized_tree;
    const visit = (node: NormalizedDecompositionNode, depth: number) => {
      counts[node.kind] += 1;
      maximumDepth = Math.max(maximumDepth, depth);
      if (node.kind === 'glyph' && node.children.length > 0) inlineGlyphChildren += 1;
      node.children.forEach((child) => visit(child, depth + 1));
    };
    visit(tree, 1);
  }
  return { counts, maximumDepth, inlineGlyphChildren };
}

function walkNormalizedTree(root: NormalizedDecompositionNode): NormalizedDecompositionNode[] {
  return [root, ...root.children.flatMap(walkNormalizedTree)];
}

/**
 * Runtime packs contain the course universe plus the selected records needed
 * to expand glyph operands recursively. The staging projection remains the
 * complete 88k-record administrative universe; it is not copied wholesale.
 */
function selectRuntimeClosure(
  rows: DbCharacterDecomposition[],
  courses: DbCourseCharacter[],
): DbCharacterDecomposition[] {
  const byCharacter = new Map(rows.map((row) => [row.character, row]));
  const queue = [...new Set(courses.map((course) => course.character))].sort(compareStrings);
  const included = new Set<string>();
  for (let index = 0; index < queue.length; index += 1) {
    const character = queue[index];
    if (included.has(character)) continue;
    included.add(character);
    const row = byCharacter.get(character);
    if (!row) continue;
    for (const node of walkNormalizedTree(row.normalized_tree)) {
      if (node.kind === 'glyph' && byCharacter.has(node.glyph) && !included.has(node.glyph)) {
        queue.push(node.glyph);
      }
    }
  }
  return [...included]
    .map((character) => byCharacter.get(character))
    .filter((row): row is DbCharacterDecomposition => Boolean(row))
    .sort((left, right) => compareStrings(left.character, right.character));
}

/**
 * Select every row in the already-selected Phase 3 release projection. This
 * deliberately does not read source records directly: source preference,
 * locale qualification, parse validity, and the CNS exclusion policy have
 * already been resolved by the staging release projection.
 */
function selectRuntimeRows(rows: DbCharacterDecomposition[]): DbCharacterDecomposition[] {
  return [...rows].sort((left, right) => (
    compareStrings(left.character, right.character) || compareStrings(left.locale, right.locale)
  ));
}

function buildPack(input: PackInput): BuildResult {
  const sortedSources = [...input.sources].sort((left, right) => (
    compareStrings(left.id, right.id) || compareStrings(left.version, right.version)
  ));
  const sourceIndex = new Map(sortedSources.map((source, index) => [sourceKey(source.id, source.version), index]));
  const sortedRows = [...input.decompositions].sort((left, right) => (
    compareStrings(left.character, right.character) || compareStrings(left.locale, right.locale)
  ));
  const recordsByShard = new Map<number, Record<string, RuntimeRecord>>();
  const directByShard = new Map<number, Record<string, RuntimeComponentKey[]>>();
  const reverse = new Map<RuntimeComponentKey, Set<string>>();
  const directByCharacter = new Map<string, RuntimeComponentKey[]>();
  const largestRecords: Array<{ character: string; bytes: number }> = [];

  for (const row of sortedRows) {
    if (!row.normalized_tree || row.locale !== input.release.locale) {
      throw new Error(`Selected runtime record ${row.character} is missing its normalized tree or locale.`);
    }
    const rootSource = row.normalized_tree.source;
    const sourceOrdinal = sourceIndex.get(sourceKey(rootSource.id, rootSource.version));
    if (sourceOrdinal === undefined) {
      throw new Error(`Selected record ${row.character} references an unknown source ${rootSource.id}@${rootSource.version}.`);
    }
    const tree = encodeRuntimeTree(row.normalized_tree);
    const record: RuntimeRecord = { r: rootSource.recordId, s: sourceOrdinal, t: tree };
    const shard = getShard(row.character, RECORD_SHARDS);
    const shardRecords = recordsByShard.get(shard) ?? {};
    shardRecords[row.character] = record;
    recordsByShard.set(shard, shardRecords);

    // Preserve source child order: layout order is part of the recursive tree.
    const direct = [...new Set(getRuntimeDirectComponentKeys(tree))];
    directByCharacter.set(row.character, direct);
    const directShard = getShard(row.character, INDEX_SHARDS);
    const shardDirect = directByShard.get(directShard) ?? {};
    shardDirect[row.character] = direct;
    directByShard.set(directShard, shardDirect);
    for (const component of direct) {
      const parents = reverse.get(component) ?? new Set<string>();
      parents.add(row.character);
      reverse.set(component, parents);
    }

    largestRecords.push({ character: row.character, bytes: jsonBytes(record).byteLength });
  }

  const reverseByShard = new Map<number, Record<string, string[]>>();
  for (const component of [...reverse.keys()].sort(compareStrings)) {
    const shard = getShard(component.replace(/^[^:]+:/u, ''), INDEX_SHARDS);
    const shardReverse = reverseByShard.get(shard) ?? {};
    shardReverse[component] = [...reverse.get(component)!].sort(compareStrings);
    reverseByShard.set(shard, shardReverse);
  }

  const recordFiles = buildShards(
    recordsByShard,
    'records',
    RECORD_SHARDS,
    (value) => Object.keys(value).length,
    'records',
  );
  const directFiles = buildShards(
    directByShard,
    'indexes/direct',
    INDEX_SHARDS,
    (value) => Object.keys(value).length,
    'direct',
  );
  const reverseFiles = buildShards(
    reverseByShard,
    'indexes/reverse',
    INDEX_SHARDS,
    (value) => Object.keys(value).length,
    'reverse',
  );
  const dataFiles = [...recordFiles, ...directFiles, ...reverseFiles];
  const packVersion = sha256(Buffer.from(dataFiles.map((file) => `${file.path}:${sha256(file.bytes)}`).join('\n'))).slice(0, 16);
  const releaseSources = input.releaseSources
    .map((releaseSource) => input.sources.find((source) => (
      source.id === releaseSource.source_id && source.version === releaseSource.source_version
    )))
    .filter((source): source is DbSource => Boolean(source))
    .sort((left, right) => compareStrings(left.id, right.id) || compareStrings(left.version, right.version));
  const openBlockers = input.blockers.filter((blocker) => blocker.status === 'open');
  const publishable = input.release.status === 'approved'
    && openBlockers.length === 0
    && releaseSources.every((source) => source.redistribution_status === 'cleared');
  const courseCoverage = {
    traditional: coverageForCourse(input.courses, 'traditional', sortedRows),
    simplified: coverageForCourse(input.courses, 'simplified', sortedRows),
  };
  const treeStats = buildRuntimeTreeStats(sortedRows);
  const sourceManifest = releaseSources.map((source) => ({
    id: source.id,
    version: source.version,
    checksum: source.checksum,
    redistributionStatus: source.redistribution_status,
    license: source.license,
    attribution: source.attribution,
  }));
  const manifest = {
    schemaVersion: PACK_SCHEMA_VERSION,
    generatorVersion: GENERATOR_VERSION,
    version: packVersion,
    releaseId: input.release.id,
    releaseKey: input.release.release_key,
    locale: input.release.locale,
    policyVersion: input.release.policy_version,
    distribution: 'development-only-candidate',
    publishable,
    licenseGate: {
      status: input.release.status,
      publishable,
      openBlockers: openBlockers.map((blocker) => blocker.code).sort(compareStrings),
      note: 'CJKVI licensing remains blocked; this candidate must not be deployed or redistributed.',
    },
    sourceProjectionCount: input.stagingProjectionCount,
    selection: {
      mode: input.selectionMode,
      seedCharacterCount: input.runtimeSeedCount,
    },
    recordCount: sortedRows.length,
    sources: sourceManifest,
    courseCoverage,
    nodeKinds: treeStats.counts,
    maximumTreeDepth: treeStats.maximumDepth,
    recordShards: describeShards(recordFiles, recordsByShard, (value) => Object.keys(value).length),
    indexes: {
      direct: {
        strategy: 'unicode-code-point-modulo',
        shardCount: INDEX_SHARDS,
        shards: describeShards(directFiles, directByShard, (value) => Object.keys(value).length),
      },
      reverse: {
        strategy: 'component-code-point-modulo',
        shardCount: INDEX_SHARDS,
        shards: describeShards(reverseFiles, reverseByShard, (value) => Object.keys(value).length),
      },
    },
  };
  const manifestFile = encodeFile('manifest.json', manifest);
  const files = [...dataFiles, manifestFile].sort((left, right) => compareStrings(left.path, right.path));
  const largestRecord = largestRecords.sort((left, right) => right.bytes - left.bytes || compareStrings(left.character, right.character))[0];
  const totalBytes = sumBytes(files);
  const totalGzipBytes = files.reduce((sum, file) => sum + gzipSync(file.bytes, { level: 9 }).byteLength, 0);
  const totalBrotliBytes = files.reduce((sum, file) => sum + brotliCompressSync(file.bytes).byteLength, 0);
  const recordBytes = sumBytes(recordFiles);
  const indexBytes = sumBytes([...directFiles, ...reverseFiles]);
  const currentBreakdown = readCurrentBreakdownSize();
  const report = {
    schemaVersion: PACK_SCHEMA_VERSION,
    generatorVersion: GENERATOR_VERSION,
    packVersion,
    release: {
      id: input.release.id,
      key: input.release.release_key,
      status: input.release.status,
      publishable,
    },
    stagingProjectionCount: input.stagingProjectionCount,
    runtimeSelectionMode: input.selectionMode,
    runtimeSelectionCount: sortedRows.length,
    runtimeClosureSeedCount: input.selectionMode === 'course-plus-recursive-glyph-closure'
      ? input.runtimeSeedCount
      : null,
    runtimeSchema: {
      treeNodeTuples: {
        structure: ['s', 'operator', 'children'],
        glyph: ['g', 'glyph'],
        unencodedComponent: ['u', 'componentSourceId', 'optionalStrokeCount'],
        unknownComponent: ['?', 'optionalComponentSourceId'],
        sourceEntity: ['e', 'entity'],
      },
      expansion: 'character-key lookup; descendants are never inlined',
      directIndex: 'learner-visible next card layer; structure nodes are traversed',
    },
    sizes: {
      totalBytes,
      compressedBytes: { gzip: totalGzipBytes, brotli: totalBrotliBytes },
      recordBytes,
      indexBytes,
      manifestBytes: manifestFile.bytes.byteLength,
    },
    shardSizes: {
      records: describeShards(recordFiles, recordsByShard, (value) => Object.keys(value).length),
      directIndex: describeShards(directFiles, directByShard, (value) => Object.keys(value).length),
      reverseIndex: describeShards(reverseFiles, reverseByShard, (value) => Object.keys(value).length),
    },
    largestRecord,
    reverseIndex: {
      componentCount: reverse.size,
      parentReferences: [...reverse.values()].reduce((sum, parents) => sum + parents.size, 0),
      bytes: sumBytes(reverseFiles),
      compressedBytes: {
        gzip: reverseFiles.reduce((sum, file) => sum + gzipSync(file.bytes, { level: 9 }).byteLength, 0),
        brotli: reverseFiles.reduce((sum, file) => sum + brotliCompressSync(file.bytes).byteLength, 0),
      },
    },
    deterministicBuild: null,
    validation: {
      recordCount: sortedRows.length,
      courseCoverage,
      fixtures: fixtureValidation(sortedRows, directByCharacter),
      directReverseConsistency: directReverseConsistency(directByCharacter, reverse),
      nodeKinds: treeStats.counts,
      maximumTreeDepth: treeStats.maximumDepth,
      inlinedDescendantRecords: 0,
      glyphNodesWithInlineChildren: treeStats.inlineGlyphChildren,
      selectedLocale: input.release.locale,
    },
    comparisonWithCurrentBreakdownPacks: currentBreakdown,
  };
  return { files, manifest, report };
}

function describeShards<T>(files: PackFile[], values: Map<number, T>, countFor: (value: T) => number): ShardDescriptor[] {
  return files.map((file) => {
    const descriptor = describeFile(file);
    const shard = descriptor.shard;
    descriptor.count = countFor(values.get(shard)!);
    return descriptor;
  });
}

function sumBytes(files: PackFile[]): number {
  return files.reduce((sum, file) => sum + file.bytes.byteLength, 0);
}

function coverageForCourse(
  courses: DbCourseCharacter[],
  variant: 'traditional' | 'simplified',
  rows: DbCharacterDecomposition[],
) {
  const available = new Set(rows.map((row) => row.character));
  const characters = [...new Set(courses.filter((row) => row.course_variant === variant).map((row) => row.character))]
    .sort(compareStrings);
  const missing = characters.filter((character) => !available.has(character));
  return { total: characters.length, found: characters.length - missing.length, missing };
}

function fixtureValidation(rows: DbCharacterDecomposition[], directByCharacter: Map<string, RuntimeComponentKey[]>) {
  const required = ['學', '𦥯', '嚐', '溼', '汙', '不', '万', '冠'];
  const available = new Set(rows.map((row) => row.character));
  const results = Object.fromEntries(required.map((character) => [character, {
    present: available.has(character),
    directChildren: directByCharacter.get(character) ?? [],
  }]));
  if (!results['學'].present || JSON.stringify(results['學'].directChildren) !== JSON.stringify(['g:𦥯', 'g:子'])) {
    throw new Error(`學 fixture must expose exactly 𦥯 and 子, received ${JSON.stringify(results['學'])}`);
  }
  for (const character of required) if (!results[character].present) throw new Error(`Missing fixture ${character}`);
  if (!results['𦥯'].present) throw new Error('𦥯 must have an independently expandable record.');
  return results;
}

function directReverseConsistency(
  direct: Map<string, RuntimeComponentKey[]>,
  reverse: Map<RuntimeComponentKey, Set<string>>,
): boolean {
  for (const [parent, components] of direct) {
    for (const component of components) if (!reverse.get(component)?.has(parent)) return false;
  }
  for (const [component, parents] of reverse) {
    for (const parent of parents) if (!direct.get(parent)?.includes(component)) return false;
  }
  return true;
}

function readCurrentBreakdownSize() {
  const directory = resolve(PROJECT_ROOT, 'public/data/breakdowns');
  const names = readdirSync(directory).filter((name) => name.endsWith('.json'));
  const files = names.map((name) => {
    const bytes = readFileSync(resolve(directory, name));
    return { name, bytes: bytes.byteLength, gzip: gzipSync(bytes, { level: 9 }).byteLength, brotli: brotliCompressSync(bytes).byteLength };
  });
  return {
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    compressedBytes: {
      gzip: files.reduce((sum, file) => sum + file.gzip, 0),
      brotli: files.reduce((sum, file) => sum + file.brotli, 0),
    },
  };
}

// Sync helpers keep size comparison independent of async pack input loading.
import { readFileSync, readdirSync } from 'node:fs';

async function readAll<T>(
  client: SupabaseClient,
  table: string,
  columns: string,
  orderColumn: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .order(orderColumn, { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function readInput(client: SupabaseClient): Promise<PackInput> {
  const { data: releases, error: releaseError } = await client
    .from('decomposition_releases')
    .select('id,release_key,locale,policy_version,status,metrics')
    .order('created_at', { ascending: false })
    .limit(1);
  if (releaseError) throw new Error(`decomposition_releases: ${releaseError.message}`);
  const release = (releases?.[0] ?? null) as DbRelease | null;
  if (!release) throw new Error('No Phase 3 decomposition release exists in the local staging database.');

  const [sources, releaseSources, blockers, decompositions, courses] = await Promise.all([
    readAll<DbSource>(client, 'decomposition_sources', 'id,version,name,checksum,license,attribution,redistribution_status', 'id'),
    readAll<DbReleaseSource>(client, 'decomposition_release_sources', 'source_id,source_version,purpose', 'source_id'),
    readAll<DbBlocker>(client, 'decomposition_release_blockers', 'code,message,source_id,status', 'code'),
    readAll<DbCharacterDecomposition>(client, 'character_decompositions', 'character,locale,release_id,selected_source_record_id,normalized_tree,selection_reason,quality_score,quality_status', 'character'),
    readAll<DbCourseCharacter>(client, 'decomposition_course_characters', 'course_variant,character', 'character'),
  ]);
  const selected = decompositions.filter((row) => row.release_id === release.id);
  if (selected.length !== decompositions.length) throw new Error('Staging database contains projection rows for a different release; refusing ambiguous pack build.');
  const fullCoverage = process.env.DECOMPOSITION_RUNTIME_PACK_FULL_COVERAGE === 'true';
  const selectionMode: RuntimeSelectionMode = fullCoverage
    ? 'all-selected-structural-records'
    : 'course-plus-recursive-glyph-closure';
  const runtimeSeedCount = fullCoverage
    ? selected.length
    : new Set(courses.map((course) => course.character)).size;
  return {
    release,
    sources,
    releaseSources,
    blockers,
    decompositions: fullCoverage ? selectRuntimeRows(selected) : selectRuntimeClosure(selected, courses),
    stagingProjectionCount: selected.length,
    courses,
    selectionMode,
    runtimeSeedCount,
  };
}

async function writeBuild(outputDirectory: string, result: BuildResult): Promise<void> {
  await rm(outputDirectory, { recursive: true, force: true });
  for (const file of result.files) {
    const target = resolve(outputDirectory, file.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.bytes);
  }
}

function compareBuildToDisk(outputDirectory: string, firstPaths: string[], second: BuildResult) {
  const secondPaths = second.files.map((file) => file.path).sort(compareStrings);
  const paths = [...new Set([...firstPaths, ...secondPaths])].sort(compareStrings);
  const mismatches = paths.filter((path) => {
    const secondFile = second.files.find((file) => file.path === path);
    if (!secondFile) return true;
    try {
      return !readFileSync(resolve(outputDirectory, path)).equals(secondFile.bytes);
    } catch {
      return true;
    }
  });
  return { pass: mismatches.length === 0, filesCompared: paths.length, mismatches };
}

async function main() {
  const url = process.env.DECOMPOSITION_STAGING_SUPABASE_URL;
  const serviceRoleKey = process.env.DECOMPOSITION_STAGING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error('Set DECOMPOSITION_STAGING_SUPABASE_URL and DECOMPOSITION_STAGING_SUPABASE_SERVICE_ROLE_KEY.');
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(?:\/|$)/u.test(url)) {
    throw new Error('Phase 4 pack generation is local-only; refusing a non-local Supabase URL.');
  }
  const fullCoverage = process.env.DECOMPOSITION_RUNTIME_PACK_FULL_COVERAGE === 'true';
  const outputDirectory = resolve(process.env.DECOMPOSITION_RUNTIME_PACK_OUTPUT ?? (
    fullCoverage ? DEFAULT_FULL_COVERAGE_OUTPUT : DEFAULT_OUTPUT
  ));
  const reportPath = resolve(process.env.DECOMPOSITION_RUNTIME_PACK_REPORT ?? (
    fullCoverage ? DEFAULT_FULL_COVERAGE_REPORT : DEFAULT_REPORT
  ));
  const client = createDecompositionStagingClient(url, serviceRoleKey);
  const input = await readInput(client);
  const first = buildPack(input);
  // Keep the deterministic second pass memory-bounded for the full-coverage
  // candidate. The first pass is persisted, then its buffers are released;
  // the second pass is compared byte-for-byte against those persisted files.
  const firstPaths = first.files.map((file) => file.path);
  await writeBuild(outputDirectory, first);
  first.files.splice(0, first.files.length);
  const second = buildPack(input);
  const deterministicBuild = compareBuildToDisk(outputDirectory, firstPaths, second);
  second.files.splice(0, second.files.length);
  if (!deterministicBuild.pass) throw new Error(`Runtime pack build is not deterministic: ${deterministicBuild.mismatches.join(', ')}`);
  first.report.deterministicBuild = deterministicBuild;
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(first.report, null, 2)}\n`);
  console.log(JSON.stringify({
    output: outputDirectory,
    report: reportPath,
    manifest: first.manifest,
    reportSummary: first.report,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

import type {
  RuntimeComponentKey,
  RuntimeTreeNode,
} from './runtimePack';
import { runtimeNodeChildren } from './runtimePack';
import {
  fetchStaticJsonWithMetadata,
  pruneStaticJsonCache,
  type StaticJsonFetchMetadata,
} from '../../services/staticContentService';

export const RUNTIME_PACK_SCHEMA_VERSION = 1;
export const DEFAULT_RUNTIME_PACK_BASE_PATH = '/__decomposition-runtime';
export const DEFAULT_RUNTIME_MAX_DEPTH = 1;

export interface RuntimePackShardDescriptor {
  shard: number;
  count: number;
  path: string;
  bytes: number;
  sha256: string;
  gzipBytes: number;
  brotliBytes: number;
}

export interface RuntimePackManifest {
  schemaVersion: number;
  generatorVersion: string;
  version: string;
  releaseId: string;
  releaseKey: string;
  locale: string;
  policyVersion: string;
  distribution: string;
  publishable: boolean;
  licenseGate: {
    status: string;
    publishable: boolean;
    openBlockers: string[];
    note: string;
  };
  sourceProjectionCount: number;
  selection: {
    mode: string;
    seedCharacterCount: number;
  };
  recordCount: number;
  sources: Array<{
    id: string;
    version: string;
    checksum: string;
    redistributionStatus: string;
    license: string | null;
    attribution: string | null;
  }>;
  courseCoverage: {
    traditional: { total: number; found: number; missing: string[] };
    simplified: { total: number; found: number; missing: string[] };
  };
  recordShards: RuntimePackShardDescriptor[];
  indexes: {
    direct: { strategy: string; shardCount: number; shards: RuntimePackShardDescriptor[] };
    reverse: { strategy: string; shardCount: number; shards: RuntimePackShardDescriptor[] };
  };
}

export interface RuntimePackRecord {
  r: string;
  s: number;
  t: RuntimeTreeNode;
}

export type RuntimeLookupStatus = 'found' | 'missing' | 'error' | 'leaf';
export type RuntimeChildExpansion = 'expandable' | 'leaf' | 'missing' | 'error' | 'unknown';

export interface RuntimeVisibleChild {
  kind: 'glyph' | 'unencoded-component' | 'unknown-component' | 'source-entity';
  key: RuntimeComponentKey;
  glyph?: string;
  componentSourceId?: string;
  entity?: string;
  label?: 'No glyph' | 'Unknown component' | 'Unresolved source component';
  layoutPath?: string[];
  strokeCount?: number;
  expansion: RuntimeChildExpansion;
}

export interface RuntimeRecordLookup {
  status: RuntimeLookupStatus;
  character: string;
  record?: RuntimePackRecord;
  error?: Error;
}

export interface RuntimeDirectChildrenResult {
  status: RuntimeLookupStatus;
  character: string;
  children: RuntimeVisibleChild[];
  error?: Error;
}

export interface RuntimeDirectIndexResult {
  status: 'found' | 'missing' | 'error';
  character: string;
  componentKeys: RuntimeComponentKey[];
  error?: Error;
}

export interface RuntimeParentsResult {
  status: 'found' | 'missing' | 'error';
  componentKey: RuntimeComponentKey;
  parents: string[];
  error?: Error;
}

export interface RuntimeExpandedNode {
  node: RuntimeTreeNode;
  children: RuntimeExpandedNode[];
  expansion?: RuntimeLookupStatus | 'cycle' | 'max-depth';
}

export interface RuntimeExpansionResult {
  status: 'found' | 'missing' | 'error' | 'leaf' | 'cycle' | 'max-depth';
  character: string;
  tree?: RuntimeExpandedNode;
  error?: Error;
  path?: string[];
}

export interface RuntimeLoaderMetrics {
  manifestLoads: number;
  shardLoads: number;
  networkFiles: number;
  persistentCacheFiles: number;
  inMemoryHits: number;
  bytesFetched: number;
  files: string[];
}

export interface RuntimePackTransport {
  fetchJson<T>(path: string, label: string, persistentKey: string): Promise<StaticJsonFetchMetadata<T>>;
  prune(namespace: string, activeVersion: string): Promise<void>;
}

export interface RuntimePackLoaderOptions {
  basePath?: string;
  expectedSchemaVersion?: number;
  allowDevelopmentCandidate?: boolean;
  environment?: 'production' | 'development' | 'test';
  maxDepth?: number;
  transport?: RuntimePackTransport;
}

export class RuntimePackSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimePackSafetyError';
  }
}

export function joinPath(basePath: string, relativePath: string): string {
  return `${basePath.replace(/\/+$/u, '')}/${relativePath.replace(/^\/+/, '')}`;
}

export function getShard(value: string, shardCount: number): number {
  return (value.codePointAt(0) ?? 0) % shardCount;
}

export function getComponentShard(value: RuntimeComponentKey, shardCount: number): number {
  return getShard(value.replace(/^[^:]+:/u, ''), shardCount);
}

export function isAtomicRecord(character: string, record: RuntimePackRecord): boolean {
  return record.t[0] === 'g'
    && record.t[1] === character
    && runtimeNodeChildren(record.t).length === 0;
}

export function validateManifest(manifest: RuntimePackManifest, expectedSchemaVersion: number): void {
  if (manifest.schemaVersion !== expectedSchemaVersion) {
    throw new RuntimePackSafetyError(
      `Unsupported decomposition runtime schema ${manifest.schemaVersion}; expected ${expectedSchemaVersion}.`,
    );
  }
  if (
    !manifest.version
    || !manifest.generatorVersion
    || !manifest.locale
    || !Array.isArray(manifest.recordShards)
    || manifest.recordShards.length === 0
    || !manifest.indexes?.direct?.shards?.length
    || !manifest.indexes?.reverse?.shards?.length
  ) {
    throw new RuntimePackSafetyError('Malformed decomposition runtime manifest.');
  }
}

export function assertShard<T extends { schemaVersion: number; shard: number; count: number }>(
  shard: T,
  descriptor: RuntimePackShardDescriptor,
  expectedSchemaVersion: number,
): void {
  if (
    shard.schemaVersion !== expectedSchemaVersion
    || shard.shard !== descriptor.shard
    || shard.count !== descriptor.count
  ) {
    throw new Error(`Decomposition runtime shard ${descriptor.shard} failed schema validation.`);
  }
}

export function extractVisibleNodes(
  root: RuntimeTreeNode,
  layoutPath: string[] = [],
  isRoot = true,
  branchIndex?: number,
): Array<{ node: RuntimeTreeNode; layoutPath: string[] }> {
  if (root[0] === 's') {
    const token = layoutPath.length === 0
      ? root[1]
      : `${root[1]}@${branchIndex ?? 0}`;
    const nextPath = [...layoutPath, token];
    return root[2].flatMap((child, index) => extractVisibleNodes(child, nextPath, false, index));
  }
  if (!isRoot) return [{ node: root, layoutPath }];
  return runtimeNodeChildren(root).flatMap((child) => extractVisibleNodes(child, layoutPath, false));
}

export function toVisibleChildSync(
  node: RuntimeTreeNode,
  lookupStatus?: RuntimeLookupStatus,
  layoutPath: string[] = [],
): RuntimeVisibleChild {
  if (node[0] === 'g') {
    const glyph = node[1];
    return {
      kind: 'glyph',
      key: `g:${glyph}`,
      glyph,
      layoutPath,
      expansion: lookupStatus === 'found'
        ? 'expandable'
        : lookupStatus === 'leaf'
          ? 'leaf'
          : lookupStatus === 'error'
            ? 'error'
            : 'missing',
    };
  }
  if (node[0] === 'u') {
    return {
      kind: 'unencoded-component',
      key: `u:${node[1]}`,
      componentSourceId: node[1],
      layoutPath,
      strokeCount: node.length === 3 ? node[2] : undefined,
      label: 'No glyph',
      expansion: 'unknown',
    };
  }
  if (node[0] === '?') {
    return {
      kind: 'unknown-component',
      key: node[1] ? `?:${node[1]}` : '?',
      componentSourceId: node[1],
      layoutPath,
      label: 'Unknown component',
      expansion: 'unknown',
    };
  }
  return {
    kind: 'source-entity',
    key: `e:${node[1]}`,
    entity: node[1],
    layoutPath,
    label: 'Unresolved source component',
    expansion: 'unknown',
  };
}

export function defaultTransport(): RuntimePackTransport {
  return {
    fetchJson: <T>(path: string, label: string, persistentKey: string) => (
      fetchStaticJsonWithMetadata<T>(path, label, { persistentKey })
    ),
    prune: pruneStaticJsonCache,
  };
}

import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { buildLicensingFiles } from './packLicensing';

/**
 * Promotes a verified candidate runtime pack to a publishable production pack.
 *
 * The staging database that generated the candidate no longer exists locally
 * (a later `supabase db reset` cleared it), so the candidate files are the
 * surviving artifact. This script therefore never rebuilds data: it verifies
 * every shard against the candidate manifest checksums, requires a recorded
 * license clearance for every source in `content/character-decomposition/
 * license-reviews.json`, and re-emits only the manifest plus the licensing
 * files (NOTICE + full license texts). The decomposition data itself is copied
 * byte for byte.
 *
 * Usage:
 *   npm run decomposition:pack:promote   # writes output/decomposition-runtime/production
 *   npm run decomposition:pack:publish   # also copies it to public/data/decomposition-runtime
 */

const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');
const DEFAULT_INPUT = resolve(PROJECT_ROOT, 'output/decomposition-runtime/phase4-full-coverage-candidate');
const DEFAULT_OUTPUT = resolve(PROJECT_ROOT, 'output/decomposition-runtime/production');
const PUBLIC_OUTPUT = resolve(PROJECT_ROOT, 'public/data/decomposition-runtime');
const LEDGER_PATH = resolve(PROJECT_ROOT, 'content/character-decomposition/license-reviews.json');

interface ManifestSource {
  id: string;
  version: string;
  checksum: string;
  redistributionStatus: string;
  license: string | null;
  attribution: string | null;
}

interface ShardDescriptor {
  path: string;
  bytes: number;
  sha256: string;
}

interface RuntimeManifest {
  version: string;
  releaseKey: string;
  distribution: string;
  publishable: boolean;
  license?: string;
  licenseGate: {
    status: string;
    publishable: boolean;
    openBlockers: string[];
    note: string;
  };
  sources: ManifestSource[];
  recordShards: ShardDescriptor[];
  indexes: {
    direct: { shards: ShardDescriptor[] };
    reverse: { shards: ShardDescriptor[] };
  };
  sizes?: { totalBytes?: number };
  [key: string]: unknown;
}

interface LicenseReview {
  sourceId: string;
  sourceVersion: string;
  redistributionStatus: 'cleared' | 'review' | 'blocked';
  license: string;
  licenseUrl: string;
  conclusion: string;
  evidence: Record<string, unknown>;
  reviewedBy: string;
  reviewedAt: string;
}

interface LicenseLedger {
  schemaVersion: number;
  releaseKey: string;
  packLicense: string;
  reviews: LicenseReview[];
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function fail(message: string): never {
  throw new Error(message);
}

function verifyCandidate(inputDir: string, manifest: RuntimeManifest): void {
  if (manifest.publishable) {
    fail(`Candidate ${inputDir} is already publishable; promote only unapproved candidates.`);
  }
  const shards = [
    ...manifest.recordShards,
    ...manifest.indexes.direct.shards,
    ...manifest.indexes.reverse.shards,
  ];
  if (shards.length === 0) fail('Candidate manifest lists no shards.');
  for (const shard of shards) {
    const path = resolve(inputDir, shard.path);
    if (!existsSync(path)) fail(`Candidate is missing shard ${shard.path}.`);
    const bytes = readFileSync(path);
    if (bytes.byteLength !== shard.bytes || sha256(bytes) !== shard.sha256) {
      fail(`Candidate shard ${shard.path} does not match its manifest checksum.`);
    }
  }
}

function reviewFor(ledger: LicenseLedger, source: ManifestSource): LicenseReview | undefined {
  return ledger.reviews.find((review) => (
    review.sourceId === source.id && review.sourceVersion === source.version
  ));
}

function resolvedSources(manifest: RuntimeManifest, ledger: LicenseLedger): ManifestSource[] {
  return manifest.sources.map((source) => {
    if (source.redistributionStatus === 'cleared') return source;
    const review = reviewFor(ledger, source);
    if (!review || review.redistributionStatus !== 'cleared') {
      fail([
        `Source ${source.id}@${source.version} is not cleared for redistribution.`,
        `Record a cleared review in ${LEDGER_PATH} before promoting this pack.`,
      ].join(' '));
    }
    return {
      ...source,
      redistributionStatus: 'cleared',
      license: review.license,
    };
  });
}

function main(): void {
  const publish = process.argv.includes('--publish');
  const inputDir = resolve(process.env.DECOMPOSITION_RUNTIME_PACK_INPUT ?? DEFAULT_INPUT);
  const outputDir = resolve(process.env.DECOMPOSITION_RUNTIME_PACK_PROMOTED_OUTPUT ?? DEFAULT_OUTPUT);

  const ledger = readJson<LicenseLedger>(LEDGER_PATH);
  if (ledger.schemaVersion !== 1 || !Array.isArray(ledger.reviews)) {
    fail(`Unsupported license review ledger at ${LEDGER_PATH}.`);
  }
  const candidate = readJson<RuntimeManifest>(resolve(inputDir, 'manifest.json'));
  if (candidate.releaseKey !== ledger.releaseKey) {
    fail(`Ledger release ${ledger.releaseKey} does not match candidate release ${candidate.releaseKey}.`);
  }
  verifyCandidate(inputDir, candidate);
  const sources = resolvedSources(candidate, ledger);

  const manifest: RuntimeManifest = {
    ...candidate,
    distribution: 'production',
    publishable: true,
    license: ledger.packLicense,
    licenseGate: {
      status: 'approved',
      publishable: true,
      openBlockers: [],
      note: 'Sources cleared for redistribution; NOTICE.txt and full license texts ship with this pack.',
    },
    sources,
  };

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });
  for (const shard of [
    ...manifest.recordShards,
    ...manifest.indexes.direct.shards,
    ...manifest.indexes.reverse.shards,
  ]) {
    const target = resolve(outputDir, shard.path);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(resolve(inputDir, shard.path), target);
  }
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest)}\n`, 'utf8');
  writeFileSync(resolve(outputDir, 'manifest.json'), manifestBytes);
  for (const file of buildLicensingFiles(sources)) {
    const target = resolve(outputDir, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.bytes);
  }

  const published = readJson<RuntimeManifest>(resolve(outputDir, 'manifest.json'));
  if (published.publishable !== true || published.distribution === 'development-only-candidate') {
    fail('Promoted manifest failed its own publishable check.');
  }
  if (!existsSync(join(outputDir, 'NOTICE.txt'))) fail('Promoted pack is missing NOTICE.txt.');

  if (publish) {
    rmSync(PUBLIC_OUTPUT, { recursive: true, force: true });
    cpSync(outputDir, PUBLIC_OUTPUT, { recursive: true });
    if (!existsSync(join(PUBLIC_OUTPUT, 'manifest.json'))) fail('Publishing failed: manifest.json missing.');
  }

  console.log(JSON.stringify({
    promoted: outputDir,
    publishedTo: publish ? PUBLIC_OUTPUT : null,
    releaseKey: manifest.releaseKey,
    packVersion: manifest.version,
    license: manifest.license,
    sources: sources.map((source) => `${source.id}@${source.version} (${source.redistributionStatus})`),
    manifestBytes: manifestBytes.byteLength,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

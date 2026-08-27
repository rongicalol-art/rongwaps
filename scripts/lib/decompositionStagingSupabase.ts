import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { JsonObject, StagingPlan } from '../../src/features/character-decomposition/staging/model';

const APPEND_ONLY_BEFORE_RELEASE = [
  'decomposition_source_records',
  'decomposition_source_preferences',
  'decomposition_course_characters',
  'decomposition_node_references',
  'decomposition_component_metadata',
  'decomposition_diagnostics',
] as const;

const APPEND_ONLY_AFTER_RELEASE = [
  'decomposition_release_sources',
  'decomposition_release_blockers',
  'decomposition_selection_decisions',
  'decomposition_conflicts',
  'decomposition_conflict_assertions',
] as const;

export interface StagingWriteResult {
  batchId: string;
  releaseId: string;
  attemptedRows: Record<string, number>;
}

export interface SupabaseBackedMetrics {
  sourceRecords: number;
  parsedRecords: number;
  failedRecords: number;
  metadataOnlyRecords: number;
  unencodedComponentOccurrences: number;
  selectedCjkviUnencodedComponentOccurrences: number;
  makeMeAHanziUnknownComponentOccurrences: number;
  regionalVariantCharacters: number;
  taiwanSpecificVariantCharacters: number;
  selectedCjkviMissingReferencedGlyphs: number;
  directChildConflicts: number;
  traditionalCourse: { total: number; unresolved: number };
  simplifiedCourse: { total: number; unresolved: number };
  specialTraditionalCharacters: Record<string, 'selected' | 'unresolved'>;
  releaseStatus: string;
  openLicensingBlockers: number;
}

function chunk<T>(rows: T[], size = 1000): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < rows.length; index += size) result.push(rows.slice(index, index + size));
  return result;
}

async function insertIgnoringDuplicates(client: SupabaseClient, table: string, rows: JsonObject[]) {
  const batches = chunk(rows);
  for (let index = 0; index < batches.length; index += 4) {
    await Promise.all(batches.slice(index, index + 4).map(async (batch) => {
      const { error } = await client.from(table).upsert(batch, { ignoreDuplicates: true });
      if (error) throw new Error(`${table}: ${error.message}`);
    }));
  }
}

async function upsertMutable(client: SupabaseClient, table: string, rows: JsonObject[]) {
  for (const batch of chunk(rows)) {
    if (batch.length === 0) continue;
    const { error } = await client.from(table).upsert(batch);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

/** Writes a deterministic plan; immutable rows are insert-or-ignore. */
export async function writeDecompositionStagingPlan(client: SupabaseClient, plan: StagingPlan): Promise<StagingWriteResult> {
  const batchId = String(plan.decomposition_import_batches[0].id);
  const releaseId = String(plan.decomposition_releases[0].id);
  const attemptedRows: Record<string, number> = {};

  await insertIgnoringDuplicates(client, 'decomposition_sources', plan.decomposition_sources);
  attemptedRows.decomposition_sources = plan.decomposition_sources.length;
  await upsertMutable(client, 'decomposition_import_batches', plan.decomposition_import_batches.map((row) => ({
    ...row,
    completed_at: new Date().toISOString(),
  })));
  attemptedRows.decomposition_import_batches = 1;

  for (const table of APPEND_ONLY_BEFORE_RELEASE) {
    const rows = plan[table];
    await insertIgnoringDuplicates(client, table, rows);
    attemptedRows[table] = rows.length;
  }

  await upsertMutable(client, 'decomposition_releases', plan.decomposition_releases);
  attemptedRows.decomposition_releases = plan.decomposition_releases.length;

  for (const table of APPEND_ONLY_AFTER_RELEASE) {
    const rows = plan[table];
    await insertIgnoringDuplicates(client, table, rows);
    attemptedRows[table] = rows.length;
  }

  const { error: analyzeError } = await client.rpc('analyze_decomposition_staging');
  if (analyzeError) throw new Error(`analyze staging: ${analyzeError.message}`);
  const { error } = await client.rpc('refresh_character_decomposition_projection', { p_release_id: releaseId });
  if (error) throw new Error(`refresh projection: ${error.message}`);
  return { batchId, releaseId, attemptedRows };
}

/** Recomputes acceptance metrics from persisted rows, not the metrics JSON. */
export async function readSupabaseBackedMetrics(
  client: SupabaseClient,
  batchId: string,
  releaseId: string,
): Promise<SupabaseBackedMetrics> {
  const { data, error } = await client.rpc('get_decomposition_staging_metrics', {
    p_import_batch_id: batchId,
    p_release_id: releaseId,
  });
  if (error) throw new Error(`staging metrics: ${error.message}`);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Staging metrics RPC returned an invalid payload.');
  return data as unknown as SupabaseBackedMetrics;
}

export function createDecompositionStagingClient(url: string, serviceRoleKey: string): SupabaseClient {
  if (!url || !serviceRoleKey) throw new Error('Supabase URL and service-role key are required.');
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

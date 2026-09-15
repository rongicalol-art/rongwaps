import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { generateJson, resolveProvider, type ProviderConfig } from '../memory-hooks/provider';
import { extractJsonObject } from '../memory-hooks/jsonExtract';

const ROOT = resolve(import.meta.dirname, '../..');
const VOCAB_DIR = resolve(ROOT, 'public/data/vocabulary');
const OUTPUT_DIR = resolve(ROOT, 'output/vocab-qa');
const ARTIFACT_PATH = resolve(OUTPUT_DIR, 'vocabulary-proofread-v1.json');
const PROMPT_VERSION = 'vocab-proofread-v1';
const BOOKS = [1, 2, 3, 4];
const BATCH_SIZE = 40;

interface VocabularyRow {
  id: string;
  traditional: string | null;
  simplified: string | null;
  meaning: string | null;
  pinyin: string | null;
  pos: string | null;
}

interface ProofreadIssue {
  field: 'meaning' | 'pinyin';
  severity: 'error' | 'flag';
  problem: string;
  suggestion: string | null;
}

interface ProofreadRecord {
  id: string;
  issues: ProofreadIssue[];
}

interface ProofreadArtifact {
  schemaVersion: number;
  model: string;
  promptVersion: string;
  records: ProofreadRecord[];
}

function loadRows(): VocabularyRow[] {
  return BOOKS.flatMap(
    (bookId) => (JSON.parse(readFileSync(resolve(VOCAB_DIR, `book-${bookId}.json`), 'utf8')) as { items: VocabularyRow[] }).items,
  );
}

function buildPrompt(rows: VocabularyRow[]): string {
  return JSON.stringify({
    task: 'Proofread these Traditional Chinese vocabulary rows for a Taiwan textbook.',
    checks: [
      'English gloss: spelling and grammar mistakes only.',
      'Pinyin: wrong tone marks or wrong capitalization (proper nouns) only. Particles written with neutral tone (e.g. ma, ne, le, de) are correct. Slash variants and parentheses for optional syllables are fine.',
      'Measure words in the "(M: ...)" part of the gloss: only report if the measure word is clearly wrong; never guess a replacement without a suggestion.',
      'Do NOT report: missing fields, empty audio/examples, punctuation style, wording preferences, simplifications, or M: formatting.',
    ],
    output: '{ "results": [ { "id": "B1L01-1-01", "issues": [ { "field": "meaning" | "pinyin", "severity": "error" | "flag", "problem": "short explanation", "suggestion": "exact full replacement text for that field, or null" } ] } ] }',
    rules: [
      'Return exactly one entry per input row, in the same order, even when clean ("issues": []).',
      'A "meaning" suggestion replaces the whole gloss and must keep the "(M: ...)" part unchanged if present.',
      'A "pinyin" suggestion replaces the whole pinyin string.',
      'Only include an issue when you are confident it is a real error. Never invent problems.',
    ],
    rows: rows.map((row) => ({
      id: row.id,
      traditional: row.traditional,
      meaning: row.meaning,
      pinyin: row.pinyin,
      pos: row.pos,
    })),
  });
}

async function proofreadBatch(provider: ProviderConfig, rows: VocabularyRow[]): Promise<ProofreadRecord[]> {
  const content = await generateJson(
    provider,
    'You proofread Chinese textbook vocabulary data. Report only genuine errors. Return valid JSON only.',
    buildPrompt(rows),
    4000,
  );
  const parsed = JSON.parse(extractJsonObject(content)) as { results?: unknown };
  const results = Array.isArray(parsed.results) ? parsed.results : [];
  const byId = new Map<string, ProofreadRecord>();
  for (const raw of results) {
    if (typeof raw !== 'object' || raw === null) continue;
    const record = raw as { id?: unknown; issues?: unknown };
    if (typeof record.id !== 'string') continue;
    const issues: ProofreadIssue[] = [];
    if (Array.isArray(record.issues)) {
      for (const rawIssue of record.issues) {
        if (typeof rawIssue !== 'object' || rawIssue === null) continue;
        const issue = rawIssue as { field?: unknown; severity?: unknown; problem?: unknown; suggestion?: unknown };
        if (issue.field !== 'meaning' && issue.field !== 'pinyin') continue;
        issues.push({
          field: issue.field,
          severity: issue.severity === 'error' ? 'error' : 'flag',
          problem: typeof issue.problem === 'string' ? issue.problem : '',
          suggestion: typeof issue.suggestion === 'string' && issue.suggestion.trim() ? issue.suggestion.trim() : null,
        });
      }
    }
    byId.set(record.id, { id: record.id, issues });
  }
  return rows.map((row) => byId.get(row.id) ?? { id: row.id, issues: [] });
}

async function main(): Promise<void> {
  const flags = new Set(process.argv.slice(2));
  const limitIndex = process.argv.indexOf('--limit');
  const limit = limitIndex > -1 ? Number(process.argv[limitIndex + 1]) : Infinity;

  const rows = loadRows();
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const prior: ProofreadArtifact = !flags.has('--force') && existsSync(ARTIFACT_PATH)
    ? (JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8')) as ProofreadArtifact)
    : { schemaVersion: 1, model: '', promptVersion: PROMPT_VERSION, records: [] };
  const done = new Set(prior.records.map((record) => record.id));
  const pending = rows.filter((row) => !done.has(row.id));
  const scope = pending.slice(0, limit);

  if (!flags.has('--execute')) {
    console.log(JSON.stringify({
      dryRun: true,
      rows: rows.length,
      alreadyDone: done.size,
      pending: pending.length,
      batches: Math.ceil(scope.length / BATCH_SIZE),
      samplePrompt: JSON.parse(buildPrompt(scope.slice(0, 2))),
    }, null, 2));
    return;
  }

  const provider = resolveProvider();
  const concurrency = Math.max(1, Number(process.env.MEMORY_HOOK_CONCURRENCY || 3));
  const throttle = Number(process.env.MEMORY_HOOK_THROTTLE_MS || 400);
  const batches: VocabularyRow[][] = [];
  for (let index = 0; index < scope.length; index += BATCH_SIZE) batches.push(scope.slice(index, index + BATCH_SIZE));

  const save = (): void => {
    const artifact: ProofreadArtifact = {
      schemaVersion: 1,
      model: provider.model,
      promptVersion: PROMPT_VERSION,
      records: [...prior.records, ...results.filter((batch): batch is ProofreadRecord[] => batch !== null).flat()],
    };
    writeFileSync(ARTIFACT_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  };

  const results: Array<ProofreadRecord[] | null> = new Array(batches.length).fill(null);
  const queue = batches.map((_, index) => index);
  let completed = 0;

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const index = queue.shift()!;
      const batch = batches[index];
      let attempt = 0;
      let records: ProofreadRecord[] | null = null;
      while (attempt < 3 && !records) {
        attempt += 1;
        try {
          records = await proofreadBatch(provider, batch);
        } catch (error: unknown) {
          const status = (error as { status?: number }).status;
          const fatal = (error as { fatal?: boolean }).fatal;
          if (status === 401 || status === 402 || status === 403 || fatal) throw error;
          console.warn(`batch ${index} attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`);
          if (attempt < 3) await delay(attempt === 1 ? 4000 : 10000);
        }
      }
      if (!records) {
        console.warn(`batch ${index} left pending after 3 attempts`);
      } else {
        results[index] = records;
        completed += 1;
      }
      if (completed % 5 === 0 || completed === batches.length) {
        save();
        console.log(`[${completed}/${batches.length}] batches saved`);
      }
      await delay(throttle);
    }
  });

  await Promise.all(workers);
  save();
  const issueCount = results.flatMap((batch) => batch ?? []).reduce((sum, record) => sum + record.issues.length, 0);
  console.log(JSON.stringify({ batches: batches.length, issueCount, artifactPath: ARTIFACT_PATH }, null, 2));
}

main().catch((error: unknown) => {
  console.error(`FATAL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

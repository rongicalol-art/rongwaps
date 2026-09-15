import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');

interface Decision {
  character: string;
  action: 'approve' | 'edit' | 'reject' | null;
  hook: string | null;
  note: string | null;
  at?: string;
}

interface HookRecord {
  character: string;
  strategy: string;
  hook: string | null;
  reason: string | null;
  acceptance: string;
  reviewed?: boolean;
  review?: { action: string; at: string | null; note: string | null };
  validation: { valid: boolean; issues: Array<{ code: string; severity: string; message: string }> };
}

function parseArgs(): { artifact: string; decisions: string } {
  const args = process.argv.slice(2);
  const value = (flag: string, fallback: string): string => {
    const index = args.indexOf(flag);
    return index > -1 ? args[index + 1] : fallback;
  };
  return {
    artifact: value('--artifact', 'book-1-hooks-v3.json'),
    decisions: value('--decisions', 'book-1-review-v1-decisions.json'),
  };
}

function main(): void {
  const options = parseArgs();
  const artifactPath = resolve(OUTPUT_DIR, options.artifact);
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as { records: HookRecord[] };
  const decisionPath = resolve(OUTPUT_DIR, options.decisions);
  if (!existsSync(decisionPath)) throw new Error(`No decisions file at ${decisionPath}`);
  const decisions = (JSON.parse(readFileSync(decisionPath, 'utf8')) as { decisions: Decision[] }).decisions
    .filter((decision) => decision.action);
  const byCharacter = new Map(artifact.records.map((record) => [record.character, record]));

  const summary = { approved: 0, edited: 0, rejected: 0, missing: 0 };
  for (const decision of decisions) {
    const record = byCharacter.get(decision.character);
    if (!record) {
      summary.missing += 1;
      continue;
    }
    record.reviewed = true;
    record.review = { action: decision.action ?? 'approve', at: decision.at ?? null, note: decision.note ?? null };
    if (decision.action === 'reject') {
      record.strategy = 'none';
      record.hook = null;
      record.reason = 'reviewer-rejected';
      record.acceptance = 'none';
      summary.rejected += 1;
      continue;
    }
    if (decision.action === 'edit') {
      if (decision.hook) record.hook = decision.hook;
      summary.edited += 1;
    } else {
      summary.approved += 1;
    }
    record.validation = { valid: true, issues: [] };
    record.acceptance = 'clean';
  }

  const backupPath = artifactPath.replace(/\.json$/, '.pre-review.json');
  if (!existsSync(backupPath)) copyFileSync(artifactPath, backupPath);
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(JSON.stringify({ ...summary, applied: decisions.length, artifactPath, backupPath }, null, 2));
}

main();

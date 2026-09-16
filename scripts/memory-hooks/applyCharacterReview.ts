import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');

interface ComponentUsed {
  glyph: string;
  label: string;
}

interface Decision {
  character: string;
  action: 'edit' | null;
  hook: string | null;
  targetDisplayLabel?: string | null;
  meaning?: string;
  strategy?: string;
  componentsUsed?: ComponentUsed[];
  note: string | null;
}

interface HookRecord {
  character: string;
  meaning: string | null;
  strategy: string;
  hook: string | null;
  targetDisplayLabel?: string | null;
  componentsUsed: ComponentUsed[];
  acceptance: string;
  validation: { valid: boolean; issues: unknown[] };
}

function main(): void {
  const args = process.argv.slice(2);
  const value = (flag: string, fallback: string): string => {
    const index = args.indexOf(flag);
    return index > -1 ? args[index + 1] : fallback;
  };
  const artifactPath = resolve(OUTPUT_DIR, value('--artifact', 'book-1-hooks-v3.json'));
  const decisionsPath = resolve(OUTPUT_DIR, value('--decisions', 'book-1-character-review-decisions-v1.json'));
  if (!existsSync(decisionsPath)) throw new Error(`No decisions file at ${decisionsPath}`);

  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as { records: HookRecord[] };
  const decisions = (JSON.parse(readFileSync(decisionsPath, 'utf8')) as { decisions: Decision[] }).decisions
    .filter((decision) => decision.action);
  const byCharacter = new Map(artifact.records.map((record) => [record.character, record]));

  const summary = { edited: 0, missing: 0 };
  for (const decision of decisions) {
    const record = byCharacter.get(decision.character);
    if (!record) {
      summary.missing += 1;
      continue;
    }
    if (decision.action === 'edit' && decision.hook) {
      record.hook = decision.hook;
      if (decision.targetDisplayLabel !== undefined) record.targetDisplayLabel = decision.targetDisplayLabel;
      if (decision.meaning) record.meaning = decision.meaning;
      if (decision.strategy) record.strategy = decision.strategy;
      if (decision.componentsUsed) record.componentsUsed = decision.componentsUsed;
      record.acceptance = 'clean';
      record.validation = { valid: true, issues: [] };
      summary.edited += 1;
    }
  }

  const backupPath = artifactPath.replace(/\.json$/, '.pre-character-review.json');
  if (!existsSync(backupPath)) copyFileSync(artifactPath, backupPath);
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(JSON.stringify({ ...summary, applied: decisions.length, artifactPath }, null, 2));
}

main();

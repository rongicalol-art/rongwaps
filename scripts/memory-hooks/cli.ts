/**
 * Memory-hooks dispatcher: `npm run hooks -- <subcommand> [args…]`.
 * Maps a subcommand to an existing script in this folder and forwards the rest
 * of argv (and the environment) to it via `npx tsx`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const HERE = import.meta.dirname;
const ROOT = resolve(HERE, '../..');

interface Sub {
  name: string;
  file: string;
  /** Args always prepended (before the user's). */
  args?: string[];
  scope: 'book' | 'book1';
  desc: string;
}

export const STAGES: Array<{ stage: string; subs: Sub[] }> = [
  {
    stage: 'prepare',
    subs: [
      { name: 'prepare', file: 'prepareBookHooks.ts', scope: 'book', desc: 'Inventory, plans, component profiles, scope for --book N' },
      { name: 'prepare-batch', file: 'prepareBookOneEvaluationBatch.ts', scope: 'book1', desc: 'Prepare a Book 1 V2 rollout batch (--batch, --characters)' },
      { name: 'curate-labels', file: 'proposeCuratedComponentLabels.ts', scope: 'book1', desc: 'Propose curated component labels (LLM)' },
      { name: 'curate-freeze', file: 'freezeCuratedComponentLabels.ts', scope: 'book1', desc: 'Freeze reviewed component labels' },
      { name: 'ledger', file: 'buildComponentLedger.ts', scope: 'book1', desc: 'Build the component ledger' },
    ],
  },
  {
    stage: 'generate',
    subs: [
      { name: 'generate', file: 'generateBookOneHooks.ts', scope: 'book', desc: 'Character hooks, critic + resumable (--book N --execute)' },
      { name: 'generate-all', file: 'generateBookOneHooks.ts', args: ['--all'], scope: 'book1', desc: 'Same as generate with --all' },
      { name: 'words', file: 'generateWordHooks.ts', scope: 'book', desc: 'Word hooks (--book N --execute)' },
      { name: 'sound-decide', file: 'decideSoundPieces.ts', scope: 'book1', desc: 'Sound pass: decide each character phonetic piece' },
      { name: 'repair', file: 'repairHooksTypesafe.ts', scope: 'book1', desc: 'Rewrite triage-flagged hooks and re-verify' },
    ],
  },
  {
    stage: 'review',
    subs: [
      { name: 'review-page', file: 'buildHookReviewPage.ts', scope: 'book', desc: 'Human review HTML (--book N)' },
      { name: 'review-prepare', file: 'prepareHookReview.ts', scope: 'book1', desc: 'Prepare hook review decisions file' },
      { name: 'review-apply', file: 'applyHookReview.ts', scope: 'book1', desc: 'Apply hook review decisions' },
      { name: 'review-chars', file: 'buildCharReviewPage.ts', scope: 'book1', desc: 'Character review page (char pass)' },
      { name: 'audit-meanings', file: 'auditMeanings.ts', scope: 'book1', desc: 'Audit canonical meanings' },
      { name: 'jev-gold', file: 'reviewCharHooksTypesafe.ts', args: ['--gold'], scope: 'book1', desc: 'Jev review of the gold set' },
      { name: 'jev-all', file: 'reviewCharHooksTypesafe.ts', args: ['--all'], scope: 'book1', desc: 'Jev review of every character hook' },
      { name: 'triage', file: 'composeCharTriage.ts', scope: 'book1', desc: 'Compose Jev answers into the worklist' },
      { name: 'gold-build', file: 'buildGoldSet.ts', scope: 'book1', desc: 'Build the gold calibration set' },
      { name: 'scan', file: 'scanSoundSplit.ts', scope: 'book1', desc: 'Scan hooks for sound/template language' },
      { name: 'apply-char-review', file: 'applyCharReview.ts', scope: 'book1', desc: 'Apply char-pass review -> book-1-hooks-v4' },
      { name: 'apply-character-review', file: 'applyCharacterReview.ts', scope: 'book1', desc: 'Apply character decisions (--decisions …)' },
    ],
  },
  {
    stage: 'check',
    subs: [
      { name: 'gates', file: 'runHookGates.ts', scope: 'book', desc: 'Gate report, repair files, auto-ship ids (--book N)' },
      { name: 'check', file: 'checkHookQuality.ts', scope: 'book1', desc: 'Coverage/quality checker (--all)' },
      { name: 'audit', file: 'strictHookAudit.ts', scope: 'book1', desc: 'Strict prose audit' },
      { name: 'check-labels', file: 'checkComponentLabelAlignment.ts', scope: 'book1', desc: 'Labels vs taught meanings' },
      { name: 'check-order', file: 'checkComponentOrder.ts', scope: 'book1', desc: 'Hook component order vs breakdown (--book N, --strict)' },
      { name: 'snapshot-order', file: 'snapshotComponentOrder.ts', scope: 'book1', desc: 'Refresh the acceptance-test order fixture' },
      { name: 'validate-batch-drafts', file: 'validateBatchDrafts.ts', scope: 'book1', desc: 'Validate hand-drafted batch (--batch)' },
      { name: 'jev-check', file: 'typesafeClient.ts', args: ['--check'], scope: 'book1', desc: 'Jev client connectivity check' },
    ],
  },
  {
    stage: 'export',
    subs: [
      { name: 'run', file: 'runBookHooks.ts', scope: 'book', desc: 'Chain prepare->generate->gates->export->checks (--book N [--auto-ship])' },
      { name: 'apply-batch-drafts', file: 'applyBatchDrafts.ts', scope: 'book1', desc: 'Merge validated batch drafts (--batch)' },
      { name: 'apply-pack', file: 'applyCuratedDraftsToPack.ts', scope: 'book1', desc: 'Merge curated drafts into records (--batch)' },
      { name: 'export', file: 'exportHookPack.ts', scope: 'book', desc: 'Write public/data/memory-hooks pack + manifest (--book N)' },
    ],
  },
];

export const ALL_SUBS: Sub[] = STAGES.flatMap((s) => s.subs);

function help(): void {
  console.log('Usage: npm run hooks -- <subcommand> [args…]   (book = takes --book N; book1 = Book-1 artifacts)\n');
  for (const { stage, subs } of STAGES) {
    console.log(`${stage.toUpperCase()}`);
    for (const s of subs) console.log(`  ${s.name.padEnd(24)}${s.scope.padEnd(6)} ${s.desc}`);
    console.log('');
  }
}

function main(): void {
  const [name, ...rest] = process.argv.slice(2);
  if (!name || name === 'help' || name === '--help' || name === '-h') return help();
  const sub = ALL_SUBS.find((s) => s.name === name);
  if (!sub) {
    console.error(`Unknown subcommand "${name}".\n`);
    help();
    process.exit(1);
  }
  const file = resolve(HERE, sub.file);
  if (!existsSync(file)) {
    console.error(`Missing script: ${file}`);
    process.exit(1);
  }
  const r = spawnSync('npx', ['tsx', file, ...(sub.args ?? []), ...rest], { cwd: ROOT, stdio: 'inherit', env: process.env });
  process.exit(r.status ?? 1);
}

if (process.argv[1]?.endsWith('cli.ts')) main();

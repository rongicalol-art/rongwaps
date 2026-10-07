import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');

function argumentValue(flag: string, fallback: string): string {
  const index = process.argv.indexOf(flag);
  return index > -1 ? process.argv[index + 1] : fallback;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function main(): void {
  const bookId = Number(argumentValue('--book', '3'));
  const stem = `book-${bookId}`;
  const autoShip = process.argv.includes('--auto-ship');
  const maxRepairRounds = Number(argumentValue('--repair-rounds', '2'));
  const logPath = resolve(OUTPUT_DIR, `${stem}-run.log`);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const log = (line: string): void => {
    const stamp = new Date().toISOString();
    console.log(`[${stamp}] ${line}`);
    appendFileSync(logPath, `[${stamp}] ${line}\n`);
  };

  const run = (label: string, args: string[]): void => {
    runCommand(label, 'npx', ['tsx', ...args]);
  };

  const runCommand = (label: string, command: string, args: string[]): void => {
    log(`stage: ${label} (${command} ${args.join(' ')})`);
    const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit' });
    if (result.status !== 0) {
      log(`stage failed: ${label} (exit ${result.status ?? 'signal'})`);
      appendFileSync(logPath, `stage failed: ${label}\n`);
      process.exitCode = 1;
      throw new Error(`Stage failed: ${label}`);
    }
    log(`stage done: ${label}`);
  };

  try {
    run('prepare', ['scripts/memory-hooks/prepareBookHooks.ts', '--book', String(bookId)]);
    const scopePath = resolve(OUTPUT_DIR, `${stem}-scope.json`);
    const scope = readJson<{ characters: string[]; words: string[] }>(scopePath);
    log(`scope: ${scope.characters.length} characters, ${scope.words.length} words`);

    run('generate characters', [
      'scripts/memory-hooks/generateBookOneHooks.ts',
      '--book', String(bookId),
      '--scope', scopePath,
      '--stem', `${stem}-hooks-v3`,
      '--execute',
      '--critic',
    ]);

    run('generate words', [
      'scripts/memory-hooks/generateWordHooks.ts',
      '--book', String(bookId),
      '--execute',
      '--scope', scopePath,
    ]);

    for (let round = 0; round <= maxRepairRounds; round += 1) {
      run(`gates round ${round}`, ['scripts/memory-hooks/runHookGates.ts', '--book', String(bookId)]);
      const report = readJson<{
        chars: { flagged: number; issues: Record<string, string[]> };
        words: { flagged: number; issues: Record<string, string[]> };
      }>(resolve(OUTPUT_DIR, `${stem}-gate-report.json`));
      log(`gates round ${round}: chars ${report.chars.flagged} flagged, words ${report.words.flagged} flagged`);
      if (report.chars.flagged === 0 && report.words.flagged === 0) break;
      if (round === maxRepairRounds) {
        log('repair rounds exhausted; remaining flags stay in the review queue');
        break;
      }
      if (report.chars.flagged > 0) {
        run(`repair characters round ${round + 1}`, [
          'scripts/memory-hooks/generateBookOneHooks.ts',
          '--book', String(bookId),
          '--repair-report', resolve(OUTPUT_DIR, `${stem}-chars-repair.json`),
          '--stem', `${stem}-hooks-v3`,
          '--execute',
          '--critic',
        ]);
      }
      if (report.words.flagged > 0) {
        run(`repair words round ${round + 1}`, [
          'scripts/memory-hooks/generateWordHooks.ts',
          '--book', String(bookId),
          '--repair-report', resolve(OUTPUT_DIR, `${stem}-words-repair.json`),
          '--execute',
        ]);
      }
    }

    const shipIdsPath = resolve(OUTPUT_DIR, `${stem}-auto-ship-ids.json`);
    if (autoShip) {
      run('export auto-ship pack', [
        'scripts/memory-hooks/exportHookPack.ts',
        '--book', String(bookId),
        '--ids', shipIdsPath,
      ]);
      run('refresh decomposition fixture', ['scripts/memory-hooks/snapshotComponentOrder.ts', '--book', String(bookId)]);
      runCommand('typecheck', 'npm', ['run', 'typecheck']);
      runCommand('lint', 'npm', ['run', 'lint']);
      runCommand('tests', 'npm', ['test']);
      runCommand('build', 'npm', ['run', 'build']);
      runCommand('stage pack', 'git', [
        'add',
        'public/data/memory-hooks',
        'tests/fixtures',
        'scripts/memory-hooks',
        'tests/acceptance/memory_hooks.test.ts',
        'package.json',
      ]);
      runCommand('commit', 'git', [
        'commit',
        '-m', `feat(memory-hooks): ${stem} auto-ship — machine-clean hooks`,
        '-m', 'Generated with the formula prompts (taught senses, breakdown order, no dangling props) and passed every deterministic gate plus the acceptance suite.',
      ]);
      runCommand('push', 'git', ['push', 'origin', 'HEAD']);
      log('auto-ship pushed; Render will deploy the clean hooks');
    } else {
      log('auto-ship disabled; pack not exported');
    }

    run('review page', ['scripts/memory-hooks/buildHookReviewPage.ts', '--book', String(bookId)]);

    const ids = readJson<{ ids: string[] }>(shipIdsPath).ids;
    const reportLines = [
      `# ${stem} memory-hook run`,
      '',
      `- scope: ${scope.characters.length} characters, ${scope.words.length} words`,
      `- auto-ship: ${autoShip ? 'enabled' : 'disabled'}`,
      `- clean ids (auto-shippable): ${ids.length}`,
      `- gate report: output/memory-hooks/${stem}-gate-report.json`,
      `- review page: npm run hooks:review -- --book ${bookId}`,
      '',
      '## Morning checklist',
      '1. Open the review page and walk Medium/Low items.',
      '2. Export feedback JSON and hand it over for a decisions pass.',
      '3. Re-export the pack (`hooks:export` with --book) after fixes.',
      '',
    ];
    writeFileSync(resolve(OUTPUT_DIR, `${stem}-run-report.md`), reportLines.join('\n'));
    log(`done. report: output/memory-hooks/${stem}-run-report.md`);
  } catch (error) {
    log(`run aborted: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

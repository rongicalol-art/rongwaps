import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { runSimplicityReview } from './reviewBookOneSimplicity';
import { remakeBookOne } from './remakeBookOneHooks';

const ROOT = resolve(import.meta.dirname, '../..');

function main(): void {
  console.log('===============================================================');
  console.log('  BOOK 1 SELF-LOOP MEMORY HOOK REVIEWER & REMAKER');
  console.log('===============================================================\n');

  // Iteration 1: Initial Review
  console.log('[STEP 1] Running initial simplicity & beginner-friendliness review...');
  const initial = runSimplicityReview();
  console.log(`  Initial Flagged Characters: ${initial.flaggedCharacters.length}`);
  console.log(`  Initial Flagged Words: ${initial.flaggedWords.length}`);

  // Step 2: Remake & Overhaul
  console.log('\n[STEP 2] Executing remake of flagged hooks...');
  remakeBookOne();

  // Step 3: Second Review Pass (Loop Verification)
  console.log('\n[STEP 3] Re-evaluating simplicity & beginner-friendliness...');
  const second = runSimplicityReview();
  console.log(`  Post-Remake Flagged Characters: ${second.flaggedCharacters.length}`);
  console.log(`  Post-Remake Flagged Words: ${second.flaggedWords.length}`);

  if (second.flaggedCharacters.length > 0 || second.flaggedWords.length > 0) {
    console.error('Simplicity review loop failed to reach zero flags!');
    process.exit(1);
  }

  // Step 4: Strict Hook Audit (prose rules, length >= 55, target tokens)
  console.log('\n[STEP 4] Running strict prose & quality audit...');
  const auditOutput = execSync('npx tsx scripts/memory-hooks/strictHookAudit.ts', { cwd: ROOT, encoding: 'utf8' });
  console.log('  ' + auditOutput.trim().split('\n')[0]);

  // Step 5: Coverage & Component Order
  console.log('\n[STEP 5] Checking component coverage and breakdown order...');
  const coverageOutput = execSync('npm run memory-hooks:check -- --all', { cwd: ROOT, encoding: 'utf8' });
  console.log('  ' + coverageOutput.trim().split('\n').slice(-1)[0]);

  const orderOutput = execSync('npx tsx scripts/memory-hooks/checkComponentOrder.ts --book 1', { cwd: ROOT, encoding: 'utf8' });
  console.log('  ' + orderOutput.trim().split('\n').join('\n  '));

  // Step 6: Test Suite Validation
  console.log('\n[STEP 6] Running targeted memory hook test suites...');
  execSync('npx tsx --test tests/memoryHookPack.test.ts', { cwd: ROOT, stdio: 'inherit' });
  execSync('npx tsx --test tests/memoryHookWordQuality.test.ts', { cwd: ROOT, stdio: 'inherit' });
  execSync('npx tsx --test tests/acceptance/memory_hooks.test.ts', { cwd: ROOT, stdio: 'inherit' });

  console.log('\n===============================================================');
  console.log('  ALL GATES GREEN! SELF-LOOP REVIEW & REMAKE COMPLETE.');
  console.log('===============================================================');
}

main();

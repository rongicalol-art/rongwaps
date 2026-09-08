import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { isStrictAcceptance, PROJECT_ROOT } from '../acceptance_helpers';

test('AGENTS.md Acceptance: Does not reference deleted documentation files', (t) => {
  const agentsPath = path.join(PROJECT_ROOT, 'AGENTS.md');
  const content = fs.readFileSync(agentsPath, 'utf-8');

  const deletedDocs = [
    'team.md',
    'PROGRESS_AND_PLANS.md',
    'ARCHITECT_LOG.md',
    'WORK_CONTEXT.md',
    'ROADMAP.md',
    'WIDGET_ARCHITECTURE_REFACTOR_PLAN.md',
    'GRAMMAR_CONVERSATION_QUEST.md',
    'GRAMMAR_SCREEN_IMPLEMENTATION_PLAN.md',
    'GRAMMAR_SCREEN_REVIEW_PLAN.md',
    'LESSON_9_GRAMMAR_PLAN.md',
    'AGENTS.md.original.md',
    'WIDGETS.md.original.md',
  ];

  const referencedDeleted = deletedDocs.filter((doc) => content.includes(doc));

  if (!isStrictAcceptance() && referencedDeleted.length > 0) {
    t.skip(`AGENTS.md still references deleted docs: ${referencedDeleted.join(', ')}`);
    return;
  }

  assert.deepEqual(
    referencedDeleted,
    [],
    `AGENTS.md references deleted documentation files: ${referencedDeleted.join(', ')}`,
  );
});

test('AGENTS.md Acceptance: Does not contain exact pixel values or modal sizing rules', (t) => {
  const agentsPath = path.join(PROJECT_ROOT, 'AGENTS.md');
  const content = fs.readFileSync(agentsPath, 'utf-8');

  // Forbidden patterns mentioned in audit:
  // rounded-[14px], h-[520px], max-h-[85vh], min-h-11, h-12 modal sizing rules
  const forbiddenSnippets = [
    'rounded-[14px]',
    'h-[520px]',
    'max-h-[85vh]',
    'min-h-11',
  ];

  const foundSnippets = forbiddenSnippets.filter((snippet) => content.includes(snippet));

  if (!isStrictAcceptance() && foundSnippets.length > 0) {
    t.skip(`AGENTS.md still contains exact pixel values/modal sizing: ${foundSnippets.join(', ')}`);
    return;
  }

  assert.deepEqual(
    foundSnippets,
    [],
    `AGENTS.md contains forbidden exact pixel / modal sizing snippets: ${foundSnippets.join(', ')}`,
  );
});

test('AGENTS.md Acceptance: Does not claim mnemonics are documented in API_SPEC.md', (t) => {
  const agentsPath = path.join(PROJECT_ROOT, 'AGENTS.md');
  const content = fs.readFileSync(agentsPath, 'utf-8');

  // Check if API_SPEC.md is claimed to document mnemonics
  const falseMnemonicClaim = /mnemonics.*API_SPEC\.md|API_SPEC\.md.*mnemonics/i.test(content);

  if (!isStrictAcceptance() && falseMnemonicClaim) {
    t.skip('AGENTS.md still claims mnemonics are documented in API_SPEC.md');
    return;
  }

  assert.equal(
    falseMnemonicClaim,
    false,
    'AGENTS.md must not claim mnemonics are documented in API_SPEC.md',
  );
});

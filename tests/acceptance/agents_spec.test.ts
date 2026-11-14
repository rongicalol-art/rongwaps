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

// --- Agent rules stay lean: one home per rule -------------------------------
// Every correction used to be appended to several rule files, which then
// contradicted each other. These checks keep the set small and unrepeated.

const RULE_BUDGETS: Record<string, number> = {
  'AGENTS.md': 60,
  'CLAUDE.md': 10,
  '.claude/OWNER_PREFERENCES.md': 110,
};

function agentRuleFiles(): string[] {
  const inDir = (dir: string, keep: (name: string) => boolean) => fs.existsSync(path.join(PROJECT_ROOT, dir))
    ? fs.readdirSync(path.join(PROJECT_ROOT, dir)).filter(keep).map((name) => `${dir}/${name}`)
    : [];
  return [
    ...Object.keys(RULE_BUDGETS),
    ...inDir('.claude/rules', (name) => name.endsWith('.md')),
    ...inDir('.claude/agents', (name) => name.endsWith('.md')),
    ...inDir('.claude/skills', () => true).map((dir) => `${dir}/SKILL.md`),
  ].filter((file) => fs.existsSync(path.join(PROJECT_ROOT, file)));
}

const readRule = (file: string) => fs.readFileSync(path.join(PROJECT_ROOT, file), 'utf-8');
const frontmatter = (text: string) => text.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';
const body = (text: string) => text.replace(/^---\n[\s\S]*?\n---\n/, '');

test('Agent rules: the always-loaded files stay within their line budget', () => {
  for (const [file, limit] of Object.entries(RULE_BUDGETS)) {
    const lines = readRule(file).trimEnd().split('\n').length;
    assert.ok(
      lines <= limit,
      `${file} has ${lines} lines (limit ${limit}). Move detail to the matching .claude/rules file or docs/, or replace a line; raise the limit only with the owner.`,
    );
  }
});

test('Agent rules: no passage is repeated in two rule files', () => {
  const SPAN = 8;
  const seen = new Map<string, string>();
  const repeats = new Map<string, string>();
  for (const file of agentRuleFiles()) {
    const words = body(readRule(file)).toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, ' ').split(/\s+/).filter(Boolean);
    for (let i = 0; i + SPAN <= words.length; i++) {
      const passage = words.slice(i, i + SPAN).join(' ');
      const first = seen.get(passage);
      if (first && first !== file) repeats.set(`${first} + ${file}`, passage);
      else if (!first) seen.set(passage, file);
    }
  }
  assert.deepEqual(
    [...repeats].map(([files, passage]) => `${files}: "${passage}"`),
    [],
    'The same rule is written in two files. Keep it in one and point to it from the other.',
  );
});

test('Agent rules: every path they name exists', () => {
  const missing: string[] = [];
  for (const file of agentRuleFiles()) {
    const text = readRule(file);
    const named = [...body(text).matchAll(/`((?:docs|src|scripts|tests|content|server|supabase|shared|games|\.claude|\.githooks)\/[\w./@-]+)`/g)].map((m) => m[1]);
    // A path rule that matches nothing never loads: check the folder each glob starts from.
    const globs = [...frontmatter(text).matchAll(/^\s*-\s*"([^"]+)"/gm)].map((m) => m[1].split('*')[0]);
    for (const target of [...named, ...globs]) {
      // Placeholders (`lessonX.json`, `LXX-needs.md`) and the untracked key file are not real paths here.
      if (/[a-z]X\b|XX/.test(target) || target === 'scripts/.config.json') continue;
      if (!fs.existsSync(path.join(PROJECT_ROOT, target))) missing.push(`${file}: ${target}`);
    }
  }
  assert.deepEqual([...new Set(missing)], [], 'Rule files name paths that do not exist.');
});

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { SystemOneResult, Questions } from '@typesafe-ai/sdk';
import type { AskJevFn } from '../scripts/jev/lintRules';
import {
  buildExcerpt,
  collectCandidates,
  formatContext,
  lexicalShortlist,
  parseArgs,
  rankCandidates,
  runRouter,
  tokenize,
  type RouterOptions,
} from '../scripts/jev/contextRouter';

function makeCorpus(): string {
  const root = mkdtempSync(join(tmpdir(), 'jev-context-'));
  mkdirSync(join(root, 'src', 'grammar-lesson'), { recursive: true });
  mkdirSync(join(root, 'src', 'unrelated'), { recursive: true });
  mkdirSync(join(root, 'docs'), { recursive: true });
  mkdirSync(join(root, 'node_modules'), { recursive: true });
  writeFileSync(join(root, 'AGENTS.md'), '# Agent rules');
  writeFileSync(join(root, 'src', 'grammar-lesson', 'scoring.ts'), 'export function scoreGrammarAnswer() {}');
  writeFileSync(join(root, 'src', 'unrelated', 'theme.ts'), 'export const theme = 1;');
  writeFileSync(join(root, 'docs', 'GRAMMAR_LESSON_TEMPLATE.md'), '# Grammar template\n\nscoring rules');
  writeFileSync(join(root, 'node_modules', 'ignored.ts'), 'ignored');
  return root;
}

test('tokenize lowercases, drops stop words and short tokens', () => {
  assert.deepEqual(tokenize('Fix the GRAMMAR scoring in grammar scoring!'), ['grammar', 'scoring']);
});

test('collectCandidates walks allowed dirs and ignores node_modules', () => {
  const root = makeCorpus();
  try {
    const files = collectCandidates(root);
    assert.ok(files.includes('AGENTS.md'));
    assert.ok(files.includes('src/grammar-lesson/scoring.ts'));
    assert.ok(files.includes('docs/GRAMMAR_LESSON_TEMPLATE.md'));
    assert.ok(!files.some((file) => file.includes('node_modules')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('lexicalShortlist ranks path matches above content matches and caps the list', () => {
  const root = makeCorpus();
  try {
    const files = collectCandidates(root);
    const readFile = (path: string) => readFileSync(path, 'utf8');
    const shortlist = lexicalShortlist(root, files, 'grammar scoring', 10, readFile);
    assert.equal(shortlist[0], 'src/grammar-lesson/scoring.ts');
    assert.ok(shortlist.includes('docs/GRAMMAR_LESSON_TEMPLATE.md'));
    assert.ok(!shortlist.includes('src/unrelated/theme.ts'));

    const capped = lexicalShortlist(root, files, 'grammar scoring', 1, readFile);
    assert.equal(capped.length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('buildExcerpt keeps headings and trims the body', () => {
  const root = makeCorpus();
  try {
    const excerpt = buildExcerpt(root, 'docs/GRAMMAR_LESSON_TEMPLATE.md', (path) => readFileSync(path, 'utf8'));
    assert.match(excerpt, /^# Grammar template/);
    assert.match(excerpt, /scoring rules/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rankCandidates sorts by score with path tie-break', () => {
  const ranked = rankCandidates(['b.ts', 'a.ts', 'c.ts'], {
    file_0: { score: 1 },
    file_1: { score: 3 },
    file_2: { score: 3 },
  });
  assert.deepEqual(ranked.map((entry) => entry.path), ['a.ts', 'c.ts', 'b.ts']);
});

test('formatContext lists the selected files with scores', () => {
  const markdown = formatContext('fix scoring', [{ path: 'src/a.ts', score: 2.5 }]);
  assert.match(markdown, /Task: fix scoring/);
  assert.match(markdown, /src\/a\.ts \(score 2\.50\/3\)/);
});

test('runRouter selects by Jev score and writes both reports', async () => {
  const root = makeCorpus();
  const out = join(root, 'out', 'latest');
  try {
    const fakeAsk: AskJevFn = async (_state, questions, model) => {
      const keys = Object.keys(questions);
      return {
        model: model ?? 'fake-model',
        usage: { input_tokens: 100, output_tokens: 0 },
        answers: Object.fromEntries(keys.map((key, index) => [key, { score: index === 0 ? 3 : 0.5 }])),
      } as unknown as SystemOneResult<Questions>;
    };
    const options: RouterOptions = {
      ...parseArgs(['node', 'script', 'grammar scoring']),
      root,
      out,
      model: 'fake-model',
    };
    const report = await runRouter(options, {
      askJev: fakeAsk,
      readFile: (path) => readFileSync(path, 'utf8'),
      writeFile: (path, contents) => {
        mkdirSync(join(path, '..'), { recursive: true });
        writeFileSync(path, contents);
      },
    });

    assert.equal(report.totals.calls, 1);
    assert.equal(report.totals.selected, 1);
    assert.equal(report.selected[0].path, 'src/grammar-lesson/scoring.ts');
    assert.ok(report.totals.selectedTokensEstimate > 0);

    const written = JSON.parse(readFileSync(`${out}.json`, 'utf8')) as { selected: Array<{ path: string }> };
    assert.equal(written.selected[0].path, 'src/grammar-lesson/scoring.ts');
    assert.match(readFileSync(`${out}.md`, 'utf8'), /src\/grammar-lesson\/scoring\.ts/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runRouter --dry makes no calls and writes nothing', async () => {
  const root = makeCorpus();
  try {
    const options: RouterOptions = {
      ...parseArgs(['node', 'script', 'grammar scoring', '--dry']),
      root,
      out: join(root, 'unused', 'latest'),
    };
    const report = await runRouter(options, {
      askJev: async () => {
        throw new Error('dry run must not call Jev');
      },
      readFile: (path) => readFileSync(path, 'utf8'),
      writeFile: () => {
        throw new Error('dry run must not write');
      },
    });
    assert.equal(report.totals.calls, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

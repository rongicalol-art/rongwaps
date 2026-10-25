import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';
import type { GrammarPractice, SpotFixItem } from '../../src/types/models';
import type { GrammarPracticeViewProps } from '../../src/features/grammar-practice/GrammarPracticeView';
import type { PracticeExerciseProps } from '../../src/features/grammar-practice/practiceTypes';

/** Render the real presentation owners, isolating their dock and unrelated exercise dependencies. */
async function renderer(entry: string, exported: string) {
  const resolve = createRequire(import.meta.url).resolve;
  const bundled = await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', write: false,
    plugins: [{ name: 'practice-presentation', setup(plugin) {
      plugin.onResolve({ filter: /^react(?:-dom)?(?:\/.*)?$/ }, ({ path }) => ({ path: pathToFileURL(resolve(path)).href, external: true }));
      plugin.onResolve({ filter: /^(\.\/exercises|\.\/components\/PracticeDock|\.\.\/\.\.\/practice)$/ }, ({ path }) => ({ path, namespace: 'presentation-fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'presentation-fixture' }, ({ path }) => ({ contents: path === './exercises'
        ? 'import {createElement as h} from "react"; const Exercise=({item})=>h("output",null,JSON.stringify(item)); export const PRACTICE_EXERCISES={"order-build":Exercise,"match-pairs":Exercise};'
        : path === './components/PracticeDock' ? 'export const PracticeDock=()=>null;'
          : 'import {createElement as h} from "react"; export const PracticeChoiceButton=({children,onClick})=>h("button",{onClick},children);' }));
    } }],
  });
  const module = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
  return module[exported];
}

const view = renderer('src/features/grammar-practice/GrammarPracticeView.tsx', 'GrammarPracticeView') as Promise<ComponentType<GrammarPracticeViewProps>>;
const spot = renderer('src/features/grammar-practice/exercises/SpotFixExercise.tsx', 'SpotFixExercise') as Promise<ComponentType<PracticeExerciseProps<SpotFixItem>>>;
const noop = () => {};

async function renderPractice(practice: GrammarPractice) {
  return renderToStaticMarkup(createElement(await view, {
    practice, script: 'traditional', showPinyin: false, showTranslation: false, contextTokens: [],
    onOpenWord: noop, onComplete: noop, barHost: null,
  }));
}

test('matching keeps its authored task visible even when marked quiet', async () => {
  const html = await renderPractice({ bookPage: 0, title: 'Book instruction', items: [{
    id: 'matching-fixture', source: 'own', kind: 'match-pairs', quiet: true,
    prompt: 'Match each reason to its result.', lines: [], replies: [],
  }] });
  assert.match(html, /<h1[^>]*>Match each reason to its result\.<\/h1>/);
});

test('the rendered bank is mixed without losing repeated words or changing the authored answer', async () => {
  const practice: GrammarPractice = { bookPage: 0, title: 'Build', items: [{
    id: 'repeat-fixture', source: 'own', kind: 'order-build',
    tiles: ['他', '又', '高', '又', '帥', '很'].map((traditional) => ({ traditional, pinyin: '' })),
    accepted: [{ order: ['他', '又', '高', '又', '帥'], sentence: { traditional: '他又高又帥。', pinyin: '', english: '' } }],
    fallbackRepair: 'Try again.',
  }] };
  const before = JSON.stringify(practice);
  const html = await renderPractice(practice);
  const rendered = JSON.parse(html.match(/<output>(.*?)<\/output>/s)![1].replaceAll('&quot;', '"'));
  assert.notDeepEqual(rendered.tiles, practice.items[0].kind === 'order-build' && practice.items[0].tiles);
  assert.deepEqual(rendered.tiles.map((tile: { traditional: string }) => tile.traditional).sort(), ['他', '又', '高', '又', '帥', '很'].sort());
  assert.equal(rendered.tiles.filter((tile: { traditional: string }) => tile.traditional === '又').length, 2);
  assert.equal(JSON.stringify(practice), before);
  assert.deepEqual(rendered.accepted, practice.items[0].kind === 'order-build' && practice.items[0].accepted);
});

test('repair starts with the mistaken chunks, never the corrected sentence as a choice', async () => {
  const item: SpotFixItem = {
    id: 'repair-fixture', source: 'own', kind: 'spot-fix', prompt: 'Fix the past negative.',
    chunks: [{ traditional: '他' }, { traditional: '沒' }, { traditional: '來' }, { traditional: '了', tail: '。' }],
    wrong: 3, tiles: [{ traditional: '都', pinyin: 'dōu' }], hint: 'Check the past negative.',
    result: { traditional: '他沒來。', pinyin: 'Tā méi lái.', english: 'He did not come.' },
  };
  const html = renderToStaticMarkup(createElement(await spot, {
    item, script: 'traditional', status: 'idle', retryKey: 0, showPinyin: false, showTranslation: false,
    contextTokens: [], onOpenWord: noop, shortcutsDisabled: false, trayHost: null,
    onReadyChange: noop, checkRef: { current: null }, onResult: noop,
  }));
  assert.match(html, /Tap the word that needs fixing/);
  for (const chunk of item.chunks) assert.ok(html.includes(`aria-label="Fix ${chunk.traditional}"`));
  assert.ok(!html.includes(item.result.traditional));
  assert.ok(!html.includes(item.result.english));
  assert.ok(!html.includes('Take it out'), 'repair options follow identification, not precede it');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { normalizeMnemonic, renderHookText, tokenizeHookText } from '../src/features/character-memory-hooks/hookText';

test('tokenizeHookText splits plain text and 字(label) glosses', () => {
  const segments = tokenizeHookText('A 口(mouth) rests inside a 冂(frame).');
  assert.deepEqual(segments, [
    { kind: 'text', text: 'A ' },
    { kind: 'token', glyph: '口', label: 'mouth' },
    { kind: 'text', text: ' rests inside a ' },
    { kind: 'token', glyph: '冂', label: 'frame' },
    { kind: 'text', text: '.' },
  ]);
});

test('tokenizeHookText handles leading tokens, multi-word labels and spaced variants', () => {
  const segments = tokenizeHookText('一 (one) + 學(long study) → 一(one).');
  assert.deepEqual(segments, [
    { kind: 'token', glyph: '一', label: 'one' },
    { kind: 'text', text: ' + ' },
    { kind: 'token', glyph: '學', label: 'long study' },
    { kind: 'text', text: ' → ' },
    { kind: 'token', glyph: '一', label: 'one' },
    { kind: 'text', text: '.' },
  ]);
});

test('tokenizeHookText handles legacy (字) references and (字 + 字) groups', () => {
  assert.deepEqual(tokenizeHookText('Knowing the way (道) is to know (知).'), [
    { kind: 'text', text: 'Knowing the way ' },
    { kind: 'glyphRef', glyphs: ['道'] },
    { kind: 'text', text: ' is to know ' },
    { kind: 'glyphRef', glyphs: ['知'] },
    { kind: 'text', text: '.' },
  ]);
  assert.deepEqual(tokenizeHookText("the whole household' (大 + 家), so"), [
    { kind: 'text', text: "the whole household' " },
    { kind: 'glyphRef', glyphs: ['大', '家'] },
    { kind: 'text', text: ', so' },
  ]);
});

test('tokenizeHookText leaves the sanctioned sound-component pinyin note untouched', () => {
  const hook = 'A 青(qīng) as the sound component (qīng -> qǐng) → 請(please).';
  const segments = tokenizeHookText(hook);
  const text = segments.filter((segment) => segment.kind === 'text').map((segment) => segment.text).join('');
  assert.ok(text.includes('(qīng -> qǐng)'), text);
  assert.equal(segments.filter((segment) => segment.kind === 'token').length, 2);
});

test('renderHookText drops gloss parentheses and bolds the label', () => {
  const html = renderToStaticMarkup(renderHookText('A 口(mouth) rests with 一(one) bar → 同(same).'));
  assert.ok(!html.includes('(mouth)') && !html.includes('(one)') && !html.includes('(same)'), html);
  assert.ok(html.includes('口 <strong'), html);
  assert.ok(html.includes('>mouth</strong>'), html);
  assert.ok(html.includes('一 <strong'), html);
  assert.ok(html.includes('→ '), html);
  assert.ok(html.includes('同 <strong'), html);
});

test('renderHookText bolds legacy glyph references without parentheses', () => {
  const html = renderToStaticMarkup(renderHookText("Knowing the way (道) is to know (知) → 知道 means 'to know'."));
  assert.ok(!html.includes('(道)') && !html.includes('(知)'), html);
  assert.ok(html.includes('>道</strong>'), html);
  assert.ok(html.includes('>知</strong>'), html);
  const group = renderToStaticMarkup(renderHookText("the whole household' (大 + 家), so"));
  assert.ok(!group.includes('(大 + 家)'), group);
  assert.ok(group.includes('>大</strong> + <strong'), group);
  assert.ok(group.includes('>家</strong>'), group);
});

test('renderHookText uses the softened emphasis tone', () => {
  const html = renderToStaticMarkup(renderHookText('A 口(mouth) and (道).'));
  assert.ok(html.includes('class="font-black text-ui-ink-strong/90"'), html);
});

test('renderHookText keeps the sound-component pinyin note parenthesized', () => {
  const html = renderToStaticMarkup(renderHookText('A 青(qīng) as the sound component (qīng -> qǐng) → 請(please).'));
  assert.ok(html.includes('(qīng -&gt; qǐng)'), html);
});

test('renderHookText still renders **emphasis** as bold', () => {
  const html = renderToStaticMarkup(renderHookText('A **strong** word.'));
  assert.ok(html.includes('<strong'), html);
  assert.ok(html.includes('strong'), html);
});

test('normalizeMnemonic reads strings and hook objects', () => {
  assert.equal(normalizeMnemonic('  A hook.  '), 'A hook.');
  assert.equal(normalizeMnemonic({ hook: 'From object.' }), 'From object.');
  assert.equal(normalizeMnemonic({}), null);
  assert.equal(normalizeMnemonic('   '), null);
});

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
    { kind: 'text', text: 'Knowing the ' },
    { kind: 'gloss', word: 'way' },
    { kind: 'text', text: ' ' },
    { kind: 'glyphRef', glyphs: ['道'] },
    { kind: 'text', text: ' is to ' },
    { kind: 'gloss', word: 'know' },
    { kind: 'text', text: ' ' },
    { kind: 'glyphRef', glyphs: ['知'] },
    { kind: 'text', text: '.' },
  ]);
  assert.deepEqual(tokenizeHookText("the whole household' (大 + 家), so"), [
    { kind: 'text', text: 'the whole ' },
    { kind: 'gloss', word: 'household' },
    { kind: 'text', text: "' " },
    { kind: 'glyphRef', glyphs: ['大', '家'] },
    { kind: 'text', text: ', so' },
  ]);
});

test('tokenizeHookText skips glue words but keeps glossable verbs', () => {
  const shuo = tokenizeHookText('you hear of (聽說) the thing.');
  assert.deepEqual(shuo, [
    { kind: 'text', text: 'you ' },
    { kind: 'gloss', word: 'hear' },
    { kind: 'text', text: ' of ' },
    { kind: 'glyphRef', glyphs: ['聽說'] },
    { kind: 'text', text: ' the thing.' },
  ]);
  const shi = tokenizeHookText('you want (要) a situation to be (是) true.');
  assert.deepEqual(shi.slice(-4), [
    { kind: 'gloss', word: 'be' },
    { kind: 'text', text: ' ' },
    { kind: 'glyphRef', glyphs: ['是'] },
    { kind: 'text', text: ' true.' },
  ]);
});

test('tokenizeHookText keeps quotes outside the bold gloss', () => {
  const day = tokenizeHookText("the unnumbered 'day' (天) is Sunday.");
  assert.deepEqual(day.slice(0, 4), [
    { kind: 'text', text: "the unnumbered '" },
    { kind: 'gloss', word: 'day' },
    { kind: 'text', text: "' " },
    { kind: 'glyphRef', glyphs: ['天'] },
  ]);
  const cycle = tokenizeHookText('In the star-cycle (星期), Sunday.');
  assert.deepEqual(cycle.slice(0, 4), [
    { kind: 'text', text: 'In the ' },
    { kind: 'gloss', word: 'star-cycle' },
    { kind: 'text', text: ' ' },
    { kind: 'glyphRef', glyphs: ['星期'] },
  ]);
});

test('tokenizeHookText leaves a reference without a preceding word unemphasized', () => {
  assert.deepEqual(tokenizeHookText('(道) alone.'), [
    { kind: 'glyphRef', glyphs: ['道'] },
    { kind: 'text', text: ' alone.' },
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

test('renderHookText bolds the English gloss of legacy glyph references', () => {
  const html = renderToStaticMarkup(renderHookText("Knowing the way (道) is to know (知) → 知道 means 'to know'."));
  assert.ok(!html.includes('(道)') && !html.includes('(知)'), html);
  assert.ok(html.includes('>way</strong>'), html);
  assert.ok(html.includes('>know</strong>'), html);
  assert.ok(!html.includes('>道</strong>') && !html.includes('>知</strong>'), html);
  const plain = html.replace(/<[^>]+>/g, '');
  assert.ok(plain.includes('Knowing the way 道 is to know 知'), plain);
  const groupHtml = renderToStaticMarkup(renderHookText("the whole household' (大 + 家), so"));
  assert.ok(!groupHtml.includes('(大 + 家)'), groupHtml);
  assert.ok(groupHtml.includes('>household</strong>'), groupHtml);
  const groupPlain = groupHtml.replace(/<[^>]+>/g, '');
  assert.ok(groupPlain.includes('the whole household') && groupPlain.includes('大 + 家'), groupPlain);
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

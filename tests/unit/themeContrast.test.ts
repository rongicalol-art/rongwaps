import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * Every theme context the cascade in src/index.css can produce (book × light/dark × review) must stay readable,
 * and every tactile edge must stay darker than its face. Parses the stylesheet, so a token edit is checked as-is.
 */
const css = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8');

function declarations(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[name] = value.trim();
  return out;
}

function block(selector: string): Record<string, string> {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `missing block ${selector}`);
  const open = css.indexOf('{', at);
  return declarations(css.slice(open + 1, css.indexOf('}', open)));
}

const BASE = { ...declarations(css.slice(css.indexOf('@theme {') + 8, css.indexOf('}', css.indexOf('@theme {')))), ...block(':root') };
const BOOKS = [1, 2, 3, 4];

function context(book: number, dark: boolean, review: boolean): Record<string, string> {
  const has = (selector: string) => css.includes(`${selector} {`);
  return {
    ...BASE,
    ...(has(`:root[data-book="${book}"]`) ? block(`:root[data-book="${book}"]`) : {}),
    ...(dark ? block(':root[data-theme="dark"]') : {}),
    ...(dark && has(`:root[data-theme="dark"][data-book="${book}"]`) ? block(`:root[data-theme="dark"][data-book="${book}"]`) : {}),
    ...(review ? block(':root[data-tone="review"],\n[data-tone="review"]') : {}),
    ...(review && dark ? block(':root[data-theme="dark"][data-tone="review"],\n[data-theme="dark"] [data-tone="review"]') : {}),
  };
}

function color(tokens: Record<string, string>, name: string): string {
  let value = tokens[`color-${name}`];
  for (let hops = 0; value?.startsWith('var('); hops += 1) {
    assert.ok(hops < 5, `circular ${name}`);
    value = tokens[value.slice(6, -1)];
  }
  assert.match(value ?? '', /^#[0-9a-f]{6}$/i, `${name} resolves to a hex`);
  return value;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

for (const dark of [false, true]) {
  for (const review of [false, true]) {
    for (const book of BOOKS) {
      const label = `${dark ? 'dark' : 'light'} book ${book}${review ? ' review' : ''}`;
      test(`${label}: text is readable and edges sit below faces`, () => {
        const t = context(book, dark, review);
        const pair = (fg: string, bg: string, min: number) => {
          const ratio = contrast(color(t, fg), color(t, bg));
          assert.ok(ratio >= min, `${label}: ${fg} on ${bg} is ${ratio.toFixed(2)}, needs ${min}`);
        };
        pair('ui-ink-strong', 'ui-canvas', 7);
        pair('ui-ink-strong', 'ui-surface', 7);
        pair('ui-ink', 'ui-surface', 4.5);
        pair('ui-muted-strong', 'ui-surface', dark ? 4.5 : 4.3);
        pair('ui-muted-strong', 'ui-canvas', 4);
        pair('ui-on-inverse', 'ui-inverse', 7);
        // Accent fills carry bold uppercase labels: large-text AA.
        pair('brand-on-primary', 'brand-primary', 3);
        // Grammar headers never sit inside the review tone.
        if (!review) pair('brand-on-band', 'brand-band', 4.5);
        pair('brand-primary-deep', 'brand-primary-wash', dark ? 4.5 : 4);
        pair('brand-primary', 'ui-surface', 1.95); // fills and progress, not text
        pair('feedback-warning-ink', 'feedback-warning-surface', 4.5);
        pair('feedback-on-warning', 'feedback-warning', 4.5);
        // Coloured text is checked in dark; light keeps today's edge shades.
        if (dark) {
          for (const text of ['brand-primary', 'feedback-success', 'feedback-danger', 'feedback-warning', 'palette-purple', 'palette-teal', 'palette-pink']) {
            pair(`${text}-text`, 'ui-surface', 4.5);
          }
        }
        // White labels on saturated fills (bold, large); light keeps today's values.
        for (const fill of ['feedback-success', 'feedback-danger']) pair('ui-on-solid', fill, dark ? 3 : 2.5);
        pair('feedback-danger', 'ui-canvas', dark ? 4 : 3);
        for (const tone of [1, 2, 3, 4, 5]) pair(`tone-${tone}`, 'ui-surface', 4.5);
        for (const face of ['brand-primary', 'feedback-success', 'feedback-danger', 'feedback-warning']) {
          assert.ok(luminance(color(t, `${face}-edge`)) < luminance(color(t, face)), `${label}: ${face}-edge is darker than ${face}`);
        }
        assert.ok(luminance(color(t, 'ui-surface')) !== luminance(color(t, 'ui-canvas')), `${label}: surface separates from canvas`);
      });
    }
  }
  test(`${dark ? 'dark' : 'light'}: every book keeps its own accent`, () => {
    assert.equal(new Set(BOOKS.map((book) => color(context(book, dark, false), 'brand-primary'))).size, BOOKS.length);
  });
}

test('dark surfaces rise in lightness: canvas < surface < surface-hover', () => {
  const t = context(1, true, false);
  assert.ok(luminance(color(t, 'ui-canvas')) < luminance(color(t, 'ui-surface')));
  assert.ok(luminance(color(t, 'ui-surface')) < luminance(color(t, 'ui-surface-hover')));
});

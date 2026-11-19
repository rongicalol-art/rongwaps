import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActionButton } from '../../src/lib/widgets/ActionButton';

/** The <button> element's class list and the moving face's (the span with the label). */
function layers(className: string) {
  const html = renderToStaticMarkup(createElement(ActionButton, { className, size: 'sm' }, 'Add friend'));
  const button = /<button[^>]*class="([^"]*)"/.exec(html)![1].split(' ');
  const face = [...html.matchAll(/<span[^>]*class="([^"]*)"/g)].map(match => match[1].split(' ')).find(list => list.includes('relative'))!;
  return { button, face };
}

test('outer spacing and hiding move the whole button, so its edge never shows apart from its face', () => {
  const { button, face } = layers('mt-3 sm:mb-2 mx-auto max-w-md invisible normal-case gap-2');
  for (const outer of ['mt-3', 'sm:mb-2', 'mx-auto', 'max-w-md', 'invisible']) {
    assert.ok(button.includes(outer), `${outer} on the button`);
    assert.ok(!face.includes(outer), `${outer} not on the face`);
  }
  for (const inner of ['normal-case', 'gap-2']) assert.ok(face.includes(inner), `${inner} stays on the face`);
  assert.ok(face.some(name => name.startsWith('mb-[length:var(--depth')), 'the face keeps its depth margin');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { claimReviewTone } from '../../src/hooks/useReviewTone';

test('review tone claims survive overlapping owners and delayed, skipped transition callbacks', async () => {
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const dataset: { tone?: string } = {};
  const classes = new Set<string>();
  const queued: Array<{ apply: () => void; finish: () => void; skipped: boolean }> = [];
  let reduced = false;
  const doc = {
    hidden: false,
    documentElement: { dataset, classList: { add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name) } },
    startViewTransition: undefined as undefined | ((apply: () => void) => object),
  };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { matchMedia: () => ({ matches: reduced }) } });
  const releases: Array<() => void> = [];
  const claim = () => { const release = claimReviewTone(); releases.push(release); return release; };
  try {
    const first = claim();
    const second = claim();
    assert.equal(dataset.tone, 'review', 'unsupported browsers apply immediately');
    first(); first();
    assert.equal(dataset.tone, 'review', 'an owner releasing twice cannot drop another owner');
    second();
    assert.equal(dataset.tone, undefined);

    doc.startViewTransition = (apply) => {
      let finish!: () => void;
      const finished = new Promise<void>((resolve) => { finish = resolve; });
      const entry = { apply, finish, skipped: false };
      queued.push(entry);
      return { ready: Promise.resolve(), finished, skipTransition: () => { entry.skipped = true; } };
    };
    const third = claim();
    const fourth = claim();
    assert.equal(queued.length, 1, 'additional owners do not create snapshots');
    third(); fourth();
    assert.equal(queued.length, 2);
    assert.ok(queued[0].skipped);
    queued[0].apply();
    assert.equal(dataset.tone, undefined, 'a delayed old callback cannot restore released honey');
    const fifth = claim();
    assert.ok(queued[1].skipped);
    queued[1].apply();
    assert.equal(dataset.tone, 'review', 'a delayed release cannot clear a newer owner');
    queued[0].finish(); queued[1].finish();
    await Promise.resolve();
    assert.ok(classes.has('review-tone-transition'), 'old cleanup cannot remove a new transition class');
    queued[2].apply(); queued[2].finish();
    await Promise.resolve();
    assert.ok(!classes.has('review-tone-transition'));
    reduced = true;
    fifth();
    assert.equal(dataset.tone, undefined);
    const sixth = claim(); sixth();
    assert.equal(queued.length, 3, 'reduced motion creates no snapshots');
    reduced = false;
    doc.hidden = true;
    const seventh = claim(); seventh();
    assert.equal(queued.length, 3, 'hidden tabs create no snapshots');
  } finally {
    reduced = true;
    releases.forEach((release) => release());
    queued.forEach(({ finish }) => finish());
    await Promise.resolve();
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
    else Reflect.deleteProperty(globalThis, 'document');
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

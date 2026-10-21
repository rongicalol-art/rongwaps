import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchContentBlobUrl } from '../../src/services/staticContentService';

test('old book images are released while visible, shared images remain pinned', async (t) => {
  const fetch = globalThis.fetch;
  const create = URL.createObjectURL;
  const revoke = URL.revokeObjectURL;
  let downloads = 0;
  const revoked = new Set<string>();
  globalThis.fetch = async () => { downloads++; return new Response(new Blob(['page'])); };
  URL.revokeObjectURL = (url) => { revoked.add(url); revoke(url); };
  t.after(() => { globalThis.fetch = fetch; URL.createObjectURL = create; URL.revokeObjectURL = revoke; });
  const first = new AbortController();
  const second = new AbortController();
  const pinned = await fetchContentBlobUrl('/data/performance-visible.webp', first.signal);
  assert.equal(await fetchContentBlobUrl('/data/performance-visible.webp', second.signal), pinned);
  assert.equal(downloads, 1, 'shared images download once');
  first.abort();
  const old = await fetchContentBlobUrl('/data/performance-old.webp');
  for (let i = 0; i < 24; i++) await fetchContentBlobUrl(`/data/performance-page-${i}.webp`);
  assert.ok(revoked.has(old));
  assert.ok(!revoked.has(pinned), 'one remaining view keeps the resource alive');
  second.abort();
  await fetchContentBlobUrl('/data/performance-last.webp');
  assert.ok(revoked.has(pinned), 'the last view releases its lease');
});

test('an immediately retried image never inherits the cancelled request', async (t) => {
  const fetch = globalThis.fetch;
  const replies: Array<(response: Response) => void> = [];
  globalThis.fetch = async (_input, options) => new Promise<Response>((resolve, reject) => {
    replies.push(resolve);
    options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });
  t.after(() => { globalThis.fetch = fetch; });
  const controller = new AbortController();
  const cancelled = fetchContentBlobUrl('/data/performance-cancelled.webp', controller.signal);
  controller.abort();
  const retry = fetchContentBlobUrl('/data/performance-cancelled.webp');
  // Both requests have reached the asynchronous auth/header boundary.
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(replies.length, 2);
  replies[1](new Response(new Blob(['retry'])));
  assert.ok((await retry).startsWith('blob:'));
  await assert.rejects(cancelled, { name: 'AbortError' });
});

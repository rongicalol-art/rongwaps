import { expect, test } from '@playwright/test';

import { createLearner, deviceFor, openHome, signIn } from './support/learner.ts';
import { sessionStorageKey } from './support/stack.ts';

// Journey 1: only school accounts get in, and lesson content stays locked.

test('a school learner signs in and reaches their books', async ({ browser }) => {
  const session = await signIn(await createLearner({ school: true }));
  const context = await deviceFor(browser, session);
  const page = await context.newPage();
  await openHome(page);
  await expect(page.getByRole('heading', { name: 'Modern Chinese 1', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Lesson 1:/ })).toBeVisible();

  const withToken = await page.request.get('/data/vocabulary/book-1.json', { headers: { Authorization: `Bearer ${session.access_token}` } });
  expect(withToken.status()).toBe(200);
  await context.close();
});

test('an account outside the school is signed straight back out', async ({ browser }) => {
  const session = await signIn(await createLearner({ school: false }));
  const context = await deviceFor(browser, session);
  const page = await context.newPage();
  await page.goto('/');
  // The database refuses the account; the app drops the session instead of showing lessons.
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), sessionStorageKey())).toBeNull();
  await expect(page.getByRole('button', { name: /^Lesson 1:/ })).toHaveCount(0);

  const withToken = await page.request.get('/data/vocabulary/book-1.json', { headers: { Authorization: `Bearer ${session.access_token}` } });
  expect([401, 403], 'the server refuses the outsider’s token').toContain(withToken.status());
  await context.close();
});

test('lesson content needs a session', async ({ request }) => {
  for (const path of ['/data/vocabulary/book-1.json', '/data/grammar/book-1.json', '/data/dictionary/manifest.json']) {
    expect((await request.get(path)).status(), path).toBe(401);
  }
});

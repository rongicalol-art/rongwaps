import { expect, test, type Page } from '@playwright/test';

import { createLearner, deviceFor, grammarProgress, openLessonOne, savedCounts, signIn } from './support/learner.ts';

// Journeys 2 and 3: what a learner studies reaches their account, survives a
// dropped connection, and shows up on their other device.

async function answerCard(page: Page, answer: 'Got it' | 'Again') {
  const practice = page.getByRole('dialog', { name: 'Flashcards practice' });
  await practice.getByRole('button', { name: 'Flip card' }).click();
  await practice.getByRole('button', { name: answer, exact: true }).click();
}

test('vocabulary reviews save, survive going offline, and appear on a second device', async ({ browser }) => {
  const learner = await createLearner({ school: true });
  const session = await signIn(learner);

  const phone = await deviceFor(browser, session);
  const page = await phone.newPage();
  await openLessonOne(page);
  await expect(page.getByRole('button', { name: /^Vocabulary 0 of \d+ words/ })).toBeVisible();
  await page.getByRole('dialog', { name: /^Lesson 1:/ }).getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Flashcards practice' }).getByText(/^1 \/ \d+$/)).toBeVisible();

  await answerCard(page, 'Got it');
  await expect.poll(() => savedCounts(learner), { timeout: 30_000 }).toMatchObject({ cards: 1, events: 1 });

  // The connection drops mid-session: the answer waits on the device, then uploads once.
  await phone.setOffline(true);
  await answerCard(page, 'Again');
  await page.waitForTimeout(3_000);
  expect(savedCounts(learner)).toMatchObject({ cards: 1, events: 1 });
  await phone.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect.poll(() => savedCounts(learner), { timeout: 45_000 }).toEqual({ cards: 2, events: 2 });

  // A second device with nothing stored locally loads the same progress.
  const laptop = await deviceFor(browser, session);
  const second = await laptop.newPage();
  await openLessonOne(second);
  await expect(second.getByRole('button', { name: /^Vocabulary 1 of \d+ words/ })).toBeVisible();

  // Reloading the first device neither loses nor duplicates anything.
  await page.reload();
  await page.waitForLoadState('networkidle');
  expect(savedCounts(learner)).toEqual({ cards: 2, events: 2 });
  await phone.close();
  await laptop.close();
});

test('a finished grammar page is saved to the account', async ({ browser }) => {
  const learner = await createLearner({ school: true });
  const device = await deviceFor(browser, await signIn(learner));
  const page = await device.newPage();
  await openLessonOne(page);
  const lesson = page.getByRole('dialog', { name: /^Lesson 1:/ });
  await lesson.getByRole('button', { name: /^Grammar/ }).click();
  await lesson.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Introduce Someone/ })).toBeVisible();

  // Read the page, then go through its exercise (skipping is allowed) to finish it.
  await page.keyboard.press('ArrowRight');
  for (let step = 0; step < 25 && !(grammarProgress(learner).completedPageIds?.length); step += 1) {
    const skip = page.getByRole('button', { name: 'Skip', exact: true });
    const next = page.getByRole('button', { name: /^(Continue|Next|Finish grammar|Done)$/ });
    if (await skip.isVisible()) await skip.click();
    else if (await next.first().isVisible()) await next.first().click();
    else await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(800);
  }
  await expect.poll(() => grammarProgress(learner).completedPageIds?.length ?? 0, { timeout: 30_000 }).toBeGreaterThan(0);
  expect(grammarProgress(learner).startedPartIds).toContain('B1L01-P01-D01');
  await device.close();
});

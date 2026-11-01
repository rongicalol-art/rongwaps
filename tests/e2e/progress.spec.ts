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

  // Read the page, then answer its exercise like a learner who guesses: tap
  // words until each item checks itself (a second miss fills in the answer),
  // then Continue. Older exercise kinds offer Skip instead.
  await page.keyboard.press('ArrowRight');
  for (let step = 0; step < 150 && !(grammarProgress(learner).completedPageIds?.length); step += 1) {
    const done = page.getByRole('button', { name: 'Continue', exact: true }).filter({ visible: true }).first();
    const choices = page.getByRole('group', { name: 'Word choices' }).getByRole('button', { name: /^Use /, disabled: false }).filter({ visible: true });
    const skip = page.getByRole('button', { name: 'Skip', exact: true }).filter({ visible: true }).first();
    if (await done.isVisible().catch(() => false)) await done.click({ timeout: 5_000 });
    else if (await choices.first().isVisible().catch(() => false)) await choices.first().click({ timeout: 5_000 });
    else if (await skip.isVisible().catch(() => false)) await skip.click();
    else await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(250);
  }
  await expect.poll(() => grammarProgress(learner).completedPageIds?.length ?? 0, { timeout: 30_000 }).toBeGreaterThan(0);
  expect(grammarProgress(learner).startedPartIds).toContain('B1L01-P01-D01');
  await device.close();
});

test('flashcards still open when recordings fail to download', async ({ browser }) => {
  const device = await deviceFor(browser, await signIn(await createLearner({ school: true })));
  // The audio server is down: every recording request fails.
  await device.route(/\.(?:mp3|m4a|opus)(?:\?|$)/, (route) => route.fulfill({ status: 503, body: '' }));
  const page = await device.newPage();
  await openLessonOne(page);
  await page.getByRole('dialog', { name: /^Lesson 1:/ }).getByRole('button', { name: 'Start', exact: true }).click();
  const practice = page.getByRole('dialog', { name: 'Flashcards practice' });
  await expect(practice.getByText(/^1 \/ \d+$/)).toBeVisible();
  await expect(page.getByText('Study couldn’t load')).toHaveCount(0);
  await practice.getByRole('button', { name: 'Flip card' }).click();
  await expect(practice.getByRole('button', { name: 'Got it', exact: true })).toBeVisible();
  await device.close();
});


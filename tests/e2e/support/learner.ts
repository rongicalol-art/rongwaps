import type { Browser, BrowserContext, Page } from '@playwright/test';
import path from 'node:path';

import { createLearner, sessionStorageKey, signIn, sql, type Learner, type Session } from './stack.ts';

export { createLearner, signIn, sql, type Learner, type Session };

const SILENCE = path.resolve(import.meta.dirname, '../fixtures/silence.mp3');

/**
 * A browser "device" already signed in as `session`, the way Supabase JS
 * restores a session on load. Recordings come from a local silent clip: these
 * journeys test saving and access, not the audio CDN (which only allows the
 * real site's origin).
 */
export async function deviceFor(browser: Browser, session: Session, options: Parameters<Browser['newContext']>[0] = {}): Promise<BrowserContext> {
  const context = await browser.newContext(options);
  await context.addInitScript(([key, value]) => {
    try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
  }, [sessionStorageKey(), JSON.stringify(session)] as const);
  await context.route(/\.(?:mp3|m4a|opus)(?:\?|$)/, (route) => route.fulfill({
    status: 200,
    path: SILENCE,
    headers: { 'content-type': 'audio/mpeg', 'access-control-allow-origin': '*' },
  }));
  return context;
}

/** Opens the home page and gets past one-time notices. */
export async function openHome(page: Page): Promise<void> {
  await page.goto('/');
  const later = page.getByRole('button', { name: 'Later' });
  await later.click({ timeout: 8_000 }).catch(() => { /* no notice this time */ });
}

/** Opens the Lesson 1 window from home (Lesson 1 is selected by default). */
export async function openLessonOne(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: /^Start with/ }).click();
  await page.getByRole('dialog', { name: /^Lesson 1:/ }).waitFor();
}

/** Rows the database holds for a learner (counts only). */
export function savedCounts(learner: Learner): { cards: number; events: number } {
  const [cards, events] = sql(`SELECT (SELECT count(*) FROM public.user_card_progress WHERE user_id = '${learner.id}'), (SELECT count(*) FROM public.user_review_events WHERE user_id = '${learner.id}');`).split('|').map(Number);
  return { cards, events };
}

export function grammarProgress(learner: Learner): { completedPageIds?: string[]; startedPartIds?: string[] } {
  const raw = sql(`SELECT coalesce(settings->'grammarProgress', '{}'::jsonb) FROM public.user_profiles WHERE id = '${learner.id}';`);
  return raw ? JSON.parse(raw) : {};
}

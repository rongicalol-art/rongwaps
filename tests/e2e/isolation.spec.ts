import { expect, test } from '@playwright/test';

import { createLearner, signIn, sql } from './support/learner.ts';
import { rest } from './support/stack.ts';

// Journey 1b: with the public key and their own token, a learner can never
// see or change another learner's progress (the same calls a modified app could make).

test('learners cannot read or write each other’s progress', async () => {
  const owner = await createLearner({ school: true });
  const other = await signIn(await createLearner({ school: true }));
  sql(`INSERT INTO public.user_card_progress (user_id, card_id) VALUES ('${owner.id}', 'B1L01-1-01');
       INSERT INTO public.user_review_events (user_id, event_id, card_id, reviewed_at, payload)
       VALUES ('${owner.id}', gen_random_uuid(), 'B1L01-1-01', now(), '{}'::jsonb);`);

  for (const table of ['user_card_progress', 'user_review_events']) {
    const response = await rest(other, `/${table}?user_id=eq.${owner.id}&select=user_id`);
    expect(response.status, table).toBe(200);
    expect(await response.json(), `${table} leaks another learner's rows`).toEqual([]);
  }
  const profile = await rest(other, `/user_profiles?id=eq.${owner.id}&select=id,settings`);
  expect(await profile.json()).toEqual([]);

  const write = await rest(other, '/user_card_progress', { method: 'POST', body: JSON.stringify({ user_id: owner.id, card_id: 'B1L01-1-02' }) });
  expect(write.status, 'direct writes are closed').toBeGreaterThanOrEqual(400);
  expect(sql(`SELECT count(*) FROM public.user_card_progress WHERE user_id = '${owner.id}'`)).toBe('1');
});

test('signed-out callers get no learner data', async () => {
  const owner = await createLearner({ school: true });
  sql(`INSERT INTO public.user_card_progress (user_id, card_id) VALUES ('${owner.id}', 'B1L01-1-01');`);
  const response = await rest(null, `/user_card_progress?user_id=eq.${owner.id}&select=user_id`);
  const body = response.ok ? await response.json() : [];
  expect(body).toEqual([]);
});

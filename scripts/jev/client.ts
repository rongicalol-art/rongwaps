/**
 * Shared Jev (TypeSafe System One) client for repo tooling.
 *
 * Jev judges only: callers send state plus typed questions and receive
 * structured answers. The key is read from TYPESAFE_API_KEY
 * (`.env.memory-hooks.local`, scripts only — never ship it to the client).
 * The SDK handles 429/529 retries with backoff and honors Retry-After.
 *
 * Model selection: JEV_MODEL overrides MEMORY_HOOK_JEV_MODEL overrides the
 * pinned `jev-1.13.0`. Pin the versioned ID whenever thresholds were tuned
 * against it; `jev-latest` moves without a change on our side.
 *
 * `tsx scripts/jev/client.ts --check` lists the account's models and makes one
 * tiny call, printing the resolved model version.
 */

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import {
  TypeSafeClient,
  noul,
  type EntryType,
  type Questions,
  type SystemOneResult,
} from '@typesafe-ai/sdk';

dotenv.config({ path: resolve(import.meta.dirname, '../../.env'), quiet: true });
dotenv.config({
  path: resolve(import.meta.dirname, '../../.env.memory-hooks.local'),
  quiet: true,
  override: true,
});

export const JEV_PINNED_MODEL = 'jev-1.13.0';
export const JEV_DEFAULT_MODEL = process.env.JEV_MODEL ?? process.env.MEMORY_HOOK_JEV_MODEL ?? JEV_PINNED_MODEL;

let sharedClient: TypeSafeClient | null = null;

export function getJevClient(): TypeSafeClient {
  if (!process.env.TYPESAFE_API_KEY) {
    throw new Error(
      'TYPESAFE_API_KEY is not set. Add it to .env.memory-hooks.local (never commit it) before running Jev tools.',
    );
  }
  sharedClient ??= new TypeSafeClient();
  return sharedClient;
}

export async function askJev<const Q extends Questions>(
  state: EntryType,
  questions: Q,
  model: string = JEV_DEFAULT_MODEL,
): Promise<SystemOneResult<Q>> {
  const result = await getJevClient().systemOne({ state, model, questions });
  console.log(`[jev] ${result.model} · in ${result.usage.input_tokens} · out ${result.usage.output_tokens} tokens`);
  return result;
}

export type RawAnswers = Record<string, unknown>;

export function noulValue(answers: RawAnswers, key: string): number {
  const answer = answers[key] as { noul?: number } | undefined;
  return typeof answer?.noul === 'number' ? answer.noul : 0;
}

export function scoreValue(answers: RawAnswers, key: string): number {
  const answer = answers[key] as { score?: number } | undefined;
  return typeof answer?.score === 'number' ? answer.score : 0;
}

export function choiceValue<T extends string = string>(answers: RawAnswers, key: string): T | null {
  const answer = answers[key] as { choice?: T } | undefined;
  return answer?.choice ?? null;
}

export async function runCheck(): Promise<void> {
  const client = getJevClient();
  const models = await client.models.list();
  const result = await askJev('The sky is blue.', {
    check: noul('Is the sky blue?', {
      true: 'The statement matches the state.',
      false: 'It does not.',
    }),
  });
  console.log(JSON.stringify({
    models,
    resolvedModel: result.model,
    check: result.answers.check,
  }, null, 2));
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entry && process.argv.includes('--check')) {
  runCheck().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

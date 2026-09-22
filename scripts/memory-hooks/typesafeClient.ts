/**
 * Thin wrapper around the official TypeSafe JS SDK for Jev judgments.
 *
 * Jev judges only; it never writes hook text. The key is read from
 * TYPESAFE_API_KEY (`.env.memory-hooks.local`, scripts only). The SDK handles
 * 429/529 retries with backoff and honors Retry-After.
 *
 * `--check` lists the account's models and makes one tiny call, printing the
 * resolved model version so calibration can pin it.
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

export const JEV_DEFAULT_MODEL = process.env.MEMORY_HOOK_JEV_MODEL ?? 'jev-latest';

let sharedClient: TypeSafeClient | null = null;

export function getJevClient(): TypeSafeClient {
  if (!process.env.TYPESAFE_API_KEY) {
    throw new Error(
      'TYPESAFE_API_KEY is not set. Add it to .env.memory-hooks.local (never commit it) before running Jev reviews.',
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

async function check() {
  const client = getJevClient();
  const models = await client.models.list();
  const result = await askJev('The sky is blue.', {
    check: noul('Is the sky blue?', { true: 'The statement matches the state.', false: 'It does not.' }),
  });
  console.log(JSON.stringify({
    models,
    resolvedModel: result.model,
    check: result.answers.check,
  }, null, 2));
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entry && process.argv.includes('--check')) {
  check().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

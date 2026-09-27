/**
 * Compatibility shim: the shared Jev client now lives in `scripts/jev/client.ts`.
 * Memory-hook scripts keep importing from here so their call sites stay stable.
 */

import { pathToFileURL } from 'node:url';
import { runCheck } from '../jev/client';

export {
  JEV_DEFAULT_MODEL,
  JEV_PINNED_MODEL,
  askJev,
  choiceValue,
  getJevClient,
  noulValue,
  scoreValue,
  type RawAnswers,
} from '../jev/client';

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entry && process.argv.includes('--check')) {
  runCheck().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

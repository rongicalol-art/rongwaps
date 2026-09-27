/**
 * Server-owned Jev (TypeSafe) client for learner-facing grading.
 *
 * Calls the TypeSafe HTTP API directly so the production server keeps its
 * dependency surface unchanged (no SDK import at runtime). Reads process.env
 * only, returns a typed outcome, and leaves HTTP status mapping to the route.
 *
 * A learner answer passes only when it is semantically equivalent to the
 * expected answer AND grammatical AND natural — leniency never rewards wrong
 * grammar in a language course.
 */

const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
const DEFAULT_MODEL = 'jev-1.13.0';
const TIMEOUT_MS = 10_000;
const MAX_FIELD_LENGTH = 300;
const MAX_ALTERNATIVES = 6;

export const GRADE_THRESHOLDS = { meaning: 0.7, grammar: 0.6, natural: 0.5 } as const;

export interface GradeRequest {
  reference: string;
  answer: string;
  accepted: string[];
}

export interface GradeChecks {
  meaning: number;
  grammar: number;
  natural: number;
}

export interface GradeResult {
  pass: boolean;
  checks: GradeChecks;
  model: string;
}

export type GradeOutcome =
  | { status: 200; result: GradeResult }
  | { status: 400; error: string }
  | { status: 502; error: string }
  | { status: 503; error: 'jev-unconfigured' };

export function isJevConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.TYPESAFE_API_KEY?.trim());
}

export function parseGradeRequest(body: unknown): { ok: true; value: GradeRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Body must be a JSON object.' };
  }
  const record = body as Record<string, unknown>;
  const read = (key: string): string => (typeof record[key] === 'string' ? (record[key] as string).trim() : '');
  const reference = read('reference');
  const answer = read('answer');
  if (!reference || !answer) return { ok: false, error: 'reference and answer are required.' };
  if (reference.length > MAX_FIELD_LENGTH || answer.length > MAX_FIELD_LENGTH) {
    return { ok: false, error: `reference and answer must be at most ${MAX_FIELD_LENGTH} characters.` };
  }
  const accepted = Array.isArray(record.accepted)
    ? record.accepted
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0 && entry.length <= MAX_FIELD_LENGTH)
        .slice(0, MAX_ALTERNATIVES)
    : [];
  return { ok: true, value: { reference, answer, accepted } };
}

export function buildGradePayload(request: GradeRequest, model: string = DEFAULT_MODEL) {
  return {
    model,
    state: {
      expected: {
        reference: request.reference,
        also_accepted: request.accepted,
      },
      learner_answer: request.answer,
    },
    questions: {
      meaning: {
        type: 'noul',
        instructions:
          'Does `learner_answer` express the same meaning as `expected.reference` or any entry in `expected.also_accepted`? Ignore punctuation, spacing, and traditional/simplified script differences. Missing, added, or altered meaning makes this false.',
        criteria: {
          true: 'Same meaning as the expected answer.',
          false: 'Different, missing, or altered meaning.',
        },
      },
      grammar: {
        type: 'noul',
        instructions:
          'Is `learner_answer` grammatically well-formed Chinese? Wrong word order, missing or wrong particles, and non-Chinese text make this false. Traditional and simplified script are both acceptable.',
        criteria: {
          true: 'Grammatically well-formed.',
          false: 'Contains a grammatical error.',
        },
      },
      natural: {
        type: 'noul',
        instructions:
          'Would a native speaker find `learner_answer` natural word choice and phrasing for this beginner course answer, ignoring punctuation?',
        criteria: {
          true: 'Natural phrasing.',
          false: 'Awkward or unnatural phrasing.',
        },
      },
    },
  };
}

interface JevHttpResponse {
  model?: string;
  answers?: Record<string, { noul?: number }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

function readProbability(answers: JevHttpResponse['answers'], key: string): number {
  const value = answers?.[key]?.noul;
  return typeof value === 'number' ? value : 0;
}

export async function gradeGrammarAnswer(
  body: unknown,
  deps: { fetchImpl?: typeof fetch; env?: NodeJS.ProcessEnv; model?: string } = {},
): Promise<GradeOutcome> {
  const env = deps.env ?? process.env;
  const apiKey = env.TYPESAFE_API_KEY?.trim();
  if (!apiKey) return { status: 503, error: 'jev-unconfigured' };

  const parsed = parseGradeRequest(body);
  if (!parsed.ok) return { status: 400, error: parsed.error };

  const request = deps.fetchImpl ?? fetch;
  try {
    const response = await request(JEV_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildGradePayload(parsed.value, deps.model ?? env.TYPESAFE_MODEL ?? DEFAULT_MODEL)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return { status: 502, error: `jev-http-${response.status}` };

    const payload = (await response.json()) as JevHttpResponse;
    if (!payload || typeof payload !== 'object' || !payload.answers) {
      return { status: 502, error: 'jev-malformed-response' };
    }
    const checks: GradeChecks = {
      meaning: readProbability(payload.answers, 'meaning'),
      grammar: readProbability(payload.answers, 'grammar'),
      natural: readProbability(payload.answers, 'natural'),
    };
    const pass = checks.meaning >= GRADE_THRESHOLDS.meaning
      && checks.grammar >= GRADE_THRESHOLDS.grammar
      && checks.natural >= GRADE_THRESHOLDS.natural;
    console.log(`[jev-grade] ${payload.model ?? DEFAULT_MODEL} · in ${payload.usage?.input_tokens ?? 0} · out ${payload.usage?.output_tokens ?? 0} tokens`);
    return { status: 200, result: { pass, checks, model: payload.model ?? DEFAULT_MODEL } };
  } catch {
    return { status: 502, error: 'jev-request-failed' };
  }
}

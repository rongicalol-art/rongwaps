import { authService } from './authService';

/**
 * Semantic grading for free-text answers, backed by the server's Jev endpoint.
 * Returns null on any failure (unconfigured server, guest session, network,
 * rate limit, timeout) so callers keep their exact-match fallback.
 */

export interface AnswerGrading {
  pass: boolean;
  checks: { meaning: number; grammar: number; natural: number };
  model: string;
}

export interface GradeAnswerInput {
  reference: string;
  answer: string;
  accepted?: string[];
}

export interface GradeDeps {
  getToken?: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}

export async function gradeGrammarAnswer(input: GradeAnswerInput, deps: GradeDeps = {}): Promise<AnswerGrading | null> {
  try {
    const token = await (deps.getToken ?? authService.getAccessToken)();
    if (!token) return null;
    const request = deps.fetchImpl ?? fetch;
    const response = await request('/api/jev/grade-answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as Partial<AnswerGrading>;
    if (typeof payload?.pass !== 'boolean' || !payload.checks) return null;
    return {
      pass: payload.pass,
      checks: payload.checks,
      model: payload.model ?? '',
    };
  } catch {
    return null;
  }
}

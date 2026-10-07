import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildGradePayload,
  gradeGrammarAnswer,
  GRADE_THRESHOLDS,
  isJevConfigured,
  parseGradeRequest,
} from '../../server/jevClient';
import { gradeGrammarAnswer as gradeFromClient } from '../../src/services/answerGradingService';

const GOOD_BODY = { reference: '我在家。', answer: '我在家' };

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('parseGradeRequest validates and trims the grading input', () => {
  assert.equal(parseGradeRequest(null).ok, false);
  assert.equal(parseGradeRequest('text').ok, false);
  assert.equal(parseGradeRequest({}).ok, false);
  assert.equal(parseGradeRequest({ reference: 'a', answer: '' }).ok, false);
  assert.equal(parseGradeRequest({ reference: 'a'.repeat(301), answer: 'b' }).ok, false);

  const parsed = parseGradeRequest({
    reference: ' 我在家。 ',
    answer: '我在家',
    accepted: [' 我在家裡 ', 42, '', 'x'.repeat(301)],
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.reference, '我在家。');
  assert.equal(parsed.value.answer, '我在家');
  assert.deepEqual(parsed.value.accepted, ['我在家裡']);
});

test('buildGradePayload sends expected, learner answer, and the three checks', () => {
  const payload = buildGradePayload({ reference: '我在家。', answer: '我在家', accepted: ['我在家裡'] }, 'jev-test');
  assert.equal(payload.model, 'jev-test');
  assert.deepEqual(payload.state, {
    expected: { reference: '我在家。', also_accepted: ['我在家裡'] },
      learner_answer: '我在家',
  });
  assert.deepEqual(Object.keys(payload.questions), ['meaning', 'grammar', 'natural']);
  assert.equal(payload.questions.meaning.type, 'noul');
});

test('gradeGrammarAnswer returns 503 when TypeSafe is not configured', async () => {
  const outcome = await gradeGrammarAnswer(GOOD_BODY, { env: {} });
  assert.deepEqual(outcome, { status: 503, error: 'jev-unconfigured' });
});

test('gradeGrammarAnswer returns 400 for invalid input before calling upstream', async () => {
  let called = false;
  const outcome = await gradeGrammarAnswer({ reference: '', answer: '' }, {
    env: { TYPESAFE_API_KEY: 'key' },
    fetchImpl: async () => {
      called = true;
      return jsonResponse({});
    },
  });
  assert.equal(outcome.status, 400);
  assert.equal(called, false);
});

test('gradeGrammarAnswer passes only when meaning, grammar, and natural clear thresholds', async () => {
  const responses: Array<Record<string, { noul: number }>> = [
    { meaning: { noul: 0.9 }, grammar: { noul: 0.8 }, natural: { noul: 0.7 } },
    { meaning: { noul: 0.9 }, grammar: { noul: 0.2 }, natural: { noul: 0.7 } },
    { meaning: { noul: 0.1 }, grammar: { noul: 0.9 }, natural: { noul: 0.9 } },
  ];
  const outcomes = [];
  for (const answers of responses) {
    outcomes.push(await gradeGrammarAnswer(GOOD_BODY, {
      env: { TYPESAFE_API_KEY: 'key' },
      fetchImpl: async () => jsonResponse({ model: 'jev-1.13.0', answers, usage: { input_tokens: 10, output_tokens: 5 } }),
    }));
  }
  assert.equal(outcomes[0].status, 200);
  assert.equal(outcomes[0].status === 200 && outcomes[0].result.pass, true);
  assert.equal(outcomes[1].status === 200 && outcomes[1].result.pass, false);
  assert.equal(outcomes[2].status === 200 && outcomes[2].result.pass, false);
  assert.equal(GRADE_THRESHOLDS.meaning, 0.7);
});

test('gradeGrammarAnswer maps upstream and transport failures to 502', async () => {
  const upstreamError = await gradeGrammarAnswer(GOOD_BODY, {
    env: { TYPESAFE_API_KEY: 'key' },
    fetchImpl: async () => jsonResponse({ error: 'nope' }, 429),
  });
  assert.equal(upstreamError.status, 502);

  const malformed = await gradeGrammarAnswer(GOOD_BODY, {
    env: { TYPESAFE_API_KEY: 'key' },
    fetchImpl: async () => jsonResponse({ model: 'jev-1.13.0' }),
  });
  assert.equal(malformed.status, 502);

  const thrown = await gradeGrammarAnswer(GOOD_BODY, {
    env: { TYPESAFE_API_KEY: 'key' },
    fetchImpl: async () => {
      throw new Error('offline');
    },
  });
  assert.equal(thrown.status, 502);
});

test('isJevConfigured only accepts a non-empty key', () => {
  assert.equal(isJevConfigured({}), false);
  assert.equal(isJevConfigured({ TYPESAFE_API_KEY: '   ' }), false);
  assert.equal(isJevConfigured({ TYPESAFE_API_KEY: 'key' }), true);
});

test('client service sends the bearer token and parses the grading result', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const result = await gradeFromClient(
    { reference: '我在家。', answer: '我在家' },
    {
      getToken: async () => 'token-123',
      fetchImpl: (async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return jsonResponse({ pass: true, checks: { meaning: 0.9, grammar: 0.8, natural: 0.7 }, model: 'jev-1.13.0' });
      }) as typeof fetch,
    },
  );
  assert.equal(result?.pass, true);
  assert.equal(calls[0].url, '/api/jev/grade-answer');
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer token-123');
});

test('client service degrades to null without a token and on failures', async () => {
  const noToken = await gradeFromClient(
    { reference: 'a', answer: 'b' },
    { getToken: async () => null, fetchImpl: (async () => jsonResponse({})) as typeof fetch },
  );
  assert.equal(noToken, null);

  const rateLimited = await gradeFromClient(
    { reference: 'a', answer: 'b' },
    {
      getToken: async () => 'token',
      fetchImpl: (async () => jsonResponse({ error: 'slow down' }, 429)) as typeof fetch,
    },
  );
  assert.equal(rateLimited, null);

  const offline = await gradeFromClient(
    { reference: 'a', answer: 'b' },
    {
      getToken: async () => 'token',
      fetchImpl: (async () => {
        throw new Error('offline');
      }) as typeof fetch,
    },
  );
  assert.equal(offline, null);
});

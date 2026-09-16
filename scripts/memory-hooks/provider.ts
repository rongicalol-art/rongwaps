import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(import.meta.dirname, '../../.env'), quiet: true });
dotenv.config({
  path: resolve(import.meta.dirname, '../../.env.memory-hooks.local'),
  quiet: true,
  override: true,
});

const OPENCODE_SESSION_ID = randomUUID();

export interface ProviderConfig {
  provider: 'deepseek' | 'openrouter' | 'gemini' | 'opencode-go';
  url: string;
  apiKey: string;
  model: string;
}

function readOpenCodeKey(): string | null {
  if (process.env.OPENCODE_API_KEY) return process.env.OPENCODE_API_KEY;
  const authPath = process.env.OPENCODE_AUTH_PATH || resolve(homedir(), '.local/share/opencode/auth.json');
  try {
    const auth = JSON.parse(readFileSync(authPath, 'utf8')) as Record<string, { key?: string }>;
    return auth['opencode-go']?.key ?? auth.opencode?.key ?? null;
  } catch {
    return null;
  }
}

export function resolveProvider(): ProviderConfig {
  const preferred = process.env.MEMORY_HOOK_PROVIDER ?? '';
  const model = process.env.MEMORY_HOOK_MODEL;
  if (preferred === 'opencode-go') {
    const apiKey = readOpenCodeKey();
    if (apiKey) {
      return {
        provider: 'opencode-go',
        url: 'https://opencode.ai/zen/go/v1/chat/completions',
        apiKey,
        model: model || 'deepseek-v4.1-flash',
      };
    }
  }
  if (preferred === 'gemini' && process.env.GEMINI_API_KEY) {
    return {
      provider: 'gemini',
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-3.5-flash'}:generateContent`,
      apiKey: process.env.GEMINI_API_KEY,
      model: model || 'gemini-3.5-flash',
    };
  }
  if (preferred === 'deepseek' && process.env.DEEPSEEK_API_KEY) {
    return {
      provider: 'deepseek',
      url: 'https://api.deepseek.com/chat/completions',
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: model || 'deepseek-v4-flash',
    };
  }
  if (preferred === 'openrouter' && process.env.OPENROUTER_API_KEY) {
    return {
      provider: 'openrouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: process.env.OPENROUTER_API_KEY,
      model: model || 'deepseek/deepseek-v4-flash',
    };
  }
  throw new Error(`No usable memory-hook provider configured (MEMORY_HOOK_PROVIDER=${preferred || 'unset'}).`);
}

export async function generateJson(
  provider: ProviderConfig,
  system: string,
  prompt: string,
  maxOutputTokens = 800,
): Promise<string> {
  const isOpenAiCompatible = provider.provider !== 'gemini';
  // One explicitly-typed header map. Building it inside each request-literal
  // branch made the union carry `'x-goog-api-key'?: undefined`, which is not
  // assignable to `HeadersInit`.
  const headers: Record<string, string> = provider.provider === 'gemini'
    ? { 'Content-Type': 'application/json', 'x-goog-api-key': provider.apiKey }
    : {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
        ...(provider.provider === 'opencode-go'
          ? { 'x-opencode-session': OPENCODE_SESSION_ID, Connection: 'close' }
          : {}),
      };
  const request = provider.provider === 'gemini'
    ? {
        url: provider.url,
        headers,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    : {
        url: provider.url,
        headers,
        body: JSON.stringify({
          model: provider.model,
          temperature: 0,
          max_tokens: provider.provider === 'opencode-go' ? Math.max(maxOutputTokens, 1500) : maxOutputTokens,
          ...(provider.provider === 'deepseek' || provider.provider === 'opencode-go'
            ? { thinking: { type: 'disabled' } }
            : {}),
          ...(provider.provider === 'openrouter' ? { reasoning: { enabled: false } } : {}),
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
        }),
      };

  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: request.body,
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const message = `Model call failed with HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ''}`;
    const error = new Error(message) as Error & { status?: number; fatal?: boolean };
    error.status = response.status;
    error.fatal = /usage limit|spending cap|insufficient balance|quota|billing/i.test(body);
    throw error;
  }
  if (!isOpenAiCompatible) {
    const payload = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content ?? '';
}

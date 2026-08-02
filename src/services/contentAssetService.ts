import type { CharacterJson } from 'hanzi-writer';

const jsonCache = new Map<string, unknown>();
const jsonRequests = new Map<string, Promise<unknown>>();
const hanziRequests = new Map<string, Promise<CharacterJson>>();

const HANZI_DATA_SOURCES = [
  'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1',
  'https://unpkg.com/hanzi-writer-data@2.0.1',
  'https://raw.githubusercontent.com/chanind/hanzi-writer-data/master/data',
] as const;

export async function loadJsonAsset<T>(url: string): Promise<T> {
  const cached = jsonCache.get(url);
  if (cached !== undefined) return cached as T;

  const pending = jsonRequests.get(url);
  if (pending) return pending as Promise<T>;

  const request = fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Asset request failed (${response.status})`);
    }

    const data = await response.json() as T;
    jsonCache.set(url, data);
    return data;
  });

  jsonRequests.set(url, request);
  try {
    return await request;
  } finally {
    jsonRequests.delete(url);
  }
}

export function loadHanziCharacterData(character: string): Promise<CharacterJson> {
  const existing = hanziRequests.get(character);
  if (existing) return existing;

  const encodedCharacter = encodeURIComponent(character);
  const request = (async () => {
    let lastError: unknown;

    for (const source of HANZI_DATA_SOURCES) {
      try {
        return await loadJsonAsset<CharacterJson>(`${source}/${encodedCharacter}.json`);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Stroke data is unavailable for ${character}`);
  })();

  hanziRequests.set(character, request);
  request.finally(() => hanziRequests.delete(character)).catch(() => {});
  return request;
}

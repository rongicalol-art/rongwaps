import { createPackLoader } from './packLoader';
import { pronunciationKey, recordingLookupKey } from '../utils/pinyin/pronunciationMatching';

interface AudioManifest { schemaVersion: number; version: string; count: number; path: string }
export interface PronunciationAudioPack {
  schemaVersion: number;
  version: string;
  count: number;
  prefix: string;
  items: Record<string, string>;
  /** Reviewed complete words, never standalone syllables. */
  words?: Array<{ word: string; pinyin: string; audio: string }>;
}

/** Source-labelled tones only. Neutral clips are reference sounds; word audio demonstrates context. */
export function isPronunciationAudioPack(pack: PronunciationAudioPack): boolean {
  return pack?.schemaVersion === 1 && /^[a-f0-9]{16}$/.test(pack.version) && pack.prefix === 'pronunciation/cns-female-20250113/'
    && pack.items !== null && typeof pack.items === 'object' && !Array.isArray(pack.items)
    && pack.count > 0 && pack.count <= 1500 && Object.keys(pack.items).length === pack.count
    && Object.entries(pack.items).every(([key, file]) => pronunciationKey(key) === key
      && !key.includes(' ') && /[1-5]$/.test(key)
      && typeof file === 'string' && /^[a-z]+[1-5]-[a-f0-9]{12}\.mp3$/.test(file)
      && file.split('-')[0] === key.replace(/ü/g, 'v'))
    && (pack.words === undefined || (Array.isArray(pack.words) && pack.words.length <= 16
      && pack.words.every((entry) => typeof entry?.word === 'string' && /^[\u3400-\u9fff]+$/u.test(entry.word)
        && typeof entry.pinyin === 'string' && Boolean(pronunciationKey(entry.pinyin))
        && typeof entry.audio === 'string' && /^book-supplement\/qwen\/[A-Za-z0-9-]+-[a-f0-9]{12}\.mp3$/.test(entry.audio))
      && new Set(pack.words.map((entry) => recordingLookupKey(entry.word, entry.pinyin))).size === pack.words.length));
}

const loader = createPackLoader<AudioManifest, PronunciationAudioPack, Map<string, string>>({
  namespace: 'pronunciation-audio',
  manifestPath: '/data/pronunciation-audio/manifest.json',
  manifestLabel: 'pronunciation audio manifest',
  persistManifest: true,
  validateManifest: (m) => m?.schemaVersion === 1 && /^[a-f0-9]{16}$/.test(m.version)
    && m.count > 0 && m.count <= 1500 && m.path === `/data/pronunciation-audio/${m.version}.json`,
  getParts: (m) => [{ key: 0, path: m.path, count: m.count }],
  partPathPrefix: '/data/pronunciation-audio/',
  partCacheKeyKind: 'index',
  validatePack: (pack, part, manifest) => isPronunciationAudioPack(pack) && pack.count === part.count && pack.version === manifest.version,
  transform: (pack) => new Map([
    ...Object.entries(pack.items).map(([key, file]): [string, string] => [key, pack.prefix + file]),
    ...(pack.words ?? []).map((entry): [string, string] => [recordingLookupKey(entry.word, entry.pinyin)!, entry.audio]),
  ]),
  partLabel: () => 'pronunciation audio index',
});

/** Lazy, deduplicated metadata only; this never downloads or preloads audio. */
export async function getPronunciationAudioIndex(): Promise<Map<string, string>> {
  return await loader.loadPart(0) ?? new Map();
}

export async function getCharacterAudio(word: string, pinyin?: string): Promise<string | undefined> {
  if (!/^[\u3400-\u9fff]$/u.test(word)) return undefined;
  const key = pronunciationKey(pinyin);
  if (!key || key.includes(' ') || !/[1-5]$/.test(key)) return undefined;
  return (await getPronunciationAudioIndex()).get(key);
}

export async function getReviewedWordAudio(word: string, pinyin?: string): Promise<string | undefined> {
  const key = recordingLookupKey(word, pinyin);
  return key ? (await getPronunciationAudioIndex()).get(key) : undefined;
}

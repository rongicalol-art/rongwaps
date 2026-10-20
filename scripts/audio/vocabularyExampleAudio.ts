import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SentenceAudio } from '../../src/types/models';

interface VocabularyExampleAudioManifest {
  schemaVersion: number;
  examples: Record<string, {
    bookId: number;
    sourceCardId: string;
    traditional: string;
    audio?: SentenceAudio | null;
    alignment?: { score?: number };
  }>;
}

export function vocabularyExampleKey(sourceCardId: string, sentence: string): string {
  const han = [...sentence].filter((char) => /\p{Script=Han}/u.test(char)).join('');
  return sourceCardId && han ? `${sourceCardId}:${han}` : '';
}

export function loadVocabularyExampleAudio(): Map<string, SentenceAudio> {
  const filename = resolve(process.cwd(), 'content/audio/vocabulary_example_audio.json');
  if (!existsSync(filename)) {
    throw new Error('Missing content/audio/vocabulary_example_audio.json; generate and review it with alignVocabularyExampleAudio.py first.');
  }

  const manifest = JSON.parse(readFileSync(filename, 'utf8')) as VocabularyExampleAudioManifest;
  if (manifest.schemaVersion !== 1 || !manifest.examples || typeof manifest.examples !== 'object') {
    throw new Error('Invalid content/audio/vocabulary_example_audio.json manifest.');
  }

  const audio = new Map<string, SentenceAudio>();
  const scores = new Map<string, number>();
  for (const [exampleId, entry] of Object.entries(manifest.examples)) {
    if (!entry || typeof entry.sourceCardId !== 'string' || typeof entry.traditional !== 'string') {
      throw new Error(`Invalid vocabulary example audio assignment: ${exampleId}`);
    }
    if (entry.audio && (
      !['book', 'studio'].includes(entry.audio.voice)
      || typeof entry.audio.file !== 'string'
      || !entry.audio.file
      || typeof entry.audio.start !== 'number'
      || typeof entry.audio.end !== 'number'
      || !Number.isFinite(entry.audio.start)
      || !Number.isFinite(entry.audio.end)
      || entry.audio.start < 0
      || entry.audio.end <= entry.audio.start
      || (entry.audio.cache !== undefined && typeof entry.audio.cache !== 'boolean')
    )) {
      throw new Error(`Invalid recorded range in vocabulary example audio assignment: ${exampleId}`);
    }
    const key = vocabularyExampleKey(entry.sourceCardId, entry.traditional);
    if (!key || !entry.audio?.file) continue;
    const score = entry.alignment?.score ?? 0;
    if (!audio.has(key) || score > (scores.get(key) ?? -1)) {
      audio.set(key, entry.audio);
      scores.set(key, score);
    }
  }
  return audio;
}

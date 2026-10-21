import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

type SentenceAudio = {
  voice: 'book' | 'studio';
  file: string;
  start: number;
  end: number;
  cache?: boolean;
};

type SourceExample = { chinese: string };
type AudioEntry = {
  bookId: number;
  lessonId: number;
  sourceCardId: string;
  traditional: string;
  audio?: SentenceAudio | null;
  issue?: string;
  alignment: {
    score: number;
    alignedSyllables: number;
    syllableCount: number;
    track: string;
    trackSha256: string;
    driveFileId: string;
  };
};

const json = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const hanOnly = (sentence: string) => [...sentence].filter((char) => /\p{Script=Han}/u.test(char)).join('');

test('Books 1 and 3 have complete example coverage and only verified recorded ranges', () => {
  const audioManifest = json<{
    examples: Record<string, AudioEntry>;
    tracks: Record<string, { sha256: string; durationSec: number }>;
  }>(
    'content/audio/vocabulary_example_audio.json',
  );
  const book1Manifest = json<{ files: Array<{ file: string; sha256: string; durationSec: number }> }>(
    'content/audio/audio_manifest_book1.json',
  );
  const book3Index = json<{ vocabularyTracks: Array<{ file: string; id: string }> }>(
    'content/audio/audio_index_book3.json',
  );
  const book1Tracks = new Map(book1Manifest.files.map((track) => [track.file, track]));
  const book3Tracks = new Map(book3Index.vocabularyTracks.map((track) => [track.file, track]));
  let expectedCount = 0;

  for (const bookId of [1, 3]) {
    const source = json<Record<string, SourceExample>>(`content/vocabulary/book-${bookId}-examples.json`);
    const pack = json<{ items: Array<{ id: string; examples: string | null }> }>(
      `public/data/vocabulary/book-${bookId}.json`,
    );
    const packedItems = new Map(pack.items.map((item) => [item.id, item]));
    expectedCount += Object.keys(source).length;

    for (const [sourceCardId, sourceExample] of Object.entries(source)) {
      const sentenceKey = `${sourceCardId}:${hanOnly(sourceExample.chinese)}`;
      const matches = Object.values(audioManifest.examples).filter((entry) => (
        `${entry.sourceCardId}:${hanOnly(entry.traditional)}` === sentenceKey
      ));
      assert.equal(matches.length, 1, `expected one audio range for ${sourceCardId}`);
      const entry = matches[0];
      assert.equal(entry.bookId, bookId, `${sourceCardId} book provenance`);
      const trackHash = audioManifest.tracks[entry.alignment.track]?.sha256;
      assert.equal(trackHash, entry.alignment.trackSha256, `${sourceCardId} track hash provenance`);

      if (entry.audio) {
        assert.equal(entry.audio.voice, 'book', `${sourceCardId} recording source`);
        assert.ok(Number.isFinite(entry.audio.start) && entry.audio.start >= 0, `${sourceCardId} start`);
        assert.ok(Number.isFinite(entry.audio.end) && entry.audio.end > entry.audio.start, `${sourceCardId} end`);
        assert.ok(entry.alignment.score >= 0.64, `${sourceCardId} alignment confidence`);
        assert.equal(entry.alignment.alignedSyllables, entry.alignment.syllableCount, `${sourceCardId} aligned syllables`);
        assert.ok(
          entry.audio.end <= audioManifest.tracks[entry.alignment.track].durationSec,
          `${sourceCardId} range is within its source track`,
        );

        if (bookId === 1) {
          const track = book1Tracks.get(entry.alignment.track);
          assert.ok(track, `${sourceCardId} Book 1 track exists`);
          assert.equal(track.sha256, entry.alignment.trackSha256, `${sourceCardId} Book 1 track hash`);
          assert.equal(entry.audio.file, entry.alignment.track, `${sourceCardId} Book 1 playback path`);
          assert.ok(entry.audio.end <= track.durationSec, `${sourceCardId} Book 1 range is within track`);
          assert.equal(entry.audio.cache, undefined, `${sourceCardId} Book 1 cache policy`);
        } else {
          const track = book3Tracks.get(entry.alignment.track);
          assert.ok(track, `${sourceCardId} Book 3 track exists`);
          assert.equal(entry.alignment.driveFileId, track.id, `${sourceCardId} Book 3 Drive provenance`);
          assert.equal(
            entry.audio.file,
            `https://drive.usercontent.google.com/download?id=${track.id}&export=download`,
            `${sourceCardId} Book 3 streaming URL`,
          );
          assert.equal(entry.audio.cache, false, `${sourceCardId} Book 3 range must stream without whole-file caching`);
        }
      } else {
        assert.ok(entry.issue, `${sourceCardId} rejected range is documented for speech fallback`);
      }

      const packed = packedItems.get(sourceCardId);
      assert.ok(packed, `${sourceCardId} appears in Book ${bookId} vocabulary pack`);
      const packedExamples = typeof packed.examples === 'string' ? JSON.parse(packed.examples) as Array<{ audio?: SentenceAudio }> : [];
      assert.equal(packedExamples.length, 1, `${sourceCardId} has one packed vocabulary example`);
      assert.deepEqual(packedExamples[0].audio, entry.audio || undefined, `${sourceCardId} packed audio matches source manifest`);
    }
  }

  const book1Source = json<Record<string, SourceExample>>('content/vocabulary/book-1-examples.json');
  const primaryBook1Keys = new Set(Object.entries(book1Source).map(([sourceCardId, example]) => (
    `${sourceCardId}:${hanOnly(example.chinese)}`
  )));
  const coursePack = json<{
    records: Array<{ id: string; sourceCardId: string; traditional: string; audio?: SentenceAudio }>;
  }>('public/data/course-examples/book-1.json');
  const courseVocabularyExamples = coursePack.records.filter((record) => /-E\d{2}$/.test(record.id));
  const extraCourseExamples = courseVocabularyExamples.filter((record) => (
    !primaryBook1Keys.has(`${record.sourceCardId}:${hanOnly(record.traditional)}`)
  ));
  assert.equal(courseVocabularyExamples.length, 189, 'Book 1 vocabulary-page course examples');
  assert.equal(extraCourseExamples.length, 26, 'additional Book 1 vocabulary-page examples');

  for (const record of courseVocabularyExamples) {
    const key = `${record.sourceCardId}:${hanOnly(record.traditional)}`;
    const matches = Object.values(audioManifest.examples).filter((entry) => (
      `${entry.sourceCardId}:${hanOnly(entry.traditional)}` === key
    ));
    assert.equal(matches.length, 1, `${record.id} has one manifest result`);
    assert.deepEqual(record.audio, matches[0].audio || undefined, `${record.id} course-pack audio`);
    if (!matches[0].audio) assert.ok(matches[0].issue, `${record.id} fallback is documented`);
  }

  assert.equal(expectedCount, 1344, 'primary vocabulary source corpus size');
  assert.equal(
    Object.keys(audioManifest.examples).length,
    expectedCount + extraCourseExamples.length,
    'audio manifest has no extras or gaps',
  );
});

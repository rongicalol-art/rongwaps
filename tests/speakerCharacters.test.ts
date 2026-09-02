import test from 'node:test';
import assert from 'node:assert/strict';
import { getCharacterForSpeaker, CHARACTER_PROFILES } from '../src/utils/speakerCharacters.js';
import { ALL_READINGS } from '../src/data/readings.js';

test('all 12 characters have complete metadata in CHARACTER_PROFILES', () => {
  const expectedCharacters = [
    'youmei',
    'zhongming',
    'yiwen',
    'guoan',
    'yuanzhen',
    'jiale',
    'teacher',
    'parent',
    'doctor',
    'cafeWorker',
    'apartmentAgent',
    'neighbor',
  ];

  for (const id of expectedCharacters) {
    const profile = CHARACTER_PROFILES[id as keyof typeof CHARACTER_PROFILES];
    assert.ok(profile, `Profile for ${id} should exist`);
    assert.equal(profile.id, id);
    assert.ok(profile.nameTraditional.length > 0);
    assert.ok(profile.englishName.length > 0);
    assert.ok(profile.gender === 'female' || profile.gender === 'male');
    assert.ok(profile.role.length > 0);
    assert.ok(profile.description.length > 0);
  }
});

test('getCharacterForSpeaker resolves all dialogue speakers in Book 1 readings', () => {
  for (const reading of ALL_READINGS) {
    for (const paragraph of reading.paragraphs) {
      if (!paragraph.speaker) continue;
      const resolved = getCharacterForSpeaker(paragraph.speaker);
      assert.ok(
        resolved !== null,
        `Speaker "${paragraph.speaker}" in reading ${reading.id} should resolve to a character`,
      );
    }
  }
});

test('getCharacterForSpeaker returns null for unknown and narrator speakers', () => {
  assert.equal(getCharacterForSpeaker(null), null);
  assert.equal(getCharacterForSpeaker(''), null);
  assert.equal(getCharacterForSpeaker('旁白 / Narrator'), null);
  assert.equal(getCharacterForSpeaker('Unknown Speaker XYZ'), null);
});

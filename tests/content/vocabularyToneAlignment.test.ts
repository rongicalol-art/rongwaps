import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { mapVocabularyRows } from '../../src/utils/vocabulary/vocabularyMapping';
import { alignWordSyllables, segmentPinyinTones } from '../../src/utils/pinyin/pinyinTones';
import { stripTones } from '../../src/data/pinyinTables';
import { splitPinyinToSyllables } from '../../src/utils/pinyin/pinyinSyllables';
import { isHanziChar } from '../../src/utils/characters/hanzi';

const DATA = path.resolve('public/data');

/** Taiwan-standard readings the CC-CEDICT pack does not list. */
const TAIWAN_READINGS = new Set(['哪=nei', '那=nei', '垃=le', '圾=se', '姊=jie', '暫=zhan', '攜=xi', '喲=yao']);

function dictionaryReadings(): Map<string, Set<string>> {
  const readings = new Map<string, Set<string>>();
  const dir = path.join(DATA, 'dictionary');
  for (const file of fs.readdirSync(dir).filter((f) => f.startsWith('shard'))) {
    const { items } = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    for (const [, simplified, traditional, pinyin] of items as [number, string, string, string][]) {
      const syllables = splitPinyinToSyllables(pinyin);
      const simp = Array.from(simplified);
      const trad = Array.from(traditional || simplified);
      if (syllables.length !== simp.length) continue;
      simp.forEach((char, i) => {
        for (const c of [char, trad[i]]) {
          if (!readings.has(c)) readings.set(c, new Set());
          readings.get(c)!.add(stripTones(syllables[i]));
        }
      });
    }
  }
  return readings;
}

test('every tone-colored course word pairs each character with a real reading', () => {
  const readings = dictionaryReadings();
  const wrong: string[] = [];
  let colored = 0;
  let total = 0;
  for (const book of [1, 2, 3, 4]) {
    const raw = JSON.parse(fs.readFileSync(path.join(DATA, 'vocabulary', `book-${book}.json`), 'utf8'));
    for (const card of mapVocabularyRows(Array.isArray(raw) ? raw : Object.values(raw).flat())) {
      if (!card.front || !card.pinyin) continue;
      total++;
      const segments = segmentPinyinTones(card.pinyin);
      assert.equal(segments.map((s) => s.text).join(''), card.pinyin.normalize('NFC'), card.pinyin);

      const tones = alignWordSyllables(card.front, card.pinyin, card.traditional);
      if (!tones) continue;
      colored++;
      // Re-derive the chosen syllables and check each against the dictionary.
      const pinyinVariants = card.pinyin.split('/');
      const forms = (card.traditional ?? '').split('/');
      const variants = pinyinVariants.length > 1 && forms.length === pinyinVariants.length
        ? [pinyinVariants[forms.findIndex((f) => f.replace(/[（）()]/g, '') === card.front)]]
        : pinyinVariants;
      const hanzi = Array.from(card.front).filter(isHanziChar);
      for (const variant of variants) {
        let syllables = segmentPinyinTones(variant).filter((s) => s.tone).map((s) => s.text);
        if (syllables.length !== hanzi.length) syllables = syllables.filter((s) => s.toLowerCase() !== 'r');
        if (syllables.length !== hanzi.length) continue;
        hanzi.forEach((char, i) => {
          const base = stripTones(syllables[i]);
          const known = readings.get(char);
          if (base === 'r' || !known || known.has(base) || TAIWAN_READINGS.has(`${char}=${base}`)) return;
          wrong.push(`${card.front} ${variant}: ${char}=${syllables[i]}`);
        });
      }
    }
  }
  assert.deepEqual(wrong, []);
  assert.ok(colored / total > 0.98, `only ${colored}/${total} words tone-colored`);
});

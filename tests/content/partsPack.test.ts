import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { readJson, readSource } from '../acceptance_helpers';
import { compareByPoolRank, loadLearnerPool } from '../../scripts/lib/learnerPool';
import { PACK_CONFIGS } from '../../src/services/contentPackConfigs';
import type { GenericContentManifest, PartsPack } from '../../src/services/contentPacks';
import { builtWith, GRADE_ORDER, resolveSoundClue, type PartsIndex } from '../../src/utils/parts';

const MANIFEST = readJson<GenericContentManifest>('public/data/relations/manifest.json');
const TEXT = readSource('public/data/relations/parts.json');
const PACK = JSON.parse(TEXT) as PartsPack;
const config = PACK_CONFIGS.parts;
const [part] = config.getParts(MANIFEST);
const INDEX = config.transform!(PACK) as PartsIndex;

test('Parts pack: manifest hash, bytes, count and schema match; stays compact', () => {
  assert.equal(config.validateManifest(MANIFEST), true);
  assert.equal(createHash('sha256').update(TEXT).digest('hex'), MANIFEST.shards![0].sha256);
  assert.equal(Buffer.byteLength(TEXT), MANIFEST.shards![0].bytes);
  assert.equal(MANIFEST.totalCount, PACK.count);
  assert.equal(PACK.schemaVersion, 1);
  assert.equal(config.validatePack(PACK, part, MANIFEST), true);
  assert.ok(Buffer.byteLength(TEXT) < 80 * 1024, 'parts pack must stay under 80 KB');
});

test('Parts pack carries relations only: no pinyin, meaning, level or lesson fields', () => {
  assert.deepEqual(Object.keys(PACK).sort(), ['count', 'parents', 'phonetic', 'schemaVersion', 'shard']);
  for (const value of [...Object.values(PACK.parents), ...Object.values(PACK.phonetic)]) assert.doesNotMatch(value, /[A-Za-z0-9]/);
});

test('Parts pack: 門 builds sound-alikes first, then shape-only characters', () => {
  const members = builtWith('門', INDEX);
  const grades = new Map(members.map((member) => [member.character, member.grade]));
  for (const char of ['們', '悶', '閩']) assert.ok(grades.get(char), `${char} must be marked as a sound-alike of 門`);
  for (const char of ['問', '聞', '開', '間']) {
    assert.ok(grades.has(char), `${char} must be built with 門`);
    assert.equal(grades.get(char), null, `${char} shares the shape only`);
  }
  const firstShape = members.findIndex((member) => !member.grade);
  assert.ok(members.slice(firstShape).every((member) => !member.grade), 'sound-alikes come before shape-only characters');
});

test('Parts pack: 媽 sounds like 馬, whose family lists 媽 and its siblings', () => {
  assert.equal(PACK.phonetic['媽'], '馬');
  const clue = resolveSoundClue('媽', INDEX);
  assert.ok(clue);
  assert.equal(clue.part, '馬');
  assert.equal(clue.grade, 'tone');
  const siblings = clue.siblings.map((sibling) => sibling.character);
  for (const char of ['嗎', '碼', '罵']) assert.ok(siblings.includes(char), `${char} is a sibling of 媽`);
  assert.ok(!siblings.includes('媽'));
  assert.equal(PACK.phonetic['馬'], undefined, '馬 is a series root');
  assert.ok(builtWith('馬', INDEX).some((member) => member.character === '騎' && !member.grade), '騎 is built with 馬 by shape only');
  assert.equal(PACK.phonetic['請'], '青');
});

test('Parts pack: every phonetic value is a parents key listing the character with a grade mark', () => {
  for (const [char, partChar] of Object.entries(PACK.phonetic)) {
    const member = builtWith(partChar, INDEX).find((candidate) => candidate.character === char);
    assert.ok(member, `${char} must be listed under ${partChar}`);
    assert.ok(member.grade, `${char} must carry a grade mark under ${partChar}`);
  }
  // And the reverse: a graded member always has that part as its phonetic.
  for (const [partChar, members] of INDEX.parents) {
    for (const member of members) {
      if (member.grade) assert.equal(PACK.phonetic[member.character], partChar, `${member.character} is graded under ${partChar}`);
    }
  }
});

test('Parts pack: scoped to the learner pool, ordered sound-alikes first then by pool rank', () => {
  const pool = loadLearnerPool(process.cwd());
  for (const [partChar, members] of INDEX.parents) {
    let previous: { character: string; grade: number } | null = null;
    for (const member of members) {
      assert.ok(pool.has(member.character), `${partChar} lists ${member.character}, which is not in the learner pool`);
      const grade = member.grade ? GRADE_ORDER[member.grade] : 3;
      if (previous) {
        assert.ok(previous.grade <= grade, `${partChar}: ${member.character} breaks grade order`);
        if (previous.grade === grade) {
          assert.ok(compareByPoolRank(pool, previous.character, member.character) <= 0, `${partChar}: ${member.character} breaks pool order`);
        }
      }
      previous = { character: member.character, grade };
    }
  }
  assert.ok(!builtWith('人', INDEX).some((member) => member.character === '个'), 'simplified 个 must not appear');
});

test('Learner pool: course ∪ levels, course ranked first, no simplified spellings', () => {
  const pool = loadLearnerPool(process.cwd());
  assert.equal([...pool.values()].filter((rank) => rank.tier === 'course').length, 1677);
  // 从 and 于 are listed in levels.json (HSK gap fill) as-is, so they are in the pool by rule.
  for (const char of ['个', '们', '为']) assert.ok(!pool.has(char), `${char} must not be in the pool`);
  for (const char of ['駕', '欲', '致', '台']) assert.ok(pool.has(char), `${char} must be in the pool`);
  const levels = readJson<{ tbcl: { chars: Record<string, string> }; hsk: { chars: Record<string, string> } }>('public/data/levels/levels.json');
  for (const section of [levels.tbcl, levels.hsk]) {
    for (const list of Object.values(section.chars)) {
      for (const char of Array.from(list)) assert.ok(pool.has(char), `${char} is levelled but not in the pool`);
    }
  }
  assert.equal(pool.get('學')?.tier, 'course');
  assert.equal(pool.get('欲')?.tier, 'level');
  assert.ok(compareByPoolRank(pool, '學', '欲') < 0, 'course characters rank before levelled ones');
});

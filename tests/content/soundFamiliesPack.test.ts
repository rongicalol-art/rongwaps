import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { readJson, readSource } from '../acceptance_helpers';
import { isValidSoundFamiliesPack, type SoundFamiliesPack } from '../../src/services/contentPacks';

interface SoundFamiliesManifest {
  schemaVersion: number;
  version: string;
  totalCount: number;
  parts: Array<{ key: number; count: number; path: string; sha256: string; bytes: number }>;
}

const MANIFEST = readJson<SoundFamiliesManifest>('public/data/sound-families/manifest.json');
const PACK_TEXT = readSource('public/data/sound-families/series.json');
const PACK = JSON.parse(PACK_TEXT) as SoundFamiliesPack;

test('Sound families pack: manifest hash, count, and schema match', () => {
  assert.equal(MANIFEST.schemaVersion, 1);
  assert.ok(MANIFEST.totalCount >= 750, 'must have at least 750 series');
  const part = MANIFEST.parts.find((entry) => entry.key === 1);
  assert.ok(part, 'manifest must list part 1');
  assert.equal(createHash('sha256').update(PACK_TEXT).digest('hex'), part.sha256);
  assert.equal(part.bytes, Buffer.byteLength(PACK_TEXT));
  assert.equal(isValidSoundFamiliesPack(PACK), true);
});

test('Sound families pack: common phonetic series contain expected characters', () => {
  const qing = PACK.series.find((s) => s.glyph === '青');
  assert.ok(qing, '青 series must exist');
  assert.ok(qing.reading.length > 0, '青 series must have reading');
  const qingChars = qing.members.map((m) => m.character);
  assert.ok(qingChars.includes('請'), '青 series must include 請');
  assert.ok(qingChars.includes('情'), '青 series must include 情');
  assert.ok(qingChars.includes('清'), '青 series must include 清');
  assert.ok(qingChars.includes('晴'), '青 series must include 晴');
  assert.ok(qingChars.includes('睛'), '青 series must include 睛');

  const bao = PACK.series.find((s) => s.glyph === '包');
  assert.ok(bao, '包 series must exist');
  const baoChars = bao.members.map((m) => m.character);
  assert.ok(baoChars.includes('抱'), '包 series must include 抱');
  assert.ok(baoChars.includes('跑'), '包 series must include 跑');
  assert.ok(baoChars.includes('泡'), '包 series must include 泡');
  assert.ok(baoChars.includes('胞'), '包 series must include 胞');

  const sheng = PACK.series.find((s) => s.glyph === '生');
  assert.ok(sheng, '生 series must exist');
  const shengChars = sheng.members.map((m) => m.character);
  assert.ok(shengChars.includes('星'), '生 series must include 星');
  assert.ok(shengChars.includes('姓'), '生 series must include 姓');

  const zha = PACK.series.find((s) => s.glyph === '乍');
  assert.ok(zha, '乍 series must exist');
  const zhaChars = zha.members.map((m) => m.character);
  assert.ok(zhaChars.includes('作'), '乍 series must include 作');
  assert.ok(zhaChars.includes('昨'), '乍 series must include 昨');

  const dong = PACK.series.find((s) => s.glyph === '东');
  assert.ok(dong, '东 series must exist');
  const dongChars = dong.members.map((m) => m.character);
  assert.ok(dongChars.includes('冻'), '东 series must include 冻');
  assert.ok(dongChars.includes('栋'), '东 series must include 栋');
  assert.ok(dongChars.includes('岽'), '东 series must include 岽');
  assert.ok(dongChars.includes('胨'), '东 series must include 胨');
  assert.ok(dongChars.includes('鸫'), '东 series must include 鸫');
});

test('Sound families pack: every member has valid character and pinyin', () => {
  for (const series of PACK.series) {
    assert.ok(series.glyph.length > 0, 'series must have glyph');
    assert.ok(series.reading.length > 0, `${series.glyph} series must have reading`);
    assert.ok(series.members.length >= 2, `${series.glyph} series must have at least 2 members`);
    for (const member of series.members) {
      assert.ok(member.character.length > 0, 'member must have character');
      assert.ok(member.pinyin.length > 0, `${member.character} missing pinyin in ${series.glyph} series`);
    }
  }
});

test('Sound families pack: semantic radicals do not contaminate phonetic series roots', () => {
  const contaminatedRoots = ['木', '艹', '心', '扌', '氵', '口', '火', '土', '女', '言'];
  for (const root of contaminatedRoots) {
    const s = PACK.series.find((entry) => entry.glyph === root);
    assert.equal(s, undefined, `Semantic radical ${root} must not act as a phonetic series root`);
  }
});

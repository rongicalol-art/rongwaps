import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { GrammarPractice } from '../../src/types/models';
import { readJson } from '../acceptance_helpers';

const mappingFile = 'src/features/grammar-practice/components/generatedPictureAssets.ts';
const mapping = readFileSync(mappingFile, 'utf8');
const assets = new Map([...mapping.matchAll(/import (art\d+) from '([^']+)'/g)].map((match) => [match[1], path.resolve(path.dirname(mappingFile), match[2])]));
const pictures = new Map([...mapping.matchAll(/'([\d.,:]+)': \{ src: (art\d+)/g)].map((match) => [match[1], match[2]]));
const lessons = ['Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen'];

test('every Book 1 lesson 4–15 picture cue resolves to a shipped generated illustration', () => {
  const sourceKeys = new Set<string>();
  let uses = 0;
  for (const lesson of lessons) {
    const groups = readJson<Record<string, GrammarPractice>>(`content/grammar-practice/lesson${lesson}.json`);
    for (const group of Object.values(groups)) {
      for (const item of group.items) {
        if (!('scene' in item) || item.scene?.type !== 'picture') continue;
        uses++;
        const key = `${item.scene.page}:${item.scene.box.join(',')}`;
        sourceKeys.add(key);
        const asset = assets.get(pictures.get(key) ?? '');
        assert.ok(asset && existsSync(asset), `${item.id}: missing illustration for ${key}`);
      }
    }
  }
  assert.equal(uses, 104);
  assert.deepEqual(new Set(pictures.keys()), sourceKeys, 'No stale or missing crop mappings');
  assert.equal(new Set(pictures.values()).size, assets.size, 'Every imported image is used');
  assert.equal(assets.size, 102);
});

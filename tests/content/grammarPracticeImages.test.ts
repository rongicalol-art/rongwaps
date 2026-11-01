import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { GrammarPractice } from '../../src/types/models';
import { readJson } from '../acceptance_helpers';

/**
 * Book 1 exercise pictures are the app's illustrations (owner, 2026-11-01): no grey book scans, no drawn
 * SVG scenes. A book crop shows the illustration mapped to its exact box; a clock or calendar shows the
 * illustration made for exactly what it shows.
 */
const mappingFile = 'src/features/grammar-practice/components/generatedPictureAssets.ts';
const mapping = readFileSync(mappingFile, 'utf8');
const assets = new Map([...mapping.matchAll(/import ((?:art|scene)\d+) from '([^']+)'/g)].map((match) => [match[1], path.resolve(path.dirname(mappingFile), match[2])]));
const crops = new Map([...mapping.matchAll(/'([\d.,:]+)': \{ src: (art\d+)/g)].map((match) => [match[1], match[2]]));
const scenes = new Map([...mapping.matchAll(/'((?:moment|month|cast):[^']+)': \{ src: (scene\d+)/g)].map((match) => [match[1], match[2]]));
/** The p.45 thinking-man picture has its own reviewed illustration in PictureScene. */
const SPECIAL = new Set(['45:0.68,0.762,0.167,0.136']);

const dir = 'content/grammar-practice';
const items = readdirSync(dir).filter((file) => file.endsWith('.json'))
  .flatMap((file) => Object.values(readJson<Record<string, GrammarPractice>>(`${dir}/${file}`)).flatMap((page) => page.items));

test('every Book 1 exercise picture is an illustration, never a scan or a drawn scene', () => {
  const problems: string[] = [];
  const usedCrops = new Set<string>();
  const usedScenes = new Set<string>();
  for (const item of items) {
    const scene = 'scene' in item ? item.scene : undefined;
    if (!scene) continue;
    if (scene.type === 'cast') {
      usedScenes.add(`cast:${scene.page}`);
      if (!scenes.has(`cast:${scene.page}`)) problems.push(`${item.id}: no illustration for the page ${scene.page} people row`);
      continue;
    }
    if (scene.type === 'picture') {
      const key = `${scene.page}:${scene.box.join(',')}`;
      if (SPECIAL.has(key)) continue;
      usedCrops.add(key);
      if (!crops.has(key)) problems.push(`${item.id}: no illustration for ${key}`);
    } else if (scene.type === 'moment' || scene.type === 'month') {
      const key = scene.type === 'moment'
        ? `moment:${scene.moment.time ?? `${scene.moment.date?.month}/${scene.moment.date?.day}`}`
        : `month:${scene.year}-${scene.month}:${scene.highlight.join(',')}`;
      usedScenes.add(key);
      if (!scenes.has(key)) problems.push(`${item.id}: no illustration for ${key}`);
    } else problems.push(`${item.id}: drawn ${scene.type} scene`);
  }
  assert.deepEqual(problems, []);
  assert.deepEqual([...crops.keys()].filter((key) => !usedCrops.has(key)), [], 'No stale crop mappings');
  assert.deepEqual([...scenes.keys()].filter((key) => !usedScenes.has(key)), [], 'No stale scene mappings');
});

test('every mapped illustration is a shipped file and every imported file is used', () => {
  const referenced = new Set([...crops.values(), ...scenes.values()]);
  assert.deepEqual([...assets.keys()].filter((name) => !referenced.has(name)), [], 'Every imported image is used');
  assert.deepEqual([...assets.entries()].filter(([, file]) => !existsSync(file)).map(([name]) => name), [], 'Every image exists');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeCoverage, scanRenderSafety } from '../scripts/memory-hooks/checkHookQuality';
import {
  findAlignmentFindings,
  labelAlignsWithMeaning,
} from '../scripts/memory-hooks/checkComponentLabelAlignment';
import type { RuntimeDirectComponent } from '../scripts/memory-hooks/runtimeIndex';

const glyph = (value: string): RuntimeDirectComponent => ({ kind: 'glyph', key: `g:${value}`, glyph: value });

const caseJi: RuntimeDirectComponent[] = [glyph('戈'), glyph('𢆶'), glyph('人')];
const labelCandidatesByGlyph = new Map<string, string[]>([
  ['人', ['person']],
  ['戈', ['dagger-axe']],
  ['𢆶', ['double tiny']],
  ['幺', ['one', 'tiny', 'small']],
]);
const childrenByGlyph = new Map<string, string[]>([['𢆶', ['幺']]]);
const aliasesByGlyph = new Map<string, string[]>();

test('coverage flags a dropped prominent part (幾 misses its double-tiny top)', () => {
  const findings = analyzeCoverage({
    hook: 'A vigilant 人(person) armed with a 戈(dagger-axe) inspects the frontier to see how many defenders remain.',
    strategy: 'scene',
    directComponents: caseJi,
    labelCandidatesByGlyph,
    childrenByGlyph,
    aliasesByGlyph,
  });
  const missing = findings.find((finding) => finding.code === 'part-missing');
  assert.equal(missing?.severity, 'error');
  assert.equal(missing?.part, '𢆶');
});

test('coverage accepts surfacing an unrenderable part through its inner glyph', () => {
  const findings = analyzeCoverage({
    hook: 'Two tiny 幺(small) threads drift above a 人(person) armed with a 戈(dagger-axe) — so few that he asks 幾: how many?',
    strategy: 'scene',
    directComponents: caseJi,
    labelCandidatesByGlyph,
    childrenByGlyph,
    aliasesByGlyph,
  });
  assert.equal(findings.some((finding) => finding.severity === 'error'), false);
  assert.equal(findings.find((finding) => finding.part === '𢆶')?.code, 'part-child-echo');
});

test('coverage accepts the sanctioned alias for a direct part', () => {
  const findings = analyzeCoverage({
    hook: 'A determined 人(person) following a northern 方(direction) packs their bags for a memorable journey.',
    strategy: 'scene',
    directComponents: [glyph('方'), glyph('𠂉')],
    labelCandidatesByGlyph,
    childrenByGlyph,
    aliasesByGlyph: new Map([
      ['𠂉', ['人']],
      ['人', ['𠂉']],
    ]),
  });
  assert.equal(findings.some((finding) => finding.severity === 'error'), false);
  assert.equal(findings.find((finding) => finding.part === '𠂉')?.code, 'part-alias-echo');
});

test('coverage accepts a plain-English description of a labeled part', () => {
  const findings = analyzeCoverage({
    hook: 'A hand holding a seal smooths a 月(moon) motif into cloth, making clothes that feel comfortable.',
    strategy: 'scene',
    directComponents: [glyph('月'), glyph('𠬝')],
    labelCandidatesByGlyph: new Map([
      ['月', ['moon']],
      ['𠬝', ['hand holding seal', 'stamp in hand']],
    ]),
    childrenByGlyph: new Map([['𠬝', ['卩', '又']]]),
    aliasesByGlyph,
  });
  assert.equal(findings.some((finding) => finding.severity === 'error'), false);
  assert.equal(findings.find((finding) => finding.part === '𠬝')?.code, 'part-described');
});

test('coverage downgrades missing parts for shape-only hooks', () => {
  const findings = analyzeCoverage({
    hook: 'Spreading feathered wings wide and trailing elegant plumage through the clouds.',
    strategy: 'shape',
    directComponents: [glyph('飞')],
    labelCandidatesByGlyph,
    childrenByGlyph,
    aliasesByGlyph,
  });
  assert.equal(findings.some((finding) => finding.severity === 'error'), false);
});

test('coverage skips pure stroke parts', () => {
  const findings = analyzeCoverage({
    hook: 'A 人(person) leans on a 木(tree).',
    strategy: 'scene',
    directComponents: [glyph('丿'), glyph('丨'), glyph('亅')],
    labelCandidatesByGlyph,
    childrenByGlyph,
    aliasesByGlyph,
  });
  assert.equal(findings.length, 0);
});

test('render safety rejects rare glyph tokens and flags Ext-A glyphs', () => {
  const rare = scanRenderSafety('A 學(learn) inside 𦥯(schoolhouse) is learned.');
  assert.equal(rare.find((finding) => finding.part === '𦥯')?.severity, 'error');
  const extA = scanRenderSafety('A 㐆(turn) post sits on the 木(tree).');
  assert.equal(extA.find((finding) => finding.part === '㐆')?.severity, 'flag');
  assert.equal(scanRenderSafety('A 人(person) with a 戈(dagger-axe).').length, 0);
});

test('render safety accepts glyphs bundled in the RW-Extras webfont', () => {
  assert.equal(scanRenderSafety('A 䒑(grass) top rests above 𦥑(hands).').length, 0);
  assert.equal(scanRenderSafety('An 土(earth) plot and a 𣥂(footprint).').length, 0);
});

test('label alignment accepts taught senses, synonyms, readings, and explicit bridges', () => {
  assert.equal(labelAlignsWithMeaning('person', 'person; human being'), true);
  assert.equal(labelAlignsWithMeaning('moon', 'month'), false);
  assert.equal(labelAlignsWithMeaning('qiě', 'moreover', ['qiě']), true);
  assert.equal(labelAlignsWithMeaning('is', 'to be; indeed, right, yes', ['shì']), true);
  assert.equal(labelAlignsWithMeaning('hand — also \'again\'', 'both...and...', ['yòu']), false);
  assert.equal(labelAlignsWithMeaning('hand — also \'again\'', 'again, also, in addition', ['yòu']), true);
});

test('label alignment reports labels that drop a taught meaning', () => {
  const records = [
    { character: '友', hook: 'A 𠂇(left hand) reaches out as 友(friend).', acceptance: 'clean' },
    { character: '備', hook: 'A 用(barred frame) readies 備(prepare).', acceptance: 'clean' },
    { character: '水', hook: 'A cool 水(water) stream.', acceptance: 'clean' },
  ];
  const findings = findAlignmentFindings(records, new Map([
    ['又', 'again, also, in addition'],
    ['用', 'to use'],
    ['水', 'water'],
  ]), new Map([['又', ['yòu']]]));

  assert.deepEqual(findings.map((finding) => finding.glyph), ['用']);
  assert.deepEqual(findings[0].hooks, ['備']);
});

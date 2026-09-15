import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeCoverage, scanRenderSafety } from '../scripts/memory-hooks/checkHookQuality';
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
  const extA = scanRenderSafety('A 䒑(grass) top sits on the 木(tree).');
  assert.equal(extA.find((finding) => finding.part === '䒑')?.severity, 'flag');
  assert.equal(scanRenderSafety('A 人(person) with a 戈(dagger-axe).').length, 0);
});

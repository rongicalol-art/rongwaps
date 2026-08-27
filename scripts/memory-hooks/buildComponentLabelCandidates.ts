import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  ComponentLabelCandidate,
  ComponentProfile,
} from '../../src/features/character-memory-hooks/model';

interface ComponentProfileArtifact {
  schemaVersion: number;
  distribution: 'development-only-candidate';
  publishable: false;
  profiles: ComponentProfile[];
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PROFILE_PATH = resolve(OUTPUT_DIR, 'book-1-component-profiles-v2.json');
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'book-1-component-label-candidates-v1.json');

const WITHHOLD_GLOSSES = new Set([
  'hook',
  'kwukyel',
  'line',
  'number one',
  'slash',
]);

const REVIEW_GLOSS_PATTERN = /(?:ancient|variant|terrestrial branch|transliteration|short-tailed|component cluster|used in|surname|kwukyel)/iu;

function isTechnicalOrStrokeOnly(profile: ComponentProfile): boolean {
  if (profile.rawGlosses.length === 0) return true;
  if (profile.rawGlosses.some((gloss) => /^component cluster used in/i.test(gloss))) return true;
  return profile.rawGlosses.every((gloss) => WITHHOLD_GLOSSES.has(gloss.toLowerCase()));
}

function normalizeGloss(gloss: string): string {
  return gloss
    .replace(/^to\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCandidate(profile: ComponentProfile): ComponentLabelCandidate {
  const approved = profile.approvedDefaultLabels;
  if (approved.length > 0) {
    return {
      schemaVersion: 1,
      key: profile.key,
      glyph: profile.glyph,
      rawGlosses: profile.rawGlosses,
      readings: profile.readings,
      labelCandidates: approved.map((label) => ({
        label: label.label,
        basis: 'meaning' as const,
        confidence: 'high' as const,
        warnings: [],
      })),
      disposition: 'already-approved',
      reasons: ['approved-lexicon-label-present', 'target-specific-use-not-evaluated'],
      sourceRefs: [...new Set([...profile.sourceRefs, ...approved.flatMap((label) => label.sourceRefs)])],
      targetSpecificUse: 'not-evaluated',
    };
  }

  const normalizedGlosses = [...new Set(profile.rawGlosses.map(normalizeGloss).filter(Boolean))];
  if (isTechnicalOrStrokeOnly(profile)) {
    return {
      schemaVersion: 1,
      key: profile.key,
      glyph: profile.glyph,
      rawGlosses: profile.rawGlosses,
      readings: profile.readings,
      labelCandidates: [],
      disposition: 'withhold',
      reasons: [
        profile.rawGlosses.length === 0 ? 'missing-raw-component-metadata' : 'technical-or-stroke-like-metadata',
        'target-specific-use-not-evaluated',
      ],
      sourceRefs: profile.sourceRefs,
      targetSpecificUse: 'not-evaluated',
    };
  }

  const ambiguous = normalizedGlosses.length > 1;
  const primaryGloss = profile.rawGlosses[0]?.trim() ?? '';
  const primaryIsConcrete = primaryGloss.length > 0
    && !/^to\b/iu.test(primaryGloss)
    && !REVIEW_GLOSS_PATTERN.test(primaryGloss);
  const requiresReview = profile.rawGlosses.some((gloss) => REVIEW_GLOSS_PATTERN.test(gloss))
    || (normalizedGlosses.length > 3 && !primaryIsConcrete);
  const confidence = requiresReview ? 'medium' : 'high';
  const warningList = [
    ...(ambiguous ? ['additional-raw-senses-require-review'] : []),
    'raw-gloss-is-not-an-approved-learner-label',
    'target-specific-use-not-evaluated',
  ];
  return {
    schemaVersion: 1,
    key: profile.key,
    glyph: profile.glyph,
    rawGlosses: profile.rawGlosses,
    readings: profile.readings,
    labelCandidates: normalizedGlosses.slice(0, 4).map((label) => ({
      label,
      basis: 'meaning' as const,
      confidence,
      warnings: warningList,
    })),
    disposition: requiresReview ? 'review-required' : 'candidate-review',
    reasons: [
      ambiguous ? 'multiple-raw-glosses' : 'single-raw-gloss-candidate',
      ...(requiresReview ? ['raw-metadata-needs-human-triage'] : ['primary-gloss-is-a-learner-label-candidate']),
      'raw-glosses-only-no-target-role-claim',
      'target-specific-use-not-evaluated',
    ],
    sourceRefs: profile.sourceRefs,
    targetSpecificUse: 'not-evaluated',
  };
}

function main(): void {
  const artifact = JSON.parse(readFileSync(PROFILE_PATH, 'utf8')) as ComponentProfileArtifact;
  if (artifact.publishable || artifact.distribution !== 'development-only-candidate') {
    throw new Error('Refusing to build label candidates from a publishable or non-candidate profile artifact.');
  }
  const candidates = artifact.profiles
    .map(buildCandidate)
    .sort((left, right) => left.glyph.localeCompare(right.glyph));
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify({
    schemaVersion: 1,
    distribution: 'development-only-candidate',
    publishable: false,
    sourceProfiles: 'book-1-component-profiles-v2.json',
    aiProvider: null,
    candidates,
  }, null, 2)}\n`);
  const counts = candidates.reduce<Record<string, number>>((result, candidate) => {
    result[candidate.disposition] = (result[candidate.disposition] ?? 0) + 1;
    return result;
  }, {});
  console.log(JSON.stringify({
    profiles: candidates.length,
    dispositions: counts,
    output: 'output/memory-hooks/book-1-component-label-candidates-v1.json',
    apiCallsMade: 0,
    publishable: false,
  }, null, 2));
}

main();

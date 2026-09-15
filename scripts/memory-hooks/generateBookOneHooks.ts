import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { generateJson, resolveProvider, type ProviderConfig } from './provider';
import { FUNCTION_WORD_LABEL, STROKE_GLYPHS, TECHNICAL_LABEL, usableGlosses } from './componentRules';
import { loadRuntimeDirectIndex } from './runtimeIndex';
import { extractJsonObject } from './jsonExtract';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PROMPT_VERSION = 'book1-lean-v2';

type Strategy = 'combine' | 'scene' | 'sound' | 'shape' | 'none';

interface PlanComponent {
  key: string;
  kind: 'glyph' | 'unencoded-component' | 'unknown-component' | 'source-entity';
  glyph: string | null;
}

interface PlanRecord {
  character: string;
  meaningDecision: {
    selectedMeaning: string | null;
    selectedPinyin: string | null;
  };
  components: PlanComponent[];
}

interface ComponentProfile {
  key: string;
  glyph: string;
  rawGlosses: string[];
  readings: string[];
  approvedDefaultLabels: Array<{ id: string; label: string }>;
}

interface ReviewedMeaning {
  character: string;
  constructionMeaning: string | null;
  constructionReading: string | null;
  status: string;
}

interface UsedComponent {
  glyph: string;
  label: string;
}

interface HookIssue {
  code: string;
  severity: 'error' | 'flag';
  message: string;
}

interface HookRecord {
  character: string;
  meaning: string | null;
  meaningSource: 'reviewed-construction' | 'inventory' | 'missing';
  pinyin: string | null;
  strategy: Strategy;
  hook: string | null;
  componentsUsed: UsedComponent[];
  parts: ResolvedPart[];
  reason: string | null;
  validation: { valid: boolean; issues: HookIssue[] };
  attempts: number;
  acceptance: 'clean' | 'flagged' | 'none' | 'failed';
  model: string;
  promptVersion: string;
}

const HISTORY_LANGUAGE = /\b(ancient|historically|history|originally|origin|evolved|pictograph|oracle bone|bronze script|was created|was formed)\b/i;
const ABSTRACT_GLOSS = /\b(particle|marker|measure word|function word|ordinal|honorific|complement|classifier)\b/i;

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

interface CuratedLabelRecord {
  glyph: string;
  status: 'seed' | 'proposed' | 'approved' | 'needs-review';
  label: string | null;
  use?: 'label' | 'skip';
}

interface ResolvedPart {
  glyph: string;
  glosses: string[];
  readings: string[];
  suggestedLabel: string | null;
  unknown: boolean;
  /** Set when this part was lifted out of an undefined larger component. */
  inside: string | null;
  /** Visible inner glyphs that may stand in for this part with their own label. */
  aliases: string[];
}

function loadCuratedLabels(): { labels: Map<string, string>; skip: Set<string> } {
  const frozen = resolve(OUTPUT_DIR, 'book-1-curated-component-labels-v1.json');
  const proposed = resolve(OUTPUT_DIR, 'book-1-curated-component-labels-v1.proposed.json');
  const path = existsSync(frozen) ? frozen : proposed;
  const artifact = loadJson<{ records: CuratedLabelRecord[] }>(path);
  const labels = new Map<string, string>();
  const skip = new Set<string>();
  for (const record of artifact.records) {
    if (record.use === 'skip') {
      skip.add(record.glyph);
      continue;
    }
    if (record.status === 'seed' || record.status === 'proposed' || record.status === 'approved') {
      if (record.label) labels.set(record.glyph, record.label);
    }
  }
  return { labels, skip };
}

function resolveParts(
  plan: PlanRecord,
  profiles: Map<string, ComponentProfile>,
  curated: { labels: Map<string, string>; skip: Set<string> },
  direct: Map<string, string[]>,
): ResolvedPart[] {
  const seen = new Set<string>();
  const parts: ResolvedPart[] = [];
  const push = (part: ResolvedPart) => {
    if (seen.has(part.glyph)) return;
    seen.add(part.glyph);
    parts.push(part);
  };

  for (const component of plan.components) {
    if (component.kind !== 'glyph' || !component.glyph) continue;
    const glyph = component.glyph;
    if (seen.has(glyph) || STROKE_GLYPHS.has(glyph) || curated.skip.has(glyph)) continue;
    const profile = profiles.get(component.key);
    const readings = (profile?.readings ?? []).slice(0, 3);
    const curatedLabel = curated.labels.get(glyph) ?? profile?.approvedDefaultLabels[0]?.label ?? null;

    if (curatedLabel) {
      const hasGlosses = usableGlosses(profile?.rawGlosses ?? []).length > 0;
      const aliases = hasGlosses ? [] : (direct.get(glyph) ?? [])
        .filter((child) => child !== glyph && !STROKE_GLYPHS.has(child) && !curated.skip.has(child))
        .filter((child) => {
          const childProfile = profiles.get(`g:${child}`);
          return usableGlosses(childProfile?.rawGlosses ?? []).length > 0
            || Boolean(curated.labels.get(child) ?? childProfile?.approvedDefaultLabels[0]?.label);
        })
        .slice(0, 5);
      push({ glyph, glosses: [], readings, suggestedLabel: curatedLabel, unknown: false, inside: null, aliases });
      continue;
    }

    const glosses = usableGlosses(profile?.rawGlosses ?? []).slice(0, 5);
    if (glosses.length > 0) {
      push({ glyph, glosses, readings, suggestedLabel: null, unknown: false, inside: null, aliases: [] });
      continue;
    }

    const children = (direct.get(glyph) ?? [])
      .filter((child) => child !== glyph && !STROKE_GLYPHS.has(child) && !curated.skip.has(child))
      .map((child) => {
        const childProfile = profiles.get(`g:${child}`);
        const childGlosses = usableGlosses(childProfile?.rawGlosses ?? []).slice(0, 3);
        const childLabel = curated.labels.get(child) ?? childProfile?.approvedDefaultLabels[0]?.label ?? null;
        return {
          glyph: child,
          glosses: childLabel ? [] : childGlosses,
          readings: (childProfile?.readings ?? []).slice(0, 2),
          suggestedLabel: childLabel,
          unknown: !childLabel && childGlosses.length === 0 && (childProfile?.readings ?? []).length === 0,
          inside: glyph,
          aliases: [],
        };
      })
      .filter((child) => !child.unknown)
      .slice(0, 3);

    if (children.length > 0) {
      for (const child of children) push(child);
      continue;
    }
    push({ glyph, glosses: [], readings, suggestedLabel: null, unknown: true, inside: null, aliases: [] });
  }
  return parts;
}

function meaningCore(meaning: string): string {
  return meaning
    .replace(/\([^)]*\)/g, ' ')
    .split(/[;/,"]/)[0]
    .replace(/^to\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildPrompt(input: {
  character: string;
  meaning: string;
  pinyin: string | null;
  components: Array<ResolvedPart & { phonetic: boolean }>;
}, feedback: string[]): string {
  return JSON.stringify({
    task: 'Write one memorable English hook that helps a beginner recognize this Chinese character and remember its meaning from its visible parts.',
    character: input.character,
    pinyin: input.pinyin,
    meaning: input.meaning,
    components: input.components,
    rules: [
      'Return JSON only: { "character", "strategy", "hook", "componentsUsed", "reason" }.',
      'strategy is one of: "combine" (part meanings combine into the target), "scene" (concrete visual story), "sound" (a part\'s reading sounds like the target), "shape" (whole-character shape only, no parts), "none".',
      'componentsUsed is an array of { "glyph", "label" } and MUST exactly match the glyph(label) tokens used in the hook.',
      'Write English only, except component tokens in the exact form 字(label), e.g. 亻(person).',
      'Use a component token every time you mention a part; never mention a part by its English word alone.',
      'Prefer the suggestedLabel for a component when it fits; otherwise choose another 1-3 word concrete English label.',
      'Only use the supplied components. Never invent a part, meaning, or reading.',
      'Copy each supplied component glyph exactly as given; never substitute a lookalike or radical variant.',
      'If the character has no components, do not write a 字(label) token; describe the whole shape and state the meaning.',
      'Components marked "unknown" have no reliable meaning: skip them, or describe only a plainly visible shape (e.g. "looks like a hand"); never invent a meaning or name for them.',
      'Structure the hook in two tiers: a core image with 1-2 parts that carries the meaning, then briefly name any remaining parts in a short tail (for example: "...; the 爫(hands) do the covering.").',
      'Every supplied part must surface: name it with a 字(label) token when it has a label or glosses; otherwise describe its visible shape in plain English. Never silently drop a part.',
      'A small part with a simple modifier meaning (e.g. 幺 tiny/small) may decorate another element ("two tiny 幺(small) threads"); it must never carry the main story by itself.',
      'Never write a rare or unrenderable component glyph as a token; use one of its supplied inner components or describe its visible shape (e.g. "two tiny curls") instead.',
      'Parts marked "phonetic": true have a reading close to the target\'s; you may cue their sound or skip them, and they do not need a meaning mention.',
      'A part marked "inside": another glyph is a visible sub-part of it; phrase it as "the 心(heart) inside" or similar.',
      'A part with "aliases" may be written using one of its alias glyphs instead, as long as the label is the same (e.g. 𢛳(heart) or 心(heart)).',
      'Never relabel a component with an unrelated or abstract word to force a story (e.g. calling 一 "big" or 亥 "should"); if the parts do not fit naturally, use shape or "none".',
      'Skip components whose only glosses are stroke names, heavenly stems, surnames, or variants; never build a story on them.',
      'If a component is phonetic, you may use its sound ("... sounds like ..."); do not combine its literal meaning into the target.',
      'For "sound", the component reading must genuinely resemble the target pinyin (same final sound); otherwise do not claim a sound cue.',
      'Use at most 2 sentences and at most 32 words total.',
      'Use at most 4 component tokens in total.',
      'State the target meaning naturally in English ("... means 休(rest)." or inside the story).',
      'Never use historical or etymology language such as originally, ancient, historically, evolved, comes from, was created.',
      'The hook must be honest: a made-up scene is fine, a made-up fact is not. If no helpful hook exists, set strategy to "none" with a short reason.',
      ...(feedback.length > 0 ? [`Fix these problems from the previous attempt: ${feedback.join(' | ')}`] : []),
    ],
  });
}

function parseCandidate(content: string): {
  strategy: Strategy;
  hook: string | null;
  componentsUsed: UsedComponent[];
  reason: string | null;
} {
  const parsed = JSON.parse(extractJsonObject(content)) as Record<string, unknown>;
  const rawStrategy = stringValue(parsed.strategy) as Strategy;
  const allowed: Strategy[] = ['combine', 'scene', 'sound', 'shape', 'none'];
  const hook = stringValue(parsed.hook).normalize('NFKC')
    .replace(/\*+/g, '')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim() || null;
  const rawUsed = Array.isArray(parsed.componentsUsed) ? parsed.componentsUsed : [];
  return {
    strategy: allowed.includes(rawStrategy) ? rawStrategy : 'none',
    hook,
    componentsUsed: rawUsed
      .map((item) => item as Record<string, unknown>)
      .map((item) => ({
        glyph: stringValue(item.glyph).normalize('NFKC'),
        label: stringValue(item.label).normalize('NFKC').replace(/\s+/g, ' '),
      }))
      .filter((item) => item.glyph.length > 0 && item.label.length > 0),
    reason: stringValue(parsed.reason) || null,
  };
}

function stripTone(pinyin: string): string {
  return pinyin.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ü/g, 'v').replace(/[1-5]/g, '').toLowerCase();
}

function soundsAlike(left: string, right: string): boolean {
  const leftSyllable = stripTone(left);
  const rightSyllable = stripTone(right);
  const leftFinal = leftSyllable.replace(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/, '');
  const rightFinal = rightSyllable.replace(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/, '');
  if (!leftFinal || leftFinal !== rightFinal) return false;
  const leftInitial = leftSyllable.slice(0, leftSyllable.length - leftFinal.length);
  const rightInitial = rightSyllable.slice(0, rightSyllable.length - rightFinal.length);
  return leftInitial === rightInitial || 'yw'.includes(leftInitial) || 'yw'.includes(rightInitial);
}

function validate(input: {
  character: string;
  meaning: string | null;
  pinyin: string | null;
  suppliedGlyphs: Set<string>;
  unknownGlyphs: Set<string>;
  requiredGlyphs: Set<string>;
  curatedLabels: Map<string, string>;
  aliasesByGlyph: Map<string, string[]>;
  readingsByGlyph: Map<string, string[]>;
}, candidate: ReturnType<typeof parseCandidate>): { valid: boolean; issues: HookIssue[] } {
  const issues: HookIssue[] = [];
  const add = (code: string, severity: 'error' | 'flag', message: string) => issues.push({ code, severity, message });

  if (candidate.strategy === 'none') {
    if (!candidate.reason) add('missing-none-reason', 'flag', 'No reason given for withholding a hook.');
    return { valid: issues.every((issue) => issue.severity !== 'error'), issues };
  }
  if (!candidate.hook) {
    add('missing-hook', 'error', 'Strategy is not none but the hook is empty.');
    return { valid: false, issues };
  }

  const hook = candidate.hook;
  if (hook.length < 15 || hook.length > 240) add('invalid-length', 'error', 'Hook must be 15-240 characters.');
  const sentenceCount = hook.split(/[.!?。！？]+/).filter((part) => part.trim()).length;
  if (sentenceCount > 2) add('too-many-sentences', 'error', 'Hook must use at most two sentences.');
  const wordCount = hook.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 40) add('too-many-words', 'error', 'Hook must use at most 40 words.');
  const historyMatch = hook.match(HISTORY_LANGUAGE);
  if (historyMatch && !(input.meaning ?? '').toLowerCase().includes(historyMatch[0].toLowerCase())) {
    add('unsupported-history', 'error', 'Hook uses historical or etymology language.');
  }

  if (candidate.componentsUsed.length === 0 && candidate.strategy !== 'shape') {
    add('missing-components-used', 'error', 'Strategy needs at least one component.');
  }
  const usedGlyphs = candidate.componentsUsed.map((used) => used.glyph);
  const duplicated = [...new Set(usedGlyphs.filter((glyph, index) => usedGlyphs.indexOf(glyph) !== index))];
  if (duplicated.length > 0) {
    add('duplicate-component', 'error', `Component used more than once: ${duplicated.join(' ')}.`);
  }
  for (const used of candidate.componentsUsed) {
    if (!input.suppliedGlyphs.has(used.glyph)) {
      add('unplanned-component', 'error', `Component ${used.glyph} is not in the supplied decomposition.`);
    }
    const forms = [used.glyph, ...(input.aliasesByGlyph.get(used.glyph) ?? [])].map((glyph) => `${glyph}(${used.label})`);
    const tokenCount = forms.reduce((sum, form) => sum + hook.split(form).length - 1, 0);
    if (tokenCount < 1 || tokenCount > 2) {
      add('component-token-count', 'error', `Hook must contain ${forms[0]} once or twice (found ${tokenCount}).`);
    }
    if (used.label === used.glyph) {
      add('glyph-as-label', 'error', `Use an English label for ${used.glyph}, not the glyph itself.`);
    }
    if (input.unknownGlyphs.has(used.glyph)) {
      add('unknown-component-used', 'flag', `${used.glyph} has no reliable meaning; only a plain shape label is safe.`);
    }
    if (TECHNICAL_LABEL.test(used.label)) {
      add('technical-label', 'flag', `Label "${used.label}" is a technical term, not a beginner word.`);
    }
    if (FUNCTION_WORD_LABEL.test(used.label)) {
      add('function-word-label', 'flag', `Label "${used.label}" is a function word and cannot carry a memory story.`);
    }
    const approvedLabel = input.curatedLabels.get(used.glyph);
    if (approvedLabel && used.label !== approvedLabel) {
      add('label-variant', 'flag', `Use the approved label "${approvedLabel}" for ${used.glyph} consistently.`);
    }
  }

  if (input.meaning && candidate.componentsUsed.length > 0) {
    const core = meaningCore(input.meaning);
    if (core.length > 2) {
      for (const used of candidate.componentsUsed) {
        const label = used.label.toLowerCase();
        if (label === core || core.startsWith(`${label} `) || core.endsWith(` ${label}`)) {
          add('label-meaning-collision', 'flag', `Label "${used.label}" restates the target meaning; use a different facet of ${used.glyph}.`);
        }
      }
    }
  }

  const allowedHan = new Set([input.character, ...input.suppliedGlyphs]);
  const unexpectedHan = [...new Set(Array.from(hook).filter((glyph) => (
    /\p{Script=Han}/u.test(glyph) && !allowedHan.has(glyph)
  )))];
  if (unexpectedHan.length > 0) {
    add('unexpected-han-glyph', 'error', `Hook contains unintended Han glyphs: ${unexpectedHan.join(' ')}.`);
  }

  const tokens = hook.match(/\p{Script=Han}+\([^)]*\)/gu) ?? [];
  for (const token of tokens) {
    const glyph = token.split('(')[0];
    if (!input.suppliedGlyphs.has(glyph)) continue;
    const declared = candidate.componentsUsed.some((used) => (
      [used.glyph, ...(input.aliasesByGlyph.get(used.glyph) ?? [])]
        .some((form) => `${form}(${used.label})` === token)
    ));
    if (!declared) add('undeclared-component-token', 'error', `Token ${token} is missing from componentsUsed.`);
  }
  if (/\p{Script=Han}+\([^)]+\)[A-Za-z]/u.test(hook)) {
    add('grammar-attached-to-token', 'error', 'Do not attach English endings directly to 字(label).');
  }
  if (/\([^)]*\p{Script=Han}/u.test(hook)) {
    add('nested-token', 'error', 'Do not nest Han glyphs inside component labels.');
  }

  if (candidate.strategy === 'sound' && input.pinyin) {
    const cueWorks = candidate.componentsUsed.some((used) => (
      (input.readingsByGlyph.get(used.glyph) ?? []).some((reading) => soundsAlike(reading, input.pinyin!))
    ));
    if (!cueWorks) add('weak-sound-cue', 'flag', 'No supplied component reading genuinely resembles the target pinyin.');
  }

  if (candidate.componentsUsed.length > 4) {
    add('too-many-component-tokens', 'error', `Hook uses ${candidate.componentsUsed.length} component tokens; at most 4 are allowed.`);
  }
  const required = [...input.requiredGlyphs];
  const missing = required.filter((glyph) => (
    !hook.includes(`${glyph}(`)
    && !(input.aliasesByGlyph.get(glyph) ?? []).some((alias) => hook.includes(`${alias}(`))
  ));
  if (missing.length > 0) {
    add(
      'missing-required-part',
      required.length <= 3 ? 'error' : 'flag',
      `Hook should name the visible part ${missing.join(' ')}.`,
    );
  }

  if (input.meaning && !ABSTRACT_GLOSS.test(input.meaning)) {
    const core = meaningCore(input.meaning);
    const simplified = core.replace(/^be\s+/, '');
    const mentioned = hook.toLowerCase().includes(core)
      || (simplified !== core && hook.toLowerCase().includes(simplified));
    if (core && core.length <= 20 && !mentioned) {
      add('meaning-not-mentioned', 'flag', `Hook may not mention the meaning "${core}".`);
    }
  }
  return { valid: issues.every((issue) => issue.severity !== 'error'), issues };
}

async function generate(
  provider: ProviderConfig,
  input: Parameters<typeof buildPrompt>[0],
  feedback: string[],
): Promise<ReturnType<typeof parseCandidate>> {
  const content = await generateJson(
    provider,
    'You write honest, concrete memory hooks for Chinese characters. Return valid JSON only.',
    buildPrompt(input, feedback),
    500,
  );
  if (!content) throw new Error('Hook generation returned empty content.');
  return parseCandidate(content);
}

async function critique(
  provider: ProviderConfig,
  input: { character: string; meaning: string; components: ResolvedPart[] },
  candidate: ReturnType<typeof parseCandidate>,
): Promise<{ score: number; problems: string[] }> {
  const content = await generateJson(
    provider,
    'You review memory hooks for Chinese characters. Score honestly. Return valid JSON only.',
    JSON.stringify({
      task: 'Rate this memory hook from 1 (bad) to 5 (great) and list real problems.',
      character: input.character,
      meaning: input.meaning,
      parts: input.components.map((part) => ({
        glyph: part.glyph,
        label: part.suggestedLabel ?? part.glosses[0] ?? null,
        inside: part.inside,
      })),
      hook: candidate.hook,
      criteria: [
        'Concrete: one clear image a beginner can visualize.',
        'Honest: no invented facts, no fake etymology; a made-up scene is fine, a made-up fact is not.',
        'Accurate: it does not misstate what a part means.',
        'Meaning: the target meaning is clearly present.',
        'No tautology: a part label that just restates the target meaning (e.g. "to assemble under the 亼(assemble) roof") is confusing; penalize it.',
        'Every named part must pull its weight: if you can delete a part\'s clause and the hook still explains the meaning, that part is decoration; penalize it.',
        'Natural English; not just a list of parts.',
      ],
      output: '{ "score": 1-5, "problems": [ "short problem", ... ] }',
    }),
    400,
  );
  const parsed = JSON.parse(extractJsonObject(content)) as Record<string, unknown>;
  const score = typeof parsed.score === 'number' ? parsed.score : Number(parsed.score);
  const problems = Array.isArray(parsed.problems)
    ? parsed.problems.filter((item): item is string => typeof item === 'string')
    : [];
  if (!Number.isFinite(score)) throw new Error('Critic returned no score.');
  return { score, problems };
}

function isReusable(record: HookRecord): boolean {
  if (record.promptVersion !== PROMPT_VERSION) return false;
  if (record.acceptance === 'clean' || record.acceptance === 'flagged') return true;
  return record.acceptance === 'none' && record.validation.valid;
}

function acceptance(result: ReturnType<typeof validate>, strategy: Strategy): HookRecord['acceptance'] {
  if (result.issues.some((issue) => issue.code.startsWith('generation-'))) return 'failed';
  if (strategy === 'none') return 'none';
  if (!result.valid) return 'failed';
  return result.issues.length > 0 ? 'flagged' : 'clean';
}

function renderMarkdown(records: HookRecord[], title: string): string {
  const lines = [`# ${title}`, ''];
  const groups: Array<[HookRecord['acceptance'], string]> = [
    ['failed', 'Needs fixing (deterministic checks failed)'],
    ['flagged', 'Flagged for review'],
    ['clean', 'Clean'],
    ['none', 'No useful hook'],
  ];
  for (const [acceptance, heading] of groups) {
    const group = records.filter((record) => record.acceptance === acceptance);
    if (group.length === 0) continue;
    lines.push(`## ${heading} (${group.length})`, '');
    for (const record of group) {
      lines.push(`### ${record.character} — ${record.meaning ?? 'no meaning'} · ${record.strategy}`);
      const parts = record.parts
        .map((part) => {
          const used = record.componentsUsed.find((component) => component.glyph === part.glyph);
          const label = used?.label ?? part.suggestedLabel ?? part.glosses[0] ?? null;
          return `${part.glyph}${label ? `(${label})` : ''}${part.inside ? ` [inside ${part.inside}]` : ''}`;
        })
        .join(' · ');
      if (parts) lines.push('', `Parts: ${parts}`);
      if (record.hook) lines.push('', `> ${record.hook}`);
      if (record.reason) lines.push('', `Reason: ${record.reason}`);
      const issues = record.validation.issues;
      if (issues.length > 0) {
        lines.push('', `Issues: ${issues.map((issue) => `\`${issue.code}\` ${issue.message}`).join('; ')}`);
      }
      lines.push('');
    }
  }
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const flags = new Set(process.argv.slice(2));
  const execute = flags.has('--execute');
  const runAll = flags.has('--all');
  const force = flags.has('--force');
  const runCritic = flags.has('--critic');
  const criticMin = Number(process.env.MEMORY_HOOK_CRITIC_MIN || 4);
  const maxAttempts = Number(process.env.MEMORY_HOOK_ATTEMPTS || (runCritic ? 3 : 2));

  const planArtifact = loadJson<{ plans: PlanRecord[] }>(resolve(OUTPUT_DIR, 'book-1-plans.json'));
  const planByCharacter = new Map(planArtifact.plans.map((plan) => [plan.character, plan]));
  const profiles = loadJson<ComponentProfile[] | { profiles: ComponentProfile[] }>(
    resolve(OUTPUT_DIR, 'book-1-component-profiles-v2.json'),
  );
  const profileList = Array.isArray(profiles) ? profiles : profiles.profiles;
  const profileByKey = new Map(profileList.map((profile) => [profile.key, profile]));
  const curated = loadCuratedLabels();
  const direct = loadRuntimeDirectIndex();
  const reviewed = loadJson<ReviewedMeaning[] | { records: ReviewedMeaning[] }>(
    resolve(OUTPUT_DIR, 'book-1-frozen-47-reviewed-construction-meanings-v1.json'),
  );
  const reviewedList = Array.isArray(reviewed) ? reviewed : reviewed.records;
  const reviewedByCharacter = new Map(reviewedList.map((record) => [record.character, record]));

  const inventory = loadJson<{ entries: Array<{ character: string; meaningDecision: PlanRecord['meaningDecision'] }> }>(
    resolve(OUTPUT_DIR, 'book-1-inventory.json'),
  );
  const inventoryByCharacter = new Map(inventory.entries.map((entry) => [entry.character, entry]));

  const sampleFileIndex = process.argv.indexOf('--sample-file');
  const sampleCharacters = sampleFileIndex > -1
    ? loadJson<{ characters: string[] }>(process.argv[sampleFileIndex + 1]).characters
    : null;
  const characters = sampleCharacters
    ?? (runAll ? planArtifact.plans.map((plan) => plan.character) : reviewedList.map((record) => record.character));
  const stemFlagIndex = process.argv.indexOf('--stem');
  const stem = stemFlagIndex > -1
    ? process.argv[stemFlagIndex + 1]
    : runAll ? 'book-1-hooks-v3' : 'book-1-calibration-hooks-v1';
  const jsonPath = resolve(OUTPUT_DIR, `${stem}.json`);
  const mdPath = resolve(OUTPUT_DIR, `${stem}.md`);

  const priorAll = existsSync(jsonPath)
    ? loadJson<{ records: HookRecord[] }>(jsonPath).records
    : [];
  const prior = force ? [] : priorAll;
  const priorByCharacter = new Map(prior.map((record) => [record.character, record]));
  const provider = execute ? resolveProvider() : null;

  if (!execute) {
    const sampleFlagIndex = process.argv.indexOf('--sample');
    const sampleCharacter = sampleFlagIndex > -1 ? process.argv[sampleFlagIndex + 1] : characters[0];
    const plan = planByCharacter.get(sampleCharacter);
    const reviewedRecord = reviewedByCharacter.get(sampleCharacter);
    const meaning = reviewedRecord?.constructionMeaning ?? plan?.meaningDecision.selectedMeaning ?? null;
    const components = plan ? resolveParts(plan, profileByKey, curated, direct) : [];
    const samplePinyin = plan?.meaningDecision.selectedPinyin ?? null;
    console.log(JSON.stringify({
      dryRun: true,
      characters: characters.length,
      sampleCharacter,
      samplePrompt: JSON.parse(buildPrompt({
        character: sampleCharacter,
        meaning: meaning ?? '',
        pinyin: samplePinyin,
        components: components.map((part) => ({
          ...part,
          phonetic: Boolean(samplePinyin && !part.unknown && part.readings.some((reading) => soundsAlike(reading, samplePinyin))),
        })),
      }, [])),
    }, null, 2));
    return;
  }

  let apiCalls = 0;
  const concurrency = Math.max(1, Number(process.env.MEMORY_HOOK_CONCURRENCY || 6));
  const indexed: Array<HookRecord | null> = new Array(characters.length).fill(null);
  let completed = 0;
  let aborted = false;
  let abortMessage: string | null = null;

  const mergeForSave = (finished: HookRecord[]): HookRecord[] => {
    if (!sampleCharacters) return finished;
    const scope = new Set(characters);
    const byCharacter = new Map([
      ...priorAll.filter((record) => !scope.has(record.character)),
      ...finished,
    ].map((record) => [record.character, record]));
    return planArtifact.plans
      .map((plan) => byCharacter.get(plan.character))
      .filter((record): record is HookRecord => Boolean(record));
  };

  const saveProgress = (): void => {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    const finished = mergeForSave(indexed.filter((record): record is HookRecord => record !== null));
    writeFileSync(jsonPath, `${JSON.stringify({
      schemaVersion: 1,
      distribution: 'development-only-candidate',
      publishable: false,
      model: provider?.model ?? 'unknown',
      promptVersion: PROMPT_VERSION,
      records: finished,
    }, null, 2)}\n`);
    writeFileSync(mdPath, renderMarkdown(finished, stem === 'book-1-calibration-hooks-v1'
      ? 'Book 1 memory hook calibration (47 characters)'
      : `Book 1 memory hooks — ${stem}`));
  };

  const processCharacter = async (index: number): Promise<void> => {
    const character = characters[index];
    const plan = planByCharacter.get(character);
    const reviewedRecord = reviewedByCharacter.get(character);
    const inventoryRecord = inventoryByCharacter.get(character);
    const fromReviewed = reviewedRecord?.status === 'approved' && Boolean(reviewedRecord.constructionMeaning);
    const meaning = fromReviewed
      ? reviewedRecord!.constructionMeaning
      : inventoryRecord?.meaningDecision.selectedMeaning ?? plan?.meaningDecision.selectedMeaning ?? null;
    const cached = priorByCharacter.get(character);
    if (cached && isReusable(cached) && (cached.meaning ?? null) === (meaning ?? null)) {
      indexed[index] = cached;
      return;
    }
    const pinyin = reviewedRecord?.constructionReading
      ?? plan?.meaningDecision.selectedPinyin
      ?? inventoryRecord?.meaningDecision.selectedPinyin
      ?? null;
    const components = plan ? resolveParts(plan, profileByKey, curated, direct) : [];

    if (!plan || !meaning) {
      indexed[index] = {
        character,
        meaning,
        meaningSource: meaning ? (fromReviewed ? 'reviewed-construction' : 'inventory') : 'missing',
        pinyin,
        strategy: 'none',
        hook: null,
        componentsUsed: [],
        parts: components,
        reason: !plan ? 'missing-plan' : 'missing-canonical-meaning',
        validation: { valid: true, issues: [] },
        attempts: 0,
        acceptance: 'none',
        model: provider?.model ?? 'unknown',
        promptVersion: PROMPT_VERSION,
      };
      return;
    }

    const promptComponents = components.map((part) => ({
      ...part,
      phonetic: Boolean(pinyin && !part.unknown && part.readings.some((reading) => soundsAlike(reading, pinyin))),
    }));
    const input = { character, meaning, pinyin, components: promptComponents };
    const suppliedGlyphs = new Set([
      ...components.map((item) => item.glyph),
      ...components.flatMap((item) => item.aliases),
    ]);
    const aliasesByGlyph = new Map(components
      .filter((item) => item.aliases.length > 0)
      .map((item) => [item.glyph, item.aliases]));
    const unknownGlyphs = new Set(components.filter((item) => item.unknown).map((item) => item.glyph));
    const phoneticGlyphs = new Set(components.filter((item) => (
      !item.unknown && pinyin && item.readings.some((reading) => soundsAlike(reading, pinyin))
    )).map((item) => item.glyph));
    const requiredGlyphs = new Set(components
      .filter((item) => !item.unknown && !phoneticGlyphs.has(item.glyph))
      .map((item) => item.glyph));
    const readingsByGlyph = new Map(components.map((item) => [item.glyph, item.readings]));
    let candidate = { strategy: 'none' as Strategy, hook: null as string | null, componentsUsed: [] as UsedComponent[], reason: null as string | null };
    let validation = { valid: true, issues: [] as HookIssue[] };
    let attempts = 0;
    let criticProblems: string[] = [];
    while (attempts < maxAttempts) {
      attempts += 1;
      apiCalls += 1;
      const feedback = [
        ...validation.issues
          .filter((issue) => issue.severity === 'error' || issue.severity === 'flag')
          .map((issue) => issue.message),
        ...criticProblems,
      ];
      criticProblems = [];
      try {
        candidate = await generate(provider!, input, feedback);
        validation = validate({
          character,
          meaning,
          pinyin,
          suppliedGlyphs,
          unknownGlyphs,
          requiredGlyphs,
          curatedLabels: curated.labels,
          aliasesByGlyph,
          readingsByGlyph,
        }, candidate);
      } catch (error: unknown) {
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 402 || status === 403 || (error as { fatal?: boolean }).fatal) throw error;
        if (status === 429) {
          console.log(`[throttled] ${character} — waiting 5s`);
          await delay(5000);
          candidate = { strategy: 'none', hook: null, componentsUsed: [], reason: null };
          validation = {
            valid: false,
            issues: [{ code: 'generation-throttled', severity: 'error', message: 'Rate limited (HTTP 429); retrying.' }],
          };
        } else {
          candidate = { strategy: 'none', hook: null, componentsUsed: [], reason: null };
          validation = {
            valid: false,
            issues: [{
              code: status ? 'generation-failed' : 'generation-invalid',
              severity: 'error',
              message: error instanceof Error ? error.message : String(error),
            }],
          };
        }
      }
      if (validation.issues.some((issue) => issue.code === 'generation-failed')) break;
      if (!validation.valid || validation.issues.length > 0) continue;
      if (!runCritic || candidate.strategy === 'none' || !candidate.hook) break;
      apiCalls += 1;
      try {
        const review = await critique(provider!, input, candidate);
        if (review.score >= criticMin) break;
        criticProblems = [`A reviewer scored the previous hook ${review.score}/5. ${review.problems.join('; ')}`];
        validation = {
          valid: true,
          issues: [...validation.issues, {
            code: 'critic-low',
            severity: 'flag',
            message: `Critic ${review.score}/5${review.problems.length > 0 ? `: ${review.problems.join('; ') || 'rewrite with a more concrete, honest scene'}` : ''}`,
          }],
        };
        continue;
      } catch (error: unknown) {
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 402 || status === 403 || (error as { fatal?: boolean }).fatal) throw error;
        validation = {
          valid: validation.valid,
          issues: [...validation.issues, {
            code: 'critic-failed',
            severity: 'flag',
            message: error instanceof Error ? error.message : String(error),
          }],
        };
        break;
      }
    }

    indexed[index] = {
      character,
      meaning,
      meaningSource: fromReviewed ? 'reviewed-construction' : 'inventory',
      pinyin,
      strategy: candidate.strategy,
      hook: candidate.strategy === 'none' ? null : candidate.hook,
      componentsUsed: candidate.componentsUsed,
      parts: components,
      reason: candidate.reason,
      validation,
      attempts,
      acceptance: acceptance(validation, candidate.strategy),
      model: provider!.model,
      promptVersion: PROMPT_VERSION,
    };
  };

  const queue = characters.map((_, index) => index);
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (!aborted && queue.length > 0) {
      const index = queue.shift()!;
      try {
        await processCharacter(index);
      } catch (error: unknown) {
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 402 || status === 403 || (error as { fatal?: boolean }).fatal) {
          aborted = true;
          abortMessage = error instanceof Error ? error.message : String(error);
          return;
        }
        throw error;
      }
      completed += 1;
      if (completed % 10 === 0 || completed === characters.length) {
        saveProgress();
        console.log(`[${completed}/${characters.length}] checkpoint saved`);
      }
      await delay(Number(process.env.MEMORY_HOOK_THROTTLE_MS || 250));
    }
  });
  await Promise.all(workers);
  saveProgress();

  if (abortMessage) {
    console.error(`Run aborted: ${abortMessage}`);
    console.error(`Progress saved (${completed}/${characters.length} completed). Re-run the same command to resume.`);
    process.exitCode = 1;
    return;
  }

  const records = mergeForSave(indexed.filter((record): record is HookRecord => record !== null));

  const counts = records.reduce<Record<string, number>>((accumulator, record) => {
    accumulator[record.acceptance] = (accumulator[record.acceptance] ?? 0) + 1;
    return accumulator;
  }, {});
  console.log(JSON.stringify({
    provider: provider?.provider,
    model: provider?.model,
    promptVersion: PROMPT_VERSION,
    characters: records.length,
    apiCalls,
    counts,
    jsonPath,
    mdPath,
    publishable: false,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

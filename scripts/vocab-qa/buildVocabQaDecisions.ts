import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const VOCAB_DIR = resolve(ROOT, 'public/data/vocabulary');
const OUTPUT_DIR = resolve(ROOT, 'output/vocab-qa');
const BOOKS = [1, 2, 3, 4];

interface VocabularyRow {
  id: string;
  traditional: string | null;
  simplified: string | null;
  meaning: string | null;
  pinyin: string | null;
  pos: string | null;
  audio: string | null;
  examples: string | null;
}

interface AuditIssue {
  code: string;
  field: string;
  severity: string;
  message: string;
  suggestion: string | null;
}

interface Decision {
  id: string;
  bookId: number;
  word: string;
  field: 'meaning' | 'pinyin' | 'examples' | 'audio' | 'pos';
  current: string;
  proposed: string;
  source: 'deterministic' | 'llm' | 'reviewer';
  code: string;
  reason: string;
}

/** Part-of-speech tags approved for the six rows that had none. */
const POS_FILLS = new Map<string, { pos: string; word: string }>([
  ['B2L02-1-35', { pos: 'Ptc', word: '哈哈哈' }],
  ['B2L10-2-23', { pos: 'Ptc', word: '的話' }],
  ['B2L11-1-27', { pos: 'Vp', word: '看出來' }],
  ['B2L12-1-33', { pos: 'Vp', word: '再說' }],
  ['B2L12-2-24', { pos: 'Vp', word: '敬上' }],
  ['B2L16-1-33', { pos: 'Ptc', word: '得很' }],
]);

/** LLM findings rejected after review (Taiwan conventions, style, self-contradictions). */
const REJECTED = new Map<string, string>([
  ['B3L09-1-11', 'User decision: keep jiàoxué (Taiwan MOE reading for teaching).'],
  ['B1L09-1-05', 'Not an error: this corpus writes neutral-tone syllables attached (zhēnde), matching every other 的-ending entry.'],
  ['B1L09-2-09', 'Same neutral-tone spacing style as 真的; style-only change.'],
  ['B4L02-1-51', 'Same neutral-tone spacing style; 得 stays attached (jíde).'],
  ['B2L02-2-22', 'Taiwan reading is lèsè tǒng; the model suggested the mainland lājī.'],
  ['B3L10-2-11', 'Taiwan reading is zhǔjiǎo; zhǔjué is the mainland standard.'],
  ['B3L11-2-15', 'Taiwan MOE reading for 友誼 is yǒuyí; yǒuyì is mainland.'],
  ['B3L12-2-03', 'Taiwan reading for 企業 is qìyè (4th tone); qǐyè is mainland.'],
  ['B3L13-2-26', '一 before a 1st-tone syllable sandhis to yì; yìfāngmiàn is correct.'],
  ['B3L14-1-07', 'Taiwan textbooks keep the full tone: gūniáng.'],
  ['B4L05-2-24', 'Model flagged then concluded the pinyin is correct; no change.'],
]);

/** Reviewer wordings that replace the model suggestion. */
const OVERRIDES = new Map<string, { field: Decision['field']; proposed: string; reason: string }>([
  ['B1L02-2-04', { field: 'meaning', proposed: 'to want to do something', reason: 'Gloss had a stray space and "verb/" bookkeeping; rewritten plainly.' }],
  ['B4L07-2-21', { field: 'pinyin', proposed: 'rénshēng dìbùshú', reason: 'User decision: MOE standard reading shú.' }],
  ['B3L13-1-18', { field: 'meaning', proposed: 'e-mail address; inbox', reason: 'User decision: clearer than "E-mailbox".' }],
  ['B4L06-2-33', { field: 'meaning', proposed: 'A minute on stage takes ten years of practice', reason: 'Gloss style drops the trailing period.' }],
]);

/** Findings that need a human decision (no safe automated replacement). */


function loadRows(): Map<string, VocabularyRow> {
  const rows = BOOKS.flatMap(
    (bookId) => (JSON.parse(readFileSync(resolve(VOCAB_DIR, `book-${bookId}.json`), 'utf8')) as { items: VocabularyRow[] }).items,
  );
  return new Map(rows.map((row) => [row.id, row]));
}

function main(): void {
  const rows = loadRows();
  const audit = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'vocabulary-audit-v1.json'), 'utf8')) as {
    rows: Array<{ id: string; issues: AuditIssue[] }>;
  };
  const proofread = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'vocabulary-proofread-v1.json'), 'utf8')) as {
    records: Array<{ id: string; issues: Array<{ field: 'meaning' | 'pinyin'; severity: string; problem: string; suggestion: string | null }> }>;
  };

  const decisions: Decision[] = [];
  const rejected: Array<{ id: string; word: string; problem: string; reason: string }> = [];
  const needsCall: Array<{ id: string; word: string; note: string }> = [];

  const pushDecision = (id: string, field: Decision['field'], proposed: string, source: Decision['source'], code: string, reason: string): void => {
    const row = rows.get(id);
    if (!row) return;
    const current = field === 'pinyin'
      ? row.pinyin ?? ''
      : field === 'examples'
        ? row.examples ?? ''
        : field === 'audio'
          ? row.audio ?? ''
          : field === 'pos'
            ? row.pos ?? ''
            : row.meaning ?? '';
    if (current === proposed) return;
    decisions.push({ id, bookId: Number(id.match(/^B(\d+)/i)?.[1] ?? 0), word: row.traditional ?? '', field, current, proposed, source, code, reason });
  };

  for (const audited of audit.rows) {
    for (const issue of audited.issues) {
      if (!issue.suggestion) continue;
      if (issue.field !== 'meaning' && issue.field !== 'pinyin' && issue.field !== 'examples' && issue.field !== 'audio') continue;
      pushDecision(audited.id, issue.field, issue.suggestion, 'deterministic', issue.code, issue.message);
    }
  }

  for (const [id, fill] of POS_FILLS) {
    pushDecision(id, 'pos', fill.pos, 'reviewer', 'pos-fill', `POS fill approved for ${fill.word}.`);
  }

  for (const record of proofread.records) {
    for (const issue of record.issues) {
      const row = rows.get(record.id);
      if (!row) continue;
      const word = row.traditional ?? '';
      const override = OVERRIDES.get(record.id);
      if (override && override.field === issue.field) {
        pushDecision(record.id, issue.field, override.proposed, 'reviewer', `llm-${issue.field}`, override.reason);
        continue;
      }
      if (REJECTED.has(record.id)) {
        rejected.push({ id: record.id, word, problem: issue.problem, reason: REJECTED.get(record.id)! });
        continue;
      }
      if (!issue.suggestion) {
        needsCall.push({ id: record.id, word, note: issue.problem });
        continue;
      }
      pushDecision(record.id, issue.field, issue.suggestion, 'llm', `llm-${issue.field}`, issue.problem);
    }
  }

  // Policy-level items from the deterministic audit without per-row safe fixes.
  const policy = [
    { code: 'example-html', note: '139 rows store examples separated by <br>; the app currently ignores these strings (no pinyin/English attached). Convert to JSON arrays or leave.' },
    { code: 'dup-row', note: '2 pairs of identical word+meaning rows in the same book (餐 B2, 滿 B3); textbook re-listing or true duplicates — decide.' },
    { code: 'audio-missing', note: '5 rows have an empty audio filename (阿里山小火車, 職業, 團圓, 天帝, 王母娘娘).' },
    { code: 'pos-missing', note: '6 rows have no POS (哈哈哈, 的話, 看出來, 再說, 敬上, 得很).' },
  ];

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const artifact = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    note: 'Review file: no change reaches Supabase until approved. Deterministic fixes are format-only; llm fixes are content changes with reviewer adjudication.',
    decisions,
    rejected,
    needsCall,
    policy,
  };
  writeFileSync(resolve(OUTPUT_DIR, 'vocabulary-qa-decisions-v1.json'), `${JSON.stringify(artifact, null, 2)}\n`);

  const lines: string[] = [
    '# Vocabulary QA decisions v1',
    '',
    `Generated: ${artifact.generatedAt}`,
    '',
    `Decisions: ${decisions.length} · Rejected model findings: ${rejected.length} · Needs your call: ${needsCall.length}`,
    '',
  ];
  const byCode = new Map<string, Decision[]>();
  for (const decision of decisions) {
    const list = byCode.get(decision.code) ?? [];
    list.push(decision);
    byCode.set(decision.code, list);
  }
  for (const [code, list] of [...byCode.entries()].sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`## ${code} (${list.length})`, '');
    for (const decision of list) {
      lines.push(`- **${decision.id} ${decision.word}** · ${decision.field}`);
      lines.push(`  - now: ${decision.current}`);
      lines.push(`  - new: ${decision.proposed}`);
      lines.push(`  - why: ${decision.reason}`);
    }
    lines.push('');
  }
  lines.push(`## Rejected model findings (${rejected.length})`, '');
  for (const item of rejected) lines.push(`- ${item.id} ${item.word} — ${item.reason}`);
  lines.push('', `## Needs your call (${needsCall.length})`, '');
  for (const item of needsCall) lines.push(`- ${item.id} ${item.word} — ${item.note}`);
  lines.push('', '## Policy items', '');
  for (const item of policy) lines.push(`- ${item.code}: ${item.note}`);
  lines.push('');
  writeFileSync(resolve(OUTPUT_DIR, 'vocabulary-qa-review-v1.md'), `${lines.join('\n')}\n`);

  const summary: Record<string, number> = {};
  for (const decision of decisions) summary[decision.code] = (summary[decision.code] ?? 0) + 1;
  console.log(JSON.stringify({ decisions: decisions.length, byCode: summary, rejected: rejected.length, needsCall: needsCall.length }, null, 2));
  if (!existsSync(resolve(OUTPUT_DIR, 'vocabulary-qa-review-v1.md'))) throw new Error('review file missing');
}

main();

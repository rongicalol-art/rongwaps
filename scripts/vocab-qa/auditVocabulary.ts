import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

interface Issue {
  code: string;
  field: 'meaning' | 'pinyin' | 'pos' | 'examples' | 'audio' | 'row';
  severity: 'error' | 'flag';
  message: string;
  suggestion: string | null;
}

interface AuditedRow {
  id: string;
  bookId: number;
  traditional: string;
  pinyin: string;
  pos: string;
  meaning: string;
  issues: Issue[];
}

const HAN = /\p{Script=Han}/u;
const HAN_RUN = /^\p{Script=Han}+/u;
const PINYIN_ALLOWED = /^[\p{Script=Latin}\s/()?,、…0-9'’-]*$/u;
const TONE_MARK = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛÜ]/;
/** Particles are written with neutral tone (no mark) by convention. */
const NEUTRAL_TONE_WORDS = new Set(['嗎', '呢', '的', '個', '了', '吧', '得', '著', '地', '嘛', '啦', '哇', '哪', '嘍']);
const POS_ATOMS = new Set([
  'N', 'V', 'Vi', 'Vst', 'Vs', 'Vaux', 'Vp', 'Vpt', 'Vs-pred', 'Vs-attr', 'Vs-sep', 'V-sep', 'Vp-sep',
  'Adv', 'Det', 'Ptc', 'Ph', 'Conj', 'Prep', 'M', 'Name', 'Suf',
]);

function isValidPos(pos: string): boolean {
  return pos.split('/').every((atom) => POS_ATOMS.has(atom));
}

function bookIdOf(id: string): number {
  const match = id.match(/^B(\d+)/i);
  return match ? Number(match[1]) : 0;
}

/** Canonical measure-word pinyin, spaced: `M: 張 zhāng, 個 gè`. */
const MEASURE_WORD_PINYIN: Record<string, string> = {
  本: 'běn', 朵: 'duǒ', 枝: 'zhī', 件: 'jiàn', 家: 'jiā', 個: 'gè', 間: 'jiān', 棟: 'dòng',
  張: 'zhāng', 台: 'tái', 隻: 'zhī', 部: 'bù', 支: 'zhī', 輛: 'liàng', 首: 'shǒu', 條: 'tiáo',
  封: 'fēng', 架: 'jià', 雙: 'shuāng', 種: 'zhǒng', 國: 'guó', 盤: 'pán', 道: 'dào', 場: 'chǎng',
  棵: 'kē', 頭: 'tóu', 塊: 'kuài', 匹: 'pǐ', 份: 'fèn', 副: 'fù', 把: 'bǎ', 根: 'gēn',
  股: 'gǔ', 片: 'piàn', 面: 'miàn', 盞: 'zhǎn', 座: 'zuò', 顆: 'kē', 位: 'wèi', 客: 'kè',
  瓶: 'píng', 罐: 'guàn', 頂: 'dǐng', 篇: 'piān', 所: 'suǒ', 則: 'zé', 筆: 'bǐ', 套: 'tào',
  對: 'duì', 幅: 'fú',
};

/** Normalize one `M: ...` fragment to `M: 甲 jiǎ, 乙 yǐ`; returns null when a measure word is unknown. */
function normalizeMeasureWords(fragment: string): { canonical: string; unknown: string[] } | null {
  const body = fragment.replace(/^M:\s*/, '');
  const tokens = body
    .split(/[,，、/]/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => (token.match(HAN_RUN)?.[0] ?? '').trim())
    .filter(Boolean);
  const unknown = [...new Set(tokens.filter((token) => !MEASURE_WORD_PINYIN[token]))];
  if (unknown.length > 0) return null;
  const canonical = [...new Set(tokens)].map((token) => `${token} ${MEASURE_WORD_PINYIN[token]}`);
  return { canonical: `M: ${canonical.join(', ')}`, unknown: [] };
}

function auditMeaning(meaning: string): Issue[] {
  const issues: Issue[] = [];
  const mSegments = meaning.match(/M:\s*[^)]*/g) ?? [];
  let suggestion = meaning;
  let mFixed = false;
  let mUnknown = false;
  for (const segment of mSegments) {
    const normalized = normalizeMeasureWords(segment);
    if (!normalized) {
      mUnknown = true;
      continue;
    }
    if (normalized.canonical !== segment.trim()) {
      suggestion = suggestion.replace(segment, normalized.canonical);
      mFixed = true;
    }
  }
  if (mFixed) {
    issues.push({
      code: 'm-format',
      field: 'meaning',
      severity: 'flag',
      message: 'Measure-word format is not canonical (Han + space + pinyin, comma + space).',
      suggestion,
    });
  }
  if (mUnknown) {
    issues.push({
      code: 'm-unknown',
      field: 'meaning',
      severity: 'flag',
      message: 'Measure word missing from the pinyin table.',
      suggestion: null,
    });
  }
  if (/\.$/.test(meaning.trim()) && !/\.\.\.$/.test(meaning.trim())) {
    const stripped = meaning.trim().replace(/\.$/, '');
    issues.push({
      code: 'meaning-trailing-period',
      field: 'meaning',
      severity: 'flag',
      message: 'Meaning ends with a period; gloss style drops it.',
      suggestion: stripped,
    });
  }
  if (/ {2,}/.test(meaning) || /\s+[;,)]/.test(meaning) || /[(]\s+/.test(meaning)) {
    issues.push({
      code: 'meaning-spacing',
      field: 'meaning',
      severity: 'flag',
      message: 'Meaning has irregular spacing.',
      suggestion: meaning.replace(/ {2,}/g, ' ').replace(/\s+([;,).])/g, '$1'),
    });
  }
  if (meaning !== meaning.trim()) {
    issues.push({
      code: 'meaning-trim',
      field: 'meaning',
      severity: 'error',
      message: 'Meaning has leading or trailing whitespace.',
      suggestion: meaning.trim(),
    });
  }
  return issues;
}

function auditPinyin(row: VocabularyRow): Issue[] {
  const issues: Issue[] = [];
  const pinyin = row.pinyin ?? '';
  const traditional = row.traditional ?? '';
  if (!pinyin.trim()) {
    if (HAN.test(traditional)) {
      issues.push({ code: 'pinyin-missing', field: 'pinyin', severity: 'error', message: 'Pinyin is empty.', suggestion: null });
    }
    return issues;
  }
  if (!PINYIN_ALLOWED.test(pinyin)) {
    const bad = [...new Set([...pinyin].filter((char) => !/[\p{Script=Latin}\s/()?,、…0-9'’-]/u.test(char)))];
    issues.push({
      code: 'pinyin-charset',
      field: 'pinyin',
      severity: 'error',
      message: `Pinyin has unexpected characters: ${bad.join(' ')}`,
      suggestion: null,
    });
  }
  if (HAN.test(traditional) && !NEUTRAL_TONE_WORDS.has(traditional) && !TONE_MARK.test(pinyin) && /[a-zA-Z]/.test(pinyin)) {
    issues.push({
      code: 'pinyin-no-tone',
      field: 'pinyin',
      severity: 'error',
      message: 'Pinyin has no tone mark.',
      suggestion: null,
    });
  }
  return issues;
}

function auditExamples(examples: string | null): Issue[] {
  if (!examples || !examples.trim()) return [];
  const text = examples.trim();
  const issues: Issue[] = [];
  if (/<br\s*\/?>/i.test(text)) {
    const sentences = text
      .split(/<br\s*\/?>/i)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .map((chinese) => ({ chinese, pinyin: '', english: '' }));
    issues.push({
      code: 'example-br',
      field: 'examples',
      severity: 'flag',
      message: 'Examples are <br>-separated; convert to a JSON array.',
      suggestion: JSON.stringify(sentences),
    });
    return issues;
  }
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.every((item) => item && typeof item.chinese === 'string')) return issues;
    } catch {
      issues.push({
        code: 'example-json',
        field: 'examples',
        severity: 'error',
        message: 'Example starts with "[" but is not a valid JSON array.',
        suggestion: null,
      });
      return issues;
    }
  }
  if (/<[a-z]+>/i.test(text)) {
    issues.push({
      code: 'example-html',
      field: 'examples',
      severity: 'flag',
      message: 'Example contains HTML tags or inline POS annotations.',
      suggestion: null,
    });
  }
  if (!/[。！？…][」』）)]*$/.test(text)) {
    issues.push({
      code: 'example-punctuation',
      field: 'examples',
      severity: 'flag',
      message: 'Example does not end with Chinese sentence punctuation.',
      suggestion: null,
    });
  }
  return issues;
}

function main(): void {
  const audited: AuditedRow[] = [];
  const counts = new Map<string, number>();

  for (const bookId of BOOKS) {
    const pack = JSON.parse(readFileSync(resolve(VOCAB_DIR, `book-${bookId}.json`), 'utf8')) as {
      items: VocabularyRow[];
    };
    const seen = new Map<string, VocabularyRow[]>();
    for (const row of pack.items) {
      const list = seen.get(row.traditional ?? '') ?? [];
      list.push(row);
      seen.set(row.traditional ?? '', list);
    }

    for (const row of pack.items) {
      const issues: Issue[] = [];
      issues.push(...auditMeaning(row.meaning ?? ''));
      issues.push(...auditPinyin(row));
      issues.push(...auditExamples(row.examples));
      if (!row.pos) {
        issues.push({ code: 'pos-missing', field: 'pos', severity: 'flag', message: 'POS is empty.', suggestion: null });
      } else if (!isValidPos(row.pos)) {
        issues.push({ code: 'pos-unknown', field: 'pos', severity: 'flag', message: `Unknown POS "${row.pos}".`, suggestion: null });
      }
      const expectedAudio = `modernchinese-${row.id}.mp3`;
      if (!row.audio) {
        issues.push({ code: 'audio-missing', field: 'audio', severity: 'flag', message: 'Audio filename is empty.', suggestion: null });
      } else if (row.audio !== expectedAudio) {
        issues.push({
          code: 'audio-pattern',
          field: 'audio',
          severity: 'error',
          message: `Audio should be ${expectedAudio}.`,
          suggestion: expectedAudio,
        });
      }
      const sameWord = (seen.get(row.traditional ?? '') ?? []).filter((other) => other.id !== row.id);
      for (const other of sameWord) {
        if ((other.meaning ?? '') === (row.meaning ?? '')) {
          issues.push({
            code: 'dup-row',
            field: 'row',
            severity: 'flag',
            message: `Duplicates ${other.id} with the same traditional and meaning.`,
            suggestion: null,
          });
          break;
        }
      }
      if (issues.length > 0) {
        audited.push({
          id: row.id,
          bookId,
          traditional: row.traditional ?? '',
          pinyin: row.pinyin ?? '',
          pos: row.pos ?? '',
          meaning: row.meaning ?? '',
          issues,
        });
        for (const issue of issues) counts.set(issue.code, (counts.get(issue.code) ?? 0) + 1);
      }
    }
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    books: BOOKS,
    rowsWithIssues: audited.length,
    issueCounts: Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1])),
    rows: audited,
  };
  writeFileSync(resolve(OUTPUT_DIR, 'vocabulary-audit-v1.json'), `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    '# Vocabulary audit v1',
    '',
    `Generated: ${report.generatedAt}`,
    `Rows with issues: ${audited.length}`,
    '',
    '| code | count |',
    '| --- | --- |',
    ...[...counts.entries()].sort((left, right) => right[1] - left[1]).map(([code, count]) => `| ${code} | ${count} |`),
    '',
  ];
  for (const [code] of [...counts.entries()].sort((left, right) => right[1] - left[1])) {
    lines.push(`## ${code}`, '');
    const examples = audited.flatMap((row) => row.issues.filter((issue) => issue.code === code).map((issue) => ({ row, issue })));
    for (const { row, issue } of examples.slice(0, 15)) {
      lines.push(`- ${row.id} ${row.traditional} — ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`  - current: ${code.startsWith('pinyin') || code.startsWith('audio') ? row.pinyin : row.meaning}`);
        lines.push(`  - suggestion: ${issue.suggestion}`);
      }
    }
    if (examples.length > 15) lines.push(`- …and ${examples.length - 15} more`);
    lines.push('');
  }
  writeFileSync(resolve(OUTPUT_DIR, 'vocabulary-audit-v1.md'), `${lines.join('\n')}\n`);

  console.log(JSON.stringify({ rowsWithIssues: audited.length, issueCounts: report.issueCounts }, null, 2));
}

main();

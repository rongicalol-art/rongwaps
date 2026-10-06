import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The learner pool: the characters a RongWaps learner may meet in breakdown
 * relations (sound clues, "Built with").
 *   - course: traditional characters from vocabulary books 1–4, keyed to
 *     their first book/lesson.
 *   - level: every other character in public/data/levels/levels.json (`tbcl`
 *     first, then the `hsk` gap fill; levels 1–7 on the TOCFL/TBCL scale),
 *     keyed to level then list order.
 *
 * Single owner of that rule. Relation packs are filtered to this pool at
 * build time so the app never shows simplified-only, archaic, or rare forms.
 */
export type PoolRank =
  | { tier: 'course'; bookId: number; lessonId: number }
  | { tier: 'level'; level: number; order: number };

const BOOK_IDS = [1, 2, 3, 4];

function isHanzi(char: string): boolean {
  return char >= '一' && char <= '鿿';
}

function lessonFromId(id: string): number {
  const match = /^B\d+L(\d+)/.exec(id);
  return match ? Number(match[1]) : 0;
}

interface LevelsFile {
  tbcl: { chars: Record<string, string> };
  hsk: { chars: Record<string, string> };
}

function readLevels(root: string): LevelsFile {
  return JSON.parse(readFileSync(resolve(root, 'public/data/levels/levels.json'), 'utf8')) as LevelsFile;
}

/** Characters of one levels section → level (1–7), in list order. */
function sectionLevels(section: { chars: Record<string, string> }, into: Map<string, number>): void {
  for (const [level, list] of Object.entries(section.chars).sort(([a], [b]) => Number(a) - Number(b))) {
    for (const char of Array.from(list)) if (!into.has(char)) into.set(char, Number(level));
  }
}

/** TBCL character → level (1–7), in list order. */
export function loadTbclCharLevels(root: string): Map<string, number> {
  const levels = new Map<string, number>();
  sectionLevels(readLevels(root).tbcl, levels);
  return levels;
}

/** Every levelled character (TBCL, then HSK gap fill) → level (1–7), in list order. */
export function loadLevelChars(root: string): Map<string, number> {
  const pack = readLevels(root);
  const levels = new Map<string, number>();
  sectionLevels(pack.tbcl, levels);
  sectionLevels(pack.hsk, levels);
  return levels;
}

export function loadLearnerPool(root: string): Map<string, PoolRank> {
  const pool = new Map<string, PoolRank>();
  for (const bookId of BOOK_IDS) {
    const path = resolve(root, `public/data/vocabulary/book-${bookId}.json`);
    if (!existsSync(path)) continue;
    const vocab = JSON.parse(readFileSync(path, 'utf8')) as {
      items: Array<{ id: string; traditional: string }>;
    };
    for (const item of vocab.items) {
      const lessonId = lessonFromId(item.id);
      for (const char of item.traditional) {
        if (!isHanzi(char)) continue;
        const current = pool.get(char);
        if (!current || (current.tier === 'course' && (bookId < current.bookId || (bookId === current.bookId && lessonId < current.lessonId)))) {
          pool.set(char, { tier: 'course', bookId, lessonId });
        }
      }
    }
  }

  let order = 0;
  for (const [char, level] of loadLevelChars(root)) {
    if (!pool.has(char)) pool.set(char, { tier: 'level', level, order });
    order++;
  }
  return pool;
}

/** Sort key: course characters by book/lesson, then levelled ones by level and list order. */
function poolSortKey(rank: PoolRank | undefined): [number, number, number] {
  if (!rank) return [2, 0, 0];
  return rank.tier === 'course' ? [0, rank.bookId, rank.lessonId] : [1, rank.level, rank.order];
}

export function compareByPoolRank(pool: Map<string, PoolRank>, a: string, b: string): number {
  const ka = poolSortKey(pool.get(a));
  const kb = poolSortKey(pool.get(b));
  return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
}

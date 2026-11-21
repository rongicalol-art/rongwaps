import { grammarPagePath } from '../../app/routes';
import type { PageMeta } from '../../hooks/usePageMeta';
import type { GrammarPageLink } from './grammarPageTypes';

const BRAND = " · Ron's Mandarin";

/** Search title leads with the pattern's own name; "Chinese Grammar" follows where it fits. */
export function grammarPageMeta([slug, bookId, lessonId, title, keyWord]: GrammarPageLink): PageMeta {
  // People search the Chinese word itself (吧, 因為…所以…), so a title without it gets it added.
  const named = keyWord ? `${title} (${keyWord})` : title;
  const full = `${named}: Chinese Grammar${BRAND}`;
  const what = `${title}: the rule in plain English, examples with pinyin and one sentence to build yourself.`;
  const where = ` Modern Chinese ${bookId}, Lesson ${lessonId}.`;
  return {
    title: full.length <= 65 ? full : `${named}${BRAND}`.length <= 65 ? `${named}${BRAND}` : `${title}${BRAND}`,
    // A long pattern name leaves no room for the book and lesson.
    description: what.length + where.length <= 160 ? what + where : what,
    socialDescription: `${title}: the rule, examples with pinyin and one sentence to build yourself. Free.`,
    path: grammarPagePath(slug),
  };
}

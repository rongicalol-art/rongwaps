import { grammarPagePath } from '../../app/routes';
import type { PageMeta } from '../../hooks/usePageMeta';
import type { GrammarPageLink } from './grammarPageTypes';

const BRAND = " · Ron's Mandarin";

/** Search title leads with the pattern's own name; "Chinese Grammar" follows where it fits. */
export function grammarPageMeta([slug, bookId, lessonId, title]: GrammarPageLink): PageMeta {
  const full = `${title}: Chinese Grammar${BRAND}`;
  return {
    title: full.length <= 65 ? full : `${title}${BRAND}`,
    description: `${title}: the rule in plain English, examples with pinyin and one sentence to build yourself. Modern Chinese ${bookId}, Lesson ${lessonId}.`,
    socialDescription: `${title}: the rule, examples with pinyin and one sentence to build yourself. Free.`,
    path: grammarPagePath(slug),
  };
}

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { wordListInfo } from './wordListMeta';
import { loadSearchableWords, searchWords, type WordSearchHit } from './wordSearch';

type Loaded = Awaited<ReturnType<typeof loadSearchableWords>>;

/**
 * What a search across every level found: the word, its level, and a link to the page of the
 * list that shows it. The other levels download on the first search, not with the page.
 */
export function WordSearchResults({ query, onPick }: { query: string; onPick: (hit: WordSearchHit) => void }) {
  const [words, setWords] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    loadSearchableWords().then((loaded) => { if (live) setWords(loaded); }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);
  const typed = useDeferredValue(query);
  const hits = useMemo(() => (words ? searchWords(words, typed) : []), [words, typed]);

  if (failed) return <p className="text-base font-bold text-ui-ink">Couldn’t load the other levels. Check your connection and try again.</p>;
  if (!words) return <p className="text-base font-bold text-ui-muted-strong">Loading every level…</p>;
  if (hits.length === 0) return <p className="text-base font-bold text-ui-ink">No TOCFL word matches “{typed.trim()}”.</p>;
  return (
    <ul aria-label="Words found" className="divide-y-2 divide-ui-divider">
      {hits.map((hit) => {
        const [hanzi, pinyin, meaning] = hit.word;
        return (
          <li key={`${hit.entry.slug} ${hanzi} ${pinyin}`}>
            <Link to={hit.path} onClick={() => onPick(hit)} className="flex items-center gap-4 rounded-xs py-3 hover:bg-ui-hover focus-ring-inline">
              <span lang="zh-Hant" className="min-w-[5.5rem] shrink-0 font-chinese text-2xl font-semibold text-ui-ink-strong">{hanzi}</span>
              <span className="flex min-w-0 flex-1 flex-wrap gap-x-2.5 text-base">
                <span className="font-black text-ui-ink-strong">{pinyin}</span>
                <span className="font-bold text-ui-ink">{meaning}</span>
              </span>
              <span className="shrink-0 rounded-xs border-2 border-ui-border px-2 py-0.5 text-sm font-black text-ui-muted-strong">{wordListInfo(hit.entry).label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

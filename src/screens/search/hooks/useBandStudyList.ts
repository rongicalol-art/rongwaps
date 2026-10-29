import { useEffect, useMemo, useState } from 'react';
import { useLevels } from '../../../hooks/useLevels';
import { getDictionaryEntriesBatch } from '../../../services/dictionaryService';
import type { DictionaryListEntry } from '../../../types/models';
import { unknownBandChars, type TocflBand, type TocflReadiness } from '../../../utils/lesson/tocflReadiness';
import { sanitizeDictionaryDefinitions } from '../../../utils/vocabulary/dictionaryDefinitions';

/** The results list shows 50 rows, so only those are looked up. */
const LIST_SIZE = 50;

/** Dictionary rows for the band's characters the learner doesn't know yet; empty while `band` is null. */
export function useBandStudyList(band: TocflBand | null, readiness: TocflReadiness | null) {
  const levels = useLevels();
  const chars = useMemo(
    () => (band && levels && readiness ? unknownBandChars(levels.tbcl.chars, readiness.knownChars, band).slice(0, LIST_SIZE) : []),
    [band, levels, readiness],
  );
  const [results, setResults] = useState<DictionaryListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setResults([]);
    if (chars.length === 0) {
      setIsLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setIsLoading(true);
    getDictionaryEntriesBatch(chars, controller.signal)
      .then((entries) => {
        setResults(chars.flatMap((char) => {
          const entry = entries.get(char);
          if (!entry) return [];
          return [{
            id: char,
            traditional: entry.traditional || char,
            simplified: entry.simplified || char,
            pinyin_accented: entry.pinyin?.[0] ?? '',
            definitions: sanitizeDictionaryDefinitions(entry.definitions).definitions,
          }];
        }));
      })
      .catch(() => { if (!controller.signal.aborted) setResults([]); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [chars]);

  return { results, isLoading };
}

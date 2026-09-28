import { numberToToneMarks } from '../../../utils/pinyin';
import type { DBDictionaryEntry } from '../../../types/database';

export function FallbackWords({
  word,
  fallbackWords,
  onOpenWord,
}: {
  word: string;
  fallbackWords: Array<{ word: string; entries: DBDictionaryEntry[] }>;
  onOpenWord: (word: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5 border-b border-ui-divider pb-5">
        <p className="text-lg font-extrabold leading-tight text-ui-ink">Read “{word}” as words</p>
        <p className="text-sm font-bold text-ui-muted-strong">
          Phrase has no single dictionary entry. Here are its useful word parts.
        </p>
      </div>
      <div className="overflow-hidden rounded-control border border-ui-divider">
        {fallbackWords.map(({ word: part, entries: partEntries }, idx) => (
          <button
            key={`${part}-${idx}`}
            type="button"
            onClick={() => onOpenWord(part)}
            className="grid w-full grid-cols-[minmax(72px,0.32fr)_minmax(0,1fr)] gap-4 border-t border-ui-divider bg-ui-surface p-4 text-left transition first:border-t-0 hover:bg-ui-hover focus-ring focus-visible:ring-inset"
          >
            <div>
              <span className="font-chinese text-3xl font-black text-ui-ink-strong">{part}</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(partEntries[0].pinyin || []).slice(0, 2).map((py, i) => (
                  <span key={i} className="text-xs font-bold text-brand-primary">
                    {numberToToneMarks(py)}
                  </span>
                ))}
              </div>
            </div>
            <ul className="space-y-1">
              {partEntries
                .flatMap((entry) => Object.values(entry.definitions ?? {}))
                .slice(0, 4)
                .map((definition, i) => (
                  <li key={i} className="text-sm font-bold leading-5 text-ui-ink">
                    <span className="mr-1.5 text-ui-muted">{i + 1}.</span>
                    {String(definition)}
                  </li>
                ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}

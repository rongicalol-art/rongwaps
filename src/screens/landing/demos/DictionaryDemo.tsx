import { useMemo, useState } from 'react';
import { AppIcon, IconActionButton, PlayfulNavIcon } from '../../../lib/widgets';
import { stripTones } from '../../../data/pinyinTables';
import { SAMPLE_WORDS } from '../sampleWords';
import { playWord } from './demoUtils';

const SUGGESTIONS = ['ni hao', 'xuexiao', 'tea', '生日', 'friend'];
const plain = (text: string) => stripTones(text.toLowerCase()).replace(/[\s'’]/g, '');

/** Search the lesson words by hanzi, pinyin (with or without tones) or English. */
export function DictionaryDemo() {
  const [query, setQuery] = useState('hao');
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SAMPLE_WORDS.slice(0, 6);
    const key = plain(q);
    return SAMPLE_WORDS.filter(([hanzi, pinyin, meaning]) => hanzi.includes(q) || (key && plain(pinyin).startsWith(key)) || meaning.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  return (
    <div className="flex w-full max-w-lg flex-col gap-3">
      <label className="flex items-center gap-3 rounded-control border-2 border-ui-border bg-ui-canvas px-4 py-2.5 focus-within:border-brand-primary">
        <PlayfulNavIcon name="dictionary" className="size-6" />
        <span className="sr-only">Search the dictionary</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          className="w-full bg-transparent text-lg font-extrabold text-ui-ink-strong outline-none placeholder:text-ui-muted"
          placeholder="Hanzi, pinyin or English"
        />
      </label>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((suggestion) => (
          <button key={suggestion} type="button" onClick={() => setQuery(suggestion)} className="focus-ring rounded-xs border-2 border-ui-border px-2.5 py-0.5 text-sm font-extrabold text-ui-muted-strong hover:bg-ui-hover">
            {suggestion}
          </button>
        ))}
      </div>
      <ul className="flex flex-col">
        {results.map((word) => { const [hanzi, pinyin, meaning] = word; return (
          <li key={hanzi} className="flex items-center gap-4 border-b border-ui-divider px-1 py-2.5">
            <span className="min-w-20 font-chinese text-2xl text-ui-ink-strong">{hanzi}</span>
            <span className="min-w-0">
              <span className="block text-sm font-black text-ui-muted-strong">{pinyin}</span>
              <span className="block font-extrabold text-ui-ink">{meaning}</span>
            </span>
            <IconActionButton icon={<AppIcon name="audio" size={20} />} label={`Play ${hanzi}`} size="sm" variant="quiet" onClick={() => playWord(word)} className="ml-auto" />
          </li>
        ); })}
        {results.length === 0 && <li className="py-3 font-bold text-ui-muted-strong">Not in Lessons 1–2. The app has the full dictionary.</li>}
      </ul>
    </div>
  );
}

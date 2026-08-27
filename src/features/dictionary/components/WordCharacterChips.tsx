import { useEffect, useState } from 'react';
import { SectionEyebrow } from '../../../lib/widgets';
import { getDictionaryEntries } from '../../../services/dictionaryService';
import { sanitizeDictionaryDefinitions } from '../../../utils/dictionaryDefinitions';
import { numberToToneMarks } from '../../../utils/pinyin';

const HANZI_RE = /[\u3400-\u9FFF]/u;

interface CharacterChipInfo {
  char: string;
  pinyin: string;
  meaning: string;
}

export function WordCharacterChips({
  word,
  pushCharacter,
}: {
  word: string;
  pushCharacter: (char: string) => void;
}) {
  const chars = Array.from(word).filter((char) => HANZI_RE.test(char));
  const [infos, setInfos] = useState<CharacterChipInfo[]>([]);

  useEffect(() => {
    let active = true;
    setInfos([]);
    Promise.all(chars.map(async (char) => ({ char, entries: await getDictionaryEntries(char) })))
      .then((resolved) => {
        if (!active) return;
        setInfos(
          resolved.map(({ char, entries }) => {
            const entry = entries[0];
            const defs = sanitizeDictionaryDefinitions(entry?.definitions).definitions;
            return {
              char,
              pinyin: entry?.pinyin?.[0] ? numberToToneMarks(entry.pinyin[0]) : '',
              meaning: defs[0] || '',
            };
          }),
        );
      })
      .catch(() => {
        if (active) setInfos([]);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);

  if (chars.length === 0) return null;

  return (
    <section aria-label="Characters">
      <SectionEyebrow title="Characters" />
      <div className="mt-1 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {chars.map((char, index) => {
          const info = infos[index];
          const hasInfo = Boolean(info?.pinyin || info?.meaning);
          return (
            <button
              key={`${char}-${index}`}
              type="button"
              onClick={() => pushCharacter(char)}
              aria-label={`Open breakdown for ${char}`}
              className={`flex min-h-[72px] items-center gap-2.5 rounded-compact bg-ui-surface px-3 py-2 shadow-[0_2px_0_var(--color-ui-divider)] outline-none transition-[background-color,transform,box-shadow] hover:bg-ui-surface-hover active:translate-y-px active:shadow-[0_1px_0_var(--color-ui-divider)] focus-visible:ring-4 focus-visible:ring-brand-primary/25 ${hasInfo ? '' : 'justify-center'}`}
            >
              <span className="shrink-0 font-chinese text-[28px] font-bold leading-none text-ui-ink-strong">{char}</span>
              <span className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate text-[11px] font-extrabold leading-tight text-brand-primary">{info?.pinyin || '\u00A0'}</span>
                <span className="line-clamp-2 text-[11px] font-bold leading-snug text-ui-muted">{info?.meaning || ''}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

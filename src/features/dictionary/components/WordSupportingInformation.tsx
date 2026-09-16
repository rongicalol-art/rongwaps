import { useState, useEffect } from 'react';
import { ReferenceRow, SectionEyebrow } from '../../../lib/widgets';
import { getDictionaryEntries } from '../../../services/dictionaryService';
import { sanitizeDictionaryDefinitions } from '../../../utils/dictionaryDefinitions';
import { numberToToneMarks } from '../../../utils/pinyin';
import type { SAMPLE_BOOKS } from '../../../data/books';
import type { WordRelatedWord } from '../hooks/useWordExtras';

const HANZI_RE = /[\u3400-\u9FFF]/u;
const SEE_ALL_CLASSES =
  'min-h-9 shrink-0 rounded-compact px-2.5 text-xs font-extrabold text-brand-primary transition-colors hover:bg-brand-primary/10 focus-ring';
const DEFAULT_VISIBLE_RELATED = 5;

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface CharacterInfo {
  char: string;
  pinyin: string;
  meaning: string;
}

export function hasWordSupportingInfo(
  word: string,
  relatedWords: WordRelatedWord[],
  isRelatedLoading: boolean,
): boolean {
  const chars = Array.from(word).filter((char) => HANZI_RE.test(char));
  return chars.length > 0 || isRelatedLoading || relatedWords.length > 0;
}

export function WordSupportingInformation({
  word,
  pushCharacter,
  relatedWords,
  isRelatedLoading,
  onOpenWord,
  activeBook,
}: {
  word: string;
  pushCharacter: (char: string) => void;
  relatedWords: WordRelatedWord[];
  isRelatedLoading: boolean;
  onOpenWord: (word: string) => void;
  activeBook: CourseBook;
}) {
  const chars = Array.from(word).filter((char) => HANZI_RE.test(char));
  const [charInfos, setCharInfos] = useState<CharacterInfo[]>([]);
  const [charsLoading, setCharsLoading] = useState(false);
  const [showAllRelated, setShowAllRelated] = useState(false);

  useEffect(() => {
    let active = true;
    setCharsLoading(true);
    Promise.all(chars.map(async (char) => ({ char, entries: await getDictionaryEntries(char) })))
      .then((resolved) => {
        if (!active) return;
        setCharInfos(
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
        setCharsLoading(false);
      })
      .catch(() => {
        if (active) {
          setCharInfos([]);
          setCharsLoading(false);
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);

  const visibleRelated = showAllRelated
    ? relatedWords
    : relatedWords.slice(0, DEFAULT_VISIBLE_RELATED);

  if (!hasWordSupportingInfo(word, relatedWords, isRelatedLoading)) {
    return null;
  }

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="Word context">
      {/* Characters Card */}
      {chars.length > 0 && (
        <div className="min-w-0 rounded-feature bg-ui-surface p-4 shadow-[0_var(--depth-md)_0_var(--color-ui-border)] sm:p-6">
          <SectionEyebrow title="Characters" count={chars.length} />
          <div className="mt-1 divide-y divide-ui-divider/40">
            {charsLoading && charInfos.length === 0
              ? chars.map((char) => (
                  <ReferenceRow
                    key={char}
                    glyph={char}
                    accentClassName={activeBook.accent}
                    loading
                    onClick={() => pushCharacter(char)}
                    ariaLabel={`Open breakdown for ${char}`}
                  />
                ))
              : charInfos.map((info) => (
                  <ReferenceRow
                    key={info.char}
                    glyph={info.char}
                    accentClassName={activeBook.accent}
                    primary={info.pinyin}
                    secondary={info.meaning}
                    onClick={() => pushCharacter(info.char)}
                    ariaLabel={`Open breakdown for ${info.char}`}
                  />
                ))}
          </div>
        </div>
      )}

      {/* Related Words Card */}
      {(isRelatedLoading || relatedWords.length > 0) && (
        <div className="min-w-0 rounded-feature bg-ui-surface p-4 shadow-[0_var(--depth-md)_0_var(--color-ui-border)] sm:p-6">
          <SectionEyebrow
            title="Related Words"
            count={isRelatedLoading ? undefined : relatedWords.length}
            action={
              !isRelatedLoading && relatedWords.length > DEFAULT_VISIBLE_RELATED ? (
                <button
                  type="button"
                  onClick={() => setShowAllRelated((prev) => !prev)}
                  className={SEE_ALL_CLASSES}
                >
                  {showAllRelated ? 'Show fewer' : `See all (${relatedWords.length})`}
                </button>
              ) : undefined
            }
          />
          <div className="mt-1 divide-y divide-ui-divider/40">
            {isRelatedLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <ReferenceRow
                  key={idx}
                  glyph="&nbsp;"
                  loading
                  onClick={() => {}}
                  ariaLabel="Loading related word"
                />
              ))
            ) : (
              visibleRelated.map((item) => (
                <ReferenceRow
                  key={item.word}
                  glyph={item.word}
                  accentClassName={activeBook.accent}
                  primary={item.pinyin ? numberToToneMarks(item.pinyin) : undefined}
                  secondary={item.definition}
                  onClick={() => onOpenWord(item.word)}
                  ariaLabel={`Open breakdown for ${item.word}`}
                />
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}

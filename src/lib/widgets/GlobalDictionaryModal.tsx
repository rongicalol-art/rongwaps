import React, { useEffect, useState } from 'react';
import { BottomDrawer } from './BottomDrawer';
import { useAppStore } from '../../store/useAppStore';
import { getDictionaryEntries } from '../../services/dictionaryService';
import { DBDictionaryEntry } from '../../types/database';
import { numberToToneMarks } from '../../utils/pinyin';
import { PiSpinnerBold, PiListMagnifyingGlassBold, PiBookOpenTextBold } from 'react-icons/pi';
import { LuSearchX } from 'react-icons/lu';
import { SAMPLE_BOOKS } from '../../data/books';
import { searchVocabulary } from '../../services/vocabularyService';
import { Flashcard } from '../../data/flashcards';
import { CharacterBreakdownOverlay } from './CharacterBreakdownOverlay';
import { AppIcon } from './AppIcon';
import { IconActionButton } from './IconActionButton';
import { audioService } from '../../services/audioService';

export function GlobalDictionaryModal() {
  const { dictionaryWord, setDictionaryWord, favorites, toggleFavorite, activeBookId, characterPreference } = useAppStore();
  const [activeBreakdown, setActiveBreakdown] = useState<string | null>(null);
  const [activeBreakdownIndex, setActiveBreakdownIndex] = useState<number>(0);

  const [entries, setEntries] = useState<DBDictionaryEntry[]>([]);
  const [fallbackWords, setFallbackWords] = useState<Array<{
    word: string;
    entries: DBDictionaryEntry[];
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [inCourseWords, setInCourseWords] = useState<Flashcard[]>([]);

  const activeBook = React.useMemo(() => {
    return SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];
  }, [activeBookId]);

  useEffect(() => {
    if (!dictionaryWord) {
      setEntries([]);
      setFallbackWords([]);
      setInCourseWords([]);
      return;
    }

    let isMounted = true;
    const fetchWord = async () => {
      setLoading(true);
      try {
        const data = await getDictionaryEntries(dictionaryWord);
        
        const vocabularyWords = await searchVocabulary(dictionaryWord);
        
        let wordFallbacks: Array<{ word: string; entries: DBDictionaryEntry[] }> = [];
        if (data.length === 0 && dictionaryWord.length > 1) {
          const chineseOnly = Array.from(dictionaryWord)
            .filter((character) => /[\u3400-\u9FFF]/.test(character))
            .join('');
          const segmented = Array.from(
            new Intl.Segmenter('zh-TW', { granularity: 'word' }).segment(chineseOnly),
          )
            .map((segment) => segment.segment)
            .filter((word) => /[\u3400-\u9FFF]/.test(word));
          const candidates = segmented.length === 1 && segmented[0] === chineseOnly
            ? Array.from(chineseOnly)
            : segmented;
          const resolved = await Promise.all(candidates.map(async (word) => ({
            word,
            entries: await getDictionaryEntries(word),
          })));
          wordFallbacks = resolved.filter((item) => item.entries.length > 0);
        }

        if (isMounted) {
          setEntries(data);
          setFallbackWords(wordFallbacks);
          // Find exact matches in course vocab
          const exactMatches = vocabularyWords.filter(v => v.front === dictionaryWord);
          setInCourseWords(exactMatches);
          setLoading(false);
        }
      } catch (err) {
        console.error("GlobalDictionaryModal: failed to load word:", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWord();
    return () => {
      isMounted = false;
    };
  }, [dictionaryWord]);

  const primaryChar = entries.length > 0 ? entries[0].traditional : dictionaryWord || '';
  const isFav = primaryChar && entries.length > 0 ? favorites.includes(primaryChar) : false;

  return (
    <>
      <BottomDrawer
        isOpen={!!dictionaryWord}
        onClose={() => setDictionaryWord(null)}
        ariaLabel={dictionaryWord ? `Dictionary details for ${dictionaryWord}` : 'Dictionary details'}
      >
        <div className="flex flex-col">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-ui-muted">
            <PiSpinnerBold className="w-10 h-10 animate-spin mb-4 text-[#1CB0F6]" />
            <p className="font-bold text-lg text-ui-ink">Searching dictionary...</p>
          </div>
        ) : entries.length === 0 ? (
          fallbackWords.length > 0 ? (
            <div className="flex flex-col gap-5 pb-6 pt-2">
              <div className="flex flex-col gap-1.5 border-b border-ui-divider pb-5 pt-3">
                <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-ui-canvas">
                  <PiListMagnifyingGlassBold className="h-5 w-5 text-ui-muted" />
                </div>
                <p className="text-lg font-extrabold leading-tight text-ui-ink">
                  Read “{dictionaryWord}” as words
                </p>
                <p className="text-sm font-bold text-ui-muted">
                  Phrase has no single dictionary entry. Here are its useful word parts.
                </p>
              </div>
              <div className="overflow-hidden rounded-[18px] border border-ui-divider">
                {fallbackWords.map(({ word, entries: wordEntries }, idx) => (
                  <button
                    key={`${word}-${idx}`}
                    type="button"
                    onClick={() => setDictionaryWord(word)}
                    className="grid w-full grid-cols-[minmax(72px,0.32fr)_minmax(0,1fr)] gap-4 border-t border-ui-divider bg-ui-surface p-4 text-left outline-none transition first:border-t-0 hover:bg-ui-hover focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand-primary/20"
                  >
                    <div>
                      <span className="font-chinese text-3xl font-black text-ui-ink-strong">{word}</span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {(wordEntries[0].pinyin || []).slice(0, 2).map((py, i) => (
                          <span key={i} className="text-xs font-bold text-brand-primary">
                            {numberToToneMarks(py)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {wordEntries
                        .flatMap((entry) => Object.values(entry.definitions ?? {}))
                        .slice(0, 4)
                        .map((definition, definitionIndex) => (
                          <li key={definitionIndex} className="text-sm font-bold leading-5 text-ui-ink">
                            <span className="mr-1.5 text-ui-muted">{definitionIndex + 1}.</span>{String(definition)}
                          </li>
                        ))}
                    </ul>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-ui-muted">
              <div className="w-20 h-20 bg-ui-canvas rounded-full flex items-center justify-center mb-6">
                <LuSearchX className="w-10 h-10 text-ui-muted opacity-80" />
              </div>
              <p className="font-extrabold text-2xl text-ui-ink mb-2">Not Found</p>
              <p className="font-bold text-ui-muted text-[15px] text-center px-8">
                We couldn't find <span className="text-ui-ink">"{dictionaryWord}"</span> in the dictionary.
              </p>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-6 pt-2 pb-6">
            
            {/* Header Section */}
            <div className="flex items-start justify-between w-full gap-4 px-2">
              <div className="flex flex-col gap-2">
                <div className={`flex flex-wrap font-normal text-ui-ink leading-tight break-words ${primaryChar.length > 6 ? 'text-4xl' : primaryChar.length > 4 ? 'text-5xl' : 'text-6xl'} font-chinese`}>
                  {primaryChar.split('').map((char, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setActiveBreakdown(primaryChar);
                        setActiveBreakdownIndex(index);
                        setDictionaryWord(null);
                      }}
                      className="cursor-pointer hover:text-[#1CB0F6] active:opacity-50 transition-colors"
                    >
                      {char}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 mt-1">
                  {(entries[0].pinyin || []).map((py, i) => (
                    <span key={i} className="text-[#1CB0F6] font-extrabold tracking-widest text-xl">
                      {numberToToneMarks(py)}
                    </span>
                  ))}
                  <IconActionButton
                    onClick={() => audioService.speakNeural(
                      primaryChar,
                      characterPreference === 'traditional' ? 'zh-TW-HsiaoChenNeural' : 'zh-CN-XiaoxiaoNeural',
                    ).catch(() => {})}
                    label={`Play pronunciation of ${primaryChar}`}
                    size="md"
                    variant="quiet"
                    icon={<AppIcon name="audio" size={19} />}
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-3 items-end shrink-0 pt-2">
                <button
                  type="button"
                  onClick={() => toggleFavorite(primaryChar)}
                  aria-label={isFav ? `Remove ${primaryChar} from saved words` : `Save ${primaryChar}`}
                  aria-pressed={isFav}
                  className="rounded-full p-2 text-ui-muted outline-none transition-colors hover:text-brand-primary focus-visible:ring-4 focus-visible:ring-brand-primary/20"
                >
                  <AppIcon
                    name={isFav ? 'bookmarkFilled' : 'bookmark'}
                    size={25}
                    className={isFav ? 'text-brand-secondary' : undefined}
                  />
                </button>
              </div>
            </div>

            <div className="w-full h-[3px] bg-ui-canvas my-1" />

            {/* Content Section */}
            <div className="flex flex-col gap-6 px-2">
              
              {/* In Course Card */}
              {inCourseWords.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="font-extrabold uppercase tracking-widest text-ui-muted text-[13px] mb-1 pl-1">
                    In Your Course
                  </div>
                  
                  <div className="bg-[#E5F5FF] rounded-[24px] p-5 border-b-2 border-[#BBE3FF] flex flex-col gap-3">
                    {inCourseWords.map((card, idx) => {
                      const cardBook = SAMPLE_BOOKS.find(b => b.id === card.bookId) || activeBook;
                      return (
                        <div key={idx} className={`flex flex-col gap-1.5 ${idx > 0 ? 'pt-3 border-t-2 border-[#BBE3FF]' : ''}`}>
                          <div className="flex items-center gap-2">
                            <div className={`px-2 py-0.5 rounded-md ${cardBook.accentBg} text-white font-extrabold text-[11px] tracking-widest uppercase`}>
                              Book {card.bookId}
                            </div>
                            <div className="text-[13px] font-extrabold text-[#1CB0F6] tracking-wider uppercase">
                              Lesson {card.lessonId}
                            </div>
                          </div>
                          
                          <p className="text-[17px] text-ui-ink font-extrabold leading-snug break-words">
                            {card.back}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Definitions */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 font-extrabold uppercase tracking-widest text-ui-muted text-[13px] mb-1 pl-1">
                  <PiBookOpenTextBold size={18} />
                  <span>Definitions</span>
                </div>
                
                <div className="bg-ui-canvas rounded-[24px] p-5.5 flex flex-col gap-5 border-b-2 border-ui-border">
                  {entries.map((entry, index) => (
                    <div key={index} className={`flex flex-col gap-2 ${index > 0 ? 'pt-4 border-t-2 border-ui-border' : ''}`}>
                      {entry.definitions && Object.keys(entry.definitions).length > 0 ? (
                        <ul className="flex flex-col gap-3.5">
                          {Object.entries(entry.definitions).map(([pos, definition], defIndex) => (
                            <li key={defIndex} className="flex flex-col sm:flex-row gap-1.5 sm:gap-3 text-[17px] leading-relaxed">
                              {pos !== 'null' && pos !== '' && pos !== 'undefined' && !/^\d+$/.test(pos) && (
                                <span className="text-ui-muted font-extrabold italic shrink-0 min-w-[3rem] mt-0.5">
                                  {pos}.
                                </span>
                              )}
                              <span className="text-ui-ink font-bold">
                                {definition}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-ui-muted font-bold italic">No detailed definitions available.</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
            </div>
            
          </div>
        )}
      </div>
    </BottomDrawer>

      <CharacterBreakdownOverlay
        activeBreakdown={activeBreakdown}
        initialCharIndex={activeBreakdownIndex}
        onClose={() => setActiveBreakdown(null)}
        activeBook={activeBook}
      />
    </>
  );
}

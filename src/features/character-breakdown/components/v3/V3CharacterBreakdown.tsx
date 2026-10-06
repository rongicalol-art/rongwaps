import type { DBCharacterBreakdown } from '../../../../types/database';
import type { Flashcard } from '../../../../data/flashcards';
import type { SAMPLE_BOOKS } from '../../../../data/books';
import { V3CharacterSummary } from './V3CharacterSummary';
import { V3MemoryHook } from './V3MemoryHook';
import { V3ExampleSentences } from './V3ExampleSentences';
import { V3RuntimeTree } from './V3RuntimeTree';
import { V3SupportingInformation, hasSupportingInfo } from './V3SupportingInformation';
import type { BuiltWithMember, RankedSoundFamily } from '../../utils/rankBuiltWith';
import type { ResolvedSoundClue } from '../../hooks/useSoundClue';
import { usePrimaryReading } from '../../../../hooks/usePronunciation';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

export function V3CharacterBreakdown({
  activeChar, charData, charCardsInfo, activeBook, builtWithMembers, soundFamily, relatedWords,
  soundClue, setDictionaryWord, openTree, openRelatedBreakdown,
}: {
  activeChar: string;
  charData: DBCharacterBreakdown | null;
  charCardsInfo: Flashcard[];
  activeBook: CourseBook;
  builtWithMembers: BuiltWithMember[];
  soundFamily: RankedSoundFamily | null;
  relatedWords: Flashcard[];
  soundClue?: ResolvedSoundClue | null;
  setDictionaryWord: (word: string) => void;
  openTree: () => void;
  openRelatedBreakdown: () => void;
}) {
  const primaryPinyin = usePrimaryReading(activeChar, charData?.pinyin?.[0]);
  const hasSupporting = hasSupportingInfo(relatedWords, builtWithMembers, soundFamily);

  return (
    <div className="flex w-full flex-col gap-6 lg:gap-10">
      <V3CharacterSummary character={activeChar} data={charData} courseCards={charCardsInfo} accentHex={activeBook.accentHex} />
      <div className={hasSupporting
        ? 'grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,64fr)_minmax(19rem,36fr)] lg:gap-8'
        : 'flex min-w-0 flex-col gap-6 lg:gap-8'}>
        <div className="flex min-w-0 flex-col gap-6 lg:gap-8">
          <V3RuntimeTree character={activeChar} onGlyphClick={setDictionaryWord} mode="summary" onSeeTree={openTree} soundGlyph={soundClue?.treeGlyph} soundShift={soundClue?.treeShift} accentHex={activeBook.accentHex} edgeHex={activeBook.edgeHex} />
          <V3MemoryHook character={activeChar} pinyin={primaryPinyin} />
          <V3ExampleSentences character={activeChar} />
        </div>
        {hasSupporting && (
          <aside aria-label="Character context" className="flex min-w-0 flex-col lg:sticky lg:top-4 lg:self-start">
            <V3SupportingInformation
              relatedWords={relatedWords}
              builtWithMembers={builtWithMembers}
              soundFamily={soundFamily}
              activeChar={activeChar}
              activeBook={activeBook}
              setDictionaryWord={setDictionaryWord}
              openRelatedBreakdown={openRelatedBreakdown}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

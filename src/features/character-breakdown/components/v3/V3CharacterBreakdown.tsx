import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { DBCharacterBreakdown } from '../../../../types/database';
import type { Flashcard } from '../../../../data/flashcards';
import type { SAMPLE_BOOKS } from '../../../../data/books';
import { V3CharacterSummary } from './V3CharacterSummary';
import { V3MemoryHook } from './V3MemoryHook';
import { V3ExampleSentences } from './V3ExampleSentences';
import { V3RuntimeTree } from './V3RuntimeTree';
import { V3WordsList } from './V3WordsList';
import { SoundFamilyCard } from './SoundFamilyCard';
import { AppearsInCard } from './AppearsInCard';
import { BreakdownTabs, type BreakdownTab } from './BreakdownTabs';
import type { BuiltWithMember, RankedSoundFamily } from '../../utils/rankBuiltWith';
import type { ResolvedSoundClue } from '../../hooks/useSoundClue';
import { usePrimaryReading } from '../../../../hooks/usePronunciation';
import { useCharExampleSentences } from '../../hooks/useCharExampleSentences';

type CourseBook = (typeof SAMPLE_BOOKS)[number];
type DetailTab = 'words' | 'sentences' | 'sound' | 'appears';

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
  const { sentences, isLoading: sentencesLoading } = useCharExampleSentences(activeChar);
  const reduceMotion = useReducedMotion();

  const tabs: BreakdownTab<DetailTab>[] = [];
  if (relatedWords.length > 0) tabs.push({ id: 'words', label: 'Words', count: relatedWords.length });
  if (soundFamily) tabs.push({ id: 'sound', label: 'Sound', count: (soundFamily.from ? 1 + soundFamily.from.siblings.length : 0) + soundFamily.lends.length });
  if (builtWithMembers.length > 0) tabs.push({ id: 'appears', label: 'Used in', count: builtWithMembers.length });
  if (sentencesLoading || sentences.length > 0) tabs.push({ id: 'sentences', label: 'Sentences', count: sentencesLoading ? undefined : sentences.length });

  const [tab, setTab] = useState<DetailTab | null>(null);
  useEffect(() => setTab(null), [activeChar]);
  const active = tabs.find((item) => item.id === tab)?.id ?? tabs[0]?.id;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[800px] flex-col gap-6">
      <V3CharacterSummary character={activeChar} data={charData} courseCards={charCardsInfo} accentHex={activeBook.accentHex} />
      <V3RuntimeTree character={activeChar} onGlyphClick={setDictionaryWord} mode="summary" showHeading={false} onSeeTree={openTree} soundGlyph={soundClue?.treeGlyph} soundShift={soundClue?.treeShift} accentHex={activeBook.accentHex} edgeHex={activeBook.edgeHex} />
      <V3MemoryHook character={activeChar} pinyin={primaryPinyin} />
      {active && (
        <div className="flex min-w-0 flex-col gap-3">
          <BreakdownTabs tabs={tabs} active={active} onChange={setTab} />
          <motion.div
            key={`${activeChar}-${active}`}
            role="tabpanel"
            id={`breakdown-panel-${active}`}
            aria-labelledby={`breakdown-tab-${active}`}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.2, 0.9, 0.3, 1] }}
            className="min-w-0"
          >
            {active === 'words' && (
              <V3WordsList relatedWords={relatedWords} activeChar={activeChar} setDictionaryWord={setDictionaryWord} openRelatedBreakdown={openRelatedBreakdown} />
            )}
            {active === 'sentences' && <V3ExampleSentences character={activeChar} sentences={sentences} isLoading={sentencesLoading} />}
            {active === 'sound' && soundFamily && (
              <SoundFamilyCard key={`family:${activeChar}`} family={soundFamily} activeBookId={activeBook.id} onOpen={setDictionaryWord} />
            )}
            {active === 'appears' && (
              <AppearsInCard key={`appears:${activeChar}`} members={builtWithMembers} activeBookId={activeBook.id} onOpen={setDictionaryWord} />
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

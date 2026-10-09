import type { BeginnerDictionaryTerm } from '../../../data/dictionaryHome';
import type { DictionarySavedPreview } from '../../../types/models';
import { CharacterDailyCard } from './CharacterDailyCard';
import { SavedWordsPreview } from './SavedWordsPreview';
import { AppFooter } from '../../../app/components/AppFooter';
import { TocflReadinessCard } from './TocflReadinessCard';
import type { TocflReadiness } from '../../../utils/lesson/tocflReadiness';

interface DictionaryAsideProps {
  savedWords: DictionarySavedPreview[];
  isLoadingSavedWords: boolean;
  characterOfTheDay: BeginnerDictionaryTerm;
  onOpenWord: (word: string) => void;
  onViewSavedWords: () => void;
  readiness: TocflReadiness | null;
}

/** Today's character, saved words and TOCFL progress: the glanceable side of the dictionary. */
export function DictionaryAside({
  savedWords,
  isLoadingSavedWords,
  characterOfTheDay,
  onOpenWord,
  onViewSavedWords,
  readiness,
}: DictionaryAsideProps) {
  return (
    <div className="flex flex-col gap-7">
      <CharacterDailyCard word={characterOfTheDay} onOpenWord={onOpenWord} />
      <SavedWordsPreview
        items={savedWords}
        isLoading={isLoadingSavedWords}
        onOpenWord={onOpenWord}
        onViewAll={onViewSavedWords}
      />
      <TocflReadinessCard readiness={readiness} />
      <AppFooter className="hidden lg:flex" />
    </div>
  );
}

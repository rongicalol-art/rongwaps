import type { BeginnerDictionaryTerm } from '../../../data/dictionaryHome';
import type { DictionarySavedPreview } from '../../../types/models';
import { CharacterDailyCard } from './CharacterDailyCard';
import { SavedWordsPreview } from './SavedWordsPreview';
import { AppFooter } from '../../../app/components/AppFooter';

interface DictionaryAsideProps {
  savedWords: DictionarySavedPreview[];
  isLoadingSavedWords: boolean;
  characterOfTheDay: BeginnerDictionaryTerm;
  onOpenWord: (word: string) => void;
  onViewSavedWords: () => void;
}

/** Today's character and saved words: the glanceable side of the dictionary. TOCFL readiness lives on Profile. */
export function DictionaryAside({
  savedWords,
  isLoadingSavedWords,
  characterOfTheDay,
  onOpenWord,
  onViewSavedWords,
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
      <AppFooter className="hidden lg:flex" />
    </div>
  );
}

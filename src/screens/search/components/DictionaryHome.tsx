import type { BeginnerDictionaryTerm } from '../../../data/dictionaryHome';
import type { DictionarySavedPreview } from '../../../types/models';
import { DictionaryDailyCard } from './DictionaryDailyCard';
import { SavedWordsPreview } from './SavedWordsPreview';

interface DictionaryHomeProps {
  savedWords: DictionarySavedPreview[];
  isLoadingSavedWords: boolean;
  wordOfTheDay: BeginnerDictionaryTerm;
  onOpenWord: (word: string) => void;
  onViewSavedWords: () => void;
}

export function DictionaryHome({
  savedWords,
  isLoadingSavedWords,
  wordOfTheDay,
  onOpenWord,
  onViewSavedWords,
}: DictionaryHomeProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-12 pt-5 md:gap-7 md:px-8 md:pt-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <DictionaryDailyCard word={wordOfTheDay} onOpenWord={onOpenWord} />
        <SavedWordsPreview
          items={savedWords}
          isLoading={isLoadingSavedWords}
          onOpenWord={onOpenWord}
          onViewAll={onViewSavedWords}
        />
      </div>
    </div>
  );
}
import type { BeginnerDictionaryTerm } from '../../../data/dictionaryHome';
import type { DictionarySavedPreview } from '../../../types/models';
import { BookWordRail } from './BookWordRail';
import { CharacterDailyCard } from './CharacterDailyCard';
import { SavedWordsPreview } from './SavedWordsPreview';
import { TocflReadinessCard } from './TocflReadinessCard';
import type { TocflReadiness } from '../../../utils/lesson/tocflReadiness';

interface DictionaryHomeProps {
  savedWords: DictionarySavedPreview[];
  isLoadingSavedWords: boolean;
  characterOfTheDay: BeginnerDictionaryTerm;
  activeBookId: number;
  onOpenWord: (word: string) => void;
  onViewSavedWords: () => void;
  readiness: TocflReadiness | null;
}

export function DictionaryHome({
  savedWords,
  isLoadingSavedWords,
  characterOfTheDay,
  activeBookId,
  onOpenWord,
  onViewSavedWords,
  readiness,
}: DictionaryHomeProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-32 pt-0 md:gap-7 md:px-8 md:pb-20">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <CharacterDailyCard word={characterOfTheDay} onOpenWord={onOpenWord} />
        <SavedWordsPreview
          items={savedWords}
          isLoading={isLoadingSavedWords}
          onOpenWord={onOpenWord}
          onViewAll={onViewSavedWords}
        />
      </div>

      <TocflReadinessCard readiness={readiness} />

      <BookWordRail bookId={activeBookId} onOpenWord={onOpenWord} />
    </div>
  );
}

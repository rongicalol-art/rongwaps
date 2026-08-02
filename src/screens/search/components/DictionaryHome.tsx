import type { BeginnerDictionaryTerm } from '../../../data/dictionaryHome';
import type { DictionarySavedPreview } from '../../../types/models';
import { DictionaryDailyCard } from './DictionaryDailyCard';
import { DictionaryHero } from './DictionaryHero';
import { DictionaryStudySnapshot } from './DictionaryStudySnapshot';
import { SavedWordsPreview } from './SavedWordsPreview';

interface DictionaryHomeProps {
  savedWords: DictionarySavedPreview[];
  isLoadingSavedWords: boolean;
  wordOfTheDay: BeginnerDictionaryTerm;
  studySnapshot: {
    savedWordCount: number;
    learnedWordCount: number;
    reviewedWordCount: number;
    availableBookCount: number;
  };
  onSearch: (query: string) => void;
  onOpenWord: (word: string) => void;
  onViewSavedWords: () => void;
}

export function DictionaryHome({
  savedWords,
  isLoadingSavedWords,
  wordOfTheDay,
  studySnapshot,
  onSearch,
  onOpenWord,
  onViewSavedWords,
}: DictionaryHomeProps) {
  return (
    <div className="flex w-full flex-col gap-5 pb-10 pt-1">
      <DictionaryHero onSearch={onSearch} />
      <div className="grid grid-cols-1 gap-5 md:min-h-[228px] md:grid-cols-[1.08fr_0.92fr] lg:min-h-[238px]">
        <DictionaryStudySnapshot {...studySnapshot} />
        <DictionaryDailyCard word={wordOfTheDay} onOpenWord={onOpenWord} />
      </div>
      <div className="grid min-h-[150px] grid-cols-1 gap-4 sm:min-h-[170px]">
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

import type { BeginnerDictionaryTerm } from '../../../data/dictionaryHome';
import type { DictionarySavedPreview } from '../../../types/models';
import { CharacterDailyCard } from './CharacterDailyCard';
import { SavedWordsPreview } from './SavedWordsPreview';
import { TocflReadinessCard } from './TocflReadinessCard';
import { SectionEyebrow } from '../../../lib/widgets';
import type { TocflBand, TocflReadiness } from '../../../utils/lesson/tocflReadiness';
import { AppFooter } from '../../../app/components/AppFooter';

interface DictionaryAsideProps {
  savedWords: DictionarySavedPreview[];
  isLoadingSavedWords: boolean;
  characterOfTheDay: BeginnerDictionaryTerm;
  readiness: TocflReadiness | null;
  onStudyBand: (band: TocflBand) => void;
  onOpenWord: (word: string) => void;
  onViewSavedWords: () => void;
}

/** Today's character and saved words: the glanceable side of the dictionary. On mobile its children flow into the page grid (character before results, saved words after). TOCFL readiness shows on desktop only, so mobile results stay right under search. */
export function DictionaryAside({
  savedWords,
  isLoadingSavedWords,
  characterOfTheDay,
  readiness,
  onStudyBand,
  onOpenWord,
  onViewSavedWords,
}: DictionaryAsideProps) {
  return (
    <div className="flex flex-col gap-7 max-lg:contents">
      <div className="max-lg:order-2"><CharacterDailyCard word={characterOfTheDay} onOpenWord={onOpenWord} /></div>
      <div className="max-lg:hidden">
        <SectionEyebrow title="TOCFL" />
        <TocflReadinessCard readiness={readiness} onStudy={onStudyBand} />
      </div>
      <div className="max-lg:order-4">
        <SavedWordsPreview
          items={savedWords}
          isLoading={isLoadingSavedWords}
          onOpenWord={onOpenWord}
          onViewAll={onViewSavedWords}
        />
      </div>
      <AppFooter className="hidden lg:flex" />
    </div>
  );
}

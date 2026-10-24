import { useEffect, useState } from 'react';
import { fetchCourseExampleRecords, fetchReadingsPack } from '../../services/contentPacks';
import { buildLessonSentences, speakersByLine, type LessonSentence } from './hooks/useLessonSentences';
import { SentenceList } from './components/SentenceList';

/**
 * DEV-only (debug window → UI Previews): the sentence reader on Book 1, Lesson 1, Part 1, read
 * straight from the packs. Nothing here touches the store, SRS or sync.
 */
export function SentencesPreview() {
  const [sentences, setSentences] = useState<LessonSentence[]>([]);
  useEffect(() => {
    void Promise.all([fetchCourseExampleRecords(), fetchReadingsPack(1)]).then(([records, readings]) => {
      setSentences(buildLessonSentences(records, new Set(['1:1:1']), speakersByLine([readings])));
    });
  }, []);
  const highlightTerms = [...new Set(sentences.map((sentence) => sentence.record.sourceFront))];

  return (
    <section className="flex shrink-0 flex-col gap-2">
      <h2 className="text-xl font-black text-ui-ink-strong">Sentences · B1 L1 Part 1</h2>
      <div className="h-[640px] overflow-y-auto rounded-feature bg-ui-practice-canvas">
        <SentenceList sentences={sentences} highlightTerms={highlightTerms} />
      </div>
    </section>
  );
}

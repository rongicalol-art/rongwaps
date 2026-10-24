import { useEffect, useState } from 'react';
import { ActionButton } from '../../lib/widgets';
import { fetchCourseExampleRecords, fetchReadingsPack } from '../../services/contentPacks';
import { buildLessonSentences, speakersByLine, type LessonSentence } from './hooks/useLessonSentences';
import { useSentenceSession } from './hooks/useSentenceSession';
import { SentenceFeed } from './components/SentenceFeed';

/**
 * DEV-only (debug window → UI Previews): the sentence feed on Book 1, Lesson 1, Part 1, read
 * straight from the packs. Nothing is graded; only a local preview position is saved.
 */
export function SentencesPreview() {
  const [sentences, setSentences] = useState<LessonSentence[]>([]);
  useEffect(() => {
    void Promise.all([fetchCourseExampleRecords(), fetchReadingsPack(1)]).then(([records, readings]) => {
      setSentences(buildLessonSentences(records, new Set(['1:1:1']), speakersByLine([readings])));
    });
  }, []);
  const session = useSentenceSession(sentences, 'debug-preview:sentences');
  const highlightTerms = [...new Set(sentences.map((sentence) => sentence.record.sourceFront))];

  return (
    <section className="flex shrink-0 flex-col gap-2">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-black text-ui-ink-strong">Sentences · B1 L1 Part 1</h2>
        <ActionButton variant="secondary" size="sm" onClick={session.toggleFlow}>
          {session.flowStatus === 'playing' ? 'Pause flow' : 'Flow'}
        </ActionButton>
        <span className="text-sm font-bold text-ui-muted-strong">{session.currentIndex + 1} / {session.deck.length}</span>
      </div>
      <div className="h-[640px] overflow-hidden rounded-feature bg-ui-practice-canvas">
        {session.completed ? (
          <div className="flex h-full items-center justify-center">
            <ActionButton variant="primary" onClick={session.resetAll}>Done · read again</ActionButton>
          </div>
        ) : (
          <SentenceFeed session={session} highlightTerms={highlightTerms} onOpenCharacter={() => {}} />
        )}
      </div>
    </section>
  );
}

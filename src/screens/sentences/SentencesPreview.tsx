import { useEffect, useState } from 'react';
import { ActionButton } from '../../lib/widgets';
import { fetchCourseExampleRecords } from '../../services/contentPacks';
import { buildLessonSentences, type LessonSentence } from './hooks/useLessonSentences';
import { useSentenceSession } from './hooks/useSentenceSession';
import { SentenceFeed } from './components/SentenceFeed';
import { SentenceDock } from './components/SentenceDock';

/**
 * DEV-only (debug window → UI Previews): the sentence feed on Book 1, Lesson 1, Part 1, read
 * straight from the packs. Nothing is graded; only a local preview position is saved.
 */
export function SentencesPreview() {
  const [sentences, setSentences] = useState<LessonSentence[]>([]);
  useEffect(() => {
    void fetchCourseExampleRecords().then((records) => setSentences(buildLessonSentences(records, new Set(['1:1:1']))));
  }, []);
  const session = useSentenceSession(sentences, 'debug-preview:sentences');
  const highlightTerms = [...new Set(sentences.map((sentence) => sentence.record.sourceFront))];

  return (
    <section className="flex shrink-0 flex-col gap-2">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-black text-ui-ink-strong">Sentences · B1 L1 Part 1</h2>
        <span className="text-sm font-bold text-ui-muted-strong">{session.currentIndex + 1} / {session.deck.length}</span>
      </div>
      <div className="h-[640px] overflow-hidden rounded-feature bg-ui-practice-canvas">
        {session.completed ? (
          <div className="flex h-full items-center justify-center">
            <ActionButton variant="primary" onClick={session.resetAll}>Done · read again</ActionButton>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">
              <SentenceFeed session={session} highlightTerms={highlightTerms} onOpenCharacter={() => {}} />
            </div>
            <SentenceDock session={session} />
          </div>
        )}
      </div>
    </section>
  );
}

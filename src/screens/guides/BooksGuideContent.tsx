import { Link } from 'react-router';
import { GUIDE_ROUTES } from '../../app/routes';
import { LOCKED_BOOK_LESSON_TITLES, SAMPLE_BOOKS, SAMPLE_LESSONS } from '../../data/books';
import { SAMPLE_HOOKS } from '../landing';
import { DocList, DocParagraph, DocSection, docLinkClass } from '../public-doc';

function lessonsForBook(bookId: number): { id: number; en: string; zh?: string }[] {
  if (bookId === 1) {
    return SAMPLE_LESSONS.map((lesson) => {
      const [en, zh] = lesson.title.split(' · ');
      return { id: lesson.id, en, zh };
    });
  }
  return (LOCKED_BOOK_LESSON_TITLES[bookId] ?? []).map((en, idx) => ({ id: idx + 1, en }));
}

export function BooksGuideContent() {
  return (
    <>
      <DocSection title="How each lesson works">
        <DocParagraph>
          Ron’s Mandarin mirrors the exact lesson order of <strong>時代華語 Modern Chinese</strong> so you can review
          what you studied in class or preview tomorrow’s chapter on your phone.
        </DocParagraph>
        <DocList
          items={[
            <><strong>Read-along dialogues &amp; readings:</strong> Follow recorded Taiwan audio while every word highlights in real time, and tap any word for pinyin and meaning.</>,
            <><strong>Vocabulary flashcards:</strong> FSRS spaced repetition schedules each word right before you would forget it, paired with Taiwan pronunciation and course examples.</>,
            <><strong>Grammar &amp; book exercises:</strong> Interactive pattern breakdowns and exercises matched to the textbook (<Link to={GUIDE_ROUTES.grammar} className={docLinkClass}>see Grammar &amp; Exercises</Link>).</>,
            <><strong>Character breakdown &amp; writing:</strong> Stroke-order practice and component memory hooks for every character.</>,
            <><strong>TOCFL mock test:</strong> End-of-lesson listening and reading tests that feed missed words back into review (<Link to={GUIDE_ROUTES.tocfl} className={docLinkClass}>see TOCFL Prep</Link>).</>,
          ]}
        />
      </DocSection>

      {SAMPLE_BOOKS.map((book) => {
        const lessons = lessonsForBook(book.id);
        const isLocked = book.status === 'locked';
        return (
          <DocSection
            key={book.id}
            title={`${book.label} · ${book.title} (${book.subtitle}, TOCFL ${book.level})`}
          >
            <DocParagraph>
              {isLocked
                ? `${book.label} covers ${book.subtitle} (TOCFL ${book.level}) and will open after the current beta.`
                : `${book.label} (${book.subtitle}) aligns with TOCFL ${book.level} and is open now in the beta across all ${lessons.length} lessons.`}
            </DocParagraph>
            <ol className="grid gap-x-8 sm:grid-cols-2">
              {lessons.map((lesson) => (
                <li key={lesson.id} className="flex items-baseline gap-3 border-b border-ui-divider py-2.5">
                  <span className="w-7 shrink-0 text-xs font-black text-ui-muted-strong">
                    L{String(lesson.id).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-sm font-extrabold leading-snug text-ui-ink-strong">{lesson.en}</span>
                    {lesson.zh && (
                      <span className="font-chinese text-sm font-semibold text-ui-muted-strong">{lesson.zh}</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </DocSection>
        );
      })}

      <DocSection title="Character memory hooks">
        <DocParagraph>
          Instead of memorizing strokes blindly, every character is broken into its visual parts with a short story
          tying those parts to its meaning:
        </DocParagraph>
        <ul className="divide-y divide-ui-divider">
          {Object.entries(SAMPLE_HOOKS).slice(0, 6).map(([char, story]) => (
            <li key={char} className="flex items-baseline gap-4 py-2.5">
              <span className="font-chinese text-2xl font-semibold text-brand-primary-text">{char}</span>
              <span className="text-sm font-bold leading-relaxed text-ui-ink">{story}</span>
            </li>
          ))}
        </ul>
      </DocSection>
    </>
  );
}

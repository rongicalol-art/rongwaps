import { Link } from 'react-router';
import { GUIDE_ROUTES, WORD_LIST_LEVELS, wordListPath } from '../../app/routes';
import { SAMPLE_BOOKS } from '../../data/books';
import { TOCFL_FAQ } from './guideContent';
import { wordListInfo } from '../word-list/wordListMeta';
import { DocList, DocParagraph, DocSection, docLinkClass } from '../public-doc';

export function TocflGuideContent() {
  return (
    <>
      <DocSection title="How Modern Chinese maps to TOCFL">
        <DocParagraph>
          <strong>TOCFL (Test of Chinese as a Foreign Language)</strong> is Taiwan’s official Mandarin proficiency exam,
          using Traditional Chinese characters and Taiwan vocabulary. Every word in Ron’s Mandarin carries its official
          TBCL / TOCFL level badge so you always see how your textbook study maps to exam readiness.
        </DocParagraph>
        <ul className="divide-y divide-ui-divider">
          {SAMPLE_BOOKS.map((book) => (
            <li key={book.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
              <span className="font-extrabold text-ui-ink-strong">
                {book.label} · {book.title} (<span className="font-chinese font-semibold">{book.subtitle}</span>)
              </span>
              <span className="text-sm font-black text-brand-primary-text">
                TOCFL {book.level}{book.status === 'locked' ? ' · Upcoming' : ' · Open in beta'}
              </span>
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection title="Free TOCFL word lists">
        <DocParagraph>
          The official word list for each level, with pinyin, a short English meaning and a PDF to print. Tap the
          words you already know and study the rest.
        </DocParagraph>
        <ul className="divide-y divide-ui-divider">
          {WORD_LIST_LEVELS.map((entry) => {
            const { label, count } = wordListInfo(entry);
            return (
              <li key={entry.slug} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                <Link to={wordListPath(entry.slug)} className={docLinkClass}>TOCFL {label} word list</Link>
                <span className="text-sm font-black tabular-nums text-ui-muted-strong">{count} words</span>
              </li>
            );
          })}
        </ul>
      </DocSection>

      <DocSection title="What each end-of-lesson mock test covers">
        <DocParagraph>
          Once you finish a lesson’s vocabulary, reading, and grammar, you can take a TOCFL-style mock test built
          specifically around that lesson’s words and structures.
        </DocParagraph>
        <DocList
          items={[
            <><strong>Listening section:</strong> Picture-sentence matching, short dialogue comprehension, and spoken response questions in natural Taiwan voices.</>,
            <><strong>Reading section:</strong> Picture-sentence matching, dialogue completion, and short Traditional Chinese reading comprehension.</>,
            <><strong>Readiness view:</strong> Track how much of each TOCFL vocabulary band you have mastered across your lessons.</>,
          ]}
        />
      </DocSection>

      <DocSection title="Fix round and smart review loop">
        <DocParagraph>
          Mock tests are not dead-end scores. Whenever you miss a question, Ron’s Mandarin turns that miss into targeted
          follow-up practice:
        </DocParagraph>
        <DocList
          items={[
            <><strong>Immediate Fix round:</strong> Review every missed item right after finishing the test.</>,
            <><strong>Automatic flashcard scheduling:</strong> Missed vocabulary words return to your FSRS review queue so they stick before the next lesson.</>,
            <><strong>Smart retakes:</strong> Retaking a lesson test brings back items from earlier lessons you previously missed.</>,
          ]}
        />
        <DocParagraph>
          Explore <Link to={GUIDE_ROUTES.books} className={docLinkClass}>Books &amp; Lessons</Link> and{' '}
          <Link to={GUIDE_ROUTES.grammar} className={docLinkClass}>Grammar &amp; Exercises</Link> to see how each
          chapter prepares you before test day.
        </DocParagraph>
      </DocSection>

      <DocSection title="TOCFL questions">
        <div className="divide-y divide-ui-divider">
          {TOCFL_FAQ.map(({ q, a }, index) => (
            <details key={q} open={index === 0} className="group py-3.5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xs text-base font-extrabold text-ui-ink-strong focus-ring-inline [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden="true" className="text-ui-muted group-open:hidden">+</span>
                <span aria-hidden="true" className="hidden text-ui-muted group-open:inline">–</span>
              </summary>
              <p className="mt-2 text-base font-semibold leading-relaxed text-ui-ink">{a}</p>
            </details>
          ))}
        </div>
      </DocSection>
    </>
  );
}

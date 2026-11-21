import { Link } from 'react-router';
import { GUIDE_ROUTES, grammarPagePath } from '../../app/routes';
import { SAMPLE_BOOKS } from '../../data/books';
import { INTERACTIVE_GRAMMAR_MANIFEST } from '../../data/interactiveGrammarManifest';
import { GRAMMAR_PAGES } from '../grammar-page/data';
import { GRAMMAR_ROUNDS } from '../landing';
import { DocList, DocParagraph, DocSection, docLinkClass } from '../public-doc';

function formatPatternSentence(answer: string[]): string {
  const joined = answer.join('');
  if (joined === '我是臺灣人你呢') return '我是臺灣人，你呢？';
  return joined.endsWith('嗎') || joined.endsWith('呢') ? `${joined}？` : `${joined}。`;
}

function grammarSummaryByBook() {
  const counts = new Map<number, { lessons: Set<number>; pages: number }>();
  for (const part of INTERACTIVE_GRAMMAR_MANIFEST) {
    const entry = counts.get(part.bookId) ?? { lessons: new Set<number>(), pages: 0 };
    entry.lessons.add(part.lessonId);
    entry.pages += part.grammarPages.length;
    counts.set(part.bookId, entry);
  }
  return SAMPLE_BOOKS
    .filter((book) => counts.has(book.id))
    .map((book) => {
      const entry = counts.get(book.id)!;
      return {
        book,
        lessonCount: entry.lessons.size,
        pageCount: entry.pages,
      };
    });
}

export function GrammarGuideContent() {
  const coverage = grammarSummaryByBook();

  return (
    <>
      <DocSection title="Grammar made practical">
        <DocParagraph>
          Textbook grammar tables are hard to review passively. Ron’s Mandarin turns each grammar point in{' '}
          <strong>時代華語 Modern Chinese</strong> into an interactive lesson with plain-English explanations,
          recorded Taiwan audio examples, and links back to where the pattern appears in your reading texts.
        </DocParagraph>
        <DocList
          items={[
            <><strong>Clear pattern formulas:</strong> Color-highlighted structures show exactly where subjects, time words, measure words, and particles sit.</>,
            <><strong>Audio on every example:</strong> Listen to natural Taiwan Mandarin delivery while reading Traditional Chinese and pinyin.</>,
            <><strong>Connected to the reading:</strong> When you read a dialogue or story, the app flags which grammar patterns actually occur in that text.</>,
          ]}
        />
      </DocSection>

      <DocSection title="Grammar pages">
        <DocParagraph>
          One page per pattern: the rule in plain English, example sentences with pinyin, and one sentence to build
          yourself.
        </DocParagraph>
        <ul className="divide-y divide-ui-divider">
          {GRAMMAR_PAGES.map(([slug, bookId, lessonId, title]) => (
            <li key={slug} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
              <Link to={grammarPagePath(slug)} className={docLinkClass}>{title}</Link>
              <span className="text-sm font-black tabular-nums text-ui-muted-strong">Book {bookId} · Lesson {lessonId}</span>
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection title="Book exercises, not just flashcards">
        <DocParagraph>
          After reviewing the pattern, you practice with interactive exercises modeled directly on the textbook
          workbook and class drills rather than repetitive multiple-choice cards.
        </DocParagraph>
        <DocList
          items={[
            <><strong>Sentence ordering:</strong> Arrange scrambled word tiles to match the target pattern and English meaning.</>,
            <><strong>Fill-in-the-blank &amp; structure choice:</strong> Pick the right particle, connector, or aspect marker in context.</>,
            <><strong>Listening &amp; dialogue response:</strong> Hear a question or situation and build a natural reply.</>,
            <><strong>Quick mistake reporting:</strong> Flag any tricky item right inside an exercise so explanations keep getting clearer.</>,
          ]}
        />
      </DocSection>

      <DocSection title="Sample grammar patterns">
        <DocParagraph>
          Here are introductory patterns from Lesson 1 and Lesson 2 of Book 1 showing how formulas connect directly
          to real sentences:
        </DocParagraph>
        <ul className="divide-y divide-ui-divider">
          {GRAMMAR_ROUNDS.map((item) => (
            <li key={item.english} className="flex flex-col gap-1.5 py-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {item.pattern.map((slot, index) => (
                  <span
                    key={index}
                    className={
                      index === item.key
                        ? 'rounded-xs border border-brand-primary bg-brand-primary-soft px-2 py-0.5 font-chinese text-sm font-bold text-brand-primary-text'
                        : 'rounded-xs border border-ui-border px-2 py-0.5 text-xs font-extrabold text-ui-muted-strong'
                    }
                  >
                    {slot}
                  </span>
                ))}
              </div>
              <p className="font-chinese text-lg font-semibold text-ui-ink-strong">{formatPatternSentence(item.answer)}</p>
              <p className="text-sm font-bold text-ui-muted-strong">{item.english}</p>
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection title="Grammar coverage by book">
        <DocParagraph>
          Interactive grammar lessons and exercises currently cover:
        </DocParagraph>
        <DocList
          items={coverage.map(({ book, lessonCount, pageCount }) => (
            <>
              <strong>{book.label} ({book.subtitle}, TOCFL {book.level}):</strong> {pageCount} interactive grammar points across {lessonCount} lessons.
            </>
          ))}
        />
        <DocParagraph>
          Browse the full lesson list on <Link to={GUIDE_ROUTES.books} className={docLinkClass}>Books &amp; Lessons</Link>,
          or see how grammar and vocabulary come together on <Link to={GUIDE_ROUTES.tocfl} className={docLinkClass}>TOCFL Prep &amp; Mock Tests</Link>.
        </DocParagraph>
      </DocSection>
    </>
  );
}

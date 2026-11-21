import { use, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { GUIDE_ROUTES, TAB_ROUTES, grammarPagePath, isLessonPage, lessonPagePath } from '../../app/routes';
import { PracticeChoiceButton } from '../../features/practice';
import { useAuth } from '../../hooks/useAuth';
import { useCharacterFont } from '../../hooks/useCharacterFont';
import { usePageMeta } from '../../hooks/usePageMeta';
import { ActionButton, AppIcon, BrandWordmark } from '../../lib/widgets';
import { cn } from '../../utils/cn';
import { rememberLessonReturn } from '../../utils/browser/lessonReturn';
import { dismissPrerender } from '../../utils/browser/prerender';
import { SignInConsent, SignInMessageNote, useGoogleSignIn } from '../auth';
import { GRAMMAR_PAGES } from './data';
import { grammarPageLink, loadGrammarPageBook, loadedGrammarPageBook } from './grammarPageData';
import { grammarPageMeta } from './grammarPageMeta';
import type { GrammarPageData, GrammarPageLink, GrammarSentence, GrammarWord } from './grammarPageTypes';

const SECTION_TITLE = 'text-xl font-black tracking-tight text-ui-ink-strong';
const LINK = 'rounded-xs text-sm font-extrabold text-brand-primary-text hover:underline focus-ring-inline';
const HAN = /\p{Script=Han}/u;
const wordsOf = (sentence: GrammarSentence) => sentence.tokens.filter((token): token is GrammarWord => typeof token !== 'string');

/**
 * The exercise's tiles in a mixed order that is the same on the prerendered page and in the
 * browser (a random shuffle would not match), and never the answer itself.
 */
function mixedOrder(count: number, seed: string): number[] {
  let state = [...seed].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
  const next = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
  const order = Array.from({ length: count }, (_, index) => index);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.every((value, index) => value === index) ? [...order.slice(1), order[0]] : order;
}

function Sentence({ sentence }: { sentence: GrammarSentence }) {
  return (
    <li className="flex flex-col gap-0.5 py-3.5">
      <span lang="zh-Hant" className="font-chinese text-2xl font-semibold leading-normal text-ui-ink-strong">
        {sentence.tokens.map((token, index) => (typeof token === 'string' ? token : (
          <span key={index} className={cn(token[3] && 'border-b-2 border-brand-primary text-brand-primary-text')}>{token[0]}</span>
        )))}
      </span>
      <span className="text-base font-black text-ui-ink-strong">{sentence.pinyin}</span>
      <span className="text-base font-bold text-ui-ink">{sentence.english}</span>
    </li>
  );
}

/**
 * Public page for one grammar pattern: the rule, two examples, then one sentence the visitor
 * builds from tiles. A right answer leads into the lesson. Prerendered at build time
 * (scripts/build/prerender.ts).
 */
export function GrammarPageScreen({ slug }: { slug: string }) {
  const link = grammarPageLink(slug);
  if (!link) return <Navigate to={GUIDE_ROUTES.grammar} replace />;
  const book = loadedGrammarPageBook(link[1]);
  return book ? <GrammarPage link={link} page={book[slug]} /> : <DownloadedGrammarPage link={link} />;
}

/** Suspends once per book while its pages download; the prerendered page stays up meanwhile. */
function DownloadedGrammarPage({ link }: { link: GrammarPageLink }) {
  return <GrammarPage link={link} page={use(loadGrammarPageBook(link[1]))[link[0]]} />;
}

function GrammarPage({ link, page }: { link: GrammarPageLink; page: GrammarPageData }) {
  const { slug, bookId, lessonId } = page;
  const { signIn, error, isBusy } = useGoogleSignIn();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  useCharacterFont();
  usePageMeta(grammarPageMeta(link));
  useEffect(dismissPrerender, []);

  const answer = useMemo(() => wordsOf(page.exercise), [page]);
  const tiles = useMemo(() => mixedOrder(answer.length, slug).map((index) => answer[index]), [answer, slug]);
  /** Tile positions in the order they were tapped. */
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  useEffect(() => { setPicked([]); setResult(null); }, [slug]);
  const filled = picked.length === answer.length;

  const position = GRAMMAR_PAGES.findIndex((item) => item[0] === slug);
  const previous = GRAMMAR_PAGES[position - 1];
  const following = GRAMMAR_PAGES[position + 1];

  // Sign-in returns to the home address, so the lesson is remembered and opened from there.
  const openLesson = () => {
    rememberLessonReturn({ bookId, lessonId });
    if (currentUser) navigate(TAB_ROUTES.path); else void signIn();
  };
  const act = () => {
    // Nothing built yet: the button leads down to the exercise instead of sitting there switched off.
    if (result === null && picked.length === 0) { document.getElementById('grammar-turn')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (result === true) openLesson();
    else if (result === false) { setPicked([]); setResult(null); }
    else setResult(picked.map((index) => tiles[index][0]).join('') === answer.map((word) => word[0]).join(''));
  };

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-ui-canvas font-sans text-ui-ink">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <header className="mx-auto flex w-full max-w-3xl items-center gap-3 px-5 py-3 lg:px-10">
          <Link to="/" aria-label="Ron's Mandarin home" className="mr-auto rounded-xs focus-ring-inline"><BrandWordmark /></Link>
          {!currentUser && (
            <ActionButton variant="secondary" size="sm" onClick={() => void signIn()} className="normal-case tracking-normal text-sm px-3.5">Sign in</ActionButton>
          )}
        </header>

        <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 pb-10 pt-2 lg:px-10 lg:pb-16 lg:pt-4">
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-extrabold text-ui-muted-strong">Modern Chinese {bookId} · Lesson {lessonId} grammar</p>
              <h1 className="text-3xl font-black leading-tight tracking-tight text-ui-ink-strong text-balance lg:text-4xl">{page.title}</h1>
            </div>
            <p className="flex flex-wrap gap-1.5">
              {page.pattern.map((part, index) => (
                <span
                  key={index}
                  className={cn(
                    'rounded-xs border-2 px-2.5 py-0.5 text-sm font-black',
                    HAN.test(part) ? 'border-brand-primary font-chinese text-base text-brand-primary-text' : 'border-dashed border-ui-border text-ui-muted-strong',
                  )}
                >
                  {part}
                </span>
              ))}
            </p>
            <p className="text-lg font-bold leading-relaxed text-ui-ink-strong">{page.rule}</p>
          </section>

          <section aria-labelledby="grammar-examples" className="flex flex-col gap-1 border-t-2 border-ui-divider pt-8">
            <h2 id="grammar-examples" className={SECTION_TITLE}>Examples</h2>
            <ul className="divide-y-2 divide-ui-divider">
              {page.examples.map((example) => <Sentence key={example.pinyin} sentence={example} />)}
            </ul>
          </section>

          <section aria-labelledby="grammar-turn" className="flex flex-col gap-4 border-t-2 border-ui-divider pt-8">
            <h2 id="grammar-turn" className={SECTION_TITLE}>Your turn</h2>
            <p className="text-center text-xl font-black text-ui-ink-strong">{page.exercise.english}</p>
            <button
              type="button"
              aria-label="Undo the last word"
              onClick={() => { if (result === null) setPicked(picked.slice(0, -1)); }}
              className="flex min-h-14 flex-wrap justify-center gap-2 rounded-control focus-ring"
            >
              {answer.map((_, index) => (
                <span
                  key={index}
                  lang="zh-Hant"
                  className={cn(
                    'flex h-14 min-w-14 items-center justify-center rounded-control border-2 px-3 font-chinese text-2xl text-ui-ink-strong',
                    picked[index] === undefined ? 'border-dashed border-ui-border'
                      : result === null ? 'border-ui-border bg-ui-surface'
                        : result ? 'border-feedback-success bg-feedback-success-surface' : 'border-feedback-danger bg-feedback-danger-surface',
                  )}
                >
                  {picked[index] === undefined ? '' : tiles[picked[index]][0]}
                </span>
              ))}
            </button>
            <div className="flex flex-wrap justify-center gap-2">
              {tiles.map((tile, index) => (
                <PracticeChoiceButton
                  key={index}
                  compact
                  className={cn('!w-auto', picked.includes(index) && 'invisible')}
                  onClick={() => { if (result === null && !filled) setPicked([...picked, index]); }}
                  aria-label={`Use ${tile[0]}`}
                >
                  <span lang="zh-Hant" className="min-w-8 font-chinese text-2xl font-semibold text-ui-ink-strong">{tile[0]}</span>
                </PracticeChoiceButton>
              ))}
            </div>
            <p aria-live="polite" className={cn('rounded-control px-4 py-3 text-base font-bold text-ui-ink-strong', result === null ? 'hidden' : result ? 'bg-feedback-success-surface' : 'bg-feedback-danger-surface')}>
              {result === true && (
                <>
                  Right.{' '}
                  <span lang="zh-Hant" className="font-chinese text-xl font-semibold">{page.exercise.tokens.map((token) => (typeof token === 'string' ? token : token[0])).join('')}</span>{' '}
                  <span className="font-black">{page.exercise.pinyin}</span>
                </>
              )}
              {result === false && 'Not yet. Look at the examples again, then try once more.'}
            </p>
          </section>

          <nav aria-label="More grammar" className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t-2 border-ui-divider pt-8">
            {previous && <Link to={grammarPagePath(previous[0])} className={LINK}>← {previous[3]}</Link>}
            {following && <Link to={grammarPagePath(following[0])} className={LINK}>{following[3]} →</Link>}
            {isLessonPage(bookId, lessonId) && <Link to={lessonPagePath(bookId, lessonId)} className={LINK}>Lesson {lessonId} words</Link>}
            <Link to={GUIDE_ROUTES.grammar} className={LINK}>All grammar</Link>
          </nav>
          {!currentUser && <SignInConsent className="!text-sm !font-semibold !text-ui-muted" />}
        </main>
      </div>

      <div className="bg-ui-canvas px-5 pb-3 pt-2 lg:px-10 lg:pb-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
          {error && <SignInMessageNote message={error} />}
          <ActionButton
            size="lg"
            fullWidth
            onClick={act}
            disabled={result === null && picked.length > 0 && !filled}
            loading={isBusy && !currentUser}
            loadingLabel="Opening Google"
            className="normal-case tracking-normal text-lg"
            frontClassName="min-h-14"
          >
            {result === null ? (picked.length === 0 ? 'Try it' : 'Check') : result ? <>Practice more in Lesson {lessonId} <AppIcon name="forward" size={20} /></> : 'Try again'}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

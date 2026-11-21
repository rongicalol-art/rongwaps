import { memo, use, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { GUIDE_ROUTES, LEGAL_ROUTES, TAB_ROUTES, WORD_LIST_LEVELS, wordListPath, type WordListLevel } from '../../app/routes';
import { PracticeChoiceButton } from '../../features/practice';
import { useAuth } from '../../hooks/useAuth';
import { useCharacterFont } from '../../hooks/useCharacterFont';
import { usePageMeta } from '../../hooks/usePageMeta';
import { ActionButton, AppIcon, BrandWordmark } from '../../lib/widgets';
import { cn } from '../../utils/cn';
import { dismissPrerender } from '../../utils/browser/prerender';
import { readKnownWords, rememberWordListReturn, saveKnownWords, wordKey } from '../../utils/browser/wordListReturn';
import { SignInConsent, SignInMessageNote, useGoogleSignIn } from '../auth';
import { loadWordList, loadedWordList } from './wordListData';
import { wordListInfo, wordListMeta } from './wordListMeta';
import type { ListWord } from './wordListTypes';

const LINK = 'rounded-xs text-sm font-extrabold text-brand-primary-text hover:underline focus-ring-inline';
const NO_WORDS: ReadonlySet<string> = new Set();

/** One word: tap it to say "I know this one". */
const WordTile = memo(function WordTile({ word, known, onToggle }: { word: ListWord; known: boolean; onToggle: (key: string) => void }) {
  const [hanzi, pinyin, meaning] = word;
  return (
    <li className="flex">
      <PracticeChoiceButton
        compact
        state={known ? 'selected' : 'idle'}
        aria-pressed={known}
        onClick={() => onToggle(wordKey(hanzi, pinyin))}
        idleClassName="!px-1.5 !py-2.5"
        selectedClassName="!px-1.5 !py-2.5"
      >
        <span className="flex flex-col items-center gap-0.5">
          <span lang="zh-Hant" className={cn('font-chinese font-semibold leading-snug text-ui-ink-strong', hanzi.length > 4 ? 'text-lg' : 'text-[22px]')}>{hanzi}</span>
          <span className="text-xs font-black text-ui-ink-strong">{pinyin}</span>
          <span className="text-xs font-bold leading-tight text-ui-muted-strong">{meaning}</span>
        </span>
      </PracticeChoiceButton>
    </li>
  );
});

/**
 * Public page for one TOCFL level's official word list. The list doubles as a self-check: a
 * visitor taps the words they know, the bar fills, and the button saves the others into a folder
 * to study (after sign-in). Prerendered at build time (scripts/build/prerender.ts) with every
 * word in the page.
 */
export function WordListScreen(entry: WordListLevel) {
  const words = loadedWordList(entry.level);
  return words ? <WordListPage entry={entry} words={words} /> : <DownloadedWordList {...entry} />;
}

/** Suspends once per level while its list downloads; the prerendered page stays up meanwhile. */
function DownloadedWordList(entry: WordListLevel) {
  return <WordListPage entry={entry} words={use(loadWordList(entry.level))} />;
}

function WordListPage({ entry, words }: { entry: WordListLevel; words: readonly ListWord[] }) {
  const { slug, level } = entry;
  const info = wordListInfo(entry);
  const next = WORD_LIST_LEVELS[WORD_LIST_LEVELS.findIndex((item) => item.slug === slug) + 1];
  const { signIn, error, isBusy } = useGoogleSignIn();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  useCharacterFont();
  usePageMeta(wordListMeta(entry));
  useEffect(dismissPrerender, []);

  // Empty on the first paint so it matches the prerendered page; this device's taps follow.
  const [known, setKnown] = useState<ReadonlySet<string>>(NO_WORDS);
  useEffect(() => {
    const onThisList = new Set(words.map(([hanzi, pinyin]) => wordKey(hanzi, pinyin)));
    setKnown(new Set(readKnownWords(slug).filter((key) => onThisList.has(key))));
  }, [slug, words]);
  const toggle = useCallback((key: string) => {
    setKnown((current) => {
      const updated = new Set(current);
      if (!updated.delete(key)) updated.add(key);
      saveKnownWords(slug, [...updated]);
      return updated;
    });
  }, [slug]);

  const left = words.length - known.size;
  const knowsAll = left === 0;
  // Sign-in returns to the home address, so the list is remembered and saved from there (Library).
  const study = () => {
    if (knowsAll && next) { navigate(wordListPath(next.slug)); return; }
    if (!knowsAll) rememberWordListReturn(slug, [...known]);
    if (currentUser) navigate(knowsAll ? TAB_ROUTES.path : TAB_ROUTES.library); else void signIn();
  };
  const studyLabel = knowsAll
    ? (next ? `You know them all. Try ${wordListInfo(next).label}` : 'You know them all. Study free')
    : known.size ? `Study the ${left} you don’t know` : `Study all ${words.length} free`;

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-ui-canvas font-sans text-ui-ink">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <header className="mx-auto flex w-full max-w-5xl items-center gap-3 px-5 py-3 lg:px-10">
          <Link to="/" aria-label="Ron's Mandarin home" className="mr-auto rounded-xs focus-ring-inline"><BrandWordmark /></Link>
          {!currentUser && (
            <ActionButton variant="secondary" size="sm" onClick={() => void signIn()} className="normal-case tracking-normal text-sm px-3.5">Sign in</ActionButton>
          )}
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 pb-10 pt-2 lg:gap-8 lg:px-10 lg:pb-16 lg:pt-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-extrabold text-ui-muted-strong">{info.place}</p>
              <a href={info.pdfPath} download className={cn(LINK, 'flex items-center gap-1')}>
                <AppIcon name="download" size={16} />
                PDF
              </a>
            </div>
            <h1 className="text-3xl font-black leading-tight tracking-tight text-ui-ink-strong text-balance lg:text-4xl">TOCFL {info.label} Word List</h1>
          </div>

            <nav aria-label="Levels" className="flex gap-2">
              {WORD_LIST_LEVELS.map((item) => {
                const { label, count } = wordListInfo(item);
                const current = item.slug === slug;
                return (
                  <Link
                    key={item.slug}
                    to={wordListPath(item.slug)}
                    aria-current={current ? 'page' : undefined}
                    className={cn(
                      'flex flex-col items-center rounded-sm border-2 border-b-4 px-3.5 pb-0.5 pt-1.5 leading-tight focus-ring',
                      current ? 'border-brand-primary bg-brand-primary-soft' : 'border-ui-border bg-ui-surface hover:bg-ui-hover',
                    )}
                  >
                    <span className="text-base font-black text-ui-ink-strong">{label}</span>
                    <span className="text-xs font-extrabold tabular-nums text-ui-muted-strong">{count} words</span>
                  </Link>
                );
              })}
            </nav>

          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {words.map((word) => {
              const key = wordKey(word[0], word[1]);
              return <WordTile key={key} word={word} known={known.has(key)} onToggle={toggle} />;
            })}
          </ul>

          <section aria-labelledby="list-about" className="flex flex-col gap-2 border-t-2 border-ui-divider pt-8">
            <h2 id="list-about" className="text-xl font-black tracking-tight text-ui-ink-strong">About this list</h2>
            <p className="max-w-3xl text-base font-semibold leading-relaxed text-ui-ink">
              These are the {info.count} words of TBCL Level {level}, the official word list behind TOCFL {info.label}{' '}
              (<span lang="zh-Hant" className="font-chinese">{info.examName}</span>). The words, their level and their pinyin follow
              the list published by Taiwan’s National Academy for Educational Research. The short English meanings are
              our own.
            </p>
          </section>

          <nav aria-label="More" className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t-2 border-ui-divider pt-8">
            {next && <Link to={wordListPath(next.slug)} className={LINK}>Next: TOCFL {wordListInfo(next).label} →</Link>}
            <Link to={GUIDE_ROUTES.tocfl} className={LINK}>TOCFL mock tests</Link>
            <Link to={GUIDE_ROUTES.books} className={LINK}>Books &amp; lessons</Link>
            <Link to={LEGAL_ROUTES.sources} className={LINK}>Sources</Link>
          </nav>
          {!currentUser && <SignInConsent className="!text-sm !font-semibold !text-ui-muted" />}
        </main>
      </div>

      <div className="bg-ui-canvas px-5 pb-3 pt-2 lg:px-10 lg:pb-4">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 lg:flex-row lg:items-center lg:gap-8">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <p aria-live="polite" className="text-base font-black tabular-nums text-ui-ink-strong">
              {known.size ? `You know ${known.size} of ${words.length}` : 'Tap the words you know'}
            </p>
            <div className="h-3 overflow-hidden rounded-full bg-ui-divider">
              <div className="h-full rounded-full bg-brand-primary transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{ width: `${(known.size / words.length) * 100}%` }} />
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:w-96">
            {error && <SignInMessageNote message={error} />}
            <ActionButton
              size="lg"
              fullWidth
              onClick={study}
              loading={isBusy && !currentUser}
              loadingLabel="Opening Google"
              className="normal-case tracking-normal text-lg"
              frontClassName="min-h-14"
            >
              {studyLabel}
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}

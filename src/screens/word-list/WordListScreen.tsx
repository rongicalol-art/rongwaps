import { memo, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { GUIDE_ROUTES, LEGAL_ROUTES, TAB_ROUTES, WORD_LIST_LEVELS, wordListPath, type WordListRef } from '../../app/routes';
import { PracticeChoiceButton } from '../../features/practice';
import { useAuth } from '../../hooks/useAuth';
import { useCharacterFont } from '../../hooks/useCharacterFont';
import { usePageMeta } from '../../hooks/usePageMeta';
import { ActionButton, AppIcon, SearchField } from '../../lib/widgets';
import { cn } from '../../utils/cn';
import { dismissPrerender } from '../../utils/browser/prerender';
import { readKnownWords, rememberWordListReturn, saveKnownWords, wordKey } from '../../utils/browser/wordListReturn';
import { SignInConsent, SignInMessageNote, useGoogleSignIn } from '../auth';
import { PublicPageHeader } from '../public-doc';
import { loadWordList, loadedWordList } from './wordListData';
import { wordListInfo, wordListMeta, wordListPart, wordListPartKey, wordListRange } from './wordListMeta';
import type { ListWord } from './wordListTypes';
import { WordSearchResults } from './WordSearchResults';

const LINK = 'rounded-xs text-sm font-extrabold text-brand-primary-text hover:underline focus-ring-inline';
const NO_WORDS: ReadonlySet<string> = new Set();

/** One word: tap it to say "I know this one". */
const WordTile = memo(function WordTile({ word, known, found, onToggle }: { word: ListWord; known: boolean; found: boolean; onToggle: (key: string) => void }) {
  const [hanzi, pinyin, meaning] = word;
  return (
    // `found` rings the word a search just led here for.
    <li data-found={found || undefined} className={cn('flex rounded-control', found && 'outline outline-4 outline-offset-2 outline-brand-primary')}>
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
export function WordListScreen(ref: WordListRef) {
  // A part past the level's last one is nobody's page.
  if (ref.part > wordListInfo(ref.entry).parts) return <Navigate to={wordListPath(ref.entry.slug)} replace />;
  const words = loadedWordList(ref.entry.level);
  return words ? <WordListPage {...ref} level={words} /> : <DownloadedWordList {...ref} />;
}

/** Suspends once per level while its list downloads; the prerendered page stays up meanwhile. */
function DownloadedWordList(ref: WordListRef) {
  return <WordListPage {...ref} level={use(loadWordList(ref.entry.level))} />;
}

function WordListPage({ entry, part, level: allWords }: WordListRef & { level: readonly ListWord[] }) {
  const { slug, level } = entry;
  const info = wordListInfo(entry);
  // A long level is shown a part at a time: a page to tap through, a folder to study.
  const parts = useMemo(() => Array.from({ length: info.parts }, (_, index) => wordListPart(allWords, index + 1, info.parts)), [allWords, info.parts]);
  const words = parts[part - 1];
  const storageKey = wordListPartKey(slug, part, info.parts);
  const nextLevel = WORD_LIST_LEVELS[WORD_LIST_LEVELS.findIndex((item) => item.slug === slug) + 1];
  /** Where "next" leads: the level's next part, then the next level. */
  const next = part < info.parts
    ? { to: wordListPath(slug, part + 1), name: `${info.label} ${wordListRange(parts[part])}` }
    : nextLevel && { to: wordListPath(nextLevel.slug), name: wordListInfo(nextLevel).label };
  const { signIn, error, isBusy } = useGoogleSignIn();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  useCharacterFont();
  usePageMeta(wordListMeta(entry, part));
  useEffect(dismissPrerender, []);
  // On a phone the later levels sit past the edge of the row: bring this page's own tab into view.
  const levelTabs = useRef<HTMLElement>(null);
  useEffect(() => { levelTabs.current?.querySelector('[aria-current]')?.scrollIntoView({ inline: 'center', block: 'nearest' }); }, [slug]);

  // Empty on the first paint so it matches the prerendered page; this device's taps follow.
  const [known, setKnown] = useState<ReadonlySet<string>>(NO_WORDS);
  useEffect(() => {
    const onThisList = new Set(words.map(([hanzi, pinyin]) => wordKey(hanzi, pinyin)));
    setKnown(new Set(readKnownWords(storageKey).filter((key) => onThisList.has(key))));
  }, [storageKey, words]);
  const toggle = useCallback((key: string) => {
    setKnown((current) => {
      const updated = new Set(current);
      if (!updated.delete(key)) updated.add(key);
      saveKnownWords(storageKey, [...updated]);
      return updated;
    });
  }, [storageKey]);

  // Search looks through every level. Picking a result opens its page with that word ringed.
  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';
  const [found, setFound] = useState<string | null>(null);
  useEffect(() => {
    if (!found || searching) return;
    document.querySelector('[data-found]')?.scrollIntoView({ block: 'center' });
    const timer = window.setTimeout(() => setFound(null), 4000);
    return () => window.clearTimeout(timer);
  }, [found, searching, words]);

  const left = words.length - known.size;
  const knowsAll = left === 0;
  // Sign-in returns to the home address, so the list is remembered and saved from there (Library).
  const study = () => {
    if (knowsAll && next) { navigate(next.to); return; }
    if (!knowsAll) rememberWordListReturn(storageKey, [...known]);
    if (currentUser) navigate(knowsAll ? TAB_ROUTES.path : TAB_ROUTES.library); else void signIn();
  };
  const studyLabel = knowsAll
    ? (next ? `You know them all. Try ${next.name}` : 'You know them all. Study free')
    : known.size ? `Study the ${left} you don’t know` : `Study all ${words.length} free`;

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-ui-canvas font-sans text-ui-ink">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PublicPageHeader backTo={GUIDE_ROUTES.tocfl} backLabel="TOCFL prep" onSignIn={currentUser ? undefined : () => void signIn()} className="max-w-5xl" />

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

          <SearchField value={query} onChange={setQuery} placeholder="Find a word in any level" label="Find a word in any TOCFL level" />
          {searching && <WordSearchResults query={query} onPick={(hit) => { setFound(wordKey(hit.word[0], hit.word[1])); setQuery(''); }} />}

          {/* The list stays in the page while a search covers it. */}
          <div className={cn('flex flex-col gap-6 lg:gap-8', searching && 'hidden')}>

            <nav ref={levelTabs} aria-label="Levels" className="-mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0">
              {WORD_LIST_LEVELS.map((item) => {
                const { label, count } = wordListInfo(item);
                const current = item.slug === slug;
                return (
                  <Link
                    key={item.slug}
                    to={wordListPath(item.slug)}
                    aria-current={current ? 'page' : undefined}
                    className={cn(
                      'flex shrink-0 flex-col items-center rounded-sm border-2 border-b-4 px-3.5 pb-0.5 pt-1.5 leading-tight focus-ring',
                      current ? 'border-brand-primary bg-brand-primary-soft' : 'border-ui-border bg-ui-surface hover:bg-ui-hover',
                    )}
                  >
                    <span className="text-base font-black text-ui-ink-strong">{label}</span>
                    <span className="text-xs font-extrabold tabular-nums text-ui-muted-strong">{count.toLocaleString('en-US')} words</span>
                  </Link>
                );
              })}
            </nav>

          {info.parts > 1 && (
            <nav aria-label={`Parts of TOCFL ${info.label}`} className="flex flex-wrap gap-2">
              {parts.map((list, index) => (
                <Link
                  key={index}
                  to={wordListPath(slug, index + 1)}
                  aria-current={index + 1 === part ? 'page' : undefined}
                  className={cn(
                    'rounded-xs border-2 px-3 py-1 text-sm font-black tabular-nums focus-ring',
                    index + 1 === part ? 'border-brand-primary bg-brand-primary-soft text-brand-primary-deep' : 'border-ui-border bg-ui-surface text-ui-muted-strong hover:bg-ui-hover',
                  )}
                >
                  {wordListRange(list)}
                </Link>
              ))}
            </nav>
          )}

          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {words.map((word) => {
              const key = wordKey(word[0], word[1]);
              return <WordTile key={key} word={word} known={known.has(key)} found={found === key} onToggle={toggle} />;
            })}
          </ul>

          <section aria-labelledby="list-about" className="flex flex-col gap-2 border-t-2 border-ui-divider pt-8">
            <h2 id="list-about" className="text-xl font-black tracking-tight text-ui-ink-strong">About this list</h2>
            <p className="max-w-3xl text-base font-semibold leading-relaxed text-ui-ink">
              {info.parts > 1 ? `This is part ${part} of ${info.parts} of the` : 'These are the'} {info.count.toLocaleString('en-US')} words of TBCL Level {level}, the official word list behind TOCFL {info.label}{' '}
              (<span lang="zh-Hant" className="font-chinese">{info.examName}</span>). The words, their level and their pinyin follow
              the list published by Taiwan’s National Academy for Educational Research. The short English meanings are
              our own.
            </p>
          </section>

          <nav aria-label="More" className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t-2 border-ui-divider pt-8">
            {next && <Link to={next.to} className={LINK}>Next: TOCFL {next.name} →</Link>}
            <Link to={GUIDE_ROUTES.tocfl} className={LINK}>TOCFL mock tests</Link>
            <Link to={GUIDE_ROUTES.books} className={LINK}>Books &amp; lessons</Link>
            <Link to={LEGAL_ROUTES.sources} className={LINK}>Sources</Link>
          </nav>
          </div>
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

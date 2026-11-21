import { use, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { GUIDE_ROUTES, LESSON_PAGE_LESSONS, TAB_ROUTES, lessonPagePath, type LessonPageRef } from '../../app/routes';
import { PracticeChoiceButton } from '../../features/practice';
import { useAuth } from '../../hooks/useAuth';
import { useCharacterFont } from '../../hooks/useCharacterFont';
import { usePageMeta } from '../../hooks/usePageMeta';
import { ActionButton, AppIcon, BrandWordmark, SpeakerIcon } from '../../lib/widgets';
import { cn } from '../../utils/cn';
import { rememberLessonReturn } from '../../utils/browser/lessonReturn';
import { dismissPrerender } from '../../utils/browser/prerender';
import { SignInConsent, SignInMessageNote, useGoogleSignIn } from '../auth';
import { playWord } from '../landing/demos/demoUtils';
import type { SampleWord } from '../landing/sampleWords';
import { loadLessonPageBook, loadedLessonPageBook } from './lessonPageData';
import { lessonPageMeta, lessonPageTitle } from './lessonPageMeta';
import type { LessonPageLine } from './lessonPageTypes';

const ART = import.meta.glob<string>('../../assets/images/landing/shelf/b[123]l*.webp', { eager: true, query: '?url', import: 'default' });
const artFor = ({ bookId, lessonId }: LessonPageRef) => ART[`../../assets/images/landing/shelf/b${bookId}l${String(lessonId).padStart(2, '0')}.webp`];

const SECTION_TITLE = 'text-xl font-black tracking-tight text-ui-ink-strong';
const LINK = 'rounded-xs text-sm font-extrabold text-brand-primary-text hover:underline focus-ring-inline';
/** Shown clearly; the lines after these fade out so the rest waits in the lesson. */
const CLEAR_LINES = 3;
/** Words with a recording to hear; the whole list follows lower down, to read. */
const HEARD_WORDS = 5;
const PUNCTUATION = /^[，。！？、]+$/;
const attachesToWord = (line: LessonPageLine, index: number) => index > 0 && typeof line[index - 1] !== 'string' && PUNCTUATION.test(line[index] as string);
const trailingPunctuation = (line: LessonPageLine, index: number) => (index + 1 < line.length && attachesToWord(line, index + 1) ? line[index + 1] as string : '');
/** Inline: a one-off fade is not worth a rule in the critical CSS. */
function fade(from: string, to: string) {
  const image = `linear-gradient(to bottom, black ${from}, transparent ${to})`;
  return { maskImage: image, WebkitMaskImage: image };
}

/**
 * Public page for one lesson: a few words to hear, the start of a short conversation, the grammar
 * point names and the lesson's whole word list, ending in one button. The recordings, exercises
 * and tests stay in the lesson. Prerendered at build time (scripts/build/prerender.ts).
 */
export function LessonPageScreen({ bookId, lessonId }: LessonPageRef) {
  const ref = { bookId, lessonId };
  // Suspends once per book while its sample downloads; the prerendered page stays up meanwhile.
  const page = (loadedLessonPageBook(bookId) ?? use(loadLessonPageBook(bookId)))[lessonId];
  const { en, zh } = lessonPageTitle(ref);
  const { signIn, error, isBusy } = useGoogleSignIn();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  useCharacterFont();
  usePageMeta(lessonPageMeta(ref));
  useEffect(dismissPrerender, []);

  // The longest word of the question line: usually the lesson's key word.
  const firstPick = useMemo(() => {
    const words = page.lines[CLEAR_LINES - 1].filter((token): token is SampleWord => typeof token !== 'string');
    return words.reduce((best, word) => (word[0].length > best[0].length ? word : best), words[0]);
  }, [page]);
  const [picked, setPicked] = useState<SampleWord>(firstPick);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => { setPicked(firstPick); }, [firstPick]);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setPlaying(null), 900);
    return () => window.clearTimeout(timer);
  }, [playing]);

  const hear = (word: SampleWord, key: string) => { playWord(word); setPlaying(key); };
  // Sign-in returns to the home address, so the lesson is remembered and opened from there.
  const study = () => {
    rememberLessonReturn(ref);
    if (currentUser) navigate(TAB_ROUTES.path); else void signIn();
  };
  // One confident button: tall, big label, an arrow that says "go". It fills its column, so its edges line up with the blocks below.
  const studyButton = (

    <ActionButton
      size="lg"
      fullWidth
      onClick={study}
      loading={isBusy && !currentUser}
      loadingLabel="Opening Google"
      className="normal-case tracking-normal text-xl"
      frontClassName="min-h-14 lg:min-h-16"
    >
      Study
      <AppIcon name="forward" size={22} />
    </ActionButton>
  );
  const art = artFor(ref);

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-ui-canvas font-sans text-ui-ink">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <header className="mx-auto flex w-full max-w-5xl items-center gap-3 px-5 py-3 lg:px-10">
          <Link to="/" aria-label="Ron's Mandarin home" className="mr-auto rounded-xs focus-ring-inline"><BrandWordmark /></Link>
          {!currentUser && (
            <ActionButton variant="secondary" size="sm" onClick={() => void signIn()} className="normal-case tracking-normal text-sm px-3.5">Sign in</ActionButton>
          )}
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 pb-10 pt-2 lg:gap-12 lg:px-10 lg:pb-16 lg:pt-4">
          <section className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-10">
            {art && <img src={art} alt="" width={640} height={360} className="aspect-video w-full rounded-feature object-cover" />}
            <div className="flex min-w-0 flex-col gap-5 lg:justify-center lg:gap-7">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-extrabold text-ui-muted-strong">Modern Chinese {bookId} · Lesson {lessonId}</p>
                <h1 className="text-3xl font-black leading-tight tracking-tight text-ui-ink-strong text-balance lg:text-4xl">{en}</h1>
                <p lang="zh-Hant" className="font-chinese text-xl font-semibold text-ui-muted-strong lg:text-2xl">{zh}</p>
              </div>
              <div className="hidden flex-col gap-3 lg:flex">
                {studyButton}
                {error && <SignInMessageNote message={error} />}
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-10 border-t-2 border-ui-divider pt-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
            <section aria-labelledby="lesson-read" className="flex min-w-0 flex-col gap-3">
              <h2 id="lesson-read" className={SECTION_TITLE}>Read along</h2>
              <div lang="zh-Hant" className="flex flex-col gap-2.5">
                {page.lines.map((line, lineIndex) => {
                  const clear = lineIndex < CLEAR_LINES;
                  const right = lineIndex % 2 === 1;
                  return (
                    <p
                      key={lineIndex}
                      style={clear ? undefined : fade('0%', '78%')}
                      className={cn(
                        'max-w-[90%] border-2 border-ui-border px-3 py-2 font-chinese text-2xl font-semibold leading-normal text-ui-ink-strong',
                        right ? 'self-end rounded-feature rounded-br-xs bg-ui-hover' : 'self-start rounded-feature rounded-bl-xs bg-ui-surface',
                        !clear && 'pointer-events-none select-none',
                      )}
                    >
                      {line.map((token, tokenIndex) => {
                        if (typeof token === 'string') return attachesToWord(line, tokenIndex) ? null : token;
                        if (!clear) return token[0] + trailingPunctuation(line, tokenIndex);
                        const key = `line-${lineIndex}-${tokenIndex}`;
                        // The word and the mark after it wrap together, so a line never starts with ？ or ，.
                        return (
                          <span key={key} className="whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => { setPicked(token); hear(token, 'picked'); }}
                              aria-label={`${token[0]}, ${token[1]}, ${token[2]}`}
                              className={cn(
                                'rounded-t-xs border-b-2 px-0.5 focus-ring-inline',
                                picked === token ? 'border-brand-primary bg-brand-primary-soft' : 'border-transparent hover:bg-ui-hover',
                              )}
                            >
                              {token[0]}
                            </button>
                            {trailingPunctuation(line, tokenIndex)}
                          </span>
                        );
                      })}
                    </p>
                  );
                })}
              </div>
              <PracticeChoiceButton state="selected" onClick={() => hear(picked, 'picked')} aria-label={`Play ${picked[0]}`} idleClassName="" selectedClassName="!px-4 !py-3">
                <span className="flex w-full items-center gap-4">
                  <span lang="zh-Hant" className="font-chinese text-3xl font-semibold text-ui-ink-strong">{picked[0]}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-base font-black text-ui-ink-strong">{picked[1]}</span>
                    <span className="text-base font-bold text-ui-ink">{picked[2]}</span>
                  </span>
                  <SpeakerIcon status={playing === 'picked' ? 'playing' : null} className="shrink-0 text-brand-primary" />
                </span>
              </PracticeChoiceButton>
            </section>

            <section aria-labelledby="lesson-words" className="flex min-w-0 flex-col gap-3">
              <h2 id="lesson-words" className={SECTION_TITLE}>Words</h2>
              <ul className="flex flex-col gap-2">
                {page.words.slice(0, HEARD_WORDS).map((word, index) => {
                  const key = `word-${index}`;
                  return (
                    <li key={word[3]}>
                      <PracticeChoiceButton onClick={() => hear(word, key)} aria-label={`Play ${word[0]}, ${word[1]}, ${word[2]}`} idleClassName="!px-4 !py-2.5">
                        <span className="flex w-full items-center gap-4">
                          <span lang="zh-Hant" className="min-w-16 font-chinese text-2xl font-semibold text-ui-ink-strong">{word[0]}</span>
                          <span className="flex min-w-0 flex-1 flex-wrap gap-x-2.5 text-base">
                            <span className="font-black text-ui-ink-strong">{word[1]}</span>
                            <span className="font-bold text-ui-ink">{word[2]}</span>
                          </span>
                          <SpeakerIcon status={playing === key ? 'playing' : null} className={cn('shrink-0', playing === key ? 'text-brand-primary' : 'text-ui-muted')} />
                        </span>
                      </PracticeChoiceButton>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <section aria-labelledby="lesson-grammar" className="flex flex-col gap-1 border-t-2 border-ui-divider pt-8">
            <h2 id="lesson-grammar" className={SECTION_TITLE}>Grammar in this lesson</h2>
            <ul className="divide-y-2 divide-ui-divider">
              {page.grammar.map(([title, pattern]) => (
                <li key={title} className="flex flex-col gap-0.5 py-3.5 lg:grid lg:grid-cols-2 lg:items-baseline lg:gap-6">
                  <span className="text-base font-black text-ui-ink-strong">{title}</span>
                  <span lang="zh-Hant" className="font-chinese text-lg font-semibold text-ui-muted-strong">{pattern}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="lesson-list" className="flex flex-col gap-3 border-t-2 border-ui-divider pt-8">
            <h2 id="lesson-list" className={SECTION_TITLE}>All {page.list.length} words</h2>
            <ul className="gap-x-10 sm:columns-2 lg:columns-3">
              {page.list.map(([hanzi, pinyin, meaning], index) => (
                <li key={index} className="flex break-inside-avoid items-baseline gap-3 border-b-2 border-ui-divider py-2.5">
                  <span lang="zh-Hant" className="min-w-16 shrink-0 font-chinese text-xl font-semibold text-ui-ink-strong">{hanzi}</span>
                  <span className="flex min-w-0 flex-1 flex-wrap gap-x-2.5 text-base">
                    <span className="font-black text-ui-ink-strong">{pinyin}</span>
                    <span className="font-bold text-ui-ink">{meaning}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <nav aria-label="More lessons" className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t-2 border-ui-divider pt-8">
            {lessonId > 1 && <Link to={lessonPagePath(bookId, lessonId - 1)} className={LINK}>← Lesson {lessonId - 1}</Link>}
            {lessonId < LESSON_PAGE_LESSONS && <Link to={lessonPagePath(bookId, lessonId + 1)} className={LINK}>Lesson {lessonId + 1} →</Link>}
            <Link to={GUIDE_ROUTES.books} className={LINK}>All lessons</Link>
          </nav>
          {!currentUser && <SignInConsent className="!text-sm !font-semibold !text-ui-muted" />}
        </main>
      </div>

      <div className="flex flex-col gap-2 bg-ui-canvas px-5 pb-3 pt-2 lg:hidden">
        {error && <SignInMessageNote message={error} />}
        {studyButton}
      </div>
    </div>
  );
}

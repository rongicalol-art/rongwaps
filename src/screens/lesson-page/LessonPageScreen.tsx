import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { GUIDE_ROUTES, LESSON_PAGE_BOOK, LESSON_PAGE_LESSONS, TAB_ROUTES, lessonPagePath } from '../../app/routes';
import { PracticeChoiceButton } from '../../features/practice';
import { useAuth } from '../../hooks/useAuth';
import { useCharacterFont } from '../../hooks/useCharacterFont';
import { usePageMeta } from '../../hooks/usePageMeta';
import { ActionButton, AppIcon, BrandWordmark, SpeakerIcon } from '../../lib/widgets';
import { cn } from '../../utils/cn';
import { dismissPrerender } from '../../utils/browser/prerender';
import { GoogleSignInButton, SignInConsent, SignInMessageNote, useGoogleSignIn } from '../auth';
import { playWord } from '../landing/demos/demoUtils';
import type { SampleWord } from '../landing/sampleWords';
import { LESSON_PAGES } from './lessonPageData';
import { lessonPageMeta, lessonPageTitle } from './lessonPageMeta';

const ART = import.meta.glob<string>('../../assets/images/landing/shelf/b1l*.webp', { eager: true, query: '?url', import: 'default' });
const artFor = (lessonId: number) => ART[`../../assets/images/landing/shelf/b${LESSON_PAGE_BOOK}l${String(lessonId).padStart(2, '0')}.webp`];

const SECTION_TITLE = 'text-xl font-black tracking-tight text-ui-ink-strong';
const LINK = 'rounded-xs text-sm font-extrabold text-brand-primary-text hover:underline focus-ring-inline';
/** Shown clearly; the lines and words after these fade out so the rest waits in the lesson. */
const CLEAR_LINES = 3;
const CLEAR_WORDS = 5;
/** Inline: a one-off fade is not worth a rule in the critical CSS. */
function fade(from: string, to: string) {
  const image = `linear-gradient(to bottom, black ${from}, transparent ${to})`;
  return { maskImage: image, WebkitMaskImage: image };
}

/**
 * Public page for one lesson: a few words to hear, the start of a short conversation and the
 * grammar point names, ending in one button. A taste, so search visitors open the lesson for
 * the rest. Prerendered at build time (scripts/build/prerender.ts).
 */
export function LessonPageScreen({ lessonId }: { lessonId: number }) {
  const page = LESSON_PAGES[lessonId];
  const { en, zh } = lessonPageTitle(lessonId);
  const { signIn, error, isBusy } = useGoogleSignIn();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  useCharacterFont();
  usePageMeta(lessonPageMeta(lessonId));
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
  const study = () => (currentUser ? navigate(TAB_ROUTES.path) : void signIn());
  // Signed out, Study is the landing page's Google button: the tile says what the tap does.
  const studyButton = (fullWidth: boolean) => (currentUser ? (
    <ActionButton size="lg" fullWidth={fullWidth} onClick={study} className="normal-case tracking-normal text-lg" frontClassName="px-8">
      Study
      <AppIcon name="forward" size={20} />
    </ActionButton>
  ) : (
    <GoogleSignInButton onClick={study} busy={isBusy} label="Study" fullWidth={fullWidth} />
  ));
  const art = artFor(lessonId);

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
          <section className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-center lg:gap-10">
            {art && <img src={art} alt="" width={640} height={360} className="aspect-video w-full rounded-feature object-cover" />}
            <div className="flex min-w-0 flex-col gap-5">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-extrabold text-ui-muted-strong">Modern Chinese {LESSON_PAGE_BOOK} · Lesson {lessonId}</p>
                <h1 className="text-3xl font-black leading-tight tracking-tight text-ui-ink-strong text-balance lg:text-4xl">{en}</h1>
                <p lang="zh-Hant" className="font-chinese text-xl font-semibold text-ui-muted-strong lg:text-2xl">{zh}</p>
              </div>
              <div className="hidden flex-col items-start gap-3 lg:flex">
                {studyButton(false)}
                {error && <SignInMessageNote message={error} />}
                {!currentUser && <SignInConsent className="!text-sm" />}
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-10 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
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
                        if (typeof token === 'string') return token;
                        if (!clear) return token[0];
                        const key = `line-${lineIndex}-${tokenIndex}`;
                        return (
                          <button
                            key={key}
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
              <ul className="flex flex-col gap-2" style={fade('64%', '98%')}>
                {page.words.map((word, index) => {
                  const clear = index < CLEAR_WORDS;
                  const key = `word-${index}`;
                  return (
                    <li key={word[3]} className={cn(!clear && 'pointer-events-none')}>
                      <PracticeChoiceButton onClick={() => hear(word, key)} tabIndex={clear ? undefined : -1} aria-label={`Play ${word[0]}, ${word[1]}, ${word[2]}`} idleClassName="!px-4 !py-2.5">
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

          <section aria-labelledby="lesson-grammar" className="flex flex-col gap-1">
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

          <nav aria-label="More lessons" className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {lessonId > 1 && <Link to={lessonPagePath(lessonId - 1)} className={LINK}>← Lesson {lessonId - 1}</Link>}
            {lessonId < LESSON_PAGE_LESSONS && <Link to={lessonPagePath(lessonId + 1)} className={LINK}>Lesson {lessonId + 1} →</Link>}
            <Link to={GUIDE_ROUTES.books} className={LINK}>All lessons</Link>
          </nav>
          {!currentUser && <SignInConsent className="!text-sm lg:hidden" />}
        </main>
      </div>

      <div className="flex flex-col gap-2 bg-ui-canvas px-5 pb-3 pt-2 lg:hidden">
        {error && <SignInMessageNote message={error} />}
        {studyButton(true)}
      </div>
    </div>
  );
}

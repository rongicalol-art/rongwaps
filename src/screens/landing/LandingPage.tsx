import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ActionButton, BrandWordmark } from '../../lib/widgets';
import { LEGAL_ROUTES } from '../../app/routes';
import { useCharacterFont } from '../../hooks/useCharacterFont';
import { usePageMeta } from '../../hooks/usePageMeta';
import { dismissPrerender } from '../../utils/browser/prerender';
import { DeskScene, GoogleSignInButton, SignInConsent, useGoogleSignIn } from '../auth';
import { LANDING_META, FAQ } from './landingContent';
import { TryIt } from './components/TryIt';
import { LessonShelf } from './components/LessonShelf';
import { NianLessonPhone, PHONE_SHOTS, PhoneShot } from './components/PhoneShot';

const nianArt = new URL('../../assets/images/readings/b2l14-r02-scene.webp', import.meta.url).href;
const nianArtSmall = new URL('../../assets/images/readings/b2l14-r02-scene-960.webp', import.meta.url).href;

const SECTION_TITLE = 'text-center text-3xl font-black tracking-tight text-ui-ink-strong text-balance lg:text-5xl';

/**
 * What signed-out visitors see at every app route: what the app is, playable samples and
 * Google sign-in. Prerendered at build time for search engines (scripts/build/prerender.ts).
 */
export function LandingPage() {
  const { signIn, error, isBusy, isSigningIn } = useGoogleSignIn();
  useCharacterFont();
  usePageMeta({ ...LANDING_META, path: '/' });
  useEffect(dismissPrerender, []);
  const start = () => void signIn();
  const [scrolled, setScrolled] = useState(false);

  return (
    <div
      className="h-[100dvh] w-full overflow-y-auto bg-ui-canvas font-sans text-ui-ink"
      onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 120)}
    >
      <header className={`sticky top-0 z-40 border-b-2 bg-ui-canvas transition-colors duration-200 ${scrolled ? 'border-ui-divider' : 'border-transparent'}`}>
        <div className="mx-auto flex w-full max-w-[90rem] items-center gap-3 px-5 py-3 lg:px-26">
          <BrandWordmark className="mr-auto" />
          <Link to={LEGAL_ROUTES.about} className="hidden rounded-xs px-2 py-1 text-sm font-extrabold text-ui-muted-strong hover:text-ui-ink focus-ring-inline lg:block">About</Link>
          <ActionButton variant="secondary" size="sm" onClick={start} className="normal-case tracking-normal text-sm px-3.5">Sign in</ActionButton>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[90rem] px-5 lg:px-26">

        <main>
          <section className="flex flex-col items-center pt-8 text-center lg:flex-row-reverse lg:pt-16 lg:items-center lg:justify-between lg:gap-12 lg:text-left">
            <DeskScene leaving={isSigningIn} className="size-60 shrink-0 lg:size-120" />
            <div className="flex max-w-2xl flex-col items-center lg:items-start">
              <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-ui-ink-strong text-balance lg:text-7xl">
                Practice <span className="whitespace-nowrap font-chinese text-brand-primary-text">時代華語</span> one lesson at a time
              </h1>
              <p className="mt-8 text-lg font-bold leading-relaxed text-ui-muted-strong lg:mt-10 text-balance lg:text-xl">
                Flashcards, quizzes and grammar for every lesson of the Taiwan textbook.
              </p>
              <GoogleSignInButton onClick={start} busy={isBusy} className="mt-10 lg:mt-14" />
              {error && <p role="alert" className="mt-3 rounded-sm bg-feedback-danger-surface px-3.5 py-2.5 text-sm font-bold text-feedback-danger-text">{error}</p>}
              <SignInConsent className="mt-6 lg:mt-8" />
            </div>
          </section>

          <section aria-label="Every lesson is its own story" className="mt-10 lg:mt-6">
            <div className="relative">
              <img src={nianArtSmall} srcSet={`${nianArtSmall} 960w, ${nianArt} 1672w`} sizes="(min-width: 1024px) 1240px, 100vw" fetchPriority="high" width={1672} height={941} alt="The Nian monster flees a red doorway as firecrackers burst" className="aspect-video w-full rounded-feature object-cover lg:rounded-modal" />
              <NianLessonPhone className="absolute -bottom-18 -right-10 hidden w-60 lg:block" />
            </div>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
              <span className="text-lg font-black text-ui-ink-strong lg:text-2xl">Every lesson is its own story</span>
              <span className="text-sm font-extrabold text-ui-muted-strong">Book 2 · Lesson 14</span>
            </p>
          </section>

          <section className="mt-18 lg:mt-36">
            <h2 className={SECTION_TITLE}>Try it here</h2>
            <TryIt />
          </section>

          <section className="mt-18 lg:mt-36">
            <h2 className={SECTION_TITLE}>Made for your phone</h2>
            <div className="-mx-5 mt-6 flex snap-x items-start gap-3.5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] lg:mx-0 lg:mt-12 lg:justify-center lg:gap-8 lg:overflow-visible lg:px-0">
              {PHONE_SHOTS.map((shot, i) => (
                <PhoneShot key={shot.src} {...shot} className={i % 2 ? 'w-52 shrink-0 snap-center lg:mt-12 lg:w-64' : 'w-52 shrink-0 snap-center lg:w-64'} />
              ))}
            </div>
          </section>

          <section className="mt-18 lg:mt-36">
            <h2 className={SECTION_TITLE}>Your book, lesson by lesson</h2>
            <LessonShelf />
          </section>

          <section className="mt-18 lg:mt-36">
            <h2 className="text-3xl font-black tracking-tight text-ui-ink-strong lg:text-5xl">Questions</h2>
            <div className="mt-5 grid items-start lg:mt-8 lg:grid-cols-2 lg:gap-x-16">
              {[FAQ.slice(0, Math.ceil(FAQ.length / 2)), FAQ.slice(Math.ceil(FAQ.length / 2))].map((col, c) => (
                <div key={c}>
              {col.map(({ q, a }, i) => (
                <details key={q} open={c === 0 && i === 0} className="group border-b border-ui-divider py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xs text-lg font-black text-ui-ink-strong focus-ring-inline [&::-webkit-details-marker]:hidden">
                    {q}
                    <span aria-hidden="true" className="text-ui-muted group-open:hidden">+</span>
                    <span aria-hidden="true" className="hidden text-ui-muted group-open:inline">–</span>
                  </summary>
                  <p className="mt-2 font-bold leading-relaxed text-ui-ink">{a}</p>
                </details>
              ))}
                </div>
              ))}
            </div>
          </section>
        </main>

        <footer className="mt-16 flex flex-col gap-3 border-t border-ui-divider py-6 text-sm font-bold text-ui-muted-strong lg:mt-30 lg:flex-row lg:justify-between">
          <span>Independent project. Not affiliated with Tamkang University or Cheng Chung Book Co.</span>
          <nav className="flex flex-wrap gap-4">
            {([['About', LEGAL_ROUTES.about], ['Sources', LEGAL_ROUTES.sources], ['Terms', LEGAL_ROUTES.terms], ['Privacy', LEGAL_ROUTES.privacy]] as const).map(([label, to]) => (
              <Link key={to} to={to} className="rounded-xs font-extrabold text-ui-muted-strong hover:text-ui-ink focus-ring-inline">{label}</Link>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  );
}

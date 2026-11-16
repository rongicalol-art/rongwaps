import { Link } from 'react-router';
import { GUIDE_ROUTES, LEGAL_ROUTES, type GuidePage } from '../../app/routes';
import { GoogleSignInButton, SignInConsent, SignInMessageNote, useGoogleSignIn } from '../auth';
import { docLinkClass } from '../public-doc';

const GUIDE_LINKS: { key: GuidePage; label: string; to: string }[] = [
  { key: 'books', label: 'Books & Lessons', to: GUIDE_ROUTES.books },
  { key: 'grammar', label: 'Grammar & Exercises', to: GUIDE_ROUTES.grammar },
  { key: 'tocfl', label: 'TOCFL Mock Tests', to: GUIDE_ROUTES.tocfl },
];

export function GuideCta({ current }: { current: GuidePage }) {
  const { signIn, error, isBusy } = useGoogleSignIn();
  const others = GUIDE_LINKS.filter((item) => item.key !== current);

  return (
    <section aria-label="Start practicing" className="flex flex-col gap-5 rounded-feature bg-ui-surface p-5 sm:p-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold tracking-tight text-ui-ink-strong sm:text-xl">
          Start studying alongside your book
        </h2>
        <p className="text-base font-semibold leading-relaxed text-ui-ink">
          Free for learners 18 and older with a Google account. Pick up your lesson in seconds with zero ads.
        </p>
      </div>
      <div className="flex flex-col items-start gap-3">
        <GoogleSignInButton onClick={() => void signIn()} busy={isBusy} />
        {error && <SignInMessageNote message={error} />}
        <SignInConsent />
      </div>
      <nav aria-label="Related guides" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-ui-divider pt-4 text-sm">
        <Link to="/" className={docLinkClass}>Home &amp; live demo</Link>
        {others.map((item) => (
          <Link key={item.key} to={item.to} className={docLinkClass}>{item.label}</Link>
        ))}
        <Link to={LEGAL_ROUTES.about} className={docLinkClass}>About</Link>
      </nav>
    </section>
  );
}

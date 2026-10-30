import { Link } from 'react-router';
import { LEGAL_ROUTES } from '../../app/routes';
import { ActionButton } from '../../lib/widgets';
import { cn } from '../../utils/cn';

/** Primary Google sign-in button with the multicolour "G" tile. */
export function GoogleSignInButton({ onClick, busy, label = 'Sign in with Google', className }: {
  onClick: () => void;
  busy: boolean;
  label?: string;
  className?: string;
}) {
  // ActionButton puts className on its moving face, so outer spacing lives on a wrapper.
  return (
    <div className={className}>
      <ActionButton
        variant="primary"
        size="lg"
        onClick={onClick}
        loading={busy}
        loadingLabel="Opening Google"
        className="normal-case tracking-normal"
        frontClassName="pl-14 pr-6"
      >
        <span aria-hidden="true" className="absolute left-3 flex size-9 items-center justify-center rounded-xs bg-ui-surface">
          <GoogleMark />
        </span>
        {label}
      </ActionButton>
    </div>
  );
}

/** The consent line under a sign-in action. */
export function SignInConsent({ className }: { className?: string }) {
  return (
    <p className={cn('text-sm font-bold text-ui-muted lg:text-base', className)}>
      By continuing you agree to the{' '}
      <Link to={LEGAL_ROUTES.terms} className="rounded-xs font-extrabold text-brand-primary-text hover:underline focus-ring-inline">Terms</Link>
      {' '}and{' '}
      <Link to={LEGAL_ROUTES.privacy} className="rounded-xs font-extrabold text-brand-primary-text hover:underline focus-ring-inline">Privacy Policy</Link>.
    </p>
  );
}

/** Google's multicolour "G"; brand colours are Google's own, not app tokens. */
export function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

import { cn } from '../../utils/cn';
import { Link } from 'react-router';
import { LEGAL_CONTACT_EMAIL } from '../../screens/legal';
import { LEGAL_ROUTES } from '../routes';

const linkClass =
  'rounded-xs px-1 text-[13px] font-extrabold uppercase tracking-wider text-ui-muted transition-colors hover:text-ui-ink focus-ring-inline';

/** Quiet About / Terms / Privacy / Credits / Feedback links at the foot of the Books, Library and Dictionary pages. */
export function AppFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('flex flex-col items-center gap-3 pt-1 text-center', className)}>
      <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <Link to={LEGAL_ROUTES.about} className={linkClass}>About</Link>
        <Link to={LEGAL_ROUTES.terms} className={linkClass}>Terms</Link>
        <Link to={LEGAL_ROUTES.privacy} className={linkClass}>Privacy</Link>
        <Link to={LEGAL_ROUTES.credits} className={linkClass}>Credits</Link>
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}?subject=Ron%27s%20Mandarin%20feedback`} className={linkClass}>Feedback</a>
      </nav>
      <p className="text-xs font-bold text-ui-muted/80">© {new Date().getFullYear()} Ron's Mandarin</p>
    </footer>
  );
}

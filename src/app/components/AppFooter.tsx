import { cn } from '../../utils/cn';
import { Link } from 'react-router';
import { useState } from 'react';
import { FeedbackDrawer } from './FeedbackDrawer';
import { LEGAL_ROUTES } from '../routes';

const linkClass =
  'rounded-xs px-1 text-[13px] font-extrabold uppercase tracking-wider text-ui-muted transition-colors hover:text-ui-ink focus-ring-inline';

/** Quiet About / Terms / Privacy / Sources / Feedback links at the foot of the Learn, Library and Dictionary pages. */
export function AppFooter({ className }: { className?: string }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  return (
    <footer className={cn('flex flex-col items-center gap-3 pt-1 text-center', className)}>
      <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <Link to={LEGAL_ROUTES.about} className={linkClass}>About</Link>
        <Link to={LEGAL_ROUTES.terms} className={linkClass}>Terms</Link>
        <Link to={LEGAL_ROUTES.privacy} className={linkClass}>Privacy</Link>
        <Link to={LEGAL_ROUTES.sources} className={linkClass}>Sources</Link>
        <button type="button" onClick={() => setFeedbackOpen(true)} className={linkClass}>Feedback</button>
      </nav>
      <p className="text-xs font-bold text-ui-muted/80">© {new Date().getFullYear()} Ron's Mandarin</p>
      <FeedbackDrawer isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </footer>
  );
}

import { Link, useNavigate, useNavigationType } from 'react-router';
import { ActionButton, AppIcon, BrandWordmark, IconActionButton } from '../../lib/widgets';
import { cn } from '../../utils/cn';

interface PublicPageHeaderProps {
  /** Where Back goes when the visitor landed here directly (from a search result or a shared link). */
  backTo: string;
  backLabel: string;
  /** Shown to signed-out visitors only. */
  onSignIn?: () => void;
  /** Width of the page's own column, so the header lines up with it. */
  className?: string;
}

/**
 * Top bar of a public page that has a parent (a lesson, a grammar pattern, a word list): Back,
 * the wordmark, and Sign in. Back returns to the page the visitor came from inside the site;
 * someone who arrived from outside goes up to the parent instead of leaving.
 */
export function PublicPageHeader({ backTo, backLabel, onSignIn, className }: PublicPageHeaderProps) {
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const back = () => { if (navigationType === 'PUSH') void navigate(-1); else void navigate(backTo); };
  return (
    <header className={cn('mx-auto flex w-full items-center gap-2 py-3 pl-2 pr-5 lg:pl-7 lg:pr-10', className)}>
      <IconActionButton onClick={back} variant="quiet" size="lg" label={backLabel} icon={<AppIcon name="back" size={22} />} />
      <Link to="/" aria-label="Ron's Mandarin home" className="mr-auto rounded-xs focus-ring-inline"><BrandWordmark /></Link>
      {onSignIn && (
        <ActionButton variant="secondary" size="sm" onClick={onSignIn} className="normal-case tracking-normal text-sm px-3.5">Sign in</ActionButton>
      )}
    </header>
  );
}

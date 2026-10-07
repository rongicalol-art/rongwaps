import { useNavigate, useNavigationType } from 'react-router';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { StickyWorkspaceHeader } from '../../lib/widgets';
import type { LegalPage } from '../../app/routes';
import { LEGAL_EFFECTIVE_DATE } from './legalMeta';
import { PrivacyPolicyContent } from './PrivacyPolicyContent';
import { TermsContent } from './TermsContent';

const PAGES: Record<LegalPage, { title: string; Content: () => React.JSX.Element }> = {
  privacy: { title: 'Privacy Policy', Content: PrivacyPolicyContent },
  terms: { title: 'Terms of Service', Content: TermsContent },
};

/**
 * Public legal page. Standalone on purpose: it renders outside the workspace
 * shell, so it needs no sign-in and is not covered by the sign-in window.
 * It owns its own scroller because the document itself never scrolls.
 */
export function LegalScreen({ page }: { page: LegalPage }) {
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const { title, Content } = PAGES[page];
  useDocumentTitle(title);

  // A pushed entry came from inside the app, so Back returns there; a direct
  // visit has nothing to go back to, so it opens the app.
  const handleBack = () => (navigationType === 'PUSH' ? navigate(-1) : navigate('/'));

  return (
    <div className="h-[100dvh] w-full overflow-y-auto bg-ui-canvas font-sans text-ui-ink">
      <StickyWorkspaceHeader title={title} onBack={handleBack} backLabel="Back to Ron's Mandarin" />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 pb-24 pt-2 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="rounded-xs border-2 border-ui-border bg-ui-surface px-2 py-0.5 text-xs font-black uppercase tracking-wider text-ui-muted-strong">
            Beta
          </span>
          <p className="text-sm font-bold text-ui-muted-strong">Effective {LEGAL_EFFECTIVE_DATE}</p>
        </div>
        <Content />
      </main>
    </div>
  );
}

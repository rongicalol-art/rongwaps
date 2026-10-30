import { useEffect, useRef, useState } from 'react';
import { useNavigate, useNavigationType } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { documentTitleFor } from '../../utils/browser/documentTitle';
import { dismissPrerender } from '../../utils/browser/prerender';
import { StickyWorkspaceHeader } from '../../lib/widgets';
import { LEGAL_ROUTES, type LegalPage } from '../../app/routes';
import { LEGAL_EFFECTIVE_DATE, formatLegalDate } from './legalMeta';
import { AboutContent } from './AboutContent';
import { SourcesContent } from './SourcesContent';
import { PrivacyPolicyContent } from './PrivacyPolicyContent';
import { TermsContent } from './TermsContent';

/** `dated`: binding documents show their effective date. */
const PAGES: Record<LegalPage, { title: string; description: string; Content: () => React.JSX.Element; dated?: boolean }> = {
  about: { title: "About Ron's Mandarin", description: "Who makes Ron's Mandarin, what it teaches, and how it follows the 時代華語 Modern Chinese textbooks.", Content: AboutContent },
  sources: { title: 'Sources & Licenses', description: "The dictionaries, fonts, audio and other sources Ron's Mandarin is built on, with their licenses.", Content: SourcesContent },
  privacy: { title: 'Privacy Policy', description: "What Ron's Mandarin stores, why, and how to download or delete your data.", Content: PrivacyPolicyContent, dated: true },
  terms: { title: 'Terms of Service', description: "The terms for using Ron's Mandarin.", Content: TermsContent, dated: true },
};

/** Title, description and path of a public page; shared with the build-time prerender. */
export function legalPageMeta(page: LegalPage) {
  return { title: documentTitleFor(PAGES[page].title), description: PAGES[page].description, path: LEGAL_ROUTES[page] };
}

/**
 * Public About, Sources & Licenses or legal page. Standalone on purpose: it renders outside the workspace
 * shell, so it needs no sign-in and is not covered by the sign-in window.
 * It owns its own scroller because the document itself never scrolls.
 */
export function LegalScreen({ page }: { page: LegalPage }) {
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const { title, Content, dated } = PAGES[page];
  const contentRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    const headings = contentRef.current?.querySelectorAll('section h2') ?? [];
    setSections(Array.from(headings, (heading, index) => {
      const id = `section-${index}`;
      heading.id = id;
      return { id, title: heading.textContent ?? '' };
    }));
  }, [page]);
  usePageMeta(legalPageMeta(page));
  useEffect(dismissPrerender, []);

  // A pushed entry came from inside the app, so Back returns there; a direct
  // visit has nothing to go back to, so it opens the app.
  const handleBack = () => (navigationType === 'PUSH' ? navigate(-1) : navigate('/'));

  return (
    <div className="h-[100dvh] w-full overflow-y-auto bg-ui-canvas font-sans text-ui-ink">
      <StickyWorkspaceHeader title={title} onBack={handleBack} backLabel="Back to Ron's Mandarin" className="lg:[&_h1]:translate-x-36" />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-2 sm:px-6">
        <div className="lg:grid lg:grid-cols-[14rem_minmax(0,42rem)] lg:justify-center lg:gap-16">
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-24 flex flex-col gap-1">
              {sections.map((section) => (
                <a key={section.id} href={`#${section.id}`} className="rounded-xs px-2 py-1 text-sm font-bold text-ui-muted-strong hover:bg-ui-surface hover:text-ui-ink focus-ring-inline">
                  {section.title}
                </a>
              ))}
            </div>
          </nav>
          <div ref={contentRef} className="mx-auto flex w-full max-w-2xl flex-col gap-8">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="rounded-xs border-2 border-ui-border bg-ui-surface px-2 py-0.5 text-xs font-black uppercase tracking-wider text-ui-muted-strong">
                Beta
              </span>
              {dated && <p className="text-sm font-bold text-ui-muted-strong">Effective {formatLegalDate(LEGAL_EFFECTIVE_DATE)}</p>}
            </div>
            <Content />
          </div>
        </div>
      </main>
    </div>
  );
}

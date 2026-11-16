import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useNavigationType } from 'react-router';
import { StickyWorkspaceHeader } from '../../lib/widgets';
import { usePageMeta, type PageMeta } from '../../hooks/usePageMeta';
import { dismissPrerender } from '../../utils/browser/prerender';

export interface PublicDocLayoutProps {
  title: string;
  meta: PageMeta;
  /** Re-scans `section h2` headings when the active page key changes. */
  pageKey: string;
  headerBanner?: ReactNode;
  children: ReactNode;
}

/**
 * Shared standalone layout for public pages (About, Legal, Books, Grammar, TOCFL).
 * Renders outside the authenticated workspace shell with a sticky back header and a desktop section rail.
 */
export function PublicDocLayout({ title, meta, pageKey, headerBanner, children }: PublicDocLayoutProps) {
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const contentRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    const headings = contentRef.current?.querySelectorAll('section h2') ?? [];
    setSections(Array.from(headings, (heading, index) => {
      const id = `section-${index}`;
      heading.id = id;
      return { id, title: heading.textContent ?? '' };
    }));
  }, [pageKey]);

  usePageMeta(meta);
  useEffect(dismissPrerender, []);

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
            {headerBanner}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

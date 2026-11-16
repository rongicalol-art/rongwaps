import { Link } from 'react-router';
import { documentTitleFor } from '../../utils/browser/documentTitle';
import { LEGAL_ROUTES, type LegalPage } from '../../app/routes';
import { PublicDocLayout } from '../public-doc';
import { LEGAL_EFFECTIVE_DATE, LEGAL_NEW_ACCOUNTS_NOTE, LEGAL_UPDATE, formatLegalDate, isLegalUpdateCurrent } from './legalMeta';
import { legalLinkClass } from './LegalBlocks';
import { AboutContent } from './AboutContent';
import { SourcesContent } from './SourcesContent';
import { PrivacyPolicyContent } from './PrivacyPolicyContent';
import { TermsContent } from './TermsContent';

/** `dated`: binding documents show their effective date. */
const PAGES: Record<LegalPage, { title: string; description: string; Content: () => React.JSX.Element; dated?: boolean }> = {
  about: { title: 'About', description: "Who makes Ron's Mandarin, what it teaches, and how it follows the 時代華語 Modern Chinese textbooks.", Content: AboutContent },
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
 */
export function LegalScreen({ page }: { page: LegalPage }) {
  const { title, Content, dated } = PAGES[page];
  // A change that spans both binding pages links the other one, so one notice reaches both.
  const alsoUpdated = LEGAL_UPDATE && isLegalUpdateCurrent(LEGAL_EFFECTIVE_DATE) && LEGAL_UPDATE.pages.some((changed) => changed === page)
    ? LEGAL_UPDATE.pages.filter((changed) => changed !== page) : [];

  const banner = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="rounded-xs border-2 border-ui-border bg-ui-surface px-2 py-0.5 text-xs font-black uppercase tracking-wider text-ui-muted-strong">
        Beta
      </span>
      {dated && <p className="text-sm font-bold text-ui-muted-strong">Effective {formatLegalDate(LEGAL_EFFECTIVE_DATE)} · {LEGAL_NEW_ACCOUNTS_NOTE}</p>}
      {alsoUpdated.map((other) => (
        <p key={other} className="text-sm font-bold text-ui-muted-strong">
          Also updated: <Link to={LEGAL_ROUTES[other]} className={legalLinkClass}>{PAGES[other].title}</Link>
        </p>
      ))}
    </div>
  );

  return (
    <PublicDocLayout title={title} meta={legalPageMeta(page)} pageKey={page} headerBanner={banner}>
      <Content />
    </PublicDocLayout>
  );
}

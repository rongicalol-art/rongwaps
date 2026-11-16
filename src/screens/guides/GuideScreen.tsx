import type { GuidePage } from '../../app/routes';
import { PublicDocLayout } from '../public-doc';
import { GUIDE_META, guidePageMeta } from './guideContent';
import { GuideCta } from './GuideCta';
import { BooksGuideContent } from './BooksGuideContent';
import { GrammarGuideContent } from './GrammarGuideContent';
import { TocflGuideContent } from './TocflGuideContent';

const CONTENT: Record<GuidePage, () => React.JSX.Element> = {
  books: BooksGuideContent,
  grammar: GrammarGuideContent,
  tocfl: TocflGuideContent,
};

/**
 * Public curriculum, grammar and TOCFL guide screens. Standalone outside the workspace shell
 * so search engines, AI search crawlers and prospective learners can read them without signing in.
 */
export function GuideScreen({ page }: { page: GuidePage }) {
  const entry = GUIDE_META[page];
  const Content = CONTENT[page];

  const banner = (
    <div className="flex flex-col gap-2">
      <p className="ui-eyebrow text-brand-primary-text">{entry.eyebrow}</p>
      <p className="text-lg font-bold leading-relaxed text-ui-ink-strong">{entry.lead}</p>
    </div>
  );

  return (
    <PublicDocLayout title={entry.heading} meta={guidePageMeta(page)} pageKey={page} headerBanner={banner}>
      <Content />
      <GuideCta current={page} />
    </PublicDocLayout>
  );
}

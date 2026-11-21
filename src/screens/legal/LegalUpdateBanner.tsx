import { TopToast } from '../../lib/widgets';
import { shortLegalDate, type LegalUpdate } from './legalMeta';

const PAGE_TITLES: Record<LegalUpdate['pages'][number], string> = {
  terms: 'Terms',
  privacy: 'Privacy',
};

interface LegalUpdateBannerProps {
  update: LegalUpdate;
  effectiveDate: string;
  open?: boolean;
  /** Flow in place (DEV preview) instead of floating at the top. */
  inline?: boolean;
  onRead: () => void;
  onDismiss: () => void;
}

/** Announces a Terms/Privacy change: the date in the title, two short lines, the full text behind Read. */
export function LegalUpdateBanner({ update, effectiveDate, open = true, inline, onRead, onDismiss }: LegalUpdateBannerProps) {
  return (
    <TopToast
      open={open}
      inline={inline}
      icon="bell"
      title={`${update.pages.map((page) => PAGE_TITLES[page]).join(' and ')} update · ${shortLegalDate(effectiveDate)}`}
      message={update.summary}
      dismissLabel="Got it"
      onDismiss={onDismiss}
      actionLabel="Read"
      onAction={onRead}
    />
  );
}

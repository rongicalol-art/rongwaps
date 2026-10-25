import { TopToast } from '../../lib/widgets';
import { formatLegalDate, type LegalUpdate } from './legalMeta';

const PAGE_TITLES: Record<LegalUpdate['page'], string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
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

/** Announces a Terms/Privacy change ahead of its effective date. */
export function LegalUpdateBanner({ update, effectiveDate, open = true, inline, onRead, onDismiss }: LegalUpdateBannerProps) {
  return (
    <TopToast
      open={open}
      inline={inline}
      icon="bell"
      title={`${PAGE_TITLES[update.page]} update`}
      message={`${update.summary} Takes effect ${formatLegalDate(effectiveDate)}.`}
      dismissLabel="Later"
      onDismiss={onDismiss}
      actionLabel="Read"
      onAction={onRead}
    />
  );
}

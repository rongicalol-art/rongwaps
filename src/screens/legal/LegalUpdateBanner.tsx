import { ActionButton, AlertBanner } from '../../lib/widgets';
import { formatLegalDate, type LegalUpdate } from './legalMeta';

const PAGE_TITLES: Record<LegalUpdate['page'], string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
};

interface LegalUpdateBannerProps {
  update: LegalUpdate;
  effectiveDate: string;
  onRead: () => void;
  onDismiss: () => void;
}

/** Announces a Terms/Privacy change ahead of its effective date. */
export function LegalUpdateBanner({ update, effectiveDate, onRead, onDismiss }: LegalUpdateBannerProps) {
  return (
    <AlertBanner
      variant="info"
      role="status"
      title={`${PAGE_TITLES[update.page]} update`}
      message={`${update.summary} Takes effect ${formatLegalDate(effectiveDate)}.`}
      onDismiss={onDismiss}
      action={<ActionButton size="sm" onClick={onRead}>Read</ActionButton>}
    />
  );
}

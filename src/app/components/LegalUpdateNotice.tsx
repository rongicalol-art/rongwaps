import { useState } from 'react';
import { useNavigate } from 'react-router';
import { LEGAL_EFFECTIVE_DATE, LEGAL_UPDATE, LegalUpdateBanner, isLegalUpdateCurrent } from '../../screens/legal';
import { readString, writeString } from '../../utils/browser/localStorage';
import { LEGAL_ROUTES } from '../routes';

const DISMISSED_KEY = 'legal-update-dismissed';

/** Shows the pending Terms/Privacy change once per device until dismissed or 30 days after it takes effect. */
export function LegalUpdateNotice() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => readString(DISMISSED_KEY) === LEGAL_EFFECTIVE_DATE);
  const update = LEGAL_UPDATE;
  const show = Boolean(update) && !dismissed && isLegalUpdateCurrent(LEGAL_EFFECTIVE_DATE);
  if (!update) return null;

  const dismiss = () => {
    writeString(DISMISSED_KEY, LEGAL_EFFECTIVE_DATE);
    setDismissed(true);
  };

  return (
    <LegalUpdateBanner
      open={show}
      update={update}
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      onDismiss={dismiss}
      onRead={() => {
        dismiss();
        navigate(LEGAL_ROUTES[update.page]);
      }}
    />
  );
}

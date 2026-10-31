import { useState } from 'react';
import { TopToast } from '../../lib/widgets';
import { useAppStore } from '../../store/useAppStore';

/** Warns, without blocking, while progress can't be written to this device; comes back if a later write fails again. */
export function LocalSaveNotice() {
  const failed = useAppStore((s) => s.localSaveFailed);
  const [dismissed, setDismissed] = useState(false);
  // A successful write re-arms the notice for the next failure.
  if (!failed && dismissed) setDismissed(false);

  return (
    <TopToast
      open={failed && !dismissed}
      icon="deviceMobile"
      title="Can't save on this device"
      message="Stay online so your progress reaches your account, or free up some storage."
      dismissLabel="Got it"
      onDismiss={() => setDismissed(true)}
    />
  );
}

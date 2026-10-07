import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { debugLogger } from '../../utils/debug/debugLogger';
import { ActionButton, AlertBanner, AppIcon, ConfirmationDialog } from '../../lib/widgets';
import { useAccountActions } from '../hooks/useAccountActions';
import { LEGAL_ROUTES } from '../routes';

const DELETE_PHRASE = 'DELETE';

/**
 * Settings → Account: data export, account deletion (signed-in only) and the
 * legal links (always).
 */
export function SettingsAccountSection({ onNavigate }: { onNavigate: () => void }) {
  const { currentUser } = useAuth();
  const { exportData, deleteAccount } = useAccountActions();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleExport = async () => {
    setExportError(null);
    setIsExporting(true);
    try {
      await exportData();
    } catch (error) {
      debugLogger.error('Supabase', 'Data export failed:', error);
      setExportError('Your data could not be downloaded. Check your connection and try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const closeDelete = () => {
    setIsDeleteOpen(false);
    setConfirmText('');
    setDeleteError(null);
  };

  const handleDelete = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      // Success reloads the app into the sign-in screen, so there is no
      // follow-up state to settle here.
      await deleteAccount();
    } catch (error) {
      debugLogger.error('Supabase', 'Account deletion failed:', error);
      setDeleteError('Your account was not deleted. Check your connection and try again.');
      setIsDeleting(false);
    }
  };

  const linkClass = 'rounded-xs text-sm font-extrabold text-brand-primary hover:underline focus-ring-inline';

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ui-muted">Account</p>

      {currentUser && (
        <>
          <ActionButton variant="secondary" fullWidth onClick={handleExport} loading={isExporting} loadingLabel="Preparing download">
            <AppIcon name="download" size={18} />
            Download my data
          </ActionButton>
          {exportError && <AlertBanner variant="danger" message={exportError} onDismiss={() => setExportError(null)} />}
          <ActionButton
            variant="secondary"
            fullWidth
            onClick={() => setIsDeleteOpen(true)}
            className="border-feedback-danger/25 py-4 text-feedback-danger hover:bg-feedback-danger/10"
          >
            <AppIcon name="trash" size={18} />
            Delete account
          </ActionButton>
        </>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link to={LEGAL_ROUTES.privacy} onClick={onNavigate} className={linkClass}>Privacy Policy</Link>
        <Link to={LEGAL_ROUTES.terms} onClick={onNavigate} className={linkClass}>Terms of Service</Link>
      </div>

      {isDeleteOpen && (
        <ConfirmationDialog
          title="Delete your account?"
          description="This permanently deletes your account, learning progress, saved folders and custom cards from our servers. It cannot be undone. Download your data first if you want a copy."
          confirmLabel="Delete forever"
          confirmLoadingLabel="Deleting"
          confirmDisabled={confirmText.trim() !== DELETE_PHRASE}
          onConfirm={handleDelete}
          onCancel={closeDelete}
          isConfirming={isDeleting}
          errorMessage={deleteError}
        >
          <label className="mt-4 block text-left text-xs font-black uppercase tracking-wider text-ui-muted-strong">
            Type {DELETE_PHRASE} to confirm
            <input
              type="text"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              disabled={isDeleting}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="mt-2 w-full rounded-control border-2 border-ui-border bg-ui-surface px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-ui-ink outline-none focus-ring"
            />
          </label>
        </ConfirmationDialog>
      )}
    </div>
  );
}

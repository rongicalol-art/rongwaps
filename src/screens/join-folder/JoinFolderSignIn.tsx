import { useState } from 'react';
import { ActionButton, AppIcon, BrandWordmark, WorkspaceWindow } from '../../lib/widgets';
import { useAuth } from '../../hooks/useAuth';
import { rememberFolderReturn } from '../../utils/browser/shareLink';

export function JoinFolderSignIn({ code }: { code: string }) {
  const { loginWithGoogle, isLoading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSignIn = async () => {
    setError(null);
    setSigningIn(true);
    rememberFolderReturn(`/join/${code}`);
    try {
      await loginWithGoogle();
    } catch {
      setSigningIn(false);
      setError('Sign-in could not start. Please try again.');
    }
  };

  return (
    <WorkspaceWindow style={{ paddingLeft: 0 }}>
      <header className="flex justify-center px-5 py-6 sm:justify-start sm:px-8">
        <BrandWordmark />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-14 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-feature bg-brand-primary-soft text-brand-primary">
            <AppIcon name="share" size={28} />
          </div>
          <h1 className="text-2xl font-black text-ui-ink-strong">Sign in to open this shared folder</h1>
          <p className="mt-2 text-sm font-bold text-ui-muted-strong">Your sign-in will bring you back here.</p>
          {error && <p role="alert" className="mt-4 text-sm font-bold text-feedback-danger-text">{error}</p>}
          <ActionButton className="mt-6" size="lg" fullWidth loading={signingIn || isLoading} loadingLabel="Opening Google" onClick={() => void startSignIn()}>
            <AppIcon name="signIn" size={19} />
            <span>Continue with Google</span>
          </ActionButton>
        </div>
      </main>
    </WorkspaceWindow>
  );
}

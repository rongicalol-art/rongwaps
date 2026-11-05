import { ActionButton, AppIcon, BrandWordmark, WorkspaceWindow } from '../../lib/widgets';
import { rememberFolderReturn } from '../../utils/browser/shareLink';
import { SignInConsent, SignInMessageNote, useGoogleSignIn } from '../auth';

export function JoinFolderSignIn({ code }: { code: string }) {
  const { signIn, error, isBusy } = useGoogleSignIn();

  const startSignIn = () => {
    rememberFolderReturn(`/join/${code}`);
    void signIn();
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
          {error && <SignInMessageNote message={error} className="mx-auto mt-4" />}
          <ActionButton className="mt-6" size="lg" fullWidth loading={isBusy} loadingLabel="Opening Google" onClick={startSignIn}>
            <AppIcon name="signIn" size={19} />
            <span>Continue with Google</span>
          </ActionButton>
          <SignInConsent className="mt-5" />
        </div>
      </main>
    </WorkspaceWindow>
  );
}

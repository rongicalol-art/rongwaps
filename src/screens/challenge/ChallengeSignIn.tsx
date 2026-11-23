import { BrandWordmark, WorkspaceWindow } from '../../lib/widgets';
import { ChallengeInvite, challengeLessonLine } from '../../features/social';
import { rememberLinkReturn } from '../../utils/browser/shareLink';
import { GoogleSignInButton, SignInConsent, SignInMessageNote, useGoogleSignIn } from '../auth';
import { challengePath, type ChallengeLesson } from '../../../shared/challengePath';

/**
 * A challenge link opened by someone signed out (often a newcomer from LINE, whose in-app browser
 * useGoogleSignIn hands to the phone's own browser): the lesson, then Google sign-in, which comes back to the
 * challenge. Who sent it shows after sign-in: the database answers signed-in learners only.
 */
export function ChallengeSignIn({ address }: { address: ChallengeLesson & { code: string } }) {
  const { signIn, error, isBusy } = useGoogleSignIn();
  const start = () => {
    rememberLinkReturn(challengePath(address, address.code));
    void signIn();
  };
  return (
    <WorkspaceWindow style={{ paddingLeft: 0 }}>
      <header className="flex justify-center px-5 py-6 sm:justify-start sm:px-8">
        <BrandWordmark />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-14">
        <ChallengeInvite lesson={address} name={null} color="blue" headline="Race a classmate’s run" line={challengeLessonLine(address)}>
          {error && <SignInMessageNote message={error} className="mx-auto mb-4 text-left" />}
          <GoogleSignInButton onClick={start} busy={isBusy} label="Continue with Google" fullWidth />
          <SignInConsent className="mt-6 text-center" />
        </ChallengeInvite>
      </main>
    </WorkspaceWindow>
  );
}

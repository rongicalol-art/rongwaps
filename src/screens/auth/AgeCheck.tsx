import { useState } from 'react';
import { useAccountActions } from '../../app/hooks/useAccountActions';
import { useAuth } from '../../hooks/useAuth';
import { useCharacterFont } from '../../hooks/useCharacterFont';
import { ActionButton, BrandWordmark } from '../../lib/widgets';
import { authService } from '../../services/authService';
import { debugLogger } from '../../utils/debug/debugLogger';
import { isNameAllowed } from '../../../shared/nameFilter';
import { studyTogetherOpenToAll } from '../../../shared/publicLaunch';
import { DeskScene } from './DeskScene';
import { SignInConsent } from './SignInParts';
import { setSignInNotice, takeSignInNotice } from './signInNotice';

/** Same window as the database's cleanup of unanswered new accounts (20261106120000). */
const NEW_ACCOUNT_MS = 7 * 24 * 60 * 60 * 1000;

function firstName(fullName: unknown): string | null {
  const first = typeof fullName === 'string' ? fullName.trim().split(/\s+/)[0] : '';
  return first ? first.slice(0, 24) : null;
}

/**
 * "Nod": shown once to a new public account after its first Google sign-in, before the workspace.
 * Yes records the answer and refreshes the token (the app then opens); under 18 deletes the new account.
 * Every new public account passes here, so it also names the signed-in Google account, how other learners
 * will see it, and the Terms; a wrong account can leave (an account made this week is deleted; an older one, kept
 * from before the school gate, is only signed out).
 * `preview` (DEV UI Previews): buttons do nothing.
 */
export function AgeCheck({ preview = false }: { preview?: boolean }) {
  const { currentUser, logout } = useAuth();
  const { deleteAccount } = useAccountActions();
  useCharacterFont();
  const [busy, setBusy] = useState<'yes' | 'no' | 'switch' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const name = firstName(currentUser?.user_metadata?.full_name ?? currentUser?.user_metadata?.name);
  const shownName = name && isNameAllowed(name) ? name : 'Student';

  const confirm = async () => {
    if (busy || preview) return;
    setBusy('yes');
    setError(null);
    try {
      await authService.confirmAge();
      // The refreshed token flips useAuth's needsAgeCheck; the workspace replaces this screen.
    } catch (cause) {
      debugLogger.error('Auth', 'Age confirmation failed', cause);
      setError('That didn’t save. Check your connection and try again.');
      setBusy(null);
    }
  };

  /** Under 18: the account is deleted. Wrong Google account: a new one is deleted, an older one only signed out. */
  const leave = async (why: 'no' | 'switch') => {
    if (busy || preview) return;
    setBusy(why);
    setError(null);
    if (why === 'no') setSignInNotice('under-18');
    const created = Date.parse(currentUser?.created_at ?? '');
    const madeThisWeek = Number.isFinite(created) && Date.now() - created < NEW_ACCOUNT_MS;
    try {
      if (why === 'switch' && !madeThisWeek) { await logout(); return; }
      await deleteAccount();
    } catch (cause) {
      debugLogger.error('Auth', 'New account removal failed', cause);
      takeSignInNotice();
      setError('That didn’t go through. Check your connection and try again.');
      setBusy(null);
    }
  };

  return (
    <div className={`flex w-full flex-col overflow-y-auto bg-ui-canvas font-sans text-ui-ink ${preview ? 'h-full' : 'h-[100dvh]'}`}>
      <header className="mx-auto flex w-full max-w-[90rem] items-center px-5 py-3 lg:px-26">
        <BrandWordmark />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-12 text-center lg:pb-20">
        <DeskScene leaving={busy === 'yes'} className="size-56 shrink-0 lg:size-84" />
        <h1 className="mt-2 text-4xl font-black leading-[1.1] tracking-tight text-ui-ink-strong text-balance lg:text-6xl">
          {name ? `Welcome, ${name}!` : 'Welcome!'}
        </h1>
        {currentUser?.email && <p className="mt-2 text-sm font-bold text-ui-muted-strong">Signed in as {currentUser.email}</p>}
        <p className="mt-4 max-w-[30ch] text-lg font-bold leading-relaxed text-ui-muted-strong text-balance lg:text-xl">
          Ron’s Mandarin is for learners 18 and older.
        </p>
        <div className="mt-8 flex w-full max-w-sm flex-col items-center gap-2 lg:mt-10">
          <ActionButton
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => void confirm()}
            loading={busy === 'yes'}
            loadingLabel="Opening your books"
            className="normal-case tracking-normal"
          >
            I’m 18 or older
          </ActionButton>
          {busy !== 'yes' && busy !== 'switch' && (
            <ActionButton
              variant="quiet"
              onClick={() => void leave('no')}
              loading={busy === 'no'}
              loadingLabel="Signing out"
              className="normal-case tracking-normal text-base"
              frontClassName="text-ui-muted-strong hover:bg-transparent hover:text-ui-ink-strong"
            >
              I’m under 18
            </ActionButton>
          )}
          {error && <p role="alert" className="mt-2 rounded-sm bg-feedback-danger-surface px-3.5 py-2.5 text-sm font-bold text-feedback-danger-text">{error}</p>}
        </div>
        <p className="mt-8 max-w-sm text-sm font-bold text-ui-muted-strong text-balance">
          {studyTogetherOpenToAll() ? 'In Study together, other learners see you' : 'From November 14, other learners in Study together will see you'} as “{shownName}” with your initials. Change it in Profile, or hide in Settings.
        </p>
        <SignInConsent className="mt-3 max-w-sm text-balance lg:text-sm" />
        {busy !== 'yes' && busy !== 'no' && (
          <ActionButton
            variant="quiet"
            onClick={() => void leave('switch')}
            loading={busy === 'switch'}
            loadingLabel="Signing out"
            className="mt-2 normal-case tracking-normal text-sm"
            frontClassName="text-ui-muted-strong hover:bg-transparent hover:text-ui-ink-strong"
          >
            Use a different Google account
          </ActionButton>
        )}
      </main>
    </div>
  );
}

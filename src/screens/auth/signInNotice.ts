const KEY = 'rm-sign-in-notice';

export type SignInNotice = 'under-18';

/** Remembers why the learner is back on the landing page, across the reload that follows a sign-out. */
export function setSignInNotice(notice: SignInNotice): void {
  try { sessionStorage.setItem(KEY, notice); } catch { /* storage blocked: the landing page shows nothing */ }
}

/** The pending notice, read once. */
export function takeSignInNotice(): SignInNotice | null {
  try {
    const notice = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return notice === 'under-18' ? notice : null;
  } catch {
    return null;
  }
}

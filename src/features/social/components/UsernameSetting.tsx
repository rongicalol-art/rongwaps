import { useState } from 'react';
import { ActionButton } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { USERNAME_CHANGE_DAYS } from '../../../../shared/username';

const WEEK_MS = USERNAME_CHANGE_DAYS * 24 * 3_600_000;
const friends = () => import('../friendsController');

/**
 * Settings → Study together → Username: "@kai.lin" with Change. The automatic one can change at once, then once a
 * week (the database says when). Hidden until the app has loaded it.
 */
export function UsernameSetting() {
  const mine = useAppStore((state) => state.socialUsername);
  const [draft, setDraft] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (!mine) return null;
  const nextChange = mine.chosenAt ? mine.chosenAt + WEEK_MS : null;
  const waiting = nextChange !== null && nextChange > Date.now();

  const save = async () => {
    if (draft === null || saving) return;
    setSaving(true);
    const error = await friends().then((module) => module.changeUsername(draft));
    setSaving(false);
    setProblem(error);
    if (!error) setDraft(null);
  };

  if (draft === null) {
    return (
      <div className="flex min-h-12 items-center justify-between gap-4 border-b-2 border-ui-divider px-2 py-2.5">
        <span className="min-w-0">
          <span className="block text-[15px] font-extrabold leading-tight text-ui-ink">Username</span>
          <span className="mt-1 block truncate text-[13px] font-bold text-ui-muted-strong">@{mine.name}</span>
        </span>
        {waiting
          ? <span className="shrink-0 text-right text-[13px] font-bold text-ui-muted">Change on {new Date(nextChange).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
          : <ActionButton size="sm" variant="secondary" className="normal-case tracking-normal" onClick={() => { setDraft(mine.name); setProblem(null); }}>Change</ActionButton>}
      </div>
    );
  }

  return (
    <form className="border-b-2 border-ui-divider px-2 py-2.5" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <label htmlFor="username-input" className="block text-[15px] font-extrabold leading-tight text-ui-ink">Username</label>
      <div className="mt-2 flex h-12 items-center gap-1 rounded-control border-2 border-b-[length:var(--depth-lg)] border-ui-divider bg-ui-surface px-3 transition-colors focus-within:border-brand-primary focus-within:border-b-brand-primary-edge">
        <span aria-hidden className="text-base font-black text-ui-muted">@</span>
        <input
          id="username-input"
          autoFocus
          value={draft}
          maxLength={21}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => { setDraft(event.target.value.toLowerCase().replace(/\s+/g, '')); setProblem(null); }}
          className="h-full min-w-0 flex-1 bg-transparent text-base font-extrabold text-ui-ink-strong outline-none"
        />
      </div>
      <p className={`mt-1.5 text-[13px] font-bold ${problem ? 'text-feedback-danger-text' : 'text-ui-muted-strong'}`} role={problem ? 'alert' : undefined}>
        {problem ?? `Letters, numbers, dots and underscores. You can change it every ${USERNAME_CHANGE_DAYS} days.`}
      </p>
      <div className="mt-3 flex items-center justify-end gap-3">
        <button type="button" onClick={() => { setDraft(null); setProblem(null); }} className="rounded-xs text-sm font-black text-ui-muted outline-none hover:text-ui-ink focus-ring-inline">Cancel</button>
        <ActionButton type="submit" size="sm" loading={saving} loadingLabel="Save" disabled={draft.replace(/^@/, '') === mine.name}>Save</ActionButton>
      </div>
    </form>
  );
}

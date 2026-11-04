import { useState } from 'react';
import { ActionButton, AppIcon, Drawer, DropdownMenu, DropdownMenuItem, IconActionButton } from '../../../lib/widgets';
import type { ReportReason } from '../../../services/safetyService';
import { useAppStore } from '../../../store/useAppStore';
import type { Person } from '../../../../shared/lobby';
import { blockPerson, openSafety, reportPerson } from '../safety';

const REASONS: Array<[ReportReason, string]> = [
  ['spam', 'Spam or ads'],
  ['rude', 'Rude or mean'],
  ['unsafe', 'Not safe or not okay'],
  ['other', 'Something else'],
];

/** The ⋯ on a classmate's profile: Report and Block, out of the way of friendly visits. */
export function ProfileSafetyMenu({ person }: { person: Person }) {
  const [open, setOpen] = useState(false);
  const target = { u: person.u, n: person.n, c: person.c };
  return (
    <DropdownMenu label={`More options for ${person.n}`} open={open} onOpenChange={setOpen} widthClassName="w-56"
      renderTrigger={(props) => <IconActionButton {...props} size="md" label={`More options for ${person.n}`} icon={<AppIcon name="more" size={20} />} />}>
      <DropdownMenuItem icon={<AppIcon name="report" size={18} />} onClick={() => { setOpen(false); openSafety({ kind: 'report', person: target, place: 'profile' }); }}>Report {person.n}</DropdownMenuItem>
      <DropdownMenuItem icon={<AppIcon name="block" size={18} />} className="text-feedback-danger-text" onClick={() => { setOpen(false); openSafety({ kind: 'block', person: target, place: 'profile' }); }}>Block {person.n}</DropdownMenuItem>
    </DropdownMenu>
  );
}

/** One sheet for reporting (a reason in one tap, then an offer to block) and for blocking. */
export function SafetySheet() {
  const prompt = useAppStore((state) => state.socialSafety);
  const [sending, setSending] = useState<ReportReason | null>(null);
  if (!prompt) return null;
  const close = () => useAppStore.getState().setSocial({ socialSafety: null });
  const name = prompt.person.n || 'this learner';
  const send = async (reason: ReportReason) => {
    if (sending) return;
    setSending(reason);
    await reportPerson(prompt, reason);
    setSending(null);
  };
  const title = prompt.kind === 'report' ? `Report ${name}?` : prompt.kind === 'report-done' ? 'Thanks, it’s reported' : `Block ${name}?`;
  return (
    <Drawer isOpen onClose={close} title={<Drawer.Title>{title}</Drawer.Title>} tone="practice" size="sm" mdPlacement="side" heightClassName="max-h-[80vh] md:max-h-full"
      className="top-auto h-auto rounded-t-3xl md:h-full md:rounded-none" contentClassName="pb-8">
      {prompt.kind === 'report' && <>
        <p className="text-base font-bold text-ui-muted-strong">Ron reads every report. {name} won’t know.</p>
        <div className="mt-5 grid gap-2.5">
          {REASONS.map(([reason, label]) => (
            <ActionButton key={reason} variant="secondary" size="lg" fullWidth loading={sending === reason} loadingLabel="Sending"
              className="normal-case tracking-normal" frontClassName="justify-start text-ui-ink-strong" onClick={() => void send(reason)}>{label}</ActionButton>
          ))}
        </div>
      </>}
      {prompt.kind === 'report-done' && <>
        <p className="text-base font-bold text-ui-muted-strong">Block {name} too? You won’t see each other in Study together.</p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <ActionButton variant="secondary" size="lg" fullWidth className="normal-case tracking-normal" onClick={close}>Done</ActionButton>
          <ActionButton variant="danger" size="lg" fullWidth className="normal-case tracking-normal" onClick={() => void blockPerson(prompt.person)}>Block {name}</ActionButton>
        </div>
      </>}
      {prompt.kind === 'block' && <>
        <p className="text-base font-bold text-ui-muted-strong">You won’t see each other online, in chat or in invites. {name} won’t be told. Unblock anytime in Settings.</p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <ActionButton variant="secondary" size="lg" fullWidth className="normal-case tracking-normal" onClick={close}>Cancel</ActionButton>
          <ActionButton variant="danger" size="lg" fullWidth className="normal-case tracking-normal" onClick={() => void blockPerson(prompt.person)}>Block</ActionButton>
        </div>
      </>}
    </Drawer>
  );
}

import { useId, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router';
import { ActionButton, Drawer } from '../../lib/widgets';
import { sendFeedback } from '../../services/feedbackService';
import { useAppStore } from '../../store/useAppStore';

export function FeedbackDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation();
  const fieldId = useId();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<{ id: string; message: string; path: string } | null>(null);
  const busy = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (busy.current) return;
    if (!text) { setError('Write a message first.'); return; }
    if (pending.current?.message !== text || pending.current.path !== location.pathname) {
      pending.current = { id: crypto.randomUUID(), message: text, path: location.pathname };
    }
    busy.current = true;
    setSending(true);
    setError(null);
    try {
      await sendFeedback(pending.current);
      pending.current = null;
      setMessage('');
      onClose();
      useAppStore.getState().showFeedbackToast('Thanks, sent!', 'neutral', 2500);
    } catch (cause) {
      setError(cause instanceof Error && cause.name === 'Error'
        ? cause.message : 'Could not send. Your message is still here—please try again.');
    } finally {
      busy.current = false;
      setSending(false);
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Feedback"
      tone="canvas" size="full" mdPlacement="side" heightClassName="max-h-[88dvh] md:max-h-full">
      <form onSubmit={submit} className="flex flex-col gap-5 pb-8 text-left" aria-busy={sending}>
        <label htmlFor={fieldId} className="text-lg font-extrabold text-ui-ink-strong">What’s on your mind?</label>
        <textarea id={fieldId} value={message} onChange={event => { setMessage(event.target.value); setError(null); }}
          placeholder="Something broken? An idea? Tell me."
          maxLength={2000} required readOnly={sending} rows={6}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className="w-full resize-y rounded-control border-2 border-ui-border bg-ui-surface p-4 text-base font-semibold text-ui-ink placeholder:text-ui-muted focus-ring" />
        {error && <p id={`${fieldId}-error`} role="alert" className="text-sm font-bold text-feedback-danger-edge">{error}</p>}
        {sending
          ? <p role="status" className="py-3 text-center text-sm font-bold text-ui-muted-strong">Sending…</p>
          : <ActionButton type="submit" fullWidth frontClassName="normal-case tracking-normal">Send</ActionButton>}
      </form>
    </Drawer>
  );
}

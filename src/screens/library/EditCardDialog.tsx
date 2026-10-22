import { useRef, useState } from 'react';
import { ActionButton, Dialog } from '../../lib/widgets';
import type { UserFlashcard } from '../../types/models';
import type { FlashcardTextPatch } from '../../services/flashcardService';

interface EditCardDialogProps {
  card: UserFlashcard | null;
  onSave: (patch: FlashcardTextPatch) => void | Promise<void>;
  onClose: () => void;
}

const INPUT_CLASS =
  'w-full rounded-control border-2 border-b-[length:var(--depth-sm)] border-ui-border bg-ui-hover px-4 py-2.5 font-bold text-ui-ink outline-none placeholder:text-ui-muted focus:border-brand-primary focus:bg-ui-surface focus-visible:ring-inset focus-ring transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-extrabold text-ui-muted-strong">{label}</span>
      {children}
    </label>
  );
}

/** Edit a custom card's text. Mount with a card to open; unmount state resets per card. */
export function EditCardDialog({ card, onSave, onClose }: EditCardDialogProps) {
  return (
    <Dialog.Root open={card !== null} onClose={onClose}>
      <Dialog.Backdrop />
      {card && <EditCardContent key={card.id} card={card} onSave={onSave} />}
    </Dialog.Root>
  );
}

function EditCardContent({ card, onSave }: { card: UserFlashcard; onSave: EditCardDialogProps['onSave'] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [simplified, setSimplified] = useState(card.simplified);
  const [traditional, setTraditional] = useState(card.traditional ?? '');
  const [pinyin, setPinyin] = useState(card.pinyin ?? '');
  const [translation, setTranslation] = useState(card.translation);
  const [notes, setNotes] = useState(card.notes ?? '');
  const [saving, setSaving] = useState(false);

  const canSave = simplified.trim() !== '' && translation.trim() !== '';
  const hanzi = traditional.trim() || simplified.trim();

  const submit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    await onSave({
      simplified: simplified.trim(),
      traditional: traditional.trim(),
      pinyin: pinyin.trim(),
      translation: translation.trim(),
      notes: notes.trim(),
    });
    setSaving(false);
  };

  const onEnter = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') void submit();
  };

  return (
    <Dialog.Content size="sm" depth="md" initialFocusRef={inputRef} className="rounded-feature p-6">
      <Dialog.Header>
        <Dialog.Title>Edit card</Dialog.Title>
        <Dialog.Close label="Close edit card" />
      </Dialog.Header>
      <Dialog.Body>
        <div className="mb-5 flex flex-col items-center text-center">
          <span className="font-chinese text-[44px] font-bold leading-none text-ui-ink-strong">{hanzi || '—'}</span>
          <span className="mt-2 min-h-4 text-xs font-extrabold text-ui-muted">{pinyin.trim()}</span>
          <span className="min-h-5 text-sm font-bold text-ui-muted-strong">{translation.trim()}</span>
        </div>

        <div className="mb-6 flex flex-col gap-3" onKeyDown={onEnter}>
          <Field label="Simplified">
            <input ref={inputRef} aria-label="Simplified" value={simplified} onChange={(e) => setSimplified(e.target.value)} className={`${INPUT_CLASS} font-chinese`} />
          </Field>
          <Field label="Traditional">
            <input aria-label="Traditional" value={traditional} onChange={(e) => setTraditional(e.target.value)} className={`${INPUT_CLASS} font-chinese`} />
          </Field>
          <Field label="Pinyin">
            <input aria-label="Pinyin" value={pinyin} onChange={(e) => setPinyin(e.target.value)} className={INPUT_CLASS} />
          </Field>
          <Field label="Meaning">
            <input aria-label="Meaning" value={translation} onChange={(e) => setTranslation(e.target.value)} className={INPUT_CLASS} />
          </Field>
          <Field label="Notes">
            <textarea aria-label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${INPUT_CLASS} resize-none`} />
          </Field>
        </div>

        <ActionButton variant="primary" size="md" fullWidth onClick={() => void submit()} disabled={!canSave} loading={saving} loadingLabel="Saving card">
          Save
        </ActionButton>
      </Dialog.Body>
    </Dialog.Content>
  );
}

import { useState } from 'react';
import { ActionButton, Drawer } from '../../lib/widgets';
import type { UserFlashcard } from '../../types/models';
import type { FlashcardTextPatch } from '../../services/flashcardService';

interface EditCardDialogProps {
  card: UserFlashcard | null;
  onSave: (patch: FlashcardTextPatch) => void | Promise<void>;
  onClose: () => void;
}

/** Same side drawer as saving a word. The card itself is the form: type straight onto it. */
export function EditCardDialog({ card, onSave, onClose }: EditCardDialogProps) {
  return (
    <Drawer.Root open={card !== null} onClose={onClose} tone="surface">
      <Drawer.Backdrop />
      <Drawer.Content size="md" mdPlacement="side" ariaLabel="Edit card" heightClassName="max-h-[85vh]">
        <Drawer.StickyHeader>
          <Drawer.Handle className="pb-2" />
        </Drawer.StickyHeader>
        {card && <EditCardBody key={card.id} card={card} onSave={onSave} />}
      </Drawer.Content>
    </Drawer.Root>
  );
}

function EditCardBody({ card, onSave }: { card: UserFlashcard; onSave: EditCardDialogProps['onSave'] }) {
  const originalWord = card.traditional || card.simplified;
  const [word, setWord] = useState(originalWord);
  const [pinyin, setPinyin] = useState(card.pinyin ?? '');
  const [translation, setTranslation] = useState(card.translation);
  const [notes, setNotes] = useState(card.notes ?? '');
  const [saving, setSaving] = useState(false);

  const canSave = word.trim() !== '' && translation.trim() !== '';

  const submit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const nextWord = word.trim();
    await onSave({
      // The card has one displayed word, so an edit updates both spellings together.
      ...(nextWord !== originalWord && { simplified: nextWord, traditional: nextWord }),
      pinyin: pinyin.trim(),
      translation: translation.trim(),
      notes: notes.trim(),
    });
    setSaving(false);
  };

  const onEnter = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !(event.target instanceof HTMLTextAreaElement)) void submit();
  };

  return (
    <>
      <Drawer.Body className="flex min-h-0 flex-1 flex-col px-4 sm:px-6">
        <div onKeyDown={onEnter} className="flex min-h-80 flex-1 flex-col items-center justify-center gap-2 rounded-control bg-ui-canvas px-4 py-8">
          <input
            autoFocus
            aria-label="Word"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full bg-transparent text-center font-chinese text-6xl font-bold leading-tight text-ui-ink-strong outline-none placeholder:text-ui-muted focus-ring-inline rounded-control"
            placeholder="字"
          />
          <input
            aria-label="Pinyin"
            value={pinyin}
            onChange={(e) => setPinyin(e.target.value)}
            placeholder="pinyin"
            className="w-full bg-transparent text-center text-lg font-black text-brand-primary outline-none placeholder:text-ui-muted focus-ring-inline rounded-control"
          />
          <input
            aria-label="Meaning"
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            placeholder="meaning"
            className="w-full bg-transparent text-center text-lg font-bold text-ui-ink outline-none placeholder:text-ui-muted focus-ring-inline rounded-control"
          />
        </div>
        <textarea
          aria-label="Notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note or memory hook"
          className="mt-3 w-full resize-none rounded-control border-2 border-ui-border bg-ui-surface px-3 py-2.5 text-sm font-bold text-ui-ink outline-none placeholder:text-ui-muted focus-ring"
        />
      </Drawer.Body>
      <div className="shrink-0 px-4 pb-4 pt-3 sm:px-6">
        <ActionButton variant="primary" size="lg" fullWidth onClick={() => void submit()} disabled={!canSave} loading={saving} loadingLabel="Saving card">
          Save
        </ActionButton>
      </div>
    </>
  );
}

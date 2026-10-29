import { useState } from 'react';
import { ActionButton, Drawer } from '../../lib/widgets';
import type { UserFlashcard } from '../../types/models';
import type { FlashcardTextPatch } from '../../services/flashcardService';

interface EditCardDialogProps {
  card: UserFlashcard | null;
  onSave: (patch: FlashcardTextPatch) => void | Promise<void>;
  onClose: () => void;
}

/** Field-based card editor in a side drawer (full screen on mobile). */
export function EditCardDialog({ card, onSave, onClose }: EditCardDialogProps) {
  return (
    <Drawer.Root open={card !== null} onClose={onClose} tone="surface">
      <Drawer.Backdrop />
      <Drawer.Content size="md" mdPlacement="side" ariaLabel="Edit card">
        <div className="flex items-center justify-between px-6 pb-2 pt-4">
          <Drawer.Title>Edit card</Drawer.Title>
          <Drawer.Close label="Close edit card" />
        </div>
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
      <Drawer.Body className="flex min-h-0 flex-1 flex-col gap-3.5 px-4 pt-2 sm:px-6">
        <div className="flex flex-col rounded-control border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-4 py-2.5 transition-colors focus-within:border-brand-primary focus-within:bg-brand-primary-soft">
          <span className="text-xs font-black uppercase tracking-wider text-ui-muted-strong">Word</span>
          <input
            autoFocus
            aria-label="Word"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full bg-transparent font-chinese text-3xl font-bold leading-tight text-ui-ink-strong outline-none placeholder:text-ui-muted focus-ring-inline rounded-control"
            placeholder="字"
          />
        </div>

        <div className="flex flex-col rounded-control border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-4 py-2.5 transition-colors focus-within:border-brand-primary focus-within:bg-brand-primary-soft">
          <span className="text-xs font-black uppercase tracking-wider text-ui-muted-strong">Pinyin</span>
          <input
            aria-label="Pinyin"
            value={pinyin}
            onChange={(e) => setPinyin(e.target.value)}
            onKeyDown={onEnter}
            className="w-full bg-transparent text-base font-black text-brand-primary-text outline-none placeholder:text-ui-muted focus-ring-inline rounded-control"
            placeholder="pinyin"
          />
        </div>

        <div className="flex flex-col rounded-control border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-4 py-2.5 transition-colors focus-within:border-brand-primary focus-within:bg-brand-primary-soft">
          <span className="text-xs font-black uppercase tracking-wider text-ui-muted-strong">Meaning</span>
          <input
            aria-label="Meaning"
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            onKeyDown={onEnter}
            className="w-full bg-transparent text-base font-bold text-ui-ink outline-none placeholder:text-ui-muted focus-ring-inline rounded-control"
            placeholder="meaning"
          />
        </div>

        <div className="flex flex-col rounded-control border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-4 py-2.5 transition-colors focus-within:border-brand-primary focus-within:bg-brand-primary-soft">
          <span className="text-xs font-black uppercase tracking-wider text-ui-muted-strong">Memory hook</span>
          <textarea
            aria-label="Memory hook"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="A story, a picture, a sound-alike"
            className="w-full resize-none bg-transparent text-sm font-bold text-ui-ink outline-none placeholder:text-ui-muted focus-ring-inline rounded-control"
          />
        </div>
      </Drawer.Body>

      <div className="shrink-0 px-4 pb-6 pt-3 sm:px-6">
        <ActionButton
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => void submit()}
          disabled={!canSave}
          loading={saving}
          loadingLabel="Saving card"
        >
          Save
        </ActionButton>
      </div>
    </>
  );
}

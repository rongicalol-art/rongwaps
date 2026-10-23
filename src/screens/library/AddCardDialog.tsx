import { useState, useRef } from 'react';
import { ActionButton, Drawer } from '../../lib/widgets';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../store/useAppStore';
import { flashcardService } from '../../services/flashcardService';
import { useDictionarySearch, type SearchResult } from '../../hooks/useDictionarySearch';
import { debugLogger } from '../../utils/debug/debugLogger';

interface AddCardDialogProps {
  open: boolean;
  onClose: () => void;
  folderId: string;
  folderTitle?: string;
}

export function AddCardDialog({ open, onClose, folderId, folderTitle }: AddCardDialogProps) {
  const { currentUser } = useAuth();
  const addLocalFlashcard = useAppStore((state) => state.addLocalFlashcard);

  const [word, setWord] = useState('');
  const [pinyin, setPinyin] = useState('');
  const [translation, setTranslation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const wordInputRef = useRef<HTMLInputElement>(null);

  // Smart suggestions as the user types Chinese characters
  const { results: suggestions } = useDictionarySearch(word);

  const canSave = word.trim() !== '' && translation.trim() !== '';

  const resetForm = () => {
    setWord('');
    setPinyin('');
    setTranslation('');
    setNotes('');
    setSaving(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectSuggestion = (entry: SearchResult) => {
    const defs = entry.definitions
      ? Array.isArray(entry.definitions)
        ? entry.definitions
        : typeof entry.definitions === 'string'
        ? [entry.definitions]
        : Object.values(entry.definitions as Record<string, string>)
      : [];
    const firstDef = defs.length > 0 ? defs[0] : '';

    setWord(entry.traditional || entry.simplified);
    setPinyin(entry.pinyin_accented || '');
    setTranslation(firstDef);
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);

    const targetFolderId = folderId === 'starred' ? 'custom' : folderId;
    const newCard = {
      id: crypto.randomUUID(),
      userId: currentUser?.id || 'guest',
      folderId: targetFolderId,
      simplified: word.trim(),
      traditional: word.trim(),
      pinyin: pinyin.trim() || undefined,
      translation: translation.trim(),
      notes: notes.trim() || undefined,
      createdAt: Date.now(),
    };

    try {
      if (currentUser) {
        await flashcardService.createFlashcard(newCard);
      } else {
        addLocalFlashcard(newCard);
      }
      handleClose();
    } catch (e) {
      debugLogger.error('Supabase', 'Failed to create flashcard:', e);
      setSaving(false);
    }
  };

  const onEnter = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !(event.target instanceof HTMLTextAreaElement)) {
      void handleSave();
    }
  };

  return (
    <Drawer.Root open={open} onClose={handleClose} tone="surface">
      <Drawer.Backdrop />
      <Drawer.Content size="md" mdPlacement="side" ariaLabel="Add card">
        <div className="flex items-center justify-between px-6 pb-2 pt-4">
          <div className="flex flex-col">
            <Drawer.Title>Add card</Drawer.Title>
            {folderTitle && (
              <span className="text-xs font-black uppercase tracking-wider text-ui-muted">
                to {folderTitle}
              </span>
            )}
          </div>
          <Drawer.Close label="Close add card" />
        </div>

        <Drawer.Body className="flex min-h-0 flex-1 flex-col gap-3.5 px-4 pt-2 sm:px-6">
          {/* Word field */}
          <div className="flex flex-col rounded-control border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-4 py-2.5 transition-colors focus-within:border-brand-primary focus-within:bg-brand-primary-soft">
            <span className="text-xs font-black uppercase tracking-wider text-ui-muted-strong">Word</span>
            <input
              ref={wordInputRef}
              autoFocus
              aria-label="Word"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={onEnter}
              className="w-full bg-transparent font-chinese text-3xl font-bold leading-tight text-ui-ink-strong outline-none placeholder:text-ui-muted focus-ring-inline rounded-control"
              placeholder="字"
            />
          </div>

          {/* Dictionary Suggestions */}
          {suggestions.length > 0 && word.trim() && (
            <div className="flex flex-col gap-1.5 -mt-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-ui-muted px-1">
                Dictionary matches
              </span>
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                {suggestions.slice(0, 4).map((item) => {
                  const def = item.definitions
                    ? Array.isArray(item.definitions)
                      ? String(item.definitions[0] ?? '')
                      : typeof item.definitions === 'string'
                      ? item.definitions
                      : String(Object.values(item.definitions)[0] ?? '')
                    : '';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="flex items-center justify-between gap-2 rounded-compact border-2 border-b-[length:var(--depth-sm)] border-ui-border bg-ui-canvas px-3 py-2 text-left transition-colors hover:border-brand-primary hover:bg-brand-primary-soft focus-ring-inline"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-chinese text-lg font-bold text-ui-ink-strong">
                          {item.traditional || item.simplified}
                        </span>
                        <span className="text-xs font-black text-brand-primary">
                          {item.pinyin_accented}
                        </span>
                      </div>
                      <span className="truncate text-xs font-bold text-ui-muted-strong max-w-[140px]">
                        {def}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pinyin field */}
          <div className="flex flex-col rounded-control border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-4 py-2.5 transition-colors focus-within:border-brand-primary focus-within:bg-brand-primary-soft">
            <span className="text-xs font-black uppercase tracking-wider text-ui-muted-strong">Pinyin</span>
            <input
              aria-label="Pinyin"
              value={pinyin}
              onChange={(e) => setPinyin(e.target.value)}
              onKeyDown={onEnter}
              className="w-full bg-transparent text-base font-black text-brand-primary outline-none placeholder:text-ui-muted focus-ring-inline rounded-control"
              placeholder="pinyin"
            />
          </div>

          {/* Meaning field */}
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

          {/* Memory hook / Notes */}
          <div className="flex flex-col rounded-control border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-4 py-2.5 transition-colors focus-within:border-brand-primary focus-within:bg-brand-primary-soft">
            <span className="text-xs font-black uppercase tracking-wider text-ui-muted-strong">Memory hook</span>
            <textarea
              aria-label="Memory hook"
              rows={2}
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
            onClick={() => void handleSave()}
            disabled={!canSave}
            loading={saving}
            loadingLabel="Adding card"
          >
            Add card
          </ActionButton>
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}

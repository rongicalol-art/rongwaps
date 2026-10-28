import { useEffect, useState } from 'react';
import type { DialogueAlignment } from '../../../types/models';
import { fetchDialogueAlignmentPack } from '../../../services/contentPacks';

const alignmentCache = new Map<number, Record<string, DialogueAlignment>>();

export function useDialogueAlignment(bookId?: number, readingId?: string): DialogueAlignment | null {
  const targetBookId = bookId ?? 1;
  const [alignmentMap, setAlignmentMap] = useState<Record<string, DialogueAlignment> | null>(
    () => alignmentCache.get(targetBookId) ?? null,
  );

  useEffect(() => {
    const cached = alignmentCache.get(targetBookId);
    if (cached) {
      setAlignmentMap(cached);
      return;
    }
    let cancelled = false;
    void fetchDialogueAlignmentPack(targetBookId)
      .then((map) => {
        if (!cancelled && map) {
          alignmentCache.set(targetBookId, map);
          setAlignmentMap(map);
        }
      })
      .catch(() => {
        // Missing/malformed pack: reader still works without karaoke sync.
      });
    return () => {
      cancelled = true;
    };
  }, [targetBookId]);

  const activeMap = alignmentCache.get(targetBookId) ?? alignmentMap;
  return activeMap?.[readingId ?? ''] ?? null;
}

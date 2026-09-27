import { useEffect, useState } from 'react';
import type { DialogueAlignment } from '../../../types/models';
import { fetchDialogueAlignmentPack } from '../../../services/contentPacks';

let cachedAlignmentMap: Record<string, DialogueAlignment> | null = null;

export function useDialogueAlignment(bookId?: number, readingId?: string): DialogueAlignment | null {
  const [alignmentMap, setAlignmentMap] = useState<Record<string, DialogueAlignment> | null>(
    () => cachedAlignmentMap,
  );

  useEffect(() => {
    if (cachedAlignmentMap) return;
    let cancelled = false;
    void fetchDialogueAlignmentPack(bookId ?? 1)
      .then((map) => {
        if (!cancelled && map) {
          cachedAlignmentMap = map;
          setAlignmentMap(map);
        }
      })
      .catch(() => {
        // Missing/malformed pack: reader still works without karaoke sync.
      });
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  return alignmentMap?.[readingId ?? ''] ?? null;
}

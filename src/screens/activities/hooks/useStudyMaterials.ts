import { useEffect, useMemo, useState } from 'react';
import { getInteractiveGrammarManifestForLesson } from '../../../data/interactiveGrammarManifest';
import { fetchReadingsPack } from '../../../services/contentPacks';

export interface StudyMaterialItem {
  key: 'grammar' | 'reading';
  label: string;
  open: () => void;
}

/** The dock book's entries: one Grammar run and one Reading run, each combining every selected lesson. */
export function useStudyMaterials({
  bookId,
  lessonIds,
  onOpenGrammarPart,
  onOpenLessonReadings,
}: {
  bookId: number;
  lessonIds: number[];
  onOpenGrammarPart?: (partId: string[]) => void;
  onOpenLessonReadings?: (lessonIds: number[]) => void;
}): StudyMaterialItem[] {
  const [readingPack, setReadingPack] = useState<{ bookId: number; lessonIds: Set<number> } | null>(null);

  useEffect(() => {
    if (!onOpenLessonReadings || lessonIds.length === 0) return undefined;
    let isMounted = true;
    void fetchReadingsPack(bookId).then(
      (pack) => {
        if (isMounted) setReadingPack({ bookId, lessonIds: new Set((pack ?? []).map((reading) => reading.lessonId)) });
      },
      () => {},
    );
    return () => { isMounted = false; };
  }, [bookId, lessonIds.length, onOpenLessonReadings]);

  return useMemo(() => {
    const sorted = [...lessonIds].sort((a, b) => a - b);
    const grammarIds = onOpenGrammarPart
      ? sorted.flatMap((lessonId) => getInteractiveGrammarManifestForLesson(bookId, lessonId).map((part) => part.id))
      : [];
    const readingLessons = readingPack?.bookId === bookId ? sorted.filter((id) => readingPack.lessonIds.has(id)) : [];
    const items: StudyMaterialItem[] = [];
    if (grammarIds.length > 0) items.push({ key: 'grammar', label: 'Grammar', open: () => onOpenGrammarPart?.(grammarIds) });
    if (readingLessons.length > 0) items.push({ key: 'reading', label: 'Reading', open: () => onOpenLessonReadings?.(readingLessons) });
    return items;
  }, [bookId, lessonIds, onOpenGrammarPart, onOpenLessonReadings, readingPack]);
}

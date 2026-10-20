import { useEffect, useMemo, useState } from 'react';
import { INTRODUCTION_ART, LESSON_LANDSCAPE_ART } from '../../../data/lessonLandscapeArt';
import { findGrammarManifestPartForReading } from '../../../data/interactiveGrammarManifest';
import { GRAMMAR_USAGE_RULES } from '../../../data/grammarUsageRules';
import { getReadingIllustration } from '../../../data/readingIllustrations';
import { fetchReadingsPack } from '../../../services/contentPacks';
import { useAppStore } from '../../../store/useAppStore';
import type { CourseLessonProgress, ReadingRecord } from '../../../types/models';

export interface PartProgress {
  done: number;
  total: number;
}

export interface LessonWindowPart {
  id: number;
  /** "Dialogue 1 · At school" (part 3: "Reading · …"). */
  readingLabel: string;
  vocab: PartProgress;
  /** Null when the part has no grammar lesson. */
  grammar: (PartProgress & { manifestId: string; label: string }) | null;
  hasReading: boolean;
  /** Reading completion is not persisted anywhere, so it never gates this. */
  isDone: boolean;
}

export type PartModeKey = 'vocab' | 'grammar' | 'reading';

export function isModeAvailable(part: LessonWindowPart, mode: PartModeKey): boolean {
  if (mode === 'vocab') return part.vocab.total > 0;
  if (mode === 'grammar') return part.grammar !== null;
  return part.hasReading;
}

/** First unfinished mode of a part (vocab, grammar, then reading). */
export function getDefaultMode(part: LessonWindowPart): PartModeKey {
  if (part.vocab.done < part.vocab.total) return 'vocab';
  if (part.grammar && part.grammar.done < part.grammar.total) return 'grammar';
  return part.hasReading ? 'reading' : isModeAvailable(part, 'vocab') ? 'vocab' : 'grammar';
}

export function getFirstOpenPartId(parts: LessonWindowPart[]): number | null {
  return (parts.find((part) => !part.isDone) ?? parts[0])?.id ?? null;
}

/** Merges multiple parts into a unified composite part for aggregated study. */
export function getAggregatedPart(selectedParts: LessonWindowPart[]): LessonWindowPart {
  if (selectedParts.length === 1) return selectedParts[0];

  const vocabDone = selectedParts.reduce((sum, p) => sum + p.vocab.done, 0);
  const vocabTotal = selectedParts.reduce((sum, p) => sum + p.vocab.total, 0);

  const grammarParts = selectedParts.filter((p) => p.grammar !== null);
  const grammarTotal = grammarParts.reduce((sum, p) => sum + (p.grammar?.total ?? 0), 0);
  const grammarDone = grammarParts.reduce((sum, p) => sum + (p.grammar?.done ?? 0), 0);

  const firstGrammar = grammarParts[0]?.grammar;
  const grammar = firstGrammar
    ? {
      manifestId: firstGrammar.manifestId,
      label: grammarParts.length === 1 ? firstGrammar.label : `${grammarTotal} ${grammarTotal === 1 ? 'pattern' : 'patterns'}`,
      total: grammarTotal,
      done: grammarDone,
    }
    : null;

  const readingLabel = selectedParts
    .map((p) => p.readingLabel.split(' · ')[0])
    .filter(Boolean)
    .join(' + ');

  return {
    id: selectedParts[0]?.id ?? 1,
    readingLabel,
    vocab: { done: vocabDone, total: vocabTotal },
    grammar,
    hasReading: selectedParts.some((p) => p.hasReading),
    isDone: selectedParts.every((p) => p.isDone),
  };
}

/** What the part teaches: its authored pattern citation, with an explicit count when there are several. */
function grammarLabel(pageIds: string[]): string {
  const citations = pageIds.flatMap((id) => {
    const entry = GRAMMAR_USAGE_RULES[id];
    const text = entry?.detected?.citation ?? entry?.undetectable;
    return text ? [text] : [];
  });
  return citations.length
    ? `${citations[0]}${pageIds.length > 1 ? ` · ${pageIds.length} patterns` : ''}`
    : `${pageIds.length} ${pageIds.length === 1 ? 'pattern' : 'patterns'}`;
}

function settingEnglish(setting: string) {
  return setting.split(' · ')[1] ?? setting;
}

/** Per-part progress, captions and hero image for one lesson. */
export function useLessonWindowParts(bookId: number, lesson: CourseLessonProgress) {
  const completedPageIds = useAppStore((state) => state.completedPageIds);
  const [readingPack, setReadingPack] = useState<{ bookId: number; readings: ReadingRecord[] } | null>(null);

  useEffect(() => {
    let isMounted = true;
    void fetchReadingsPack(bookId).then((pack) => {
      if (isMounted) setReadingPack({ bookId, readings: pack ?? [] });
    });
    return () => {
      isMounted = false;
    };
  }, [bookId]);

  // A lesson can render before its reading pack is available. Keep the art
  // frame empty until we know the final image instead of flashing the fallback icon.
  const readings = readingPack?.bookId === bookId ? readingPack.readings : null;
  const lessonReadings = useMemo(
    () => readings?.filter((reading) => reading.lessonId === lesson.id) ?? [],
    [lesson.id, readings],
  );

  const parts = useMemo<LessonWindowPart[]>(() => {
    const partIds = Array.from(new Set([
      ...lesson.parts.map((part) => part.id),
      ...lessonReadings.map((reading) => reading.dialogueNumber),
    ])).sort((a, b) => a - b);

    return partIds.map((id) => {
      const vocabRow = lesson.parts.find((part) => part.id === id);
      const reading = lessonReadings.find((item) => item.dialogueNumber === id);
      const manifest = findGrammarManifestPartForReading({ bookId, lessonId: lesson.id, dialogueNumber: id });
      const vocab = { done: vocabRow?.learnedCount ?? 0, total: vocabRow?.wordCount ?? 0 };
      const grammar = manifest
        ? {
          manifestId: manifest.id,
          label: grammarLabel(manifest.grammarPages.map((page) => page.id)),
          total: manifest.grammarPages.length,
          done: manifest.grammarPages.filter((page) => completedPageIds.includes(page.id)).length,
        }
        : null;
      const setting = reading?.setting ? settingEnglish(reading.setting) : '';
      return {
        id,
        readingLabel: [id === 3 ? 'Reading' : `Dialogue ${id}`, setting]
          .filter((piece, index, all) => piece && all.indexOf(piece) === index)
          .join(' · '),
        vocab,
        grammar,
        hasReading: Boolean(reading),
        isDone: vocab.done >= vocab.total && (!grammar || grammar.done >= grammar.total),
      };
    });
  }, [bookId, completedPageIds, lesson.id, lesson.parts, lessonReadings]);

  const dialogueIllustrations = lessonReadings
    .filter((reading) => reading.dialogueNumber <= 2)
    .sort((a, b) => a.dialogueNumber - b.dialogueNumber)
    .map((reading) => getReadingIllustration(reading.id)?.url)
    .filter((url): url is string => Boolean(url));
  const lastReading = lessonReadings[lessonReadings.length - 1];
  const illustration = lastReading ? getReadingIllustration(lastReading.id)?.url : undefined;
  const fallback = lesson.id === 0 ? INTRODUCTION_ART : LESSON_LANDSCAPE_ART[lesson.id];
  const imageSrcs = readings === null
    ? null
    : dialogueIllustrations.length === 2
      ? dialogueIllustrations
      : [illustration ?? fallback];

  /** False when falling back to small icon-style lesson art. */
  return { parts, imageSrcs, isIllustration: dialogueIllustrations.length === 2 || Boolean(illustration) };
}

import { useEffect, useMemo, useState } from 'react';
import { INTRODUCTION_ART, LESSON_LANDSCAPE_ART } from '../../../data/lessonLandscapeArt';
import { findGrammarManifestPartForReading } from '../../../data/interactiveGrammarManifest';
import { LESSON_PART_TITLES } from '../../../data/lessonPartTitles';
import { GRAMMAR_USAGE_RULES } from '../../../data/grammarUsageRules';
import { getReadingIllustration } from '../../../data/readingIllustrations';
import { fetchReadingsPack } from '../../../services/contentPacks';
import { useAppStore } from '../../../store/useAppStore';
import type { CourseLessonProgress, ReadingRecord } from '../../../types/models';
import { isEssayReading } from '../../../utils/lesson/readingKind';

export interface PartProgress {
  done: number;
  total: number;
}

export interface LessonWindowPart {
  id: number;
  /** "Dialogue 1 · At school", or "Essay · …" for a 短文 (numbered only when the lesson has two dialogues). */
  readingLabel: string;
  /** What the part is about, "Chinese · English" (empty when merged from several parts). */
  title: string;
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
    title: '',
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

/** Dialogues use authored titles; readings use the book's reading title. */
function partTitle(bookId: number, lessonId: number, part: number, reading: ReadingRecord | undefined): string {
  if (!reading) return '';
  if (bookId === 2) return reading.title.replace(/^(?:對話|短文) · /, '');
  return LESSON_PART_TITLES[`${bookId}-${lessonId}-${part}`] ?? (reading.title.startsWith('短文') ? reading.title.replace(/^短文 · /, '') : reading.setting ?? '');
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

    const dialogueIds = lessonReadings.filter((reading) => !isEssayReading(reading)).map((reading) => reading.dialogueNumber);
    const kindLabel = (id: number, reading: ReadingRecord | undefined) => {
      if (reading && isEssayReading(reading)) return 'Essay';
      const index = dialogueIds.indexOf(id);
      if (dialogueIds.length === 1 && index === 0) return 'Dialogue';
      return `Dialogue ${index >= 0 ? index + 1 : id}`;
    };

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
        title: partTitle(bookId, lesson.id, id, reading),
        // An essay's setting only repeats "short reading"; its title already says what it is about.
        readingLabel: [kindLabel(id, reading), reading && isEssayReading(reading) ? '' : setting]
          .filter((piece, index, all) => piece && all.indexOf(piece) === index)
          .join(' · '),
        vocab,
        grammar,
        hasReading: Boolean(reading),
        isDone: vocab.done >= vocab.total && (!grammar || grammar.done >= grammar.total),
      };
    });
  }, [bookId, completedPageIds, lesson.id, lesson.parts, lessonReadings]);

  const illustrationsByPart = Object.fromEntries(lessonReadings.flatMap((reading) => {
    const url = getReadingIllustration(reading.id)?.url;
    return url ? [[reading.dialogueNumber, url]] : [];
  })) as Record<number, string>;
  if (bookId === 2 && lesson.id > 0) {
    for (const part of parts) {
      const id = `B2L${String(lesson.id).padStart(2, '0')}-R${String(part.id).padStart(2, '0')}`;
      const url = getReadingIllustration(id)?.url;
      if (url && !illustrationsByPart[part.id]) illustrationsByPart[part.id] = url;
    }
  }
  const lastReading = lessonReadings[lessonReadings.length - 1];
  const illustration = (lastReading ? getReadingIllustration(lastReading.id)?.url : undefined)
    ?? illustrationsByPart[parts[0]?.id];
  const fallback = lesson.id === 0 ? INTRODUCTION_ART : LESSON_LANDSCAPE_ART[lesson.id];
  const fallbackImageSrc = readings === null
    ? null
    : illustration ?? fallback;

  /** False when falling back to small icon-style lesson art. */
  return { parts, illustrationsByPart, fallbackImageSrc, fallbackIsIllustration: Boolean(illustration) };
}

import { GrammarSlotMap } from '../../../lib/widgets';
import type { GrammarWordToken, InteractiveGrammarPage } from '../../../types/models';
import { GrammarPatternRow } from './GrammarPatternRow';

const RESPONSIVE_GRID_CLASSES = {
  balanced: 'grid-cols-3 sm:grid-cols-[0.75fr_1.35fr_1fr]',
  'leading-wide': 'grid-cols-[minmax(0,3.8fr)_minmax(56px,1fr)_minmax(60px,0.8fr)] sm:grid-cols-[0.75fr_1.35fr_1fr]',
  'middle-wide': 'grid-cols-[minmax(48px,0.8fr)_minmax(0,2.4fr)_minmax(60px,0.9fr)] sm:grid-cols-[0.75fr_1.35fr_1fr]',
} as const;

const columnGroups = (page: InteractiveGrammarPage) => [
  page.patternRows.map((row) => row.subject),
  page.patternRows.map((row) => row.grammar),
  page.patternRows.map((row) => row.complement),
];

interface GrammarPatternSectionProps {
  page: InteractiveGrammarPage;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onOpenWord: (word: string) => void;
  contextTokens: GrammarWordToken[];
}

export function GrammarPatternSection({
  page,
  characterPreference,
  showPinyin,
  showTranslation,
  onOpenWord,
}: GrammarPatternSectionProps) {
  const populatedGroups = columnGroups(page);
  const visibleColumns = page.patternColumns
    .map((_, index) => index)
    .filter((index) => populatedGroups[index]?.some((group) => group.length > 0));
  const safeVisibleColumns = visibleColumns.length > 0 ? visibleColumns : [0];
  const sourceAccentColumn = page.patternAccentColumn ?? safeVisibleColumns[Math.min(1, safeVisibleColumns.length - 1)];
  const accentColumn = Math.max(0, safeVisibleColumns.indexOf(sourceAccentColumn));
  const gridClass = safeVisibleColumns.length === 2
    ? 'grid-cols-2'
    : safeVisibleColumns.length === 1
      ? 'grid-cols-1'
      : RESPONSIVE_GRID_CLASSES[page.patternMobileLayout ?? 'balanced'];

  return (
    <section aria-labelledby="grammar-pattern-heading" className="mt-7">
      <h2 id="grammar-pattern-heading" className="sr-only">Sentence pattern</h2>

      <GrammarSlotMap
        aria-label="Sentence slots"
        activeIndex={accentColumn}
        gridClassName={gridClass}
        slots={safeVisibleColumns.map((sourceIndex) => ({
          label: page.patternColumns[sourceIndex],
          detail: page.patternColumnDetails?.[sourceIndex],
        }))}
      />

      <div className="mt-3 space-y-3">
        {page.patternRows.map((row) => (
          <GrammarPatternRow
            key={row.id}
            row={row}
            visibleColumns={safeVisibleColumns}
            gridClassName={gridClass}
            characterPreference={characterPreference}
            showPinyin={showPinyin}
            showTranslation={showTranslation}
            onOpenWord={onOpenWord}
          />
        ))}
      </div>
    </section>
  );
}

import type { GrammarPatternRow as GrammarPatternRowData } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { InteractiveGrammarSentence } from './InteractiveGrammarSentence';

interface GrammarPatternRowProps {
  row: GrammarPatternRowData;
  visibleColumns: number[];
  gridClassName: string;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onOpenWord: (word: string) => void;
}

export function GrammarPatternRow({
  row,
  visibleColumns,
  gridClassName,
  characterPreference,
  showPinyin,
  showTranslation,
  onOpenWord,
}: GrammarPatternRowProps) {
  const groups = [row.subject, row.grammar, row.complement] as const;

  return (
    <article className="overflow-hidden rounded-[14px] border border-ui-border bg-ui-surface">
      <div className={cn('grid items-stretch', gridClassName)}>
        {visibleColumns.map((sourceIndex) => (
          <div
            key={`${row.id}-group-${sourceIndex}`}
            className={cn(
              'flex min-w-0 items-start justify-center border-l border-ui-divider px-2 py-3.5 first:border-l-0 sm:px-4',
            )}
          >
            <InteractiveGrammarSentence
              words={[...groups[sourceIndex]]}
              characterPreference={characterPreference}
              showPinyin={showPinyin}
              align="center"
              tone="default"
              size="sm"
              className="gap-x-1 gap-y-2 sm:text-base"
              onOpenWord={onOpenWord}
            />
          </div>
        ))}
      </div>

      {showTranslation && (
        <div className="border-t border-ui-divider bg-ui-canvas/85 px-4 py-2.5 sm:flex sm:items-baseline sm:gap-3">
          <p className="text-[9px] font-black uppercase tracking-[0.05em] text-ui-muted">Meaning</p>
          <p className="mt-0.5 text-xs font-bold leading-5 text-ui-ink sm:mt-0 sm:text-[13px]">
            {row.english}
          </p>
        </div>
      )}
    </article>
  );
}

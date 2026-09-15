import React, { useState, useEffect } from 'react';
import type { ReaderGrammarPoint } from '../hooks/useReaderStudyData';
import { AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

export interface ReaderCompanionGrammarCardProps {
  grammarPoints: ReaderGrammarPoint[];
  dialogueNumber: number;
  onOpenGrammarPart?: (partId: string, pageId?: string) => void;
}

export const ReaderCompanionGrammarCard = React.memo(function ReaderCompanionGrammarCard({
  grammarPoints,
  dialogueNumber,
  onOpenGrammarPart,
}: ReaderCompanionGrammarCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Reset to closed by default whenever the active dialogue changes
  useEffect(() => {
    setIsCollapsed(true);
  }, [dialogueNumber]);

  return (
    <section
      aria-label="Grammar Points"
      className="shrink-0 rounded-2xl bg-ui-surface border-2 border-feedback-warning-edge border-b-[length:var(--depth-md)] shadow-xs p-3.5 flex flex-col gap-2.5"
    >
      {/* Bento Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <AppIcon name="grammar" size={16} className="text-feedback-warning-edge shrink-0" />
          <h3 className="font-sans text-xs font-black uppercase tracking-wider text-ui-ink-strong">
            Grammar
          </h3>
          {grammarPoints.length > 0 && (
            <span className="font-sans text-[10px] font-black px-1.5 py-0.5 rounded-full bg-ui-surface-soft text-ui-muted-strong">
              {grammarPoints.length}
            </span>
          )}
        </div>

        {grammarPoints.length > 0 && (
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1 rounded-lg text-ui-muted hover:text-ui-ink-strong hover:bg-ui-surface-soft transition-colors focus-ring"
            title={isCollapsed ? 'Expand grammar points' : 'Collapse grammar points'}
            aria-expanded={!isCollapsed}
          >
            <AppIcon
              name="dropdown"
              size={15}
              className={cn('transition-transform duration-200', !isCollapsed && 'rotate-180')}
            />
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="flex flex-col gap-2 pt-0.5">
          {/* Grammar Points List */}
          {grammarPoints.length === 0 ? (
            <div className="py-3 px-2 text-center font-sans text-xs font-bold text-ui-muted">
              No grammar points recorded for this dialogue.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {grammarPoints.map((point) => (
                <button
                  type="button"
                  key={point.id}
                  onClick={() => onOpenGrammarPart?.(point.partId, point.id)}
                  disabled={!onOpenGrammarPart}
                  aria-label={`Open grammar lab for ${point.titleEnglish}`}
                  className="group flex w-full items-center justify-between gap-3 rounded-compact px-2.5 py-2 text-left transition-colors hover:bg-ui-hover focus-ring outline-none select-none disabled:cursor-default"
                >
                  {/* Chinese Title on top, English Title underneath (never truncated) */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-chinese text-base font-bold leading-snug text-ui-ink-strong group-hover:text-feedback-warning-edge transition-colors">
                      {point.titleTraditional}
                    </span>
                    <span className="font-sans text-sm font-bold text-ui-ink mt-0.5 leading-snug">
                      {point.titleEnglish}
                    </span>
                  </div>

                  {/* Forward arrow */}
                  {onOpenGrammarPart && (
                    <span className="shrink-0 text-ui-muted group-hover:text-feedback-warning-edge group-hover:translate-x-0.5 transition-all pr-0.5">
                      <AppIcon name="forward" size={15} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
});

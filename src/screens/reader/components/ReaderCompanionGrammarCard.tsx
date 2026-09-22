import React, { useState, useEffect } from 'react';
import type { ReaderGrammarPoint } from '../utils/readerStudyTargets';
import type { ReaderLocateMode } from '../utils/readerLocate';
import { AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import { ReaderCompanionGrammarRow } from './ReaderCompanionGrammarRow';

export interface ReaderCompanionGrammarCardProps {
  grammarPoints: ReaderGrammarPoint[];
  dialogueNumber: number;
  onOpenGrammarPart?: (partId: string, pageId?: string) => void;
  /** Highlights (or clears) a grammar point's sentence in the reading text. */
  onLocateGrammarPoint?: (point: ReaderGrammarPoint | null) => void;
  locateMode?: ReaderLocateMode;
  locatedGrammarPointId?: string | null;
}

export const ReaderCompanionGrammarCard = React.memo(function ReaderCompanionGrammarCard({
  grammarPoints,
  dialogueNumber,
  onOpenGrammarPart,
  onLocateGrammarPoint,
  locateMode = 'hover',
  locatedGrammarPointId = null,
}: ReaderCompanionGrammarCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Reset to open by default whenever the active dialogue changes
  useEffect(() => {
    setIsCollapsed(false);
  }, [dialogueNumber]);

  const usedCount = grammarPoints.filter((point) => point.usage !== 'none').length;

  // The whole lesson stays listed, separated per part: this reading's own part
  // first in normal ink, every other part dimmed (used or not). Essays have no
  // own part, so their used pages stay in normal ink and the rest dim.
  const ownPartNumber = grammarPoints.find((point) => point.group === 'part')?.partNumber ?? null;
  const groups = new Map<number, ReaderGrammarPoint[]>();
  for (const point of grammarPoints) {
    const list = groups.get(point.partNumber) ?? [];
    list.push(point);
    groups.set(point.partNumber, list);
  }
  const orderedPartNumbers = [...groups.keys()]
    .filter((partNumber) => partNumber !== ownPartNumber)
    .sort((a, b) => a - b);
  if (ownPartNumber !== null) orderedPartNumbers.unshift(ownPartNumber);

  const isDimmed = (point: ReaderGrammarPoint) =>
    ownPartNumber !== null ? point.group !== 'part' : point.usage === 'none';

  const renderRows = (points: ReaderGrammarPoint[]) =>
    points.map((point) => (
      <ReaderCompanionGrammarRow
        key={point.id}
        point={point}
        isLocated={locatedGrammarPointId === point.id}
        dimmed={isDimmed(point)}
        locateMode={locateMode}
        onOpenGrammarPart={onOpenGrammarPart}
        onLocateGrammarPoint={onLocateGrammarPoint}
      />
    ));

  const groupLabelClass =
    'px-2.5 pt-0.5 font-sans text-[10px] font-black uppercase tracking-wider text-ui-muted-strong';

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
            <span
              className="font-sans text-[10px] font-black px-1.5 py-0.5 rounded-full bg-ui-surface-soft text-ui-muted-strong"
              title="Used in this reading"
            >
              {usedCount}
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
            <div className="py-3 px-2 text-center font-sans text-xs font-bold text-ui-muted-strong">
              No grammar points recorded for this dialogue.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {orderedPartNumbers.map((partNumber) => (
                <div key={partNumber} className="flex flex-col gap-1">
                  <p className={groupLabelClass}>
                    {ownPartNumber !== null && partNumber < ownPartNumber
                      ? `Part ${partNumber} review`
                      : `Part ${partNumber}`}
                  </p>
                  {renderRows(groups.get(partNumber) ?? [])}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
});

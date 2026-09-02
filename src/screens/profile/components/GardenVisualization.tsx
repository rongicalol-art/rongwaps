import { useMemo } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import { SAMPLE_BOOKS } from '../../../data/books';

export function GardenVisualization({ onWaterGarden }: { onWaterGarden: () => void }) {
  const { srsData, activeBookId } = useAppStore();

  const activeBook = useMemo(() => {
    return SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];
  }, [activeBookId]);

  const gardenStats = useMemo(() => {
    let seeds = 0;
    let sprouts = 0;
    let flowers = 0;
    let withered = 0;

    const now = Date.now();
    Object.values(srsData).forEach(card => {
      if (card.nextReviewDate <= now) {
        withered++;
      } else if (card.repetition === 0) {
        seeds++;
      } else if (card.repetition === 1) {
        sprouts++;
      } else {
        flowers++;
      }
    });

    return { seeds, sprouts, flowers, withered, total: Object.keys(srsData).length };
  }, [srsData]);

  const cardsToReview = gardenStats.withered;

  return (
    <div className="w-full bg-ui-surface rounded-feature border-b-[length:var(--depth-md)] border-ui-border p-6 flex flex-col gap-6 relative overflow-hidden">
      {/* Decorative background element using active book theme color */}
      <div 
        className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-2xl pointer-events-none opacity-20"
        style={{ backgroundColor: activeBook.accentHex }}
      />
      
      <div className="flex flex-col gap-1 z-10">
        <h2 className="text-xl font-black text-ui-ink flex items-center gap-2">
          Your Vocabulary Garden
        </h2>
        <p className="text-ui-muted text-sm font-bold">
          {gardenStats.total} total words planted
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 z-10">
        {/* Seeds */}
        <div className="flex flex-col items-center justify-center p-3 bg-ui-canvas border-b-[length:var(--depth-sm)] border-ui-border rounded-control">
          <AppIcon name="leaf" size={24} className="text-ui-muted mb-1 animate-pulse" />
          <span className="text-lg font-black text-ui-ink">{gardenStats.seeds}</span>
          <span className="text-[10px] font-bold text-ui-muted uppercase tracking-wider text-center leading-tight">Seeds</span>
        </div>
        
        {/* Sprouts */}
        <div className="flex flex-col items-center justify-center p-3 bg-feedback-success/10 border-b-[length:var(--depth-sm)] border-feedback-success-edge/30 rounded-control">
          <AppIcon name="plant" size={24} className="text-feedback-success mb-1" />
          <span className="text-lg font-black text-ui-ink">{gardenStats.sprouts}</span>
          <span className="text-[10px] font-bold text-feedback-success uppercase tracking-wider text-center leading-tight">Sprouts</span>
        </div>

        {/* Flowers */}
        <div className="flex flex-col items-center justify-center p-3 bg-feedback-danger/10 border-b-[length:var(--depth-sm)] border-feedback-danger-edge/30 rounded-control">
          <AppIcon name="flower" size={24} className="text-feedback-danger mb-1" />
          <span className="text-lg font-black text-ui-ink">{gardenStats.flowers}</span>
          <span className="text-[10px] font-bold text-feedback-danger uppercase tracking-wider text-center leading-tight">Flowers</span>
        </div>

        {/* Withered (Needs Review / Thirsty) */}
        <div className={cn(
          "flex flex-col items-center justify-center p-3 rounded-control border-b-[length:var(--depth-sm)]",
          cardsToReview > 0 
            ? "bg-feedback-warning/10 border-feedback-warning-edge/30" 
            : "bg-ui-canvas border-ui-divider"
        )}>
          <AppIcon name="drop" size={24} className={cn(
            "mb-1",
            cardsToReview > 0 ? "text-feedback-warning-edge animate-bounce" : "text-ui-muted"
          )} />
          <span className={cn(
            "text-lg font-black",
            cardsToReview > 0 ? "text-feedback-warning-edge" : "text-ui-ink"
          )}>{gardenStats.withered}</span>
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider text-center leading-tight",
            cardsToReview > 0 ? "text-feedback-warning-edge" : "text-ui-muted"
          )}>Thirsty</span>
        </div>
      </div>

      <div className="z-10 mt-2">
        {cardsToReview > 0 ? (
          <ActionButton
            variant="primary"
            size="lg"
            fullWidth
            onClick={onWaterGarden}
            className={cn(
              "uppercase tracking-widest",
              activeBook.accentBg, 
              activeBook.buttonEdge
            )}
          >
            <AppIcon name="drop" size={18} />
            Water Garden ({cardsToReview})
          </ActionButton>
        ) : (
          <ActionButton
            variant="secondary"
            size="lg"
            fullWidth
            disabled
            className="uppercase tracking-widest"
          >
            Garden is Hydrated!
          </ActionButton>
        )}
      </div>
    </div>
  );
}

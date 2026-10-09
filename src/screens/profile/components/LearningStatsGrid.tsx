import { memo } from 'react';
import { AppIcon, type AppIconName } from '../../../lib/widgets';

interface CollectionTileProps {
  icon: AppIconName;
  iconClassName: string;
  value: number;
  label: string;
  onClick?: () => void;
}

/** A pressable collection tile: icon chip, big number, quiet label. */
function CollectionTile({ icon, iconClassName, value, label, onClick }: CollectionTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex min-w-0 flex-col gap-2 rounded-feature border-2 border-b-[length:var(--depth-lg)] border-ui-divider bg-ui-surface px-4 py-3.5 text-left transition-transform active:translate-y-0.5 active:border-b-[length:var(--depth-sm)] focus-ring disabled:cursor-default"
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-control ${iconClassName}`}>
        <AppIcon name={icon} size={22} />
      </span>
      <span className="text-[28px] font-black leading-none tabular-nums text-ui-ink-strong">{value}</span>
      <span className="text-xs font-black uppercase tracking-widest text-ui-muted">{label}</span>
    </button>
  );
}

interface LearningStatsGridProps {
  favoriteCount: number;
  localCardsCount: number;
  onNavigateToFavorites?: () => void;
  onCreateCustomCard?: () => void;
}

/** Collections you own: favorites and custom cards. Learning numbers live in the review card. */
export const LearningStatsGrid = memo(function LearningStatsGrid({
  favoriteCount,
  localCardsCount,
  onNavigateToFavorites,
  onCreateCustomCard,
}: LearningStatsGridProps) {
  return (
    <section aria-label="Your collections" className="min-w-0">
      <h2 className="mb-2 text-xs font-black uppercase tracking-widest text-ui-muted">Your collections</h2>
      <div className="grid grid-cols-2 gap-3">
        <CollectionTile icon="bookmarkFilled" iconClassName="bg-feedback-warning-surface text-feedback-warning-edge" value={favoriteCount} label="Favorites" onClick={onNavigateToFavorites} />
        <CollectionTile icon="folder" iconClassName="bg-brand-primary-soft text-brand-primary" value={localCardsCount} label="Custom cards" onClick={onCreateCustomCard} />
      </div>
    </section>
  );
});

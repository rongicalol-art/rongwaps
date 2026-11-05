import type { EntryReading } from '../../../utils/vocabulary/wordEntry';

const MAX_SHOWN = 3;

/** "also zhǎng · zhàng" beside the hero's pinyin: each other reading with a meaning, tap to lead with it. */
export function AlsoReadings({ readings, lead, onSelect }: {
  readings: readonly EntryReading[];
  lead: EntryReading;
  onSelect?: (key: string) => void;
}) {
  const others = readings.filter((reading) => reading !== lead && !reading.reference).slice(0, MAX_SHOWN);
  if (others.length === 0) return null;
  return (
    <span className="text-xs font-bold text-ui-muted sm:text-sm">
      also{' '}
      {others.map((reading, index) => (
        <span key={reading.key}>
          {index > 0 && ' · '}
          {onSelect ? (
            <button
              type="button"
              onClick={() => onSelect(reading.key)}
              aria-label={`Show the reading ${reading.pinyin}`}
              className="rounded-xs font-extrabold text-brand-primary-text hover:underline focus-ring-inline"
            >
              {reading.pinyin}
            </button>
          ) : (
            <span className="text-brand-primary">{reading.pinyin}</span>
          )}
        </span>
      ))}
    </span>
  );
}

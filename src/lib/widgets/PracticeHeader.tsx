import { PiLightbulbFill, PiGearFill } from 'react-icons/pi';
import { ScreenHeaderProps, ScreenHeader } from './ScreenHeader';

interface PracticeHeaderProps extends Omit<ScreenHeaderProps, 'rightAction'> {
  onLightbulbClick?: () => void;
  onSettingsClick?: () => void;
  showLightbulb?: boolean;
}

export function PracticeHeader({
  onLightbulbClick,
  onSettingsClick,
  showLightbulb = true,
  ...props
}: PracticeHeaderProps) {
  return (
    <ScreenHeader
      {...props}
      rightAction={
        <div className="flex items-center gap-1 pointer-events-auto">
          {showLightbulb && onLightbulbClick && (
            <button
              onClick={onLightbulbClick}
              className="p-2 text-amber-400 hover:text-amber-500 hover:scale-110 active:scale-95 transition-all"
              aria-label="Insights and examples"
              title="Insights & Examples"
            >
              <PiLightbulbFill size={28} />
            </button>
          )}
          <button 
            onClick={onSettingsClick}
            className="p-2 -mr-2 text-[#AFB6BB] hover:text-[#4B4B4B] hover:scale-105 active:scale-95 transition-all relative z-100"
            aria-label="Settings"
          >
            <PiGearFill size={28} />
          </button>
        </div>
      }
    />
  );
}

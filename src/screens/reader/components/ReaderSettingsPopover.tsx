import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AppIcon,
  IconActionButton,
  SegmentedControl,
  SettingsDropdownPicker,
  SwitchRow,
} from '../../../lib/widgets';
import { useDismiss } from '../../../hooks/useDismiss';
import type { ReaderTextSize } from '../../../types/models';
import type { CharacterFont } from '../../../store/useAppStore';

interface ReaderSettingsPopoverProps {
  textSize: ReaderTextSize;
  onTextSizeChange: (size: ReaderTextSize) => void;
  characterFont?: CharacterFont;
  onCharacterFontChange?: (font: CharacterFont) => void;
  showPinyin: boolean;
  onTogglePinyin: () => void;
  showMeaning: boolean;
  onToggleMeaning: () => void;
  showHoverDefinitions?: boolean;
  onToggleHoverDefinitions?: () => void;
  size?: 'sm' | 'md' | 'lg';
  iconSize?: number;
}

export function ReaderSettingsPopover({
  textSize,
  onTextSizeChange,
  characterFont,
  onCharacterFontChange,
  showPinyin,
  onTogglePinyin,
  showMeaning,
  onToggleMeaning,
  showHoverDefinitions = true,
  onToggleHoverDefinitions,
  size = 'lg',
  iconSize = 25,
}: ReaderSettingsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useDismiss({
    ref: containerRef,
    onDismiss: () => setIsOpen(false),
    isActive: isOpen,
  });

  return (
    <div ref={containerRef} className="relative">
      <IconActionButton
        size={size}
        onClick={() => setIsOpen((open) => !open)}
        icon={<AppIcon name="settings" size={iconSize} />}
        label="Reading settings"
        title="Reading settings"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-64 space-y-3.5 popover-surface p-2.5 text-left sm:w-72"
          >
            {/* Font Size */}
            <div className="pb-0.5">
              <SettingsDropdownPicker<ReaderTextSize>
                label="Font size"
                ariaLabel="Font size preference"
                value={textSize}
                onChange={onTextSizeChange}
                options={[
                  { value: 'normal', label: 'Standard' },
                  { value: 'large', label: 'Large' },
                  { value: 'extra-large', label: 'Huge' },
                ]}
              />
            </div>

            {characterFont && onCharacterFontChange && (
              <>
                <div className="h-px bg-ui-divider" />
                <div className="space-y-1.5 pb-0.5">
                  <span className="block px-1 text-xs font-black uppercase tracking-wider text-ui-muted-strong">
                    Character font
                  </span>
                  <SegmentedControl<CharacterFont>
                    value={characterFont}
                    onChange={onCharacterFontChange}
                    ariaLabel="Character font preference"
                    options={[
                      { value: 'huninn', label: <span>Rounded</span> },
                      { value: 'kai', label: <span>Kai</span> },
                    ]}
                  />
                </div>
              </>
            )}

            <div className="h-px bg-ui-divider" />

            {/* Reading Aids Toggles */}
            <div role="menu" aria-label="Reading aids" className="flex flex-col gap-1.5">
              <SwitchRow label="Translation" checked={showMeaning} onToggle={onToggleMeaning} />

              <SwitchRow label="Pinyin" checked={showPinyin} onToggle={onTogglePinyin} />

              {onToggleHoverDefinitions && (
                <SwitchRow label="Hover Definitions" checked={showHoverDefinitions} onToggle={onToggleHoverDefinitions} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

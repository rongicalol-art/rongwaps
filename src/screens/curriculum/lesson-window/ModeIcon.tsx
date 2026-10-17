import type { CSSProperties } from 'react';
import { cn } from '../../../utils/cn';
import type { PartModeKey } from './useLessonWindowParts';

interface ModeIconProps {
  mode: PartModeKey;
  /** Remount key: change it to play the gesture again. */
  playKey: number;
  /** 'once' plays the gesture one time; 'loop' repeats it with a rest between (the selected mode); 'none' is still. */
  motion: 'none' | 'once' | 'loop';
  /** Seconds before the gesture starts (the list's staggered entrance). */
  delay?: number;
  className?: string;
}

const DOT = 'm6 13c0 0.552-0.4477 1-1 1s-1-0.448-1-1 0.4477-1 1-1 1 0.448 1 1z';

/**
 * The lesson mode artwork (same drawings as the flat icon files) with its parts split out, so each plays one
 * small gesture (see `.mi-*` in index.css). The parent remounts it through `playKey` to replay.
 */
export function ModeIcon({ mode, playKey, motion, delay = 0, className }: ModeIconProps) {
  return (
    <svg
      key={`${playKey}-${motion}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn('mode-icon shrink-0 overflow-visible', motion === 'once' && 'mi-once', motion === 'loop' && 'mi-loop', className)}
      style={{ '--mi-d': `${delay}s` } as CSSProperties}
    >
      <g transform="translate(0 -1028.4)">
        {mode === 'vocab' && (
          <>
            <g className="mi-layer-low"><path fill="#e74c3c" d="m0 1044.4 12 6 12-6-12-6z" /><path fill="#c0392b" d="m12 1038.4-9 4.5 9 4.5 9-4.5-9-4.5z" /></g>
            <g><path fill="#3498db" d="m4.2e-7 1040.4 12 6 12-6-12-6z" /><path fill="#2980b9" d="m12 1034.4-9 4.5 9 4.5 9-4.5-9-4.5z" /></g>
            <g className="mi-layer-high"><path fill="#f1c40f" d="m4e-7 1036.4 12 6 12-6-12-6z" /></g>
          </>
        )}
        {mode === 'grammar' && (
          <>
            <path d="m3 1035.4v2 1 3 1 5 1c0 1.1 0.8954 2 2 2h14c1.105 0 2-0.9 2-2v-1-5-4-3h-18z" fill="#16a085" />
            <path d="m3 1034.4v2 1 3 1 5 1c0 1.1 0.8954 2 2 2h14c1.105 0 2-0.9 2-2v-1-5-4-3h-18z" fill="#ecf0f1" />
            <path d="m3 1033.4v2 1 3 1 5 1c0 1.1 0.8954 2 2 2h14c1.105 0 2-0.9 2-2v-1-5-4-3h-18z" fill="#bdc3c7" />
            <path d="m3 1032.4v2 1 3 1 5 1c0 1.1 0.8954 2 2 2h14c1.105 0 2-0.9 2-2v-1-5-4-3h-18z" fill="#ecf0f1" />
            <path d="m5 1028.4c-1.1046 0-2 0.9-2 2v1 4 2 1 3 1 5 1c0 1.1 0.8954 2 2 2h2v-1h-1.5c-0.8284 0-1.5-0.7-1.5-1.5 0-0.9 0.6716-1.5 1.5-1.5h12.5 1c1.105 0 2-0.9 2-2v-1-5-4-3-1c0-1.1-0.895-2-2-2h-4-10z" fill="#16a085" />
            <path className="mi-cover" d="m8 1028.4v18h1 9 1c1.105 0 2-0.9 2-2v-1-5-4-3-1c0-1.1-0.895-2-2-2h-4-6-1z" fill="#1abc9c" />
            <g className="mi-mark"><path d="m7 1048.4v2 2l2.5-2 2.5 2v-2-2h-5z" fill="#e74c3c" /><rect height="1" width="5" y="1047.4" x="7" fill="#c0392b" /></g>
          </>
        )}
        {mode === 'reading' && (
          <>
            <g className="mi-bubble-blue"><path d="m22 1030.4c1.105 0 2 0.9 2 2v3 2 3c0 1.1-0.895 2-2 2v4l-4.875-4h-2.125-6c-1.1046 0-2-0.9-2-2v-3-2-3c0-1.1 0.8954-2 2-2h6 1 6z" fill="#2980b9" /><path d="m22 1029.4c1.105 0 2 0.9 2 2v3 2 3c0 1.1-0.895 2-2 2v4l-4.875-4h-2.125-6c-1.1046 0-2-0.9-2-2v-3-2-3c0-1.1 0.8954-2 2-2h6 1 6z" fill="#3498db" /></g>
            <g className="mi-bubble-green">
              <path d="m2 1036.4c-1.1046 0-2 0.9-2 2v3 2 3c0 1.1 0.89543 2 2 2v4l4.875-4h2.125 6c1.105 0 2-0.9 2-2v-3-2-3c0-1.1-0.895-2-2-2h-6-1-6z" fill="#27ae60" />
              <path d="m2 1035.4c-1.1046 0-2 0.9-2 2v3 2 3c0 1.1 0.89543 2 2 2v4l4.875-4h2.125 6c1.105 0 2-0.9 2-2v-3-2-3c0-1.1-0.895-2-2-2h-6-1-6z" fill="#2ecc71" />
              {[-3, 1, 5].map((x, i) => (
                <g key={x} className={`mi-dot mi-dot-${i + 1}`}>
                  <path d={DOT} transform={`matrix(1.5 0 0 1.5 ${x} 1023.4)`} fill="#27ae60" />
                  <path d={DOT} transform={`matrix(1.5 0 0 1.5 ${x} 1022.4)`} fill="#ecf0f1" />
                </g>
              ))}
            </g>
          </>
        )}
      </g>
    </svg>
  );
}

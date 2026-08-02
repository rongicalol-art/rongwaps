export const DESIGN_TOKENS = {
  font: {
    interface: 'var(--font-sans)',
    chinese: 'var(--font-chinese)',
  },
  color: {
    canvas: 'var(--color-ui-canvas)',
    practiceCanvas: 'var(--color-ui-practice-canvas)',
    surface: 'var(--color-ui-surface)',
    surfaceHover: 'var(--color-ui-surface-hover)',
    inkStrong: 'var(--color-ui-ink-strong)',
    ink: 'var(--color-ui-ink)',
    mutedStrong: 'var(--color-ui-muted-strong)',
    muted: 'var(--color-ui-muted)',
    border: 'var(--color-ui-border)',
    divider: 'var(--color-ui-divider)',
    hover: 'var(--color-ui-hover)',
    brand: {
      primary: 'var(--color-brand-primary)',
      primaryEdge: 'var(--color-brand-primary-edge)',
      primaryDeep: 'var(--color-brand-primary-deep)',
      secondary: 'var(--color-brand-secondary)',
      secondaryEdge: 'var(--color-brand-secondary-edge)',
    },
    feedback: {
      success: 'var(--color-feedback-success)',
      warning: 'var(--color-feedback-warning)',
      danger: 'var(--color-feedback-danger)',
    },
  },
  radius: {
    compact: 'var(--radius-compact)',
    control: 'var(--radius-control)',
    feature: 'var(--radius-feature)',
  },
  depth: {
    compact: 'var(--depth-compact)',
    control: 'var(--depth-control)',
    card: 'var(--depth-card)',
  },
  size: {
    windowHeader: 'var(--size-window-header)',
  },
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;

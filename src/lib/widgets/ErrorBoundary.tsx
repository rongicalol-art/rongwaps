import React, { Component, type ReactNode } from 'react';
import { ActionButton } from './ActionButton';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /**
   * Replaces the default fallback container classes (`min-h-[300px] p-8`).
   * Pass a viewport-sized value (e.g. `min-h-[100dvh] p-8`) when the boundary
   * is the app-level safety net rather than a section inside a screen.
   */
  fallbackClassName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches JavaScript errors anywhere in the child component tree and
 * displays a fallback UI instead of crashing the entire app.
 *
 * Mounted app-level in `main.tsx` (so no render error can blank the page)
 * and per tab screen in `TabScreens`. Error boundaries do not catch errors
 * thrown in event handlers or async callbacks; data-loading hooks own those.
 *
 * Usage:
 *   <ErrorBoundary fallbackClassName="min-h-[100dvh] p-8">
 *     <App />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          className={`flex flex-col items-center justify-center text-center bg-ui-canvas ${
            this.props.fallbackClassName ?? 'min-h-[300px] p-8'
          }`}
        >
          <div className="w-20 h-20 rounded-control bg-ui-surface border-b-[length:var(--depth-lg)] border-ui-border flex items-center justify-center mb-4">
            <span className="text-3xl">😵</span>
          </div>
          <h2 className="font-extrabold text-xl text-ui-ink mb-2">Something went wrong</h2>
          <p className="text-sm text-ui-muted mb-6 max-w-xs">
            An unexpected error occurred. You can try again or go back to the home screen.
          </p>
          <div className="flex gap-3">
            <ActionButton onClick={this.handleReset} variant="primary">
              Try Again
            </ActionButton>
            <ActionButton onClick={() => window.location.reload()} variant="secondary">
              Reload App
            </ActionButton>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
import React, { Component, type ReactNode } from 'react';
import { ActionButton } from './ActionButton';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches JavaScript errors anywhere in the child component tree and
 * displays a fallback UI instead of crashing the entire app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyScreen />
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
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center bg-ui-canvas">
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
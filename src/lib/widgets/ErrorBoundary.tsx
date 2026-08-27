import React, { Component, type ReactNode } from 'react';

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
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center bg-[#F7F7F7]">
          <div className="w-20 h-20 rounded-[20px] bg-white border-2 border-b-[5px] border-[#E5E5E5] flex items-center justify-center mb-4">
            <span className="text-3xl">😵</span>
          </div>
          <h2 className="font-extrabold text-xl text-ui-ink mb-2">Something went wrong</h2>
          <p className="text-sm text-[#AFB6BB] mb-6 max-w-xs">
            An unexpected error occurred. You can try again or go back to the home screen.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-6 py-3 bg-brand-primary text-white font-extrabold rounded-[16px] border-b-2 border-brand-primary-edge active:border-b-[0px] active:translate-y-[4px] transition-all cursor-pointer"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white text-ui-ink font-extrabold rounded-[16px] border-2 border-b-[5px] border-[#E5E5E5] active:border-b-[0px] active:translate-y-[4px] transition-all cursor-pointer"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
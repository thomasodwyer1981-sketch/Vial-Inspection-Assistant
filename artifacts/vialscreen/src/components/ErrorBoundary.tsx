import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary. Catches unhandled React render errors so
 * users never see a blank white screen. Shows a recovery prompt instead.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Best-effort logging only — no crash reporting service
    console.error('[VialScreen] Unhandled render error:', error, info.componentStack);
  }

  handleReset = () => {
    // Clear the error state first, then hard-reload to ensure a clean slate
    this.setState({ hasError: false, error: null }, () => {
      window.location.href = '/';
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
            An unexpected error occurred. Your scan history is stored locally and won't be lost.
          </p>
          {this.state.error && (
            <p className="text-xs text-muted-foreground/60 mb-6 font-mono bg-secondary/50 p-3 rounded-lg w-full text-left break-words">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold"
          >
            <RefreshCw className="w-4 h-4" />
            Return to Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

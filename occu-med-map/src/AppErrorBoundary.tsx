import React from "react";
import { recordBootFailure } from "./startupDiagnostics";

type FailureScreenProps = {
  title: string;
  message: string;
  onRetry?: () => void;
};

type AppErrorBoundaryProps = React.PropsWithChildren<Record<string, never>>;

export function ApplicationFailureScreen({ title, message, onRetry }: FailureScreenProps) {
  const copyDiagnostics = async (): Promise<void> => {
    const diagnostics = window.__NETWORK_MAP_BOOT__?.snapshot();
    const payload = JSON.stringify(diagnostics || { message }, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // Clipboard support is optional; the expandable details remain available.
    }
  };

  return (
    <main className="app-fatal-state" role="alert" aria-live="assertive">
      <section className="app-fatal-card">
        <p className="app-fatal-kicker">Network Map recovery</p>
        <h1>{title}</h1>
        <p>{message}</p>
        <div className="app-fatal-actions">
          {onRetry ? <button type="button" onClick={onRetry}>Try again</button> : null}
          <button type="button" onClick={() => window.location.reload()}>Reload application</button>
          <button type="button" className="secondary" onClick={() => void copyDiagnostics()}>Copy diagnostics</button>
        </div>
        <details>
          <summary>Technical details</summary>
          <pre>{JSON.stringify(window.__NETWORK_MAP_BOOT__?.snapshot() || { message }, null, 2)}</pre>
        </details>
      </section>
    </main>
  );
}

type ErrorBoundaryState = {
  error: Error | null;
};

export default class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    recordBootFailure(
      "react-render",
      `${error.message}${info.componentStack ? `\n${info.componentStack}` : ""}`,
      true,
    );
  }

  private retry = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <ApplicationFailureScreen
          title="The map interface could not finish loading"
          message="The application entered recovery mode instead of leaving you with a frozen or blank screen."
          onRetry={this.retry}
        />
      );
    }
    return this.props.children;
  }
}

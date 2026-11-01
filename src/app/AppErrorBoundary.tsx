import { Component, type ErrorInfo, type ReactNode } from "react";

import { Logo } from "@/components/ui/Logo";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("MacroLog error boundary", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center">
        <Logo size={48} showText={false} />
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-fg">
          Algo salió mal
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Tus datos siguen guardados en este dispositivo. Recarga la aplicación para
          volver a intentarlo.
        </p>
        <button
          type="button"
          className="mt-5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast transition hover:bg-accent-strong"
          onClick={() => window.location.reload()}
        >
          Recargar MacroLog
        </button>
      </div>
    );
  }
}

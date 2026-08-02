import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("FPGA Studio workbench failure", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <main className="crash-screen">
        <div className="crash-card">
          <AlertTriangle size={36} />
          <div>
            <p className="eyebrow">Workspace recovery</p>
            <h1>The interface hit an unexpected problem.</h1>
            <p>Your project files were not changed. Reload the window to restore the last saved workspace.</p>
            <pre>{this.state.error.message}</pre>
            <button className="primary-button" onClick={() => window.location.reload()}><RotateCcw size={16} /> Reload workspace</button>
          </div>
        </div>
      </main>
    );
  }
}

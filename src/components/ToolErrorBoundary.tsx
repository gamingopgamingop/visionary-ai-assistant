import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  toolName?: string;
  onReset?: () => void;
  /** Render a custom fallback. Receives error + reset/hard-reset helpers. */
  fallback?: (args: { error: Error; reset: () => void; hardReset: () => void; attempts: number }) => ReactNode;
}

interface State {
  error: Error | null;
  attempts: number;
  /** Bumped to force-remount children on hard reset. */
  remountKey: number;
}

/**
 * Tool-level error boundary. Isolates failures (e.g. WASM/ONNX crashes)
 * so one broken tab doesn't take down the whole workspace.
 *
 * Recovery model:
 *   - reset       : clear error, keep mounted subtree (soft).
 *   - hardReset   : clear error and remount the subtree from scratch (drops local state).
 *   - attempts    : counter; after 3 soft retries we recommend a hard reset in the UI.
 */
export default class ToolErrorBoundary extends Component<Props, State> {
  state: State = { error: null, attempts: 0, remountKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[ToolErrorBoundary${this.props.toolName ? `:${this.props.toolName}` : ""}]`, error, info);
  }

  reset = () => {
    this.setState((s) => ({ error: null, attempts: s.attempts + 1 }));
    this.props.onReset?.();
  };

  hardReset = () => {
    this.setState((s) => ({ error: null, attempts: 0, remountKey: s.remountKey + 1 }));
    this.props.onReset?.();
  };

  render() {
    const { error, attempts, remountKey } = this.state;
    if (error) {
      if (this.props.fallback) {
        return this.props.fallback({ error, reset: this.reset, hardReset: this.hardReset, attempts });
      }
      const stale = attempts >= 2;
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 flex flex-col items-start gap-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">
              {this.props.toolName ? `${this.props.toolName} failed` : "Something went wrong"}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground font-mono break-all">{error.message}</p>
          {stale && (
            <p className="text-xs text-muted-foreground">
              Soft retry hasn't helped after {attempts} attempts. Try a full reset to clear local tool state.
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={this.reset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
            <Button size="sm" variant={stale ? "default" : "ghost"} onClick={this.hardReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Full reset
            </Button>
          </div>
        </div>
      );
    }
    // remountKey forces children to unmount/remount on hard reset.
    return <div key={remountKey} className="contents">{this.props.children}</div>;
  }
}

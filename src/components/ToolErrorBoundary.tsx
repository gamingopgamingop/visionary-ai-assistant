import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  toolName?: string;
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Tool-level error boundary. Isolates failures (e.g. WASM/ONNX crashes)
 * so one broken tab doesn't take down the whole workspace.
 */
export default class ToolErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[ToolErrorBoundary${this.props.toolName ? `:${this.props.toolName}` : ""}]`, error, info);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 flex flex-col items-start gap-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">
              {this.props.toolName ? `${this.props.toolName} failed` : "Something went wrong"}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground font-mono break-all">
            {this.state.error.message}
          </p>
          <Button size="sm" variant="outline" onClick={this.reset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

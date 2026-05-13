import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class WebGLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.warn("WebGL/3D Error caught by boundary:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 border border-orange-900/40 rounded">
          <div className="text-center space-y-3 p-8">
            <div className="text-4xl font-black tracking-widest text-orange-500 font-mono">3D OFFLINE</div>
            <div className="text-zinc-400 font-mono text-sm uppercase tracking-wider max-w-xs">
              WebGL not available in this environment. The 3D arena will work in a deployed browser with GPU support.
            </div>
            <div className="mt-4 w-16 h-1 bg-orange-600 mx-auto" />
            <div className="text-xs text-zinc-600 font-mono uppercase tracking-widest">
              All other game features functional
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

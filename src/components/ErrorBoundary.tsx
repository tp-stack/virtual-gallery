"use client";

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, error.stack);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-8">
          <div className="max-w-lg text-center">
            <div className="w-px h-16 bg-[#C8A96A]/40 mx-auto mb-8" />
            <h1 className="text-[#F5F2EA] text-2xl font-light mb-4 tracking-[-0.02em]">
              Application Error
            </h1>
            <p className="text-[#B8B2A4] text-sm font-light mb-6 leading-relaxed">
              A client-side error occurred. The error has been logged to the console.
            </p>
            <div className="p-4 rounded-[12px] bg-[#161616] border border-[#232323] mb-8 text-left">
              <p className="text-[#8FA3B8] text-xs font-mono break-all leading-relaxed">
                {this.state.error?.message || "Unknown error"}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-[#F5F2EA] text-[#050505] font-medium text-xs tracking-[0.08em] uppercase rounded-[12px] hover:bg-[#E6E6E6] transition-all duration-500"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

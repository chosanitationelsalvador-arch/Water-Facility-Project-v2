import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#051F20] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="p-8 border border-red-500/30 rounded-2xl max-w-md shadow-2xl space-y-6 bg-[#051f20]/90 backdrop-blur-md">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black uppercase tracking-wider text-red-400">
                Application Interrupted
              </h2>
              <p className="text-xs text-white/80 leading-relaxed font-mono">
                An unexpected rendering anomaly was intercepted.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 bg-[#031415] border border-white/10 rounded-lg text-left overflow-auto max-h-32 text-[10px] font-mono text-red-300">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex gap-4">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-red-500 hover:bg-red-600 text-white cursor-pointer transition-all duration-200 shadow-md hover:shadow-red-500/20 hover:-translate-y-0.5"
              >
                Reload Portal
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

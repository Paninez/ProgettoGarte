import { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { clearSession } from "../../lib/firebase";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReset = () => {
    try {
      clearSession();
      localStorage.removeItem("APP_STORAGE_CONFIG");
      sessionStorage.clear();
    } catch (e) {
      console.warn("Error clearing cache:", e);
    }
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[100dvh] bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6 text-center animate-fade-in">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Si è verificato un errore imprevisto
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                L'applicazione ha riscontrato un problema durante la visualizzazione. Puoi ricaricare la pagina o ripristinare la sessione.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Ricarica Pagina</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearAndReset}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold rounded-xl text-sm transition-all border border-slate-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-slate-500" />
                <span>Pulisci Cache & Reset</span>
              </button>
            </div>

            {/* Collapsible Error Trace */}
            <div className="pt-2 text-left border-t border-slate-100">
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="flex items-center justify-between w-full text-xs font-bold text-slate-400 hover:text-slate-600 py-1"
              >
                <span>Dettagli Tecnici Errore</span>
                {this.state.showDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {this.state.showDetails && (
                <div className="mt-2 p-3 bg-slate-900 text-slate-200 rounded-xl text-left text-xs font-mono overflow-auto max-h-48 space-y-2 select-all">
                  <p className="text-rose-400 font-bold">{this.state.error?.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-[10px] text-slate-400 whitespace-pre-wrap leading-tight">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

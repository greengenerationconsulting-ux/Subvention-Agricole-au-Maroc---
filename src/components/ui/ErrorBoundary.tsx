import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Something went wrong.';
      let errorDetails = null;

      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) {
          errorMessage = `Firestore Error: ${parsed.error}`;
          errorDetails = parsed;
        }
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-red-100">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Application Error</h2>
            <p className="text-gray-700 mb-6">{errorMessage}</p>
            {errorDetails && (
              <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-60 mb-6">
                <pre className="text-xs text-gray-600">
                  {JSON.stringify(errorDetails, null, 2)}
                </pre>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

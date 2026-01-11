import React, { ErrorInfo, ReactNode } from 'react';
import { Card, Button } from './ui/brutalist';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  // Explicitly declare state, props, and setState for TypeScript
  declare state: State;
  declare props: Props;
  declare setState: (state: Partial<State>) => void;
  
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // In production, you could send this to an error reporting service
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Reload the page to ensure clean state
    window.location.reload();
  };

  handleGoHome = () => {
    // Clear session and go to login
    sessionStorage.clear();
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFDF7] p-4">
          <Card className="max-w-2xl w-full border-4 border-black shadow-[8px_8px_0px_0px_#000] p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-12 h-12 text-[#FF6B6B]" />
              </div>
              <div className="flex-1">
                <h1 className="font-black text-2xl mb-2 text-black">
                  Oops! Terjadi Kesalahan
                </h1>
                <p className="font-bold text-base text-black mb-4">
                  Aplikasi mengalami masalah yang tidak terduga. Jangan khawatir, data Anda aman.
                </p>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="bg-[#FFD43B] border-2 border-black p-4 mb-4 font-mono text-xs overflow-auto max-h-40">
                    <p className="font-black mb-1">Error Details (Dev Only):</p>
                    <p className="font-bold">{this.state.error.toString()}</p>
                    {this.state.errorInfo && (
                      <pre className="mt-2 text-xs overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <Button 
                    variant="primary" 
                    onClick={this.handleReset}
                    className="flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Muat Ulang Halaman
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={this.handleGoHome}
                    className="flex items-center justify-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Kembali ke Login
                  </Button>
                </div>
                
                <div className="mt-6 pt-6 border-t-2 border-black">
                  <p className="text-sm font-bold text-black opacity-70">
                    💡 Tips: Jika masalah berlanjut, coba:
                  </p>
                  <ul className="text-sm font-medium text-black opacity-70 mt-2 list-disc list-inside space-y-1">
                    <li>Refresh halaman (F5 atau Cmd+R)</li>
                    <li>Clear cache browser</li>
                    <li>Hubungi administrator jika masalah terus terjadi</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}


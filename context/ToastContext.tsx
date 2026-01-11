import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Toast } from '../components/ui/brutalist';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Global toast queue untuk handle multiple toasts
let toastQueue: Array<{ message: string; type: 'success' | 'error' | 'info' | 'warning' }> = [];
let isProcessing = false;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processQueue = useCallback(() => {
    if (isProcessing || toastQueue.length === 0) return;
    
    isProcessing = true;
    const nextToast = toastQueue.shift()!;
    
    setToastMessage(nextToast.message);
    setToastType(nextToast.type);
    setIsVisible(true);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        isProcessing = false;
        if (toastQueue.length > 0) {
          processQueue();
        }
      }, 300);
    }, 3000);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    toastQueue.push({ message, type });
    processQueue();
  }, [processQueue]);

  // Expose to window for AppContext access
  React.useEffect(() => {
    (window as any).__showToast = showToast;
    return () => {
      delete (window as any).__showToast;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast message={toastMessage} isVisible={isVisible} type={toastType} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback to window if context not available
    return {
      showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => {
        if ((window as any).__showToast) {
          (window as any).__showToast(message, type);
        }
      }
    };
  }
  return context;
};

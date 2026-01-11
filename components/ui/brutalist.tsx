
import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';

// Utility for class merging (simplified for no dependencies)
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md',
  ...props 
}) => {
  const baseStyles = "font-bold border-2 border-black transition-all duration-200 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100";
  
  const variants = {
    primary: "bg-[#4F46E5] text-white shadow-[4px_4px_0px_0px_#000] hover:bg-[#4338ca] hover:shadow-[6px_6px_0px_0px_#000] hover:scale-[1.02]",
    secondary: "bg-[#FFD43B] text-black shadow-[4px_4px_0px_0px_#000] hover:bg-[#fcc419] hover:shadow-[6px_6px_0px_0px_#000] hover:scale-[1.02]",
    outline: "bg-white text-black shadow-[4px_4px_0px_0px_#000] hover:bg-gray-50 hover:shadow-[6px_6px_0px_0px_#000] hover:scale-[1.02]",
    destructive: "bg-[#FF6B6B] text-white shadow-[4px_4px_0px_0px_#000] hover:bg-[#fa5252] hover:shadow-[6px_6px_0px_0px_#000] hover:scale-[1.02]",
    ghost: "border-transparent hover:bg-black/5 active:translate-x-0 active:translate-y-0 text-black shadow-none hover:scale-[1.05]",
  };

  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
    icon: "h-10 w-10 flex items-center justify-center p-0",
  };

  return (
    <button className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
};

// --- CARD ---
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => {
  return (
    <div className={cn("bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] p-4 transition-all duration-200", className)} {...props}>
      {children}
    </div>
  );
};

// --- INPUT ---
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => {
  return (
    <input 
      className={cn("w-full bg-white border-2 border-black px-3 py-2 text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-0 shadow-[2px_2px_0px_0px_#000] transition-all duration-200 focus:shadow-[3px_3px_0px_0px_#000] focus:scale-[1.01]", className)} 
      {...props} 
    />
  );
};

// --- TEXTAREA ---
export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className, ...props }) => {
  return (
    <textarea 
      className={cn("w-full bg-white border-2 border-black px-3 py-2 text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] shadow-[2px_2px_0px_0px_#000] transition-all duration-200 focus:shadow-[3px_3px_0px_0px_#000] focus:scale-[1.01] resize-y", className)} 
      {...props} 
    />
  );
};

// --- SELECT ---
export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }> = ({ className, children, ...props }) => {
  return (
    <select 
      className={cn("w-full bg-white border-2 border-black px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-0 shadow-[2px_2px_0px_0px_#000] cursor-pointer font-bold", className)} 
      {...props}
    >
      {children}
    </select>
  );
};

// --- BADGE ---
export const Badge: React.FC<{ children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'danger', className?: string }> = ({ 
  children, 
  variant = 'default',
  className
}) => {
  const styles = {
    default: "bg-gray-200 text-black",
    success: "bg-[#51CF66] text-black",
    warning: "bg-[#FFD43B] text-black",
    danger: "bg-[#FF6B6B] text-white",
  };
  
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 border-2 border-black text-xs font-bold shadow-[2px_2px_0px_0px_#000]", styles[variant], className)}>
      {children}
    </span>
  );
};

// --- ALERT ---
export const Alert: React.FC<{ title: string, description: string, variant?: 'info' | 'destructive' }> = ({ title, description, variant = 'info' }) => {
  const bg = variant === 'destructive' ? 'bg-[#FF6B6B] text-white' : 'bg-[#E0F2F1] text-black';
  return (
    <div className={cn("border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000] mb-4", bg)}>
      <h5 className="font-black text-lg mb-1 flex items-center gap-2">
        {variant === 'destructive' ? '⚠️' : 'ℹ️'} {title}
      </h5>
      <p className="text-sm font-medium opacity-90">{description}</p>
    </div>
  );
};

// --- DIALOG / MODAL OVERLAY ---
export const DialogOverlay: React.FC<{ isOpen: boolean, onClose: () => void, children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md animate-in fade-in zoom-in duration-200 max-h-screen overflow-y-auto">
        <Card className="p-6">
           {children}
        </Card>
      </div>
    </div>
  );
};

// --- TOAST ---
export const Toast: React.FC<{ message: string, isVisible: boolean, type?: 'success' | 'error' | 'info' | 'warning' }> = ({ message, isVisible, type = 'success' }) => {
  if (!isVisible) return null;
  
  const typeStyles = {
    success: 'bg-black text-white border-white',
    error: 'bg-[#FF6B6B] text-white border-white',
    info: 'bg-[#4F46E5] text-white border-white',
    warning: 'bg-[#FFD43B] text-black border-black'
  };
  
  const typeIcons = {
    success: '✓',
    error: '✗',
    info: 'ℹ',
    warning: '⚠'
  };
  
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[65] animate-in slide-in-from-bottom-5 fade-in zoom-in duration-300">
      <div className={`${typeStyles[type]} border-2 px-6 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] flex items-center gap-3 rounded-sm hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] transition-all duration-200`}>
        <span className="text-xl font-black">{typeIcons[type]}</span>
        <span className="font-black tracking-wide text-sm md:text-base">{message}</span>
      </div>
    </div>
  );
};

// --- ALERT DIALOG ---
interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: 'info' | 'warning' | 'error' | 'success';
  confirmText?: string;
  onConfirm?: () => void;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  variant = 'info',
  confirmText = 'OK',
  onConfirm
}) => {
  if (!isOpen) return null;
  
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const variantStyles = {
    info: 'bg-[#E0F2F1] border-[#4F46E5]',
    warning: 'bg-[#FFD43B] border-black',
    error: 'bg-[#FF6B6B] border-black',
    success: 'bg-[#51CF66] border-black'
  };

  const iconEmoji = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅'
  };

  const textColorClass = variant === 'error' ? 'text-white' : 'text-black';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className={`max-w-md w-full ${variantStyles[variant]} border-4 border-black shadow-[8px_8px_0px_0px_#000] p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl flex-shrink-0">{iconEmoji[variant]}</span>
          <div className={`flex-1 min-w-0 ${textColorClass}`}>
            <h3 className={`font-black text-xl mb-2 ${textColorClass}`} style={{ color: variant === 'error' ? '#FFFFFF' : '#000000' }}>{title}</h3>
            <p className={`font-bold text-base leading-relaxed ${textColorClass}`} style={{ color: variant === 'error' ? '#FFFFFF' : '#000000' }}>{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          {onConfirm && (
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
          )}
          <Button variant={variant === 'error' ? 'destructive' : 'primary'} onClick={handleConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- DROPDOWN MENU ---
interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, children, align = 'right' }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div 
          className={cn(
            "absolute w-56 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] z-50 max-h-[400px] overflow-y-auto mt-2",
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  danger?: boolean;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({ 
  children, 
  icon, 
  danger, 
  className,
  ...props 
}) => {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-bold transition-colors",
        "hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed",
        danger && "text-red-600 hover:bg-red-50",
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

export const DropdownSeparator: React.FC = () => {
  return <div className="h-px bg-black/10 my-1" />;
};

// --- CONFIRM DIALOG ---
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  variant?: 'warning' | 'danger';
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  keepOpenOnConfirm?: boolean;
  loadingText?: string; // Custom loading text
  loadingSubtext?: string; // Custom loading subtext
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  variant = 'warning',
  confirmText = 'Ya',
  cancelText = 'Batal',
  isLoading = false,
  keepOpenOnConfirm = false,
  loadingText = 'Sedang Memproses...',
  loadingSubtext = 'Mohon tunggu sebentar'
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    warning: 'bg-[#FFD43B] text-black border-black',
    danger: 'bg-[#FF6B6B] text-white border-black'
  };

  const textColor = variant === 'danger' ? 'text-white' : 'text-black';

  const handleConfirm = () => {
    onConfirm();
    // Only close immediately if keepOpenOnConfirm is false
    if (!keepOpenOnConfirm) {
      onClose();
    }
    // Otherwise, parent component will handle closing after async operation
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" 
      onClick={isLoading ? undefined : onClose}
    >
      <div 
        className={`relative max-w-md w-full ${variantStyles[variant]} border-4 border-black shadow-[8px_8px_0px_0px_#000] p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
            <Loader2 className="w-12 h-12 animate-spin text-[#4F46E5]" />
            <div className="text-center">
              <p className="font-black text-lg mb-1">{loadingText}</p>
              <p className="font-bold text-sm text-gray-600">{loadingSubtext}</p>
            </div>
          </div>
        )}
        
        <div className="flex items-start gap-3 mb-6">
          <span className="text-3xl flex-shrink-0">⚠️</span>
          <div className={`flex-1 min-w-0 ${textColor}`}>
            <h3 className={`font-black text-xl mb-2 ${textColor}`} style={{ color: variant === 'danger' ? '#FFFFFF' : '#000000' }}>{title}</h3>
            <p className={`font-bold text-base leading-relaxed ${textColor}`} style={{ color: variant === 'danger' ? '#FFFFFF' : '#000000' }}>{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button 
            variant={variant === 'danger' ? 'destructive' : 'primary'} 
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

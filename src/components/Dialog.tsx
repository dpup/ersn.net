import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  onClose: () => void;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
};

export default function Dialog({ onClose, children, maxWidth = '2xl' }: DialogProps) {
  // Lock body scroll when dialog is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white rounded-t-xl sm:rounded-lg w-full ${maxWidthClasses[maxWidth]} max-h-[95vh] sm:max-h-[85vh] flex flex-col shadow-lg touch-pan-y`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        {children}
      </div>
    </div>
  );
}

interface DialogHeaderProps {
  onClose: () => void;
  children: ReactNode;
}

export function DialogHeader({ onClose, children }: DialogHeaderProps) {
  return (
    <div className="p-4 sm:p-6 border-b border-stone-200 flex-shrink-0">
      {/* Mobile drag indicator */}
      <div className="w-12 h-1 bg-stone-300 rounded-full mx-auto mb-4 sm:hidden" />

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">{children}</div>

        <button
          type="button"
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600 transition-colors p-2 -m-2 flex-shrink-0"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

interface DialogContentProps {
  children: ReactNode;
}

export function DialogContent({ children }: DialogContentProps) {
  return <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>;
}

interface DialogQuickActionsProps {
  children: ReactNode;
}

export function DialogQuickActions({ children }: DialogQuickActionsProps) {
  return (
    <div className="px-4 sm:px-6 py-3 bg-stone-50 border-b border-stone-200">
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

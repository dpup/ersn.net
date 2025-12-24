import { useState, useEffect, type ReactNode } from 'react';
import { X, ChevronDown } from 'lucide-react';

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
        className={`bg-white rounded-t-xl sm:rounded-lg w-full ${maxWidthClasses[maxWidth]} max-h-[95vh] sm:max-h-[85vh] flex flex-col shadow-xl touch-pan-y overflow-hidden`}
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
  variant?: 'default' | 'dark';
  footer?: ReactNode;
}

export function DialogHeader({
  onClose,
  children,
  variant = 'default',
  footer,
}: DialogHeaderProps) {
  const isDark = variant === 'dark';

  return (
    <div className={`p-5 flex-shrink-0 ${isDark ? 'bg-stone-700' : ''}`}>
      {/* Mobile drag indicator */}
      <div
        className={`w-12 h-1 ${isDark ? 'bg-stone-500' : 'bg-stone-300'} rounded-full mx-auto mb-4 sm:hidden`}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">{children}</div>

        <button
          type="button"
          onClick={onClose}
          className={`${isDark ? 'bg-white/10 text-stone-400 hover:text-stone-300' : 'bg-stone-100 text-stone-400 hover:text-stone-600'} transition-colors p-2 rounded-lg flex-shrink-0`}
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}

interface DialogContentProps {
  children: ReactNode;
}

export function DialogContent({ children }: DialogContentProps) {
  return <div className="p-4 sm:p-5 overflow-y-auto flex-1">{children}</div>;
}

interface DialogQuickActionsProps {
  children: ReactNode;
}

export function DialogQuickActions({ children }: DialogQuickActionsProps) {
  return (
    <div className="px-4 sm:px-5 py-3 bg-stone-50 border-b border-stone-200">
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// New shared components for the updated design

interface StatBoxProps {
  label: string;
  value: string;
  icon?: ReactNode;
  variant?: 'default' | 'dark';
}

export function StatBox({ label, value, icon, variant = 'default' }: StatBoxProps) {
  const isDark = variant === 'dark';

  return (
    <div
      className={`${isDark ? 'bg-white/10' : 'bg-stone-50 border border-stone-200'} rounded-lg p-3 flex-1 text-center`}
    >
      {icon && <div className="mb-1">{icon}</div>}
      <div
        className={`font-mono text-xl font-medium tracking-tight ${isDark ? 'text-white' : 'text-stone-800'}`}
      >
        {value}
      </div>
      <div
        className={`text-[11px] uppercase tracking-wide mt-0.5 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}
      >
        {label}
      </div>
    </div>
  );
}

interface InfoCardProps {
  children: ReactNode;
  variant?: 'default' | 'warning' | 'danger';
}

export function InfoCard({ children, variant = 'default' }: InfoCardProps) {
  const styles = {
    default: 'bg-stone-50 border-stone-200',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-red-50 border-red-200',
  };

  return <div className={`border rounded-lg p-4 ${styles[variant]}`}>{children}</div>;
}

interface BadgeProps {
  children: ReactNode;
  variant?: 'warning' | 'critical' | 'info' | 'success' | 'muted' | 'impact';
}

export function Badge({ children, variant = 'muted' }: BadgeProps) {
  const styles = {
    warning: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    critical: 'bg-red-100 text-red-800 border border-red-300',
    info: 'bg-blue-100 text-blue-800 border border-blue-300',
    success: 'bg-green-100 text-green-800 border border-green-300',
    muted: 'bg-stone-100 text-stone-600 border border-stone-300',
    impact: 'bg-stone-700 text-white border border-stone-700',
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  countVariant?: 'warning' | 'danger' | 'info';
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  count,
  countVariant = 'warning',
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const countStyles = {
    warning: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    danger: 'bg-red-100 text-red-800 border border-red-300',
    info: 'bg-blue-100 text-blue-800 border border-blue-300',
  };

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2.5 group"
      >
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {count !== undefined && (
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-bold ${countStyles[countVariant]}`}
            >
              {count}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      {isOpen && <div className="space-y-3">{children}</div>}
    </div>
  );
}

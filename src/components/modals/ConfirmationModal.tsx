import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  isLoading = false
}: ConfirmationModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const variants = {
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-yellow-900/20',
    info: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20',
  };

  const iconVariants = {
    danger: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    warning: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
    info: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", iconVariants[variant])}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight mb-2">{title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{message}</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50"
          >
            {cancelText || t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg",
              variants[variant]
            )}
          >
            {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {confirmText || t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

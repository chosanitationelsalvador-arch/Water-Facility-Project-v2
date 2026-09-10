import React from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

export interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

interface FeedbackModalProps {
  toasts: ToastState[];
  onDismissToast: (id: string) => void;
  confirmState: ConfirmState | null;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  toasts,
  onDismissToast,
  confirmState
}) => {
  return (
    <>
      {/* Toast Stack (Fixed Top-Right / Top-Center) */}
      <div className="fixed top-20 right-4 sm:right-6 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => {
          const bgStyle =
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100 shadow-emerald-950/50'
              : toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-100 shadow-rose-950/50'
              : toast.type === 'warning'
              ? 'bg-amber-950/90 border-amber-500/50 text-amber-100 shadow-amber-950/50'
              : 'bg-slate-900/90 border-brand-slate/40 text-brand-soft shadow-slate-950/50';

          const Icon =
            toast.type === 'success'
              ? CheckCircle2
              : toast.type === 'error'
              ? AlertCircle
              : toast.type === 'warning'
              ? TriangleAlert
              : Info;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 text-xs sm:text-sm font-medium ${bgStyle}`}
            >
              <Icon size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{toast.message}</div>
              <button
                onClick={() => onDismissToast(toast.id)}
                className="shrink-0 text-white/60 hover:text-white transition p-0.5 cursor-pointer"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {confirmState && confirmState.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#001D39] border border-brand-slate/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  confirmState.isDestructive
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                <TriangleAlert size={20} />
              </div>
              <h3 className="text-base font-bold text-white font-display">
                {confirmState.title}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-brand-soft leading-relaxed">
              {confirmState.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={confirmState.onCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-brand-soft hover:text-white bg-brand-slate/20 hover:bg-brand-slate/30 transition cursor-pointer border border-brand-slate/30"
              >
                {confirmState.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmState.onConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition cursor-pointer shadow-lg ${
                  confirmState.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : 'bg-brand-primary hover:bg-brand-primary/80 shadow-emerald-500/30'
                }`}
              >
                {confirmState.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

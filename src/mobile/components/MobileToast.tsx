import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface MobileToastProps {
  toast: {
    msg: string;
    type: 'success' | 'error' | 'info';
    id: number;
  } | null;
}

export function MobileToast({ toast }: MobileToastProps) {
  if (!toast) return null;

  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';

  return (
    <div className="fixed top-[calc(env(safe-area-inset-top,0px)+12px)] left-4 right-4 z-[150] flex items-center gap-3 px-4 py-3 rounded-2xl bg-neutral-900/90 backdrop-blur-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-none">
      {isError ? (
        <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
      ) : isInfo ? (
        <Info size={18} className="text-blue-400 flex-shrink-0" />
      ) : (
        <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
      )}
      <span className="text-xs font-semibold text-white tracking-wide truncate">
        {toast.msg}
      </span>
    </div>
  );
}

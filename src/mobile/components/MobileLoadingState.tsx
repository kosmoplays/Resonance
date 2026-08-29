import React from 'react';
import { Loader2 } from 'lucide-react';

interface MobileLoadingStateProps {
  message?: string;
  className?: string;
}

export function MobileLoadingState({
  message = 'Cargando contenido...',
  className = 'py-24',
}: MobileLoadingStateProps) {
  return (
    <div className={`w-full flex flex-col items-center justify-center text-neutral-400 gap-3 animate-in fade-in duration-300 ${className}`}>
      <div className="relative">
        <Loader2 size={36} className="animate-spin text-accent" />
        <div className="absolute inset-0 blur-md bg-accent/30 rounded-full animate-pulse" />
      </div>
      <p className="text-xs font-semibold tracking-wider text-neutral-400">
        {message}
      </p>
    </div>
  );
}

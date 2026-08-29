import React from 'react';

interface ResonanceLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function ResonanceLogo({ size = 32, className = '', showText = false }: ResonanceLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* VECTOR EMBLEM: CLEAN RESONANCE SOUND WAVES */}
      <div
        className="relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-accent shadow-[0_0_20px_rgba(59,130,246,0.45)] p-1.5 overflow-hidden flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-white"
        >
          {/* SOUND WAVE BARS */}
          <rect x="5" y="11" width="3" height="10" rx="1.5" fill="currentColor" />
          <rect x="11" y="6" width="3" height="20" rx="1.5" fill="currentColor" />
          <rect x="17" y="3" width="3" height="26" rx="1.5" fill="currentColor" />
          <rect x="23" y="9" width="3" height="14" rx="1.5" fill="currentColor" />
        </svg>
      </div>

      {showText && (
        <span className="font-black tracking-tight text-white font-sans text-lg">
          Resonance
        </span>
      )}
    </div>
  );
}

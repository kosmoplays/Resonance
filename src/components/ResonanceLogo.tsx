import React from 'react';

interface ResonanceLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function ResonanceLogo({ size = 32, className = '', showText = false }: ResonanceLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* VECTOR EMBLEM */}
      <div
        className="relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 shadow-[0_0_20px_rgba(59,130,246,0.5)] p-0.5 overflow-hidden flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-white"
        >
          {/* BACKGROUND SUBTLE GRID */}
          <circle cx="24" cy="24" r="20" fill="black" fillOpacity="0.25" />
          
          {/* RESONANCE SOUND WAVE "R" MONOGRAM */}
          {/* STEM (Wave 1) */}
          <path
            d="M15 12V36"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* TOP LOOP (Wave 2) */}
          <path
            d="M15 13H25C29.4183 13 33 16.5817 33 21C33 25.4183 29.4183 29 25 29H15"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* DYNAMIC LEG / WAVE BURST (Wave 3) */}
          <path
            d="M24 28L33 36"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* RESONANCE GLOW DOT */}
          <circle cx="34" cy="14" r="2.5" fill="#60a5fa" />
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

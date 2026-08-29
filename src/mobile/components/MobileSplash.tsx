import React, { useEffect, useState } from 'react';
import { ResonanceLogo } from '../../components/ResonanceLogo';

export function MobileSplash() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 600);
    const t2 = setTimeout(() => setVisible(false), 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black transition-opacity duration-300 pointer-events-none ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300">
        <ResonanceLogo size={72} />
        <span className="font-black text-2xl tracking-tighter text-white">Resonance</span>
        <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500">
          SoundCloud • YouTube
        </span>
      </div>
    </div>
  );
}

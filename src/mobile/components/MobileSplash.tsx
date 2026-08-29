import { useEffect, useState } from 'react';

export function MobileSplash() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 800);
    const t2 = setTimeout(() => setVisible(false), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!visible) return null;

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black transition-opacity duration-400 ${fading ? 'opacity-0' : 'opacity-100'}`}>
      <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] shadow-[0_0_50px_rgba(59,130,246,0.6)] flex items-center justify-center animate-pulse`}>
        <span className="text-white font-black text-4xl tracking-tighter">R</span>
      </div>
    </div>
  );
}

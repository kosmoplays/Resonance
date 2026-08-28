import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

const layouts = {
  Cyrillic: [
    ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ'],
    ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
    ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю']
  ],
  Greek: [
    ['ς', 'ε', 'ρ', 'τ', 'υ', 'θ', 'ι', 'ο', 'π'],
    ['α', 'σ', 'δ', 'φ', 'γ', 'η', 'ξ', 'κ', 'λ'],
    ['ζ', 'χ', 'ψ', 'ω', 'β', 'ν', 'μ']
  ],
  Hiragana: [
    ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ'],
    ['さ', 'し', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と'],
    ['な', 'に', 'ぬ', 'ね', 'の', 'は', 'ひ', 'ふ', 'へ', 'ほ'],
    ['ま', 'み', 'む', 'め', 'も', 'や', 'ゆ', 'よ', 'ら', 'り'],
    ['る', 'れ', 'ろ', 'わ', 'を', 'ん']
  ]
};

export function VirtualKeyboard({ isOpen, onClose, onType }: { isOpen: boolean, onClose: () => void, onType: (char: string) => void }) {
  const [lang, setLang] = useState<keyof typeof layouts>('Cyrillic');
  
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-end justify-center pb-20 pointer-events-none">
      <div className="fixed inset-0 pointer-events-auto" onClick={onClose} />
      <div className="relative pointer-events-auto bg-[#181818]/95 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300 max-w-3xl w-full mx-4">
        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
           <div className="flex gap-2">
             {Object.keys(layouts).map(l => (
               <button 
                 key={l}
                 onClick={() => setLang(l as any)}
                 className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${lang === l ? 'bg-[#3b82f6] text-white' : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'}`}
               >
                 {l}
               </button>
             ))}
           </div>
           <div className="flex items-center gap-4">
             <span className="text-xs text-neutral-500 font-medium">Pulsa fuera o Enter para cerrar</span>
             <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors">
               <X size={18} />
             </button>
           </div>
        </div>

        <div className="flex flex-col gap-2 items-center">
          {layouts[lang].map((row, i) => (
            <div key={i} className="flex gap-2 justify-center">
              {row.map(char => (
                <button
                  key={char}
                  onClick={() => onType(char)}
                  className="w-10 h-12 rounded-lg bg-white/5 hover:bg-white/20 border border-white/5 flex items-center justify-center text-lg font-medium text-white transition-all active:scale-95 active:bg-[#3b82f6]"
                >
                  {char}
                </button>
              ))}
            </div>
          ))}
          <div className="flex gap-2 justify-center w-full mt-4">
             <button onClick={() => onType(' ')} className="w-64 h-12 rounded-lg bg-white/5 hover:bg-white/20 border border-white/5 flex items-center justify-center text-sm font-bold text-neutral-400 transition-all active:scale-95 active:bg-[#3b82f6]">ESPACIO</button>
             <button onClick={() => onType('BACKSPACE')} className="w-24 h-12 rounded-lg bg-white/5 hover:bg-[#ff0000]/80 border border-white/5 flex items-center justify-center text-sm font-bold text-neutral-400 hover:text-white transition-all active:scale-95">BORRAR</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}






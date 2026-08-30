import React, { useState } from 'react';
import { X, ListPlus, Check } from 'lucide-react';

interface MobilePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
}

export function MobilePlaylistModal({
  isOpen,
  onClose,
  onCreate,
}: MobilePlaylistModalProps) {
  const [title, setTitle] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate(title.trim());
    setTitle('');
    onClose();
  };

  return (
    <div className="fixed top-0 left-0 w-full h-[100dvh] z-[130] flex items-center justify-center p-4">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* MODAL */}
      <div className="relative w-full max-w-sm bg-neutral-900 border border-white/10 rounded-3xl p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/20 text-accent">
              <ListPlus size={20} />
            </div>
            <h2 className="text-lg font-bold text-white">Nueva Playlist</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white bg-white/5 rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
              Nombre de la playlist
            </label>
            <input
              type="text"
              placeholder="Mi Mix Épico..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-accent text-sm"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 active:bg-white/15 rounded-2xl text-sm font-semibold text-neutral-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 py-3 bg-accent text-white font-semibold rounded-2xl text-sm flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(59,130,246,0.4)] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] transition-all"
            >
              <Check size={16} /> Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Edit3, Check } from 'lucide-react';

interface MobileEditPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: any;
  onUpdate: (id: string, title: string, artwork: string) => void;
}

export function MobileEditPlaylistModal({
  isOpen,
  onClose,
  playlist,
  onUpdate,
}: MobileEditPlaylistModalProps) {
  const [title, setTitle] = useState('');
  const [artwork, setArtwork] = useState('');

  useEffect(() => {
    if (playlist) {
      setTitle(playlist.title || '');
      setArtwork(playlist.artwork_url || '');
    }
  }, [playlist]);

  if (!isOpen || !playlist) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onUpdate(playlist.id, title.trim(), artwork.trim());
    onClose();
  };

  return (
    <div className="fixed top-0 left-0 w-full h-[100dvh] z-[130] flex items-center justify-center p-4">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* MODAL */}
      <div className="relative w-full max-w-sm bg-neutral-900 border border-white/10 rounded-3xl p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3 text-blue-400">
            <Edit3 size={24} />
          </div>
          <h2 className="text-xl font-black text-white">Editar Playlist</h2>
          <p className="text-sm text-neutral-400 text-center mt-1">
            Personaliza el nombre y la foto de tu lista
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
             <input
               type="text"
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               placeholder="Nombre de la playlist"
               autoFocus
               className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
             />
          </div>
          <div>
             <input
               type="text"
               value={artwork}
               onChange={(e) => setArtwork(e.target.value)}
               placeholder="URL de la imagen (Opcional)"
               className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
             />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-white/5 active:bg-white/10 text-white font-bold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 py-3.5 bg-blue-500 active:bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Check size={18} />
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

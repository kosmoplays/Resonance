import { useEffect, useState } from 'react';
import { Heart, ListPlus, ListVideo, X, Play } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

export function MobileContextMenu({ track, scProps, audioProps, onClose }: any) {
  const { toggleLike, likes, scLikes, ytLikes, resonancePlaylists, addTrackToPlaylist } = scProps;
  const { playNext } = audioProps;
  const { queue, toggleQueue } = usePlayerStore();

  const [mounted, setMounted] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  const close = () => {
    setMounted(false);
    setTimeout(onClose, 400);
  };

  if (!track) return null;

  const isLiked = likes.some((t: any) => t.id === track.id) || scLikes.some((t: any) => t.id === track.id) || ytLikes.some((t: any) => t.id === track.id);

  const handleAddToQueue = () => {
    usePlayerStore.setState({ queue: [...queue, track] });
    close();
  };

  const handleAddToPlaylist = (playlistId: string) => {
    addTrackToPlaylist(playlistId, track);
    close();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      {/* BACKDROP */}
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-400 ${mounted ? 'opacity-100' : 'opacity-0'}`} onClick={close} />

      {/* SHEET */}
      <div className={`relative bg-neutral-900 border-t border-white/10 rounded-t-3xl p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] transition-transform duration-400 ease-out ${mounted ? 'translate-y-0' : 'translate-y-full'}`}>
        
        <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-6">
          <img src={track.artwork_url?.replace('-large', '-t50x50') || 'https://placehold.co/50x50/1a1a1a/333333'} className="w-14 h-14 rounded-lg object-cover" alt="" />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg truncate text-white">{track.title}</h3>
            <p className="text-white/50 text-sm truncate">{track.user?.username}</p>
          </div>
          <button onClick={close} className="p-2 bg-white/5 rounded-full text-white/50 active:scale-90"><X size={20} /></button>
        </div>

        {showPlaylists ? (
          <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
            <button onClick={() => setShowPlaylists(false)} className="text-sm text-neutral-400 mb-2 font-bold uppercase tracking-widest text-left">Volver</button>
            {resonancePlaylists?.map((p: any) => (
              <button key={p.id} onClick={() => handleAddToPlaylist(p.id)} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl active:bg-white/10">
                <ListVideo size={20} className="text-[#3b82f6]" />
                <span className="font-bold">{p.title}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button onClick={() => { toggleLike(track); close(); }} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl active:bg-white/10">
              <Heart size={24} className={`${isLiked ? 'text-[#10b981] fill-[#10b981]' : 'text-white'}`} />
              <span className="font-bold text-lg">{isLiked ? 'Quitar de Me Gusta' : 'Añadir a Me Gusta'}</span>
            </button>

            <button onClick={handleAddToQueue} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl active:bg-white/10">
              <ListPlus size={24} className="text-white" />
              <span className="font-bold text-lg">Añadir a la Cola</span>
            </button>

            <button onClick={() => setShowPlaylists(true)} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl active:bg-white/10">
              <ListVideo size={24} className="text-white" />
              <span className="font-bold text-lg">Añadir a Playlist</span>
            </button>

            
          </div>
        )}

      </div>
    </div>
  );
}



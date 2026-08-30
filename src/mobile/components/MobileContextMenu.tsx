import React, { useEffect, useState } from 'react';
import {
  Heart,
  ListPlus,
  ListVideo,
  X,
  User,
  Scissors,
  Link2Off,
  Plus,
  Check,
  PlaySquare,
  Trash2,
  Ban,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

interface MobileContextMenuProps {
  track: any;
  scProps: {
    toggleLike: (track: any) => void;
    likes: any[];
    scLikes: any[];
    ytLikes: any[];
    resonancePlaylists: any[];
    addTrackToPlaylist: (playlistId: string, track: any) => void;
    openArtistProfile?: (user: any) => void;
    hideFromResonance?: (track: any) => void;
  };
  audioProps: {
    playTrack: (track: any) => void;
    playNext?: () => void;
  };
  onClose: () => void;
  onOpenCuts?: (track: any) => void;
  onCreatePlaylist?: () => void;
}

export function MobileContextMenu({
  track,
  scProps,
  audioProps,
  onClose,
  onOpenCuts,
  onCreatePlaylist,
}: MobileContextMenuProps) {
  const {
    toggleLike,
    likes,
    scLikes,
    ytLikes,
    resonancePlaylists,
    addTrackToPlaylist,
    openArtistProfile,
  } = scProps;
  const { queue, autoplayBlacklist } = usePlayerStore();
  const isAutoplayExcluded = Boolean(track?.id && autoplayBlacklist && autoplayBlacklist.includes(String(track.id)));

  const [mounted, setMounted] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [addedPlaylistId, setAddedPlaylistId] = useState<string | null>(null);

  // Swipe / Drag down to dismiss gesture state
  const touchStartY = React.useRef<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diffY = e.touches[0].clientY - touchStartY.current;
    if (diffY > 0) {
      setDragOffsetY(diffY);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartY.current !== null && dragOffsetY > 80) {
      close();
    } else {
      setDragOffsetY(0);
    }
    touchStartY.current = null;
  };

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const close = () => {
    setMounted(false);
    setTimeout(onClose, 300);
  };

  if (!track) return null;

  const trackIdStr = String(track.id);
  const trackYtId = track.yt_videoId;

  const isLiked =
    (likes &&
      likes.some(
        (t: any) =>
          String(t.id) === trackIdStr || (trackYtId && t.yt_videoId === trackYtId)
      )) ||
    (scLikes &&
      scLikes.some(
        (t: any) =>
          String(t.id) === trackIdStr || (trackYtId && t.yt_videoId === trackYtId)
      )) ||
    (ytLikes &&
      ytLikes.some(
        (t: any) =>
          String(t.id) === trackIdStr || (trackYtId && t.yt_videoId === trackYtId)
      ));

  const isHybrid = track.providers && track.providers.includes('soundcloud') && track.providers.includes('youtube');

  const artwork = track.artwork_url
    ? track.artwork_url.replace('-large', '-t300x300')
    : track.avatar_url
    ? track.avatar_url.replace('-large', '-t300x300')
    : 'https://placehold.co/300x300/18181b/ffffff?text=♪';

  const handleAddToQueue = () => {
    usePlayerStore.setState({ queue: [...queue, track] });
    window.dispatchEvent(
      new CustomEvent('show-toast', { detail: { msg: 'Añadida a la cola', type: 'success' } })
    );
    close();
  };

  const handlePlayNext = () => {
    usePlayerStore.setState({ queue: [track, ...queue] });
    window.dispatchEvent(
      new CustomEvent('show-toast', { detail: { msg: 'Se reproducirá a continuación', type: 'success' } })
    );
    close();
  };

  const handleAddToPlaylist = (playlistId: string) => {
    addTrackToPlaylist(playlistId, track);
    setAddedPlaylistId(playlistId);
    window.dispatchEvent(
      new CustomEvent('show-toast', { detail: { msg: 'Añadida a la playlist', type: 'success' } })
    );
    setTimeout(() => close(), 400);
  };

  const handleUnlink = () => {
    try {
      const pairKey = `${track.sc_id || track.id}|${track.yt_videoId}`;
      const unlinked = JSON.parse(localStorage.getItem('resonance_unlinked') || '[]');
      if (!unlinked.includes(pairKey)) {
        unlinked.push(pairKey);
        localStorage.setItem('resonance_unlinked', JSON.stringify(unlinked));
      }
      window.dispatchEvent(
        new CustomEvent('show-toast', { detail: { msg: 'Fuentes desvinculadas', type: 'info' } })
      );
    } catch (e) {}
    close();
  };

  return (
    <div className="fixed top-0 left-0 w-full h-[100dvh] z-[120] flex flex-col justify-end">
      {/* BACKDROP */}
      <div
        className={`absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300 ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={close}
      />

      {/* BOTTOM SHEET */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: dragOffsetY > 0 ? `translateY(${dragOffsetY}px)` : undefined,
        }}
        className={`relative bg-neutral-900/95 border-t border-white/10 rounded-t-[32px] p-6 pb-[max(env(safe-area-inset-bottom,0px),24px)] shadow-[0_-20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-transform duration-300 ease-out max-h-[85vh] flex flex-col ${
          mounted ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* DRAG HANDLE */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4 flex-shrink-0" />

        {/* TRACK HEADER */}
        <div className="flex items-center gap-4 pb-4 border-b border-white/10 flex-shrink-0">
          <img
            src={artwork}
            alt={track.title}
            className="w-14 h-14 rounded-2xl object-cover shadow-lg border border-white/10"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-white truncate">{track.title}</h3>
            <p className="text-neutral-400 text-xs truncate mt-0.5">
              {track.user?.username || track.artist || 'Artista Desconocido'}
            </p>
          </div>
          <button
            onClick={close}
            className="p-2 text-neutral-400 active:text-white bg-white/5 rounded-full active:scale-90 transition-transform"
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="overflow-y-auto flex-1 mt-4 space-y-1.5">
          {showPlaylists ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2">
                <button
                  onClick={() => setShowPlaylists(false)}
                  className="text-xs font-bold text-neutral-400 uppercase tracking-wider hover:text-white"
                >
                  ← Volver a opciones
                </button>
                {onCreatePlaylist && (
                  <button
                    onClick={() => {
                      close();
                      onCreatePlaylist();
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-accent"
                  >
                    <Plus size={14} /> Nueva
                  </button>
                )}
              </div>

              {resonancePlaylists && resonancePlaylists.length > 0 ? (
                resonancePlaylists.map((pl) => {
                  const isAdded = addedPlaylistId === pl.id;
                  return (
                    <button
                      key={pl.id}
                      onClick={() => handleAddToPlaylist(pl.id)}
                      className="w-full flex items-center justify-between p-3.5 bg-white/5 hover:bg-white/10 active:bg-white/15 rounded-2xl transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ListVideo size={18} className="text-accent flex-shrink-0" />
                        <span className="font-semibold text-sm text-white truncate">{pl.title}</span>
                      </div>
                      {isAdded && <Check size={18} className="text-emerald-400" />}
                    </button>
                  );
                })
              ) : (
                <p className="text-center py-6 text-neutral-500 text-sm">No tienes playlists creadas</p>
              )}
            </div>
          ) : (
            <>
              {/* LIKE BUTTON */}
              <button
                onClick={() => {
                  toggleLike(track);
                  close();
                }}
                className="w-full flex items-center gap-3.5 p-3.5 bg-white/5 active:bg-white/10 rounded-2xl transition-colors text-left"
              >
                <Heart
                  size={20}
                  fill={isLiked ? '#34d399' : 'none'}
                  className={isLiked ? 'text-emerald-400' : 'text-neutral-300'}
                />
                <span className="font-semibold text-sm text-white">
                  {isLiked ? 'Quitar de Tus Me Gusta' : 'Añadir a Tus Me Gusta'}
                </span>
              </button>

              {/* PLAY NEXT */}
              <button
                onClick={handlePlayNext}
                className="w-full flex items-center gap-3.5 p-3.5 bg-white/5 active:bg-white/10 rounded-2xl transition-colors text-left"
              >
                <PlaySquare size={20} className="text-neutral-300" />
                <span className="font-semibold text-sm text-white">Reproducir a continuación</span>
              </button>

              {/* ADD TO QUEUE */}
              <button
                onClick={handleAddToQueue}
                className="w-full flex items-center gap-3.5 p-3.5 bg-white/5 active:bg-white/10 rounded-2xl transition-colors text-left"
              >
                <ListPlus size={20} className="text-neutral-300" />
                <span className="font-semibold text-sm text-white">Añadir a la cola</span>
              </button>

              {/* ADD TO PLAYLIST */}
              <button
                onClick={() => setShowPlaylists(true)}
                className="w-full flex items-center gap-3.5 p-3.5 bg-white/5 active:bg-white/10 rounded-2xl transition-colors text-left"
              >
                <ListVideo size={20} className="text-neutral-300" />
                <span className="font-semibold text-sm text-white">Añadir a playlist...</span>
              </button>

              {/* ARTIST PROFILE */}
              {openArtistProfile && (track.user || track.artist) && (
                <button
                  onClick={() => {
                    close();
                    openArtistProfile(track.user || { username: track.artist });
                  }}
                  className="w-full flex items-center gap-3.5 p-3.5 bg-white/5 active:bg-white/10 rounded-2xl transition-colors text-left"
                >
                  <User size={20} className="text-neutral-300" />
                  <span className="font-semibold text-sm text-white">Ver perfil del artista</span>
                </button>
              )}

              {/* RESONANCE CUTS */}
              {onOpenCuts && (
                <button
                  onClick={() => {
                    close();
                    onOpenCuts(track);
                  }}
                  className="w-full flex items-center gap-3.5 p-3.5 bg-white/5 active:bg-white/10 rounded-2xl transition-colors text-left"
                >
                  <Scissors size={20} className="text-neutral-300" />
                  <span className="font-semibold text-sm text-white">Editar Resonance Cuts</span>
                </button>
              )}

              {/* UNLINK HYBRID TRACK */}
              {isHybrid && (
                <button
                  onClick={handleUnlink}
                  className="w-full flex items-center gap-3.5 p-3.5 bg-white/5 active:bg-white/10 rounded-2xl transition-colors text-left"
                >
                  <Link2Off size={20} className="text-amber-400" />
                  <span className="font-semibold text-sm text-amber-400">
                    Separar enlace SoundCloud / YouTube
                  </span>
                </button>
              )}

              {/* EXCLUIR / INCLUIR EN AUTOPLAY */}
              <button
                onClick={() => {
                  usePlayerStore.getState().toggleAutoplayBlacklist(String(track.id));
                  window.dispatchEvent(
                    new CustomEvent('show-toast', {
                      detail: {
                        msg: isAutoplayExcluded
                          ? 'Canción re-incluida en Autoplay'
                          : 'Canción excluida de Autoplay (se oscurece)',
                        type: 'info',
                      },
                    })
                  );
                  close();
                }}
                className="w-full flex items-center gap-3.5 p-3.5 bg-white/5 active:bg-white/10 rounded-2xl transition-colors text-left"
              >
                <Ban size={20} className={isAutoplayExcluded ? 'text-amber-400' : 'text-neutral-400'} />
                <div className="min-w-0">
                  <span className="font-semibold text-sm text-white block leading-tight">
                    {isAutoplayExcluded ? 'Re-incluir en Autoplay' : 'Excluir de Autoplay'}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    {isAutoplayExcluded
                      ? 'La reproducción automática podrá elegirla de nuevo'
                      : 'Permanece visible pero oscurecida; no sonará en automático'}
                  </span>
                </div>
              </button>

              {/* ELIMINAR DE RESONANCE (MANDAR A LÁZARO Y NUNCA VOLVER A MOSTRAR NI REPRODUCIR) */}
              <button
                onClick={() => {
                  if (scProps.hideFromResonance) {
                    scProps.hideFromResonance(track);
                  }
                  if (usePlayerStore.getState().currentTrack?.id === track.id) {
                    if (audioProps.playNext) audioProps.playNext();
                  }
                  window.dispatchEvent(
                    new CustomEvent('show-toast', {
                      detail: {
                        msg: 'Canción eliminada de Resonance y enviada al Motor Lázaro',
                        type: 'success',
                      },
                    })
                  );
                  close();
                }}
                className="w-full flex items-center gap-3.5 p-3.5 bg-red-500/10 active:bg-red-500/20 border border-red-500/20 rounded-2xl transition-colors text-left"
              >
                <Trash2 size={20} className="text-red-400 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="font-bold text-sm text-red-400 block leading-tight">
                    Eliminar de Resonance
                  </span>
                  <span className="text-[10px] text-red-300/70 block mt-0.5">
                    Ocultar totalmente de la app y mandar al Motor Lázaro
                  </span>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

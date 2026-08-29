import React, { useRef, useState } from 'react';
import { Play, Pause, SkipForward, Heart, Loader2 } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { AutoScrollText } from '../../components/AutoScrollText';

interface MobileMiniPlayerProps {
  audioProps: {
    togglePlay: () => void;
    playNext: () => void;
    playPrevious: () => void;
    isAudioLoading?: boolean;
  };
  scProps: {
    toggleLike: (track: any) => void;
    likes: any[];
    scLikes: any[];
    ytLikes: any[];
  };
  onExpand: () => void;
}

export function MobileMiniPlayer({
  audioProps,
  scProps,
  onExpand,
}: MobileMiniPlayerProps) {
  const { currentTrack, isPlaying, progress, duration } = usePlayerStore();
  const { togglePlay, playNext, playPrevious, isAudioLoading } = audioProps;
  const { toggleLike, likes, scLikes, ytLikes } = scProps;

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  if (!currentTrack) return null;
  const trackAny = currentTrack as any;

  const trackIdStr = String(currentTrack.id);
  const trackYtId = currentTrack.yt_videoId;

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

  const isSoundCloud = currentTrack.provider === 'soundcloud' || (!currentTrack.provider && !currentTrack.yt_videoId);
  const isYouTube = currentTrack.provider === 'youtube' || Boolean(currentTrack.yt_videoId);
  const isHybrid = trackAny.providers && trackAny.providers.includes('soundcloud') && trackAny.providers.includes('youtube');

  const artwork = currentTrack.artwork_url
    ? currentTrack.artwork_url.replace('-large', '-t50x50')
    : trackAny.avatar_url
    ? trackAny.avatar_url.replace('-large', '-t50x50')
    : 'https://placehold.co/50x50/18181b/ffffff?text=♪';

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  // Touch gesture handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = e.touches[0].clientX - touchStartX.current;
    if (Math.abs(diffX) > 10) {
      setSwipeOffset(diffX * 0.4);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null && touchStartY.current !== null) {
      const diffX = e.changedTouches[0].clientX - touchStartX.current;
      const diffY = e.changedTouches[0].clientY - touchStartY.current;

      // Swipe Up -> Expand full player
      if (diffY < -40 && Math.abs(diffX) < 50) {
        onExpand();
      }
      // Swipe Right -> Previous track
      else if (diffX > 60) {
        playPrevious();
      }
      // Swipe Left -> Next track
      else if (diffX < -60) {
        playNext();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    setSwipeOffset(0);
  };

  return (
    <div className="px-3 pb-1.5 w-full z-20">
      <div
        onClick={onExpand}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        className="group relative flex items-center bg-neutral-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-[0_10px_30px_rgba(0,0,0,0.6)] active:scale-[0.99] transition-all cursor-pointer overflow-hidden select-none touch-manipulation"
      >
        {/* PROGRESS BAR (SLIM TOP LINE) */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-accent transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* ARTWORK WITH GLOW */}
        <div className="relative w-11 h-11 flex-shrink-0 rounded-xl overflow-hidden shadow-md bg-neutral-950 border border-white/10 mr-3">
          <img
            src={artwork}
            alt={currentTrack.title}
            className={`w-full h-full object-cover transition-transform duration-700 ${
              isPlaying ? 'scale-105' : 'scale-100'
            }`}
          />
          {isPlaying && (
            <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay animate-pulse" />
          )}
        </div>

        {/* TRACK & ARTIST INFO */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            {isHybrid ? (
              <span className="px-1 py-[0.5px] text-[8px] font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex-shrink-0">
                SC•YT
              </span>
            ) : isYouTube ? (
              <span className="px-1 py-[0.5px] text-[8px] font-bold rounded bg-red-500/20 text-red-400 border border-red-500/30 flex-shrink-0">
                YT
              </span>
            ) : isSoundCloud ? (
              <span className="px-1 py-[0.5px] text-[8px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                SC
              </span>
            ) : null}

            <div className="flex-1 min-w-0">
              <AutoScrollText speed={0.4}>
                <span className="text-sm font-bold text-white tracking-tight">
                  {currentTrack.title}
                </span>
              </AutoScrollText>
            </div>
          </div>

          <p className="text-xs text-neutral-400 truncate mt-0.5 font-medium">
            {currentTrack.user?.username || trackAny.artist || 'Artista Desconocido'}
          </p>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* LIKE BUTTON */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(currentTrack);
            }}
            className="p-2 text-neutral-400 active:scale-90 transition-transform touch-manipulation"
            aria-label="Me gusta"
          >
            <Heart
              size={20}
              fill={isLiked ? '#34d399' : 'none'}
              className={`transition-colors duration-200 ${
                isLiked
                  ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            />
          </button>

          {/* PLAY / PAUSE BUTTON */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="p-2.5 text-white active:scale-90 transition-transform touch-manipulation rounded-full bg-white/10 hover:bg-white/20"
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isAudioLoading ? (
              <Loader2 size={20} className="animate-spin text-accent" />
            ) : isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          {/* SKIP FORWARD BUTTON */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playNext();
            }}
            className="p-2 text-neutral-400 active:text-white active:scale-90 transition-transform touch-manipulation"
            aria-label="Siguiente canción"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { MoreVertical, Play, Volume2 } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

interface MobileTrackItemProps {
  track: any;
  index?: number;
  onPlay: (track: any) => void;
  onOpenContext: (track: any) => void;
  showIndex?: boolean;
}

export function MobileTrackItem({
  track,
  index,
  onPlay,
  onOpenContext,
  showIndex = false,
}: MobileTrackItemProps) {
  const { currentTrack, isPlaying, autoplayBlacklist } = usePlayerStore();
  const isActive = currentTrack?.id === track.id;
  const isBlacklisted = Boolean(track?.id && autoplayBlacklist && autoplayBlacklist.includes(String(track.id)));

  const isHybrid =
    Boolean(track.providers && track.providers.includes('soundcloud') && track.providers.includes('youtube')) ||
    Boolean(track.merged_from && track.merged_from.length > 1) ||
    Boolean(track.sc_id && track.yt_videoId) ||
    Boolean(track.provider === 'hybrid');
  const isYouTube = !isHybrid && (track.provider === 'youtube' || Boolean(track.yt_videoId));
  const isSoundCloud = !isHybrid && !isYouTube;

  const formatDuration = (seconds?: number) => {
    if (!seconds || isNaN(seconds)) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const artwork = track.artwork_url
    ? track.artwork_url.replace('-large', '-t50x50')
    : track.avatar_url
    ? track.avatar_url.replace('-large', '-t50x50')
    : 'https://placehold.co/50x50/18181b/ffffff?text=♪';

  return (
    <div
      onClick={() => onPlay(track)}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 active:scale-[0.98] ${
        isBlacklisted ? 'opacity-40 grayscale-[40%] hover:opacity-80' : ''
      } ${
        isActive
          ? 'bg-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-white/10'
          : 'hover:bg-white/5 active:bg-white/10'
      }`}
    >
      {showIndex && index !== undefined && (
        <span className={`w-5 text-center text-xs font-mono font-medium ${isActive ? 'text-accent' : 'text-neutral-500'}`}>
          {isActive && isPlaying ? (
            <Volume2 size={14} className="animate-pulse text-accent inline" />
          ) : (
            index + 1
          )}
        </span>
      )}

      {/* ARTWORK */}
      <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-neutral-900 border border-white/5 shadow-md">
        <img
          src={artwork}
          alt={track.title}
          className={`w-full h-full object-cover transition-opacity duration-300 ${isActive ? 'brightness-110' : ''}`}
          loading="lazy"
        />
        {isActive && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
            {isPlaying ? (
              <span className="flex items-end gap-[2px] h-3">
                <span className="w-1 bg-accent rounded-full animate-[bounce_1s_infinite_100ms] h-full" />
                <span className="w-1 bg-accent rounded-full animate-[bounce_1s_infinite_300ms] h-2/3" />
                <span className="w-1 bg-accent rounded-full animate-[bounce_1s_infinite_200ms] h-4/5" />
              </span>
            ) : (
              <Play size={16} fill="white" className="text-white ml-0.5" />
            )}
          </div>
        )}
      </div>

      {/* TRACK INFO */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-sm font-semibold truncate leading-tight ${
              isActive ? 'text-white font-bold' : isBlacklisted ? 'text-neutral-400' : 'text-neutral-100'
            }`}
          >
            {track.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          {/* PROVIDER BADGES */}
          {isBlacklisted ? (
            <span className="px-1.5 py-[1px] text-[8.5px] font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
              No Autoplay
            </span>
          ) : null}

          {isHybrid ? (
            <span className="px-1.5 py-[1px] text-[9px] font-bold rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-0.5">
              <span>SC</span>
              <span>•</span>
              <span>YT</span>
            </span>
          ) : isYouTube ? (
            <span className="px-1.5 py-[1px] text-[9px] font-bold rounded-md bg-red-500/20 text-red-400 border border-red-500/30">
              YT
            </span>
          ) : isSoundCloud ? (
            <span className="px-1.5 py-[1px] text-[9px] font-bold rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
              SC
            </span>
          ) : null}

          <span className="text-xs text-neutral-400 truncate">
            {track.user?.username || track.artist || 'Artista Desconocido'}
          </span>

          {track.duration && (
            <>
              <span className="text-[10px] text-neutral-600">•</span>
              <span className="text-[10px] text-neutral-500 font-mono">
                {formatDuration(track.duration / 1000 > 10 ? track.duration / 1000 : track.duration)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* CONTEXT MENU BUTTON */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenContext(track);
        }}
        className="p-2 text-neutral-400 active:text-white active:bg-white/10 rounded-full transition-colors flex-shrink-0 touch-manipulation"
        aria-label="Opciones de canción"
      >
        <MoreVertical size={18} />
      </button>
    </div>
  );
}

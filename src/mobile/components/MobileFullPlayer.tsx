import React, { useEffect, useState, useRef } from 'react';
import {
  ChevronDown,
  MoreVertical,
  Heart,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
  Mic2,
  ListMusic,
  Scissors,
  Disc3,
  Loader2,
  Trash2,
  Plus,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { AutoScrollText } from '../../components/AutoScrollText';

interface MobileFullPlayerProps {
  audioProps: {
    togglePlay: () => void;
    playNext: () => void;
    playPrevious: () => void;
    handleSeek: (time: number) => void;
    setIsSeeking: (seeking: boolean) => void;
    isAudioLoading?: boolean;
    playTrack: (track: any) => void;
  };
  scProps: {
    toggleLike: (track: any) => void;
    likes: any[];
    scLikes: any[];
    ytLikes: any[];
    openArtistProfile?: (user: any) => void;
    viewTitle?: string;
  };
  lyricsProps: {
    lyrics: any;
    isLoadingLyrics: boolean;
    activeLyricIndex: number;
    setLyrics: (lyrics: any) => void;
    lyricMode: 'auto' | 'custom';
    setLyricMode: (mode: 'auto' | 'custom') => void;
    customLyricsRaw: string;
    setCustomLyricsRaw: (val: string) => void;
  };
  onClose: () => void;
  onOpenContext: (track: any) => void;
  onOpenCuts: () => void;
}

type PlayerTab = 'player' | 'lyrics' | 'queue' | 'cuts';

export function MobileFullPlayer({
  audioProps,
  scProps,
  lyricsProps,
  onClose,
  onOpenContext,
  onOpenCuts,
}: MobileFullPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    isShuffle,
    loopMode,
    volume,
    setVolume,
    toggleShuffle,
    cycleLoopMode,
    setProgress,
    queue,
    removeFromQueue,
    clearQueue,
    trackCuts,
  } = usePlayerStore();

  const {
    togglePlay,
    playNext,
    playPrevious,
    handleSeek,
    setIsSeeking,
    isAudioLoading,
    playTrack,
  } = audioProps;

  const { toggleLike, likes, scLikes, ytLikes, openArtistProfile, viewTitle } = scProps;
  const { lyrics, isLoadingLyrics, activeLyricIndex } = lyricsProps;

  const [activeTab, setActiveTab] = useState<PlayerTab>('player');
  const [mounted, setMounted] = useState(false);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Swipe / Drag down to dismiss gesture state
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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
    ? currentTrack.artwork_url.replace('-large', '-t500x500')
    : trackAny.avatar_url
    ? trackAny.avatar_url.replace('-large', '-t500x500')
    : 'https://placehold.co/500x500/18181b/ffffff?text=♪';

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const close = () => {
    setMounted(false);
    setTimeout(onClose, 300);
  };

  // Double tap on artwork to Like
  const lastTap = useRef<number>(0);
  const handleArtworkTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap!
      if (!isLiked) toggleLike(currentTrack);
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 800);
    }
    lastTap.current = now;
  };

  // Pull down gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diffY = e.touches[0].clientY - touchStartY.current;
    if (diffY > 0) {
      setDragOffsetY(diffY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current !== null && dragOffsetY > 120) {
      close();
    } else {
      setDragOffsetY(0);
    }
    touchStartY.current = null;
    touchStartX.current = null;
  };

  const trackKey = String(currentTrack.yt_videoId ? 'yt-' + currentTrack.yt_videoId : currentTrack.id);
  const cutsConfig = trackCuts[trackKey];
  const hasActiveCuts = cutsConfig && cutsConfig.active && cutsConfig.intervals?.length > 0;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col bg-neutral-950 text-white select-none transition-all duration-300 ease-out ${
        mounted ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
      style={{
        transform: dragOffsetY > 0 ? `translateY(${dragOffsetY}px)` : undefined,
      }}
    >
      {/* AMBIENT BACKGROUND GLOW */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
        <img
          src={artwork}
          alt=""
          className="w-full h-full object-cover blur-3xl scale-125 transition-all duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-neutral-950/80 to-neutral-950" />
      </div>

      <div
        className="relative z-10 flex flex-col h-full px-5 pt-[max(env(safe-area-inset-top,0px),12px)] pb-[max(env(safe-area-inset-bottom,0px),12px)]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* HEADER BAR */}
        <header className="flex items-center justify-between py-2 flex-shrink-0">
          <button
            type="button"
            onClick={close}
            className="p-2 -ml-2 text-neutral-400 active:text-white active:scale-90 transition-transform"
            aria-label="Cerrar reproductor"
          >
            <ChevronDown size={28} />
          </button>

          <div className="flex flex-col items-center max-w-[200px]">
            <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">
              {viewTitle ? `Desde ${viewTitle}` : 'Sonando Ahora'}
            </span>
            {hasActiveCuts && (
              <span className="text-[9px] font-semibold text-blue-400 flex items-center gap-1 mt-0.5">
                <Scissors size={10} /> Resonance Cuts Activo
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenContext(currentTrack)}
            className="p-2 -mr-2 text-neutral-400 active:text-white active:scale-90 transition-transform"
            aria-label="Opciones"
          >
            <MoreVertical size={22} />
          </button>
        </header>

        {/* MAIN BODY SWITCHER */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden my-2">
          {/* TAB 1: PLAYER HERO VIEW */}
          {activeTab === 'player' && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
              {/* ARTWORK CARD */}
              <div className="flex-1 flex items-center justify-center py-2 relative min-h-0">
                <div
                  onClick={handleArtworkTap}
                  className="relative w-full max-w-[320px] aspect-square rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <img
                    src={artwork}
                    alt={currentTrack.title}
                    className={`w-full h-full object-cover transition-transform duration-700 ${
                      isPlaying ? 'scale-100' : 'scale-95'
                    }`}
                  />

                  {/* DOUBLE TAP HEART POP ANIMATION */}
                  {showHeartPop && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] animate-in zoom-in fade-in duration-200 pointer-events-none">
                      <Heart size={80} className="text-emerald-400 fill-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]" />
                    </div>
                  )}
                </div>
              </div>

              {/* TRACK INFO & LIKE */}
              <div className="flex items-center justify-between gap-4 mt-3 flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isHybrid ? (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        SC • YT
                      </span>
                    ) : isYouTube ? (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-500/20 text-red-400 border border-red-500/30">
                        YouTube
                      </span>
                    ) : isSoundCloud ? (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        SoundCloud
                      </span>
                    ) : null}

                    <div className="flex-1 min-w-0">
                      <AutoScrollText speed={0.4}>
                        <h1 className="text-xl font-bold text-white tracking-tight">
                          {currentTrack.title}
                        </h1>
                      </AutoScrollText>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (openArtistProfile && (currentTrack.user || trackAny.artist)) {
                        close();
                        openArtistProfile(currentTrack.user || { username: trackAny.artist });
                      }
                    }}
                    className="text-sm font-medium text-neutral-400 active:text-white truncate block mt-0.5 hover:underline"
                  >
                    {currentTrack.user?.username || trackAny.artist || 'Artista Desconocido'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => toggleLike(currentTrack)}
                  className="p-3 text-neutral-400 active:scale-75 transition-all bg-white/5 rounded-full flex-shrink-0"
                  aria-label="Me gusta"
                >
                  <Heart
                    size={24}
                    fill={isLiked ? '#34d399' : 'none'}
                    className={`transition-colors duration-200 ${
                      isLiked
                        ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  />
                </button>
              </div>

              {/* PROGRESS BAR & TIMESTAMPS */}
              <div className="mt-4 flex-shrink-0">
                <div className="relative group flex items-center h-6 cursor-pointer touch-manipulation">
                  <div className="absolute w-full h-1.5 bg-white/15 rounded-full pointer-events-none overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-accent rounded-full transition-all duration-150"
                      style={{
                        width: `${duration > 0 ? (progress / duration) * 100 : 0}%`,
                      }}
                    />
                    {/* RENDER ACTIVE CUTS ZONES IN SCRUBBER */}
                    {hasActiveCuts &&
                      cutsConfig.intervals.map((cut: any, idx: number) => {
                        const startPct = (cut.start / (duration || 1)) * 100;
                        const widthPct = ((cut.end - cut.start) / (duration || 1)) * 100;
                        return (
                          <div
                            key={idx}
                            className="absolute top-0 bottom-0 bg-neutral-600/80 border-x border-neutral-400/50"
                            style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                          />
                        );
                      })}
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={progress || 0}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    onTouchStart={() => setIsSeeking(true)}
                    onTouchEnd={(e) => {
                      setIsSeeking(false);
                      handleSeek(Number(e.currentTarget.value));
                    }}
                    onMouseDown={() => setIsSeeking(true)}
                    onMouseUp={(e) => {
                      setIsSeeking(false);
                      handleSeek(Number(e.currentTarget.value));
                    }}
                    className="absolute w-full h-full opacity-0 cursor-pointer z-10 m-0 p-0"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-400 font-mono font-medium -mt-1 px-0.5">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* PRIMARY PLAYBACK CONTROLS */}
              <div className="flex items-center justify-between px-2 mt-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={toggleShuffle}
                  className={`p-3 active:scale-90 transition-transform ${
                    isShuffle ? 'text-accent drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'text-neutral-500'
                  }`}
                  aria-label="Aleatorio"
                >
                  <Shuffle size={22} />
                </button>

                <button
                  type="button"
                  onClick={playPrevious}
                  className="p-3 text-white active:scale-90 transition-transform"
                  aria-label="Canción anterior"
                >
                  <SkipBack size={32} fill="currentColor" />
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-18 h-18 rounded-full bg-white text-black flex items-center justify-center shadow-[0_10px_30px_rgba(255,255,255,0.3)] active:scale-90 transition-transform"
                  aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isAudioLoading ? (
                    <Loader2 size={32} className="animate-spin text-black" />
                  ) : isPlaying ? (
                    <Pause size={32} fill="currentColor" />
                  ) : (
                    <Play size={32} fill="currentColor" className="ml-1" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={playNext}
                  className="p-3 text-white active:scale-90 transition-transform"
                  aria-label="Siguiente canción"
                >
                  <SkipForward size={32} fill="currentColor" />
                </button>

                <button
                  type="button"
                  onClick={cycleLoopMode}
                  className={`p-3 active:scale-90 transition-transform relative ${
                    loopMode > 0 ? 'text-accent drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'text-neutral-500'
                  }`}
                  aria-label="Repetición"
                >
                  {loopMode === 2 ? <Repeat1 size={22} /> : <Repeat size={22} />}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE LYRICS VIEW */}
          {activeTab === 'lyrics' && (
            <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200 relative">
              <div className="flex-1 overflow-y-auto scroll-smooth py-12 px-2 text-center space-y-7">
                {isLoadingLyrics ? (
                  <div className="flex flex-col items-center justify-center h-full text-neutral-400 animate-pulse">
                    <Mic2 size={36} className="mb-3 opacity-50 text-accent" />
                    <p className="text-sm font-semibold">Sincronizando letras...</p>
                  </div>
                ) : Array.isArray(lyrics) && lyrics.length > 0 ? (
                  lyrics.map((line: any, idx: number) => {
                    const isActive = idx === activeLyricIndex;
                    const isPast = idx < activeLyricIndex;

                    return (
                      <p
                        key={idx}
                        onClick={() => handleSeek(line.time)}
                        className={`text-xl font-bold cursor-pointer transition-all duration-300 select-none ${
                          isActive
                            ? 'text-white scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] font-black'
                            : isPast
                            ? 'text-neutral-500'
                            : 'text-neutral-600'
                        }`}
                      >
                        {line.text || '♪'}
                      </p>
                    );
                  })
                ) : lyrics ? (
                  <p className="text-base text-neutral-300 leading-relaxed whitespace-pre-wrap">
                    {lyrics}
                  </p>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                    <Mic2 size={36} className="mb-3 opacity-30" />
                    <p className="text-sm font-semibold">Letras no disponibles para esta pista</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: QUEUE VIEW */}
          {activeTab === 'queue' && (
            <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  {queue.length} {queue.length === 1 ? 'pista en cola' : 'pistas en cola'}
                </span>
                {queue.length > 0 && (
                  <button
                    onClick={clearQueue}
                    className="text-xs text-red-400 font-semibold flex items-center gap-1 active:scale-95"
                  >
                    <Trash2 size={13} /> Vaciar cola
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
                {/* CURRENT TRACK */}
                <div className="p-3 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-3">
                  <span className="text-xs font-bold text-accent">Ahora:</span>
                  <img
                    src={artwork}
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{currentTrack.title}</p>
                    <p className="text-xs text-neutral-400 truncate">
                      {currentTrack.user?.username || trackAny.artist}
                    </p>
                  </div>
                </div>

                {/* QUEUED TRACKS */}
                {queue.map((t: any, index: number) => {
                  const tArtwork = t.artwork_url
                    ? t.artwork_url.replace('-large', '-t50x50')
                    : 'https://placehold.co/50x50/18181b/ffffff?text=♪';

                  return (
                    <div
                      key={`${t.id}-${index}`}
                      onClick={() => playTrack(t)}
                      className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/15 flex items-center gap-3 transition-colors cursor-pointer"
                    >
                      <span className="text-xs text-neutral-500 font-mono w-4 text-center">
                        {index + 1}
                      </span>
                      <img
                        src={tArtwork}
                        alt=""
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{t.title}</p>
                        <p className="text-xs text-neutral-400 truncate">
                          {t.user?.username || t.artist}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(index);
                        }}
                        className="p-2 text-neutral-500 hover:text-red-400 active:scale-90"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}

                {queue.length === 0 && (
                  <div className="py-16 text-center text-neutral-500 text-sm">
                    No hay canciones en la cola. Añade desde el menú de opciones (•••).
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: RESONANCE CUTS QUICK VIEW */}
          {activeTab === 'cuts' && (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-4 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                <Scissors size={28} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Editor de Resonance Cuts</h3>
              <p className="text-xs text-neutral-400 max-w-xs mb-6">
                Configura intervalos personalizados para saltar silencios, intros o fragmentos no deseados.
              </p>
              <button
                onClick={() => {
                  onOpenCuts();
                }}
                className="px-6 py-3.5 bg-accent text-white font-bold text-sm rounded-2xl shadow-[0_0_25px_rgba(59,130,246,0.5)] active:scale-95 transition-all"
              >
                Abrir Editor Completo de Cortes
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM MODE SELECTOR PILL */}
        <nav className="w-full flex items-center justify-center gap-1 pt-2 pb-1 flex-shrink-0">
          <div className="flex items-center bg-white/10 backdrop-blur-xl p-1 rounded-2xl border border-white/10 shadow-lg">
            <button
              onClick={() => setActiveTab('player')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'player'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Disc3 size={14} /> Pista
            </button>

            <button
              onClick={() => setActiveTab('lyrics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'lyrics'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Mic2 size={14} /> Letras
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'queue'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ListMusic size={14} /> Cola ({queue.length})
            </button>

            <button
              onClick={() => setActiveTab('cuts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'cuts'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Scissors size={14} /> Cortes
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}

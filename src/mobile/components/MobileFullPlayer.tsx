import { usePlayerStore } from '../../store/usePlayerStore';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, ChevronDown, ListMusic, Heart, Mic2, Scissors } from 'lucide-react';
import { AutoScrollText } from '../../components/AutoScrollText';
import { useEffect, useState } from 'react';

export function MobileFullPlayer(props: any) {
  const { audioProps, scProps, onClose, lyricsProps } = props;
  const { currentTrack, isPlaying, progress, duration, isShuffle, loopMode, toggleShuffle, cycleLoopMode, activePanel, setProgress, queue, removeFromQueue, clearQueue } = usePlayerStore();
  const { togglePlay, playPrevious, handleSeek, setIsSeeking, playNext } = audioProps;
  const { toggleLike, likes, scLikes, ytLikes } = scProps;
  const { lyrics, isLoadingLyrics, activeLyricIndex } = lyricsProps || {};

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  if (!currentTrack) return null;

  const isLiked = likes.some((t: any) => t.id === currentTrack.id) || scLikes.some((t: any) => t.id === currentTrack.id) || ytLikes.some((t: any) => t.id === currentTrack.id);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isQueue = activePanel === 'queue';
  const isLyrics = activePanel === 'lyrics';

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-3xl transition-transform duration-500 ${mounted ? 'translate-y-0' : 'translate-y-full'}`}>
      
      {/* BACKGROUND BLUR */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <img src={currentTrack.artwork_url?.replace('-large', '-t500x500')} className="w-full h-full object-cover blur-3xl scale-125 opacity-70" alt="" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/90 to-black" />
      </div>

      <div className="relative z-10 flex flex-col h-full px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between py-6">
          <button onClick={() => { setMounted(false); setTimeout(onClose, 400); }} className="p-2 -ml-2 text-white/70 active:scale-90">
            <ChevronDown size={28} />
          </button>
          <span className="text-xs font-bold tracking-widest text-white/50 uppercase">
            {isQueue ? 'Cola de Reproducción' : isLyrics ? 'Letras' : 'Reproduciendo Ahora'}
          </span>
          <div className="flex items-center gap-1 -mr-2">
            <button className={`p-2 active:scale-90 transition-colors ${isLyrics ? 'text-[#3b82f6]' : 'text-white/70'}`} onClick={() => usePlayerStore.setState({ activePanel: isLyrics ? 'none' : 'lyrics' } as any)}>
              <Mic2 size={24} />
            </button>
            <button className={`p-2 active:scale-90 transition-colors ${isQueue ? 'text-[#3b82f6]' : 'text-white/70'}`} onClick={() => usePlayerStore.setState({ activePanel: isQueue ? 'none' : 'queue' } as any)}>
              <ListMusic size={24} />
            </button>
          </div>
        </div>

        {isQueue ? (
          /* QUEUE VIEW */
          <div className="flex-1 overflow-y-auto pb-8 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-white/50">{queue.length} pistas en cola</span>
            </div>
            {queue.map((track: any, index: number) => (
              <div key={`${track.id}-${index}`} className="flex items-center bg-white/5 p-3 rounded-2xl">
                <img src={track.artwork_url?.replace('-large', '-t50x50') || 'https://placehold.co/50x50'} className="w-12 h-12 rounded-lg object-cover" alt="" />
                <div className="flex-1 min-w-0 ml-4">
                  <h4 className="font-bold text-white truncate">{track.title}</h4>
                  <p className="text-xs text-white/50 truncate">{track.user?.username}</p>
                </div>
              </div>
            ))}
          </div>
        ) : isLyrics ? (
          /* LYRICS VIEW */
          <div className="flex-1 overflow-y-auto pb-8 scroll-smooth relative">
            {isLoadingLyrics ? (
              <div className="flex flex-col items-center justify-center h-full text-white/50 animate-pulse">
                <Mic2 size={32} className="mb-4 opacity-50" />
                <p>Buscando letras...</p>
              </div>
            ) : Array.isArray(lyrics) ? (
              <div className="pt-32 pb-48 space-y-8 px-2">
                {lyrics.map((line: any, idx: number) => {
                  const isActive = idx === activeLyricIndex;
                  const isPast = idx < activeLyricIndex;
                  return (
                    <p
                      key={idx}
                      onClick={() => handleSeek(line.time)}
                      className={`text-2xl font-bold cursor-pointer transition-all duration-300 origin-left ${
                        isActive ? 'text-white scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 
                        isPast ? 'text-white/40' : 'text-white/20'
                      }`}
                    >
                      {line.text || "♪"}
                    </p>
                  );
                })}
              </div>
            ) : lyrics ? (
              <div className="pt-8 pb-8 px-2">
                <p className="text-lg font-medium text-white/70 leading-relaxed whitespace-pre-wrap">{lyrics}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white/30">
                <Mic2 size={32} className="mb-4 opacity-30" />
                <p>Letras no disponibles</p>
              </div>
            )}
          </div>
        ) : (
          /* NORMAL PLAYER VIEW */
          <>
            {/* ARTWORK */}
            <div className="flex-1 flex items-center justify-center py-4">
              <img 
                src={currentTrack.artwork_url?.replace('-large', '-t500x500') || 'https://placehold.co/500x500/1a1a1a/333333'} 
                className={`w-full aspect-square object-cover rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] transition-transform duration-500 ${isPlaying ? 'scale-100' : 'scale-95'}`}
                alt="artwork"
              />
            </div>

            {/* INFO & CONTROLS */}
            <div className="flex flex-col gap-6 pb-8 mt-4">
              
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <AutoScrollText speed={0.5}>
                    <h2 className="text-2xl font-bold text-white mb-1">{currentTrack.title}</h2>
                  </AutoScrollText>
                  <AutoScrollText speed={0.5}>
                    <p className="text-lg text-white/60">{currentTrack.user?.username}</p>
                  </AutoScrollText>
                </div>
                <button onClick={() => toggleLike(currentTrack)} className="p-3 active:scale-90 transition-transform bg-white/5 rounded-full">
                  <Heart size={24} className={`${isLiked ? 'text-[#10b981] fill-[#10b981]' : 'text-white/50'}`} />
                </button>
              </div>

              {/* PROGRESS */}
              <div className="flex flex-col gap-3">
                <div className="relative group flex items-center h-6 cursor-pointer">
                  <div className="absolute w-full h-2 bg-white/20 rounded-full pointer-events-none">
                    <div className="h-full bg-white rounded-full relative" style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,1)]" />
                    </div>
                  </div>
                  <input
                    type="range" min="0" max={duration || 100} value={progress || 0}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    onMouseUp={(e) => handleSeek(Number(e.currentTarget.value))}
                    onMouseDown={() => setIsSeeking(true)}
                    className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-white/50 font-bold tracking-wider">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* PLAYBACK CONTROLS */}
              <div className="flex items-center justify-between px-2 mt-4">
                <button onClick={toggleShuffle} className={`p-3 active:scale-90 transition-transform ${isShuffle ? 'text-[#3b82f6]' : 'text-white/40'}`}>
                  <Shuffle size={24} />
                </button>
                <button onClick={playPrevious} className="p-3 active:scale-90 transition-transform text-white">
                  <SkipBack size={36} fill="currentColor" />
                </button>
                <button onClick={togglePlay} className="p-6 active:scale-90 transition-transform bg-white text-black rounded-full shadow-[0_10px_40px_rgba(255,255,255,0.4)]">
                  {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}
                </button>
                <button onClick={playNext} className="p-3 active:scale-90 transition-transform text-white">
                  <SkipForward size={36} fill="currentColor" />
                </button>
                <button onClick={cycleLoopMode} className={`p-3 active:scale-90 transition-transform relative ${loopMode > 0 ? 'text-[#3b82f6]' : 'text-white/40'}`}>
                  <Repeat size={24} />
                  {loopMode > 0 && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />}
                </button>
              </div>
              
            </div>
          </>
        )}
      </div>
    </div>
  );
}


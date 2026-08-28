import { type } from '@tauri-apps/plugin-os';
const isMobile = type() === 'ios' || type() === 'android';
import { SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Repeat1, PanelRight, AudioWaveform, ListMusic, Heart, Loader2, Headphones, Mic2, Menu } from "lucide-react";
import { usePlayerStore } from "../store/usePlayerStore";
import { PictureInPicture2, Scissors } from "lucide-react";
import { toggleMiniPlayerWindow } from "../lib/windowUtils";
import { CutEditor } from "./CutEditor";
import { useRef, useEffect, useState } from "react";;

export function PlayerFooter({ audioRef, iframeRef, playNext, playPrevious, togglePlay, handleSeek, setIsSeeking, useWidget, likes, toggleLike, isAudioLoading, openArtistProfile  }: any) {  
  const {
    currentTrack, isPlaying, volume, progress, duration, isShuffle, loopMode,
    setVolume, toggleShuffle, cycleLoopMode, setProgress, activePanel, toggleDetails, toggleQueue, trackCuts, setTrackCuts, setIsMiniPlayer
  } = usePlayerStore();

  const [showCutEditor, setShowCutEditor] = useState(false);

  // FASE 5: FILTRO PSICOLÓGICO DE CARGA (Evita el parpadeo en canciones instantáneas)
  const [showSpinner, setShowSpinner] = useState(false);
  
  useEffect(() => {
    let timer: any;
    if (isAudioLoading) {
      // Si la carga toma menos de 400ms, el temporizador se destruirá antes de mostrar la rueda
      timer = setTimeout(() => setShowSpinner(true), 400);
    } else {
      setShowSpinner(false);
    }
    return () => clearTimeout(timer);
  }, [isAudioLoading]);

  // 🛡️ CÁLCULO DE RETROCESO DESVINCULADO DE LA VISTA:
  // Siempre permitimos pulsar "Anterior" si hay una pista cargada. El motor de audio decidirá el contexto.
  const canGoBack = currentTrack !== null;

  const [audioDevice, setAudioDevice] = useState<string>("Sistema de Audio");

  useEffect(() => {
    const updateDevice = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        
        const L = 0;
        const activeDevice = audioOutputs.find(d => d.deviceId === 'default') || audioOutputs[L];
        if (activeDevice && activeDevice.label) {
          const cleanName = activeDevice.label.replace(/\s*\([^)]*\)/g, '').trim();
          setAudioDevice(cleanName || "Altavoces");
        }
      } catch (e) {
         console.error("Error leyendo dispositivos de hardware", e);
      }
    };
    updateDevice();
    navigator.mediaDevices?.addEventListener('devicechange', updateDevice);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', updateDevice);
  }, []);


  // FORZADOR DE MOVIMIENTO NATIVO EXCLUSIVO
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      if (!useWidget && audioRef.current && audioRef.current.duration > 0 && !audioRef.current.paused) {
        const currentTime = audioRef.current.currentTime;
        if (currentTime > 0.1) {
           setProgress(currentTime);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, useWidget, setProgress]);

  // Memoria para el volumen anterior (por defecto 1)
  const lastVolumeRef = useRef(1);

  const handleMuteToggle = () => {
    if (volume > 0.01) {
      lastVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(lastVolumeRef.current);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <>
      {showCutEditor && currentTrack && (
        <CutEditor 
           onClose={() => setShowCutEditor(false)} 
           handleSeek={handleSeek} 
        />
      )}
      <footer className={`flex-shrink-0 w-full bg-elevated border-t border-white/5 flex items-center z-50 ${isMobile ? 'h-[75px] px-3' : 'h-[90px] px-6'}`}>
      
      <div className={`${isMobile ? 'flex-1' : 'w-1/3'} flex items-center min-w-0 pr-2`}>
        {currentTrack ? (
          <>
            <img src={currentTrack.artwork_url?.replace('-large', '-t50x50') || currentTrack.user?.avatar_url?.replace('-large', '-t50x50') || 'https://placehold.co/50x50/1a1a1a/333333?text=RN'} className="w-14 h-14 object-cover rounded shadow-md mr-4 flex-shrink-0" alt="" />
            <div className="flex flex-col min-w-0">
              <p className="font-bold text-sm text-neutral-100 truncate hover:underline cursor-pointer">{currentTrack.title}</p>
              <p 
                onClick={(e) => {
                  e.stopPropagation();
                  if (openArtistProfile && currentTrack.user) openArtistProfile(currentTrack.user);
                }}
                className="text-xs text-neutral-400 truncate hover:underline cursor-pointer mt-0.5 transition-colors"
              >
                {currentTrack.user?.username}
              </p>
            </div>
              <button 
                onClick={() => toggleLike(currentTrack)} 
                className="ml-4 p-2 rounded-full hover:bg-white/5 transition-colors group"
                title="Añadir a Tus Me Gusta"
              >
                <Heart 
                  size={18} 
                  className={likes?.some((t: any) => t.id === currentTrack.id) ? "text-[#3b82f6] fill-[#3b82f6] drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "text-neutral-500 group-hover:text-white transition-colors"} 
                />
              </button>
            </>
          ) : (
          <div className="flex items-center text-neutral-600 text-sm font-medium">
            <div className="w-14 h-14 bg-white/5 rounded mr-4 flex items-center justify-center"><AudioWaveform size={20} /></div>
            Esperando pista
          </div>
        )}
      </div>
      
      <div className={`${isMobile ? 'flex flex-row items-center gap-2' : 'w-1/3 flex flex-col items-center justify-center'}`}>
        <div className={`flex items-center gap-6 ${isMobile ? 'mb-0' : 'mb-2'}`}>
          {!isMobile && (
            <button
              onClick={toggleShuffle}
              className={`transition-colors flex-shrink-0 ${isShuffle ? 'text-[#3b82f6] drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-neutral-400 hover:text-white active:text-[#3b82f6]'}`}
            >
              <Shuffle size={20} />
            </button>
          )}
<button 
            onClick={canGoBack ? playPrevious : undefined} 
            disabled={!canGoBack}
            className={`transition-colors flex-shrink-0 ${canGoBack ? 'text-neutral-400 hover:text-white active:text-[#3b82f6] cursor-pointer' : 'text-neutral-700 cursor-not-allowed opacity-50'}`}
          >
            <SkipBack size={20} fill="currentColor" />
          </button>          
          
          <button onClick={togglePlay} className="w-10 h-10 flex items-center justify-center bg-white group active:bg-[#3b82f6] active:scale-95 rounded-full hover:scale-105 transition-all shadow-md">
            {showSpinner ? (
              <Loader2 size={20} className="animate-spin text-neutral-800 group-active:text-white transition-colors" />
            ) : isPlaying ? (
              <svg viewBox="0 0 24 24" fill="black" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 group-active:fill-white group-active:stroke-white transition-colors" style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}>
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="black" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 ml-1 group-active:fill-white group-active:stroke-white transition-colors" style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}>
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            )}
          </button>
          <button onClick={playNext} className="text-neutral-400 hover:text-white active:text-[#3b82f6] transition-colors"><SkipForward size={20} fill="currentColor" /></button>
          {!isMobile && (
            <button
              onClick={cycleLoopMode}
              className={`transition-colors relative ${loopMode > 0 ? 'text-[#3b82f6] drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'text-neutral-400 hover:text-white active:text-[#3b82f6]'}`}
            >
              {loopMode === 2 ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3 w-full max-w-md text-[11px] text-neutral-400 font-medium">
          <span className="w-10 text-right">{formatTime(progress)}</span>
          
          <div className="flex-1 relative group flex items-center h-4 cursor-pointer">
            <div className="absolute w-full h-1 bg-neutral-800 rounded-full overflow-hidden pointer-events-none">
              <div
                className="h-full bg-white group-hover:bg-accent transition-all duration-100 ease-linear"
                style={{ width: `${(duration > 0 ? (progress / duration) * 100 : 0)}%` }}
              />
            </div>
            <div
              className="absolute h-3 w-3 bg-white rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20"
              style={{ left: `calc(${(progress / duration) * 100 || 0}% - 6px)` }}
            />
            <input
              type="range" min="0" max={duration || 100} step="0.01" value={progress}
              onMouseDown={() => setIsSeeking(true)}
              onChange={(e) => setProgress(Number(e.target.value))}
              onMouseUp={(e) => handleSeek(Number(e.currentTarget.value))}
              className="absolute w-full h-full opacity-0 cursor-pointer z-10 m-0 p-0"
            />
          </div>
          
          <span className="w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {!isMobile && (
        <div className="w-1/3 flex justify-end items-center gap-4 pr-4 text-neutral-400">
          {/* DOCK EXPANDIBLE (Expansión lateral hacia la Izquierda) */}
          <div className="relative group flex items-center justify-end z-40">
            
            {/* CONTENIDO DESLIZANTE (Hardware + Paneles) */}
            <div className="absolute right-[100%] mr-2 flex items-center gap-1 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] bg-[#181818]/90 backdrop-blur-xl border border-white/10 rounded-full p-1.5 shadow-[0_0_40px_rgba(0,0,0,0.8)] opacity-0 pointer-events-none translate-x-6 group-hover:translate-x-0 group-hover:opacity-100 group-hover:pointer-events-auto">
              {/* INDICADOR DE HARDWARE ESTÁTICO */}
              <div className="relative flex items-center">
                <div
                  className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-black/40 text-[9px] font-bold text-neutral-400 uppercase tracking-widest max-w-[150px] select-none overflow-hidden border border-white/5"
                  title="Dispositivo activo en el sistema"
                  onMouseEnter={(e) => {
                    const container = e.currentTarget.querySelector('.ticker-container') as HTMLElement;
                    if (!container) return;
                    const text = container.firstElementChild as HTMLElement;
                    if (!text) return;
                    const overflow = text.offsetWidth - container.clientWidth;
                    if (overflow > 2) {
                      text.style.transition = `transform ${overflow * 25}ms linear 0.2s`;
                      text.style.transform = `translateX(-${overflow}px)`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    const container = e.currentTarget.querySelector('.ticker-container') as HTMLElement;
                    if (!container) return;
                    const text = container.firstElementChild as HTMLElement;
                    if (!text) return;
                    text.style.transition = `transform 0.3s ease-out`;
                    text.style.transform = `translateX(0px)`;
                  }}
                >
                  <Headphones size={14} className="text-neutral-500 flex-shrink-0" />
                  <div className="ticker-container flex-1 overflow-hidden whitespace-nowrap text-left">
                    <div className="inline-block">{audioDevice}</div>
                  </div>
                </div>
              </div>

              <div className="w-px h-4 bg-white/10 mx-1"></div>

              {/* BOTONES DE PANELES */}
              <button
                onClick={() => usePlayerStore.setState({ activePanel: ((activePanel as string) === 'lyrics' ? 'none' : 'lyrics') } as any)}
                className={`p-1.5 rounded-full transition-all flex-shrink-0 ${(activePanel as string) === 'lyrics' ? 'text-[#3b82f6] bg-[#3b82f6]/20 ring-1 ring-[#3b82f6]/50' : 'text-neutral-400 hover:text-white hover:bg-white/10'}`}
                title="Letras de la canción"
              >
                <Mic2 size={16} />
              </button>

                            <button
                onClick={() => {
                  if (currentTrack) setShowCutEditor(true);
                }}
                className={`p-1.5 rounded-full transition-all flex-shrink-0 ${(trackCuts[String(currentTrack?.yt_videoId ? "yt-" + currentTrack?.yt_videoId : currentTrack?.id)]?.active) ? 'text-[#ff5500] bg-[#ff5500]/20 ring-1 ring-[#ff5500]/50' : 'text-neutral-400 hover:text-white hover:bg-white/10'}`}
                title="Configurar Resonance Cuts"
              >
                <Scissors size={16} />
              </button>

              <button
                onClick={toggleQueue}
                className={`p-1.5 rounded-full transition-all flex-shrink-0 ${activePanel === 'queue' ? 'text-[#3b82f6] bg-[#3b82f6]/20 ring-1 ring-[#3b82f6]/50' : 'text-neutral-400 hover:text-white hover:bg-white/10'}`}
                title="Cola de reproducción"
              >
                <ListMusic size={16} />
              </button>

              <button
                onClick={toggleDetails}
                className={`p-1.5 rounded-full transition-all flex-shrink-0 ${activePanel === 'details' ? 'text-[#3b82f6] bg-[#3b82f6]/20 ring-1 ring-[#3b82f6]/50' : 'text-neutral-400 hover:text-white hover:bg-white/10'}`}
                title="Información de la canción"
              >
                <PanelRight size={16} />
                            </button>

              <button
                onClick={() => {
                  setIsMiniPlayer(true);
                  toggleMiniPlayerWindow(true);
                }}
                className="p-1.5 rounded-full transition-all flex-shrink-0 text-neutral-400 hover:text-white hover:bg-white/10"
                title="Mini-reproductor"
              >
                <PictureInPicture2 size={16} />
              </button>
            </div>

            {/* PUENTE DE HOVER (Para evitar cortes al mover el ratón a la izquierda) */}
            <div className="absolute right-[100%] w-4 h-full bg-transparent z-30"></div>

            {/* BOTÓN MAESTRO (Gatillo Siempre Visible) */}
            <button className={`p-2 rounded-full transition-all flex-shrink-0 relative z-40 ${activePanel !== 'none' ? 'text-[#3b82f6] bg-[#3b82f6]/10 ring-1 ring-[#3b82f6]/50' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`} title="Opciones Avanzadas">
               <Menu size={18} />
            </button>
          </div>

        <div className="w-px h-4 bg-white/10 mx-1"></div>

        <button onClick={handleMuteToggle} className="hover:text-white active:text-[#3b82f6] transition-colors flex-shrink-0">
          {volume <= 0.01 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        
        <div className="w-24 relative flex items-center h-4 group cursor-pointer">
          <div className="absolute w-full h-1 bg-neutral-800 rounded-full overflow-hidden pointer-events-none">
            <div
              className="h-full bg-white group-hover:bg-accent transition-colors"
              style={{ width: `${volume * 100}%` }}
            />
          </div>
          
          <div
            className="absolute h-3 w-3 bg-white rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20"
            style={{ left: `calc(${volume * 100}% - 6px)` }}
          />

          <input
            type="range" min="0" max="1" step="0.01" value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="absolute w-full h-full opacity-0 cursor-pointer z-10 m-0 p-0"
          />
        </div>
      </div>
      )}

      <audio ref={audioRef} className="hidden" />
      
      <iframe
        ref={iframeRef}
        className="hidden"
        allow="autoplay; encrypted-media"
        src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/2126409108&auto_play=false"
      />
    </footer>
    </>
  );
}
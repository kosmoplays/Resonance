import { useEffect } from 'react';
import { usePlayerStore } from "../store/usePlayerStore";
import { emit, listen } from "@tauri-apps/api/event";
import { Play, Pause, SkipBack, SkipForward, X, ArrowUpRight, Shuffle, Repeat, Repeat1 } from "lucide-react";
import { WebviewWindow, getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { type } from '@tauri-apps/plugin-os';

const isMobile = type() === 'ios' || type() === 'android';

export function MiniPlayer({ togglePlay, playNext, playPrevious, toggleShuffle, cycleLoopMode, onCloseOverlay }: any) {
  const { currentTrack, isPlaying, progress, duration, setIsMiniPlayer, isShuffle, loopMode } = usePlayerStore();
  
  const handleExit = async () => {
    // Restaurar/mostrar ventana principal
    try {
      const mainWindow = await WebviewWindow.getByLabel('main');
      if (mainWindow) {
        await mainWindow.show();
        await mainWindow.setFocus();
      }
    } catch(e) {}
    getCurrentWebviewWindow().close();
  };
  
  const handleClose = async () => {
    if (isPlaying) {
      togglePlay(); // Pause audio
    }
    if (isMobile) {
      if (onCloseOverlay) onCloseOverlay();
      return;
    }
    getCurrentWebviewWindow().close();
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;



  useEffect(() => {
    const unlisten = listen('tauri://destroyed', (event: any) => {
      if (event.windowLabel === 'main') {
        getCurrentWebviewWindow().close();
      }
    });
    return () => {
      unlisten.then((f: any) => f());
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-[#0a0a0a] overflow-hidden flex flex-col relative group select-none" draggable={false}>
      {/* Background blur */}
      {currentTrack?.artwork_url && (
        <div 
          className="absolute inset-0 z-0 opacity-30 scale-[1.2] blur-2xl"
          style={{ backgroundImage: `url(${currentTrack.artwork_url.replace('-large', '-t500x500')})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
      )}
      
      {/* Drag handle visual cue */}
      <div className="absolute top-0 left-0 right-0 h-8 z-20 flex justify-center items-start pt-2 cursor-move" data-tauri-drag-region="true" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
         <div className="w-12 h-1.5 bg-white/20 group-hover:bg-white/50 rounded-full transition-colors pointer-events-none" />
      </div>

      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 p-3 z-30 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <button onClick={handleExit} title="Volver a la app principal" className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors pointer-events-auto">
          <ArrowUpRight size={16} />
        </button>
        <button onClick={handleClose} title="Cerrar y pausar" className="p-2 rounded-full bg-black/40 hover:bg-red-500/80 text-white backdrop-blur-md transition-colors pointer-events-auto">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-between p-5 pt-8 z-10 w-full h-full" data-tauri-drag-region="true" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
        <div className="flex-1 flex items-center justify-center min-h-0 w-full mb-3 pointer-events-none">
          <img 
            src={currentTrack?.artwork_url?.replace('-large', '-t500x500') || "https://placehold.co/500x500/1a1a1a/444444?text=Resonance"} 
            alt="Artwork"
            draggable={false}
            className="w-full h-full max-w-[200px] max-h-[200px] object-cover rounded-xl shadow-2xl aspect-square"
          />
        </div>
        
        <div className="w-full flex flex-col items-center flex-shrink-0" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <div className="text-center w-full mb-4">
            <h2 className="text-[16px] font-bold text-white truncate w-full drop-shadow-lg leading-tight">{currentTrack?.title || "Sin pista"}</h2>
            <p className="text-[12px] text-neutral-400 truncate w-full drop-shadow-md">{currentTrack?.user?.username || "Artista desconocido"}</p>
          </div>

          <div className="w-full flex items-center gap-2 mb-4 px-1">
            <span className="text-[9px] text-neutral-400 w-8 text-right font-medium">{formatTime(progress)}</span>
            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-300 ease-linear" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-[9px] text-neutral-400 w-8 font-medium">{formatTime(duration)}</span>
          </div>

          <div className="flex items-center justify-center gap-4 w-full mb-2">
            <button
              onClick={() => toggleShuffle()}
              className={`transition-colors ${isShuffle ? 'text-[#3b82f6] drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-neutral-400 hover:text-white'}`}
            >
              <Shuffle size={16} />
            </button>

            <button onClick={() => playPrevious()} className="text-neutral-400 hover:text-white transition-colors">
              <SkipBack size={20} fill="currentColor" />
            </button>
            
            <button onClick={() => togglePlay()} className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)] mx-1">
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
            </button>

            <button onClick={() => playNext()} className="text-neutral-400 hover:text-white transition-colors">
              <SkipForward size={20} fill="currentColor" />
            </button>

            <button 
              onClick={() => cycleLoopMode()}
              className={`transition-colors ${loopMode > 0 ? 'text-[#3b82f6] drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'text-neutral-400 hover:text-white'}`}
            >
              {loopMode === 2 ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

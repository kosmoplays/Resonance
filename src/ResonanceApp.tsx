import { emit, listen } from '@tauri-apps/api/event';
import { toggleMiniPlayerWindow } from "./lib/windowUtils";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { useThemeStore } from "./store/useThemeStore";
import { useEffect, useState, useMemo } from "react";
import { invoke } from '@tauri-apps/api/core';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { WifiOff, Info, X, Settings, Trash2, ListMusic, Mic2, Maximize2, Minimize2, Pin, PinOff, Edit3, Save, CheckCircle2, AlertCircle, Search, User, Heart, Radio } from "lucide-react";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { OAuthCallback } from "./views/OAuthCallback";
import { useAuthStore } from "./store/useAuthStore";
import { AuthView } from "./views/AuthView";
import { Loader2 } from "lucide-react";

import { usePlayerStore } from "./store/usePlayerStore";
import { useAudioEngine } from "./hooks/useAudioEngine";
// Solo importamos nuestro nuevo director de orquesta unificado
import { useSoundCloud } from "./hooks/useSoundCloud";

import { Sidebar } from "./components/Sidebar";
import { MainContent } from "./components/MainContent";
import { QueuePanel } from './components/QueuePanel';
import { PlayerFooter } from "./components/PlayerFooter";
import { MiniPlayer } from "./components/MiniPlayer";
import { useMobile } from './hooks/useMobile';
import { supabase } from "./lib/supabase";



export function ResonanceApp() {
  const isMobile = useMobile();
  const { session, isInitialized, initialize } = useAuthStore();
  
  useEffect(() => {
    initialize();
  }, [initialize]);

  const { currentTrack, isPlaying, progress, duration, activePanel, toggleDetails, toggleQueue, queue, removeFromQueue, clearQueue, reorderQueue, loadLocalTracks, isMiniPlayer } = usePlayerStore();

  const initTheme = useThemeStore(state => state.initTheme);
  
  useEffect(() => {
    initTheme();
    loadLocalTracks();
  }, []);
  
  // Referencias para el Drag & Drop de la cola

const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showSettings, setShowSettings] = useState(false);
  const [lyrics, setLyrics] = useState<any>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
  const [isPanelPinned, setIsPanelPinned] = useState(false);
  const [lyricMode, setLyricMode] = useState<'auto' | 'custom'>('auto');
  const [customLyricsRaw, setCustomLyricsRaw] = useState("");
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);
  const [autoLyricsBackup, setAutoLyricsBackup] = useState<any>(null);

  // 🛡️ SISTEMA CENTRAL DE ALERTAS VISUALES (Toasts)
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'|'info', id: number} | null>(null);

  useEffect(() => {
    const handleToast = (e: any) => {
      const newToast = { msg: e.detail.msg, type: e.detail.type || 'success', id: Date.now() };
      setToast(newToast);
      setTimeout(() => setToast(current => current?.id === newToast.id ? null : current), 3500);
    };
    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  const { audioRef, iframeRef, playTrack, playNext, playPrevious, togglePlay, handleSeek, setIsSeeking, analyserRef, useWidget, isAudioLoading, hasHistory } = useAudioEngine();

  // AHORA SACAMOS ABSOLUTAMENTE TODO DE useSoundCloud (Búsquedas, Perfiles y Base de Datos)
  const {
    viewTitle, isLoadingTracks, searchQuery, setSearchQuery, isSearching,
    handleSearch, openPlaylist, openView, openArtistProfile, goBack,
    likes, scLikes, ytLikes, playlists, resonancePlaylists, follows, deletedHistory, recoverTrack,
    loadLibrary, loadMoreYtLikes, createPlaylist, updatePlaylist, deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist, toggleFollow, toggleLike, removeLikeExternal
  } = useSoundCloud(isOffline);
  
  useEffect(() => {
    loadLibrary();
  }, []);

  // Manejo de atajos globales
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD/CTRL + F para enfocar buscador
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[placeholder="Buscar en el multiverso..."]')?.focus();
      }
      // ESC para limpiar búsquedas
      if (e.key === 'Escape') {
        if (searchQuery) setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, []);

  // --- MÓDULO AUTO-DESCUBRIMIENTO Y PARSEO DE LETRAS (TIEMPO REAL) ---
  useEffect(() => {
    if (!currentTrack) return;
    setLyricMode('auto');
    setIsEditingLyrics(false);
    const fetchLyrics = async () => {
        setIsLoadingLyrics(true);
        try {
          const trackKey = String(currentTrack.yt_videoId ? "yt-" + currentTrack.yt_videoId : currentTrack.id);

          // 1. EXTRACCIÓN LOCAL (MÁXIMA PRIORIDAD OFFLINE)
          let localDb: Record<string, any> = {};
          try { localDb = JSON.parse(localStorage.getItem("resonance_local_lyrics") || "{}"); } catch(e) {}
          if (localDb[trackKey]) {
            setLyrics(localDb[trackKey].lyrics_data);
            setAutoLyricsBackup(localDb[trackKey].lyrics_data);
            setCustomLyricsRaw(localDb[trackKey].raw_text || "");
            setIsLoadingLyrics(false);
            return;
          }

          // 2. EXTRACCIÓN NUBE (Supabase)
          const currentUserForLyrics = useAuthStore.getState().user;
          let dbLyrics = null;
          let dbErr = null;

          if (currentUserForLyrics) {
            const res = await supabase
              .from("resonance_lyrics")
              .select("*")
              .eq("track_id", trackKey)
              .eq("user_id", currentUserForLyrics.id)
              .maybeSingle();
            dbLyrics = res.data;
            dbErr = res.error;
          }

          if (!dbLyrics) {
            const resFallback = await supabase
              .from("resonance_lyrics")
              .select("*")
              .eq("track_id", trackKey)
              .limit(1)
              .maybeSingle();
            dbLyrics = resFallback.data;
            dbErr = resFallback.error;
          }

          if (dbLyrics && !dbErr) {
            setLyrics(dbLyrics.lyrics_data);
            setAutoLyricsBackup(dbLyrics.lyrics_data);
            setCustomLyricsRaw(dbLyrics.raw_text || "");
            setIsLoadingLyrics(false);
            
            // Re-sincronizar a local para futuro offline
            localDb[trackKey] = { lyrics_data: dbLyrics.lyrics_data, raw_text: dbLyrics.raw_text || "" };
            localStorage.setItem("resonance_local_lyrics", JSON.stringify(localDb));
            return;
          }

          // 3. AUTO-DESCUBRIMIENTO LRCLIB
          const cleanTitle = currentTrack.title.replace(/\[.*?\]|\(.*?\)/g, "").trim();
          const artist = currentTrack.user?.username || "";
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000); 
          
          const res = await tauriFetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(cleanTitle)}`, {
            method: "GET",
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Accept": "application/json"
            }
          });
          
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const minI = 1; const secI = 2; const txtI = 3; 
            if (data.syncedLyrics) {
              const parsed: any[] = [];
              const lines = data.syncedLyrics.split("\n");
              lines.forEach((line: string) => {
                const match = line.match(/\[(\d{2,3}):(\d{2}(?:\.\d+)?)\](.*)/);
                if (match) {
                  parsed.push({ time: parseInt(match[minI], 10) * 60 + parseFloat(match[secI]), text: match[txtI].trim() });
                }
              });
              setLyrics(parsed);
              setAutoLyricsBackup(parsed);
              setCustomLyricsRaw(data.syncedLyrics);
            } else {
              setLyrics(data.plainLyrics || null);
              setAutoLyricsBackup(data.plainLyrics || null);
              setCustomLyricsRaw(data.plainLyrics || "");
            }
          } else {
            setLyrics(null);
            setAutoLyricsBackup(null);
          }
        } catch (err) {
          console.error("Error obteniendo letras:", err);
          setLyrics(null);
          setAutoLyricsBackup(null);
        } finally {
          setIsLoadingLyrics(false);
        }
      };

      fetchLyrics();
  }, [currentTrack?.id]);

  // Función para procesar y guardar los cambios del usuario en local y nube
  const applyCustomLyrics = async () => {
    if (lyricMode === 'auto') {
      setLyrics(autoLyricsBackup);
      setIsEditingLyrics(false);
      return;
    }
    if (!customLyricsRaw.trim()) {
      setLyrics(null);
      setIsEditingLyrics(false);
      return;
    }
    const parsed: any[] = [];
    const lines = customLyricsRaw.split('\n');
    const minI = 1; const secI = 2; const txtI = 3;
    lines.forEach((line: string) => {
      const match = line.match(/\[(\d{2,3}):(\d{2}(?:\.\d+)?)\](.*)/);
      if (match) {
        parsed.push({ time: parseInt(match[minI], 10) * 60 + parseFloat(match[secI]), text: match[txtI].trim() });
      }
    });
    
    // Si metió formato LRC con tiempos, enviamos el Array cinemático. Si solo metió texto, va como plano.
    const finalLyrics = parsed.length > 0 ? parsed : customLyricsRaw.trim();
    setLyrics(finalLyrics);
    setIsEditingLyrics(false);

    // 🛡️ GUARDADO LOCAL INMEDIATO
    if (currentTrack) {
      try {
        const trackKey = String(currentTrack.yt_videoId ? "yt-" + currentTrack.yt_videoId : currentTrack.id);
        let localDb: Record<string, any> = {};
        try { localDb = JSON.parse(localStorage.getItem("resonance_local_lyrics") || "{}"); } catch(e) {}
        localDb[trackKey] = { lyrics_data: finalLyrics, raw_text: customLyricsRaw.trim() };
        localStorage.setItem("resonance_local_lyrics", JSON.stringify(localDb));
        window.dispatchEvent(new CustomEvent("show-toast", { detail: { msg: "Letras ancladas localmente", type: "success" } }));
      } catch(e) {
        console.error("Fallo al guardar letras local:", e);
      }
    }

    // 🛡️ GUARDADO PERSISTENTE EN NUBE (Resonance Lyrics DB)
    try {
      const currentUser = useAuthStore.getState().user;
      if (currentUser && currentTrack) {
        await supabase.from('resonance_lyrics').upsert({
          track_id: String(currentTrack.id),
          user_id: currentUser.id,
          lyrics_data: finalLyrics,
          raw_text: customLyricsRaw.trim()
        }, { onConflict: 'track_id, user_id' });
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Letras blindadas en la base de datos', type: 'success' } }));
      }
    } catch (err) {
      console.error("Error guardando letras:", err);
    }
  };

  useEffect(() => {
    if (currentTrack) {
      const now = Math.floor(Date.now() / 1000);
      const startTimestamp = now - Math.floor(progress);
      const endTimestamp = startTimestamp + Math.floor(duration);
      const highResArtwork = currentTrack.artwork_url?.replace('-large', '-t500x500')
         || currentTrack.user?.avatar_url?.replace('-large', '-t500x500')
         || 'https://placehold.co/500x500/1a1a1a/333333?text=RN';
      const scSearchUrl = `https://soundcloud.com/search?q=${encodeURIComponent(currentTrack.title + " " + (currentTrack.user?.username || ""))}`;
      invoke('set_discord_status', {
        title: currentTrack.title,
        artist: currentTrack.user?.username || "Desconocido",
        isPlaying, imageUrl: highResArtwork, trackUrl: scSearchUrl, startTime: startTimestamp, endTime: endTimestamp
      }).catch((err) => console.warn("Discord IPC falló:", err));
    }
  }, [currentTrack?.id, isPlaying]);

  // --- MOTOR DE FÍSICAS DE SCROLL PARA LETRAS VIVAS ---
  const activeLyricIndex = useMemo(() => {
    if (!Array.isArray(lyrics)) return -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (progress >= lyrics[i].time) return i;
    }
    return -1;
  }, [lyrics, progress]);

  useEffect(() => {
    if (activeLyricIndex !== -1) {
      const el = document.getElementById(`lyric-${activeLyricIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLyricIndex]);

  // --- FASE 5: AUTO-DISMISS Y SISTEMA DE ANCLAJE (Pulsar fuera para cerrar menús) ---
  useEffect(() => {
    const handleAutoDismiss = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // 1. Cerrar Modal de Configuración si se hace clic en el fondo oscuro (overlay)
      if (showSettings && target.id === 'settings-overlay') {
        setShowSettings(false);
        return;
      }

      // 2. Cerrar Paneles Laterales si el clic ocurre en el contenido central (<main>) y NO está anclado
      if (target.closest('main') && !isPanelPinned) {
        // Leemos Zustand directamente en tiempo real para eludir cierres estáticos
        const state = usePlayerStore.getState() as any;
        if (state.activePanel === 'queue' && typeof state.toggleQueue === 'function') {
          state.toggleQueue();
        } else if (state.activePanel === 'details' && typeof state.toggleDetails === 'function') {
          state.toggleDetails();
        } else if (state.activePanel === 'lyrics') {
          usePlayerStore.setState({ activePanel: 'none' } as any);
        }
      }
    };

    document.addEventListener('mousedown', handleAutoDismiss);
    return () => document.removeEventListener('mousedown', handleAutoDismiss);
  }, [showSettings, isPanelPinned]);




  const isMiniWindow = new URLSearchParams(window.location.search).get('mini') === 'true';

  useEffect(() => {
    if (!isMiniWindow) {
      const handleBeforeUnload = () => {
        toggleMiniPlayerWindow(false);
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isMiniWindow]);


  useEffect(() => {
    if (isMiniWindow) {
      const unlisten = listen('sync-state', (event: any) => {
        usePlayerStore.setState(event.payload);
      });
      return () => { unlisten.then((f: any) => f()); };
    } else {
      const interval = setInterval(() => {
        const state = usePlayerStore.getState();
        emit('sync-state', {
          currentTrack: state.currentTrack,
          isPlaying: state.isPlaying,
          progress: state.progress,
          duration: state.duration,
            isShuffle: state.isShuffle,
            loopMode: state.loopMode,
          });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isMiniWindow]);

  useEffect(() => {
    if (!isMiniWindow) {
      


      const unlisten1 = listen('cmd-toggle-play', () => togglePlay());
      const unlisten2 = listen('cmd-play-next', () => playNext());
      const unlisten3 = listen('cmd-play-prev', () => playPrevious());
      const unlisten6 = listen('cmd-toggle-shuffle', () => usePlayerStore.getState().toggleShuffle());
      const unlisten7 = listen('cmd-cycle-loop', () => usePlayerStore.getState().cycleLoopMode());
      const unlisten4 = listen('mini-player-closed', () => {
         usePlayerStore.getState().setIsMiniPlayer(false);
      });
      const unlisten5 = listen('req-close-mini-player', () => {
         usePlayerStore.getState().setIsMiniPlayer(false);
         toggleMiniPlayerWindow(false);
      });
      
      return () => {
        unlisten1.then((f: any) => f());
        unlisten2.then((f: any) => f());
        unlisten3.then((f: any) => f());
        unlisten6.then((f: any) => f());
        unlisten7.then((f: any) => f());
        unlisten4.then((f: any) => f());
      };
    }
  }, [isMiniWindow, togglePlay, playNext, playPrevious]);

  const handleTogglePlay = isMiniWindow ? () => emit('cmd-toggle-play') : togglePlay;
  const handlePlayNext = isMiniWindow ? () => emit('cmd-play-next') : playNext;
  const handlePlayPrevious = isMiniWindow ? () => emit('cmd-play-prev') : playPrevious;
  const handleToggleShuffle = isMiniWindow ? () => emit('cmd-toggle-shuffle') : usePlayerStore.getState().toggleShuffle;
  const handleCycleLoopMode = isMiniWindow ? () => emit('cmd-cycle-loop') : usePlayerStore.getState().cycleLoopMode;


  if (isMiniWindow) {
    return (
      <div className="flex flex-col h-screen w-screen bg-[#0a0a0a] overflow-hidden">
        <MiniPlayer 
            togglePlay={handleTogglePlay} 
            playNext={handlePlayNext} 
            playPrevious={handlePlayPrevious} 
            toggleShuffle={handleToggleShuffle} 
            cycleLoopMode={handleCycleLoopMode} 
          />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen w-screen bg-base text-text-main overflow-hidden font-sans selection:bg-accent/30 transition-colors duration-300 relative"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      
      {isOffline && (
        <div className="w-full bg-red-500/90 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center py-1.5 gap-2 z-50">
          <WifiOff size={14} /> Sin conexión a Internet. Funcionalidad limitada.
        </div>
      )}

      {/* 🛡️ RENDERIZADOR DE ALERTAS VISUALES (TOASTS) */}
      {toast && (
        <div className={`fixed bottom-[110px] right-8 z-[1] flex items-center gap-3 px-5 py-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] border animate-in slide-in-from-right-8 fade-in duration-300 ${toast.type === 'error' ? 'bg-black/80 border-red-500/30 text-red-400' : 'bg-black/80 border-[#10b981]/30 text-[#10b981]'} backdrop-blur-md`}>
          {toast.type === 'error' ? <AlertCircle size={20} className="text-red-500" /> : <CheckCircle2 size={20} className="text-[#10b981]" />}
          <span className="text-sm font-bold tracking-wide text-white">{toast.msg}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {(!isMobile || viewTitle === 'Librería') && (
          <Sidebar
            isMobile={isMobile}
            loadLibrary={loadLibrary} handleSearch={handleSearch} searchQuery={searchQuery}
            setSearchQuery={setSearchQuery} isOffline={isOffline} likes={likes} scLikes={scLikes} ytLikes={ytLikes}
            playlists={playlists} openPlaylist={openPlaylist} openView={openView} viewTitle={viewTitle}
            setShowSettings={setShowSettings} resonancePlaylists={resonancePlaylists} createPlaylist={createPlaylist} updatePlaylist={updatePlaylist} deletePlaylist={deletePlaylist}
            follows={follows}
          />
        )}

        {(!isMobile || viewTitle !== 'Librería') && (
          <div className="flex-1 flex flex-col min-w-0">
            {isMobile && viewTitle === 'Búsqueda' && (
              <div className="p-4 bg-elevated border-b border-white/5 flex-shrink-0 z-10">
                <form onSubmit={(e) => { e.preventDefault(); handleSearch(e, true); }} className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="search"
                    placeholder="Buscar en el multiverso..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-[#3b82f6] focus:bg-white/5 transition-all shadow-inner"
                  />
                </form>
              </div>
            )}
            <MainContent
              isLoadingTracks={isLoadingTracks} isSearching={isSearching}
              playTrack={playTrack} viewTitle={viewTitle}
              analyserRef={analyserRef} useWidget={useWidget}
              openArtistProfile={openArtistProfile}
              likes={likes} scLikes={scLikes} ytLikes={ytLikes} toggleLike={toggleLike} removeLikeExternal={removeLikeExternal}
              resonancePlaylists={resonancePlaylists} addTrackToPlaylist={addTrackToPlaylist} removeTrackFromPlaylist={removeTrackFromPlaylist}
              follows={follows} toggleFollow={toggleFollow} goBack={goBack} openPlaylist={openPlaylist}
              loadMoreYtLikes={loadMoreYtLikes} deletedHistory={deletedHistory} recoverTrack={recoverTrack}
            />
          </div>
        )}

        {/* === PANELES LATERALES FLUIDOS === */}
        
        {/* PANEL 1: Detalles de la canción (Información Restaurada) */}
        <aside
          className={`bg-elevated flex flex-col flex-shrink-0 z-20 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
            activePanel === 'details' ? 'w-80 opacity-100 border-l border-white/5 translate-x-0' : 'w-0 opacity-0 border-transparent translate-x-12 pointer-events-none'
          }`}
        >
          <div className="w-80 p-6 flex flex-col h-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center justify-between mb-6 text-white border-b border-white/10 pb-4">
              <h3 className="font-bold tracking-widest uppercase text-xs text-neutral-400 flex items-center gap-2">
                <Info size={16} className="text-accent" /> Detalles
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setIsPanelPinned(!isPanelPinned)} className={`transition-colors p-1.5 rounded-full border shadow-md ${isPanelPinned ? 'text-[#3b82f6] bg-[#3b82f6]/20 border-[#3b82f6]/50' : 'text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border-white/5'}`} title={isPanelPinned ? "Desfijar panel" : "Fijar panel"}>
                  {isPanelPinned ? <PinOff size={16} /> : <Pin size={16} />}
                </button>
                <button onClick={() => { setIsPanelPinned(false); toggleDetails(); }} className="text-neutral-500 hover:text-white transition-colors bg-white/5 p-1.5 rounded-full hover:bg-white/10 border border-white/5 shadow-md">
                  <X size={16} />
                </button>
              </div>
            </div>
            
            {currentTrack ? (
              <div className="animate-in fade-in duration-300">
                <img src={currentTrack.artwork_url?.replace('-large', '-t500x500') || 'https://placehold.co/500x500/1a1a1a/333333?text=RN'} alt="Portada" className="w-full aspect-square object-cover rounded-xl shadow-2xl mb-6 ring-1 ring-white/10" />
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white leading-tight mb-2">{currentTrack.title}</h2>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                      <img src={currentTrack.user?.avatar_url || 'https://placehold.co/50x50/1a1a1a/333333'} alt="Artista" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm font-medium text-neutral-300 hover:text-accent cursor-pointer transition-colors truncate">{currentTrack.user?.username}</p>
                  </div>
                </div>
                {currentTrack.description && (
                  <div className="mt-6">
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Info size={14} /> Biografía / Notas</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-wrap opacity-80 line-clamp-6 hover:line-clamp-none transition-all">{currentTrack.description}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-neutral-600 mt-10">
                <Info size={32} className="mb-3 opacity-20" />
                <p className="text-sm text-center">Reproduce una pista<br/>para ver sus detalles.</p>
              </div>
            )}
          </div>
        </aside>

        {/* PANEL 3: Letras Vivas (Independiente, Adaptativo y Expandible) */}
        <aside
          className={`relative flex flex-col flex-shrink-0 z-20 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
            (activePanel as string) === 'lyrics' 
              ? (isLyricsExpanded ? 'w-[600px] opacity-100 border-l border-white/5 translate-x-0 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]' : 'w-[350px] opacity-100 border-l border-white/5 translate-x-0') 
              : 'w-0 opacity-0 border-transparent translate-x-12 pointer-events-none'
          }`}
        >
          {/* BARRA DE REDIMENSIONAMIENTO TÁCTIL (DRAG HANDLE) */}
          {isLyricsExpanded && (
            <div
              className="absolute top-0 left-0 w-2 h-full cursor-ew-resize z-50 opacity-0 hover:opacity-100 bg-[#3b82f6] transition-opacity duration-300"
              onMouseDown={(e) => {
                e.preventDefault();
                const aside = e.currentTarget.closest('aside');
                if (!aside) return;
                const startX = e.pageX;
                const startWidth = aside.getBoundingClientRect().width;
                aside.style.transition = 'none'; // Anulamos fricción de Tailwind para fluidez a 60FPS

                const onMouseMove = (moveEvent: MouseEvent) => {
                   const deltaX = startX - moveEvent.pageX; // Física invertida (Tirar a la izq aumenta ancho)
                   const newWidth = Math.max(350, Math.min(startWidth + deltaX, window.innerWidth * 0.9));
                   aside.style.width = `${newWidth}px`;
                };
                const onMouseUp = () => {
                   document.removeEventListener('mousemove', onMouseMove);
                   document.removeEventListener('mouseup', onMouseUp);
                   aside.style.transition = ''; // Restauramos motor de animación de Tailwind
                };
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
              }}
            />
          )}

          {/* FONDO ADAPTATIVO DINÁMICO */}
          {currentTrack && (
            <>
              <div 
                className="absolute inset-0 z-0 bg-cover bg-center opacity-40 blur-[60px] saturate-[1.5] transition-all duration-1000"
                style={{ backgroundImage: `url(${currentTrack.artwork_url?.replace('-large', '-t500x500') || currentTrack.user?.avatar_url?.replace('-large', '-t500x500')})` }}
              />
              <div className="absolute inset-0 bg-black/60 z-0" />
            </>
          )}

          {/* w-full asegura que el contenido siga la orden física que el usuario marque al arrastrar */}
          <div className="p-6 flex flex-col h-full overflow-hidden relative z-10 w-full">
            <div className="flex items-center justify-between mb-4 flex-shrink-0 text-white border-b border-white/10 pb-4">
              <h3 className="font-bold tracking-widest uppercase text-xs text-[#3b82f6] flex items-center gap-2 drop-shadow-md">
                <Mic2 size={16} /> Letras Vivas
              </h3>
              <div className="flex items-center gap-2">
                {/* BOTÓN DE EDICIÓN DE LETRAS */}
                <button onClick={() => setIsEditingLyrics(!isEditingLyrics)} className={`transition-colors p-1.5 rounded-full border shadow-md ${isEditingLyrics ? 'text-[#3b82f6] bg-[#3b82f6]/20 border-[#3b82f6]/50' : 'text-neutral-400 hover:text-white bg-black/40 hover:bg-white/10 border-white/5'}`} title={isEditingLyrics ? "Cerrar Editor" : "Editar Letras"}>
                  <Edit3 size={16} />
                </button>
                {/* BOTÓN DE CHINCHETA */}
                <button onClick={() => setIsPanelPinned(!isPanelPinned)} className={`transition-colors p-1.5 rounded-full border shadow-md ${isPanelPinned ? 'text-[#3b82f6] bg-[#3b82f6]/20 border-[#3b82f6]/50' : 'text-neutral-400 hover:text-white bg-black/40 hover:bg-white/10 border-white/5'}`} title={isPanelPinned ? "Desfijar panel" : "Fijar panel"}>
                  {isPanelPinned ? <PinOff size={16} /> : <Pin size={16} />}
                </button>
                {/* BOTÓN DE EXPANSIÓN (Siempre activo, con auto-limpieza de redimensionamiento manual) */}
                <button onClick={(e) => {
                  setIsLyricsExpanded(!isLyricsExpanded);
                  const aside = e.currentTarget.closest('aside');
                  if (aside) aside.style.width = ''; // Purga la medida física inyectada por el usuario al minimizar
                }} className="flex text-neutral-400 hover:text-white transition-colors bg-black/40 p-1.5 rounded-full hover:bg-white/10 border border-white/5 shadow-md" title={isLyricsExpanded ? "Minimizar" : "Maximizar"}>
                  {isLyricsExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button onClick={() => { setIsPanelPinned(false); usePlayerStore.setState({ activePanel: 'none' } as any); }} className="text-neutral-400 hover:text-white transition-colors bg-black/40 p-1.5 rounded-full hover:bg-white/10 border border-white/5 shadow-md">
                  <X size={16} />
                </button>
              </div>
            </div>
            
            {currentTrack ? (
              <div className="animate-in fade-in duration-300 flex flex-col h-full min-h-0 relative">
                <div className="flex-shrink-0 mb-4 flex gap-4 items-center bg-black/40 p-3 rounded-xl border border-white/10 backdrop-blur-md shadow-xl relative group">
                   <img src={currentTrack.artwork_url?.replace('-large', '-t50x50') || currentTrack.user?.avatar_url?.replace('-large', '-t50x50') || 'https://placehold.co/500x500/1a1a1a/333333?text=RN'} alt="Portada" className="w-14 h-14 object-cover rounded-lg shadow-2xl ring-1 ring-white/10" />
                   <div className="min-w-0 flex-1">
                     <h2 className={`font-bold text-white leading-tight truncate transition-all duration-500 ${isLyricsExpanded ? 'sm:text-lg text-sm' : 'text-sm'}`}>{currentTrack.title}</h2>
                     <div className="flex items-center justify-between mt-1">
                       <p className="text-[10px] font-medium text-neutral-300 uppercase tracking-widest truncate">{currentTrack.user?.username}</p>
                       <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm border ${lyricMode === 'auto' ? 'bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30' : 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30'} shadow-sm`}>
                         MODO: {lyricMode}
                       </span>
                     </div>
                   </div>
                </div>

                {isEditingLyrics ? (
                  <div className="flex-1 flex flex-col bg-black/40 p-4 rounded-xl border border-white/10 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300 shadow-inner overflow-hidden">
                     <div className="flex items-center justify-between mb-4 flex-shrink-0">
                       <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2"><Edit3 size={14} className="text-[#3b82f6]" /> Editor</h4>
                       <select 
                         value={lyricMode} 
                         onChange={(e) => setLyricMode(e.target.value as any)}
                         className="bg-black/50 border border-white/10 text-[10px] font-bold tracking-widest uppercase text-white rounded-md px-2 py-1 outline-none focus:border-[#3b82f6] cursor-pointer"
                       >
                         <option value="auto">Automático</option>
                         <option value="custom">Personalizado</option>
                       </select>
                     </div>
                     
                     {lyricMode === 'custom' ? (
                       <textarea 
                         value={customLyricsRaw}
                         onChange={(e) => setCustomLyricsRaw(e.target.value)}
                         placeholder="Pega aquí tu archivo LRC [00:15.22] ... o texto plano"
                         className="flex-1 w-full bg-black/30 border border-white/10 rounded-lg p-3 text-[11px] text-neutral-300 font-mono resize-none focus:border-[#3b82f6] outline-none transition-colors [scrollbar-width:none] shadow-inner"
                       />
                     ) : (
                       <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-lg bg-black/20 p-6 text-center shadow-inner">
                         <p className="text-xs text-neutral-400 leading-relaxed font-medium">El satélite buscará la sincronización LRC automáticamente.<br/><br/>Cambia a Personalizado para inyectar tu propia letra o tiempos.</p>
                       </div>
                     )}

                     <button 
                       onClick={applyCustomLyrics} 
                       className="w-full mt-4 flex-shrink-0 bg-white/10 hover:bg-[#3b82f6] text-white text-[10px] font-bold uppercase tracking-widest py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors active:scale-95 border border-white/5 hover:border-[#3b82f6]/50"
                     >
                       <Save size={14} /> Guardar y Aplicar
                     </button>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] relative rounded-xl" style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)' }}>
                     {isLoadingLyrics ? (
                     <div className="h-full flex flex-col items-center justify-center text-[#3b82f6]">
                       <Loader2 size={32} className="animate-spin mb-4 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                       <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Sincronizando satélites...</p>
                     </div>
                      ) : Array.isArray(lyrics) ? (
                     <div className={`pt-24 pb-48 transition-all duration-500 ${isLyricsExpanded ? 'space-y-10' : 'space-y-6'}`}>
                       {lyrics.map((line: any, idx: number) => {
                         const isActive = idx === activeLyricIndex;
                         const isPast = idx < activeLyricIndex;
                         return (
                           <p
                             key={idx}
                             id={`lyric-${idx}`}
                             onClick={() => handleSeek(line.time)}
                             className={`transition-all duration-500 ease-out origin-left cursor-pointer leading-relaxed w-[85%] ${isLyricsExpanded ? 'text-3xl' : 'text-xl'} ${
                               isActive
                                 ? 'font-black text-white scale-[1.05] drop-shadow-[0_0_25px_rgba(255,255,255,0.6)]'
                                 : isPast
                                 ? 'font-bold text-neutral-400 opacity-40 scale-100'
                                 : 'font-bold text-neutral-300 opacity-60 blur-[0.5px] scale-100'
                             } hover:text-white hover:opacity-100 hover:blur-none hover:scale-[1.05]`}
                           >
                             {line.text || "♪"}
                           </p>
                         );
                       })}
                     </div>
                   ) : lyrics ? (
                     <div className="pt-4 pb-4">
                       <p className="text-sm font-medium text-neutral-200 leading-relaxed whitespace-pre-wrap">{lyrics}</p>
                     </div>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                       <Mic2 size={32} className="mb-4 opacity-30 drop-shadow-md" />
                       <p className="text-xs font-bold uppercase tracking-widest opacity-60">Instrumental / No Disponible</p>
                     </div>
                   )}
                 </div>
                )}
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center h-40 text-neutral-400 mt-10">
                 <Mic2 size={32} className="mb-3 opacity-30 drop-shadow-md" />
                 <p className="text-sm text-center font-medium">Reproduce una pista<br/>para sincronizar letras.</p>
               </div>
             )}
           </div>
         </aside>

        {/* PANEL 2: Cola de Reproduccion Dinamica */}
          <QueuePanel isPanelPinned={isPanelPinned} setIsPanelPinned={setIsPanelPinned} />

      </div>
      
      {showSettings && (
        <div id="settings-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/20">
              <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
                <Settings size={20} className="text-accent" /> Configuración
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-text-muted hover:text-text-main transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-8 bg-surface">
              <ThemeSwitcher />
              
              <div className="w-full">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Información</h3>
                  <p className="text-sm text-text-muted">Resonance v1.0 - Un proyecto de refactorización.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <PlayerFooter
        audioRef={audioRef} iframeRef={iframeRef} playNext={playNext}
        playPrevious={playPrevious} togglePlay={togglePlay} handleSeek={handleSeek}
        setIsSeeking={setIsSeeking} isAudioLoading={isAudioLoading} hasHistory={hasHistory}
        likes={likes} scLikes={scLikes} ytLikes={ytLikes} toggleLike={toggleLike} openArtistProfile={openArtistProfile}
      />

      {/* BOTTOM NAV BAR (SOLO MÓVIL) */}
      {isMobile && (
        <div className="h-[60px] bg-elevated border-t border-white/5 flex items-center justify-around px-2 flex-shrink-0 z-50">
          <button onClick={() => openView('Inicio', [])} className={`flex flex-col items-center gap-1 p-2 ${viewTitle === 'Inicio' ? 'text-white' : 'text-neutral-500'}`}>
            <Radio size={22} />
            <span className="text-[10px] font-medium">Inicio</span>
          </button>

          <button onClick={() => openView('Librería', [])} className={`flex flex-col items-center gap-1 p-2 ${viewTitle === 'Librería' ? 'text-white' : 'text-neutral-500'}`}>
            <ListMusic size={22} />
            <span className="text-[10px] font-medium">Librería</span>
          </button>
          
          <button onClick={() => openView('Búsqueda', [])} className={`flex flex-col items-center gap-1 p-2 ${viewTitle === 'Búsqueda' ? 'text-white' : 'text-neutral-500'}`}>
            <Search size={22} />
            <span className="text-[10px] font-medium">Buscar</span>
          </button>

          <button onClick={() => openView("Mi Perfil", [])} className={`flex flex-col items-center gap-1 p-2 ${viewTitle === 'Mi Perfil' ? 'text-white' : 'text-neutral-500'}`}>
            <User size={22} />
            <span className="text-[10px] font-medium">Perfil</span>
          </button>

          <button onClick={() => setShowSettings(true)} className="flex flex-col items-center gap-1 p-2 text-neutral-500 hover:text-white">
            <Settings size={22} />
            <span className="text-[10px] font-medium">Ajustes</span>
          </button>
        </div>
      )}

    </div>
  );
}
















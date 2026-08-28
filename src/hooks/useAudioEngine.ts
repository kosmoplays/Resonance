import { type } from '@tauri-apps/plugin-os';
const isMobile = type() === 'ios' || type() === 'android';
import { useEffect, useRef, useState, useCallback } from "react";
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { usePlayerStore, Track } from '../store/usePlayerStore';

const CLIENT_ID = "lmRjTI0FqeXygHMXc3hRzS7hth20PNk5";
const getScToken = () => localStorage.getItem("soundcloud_oauth_token") || "";

export function useAudioEngine() {
const audioRef = useRef<HTMLAudioElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const widgetRef = useRef<any>(null);
  
  // --- VARIABLES YOUTUBE ---
  const ytWidgetRef = useRef<any>(null);
  const ytReadyRef = useRef<boolean>(false);
  const activeWidgetRef = useRef<'none' | 'soundcloud' | 'youtube'>('none');

  const [trackUrl, setTrackUrl] = useState<string>("");
  const [useWidget, setUseWidget] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);

  const isSeekingRef = useRef(false);
  const latestTrackIdRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // NÚCLEO DE MEMORIA: Historial de reproducción real para el modo Aleatorio
  const playbackHistoryRef = useRef<Track[]>([]);
  const isGoingBackRef = useRef(false);

  // 🛡️ AISLAMIENTO DE CONTEXTO: Memoria inmutable de la lista activa
  const contextTracksRef = useRef<Track[]>([]);
  const isSystemNavigationRef = useRef(false);

 // Leemos y escribimos en nuestro "Cerebro" (Zustand)
  const {
    currentTrack, viewTracks, volume, isShuffle, loopMode, progress, queue, autoplayBlacklist, trackCuts, isPlaying,
    setCurrentTrack, setIsPlaying, setProgress, setDuration,
  } = usePlayerStore();

   // Ref state para evitar bucles de dependencias al cambiar de canción
  const stateRefs = useRef({ currentTrack, viewTracks, isShuffle, loopMode, progress, queue, autoplayBlacklist, trackCuts }); 
  useEffect(() => {
    stateRefs.current = { currentTrack, viewTracks, isShuffle, loopMode, progress, queue, autoplayBlacklist, trackCuts }; 
  }, [currentTrack, viewTracks, isShuffle, loopMode, progress, queue, autoplayBlacklist, trackCuts]); 

// --- SINCRONIZACIÓN DE VOLUMEN (GAIN STAGING AAA) ---
  useEffect(() => {
    if (useWidget) {
      if (activeWidgetRef.current === 'soundcloud' && widgetRef.current && iframeRef.current?.contentWindow) {
        try { widgetRef.current.setVolume(volume * 65); } catch (e) {}
      } else if (activeWidgetRef.current === 'youtube' && ytWidgetRef.current && ytReadyRef.current) {
        try { ytWidgetRef.current.setVolume(volume * 65); } catch (e) {}
      }
    }
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume, useWidget]);

// --- FUNCIONES DE CONTROL ---
  const playTrack = async (track: Track) => {
    console.log(`\n\n--- INICIANDO REPRODUCCIÓN: ${track.title} ---`);
    if (stateRefs.current.currentTrack?.id === track.id) { togglePlay(); return; }

    // 🛡️ ANCLAJE DE CONTEXTO: Si el usuario hizo clic manual (no es salto automático), congelamos la playlist actual.
    if (!isSystemNavigationRef.current) {
      contextTracksRef.current = [...stateRefs.current.viewTracks];
    }
    isSystemNavigationRef.current = false; // Reset del gatillo de sistema

    // REGISTRO HISTÓRICO: Guardamos la pista actual antes del salto (salvo si retrocedemos)
    if (!isGoingBackRef.current && stateRefs.current.currentTrack) {
      playbackHistoryRef.current.push(stateRefs.current.currentTrack);
      setHasHistory(true);
    }
    isGoingBackRef.current = false; // Reseteamos el semáforo

    // --- 🛡️ ESCUDO ANTI-SPAM MULTIHILO (CANCELLATION TOKEN) 🛡️ ---
    // 1. Sellamos esta ejecución como la ÚNICA válida.
    latestTrackIdRef.current = track.id;
    // 2. Mutamos la memoria síncrona INMEDIATAMENTE para que clics rápidos no dupliquen el historial
    stateRefs.current.currentTrack = track;
    // 3. Actualizamos la Interfaz visual al instante (0ms de ping percibido)
    setCurrentTrack(track);
    setIsPlaying(false);
    setIsAudioLoading(true);
    setProgress(0);
    setDuration(0);

    // 1. ANOMALÍA ACÚSTICA: Efecto Doppler (Sonic Boom Transition)
    if (audioRef.current && !audioRef.current.paused) {
      const audio = audioRef.current;
      const startVol = audio.volume;
      // Interpolación acústica de 250ms (simulando decaída Doppler de un caza)
      for (let i = 1; i <= 10; i++) {
        setTimeout(() => {
          // CORTAFUEGOS INTERNO: Si el usuario saltó de canción mientras hacíamos fade-out, abortamos la caída física
          if (latestTrackIdRef.current !== track.id) return;
          if (audio) {
            audio.playbackRate = Math.max(0.4, 1 - (i * 0.06)); // Caída del pitch
            audio.volume = Math.max(0, startVol - (startVol * (i / 10))); // Caída logarítmica del volumen
          }
        }, i * 25);
      }
      // Suspensión del hilo principal para permitir que la física de audio se procese
      await new Promise(resolve => setTimeout(resolve, 280));
    }

    // --- 🛑 DESTRUCTOR DE PROMESAS ZOMBIES 🛑 ---
    // Si después del delay de 280ms el ID activo es diferente, el usuario spameó el botón de saltar.
    // Abortamos esta ejecución silenciosamente para evitar pistas superpuestas en múltiples reproductores.
    if (latestTrackIdRef.current !== track.id) {
      console.warn(`⏭️ [ANTI-SPAM] Carga de '${track.title}' abortada por salto múltiple concurrente.`);
      return;
    }

    // 2. Extracción y reestabilización del núcleo de audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      // Revertimos las anomalías físicas para la siguiente pista
      audioRef.current.playbackRate = 1.0;
      audioRef.current.volume = usePlayerStore.getState().volume;
    }
    if (useWidget) {
      if (activeWidgetRef.current === 'soundcloud' && widgetRef.current) widgetRef.current.pause();
      if (activeWidgetRef.current === 'youtube' && ytWidgetRef.current && ytReadyRef.current) ytWidgetRef.current.pauseVideo();
    }

    setTrackUrl("");
    setUseWidget(false);
    activeWidgetRef.current = 'none';

    try { 
        // --- BÓVEDA OFFLINE NATIVA (ARCHIVOS LOCALES) ---
        if ((track as any).provider === 'local' && (track as any).local_blob) {
          console.log("📂 Reproduciendo archivo local desde la bóveda...");
          setTrackUrl(URL.createObjectURL((track as any).local_blob));
          return;
        }

        // --- INTERCEPTOR DE YOUTUBE AAA (ARRANQUE SÍNCRONO) ---
        if ((track as any).provider === 'youtube' || track.id.toString().startsWith('yt-')) {
            const ytId = (track as any).yt_videoId || track.id.toString().replace('yt-', '');
            
            // 1. INTENTO DE EXTRACCIÓN PURA ULTRA-RÁPIDA (Piped API + Timeout)
            console.log("🔴 [YOUTUBE] Pista detectada. Interceptando flujo de audio puro...");
            const nodes = ["https://pipedapi.kavin.rocks", "https://pipedapi.tokhmi.xyz", "https://pipedapi.smnz.de"];
            
            try {
              // Segurador de latencia: Si Piped tarda más de 2.5s, forzamos el aborto.
              const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout de extracción")), 2500));
              
              const fetchPromise = (Promise as any).any(
                nodes.map(async (node: string) => {
                  const res = await tauriFetch(`${node}/streams/${ytId}`);
                  if (!res.ok) throw new Error("Fallo nodo");
                  return await res.json();
                })
              );

              // Carrera mortal: Gana el primer nodo en responder o el temporizador
              const data = await Promise.race([fetchPromise, timeoutPromise]).catch(() => null);

              if (data && data.audioStreams) {
                const L = 0; // Bypass del linter
                const audioFormats = data.audioStreams;
                // Buscamos el stream de audio con el bitrate más alto, o el primero por defecto
                const bestAudio = audioFormats.find((f: any) => f.bitrate > 0) || audioFormats[L];

                if (bestAudio && bestAudio.url && latestTrackIdRef.current === track.id) {
                  console.log("✅ [YOUTUBE] Audio puro extraído. Inyectando en la Cajita Mágica...");
                  setTrackUrl(bestAudio.url);
                  return; // Terminamos aquí. El MOTOR A (Nativo) toma el control absoluto.
                }
              }
            } catch (e) { console.error("Error extrayendo audio de YT", e); }

            // 2. FALLBACK DE EMERGENCIA (Caballo de Troya original si fallan los nodos o hay latencia)
            console.log("⚠️ [YOUTUBE] Extracción pura falló o fue lenta. Cayendo al Caballo de Troya (Iframe)...");
            if (isMobile) { console.warn('Bloqueado en movil'); window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Video bloqueado en movil', type: 'error' } })); return; }
              setUseWidget(true);
            activeWidgetRef.current = 'youtube';

            if (ytWidgetRef.current && ytReadyRef.current) {
              // Carga y arranca el vídeo instantáneamente (Object notation fuerza el Autoplay)
              ytWidgetRef.current.loadVideoById({ videoId: ytId });
              setTimeout(() => { try { ytWidgetRef.current.setVolume(usePlayerStore.getState().volume * 65); } catch(e){} }, 100);
            } else {
              // Fallback rápido
              const playYT = () => {
                if (latestTrackIdRef.current !== track.id) return;
                if (ytWidgetRef.current && ytReadyRef.current) {
                  ytWidgetRef.current.loadVideoById({ videoId: ytId });
                  setTimeout(() => { try { ytWidgetRef.current.setVolume(usePlayerStore.getState().volume * 65); } catch(e){} }, 100);
                } else {
                  setTimeout(playYT, 200);
                }
              };
              playYT();
            }
            return;
          }

      // --- MOTOR SOUNDCLOUD NATIVO ---
        const progressive = track.media?.transcodings?.find((t: any) => t.format.protocol === "progressive");

        if (progressive) {
          console.log("🔄 Probando enlace Nativo (MP3 Directo)...");
          let streamUrl = `${progressive.url}?client_id=${CLIENT_ID}`;
          if (track.track_authorization) streamUrl += `&track_authorization=${track.track_authorization}`;

          try {
            const res = await tauriFetch(streamUrl, { headers: { Authorization: `OAuth ${getScToken()}` } });
            if (res.ok) {
              const data = await res.json();
              if (latestTrackIdRef.current === track.id) {
                console.log("✅ Enlace nativo funcional. Reproduciendo sin DRM.");
                setTrackUrl(data.url);
                return;
              }
            }
          } catch (err) { console.warn("⚠ Conexión nativa rechazada."); }
        }

        if (latestTrackIdRef.current === track.id) {
          console.log("🛡 Pista bloqueada por DRM. Inyectando en Caballo de Troya (Widget SC)...");
          if (isMobile) { console.warn('Bloqueado en movil'); window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Pista bloqueada (DRM) en movil', type: 'error' } })); return; }
            setUseWidget(true);
          activeWidgetRef.current = 'soundcloud';
        }
     } catch (error) {
        console.error("❌ Error fatal en playTrack:", error);
        setIsAudioLoading(false);
        if (latestTrackIdRef.current === track.id) playNext();
      }
  };

const playNext = useCallback((isAuto?: any) => {
    const isAutomatic = isAuto === true;
    const { currentTrack, viewTracks, isShuffle, loopMode } = stateRefs.current;
    const queue = usePlayerStore.getState().queue;

    // Si estamos en Bucle 1 y la canción terminó sola, repetimos.
    // Si el usuario hizo clic manual en "Siguiente", saltamos la orden.
    if (loopMode === 2 && isAutomatic) {
      if (useWidget) {
        if (activeWidgetRef.current === 'soundcloud' && widgetRef.current) widgetRef.current.seekTo(0);
        if (activeWidgetRef.current === 'youtube' && ytWidgetRef.current && ytReadyRef.current) ytWidgetRef.current.seekTo(0, true);
      }
      else if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); }
      return;
    }

    // --- PRIORIDAD ESTRICTA DE COLA ---
        if (queue && queue.length > 0) {
          const L = 0;
          const nextTrack = queue[L]; // Bypass del parser con variable constante
          usePlayerStore.setState({ queue: queue.slice(1) }); // Consumimos la canción de la cola
          isSystemNavigationRef.current = true; // 🛡️ Evita que la cola borre el contexto
          playTrack(nextTrack);
          return;
        }

        // --- LÓGICA DE REPRODUCCIÓN ESTÁNDAR ---
    if (!viewTracks || viewTracks.length === 0) return;

    const { autoplayBlacklist } = stateRefs.current;
    let nextIndex = 0;
    let attempts = 0;
    let foundValid = false;

    if (isShuffle) {
      while (attempts < viewTracks.length) {
        nextIndex = Math.floor(Math.random() * viewTracks.length);
        if (!autoplayBlacklist.includes(String(viewTracks[nextIndex].id))) { foundValid = true; break; }
        attempts++;
      }
    } else {
      const currentIndex = viewTracks.findIndex(t => t.id === currentTrack?.id);
      nextIndex = currentIndex + 1;

      while (attempts < viewTracks.length) {
        if (nextIndex >= viewTracks.length) {
          if (loopMode === 1) nextIndex = 0;
          else { setIsPlaying(false); return; } // Fin de la lista
        }
        if (!autoplayBlacklist.includes(String(viewTracks[nextIndex].id))) { foundValid = true; break; }
        nextIndex++;
        attempts++;
      }
    }

    // Si encontramos una canción no bloqueada, la reproducimos. Si no, detenemos.
    if (foundValid) playTrack(viewTracks[nextIndex]);
    else setIsPlaying(false);

  }, [useWidget]);

  const playPrevious = useCallback(() => {
    const { currentTrack, viewTracks, loopMode, progress } = stateRefs.current;
    // 🛡️ USAMOS EL CONTEXTO ANCLADO EN VEZ DE LA VISTA ACTUAL
    const activeList = contextTracksRef.current.length > 0 ? contextTracksRef.current : viewTracks;

    if (!currentTrack || activeList.length === 0) return;

    if (progress > 3) {
      if (useWidget) {
        if (activeWidgetRef.current === 'soundcloud' && widgetRef.current) widgetRef.current.seekTo(0);
        if (activeWidgetRef.current === 'youtube' && ytWidgetRef.current && ytReadyRef.current) ytWidgetRef.current.seekTo(0, true);
      }
      else if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }

    // --- LÓGICA DE RETROCESO REAL (HISTORIAL PARA ALEATORIO Y COLA) ---
    if (playbackHistoryRef.current.length > 0) {
      const prevTrack = playbackHistoryRef.current.pop();
      setHasHistory(playbackHistoryRef.current.length > 0);
      if (prevTrack) {
        isGoingBackRef.current = true;
        isSystemNavigationRef.current = true; // 🛡️ Avisamos que es un salto interno
        playTrack(prevTrack);
        return;
      }
    }

    // --- FALLBACK ESTÁNDAR (Lista secuencial) ---
    const currentIndex = activeList.findIndex(t => t.id === currentTrack?.id);
    let prevIndex = currentIndex - 1;

    if (prevIndex < 0) {
      if (loopMode === 1 && activeList.length > 0) {
        prevIndex = activeList.length - 1; // Si hay bucle de lista, vamos a la última
      } else {
        // 🛡️ Si es la primera canción y no hay bucle, rebobinamos a 0:00 en lugar de pausar
        if (useWidget) {
          if (activeWidgetRef.current === 'soundcloud' && widgetRef.current) widgetRef.current.seekTo(0);
          if (activeWidgetRef.current === 'youtube' && ytWidgetRef.current && ytReadyRef.current) ytWidgetRef.current.seekTo(0, true);
        } else if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
        return;
      }
    }
    
    isSystemNavigationRef.current = true; // 🛡️ Avisamos que es un salto interno
    playTrack(activeList[prevIndex]);
  }, [useWidget]);

  const togglePlay = useCallback(() => {
    if (!stateRefs.current.currentTrack) return;
    if (useWidget) {
      if (activeWidgetRef.current === 'soundcloud' && widgetRef.current) widgetRef.current.toggle();
      if (activeWidgetRef.current === 'youtube' && ytWidgetRef.current && ytReadyRef.current) {
        const state = ytWidgetRef.current.getPlayerState();
        if (state === 1) ytWidgetRef.current.pauseVideo();
        else ytWidgetRef.current.playVideo();
      }
    } else if (audioRef.current) {
      if (audioRef.current.paused) { audioRef.current.play(); setIsPlaying(true); }
      else { audioRef.current.pause(); setIsPlaying(false); }
    }
  }, [useWidget]);

  const getNextValidTime = (time: number): number | null => {
    const track = stateRefs.current.currentTrack;
    if (!track) return null;
    const trackId = String(track.yt_videoId ? "yt-" + track.yt_videoId : track.id);
    const cutsData = stateRefs.current.trackCuts[trackId];
    
    if (!cutsData || !cutsData.active) return null;

    for (const skip of cutsData.intervals) {
       // Check if time is strictly inside a skip zone.
       // We use < skip.end to allow seeking exactly to the end of a skip zone.
       if (time >= skip.start && time < skip.end) {
           return skip.end;
       }
    }
    return null;
  };

  const handleSeek = (newTime: number) => {
    // ✂️ SMART SEEK: Evadir zonas grises
    const nextValid = getNextValidTime(newTime);
    let finalTime = nextValid !== null ? nextValid : newTime;

    const currentDuration = usePlayerStore.getState().duration;
    // PREVENCIÓN DE BUCLES Y ATASCOS: Solo adelantamos a playNext si el corte nos lleva literalmente al último milisegundo de la canción
    if (currentDuration > 0 && finalTime >= currentDuration - 0.1) {
      playNext(true);
      return;
    }

    if (useWidget) {
      if (activeWidgetRef.current === 'soundcloud' && widgetRef.current) widgetRef.current.seekTo(finalTime * 1000);
      if (activeWidgetRef.current === 'youtube' && ytWidgetRef.current && ytReadyRef.current) ytWidgetRef.current.seekTo(finalTime, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = finalTime;
    }
    isSeekingRef.current = false;
  };

  const updateTime = (time: number) => {
    if (isSeekingRef.current) return;
    const nextValid = getNextValidTime(time);
    if (nextValid !== null) {
      // ✂️ QUANTUM LEAP: Salto instantáneo a la siguiente zona válida
      handleSeek(nextValid);
    } else {
      setProgress(time);
    }
  };

  const setIsSeeking = (isSeeking: boolean) => {
    isSeekingRef.current = isSeeking;
  };

// --- MOTOR A (Nativo) ---
  useEffect(() => {
    if (!trackUrl || useWidget || !audioRef.current) return;
    const audio = audioRef.current;
    audio.crossOrigin = "anonymous";

    // 1. Inicialización de la física de ondas (Web Audio API) y Estabilizador de Volumen
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256; // Definimos la resolución de la onda
      
      // --- ESTABILIZADOR DE VOLUMEN (Compresor Dinámico AAA) ---
      const compressor = audioContextRef.current.createDynamicsCompressor();
      compressor.threshold.value = -24; // Empieza a comprimir los picos a -24dB
      compressor.knee.value = 30;       // Curva de compresión suave (evita distorsión robótica)
      compressor.ratio.value = 12;      // Ratio agresivo para emparejar canciones ruidosas y silenciosas
      compressor.attack.value = 0.003;  // Reacción casi instantánea a saltos de volumen
      compressor.release.value = 0.25;  // Recuperación natural
            
      sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
      sourceRef.current.connect(analyserRef.current);
      // Enrutamos el audio a través del compresor antes de llevarlo a los altavoces
      analyserRef.current.connect(compressor);
      compressor.connect(audioContextRef.current.destination);
    }

    // Asegurar que el contexto no esté suspendido por políticas del navegador
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

      const handleTimeUpdate = () => {
      // ESCUDO ANTI-FANTASMAS NATIVO: Evita el spam de 0:00 si YT o SC asumen el control
      if (activeWidgetRef.current !== 'none' || useWidget) return;
      updateTime(audio.currentTime);
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => playNext(true);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    audio.src = trackUrl;
    audio.load();
    audio.play().then(() => { setIsPlaying(true); setIsAudioLoading(false); }).catch((err) => { console.error(err); setIsAudioLoading(false); });

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [trackUrl, useWidget, playNext]);

// --- INICIALIZADORES TROYANOS (SC + YT PRE-CALENTAMIENTO) ---
  useEffect(() => {
    // 1. INYECTAR SCRIPT SOUNDCLOUD
    if (!document.getElementById('sc-widget-script')) {
      const script = document.createElement('script');
      script.id = 'sc-widget-script';
      script.src = 'https://w.soundcloud.com/player/api.js';
      document.body.appendChild(script);
    }

    // 2. INICIALIZAR YOUTUBE (Con escudo CORS y soporte para recargas de React)
     const initYT = () => {
       if (ytWidgetRef.current) return;
       
       // BLINDAJE CONTRA HOT-RELOADS: Usar o crear el div de forma segura
       let container = document.getElementById('yt-player-container');
       if (!container) {
         container = document.createElement('div');
         container.id = 'yt-player-container';
         container.style.position = 'fixed';
         container.style.top = '-9999px';
         container.style.left = '-9999px';
         container.style.width = '10px';
         container.style.height = '10px';
         container.style.opacity = '0';
         container.style.pointerEvents = 'none';
         container.style.zIndex = '-9999';
         document.body.appendChild(container);
       }

       ytWidgetRef.current = new (window as any).YT.Player('yt-player-container', {
          height: '10', width: '10',
          playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, playsinline: 1, origin: window.location.origin },
          events: {
            onReady: () => {
              console.log("🚀 Caballo de Troya YT pre-calentado y listo.");
              ytReadyRef.current = true;
            },
            onStateChange: (event: any) => {
                const YT = (window as any).YT;
                if (event.data === YT.PlayerState.PLAYING) {
                  setIsPlaying(true);
                  setIsAudioLoading(false);
                  // ESTABILIZADOR: Aplicamos el Gain Staging (-35%) en el milisegundo exacto de arranque
                  if (ytWidgetRef.current) ytWidgetRef.current.setVolume(usePlayerStore.getState().volume * 65);
                }
                else if (event.data === YT.PlayerState.PAUSED) setIsPlaying(false);
                else if (event.data === YT.PlayerState.ENDED) playNext(true);
              },
            onError: (error: any) => {
                console.warn("🚫 YT Bloqueado por Copyright/Embed. Saltando pista...", error.data);
                playNext(true); // Auto-salto evasivo instantáneo
            }
          }
        });
     };

     if (!(window as any).YT) {
       if (!document.getElementById('yt-widget-script')) {
         const scriptYT = document.createElement('script');
         scriptYT.id = 'yt-widget-script';
         scriptYT.src = 'https://www.youtube.com/iframe_api';
         document.body.appendChild(scriptYT);
       }
       (window as any).onYouTubeIframeAPIReady = initYT;
     } else if ((window as any).YT && (window as any).YT.Player) {
       initYT();
     }

    if (widgetRef.current) return;

const checkWidget = () => {
      const SC = (window as any).SC;
      if (SC && iframeRef.current) {
        const widget = SC.Widget(iframeRef.current);
        widgetRef.current = widget;

        widget.bind(SC.Widget.Events.PLAY, () => {
            setIsPlaying(true);
            setIsAudioLoading(false);
            // ESCUDO ANTI-DRM: Obligamos al widget a acatar la compresión de volumen justo al arrancar
            widget.setVolume(usePlayerStore.getState().volume * 65);
          });
          widget.bind(SC.Widget.Events.PAUSE, () => setIsPlaying(false));
          widget.bind(SC.Widget.Events.FINISH, () => playNext(true));
                
        widget.bind(SC.Widget.Events.PLAY_PROGRESS, (data: any) => {
          // ESCUDO ANTI-FANTASMAS SC: Evita que SC pise el tiempo de YT con 0:00
          if (activeWidgetRef.current === 'soundcloud' && !isSeekingRef.current) {
            updateTime(data.currentPosition / 1000);
            // Respaldo de seguridad leyendo directamente del orquestador Zustand
            if (usePlayerStore.getState().duration === 0) {
                widget.getDuration((d: number) => setDuration(d / 1000));
            }
          }
        });
      } else if (!widgetRef.current) {
        setTimeout(checkWidget, 500);
      }
    };

    checkWidget();
  }, [playNext]);

// --- MOTOR B (Controlador de Troyano Híbrido SC + YT) ---
  useEffect(() => {
    if (!useWidget || !currentTrack) return;

    let interval: any;

    // 1. TROYANO SOUNDCLOUD (Carga exclusiva para SC)
      if (activeWidgetRef.current === 'soundcloud' && widgetRef.current) {
        console.log(`🤖 SC Widget asumiendo el control maestro...`);
        try {
          widgetRef.current.load(`https://api.soundcloud.com/tracks/${currentTrack.id}`, {
            auto_play: true, hide_related: true, show_comments: false, show_user: false, show_reposts: false, visual: false
          });
          // 🛡️ RACE CONDITION ANIQUILADA: El volumen se ajusta de forma asíncrona y segura 
          // mediante el evento SC.Widget.Events.PLAY en el inicializador (checkWidget).
        } catch (error) {
          console.warn("🛡️ Intercepción de error en la API externa del SC Widget:", error);
        }
      }
    // 2. TROYANO YOUTUBE (Solo Telemetría Anti-Saltos)
      if (activeWidgetRef.current === 'youtube') {
        interval = setInterval(() => {
          if (ytWidgetRef.current && ytReadyRef.current && !isSeekingRef.current) {
            try {
              const state = ytWidgetRef.current.getPlayerState();
              // Solo actualizamos la barra si el vídeo está realmente reproduciendo (1)
              // Esto bloquea los ceros enviados durante el buffering (3) o sin iniciar (-1)
              if (state === 1) {
                const currentTime = ytWidgetRef.current.getCurrentTime();
                const dur = ytWidgetRef.current.getDuration();
                if (currentTime > 0.5) updateTime(currentTime);
                if (dur > 0) setDuration(dur);
              }
            } catch (e) {}
          }
        }, 500);
      }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [useWidget, currentTrack]);

  // --- MEDIA SESSION (Controles de Windows/Teclado) ---
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title, artist: currentTrack.user?.username,
        artwork: [{ src: currentTrack.artwork_url?.replace('-large', '-t500x500') || 'https://placehold.co/500x500/1a1a1a/333333?text=RN', sizes: '500x500', type: 'image/jpeg' }]
      });
      navigator.mediaSession.setActionHandler('play', togglePlay);
      navigator.mediaSession.setActionHandler('pause', togglePlay);
      navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
    }
  }, [currentTrack, togglePlay, playPrevious, playNext]);

  // --- 🛡 INTERCEPTOR REMOTO (MINI-PLAYER COMPOSITOR GLOBAL) ---
  // --- 🛡️ INTERCEPTOR REMOTO (MINI-PLAYER COMPOSITOR GLOBAL) ---
  useEffect(() => {
    const handleToggle = () => togglePlay();
    const handleNext = () => playNext();
    const handlePrev = () => playPrevious();

    window.addEventListener('resonance-toggle', handleToggle);
    window.addEventListener('resonance-next', handleNext);
    window.addEventListener('resonance-prev', handlePrev);

    return () => {
      window.removeEventListener('resonance-toggle', handleToggle);
      window.removeEventListener('resonance-next', handleNext);
      window.removeEventListener('resonance-prev', handlePrev);
    };
  }, [togglePlay, playNext, playPrevious]);

  return {
    audioRef, iframeRef, playTrack, playNext, playPrevious, togglePlay, handleSeek, setIsSeeking,
    // Exportamos el analizador y el estado del widget para que la vista los use
    analyserRef, useWidget, isAudioLoading, hasHistory
  };
}

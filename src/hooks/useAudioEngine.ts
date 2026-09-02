import { type } from '@tauri-apps/plugin-os';
const isMobile = type() === 'ios' || type() === 'android';
import { useEffect, useRef, useState, useCallback } from "react";
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { usePlayerStore, Track } from '../store/usePlayerStore';

const CLIENT_ID = "lmRjTI0FqeXygHMXc3hRzS7hth20PNk5";
const getScToken = () => localStorage.getItem("soundcloud_oauth_token") || "";

// Si un servidor no responde en 6 segundos, lo damos por muerto y seguimos con los demás
const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs = 6000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await tauriFetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

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
    currentTrack, viewTracks, volume, isShuffle, loopMode, progress, duration, queue, autoplayBlacklist, trackCuts, isPlaying,
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
  const playTrack = async (track: Track, customContext?: Track[]) => {
    console.log(`\n\n--- INICIANDO REPRODUCCIÓN: ${track.title} ---`);
    if (stateRefs.current.currentTrack?.id === track.id) { togglePlay(); return; }

    // 🛡️ ANCLAJE DE CONTEXTO: Si se proporciona una lista explícita, la fijamos. Si no, tomamos la lista activa.
    if (customContext && customContext.length > 0) {
      contextTracksRef.current = [...customContext];
    } else if (!isSystemNavigationRef.current) {
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
    latestTrackIdRef.current = track.id;
    stateRefs.current.currentTrack = track;
    setCurrentTrack(track);
    usePlayerStore.getState().addToHistory(track);
    setIsPlaying(false);
    setIsAudioLoading(true);
    setProgress(0);
    setDuration(0);

    // 1. ANOMALÍA ACÚSTICA: Efecto Doppler (Sonic Boom Transition)
    if (audioRef.current && !audioRef.current.paused) {
      const audio = audioRef.current;
      const startVol = audio.volume;
      for (let i = 1; i <= 10; i++) {
        setTimeout(() => {
          if (latestTrackIdRef.current !== track.id) return;
          if (audio) {
            audio.playbackRate = Math.max(0.4, 1 - (i * 0.06));
            audio.volume = Math.max(0, startVol - (startVol * (i / 10)));
          }
        }, i * 25);
      }
      await new Promise(resolve => setTimeout(resolve, 280));
    }

    if (latestTrackIdRef.current !== track.id) {
      console.warn(`⏭️ [ANTI-SPAM] Carga de '${track.title}' abortada por salto múltiple concurrente.`);
      return;
    }

    // 2. Extracción y reestabilización del núcleo de audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
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

        // --- INTERCEPTOR DE YOUTUBE AAA (ARRANQUE ULTRA-RÁPIDO) ---
        if ((track as any).provider === 'youtube' || track.id.toString().startsWith('yt-')) {
            const ytId = (track as any).yt_videoId || track.id.toString().replace('yt-', '');
            
            console.log("🔴 [YOUTUBE] Pista detectada. Interceptando flujo de audio...");
            
            // 1. Extracción con InnerTube ANDROID_VR (Directo sin intermediarios caídos) + Nodos de Respaldo
            const invidiousNodes = [
              "https://invidious.nerdvpn.de",
              "https://inv.nadeko.net",
              "https://invidious.jing.rocks",
              "https://yt.artemislena.eu"
            ];
            const pipedNodes = [
              "https://pipedapi.kavin.rocks",
              "https://pipedapi-libre.kavin.rocks",
              "https://pipedapi.adminforge.de",
              "https://api.piped.yt",
              "https://pipedapi.drgns.space",
              "https://pipedapi.owo.si"
            ];

            try {
              const fetchTasks = [
                // InnerTube Direct Stream (Sin intermediario, streamingData nativo m4a/aac)
                (async () => {
                  const itRes = await fetchWithTimeout('https://www.youtube.com/youtubei/v1/player', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
                    body: JSON.stringify({
                      context: { client: { clientName: 'ANDROID_VR', clientVersion: '1.61.48', deviceModel: 'Quest 3' } },
                      videoId: ytId
                    })
                  }, 5000);
                  if (!itRes.ok) throw new Error(`InnerTube error: ${itRes.status}`);
                  const itData = await itRes.json();
                  const formats = itData.streamingData?.adaptiveFormats || [];
                  const m4a = formats.find((f: any) => f.mimeType?.includes('audio/mp4') && f.url);
                  if (m4a?.url) return m4a.url;
                  throw new Error("No direct M4A in InnerTube");
                })(),
                ...invidiousNodes.map(async (node) => {
                  const res = await fetchWithTimeout(`${node}/api/v1/videos/${ytId}`);
                  if (!res.ok) throw new Error(`Invidious error: ${res.status}`);
                  const json = await res.json();
                  const formats = json.adaptiveFormats || [];
                  const audioFormat = formats.find((f: any) => f.type?.includes('audio/mp4') || f.container === 'm4a');
                  if (audioFormat?.url) return audioFormat.url;
                  throw new Error("No audio stream in Invidious");
                }),
                ...pipedNodes.map(async (node) => {
                  const res = await fetchWithTimeout(`${node}/streams/${ytId}`);
                  if (!res.ok) throw new Error(`Piped error: ${res.status}`);
                  const json = await res.json();
                  const audioFormats = json.audioStreams || [];
                  const compatible = audioFormats.filter((f: any) => f.mimeType?.includes('mp4') || f.codec === 'aac' || f.codec === 'm4a');
                  const best = compatible.sort((a: any, b: any) => b.bitrate - a.bitrate)[0];
                  if (best?.url) return best.url;
                  throw new Error("No compatible (m4a/aac) stream in Piped");
                })
              ];

              const streamUrl = await (Promise as any).any(fetchTasks);
              if (streamUrl && latestTrackIdRef.current === track.id) {
                console.log(`✅ [YOUTUBE] Audio puro extraído con éxito: ${streamUrl.substring(0, 40)}...`);
                setTrackUrl(streamUrl);
                return;
              }
            } catch (e) {
              console.warn("⚠️ [YOUTUBE FALLO C] Extracción pura de YT falló por completo. Cayendo a Iframe Fallback.", e);
              // Llevamos a cabo el desbloqueo explícito para que el botón Play funcione si el iframe no arranca en iOS
              setIsAudioLoading(false); 
            }

            // 2. FALLBACK EMBEBIDO (Iframe)
            console.log("🟠 [YOUTUBE] Iniciando Iframe Fallback (Puede requerir Play manual en iOS)");
            setUseWidget(true);
            activeWidgetRef.current = 'youtube';
            
            // 🛡️ MANTENER MEDIASESSION EN IOS: Alimentamos el audioRef con silencio para no perder los controles nativos
            if (audioRef.current) {
              audioRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
              audioRef.current.loop = true;
              audioRef.current.play().catch(()=>{});
            }

            if (ytWidgetRef.current && ytReadyRef.current) {
              ytWidgetRef.current.loadVideoById({ videoId: ytId });
              setTimeout(() => { try { ytWidgetRef.current.setVolume(usePlayerStore.getState().volume * 65); } catch(e){} }, 100);
            } else {
              let retries = 0;
              const playYT = () => {
                if (latestTrackIdRef.current !== track.id) return;
                if (ytWidgetRef.current && ytReadyRef.current) {
                   console.log("🟢 [YOUTUBE IFRAME] Ejecutando loadVideoById tras espera.");
                   ytWidgetRef.current.loadVideoById({ videoId: ytId });
                   setTimeout(() => { try { ytWidgetRef.current.setVolume(usePlayerStore.getState().volume * 65); } catch(e){} }, 100);
                } else if (retries < 20) {
                   retries++;
                   setTimeout(playYT, 200);
                } else {
                   console.error("❌ [YOUTUBE IFRAME] Timeout esperando a ytReadyRef.");
                   setIsAudioLoading(false);
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
            console.log("⚠️ Pista bloqueada por DRM. Inyectando en Caballo de Troya (Widget SC)...");
            setUseWidget(true);
            activeWidgetRef.current = 'soundcloud';
            if (audioRef.current) {
              audioRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
              audioRef.current.loop = true;
              audioRef.current.play().catch(()=>{});
            }
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
    const activeList = contextTracksRef.current.length > 0 ? contextTracksRef.current : viewTracks;
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
    if (!activeList || activeList.length === 0) {
      const isAutoplay = usePlayerStore.getState().isAutoplayEnabled;
      if (isAutoplay && currentTrack) {
        triggerSmartAutoplay(currentTrack);
      } else {
        setIsPlaying(false);
      }
      return;
    }

    const { autoplayBlacklist } = stateRefs.current;
    let nextIndex = 0;
    let attempts = 0;
    let foundValid = false;

    if (isShuffle) {
      while (attempts < activeList.length) {
        nextIndex = Math.floor(Math.random() * activeList.length);
        if (!autoplayBlacklist.includes(String(activeList[nextIndex].id))) { foundValid = true; break; }
        attempts++;
      }
    } else {
      const currentIndex = activeList.findIndex(t => t.id === currentTrack?.id);
      nextIndex = currentIndex + 1;

      while (attempts < activeList.length) {
        if (nextIndex >= activeList.length) {
          if (loopMode === 1) {
            nextIndex = 0;
            foundValid = true;
            break;
          } else {
            // Fin de la lista o canción única
            const isAutoplay = usePlayerStore.getState().isAutoplayEnabled;
            if (isAutoplay && currentTrack) {
              triggerSmartAutoplay(currentTrack);
              return;
            } else {
              setIsPlaying(false);
              return;
            }
          }
        }
        if (!autoplayBlacklist.includes(String(activeList[nextIndex].id))) { foundValid = true; break; }
        nextIndex++;
        attempts++;
      }
    }

    // Si encontramos una canción no bloqueada, la reproducimos. Si no, activamos autoplay.
    if (foundValid && activeList[nextIndex]) {
      console.log(`[AUTOPLAY] PLAY_NEXT_START. Reproduciendo pista de la lista en índice ${nextIndex}`);
      playTrack(activeList[nextIndex]);
    } else {
      const isAutoplay = usePlayerStore.getState().isAutoplayEnabled;
      if (isAutoplay && currentTrack) {
        console.log(`[AUTOPLAY] Lista terminada. AUTOPLAY_START activado para la semilla: ${currentTrack.title}`);
        triggerSmartAutoplay(currentTrack);
      } else {
        console.log(`[AUTOPLAY] Lista terminada y Autoplay desactivado. Fin de reproducción.`);
        setIsPlaying(false);
      }
    }

  }, [useWidget]);

  // --- SMART AUTOPLAY INTELIGENTE (Promedio de Playlist + Perfil de Gusto) ---
  const triggerSmartAutoplay = async (sourceTrack: Track) => {
    try {
      const { autoplayBlacklist, listeningHistory } = usePlayerStore.getState();
      const blacklist = new Set((autoplayBlacklist || []).map(String));
      const recentPlayedIds = new Set(
        (listeningHistory || []).slice(0, 15).map((t: any) => String(t.id))
      );

      // 1. Pistas relacionadas directas en SoundCloud
      if (sourceTrack.id && !String(sourceTrack.id).startsWith('yt-')) {
        try {
          const res = await tauriFetch(
            `https://api-v2.soundcloud.com/tracks/${sourceTrack.id}/related?client_id=${CLIENT_ID}&limit=15`,
            { headers: { Authorization: `OAuth ${getScToken()}` } }
          );
          if (res.ok) {
            const data = await res.json();
            const candidates = (data.collection || []).filter(
              (t: any) =>
                t &&
                t.id &&
                t.id !== sourceTrack.id &&
                !blacklist.has(String(t.id)) &&
                !recentPlayedIds.has(String(t.id)) &&
                t.snipped !== true &&
                t.policy !== 'BLOCK'
            );
            if (candidates.length > 0) {
              const chosen = candidates[Math.floor(Math.random() * Math.min(candidates.length, 6))];
              playTrack({ ...chosen, provider: 'soundcloud' });
              return;
            }
          }
        } catch (e) {}
      }

      // 2. Semilla desde la Playlist activa (si había una lista sonando)
      const activeList = contextTracksRef.current || [];
      if (activeList.length > 1) {
        const randomFromList = activeList[Math.floor(Math.random() * activeList.length)];
        if (randomFromList?.id && !String(randomFromList.id).startsWith('yt-')) {
          try {
            const res = await tauriFetch(
              `https://api-v2.soundcloud.com/tracks/${randomFromList.id}/related?client_id=${CLIENT_ID}&limit=12`,
              { headers: { Authorization: `OAuth ${getScToken()}` } }
            );
            if (res.ok) {
              const data = await res.json();
              const candidates = (data.collection || []).filter(
                (t: any) =>
                  t &&
                  t.id &&
                  t.id !== sourceTrack.id &&
                  !blacklist.has(String(t.id)) &&
                  !recentPlayedIds.has(String(t.id)) &&
                  t.snipped !== true &&
                  t.policy !== 'BLOCK'
              );
              if (candidates.length > 0) {
                const chosen = candidates[Math.floor(Math.random() * candidates.length)];
                playTrack({ ...chosen, provider: 'soundcloud' });
                return;
              }
            }
          } catch (e) {}
        }
      }

      // 3. Pistas del mismo artista o género afín
      const artistName = sourceTrack.user?.username || (sourceTrack as any).artist;
      if (artistName) {
        try {
          const res = await tauriFetch(
            `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(
              artistName
            )}&client_id=${CLIENT_ID}&limit=20`,
            { headers: { Authorization: `OAuth ${getScToken()}` } }
          );
          if (res.ok) {
            const data = await res.json();
            const candidates = (data.collection || []).filter(
              (t: any) =>
                t &&
                t.id &&
                t.id !== sourceTrack.id &&
                !blacklist.has(String(t.id)) &&
                !recentPlayedIds.has(String(t.id)) &&
                t.snipped !== true &&
                t.policy !== 'BLOCK'
            );
            if (candidates.length > 0) {
              const chosen = candidates[Math.floor(Math.random() * candidates.length)];
              playTrack({ ...chosen, provider: 'soundcloud' });
              return;
            }
          }
        } catch (e) {}
      }

      // 4. Fallback a historial / biblioteca
      const { viewTracks } = usePlayerStore.getState();
      const valid = (viewTracks || []).filter(
        (t) => t.id !== sourceTrack.id && !blacklist.has(String(t.id))
      );
      if (valid.length > 0) {
        playTrack(valid[Math.floor(Math.random() * valid.length)]);
      } else {
        setIsPlaying(false);
      }
    } catch (err) {
      setIsPlaying(false);
    }
  };

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
      // Mantener sincronizado el audio silencioso para iOS Lock Screen
      if (audioRef.current && isMobile) {
        if (audioRef.current.paused) audioRef.current.play().catch(()=>{});
        else audioRef.current.pause();
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
    if (!isMobile) {
      audio.crossOrigin = "anonymous";
    }

    // 1. Inicialización de la física de ondas (Web Audio API) y Estabilizador de Volumen (solo en desktop para no suspender audio en iOS)
    if (!isMobile && !audioContextRef.current) {
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
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

      const handleTimeUpdate = () => {
      // ESCUDO ANTI-FANTASMAS NATIVO: Evita el spam de 0:00 si YT o SC asumen el control
      if (activeWidgetRef.current !== 'none' || useWidget) return;
      updateTime(audio.currentTime);
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      console.log(`[AUDIO ENGINE] TRACK_ENDED. Reproducción nativa finalizada.`);
      playNext(true);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    audio.src = trackUrl;
    audio.load();
    
    console.log(`[AUDIO ENGINE] AUDIO_SRC_SET. Intentando reproducir: ${trackUrl.substring(0, 40)}...`);
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => { 
        console.log("🟢 [AUDIO ENGINE] AUDIO_PLAY_SUCCESS. El hardware está emitiendo sonido.");
        setIsPlaying(true); 
        setIsAudioLoading(false); 
      }).catch((err) => { 
        console.error("❌ [AUDIO ENGINE] AUDIO_PLAY_ERROR (Posible bloqueo de Autoplay en iOS):", err.name, err.message);
        setIsPlaying(false);
        setIsAudioLoading(false); 
      });
    } else {
        setIsPlaying(true);
        setIsAudioLoading(false);
    }

    // WATCHDOG DE ESTADO: Evita estados "fantasma" donde la UI dice Playing pero el hardware está mudo
    const watchdog = setInterval(() => {
        if (usePlayerStore.getState().isPlaying && audio.paused && activeWidgetRef.current === 'none') {
            console.warn("⚠️ [WATCHDOG] Inconsistencia detectada: isPlaying es true pero el hardware de audio está en pausa. Sincronizando UI.");
            setIsPlaying(false);
            setIsAudioLoading(false);
        }
    }, 1000);

    return () => {
      clearInterval(watchdog);
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
       
       // BLINDAJE CONTRA HOT-RELOADS Y ERROR 153:
       // YouTube exige que el contenedor mida al menos 200x200 y no esté fuera de pantalla (-9999px)
       // para no considerarlo un bot/fraude publicitario.
       let container = document.getElementById('yt-player-container');
       if (!container) {
         container = document.createElement('div');
         container.id = 'yt-player-container';
         container.style.position = 'fixed';
         container.style.bottom = '0';
         container.style.right = '0';
         container.style.width = '200px';
         container.style.height = '200px';
         container.style.opacity = '0.001';
         container.style.pointerEvents = 'none';
         container.style.zIndex = '-9999';
         document.body.appendChild(container);
       }

       // NO enviamos origin: window.location.origin porque en Tauri iOS es tauri://localhost
       // y YouTube rechaza orígenes no HTTP/HTTPS con Error 153.
       ytWidgetRef.current = new (window as any).YT.Player('yt-player-container', {
          height: '200',
          width: '200',
          host: 'https://www.youtube-nocookie.com',
          playerVars: { 
            autoplay: 1, 
            controls: 0, 
            disablekb: 1, 
            fs: 0, 
            playsinline: 1, 
            enablejsapi: 1, 
            rel: 0 
          },
          events: {
            onReady: () => {
              console.log("🚀 Caballo de Troya YT pre-calentado y listo.");
              ytReadyRef.current = true;
              // Asegurar referrerpolicy en el iframe creado
              try {
                const iframe = document.querySelector('#yt-player-container iframe');
                if (iframe) (iframe as HTMLElement).setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
              } catch (e) {}
            },
            onStateChange: (event: any) => {
                const YT = (window as any).YT;
                if (event.data === YT.PlayerState.PLAYING) {
                  if (activeWidgetRef.current !== 'youtube') {
                    console.warn("🛡️ [ANTI-FANTASMA] YT Widget intentó reproducir pero ya no es activo. Pausando.");
                    if (ytWidgetRef.current) ytWidgetRef.current.pauseVideo();
                    return;
                  }
                  if (isMobile && audioRef.current && audioRef.current.paused) {
                    audioRef.current.play().catch(()=>{});
                  }
                  setIsPlaying(true);
                  setIsAudioLoading(false);
                  // ESTABILIZADOR: Aplicamos el Gain Staging (-35%) en el milisegundo exacto de arranque
                  if (ytWidgetRef.current) ytWidgetRef.current.setVolume(usePlayerStore.getState().volume * 65);
                }
                else if (event.data === YT.PlayerState.PAUSED) {
                  if (activeWidgetRef.current === 'youtube') {
                    setIsPlaying(false);
                    if (isMobile && audioRef.current) audioRef.current.pause();
                  }
                }
                else if (event.data === YT.PlayerState.ENDED) {
                  if (activeWidgetRef.current === 'youtube') playNext(true);
                }
              },
            onError: (error: any) => {
              console.warn("🚫 YT Iframe Event Error:", error.data);
              setIsAudioLoading(false);
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
            if (activeWidgetRef.current !== 'soundcloud') {
                console.warn("🛡️ [ANTI-FANTASMA] SC Widget intentó reproducir pero ya no es activo. Pausando.");
                widget.pause();
                return;
            }
            if (isMobile && audioRef.current && audioRef.current.paused) {
                audioRef.current.play().catch(()=>{});
            }
            setIsPlaying(true);
            setIsAudioLoading(false);
            // ESCUDO ANTI-DRM: Obligamos al widget a acatar la compresión de volumen justo al arrancar
            widget.setVolume(usePlayerStore.getState().volume * 65);
          });
          widget.bind(SC.Widget.Events.PAUSE, () => {
             if (activeWidgetRef.current === 'soundcloud') {
                setIsPlaying(false);
                if (isMobile && audioRef.current) audioRef.current.pause();
             }
          });
          widget.bind(SC.Widget.Events.FINISH, () => {
             if (activeWidgetRef.current === 'soundcloud') playNext(true);
          });
                
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

// --- DESBLOQUEO DE AUDIO EN IOS (una sola vez, en el primer toque real) ---
useEffect(() => {
  const unlockAudio = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = true;
      audio.play().then(() => {
        audio.pause();
        audio.muted = false;
      }).catch(() => { audio.muted = false; });
    }
  };
  document.addEventListener('touchend', unlockAudio, { once: true });
  document.addEventListener('click', unlockAudio, { once: true });
  return () => {
    document.removeEventListener('touchend', unlockAudio);
    document.removeEventListener('click', unlockAudio);
  };
}, []);

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

  // --- MEDIA SESSION (Controles de iOS Lock Screen / Windows / Teclado) ---
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      const trackAny = currentTrack as any;
      const artUrl = currentTrack.artwork_url
        ? currentTrack.artwork_url.replace('-large', '-t500x500')
        : trackAny.avatar_url
        ? trackAny.avatar_url.replace('-large', '-t500x500')
        : 'https://placehold.co/500x500/18181b/ffffff?text=Resonance';

      const artistName = currentTrack.user?.username || trackAny.artist || 'Resonance';

      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title || 'Resonance Music',
          artist: artistName,
          album: 'Resonance',
          artwork: [
            { src: artUrl, sizes: '96x96', type: 'image/jpeg' },
            { src: artUrl, sizes: '128x128', type: 'image/jpeg' },
            { src: artUrl, sizes: '192x192', type: 'image/jpeg' },
            { src: artUrl, sizes: '256x256', type: 'image/jpeg' },
            { src: artUrl, sizes: '384x384', type: 'image/jpeg' },
            { src: artUrl, sizes: '512x512', type: 'image/jpeg' },
          ],
        });

        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

        navigator.mediaSession.setActionHandler('play', () => togglePlay());
        navigator.mediaSession.setActionHandler('pause', () => togglePlay());
        navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
        navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && details.seekTime !== null) {
            handleSeek(details.seekTime);
          }
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const skipTime = details.seekOffset || 10;
          handleSeek(Math.min(usePlayerStore.getState().duration, usePlayerStore.getState().progress + skipTime));
        });
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          const skipTime = details.seekOffset || 10;
          handleSeek(Math.max(0, usePlayerStore.getState().progress - skipTime));
        });
      } catch (err) {
        console.warn('MediaSession update failed:', err);
      }
    }
  }, [currentTrack, isPlaying, togglePlay, playPrevious, playNext, handleSeek]);

  // Sincronizar posición de reproducción con MediaSession (para scrub bar en pantalla de bloqueo)
  useEffect(() => {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      const dur = usePlayerStore.getState().duration;
      const prog = usePlayerStore.getState().progress;
      if (dur > 0 && prog >= 0 && prog <= dur) {
        try {
          navigator.mediaSession.setPositionState({
            duration: dur,
            playbackRate: 1,
            position: prog,
          });
        } catch (e) {}
      }
    }
  }, [progress, duration]);

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






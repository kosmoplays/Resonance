import { useEffect, useState } from "react";
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { Bell, Clock, Play, Volume2, Cloud, CheckCheck, Disc3, UserPlus, Info, Sparkles } from "lucide-react";
import { usePlayerStore } from "../store/usePlayerStore";

const CLIENT_ID = "lmRjTI0FqeXygHMXc3hRzS7hth20PNk5";
const getScToken = () => localStorage.getItem("soundcloud_oauth_token") || "";

// Calculadora temporal de alta precisión
const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 3600) return `Hace ${Math.max(1, Math.floor(diffInSeconds / 60))} min`;
  if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
  const diffInDays = Math.floor(diffInSeconds / 86400);
  if (diffInDays === 1) return "Ayer";
  if (diffInDays < 7) return `Hace ${diffInDays} días`;
  if (diffInDays < 30) return `Hace ${Math.floor(diffInDays / 7)} sem`;
  return `Hace ${Math.floor(diffInDays / 30)} meses`;
};

export function HomeView({ follows, likes, playTrack, openArtistProfile, openPlaylist }: any) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [forYouArtists, setForYouArtists] = useState<any[]>([]);
  const [forYouTracks, setForYouTracks] = useState<any[]>([]);
  const [forYouPlaylists, setForYouPlaylists] = useState<any[]>([]);
  const [algoReason, setAlgoReason] = useState<string>("");
  const [algoError, setAlgoError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingForYou, setIsLoadingForYou] = useState(false);
  const [readItems, setReadItems] = useState<Set<any>>(() => {
    try {
      const stored = localStorage.getItem('resonance_read_items');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const { currentTrack } = usePlayerStore();

  const updateReadItems = (newSet: Set<any>) => {
    setReadItems(newSet);
    localStorage.setItem('resonance_read_items', JSON.stringify(Array.from(newSet)));
  };

  useEffect(() => {
    const fetchReleaseRadar = async () => {
      if (!follows || follows.length === 0) {
        setNotifications([]);
        return;
      }

      setIsLoading(true);
      try {
        let allLatestTracks: any[] = [];

        // Escaneo concurrente de catálogos Híbridos (Top 3 pistas por artista en SC y YT)
        const promises = follows.map(async (artist: any) => {
          const scId = artist.sc_id || (artist.provider === 'soundcloud' ? artist.id : null);
          const ytId = artist.yt_id || (artist.provider === 'youtube' ? artist.id.toString().replace('yt-user-', '') : null);

          const tasks = [];

          // Sonda SoundCloud
          if (scId && !scId.toString().startsWith('yt-')) {
            tasks.push((async () => {
              try {
                const res = await tauriFetch(`https://api-v2.soundcloud.com/users/${scId}/tracks?client_id=${CLIENT_ID}&limit=3`, { headers: { Authorization: `OAuth ${getScToken()}` } });
                if (res.ok) {
                  const data = await res.json();
                  const tracks = (data.collection || []).map((t: any) => ({ ...t, provider: 'soundcloud' }));
                  allLatestTracks.push(...tracks);
                }
              } catch (err) {}
            })());
          }

          // Sonda YouTube Music / Invidious (Con Filtro AAA anti-basura)
          if (ytId) {
            tasks.push((async () => {
              try {
                const nodes = ["https://vid.puffyan.us", "https://invidious.flokinet.to", "https://invidious.lunar.icu", "https://yewtu.be"];
                const data = await (Promise as any).any(nodes.map(async (n: string) => {
                  const res = await tauriFetch(`${n}/api/v1/channels/${ytId}`);
                  if (!res.ok) throw new Error("Fail");
                  return await res.json();
                })).catch(() => null);

                if (data && data.latestVideos) {
                  const garbageRegex = /(interview|vlog|podcast|teaser|trailer|live|full album|making of|tour|behind the scenes|short|snippet)/i;
                  const pureVideos = data.latestVideos.filter((t: any) => !garbageRegex.test(t.title) && (!t.lengthSeconds || (t.lengthSeconds >= 60 && t.lengthSeconds <= 1800))).slice(0, 3);
                  
                  const ytTracks = pureVideos.map((t: any) => {
                    const finalThumb = `https://i.ytimg.com/vi/${t.videoId}/hqdefault.jpg`;
                    
                    return {
                      id: `yt-${t.videoId}`,
                      title: t.title,
                      user: { username: artist.username, provider: 'youtube' },
                      artwork_url: finalThumb,
                      provider: 'youtube',
                      yt_videoId: t.videoId,
                      // Convertimos el Timestamp Unix de Invidious a ISO para que tu Timeline funcione
                      created_at: t.published ? new Date(t.published * 1000).toISOString() : new Date().toISOString()
                    };
                  });
                  allLatestTracks.push(...ytTracks);
                }
              } catch (err) {}
            })());
          }

          await Promise.all(tasks);
        });

        await Promise.all(promises);

        // Orden cronológico estricto
        allLatestTracks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // FILTRADO AAA DE NOTIFICACIONES: Solo audios funcionales y MÁXIMO 1 MES de antigüedad
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        
        const playableRadar = allLatestTracks
          .filter((t: any) => {
            const isSCBlock = t.provider === 'soundcloud' && (!t.media || !t.media.transcodings || t.policy === "BLOCK");
            if (isSCBlock) return false;
            
            const trackAge = now - new Date(t.created_at).getTime();
            return trackAge <= thirtyDaysMs; // Límite de 1 mes exacto
          })
          .slice(0, 30);

        setNotifications(playableRadar);
      } catch (error) {
        console.error("Error crítico en Notificaciones:", error);
      }
      setIsLoading(false);
    };

    fetchReleaseRadar();
      }, [follows]);

      // --- MOTOR ALGORÍTMICO "PARA TI" V2 (RED NEURONAL HEURÍSTICA) ---
      useEffect(() => {
        const fetchForYouAlgorithm = async () => {
          setIsLoadingForYou(true);
          setAlgoError(false);
          try {
            // 1. Minería de Datos (ADN del Usuario)
            const likedArtists = (likes || []).map((t: any) => t.user?.username).filter(Boolean);
            const likedGenres = (likes || []).map((t: any) => t.genre).filter(Boolean);
            const followedNames = (follows || []).map((f: any) => f.username).filter(Boolean);
            
            const rawSeeds = [...new Set([...likedArtists, ...likedGenres, ...followedNames])];
            const isColdStart = rawSeeds.length === 0;
            
            // 2. Semillas de Ignición (Si el usuario no tiene historial, usamos cultura general)
            const defaultSeeds = ["synthwave", "electronic", "lofi", "indie pop", "phonk", "ambient", "cyberpunk"];
            const activeSeeds = isColdStart ? defaultSeeds : rawSeeds;
            
            // Mezclamos el ADN para garantizar exploración y evitar estancamiento
            const shuffledSeeds = activeSeeds.sort(() => 0.5 - Math.random());
            const L = 0;
            const L2 = 1;
            const seed1 = shuffledSeeds[L];
            const seed2 = shuffledSeeds.length > 1 ? shuffledSeeds[L2] : shuffledSeeds[L];
            
            // Registramos la justificación para la interfaz (Blindado a String puro)
            setAlgoReason(isColdStart ? "Tendencias Globales" : String(seed1));

            // 3. Peticiones de Alta Profundidad Híbridas (SoundCloud + YouTube Music Invidious)
            const [artistsRes, tracksRes, ytData] = await Promise.all([
              tauriFetch(`https://api-v2.soundcloud.com/search/users?q=${encodeURIComponent(seed1)}&client_id=${CLIENT_ID}&limit=30`, { headers: { Authorization: `OAuth ${getScToken()}` } }),
              tauriFetch(`https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(seed2)}&client_id=${CLIENT_ID}&limit=50`, { headers: { Authorization: `OAuth ${getScToken()}` } }),
              (async () => {
                try {
                  const nodes = ["https://vid.puffyan.us", "https://invidious.flokinet.to", "https://invidious.lunar.icu", "https://yewtu.be"];
                  return await (Promise as any).any(nodes.map(async (n: string) => {
                    const res = await tauriFetch(`${n}/api/v1/search?q=${encodeURIComponent(seed2)}`);
                    if (!res.ok) throw new Error("Fail");
                    return await res.json();
                  })).catch(() => []);
                } catch (e) { return []; }
              })()
            ]);

            if (!artistsRes.ok || !tracksRes.ok) throw new Error("Límite de API alcanzado");

            const artistsData = await artistsRes.json();
             const tracksData = await tracksRes.json();

             // 🛡️ Extracción Mágica de Playlists Afines
             try {
               const plRes = await tauriFetch(`https://api-v2.soundcloud.com/search/playlists?q=${encodeURIComponent(seed1)}&client_id=${CLIENT_ID}&limit=10`, { headers: { Authorization: `OAuth ${getScToken()}` } });
               if (plRes.ok) {
                 const plData = await plRes.json();
                 setForYouPlaylists((plData.collection || []).filter((p: any) => p.track_count > 0).map((p: any) => ({ ...p, provider: 'soundcloud' })).slice(0, 5));
               }
             } catch (e) {}

             // 4. Filtrado de Pureza (Aniquilación de duplicados y control de calidad)
            const followedIds = new Set((follows || []).map((f: any) => f.id));
            const pureArtists = (artistsData.collection || [])
              .filter((u: any) => !followedIds.has(u.id) && (u.followers_count || 0) > 500)
              .sort(() => 0.5 - Math.random()) // Organic shuffle
              .slice(0, 8); // Exactamente 8 para llenar el scroll visible
            
            setForYouArtists(pureArtists);

            const likedIds = new Set((likes || []).map((t: any) => t.id));
            
            // Tracks SC
            const pureTracksSC = (tracksData.collection || [])
              .filter((t: any) => 
                t && t.media && t.media.transcodings && 
                t.policy !== "BLOCK" && 
                !likedIds.has(t.id) &&
                (t.playback_count || 0) > 1000 // Filtro anti-ruido
              )
              .map((t: any) => ({ ...t, provider: 'soundcloud' }));

            // Tracks YT
            const pureTracksYT = (ytData || [])
              .filter((t: any) => t.type === 'video' && (!t.lengthSeconds || (t.lengthSeconds >= 60 && t.lengthSeconds <= 1800)) && !likedIds.has(`yt-${t.videoId}`))
              .map((t: any) => {
                 return {
                    id: `yt-${t.videoId}`,
                    title: t.title,
                    user: { username: t.author, provider: 'youtube' },
                    artwork_url: `https://i.ytimg.com/vi/${t.videoId}/hqdefault.jpg`,
                    provider: 'youtube',
                    yt_videoId: t.videoId,
                    playback_count: t.viewCount || 0
                 };
              });

            // Combinamos ambos mundos y seleccionamos los mejores
            const combinedTracks = [...pureTracksSC, ...pureTracksYT]
              .sort((a: any, b: any) => (b.playback_count || 0) - (a.playback_count || 0)) // Ordenamos lo encontrado por pura popularidad real
              .slice(0, 14); // 2 filas de 7 perfectas
            
            setForYouTracks(combinedTracks);
            
            // Si después del filtro exhaustivo no queda nada, lanzamos el Edge Case visual
            if (pureArtists.length === 0 && combinedTracks.length === 0) setAlgoError(true);

          } catch (err) {
            console.error("Error Neuronal en Para Ti:", err);
            setAlgoError(true);
          }
          setIsLoadingForYou(false);
        };

        fetchForYouAlgorithm();
      }, [likes, follows]);

      const markAllAsRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    updateReadItems(allIds);
  };

  const markAsRead = (id: any) => {
    const newSet = new Set(readItems);
    newSet.add(id);
    updateReadItems(newSet);
  };

  const unreadCount = notifications.filter(n => !readItems.has(n.id)).length;

  return (
    <div className="w-full max-w-6xl mx-auto px-10 pt-16 pb-32 animate-in fade-in duration-700">

      {/* =========================================
          SECCIÓN 1: RADAR DE NOVEDADES (TIMELINE AAA)
          ========================================= */}
      <section className="mb-28 relative">
        {/* Glow Esencia Radar (Esmeralda) */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] pointer-events-none rounded-full" />

         {/* TIMELINE DE NOTIFICACIONES CORREGIDO CONTRA APLASTAMIENTO */}
         <header className="flex flex-col items-start gap-3 mb-12 relative z-10 w-full">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
             <div className="flex items-center gap-5">
              <div className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 rounded-2xl border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)] shrink-0">
                <Bell className="text-emerald-400" size={28} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-base"></span>
                  </span>
                )}
              </div>
              <div className="flex flex-col text-left">
                <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-md">
                  Radar de Novedades
                </h1>
                <p className="text-emerald-400/80 font-semibold mt-1 tracking-wide text-sm">
                  El feed en tiempo real de tus creadores
                </p>
              </div>
            </div>

            {unreadCount > 0 && !isLoading && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400 hover:text-white transition-colors bg-emerald-500/10 hover:bg-emerald-500/30 px-5 py-2.5 rounded-xl border border-emerald-500/20 shadow-lg active:scale-95"
              >
                <CheckCheck size={16} /> Marcar leídas
              </button>
            )}
          </div>
        </header>

        {/* TIMELINE DE NOTIFICACIONES */}
        {isLoading ? (
          <div className="ml-7 border-l-2 border-white/5 pl-10 space-y-6 py-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="relative flex items-center gap-6 animate-pulse">
                <div className="absolute -left-[49px] w-4 h-4 rounded-full bg-white/10 border-4 border-base" />
                <div className="w-16 h-16 rounded-xl bg-white/5" />
                <div className="flex flex-col gap-3 flex-1">
                  <div className="h-4 bg-white/10 rounded w-1/4" />
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (!follows || follows.length === 0) ? (
          <div className="bg-gradient-to-r from-emerald-500/5 to-transparent border border-white/5 rounded-3xl p-10 flex items-center gap-8 shadow-inner text-left">
             <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
               <UserPlus size={32} className="text-emerald-500" />
             </div>
             <div>
               <p className="text-2xl font-bold text-white mb-2">Construye tu Radar</p>
               <p className="text-sm text-neutral-400 max-w-md">Sigue a tus artistas favoritos para que su nueva música alimente esta línea de tiempo automáticamente.</p>
             </div>
          </div>
        ) : (notifications.length === 0) ? (
          <div className="bg-gradient-to-r from-white/5 to-transparent border border-white/5 rounded-3xl p-10 flex items-center gap-8 shadow-inner text-left">
             <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
               <Info size={32} className="text-neutral-500" />
             </div>
             <div>
               <p className="text-2xl font-bold text-white mb-2">Estás al día</p>
               <p className="text-sm text-neutral-400 max-w-md">Tus artistas no han publicado nada nuevo recientemente. El escáner espacial sigue activo en segundo plano.</p>
             </div>
          </div>
        ) : (
          <div className="ml-7 border-l-2 border-white/10 pl-10 space-y-4 py-2 relative">
            {notifications.map((track) => {
              const isActive = currentTrack?.id === track.id;
              const isRead = readItems.has(track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => { markAsRead(track.id); playTrack(track); }}
                  className="relative group cursor-pointer"
                >
                  {/* Nodo del Timeline */}
                  <div className={`absolute -left-[49px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-[3px] border-base transition-colors duration-500 z-10
                    ${isActive ? 'bg-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.8)]'
                    : !isRead ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]'
                    : 'bg-neutral-700 group-hover:bg-neutral-500'}`}
                  />

                  {/* Tarjeta Feed */}
                  <div className={`flex items-center gap-6 p-4 rounded-2xl transition-all duration-300 border
                    ${isActive ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30 shadow-[0_8px_30px_rgba(59,130,246,0.15)] ml-2'
                    : 'bg-[#181818] border-white/5 hover:bg-[#282828] hover:border-white/10 hover:shadow-xl'}`}>

                    {/* Portada */}
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-lg shrink-0 bg-neutral-900 border border-white/5">
                      <img src={track.artwork_url ? track.artwork_url.replace('-large', '-t500x500') : 'https://placehold.co/500x500/1a1a1a/333333?text=RN'}
                           className={`w-full h-full object-cover transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} alt=""/>
                      
                      <div className="absolute top-1 left-1 bg-black/60 p-1 rounded-md backdrop-blur-md">
                        {track.provider === 'youtube' ? (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-[#FF0000]"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"></polygon></svg>
                        ) : (
                          <Cloud size={10} className="text-[#ff5500] fill-[#ff5500]/20" />
                        )}
                      </div>

                      <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isActive ? 'opacity-100 backdrop-blur-[2px]' : 'opacity-0 group-hover:opacity-100 backdrop-blur-[1px]'}`}>
                        {isActive ? <Volume2 size={24} className="text-white drop-shadow-md" /> : <Play size={24} className="text-white drop-shadow-md ml-1" fill="currentColor" />}
                      </div>
                    </div>

                    {/* Meta Textos */}
                    <div className="flex-1 min-w-0 text-left">
                      <p className={`text-lg font-black truncate transition-colors ${isActive ? 'text-[#3b82f6]' : 'text-white'}`}>
                        {track.title}
                      </p>
                      <p className="text-sm text-neutral-400 truncate mt-0.5">
                        <span onClick={(e) => { e.stopPropagation(); openArtistProfile(track.user); }} className="font-bold text-white hover:text-emerald-400 hover:underline transition-colors cursor-pointer">
                          {track.user?.username}
                        </span>
                        {" "}ha lanzado nueva música
                      </p>
                    </div>

                    {/* Metadata Derecha */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0 pr-2">
                      <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border
                        ${isActive ? 'bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30' 
                        : !isRead ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                        : 'bg-white/5 text-neutral-500 border-white/5'}`}>
                        <Clock size={12} /> {timeAgo(track.created_at)}
                      </div>
                      <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1.5 mt-1 mr-1">
                        <Disc3 size={12} /> Sencillo
                      </p>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================
          SECCIÓN 2: ALGORITMO PARA TI (V2 NEURONAL AAA)
          ========================================= */}
      <section className="relative mt-20 pt-16 border-t border-white/5">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-gradient-to-bl from-[#3b82f6]/10 to-purple-500/5 blur-[120px] pointer-events-none rounded-full" />

        {/* HEADER ALINEADO A LA IZQUIERDA RESPONSIVO */}
         <header className="flex flex-col items-start mb-12 relative z-10 text-left w-full">
           <div className="flex items-center gap-5 mb-3">
             <div className="p-3 bg-gradient-to-br from-[#3b82f6]/20 to-purple-500/20 rounded-2xl border border-[#3b82f6]/30 shadow-[0_0_30px_rgba(59,130,246,0.15)] shrink-0">
               <Sparkles className="text-[#3b82f6]" size={28} />
             </div>
             <h2 className="text-4xl font-black text-white tracking-tight drop-shadow-xl">
               Para Ti
             </h2>
           </div>

            {/* 🛡️ ml-0 md:ml-[76px]: El desfase de alineación solo se activa si hay espacio horizontal real en pantalla */}
            <div className="flex flex-wrap items-center gap-3 ml-0 md:ml-[76px]">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            <p className="text-neutral-300 font-medium text-lg">Sintonizado con tu ADN musical</p>

            {!isLoadingForYou && !algoError && algoReason && (
              <>
                <span className="text-white/20 mx-2 hidden sm:block">|</span>
                <div className="flex items-center gap-2 bg-[#3b82f6]/10 border border-[#3b82f6]/30 px-3 py-1.5 rounded-lg shadow-sm backdrop-blur-md animate-in fade-in zoom-in duration-500">
                  <span className="text-[10px] text-[#3b82f6] font-bold uppercase tracking-widest">Inspirado en</span>
                  <span className="text-xs font-black text-white truncate max-w-[200px]">{algoReason}</span>
                </div>
              </>
            )}
          </div>
        </header>

        {/* CASO 1: CARGANDO (Skeletons Adaptados) */}
        {isLoadingForYou ? (
          <div className="space-y-16 relative z-10 text-left">
            <div className="flex gap-8 overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-4 shrink-0">
                  <div className="w-36 h-36 rounded-full bg-white/5 animate-pulse border border-white/5" />
                  <div className="w-20 h-3 bg-white/5 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
            {/* Skeletons ahora son barras horizontales */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 animate-pulse border border-white/5">
                  <div className="w-14 h-14 rounded-lg bg-white/10 shrink-0" />
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="h-4 bg-white/10 rounded-full w-3/4" />
                    <div className="h-3 bg-white/10 rounded-full w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : 
        
        /* CASO 2: ERROR / SIN DATOS */
        algoError || (forYouArtists.length === 0 && forYouTracks.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-t from-[#181818] to-transparent border border-white/5 rounded-3xl shadow-2xl px-6 relative overflow-hidden group text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 relative z-10 shadow-inner">
              <Sparkles size={40} className="text-neutral-500 group-hover:text-purple-400 transition-colors duration-700" />
            </div>
            <p className="text-2xl font-bold text-white mb-3 relative z-10">El algoritmo está aprendiendo</p>
            <p className="text-sm text-neutral-400 max-w-md relative z-10 leading-relaxed">
              Aún no hay suficientes datos para afinar tu frecuencia. Escucha más canciones y sigue a creadores para activar el cruce neuronal.
            </p>
          </div>
        ) : (

        /* CASO 3: RED NEURONAL RENDERIZADA */
          <div className="relative z-10 text-left">
            {/* ARTISTAS AFINES (Burbujas Circulares Intactas) */}
            {forYouArtists.length > 0 && (
              <div className="mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <h3 className="text-sm font-black text-neutral-500 uppercase tracking-[0.2em] mb-8">Creadores en ascenso</h3>
                <div className="flex gap-8 overflow-x-auto pb-6 pt-2 px-2 -mx-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {forYouArtists.map((artist: any) => (
                    <div
                      key={artist.id}
                      onClick={() => openArtistProfile(artist)}
                      className="flex flex-col items-center gap-4 cursor-pointer group min-w-[144px]"
                    >
                      <div className="w-36 h-36 rounded-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.4)] border-[3px] border-[#181818] group-hover:border-[#3b82f6] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all duration-500 relative bg-neutral-900 shrink-0">
                        <img
                          src={artist.avatar_url ? artist.avatar_url.replace('-large', '-t500x500') : 'https://placehold.co/500x500/1a1a1a/333333?text=USER'}
                          alt={artist.username}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-500">
                           <UserPlus className="text-white drop-shadow-md scale-75 group-hover:scale-100 transition-transform duration-500 mt-4" size={32} />
                        </div>
                      </div>
                      <div className="flex flex-col items-center text-center w-full px-1">
                        <p className="text-base font-bold text-white truncate w-full group-hover:text-[#3b82f6] transition-colors">{artist.username}</p>
                        <p className="text-xs text-neutral-500 font-semibold mt-1 bg-white/5 px-3 py-1 rounded-full border border-white/5">{(artist.followers_count || 0).toLocaleString()} seg.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PLAYLISTS RECOMENDADAS (Nuevas) */}
             {forYouPlaylists.length > 0 && (
               <div className="mb-16 animate-in fade-in slide-in-from-bottom-10 duration-700">
                 <h3 className="text-sm font-black text-neutral-500 uppercase tracking-[0.2em] mb-8">Playlists Descubiertas</h3>
                 <div className="flex gap-6 overflow-x-auto pb-6 pt-2 px-2 -mx-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                   {forYouPlaylists.map((playlist: any) => (
                     <div key={playlist.id} onClick={() => openPlaylist && openPlaylist(playlist)} className="flex flex-col gap-3 cursor-pointer group min-w-[160px] max-w-[160px]">
                       <div className="w-40 h-40 rounded-xl overflow-hidden shadow-lg border border-white/5 group-hover:border-[#10b981]/50 transition-all duration-500 relative bg-neutral-900 shrink-0">
                         <img src={playlist.artwork_url ? playlist.artwork_url.replace('-large', '-t500x500') : 'https://placehold.co/500x500/1a1a1a/333333?text=PL'} alt={playlist.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 backdrop-blur-[2px]">
                           <div className="w-12 h-12 bg-[#10b981] rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500">
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="black" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                           </div>
                         </div>
                       </div>
                       <div className="flex flex-col px-1">
                         <p className="text-base font-bold text-white truncate group-hover:text-[#10b981] transition-colors">{playlist.title}</p>
                         <p className="text-xs text-neutral-400 font-medium truncate mt-0.5">{playlist.track_count || 0} pistas</p>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             {/* CANCIONES RECOMENDADAS (LISTA COMPACTA AAA) */}
             {forYouTracks.length > 0 && (
               <div className="animate-in fade-in slide-in-from-bottom-12 duration-[900ms]">
                 <h3 className="text-sm font-black text-neutral-500 uppercase tracking-[0.2em] mb-8">Radar de Frecuencias</h3>
                
                {/* Nuevo Grid Horizontal Estilo Spotify */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3">
                  {forYouTracks.map((track: any) => {
                    const isActive = currentTrack?.id === track.id;
                    return (
                      <div
                        key={track.id}
                        onClick={() => playTrack(track)}
                        className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 cursor-pointer group border ${
                          isActive 
                            ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                            : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'
                        }`}
                      >
                        {/* Portada Miniatura Fija */}
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-neutral-900 shadow-md">
                          <img
                            src={track.artwork_url ? track.artwork_url.replace('-large', '-t50x50') : 'https://placehold.co/50x50/1a1a1a/333333?text=RN'}
                            alt={track.title}
                            className={`w-full h-full object-cover transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                          />
                          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                             {isActive ? <Volume2 size={18} className="text-[#3b82f6]" /> : <Play size={18} className="text-white ml-0.5" fill="currentColor" />}
                          </div>
                        </div>

                        {/* Metadatos Horizontales */}
                        <div className="flex flex-col flex-1 min-w-0">
                          <p className={`text-[15px] font-black tracking-tight truncate mb-0.5 ${isActive ? 'text-[#3b82f6]' : 'text-white group-hover:text-[#3b82f6]'} transition-colors`} title={track.title}>
                            {track.title}
                          </p>
                          <p 
                            onClick={(e) => { e.stopPropagation(); openArtistProfile(track.user); }}
                            className="text-xs text-neutral-400 font-semibold truncate hover:text-white hover:underline transition-colors cursor-pointer w-max"
                          >
                            {track.user?.username}
                          </p>
                        </div>

                        {/* Distintivo Discreto (Derecha) */}
                        <div className="flex items-center gap-3 opacity-40 group-hover:opacity-100 transition-opacity pr-2 shrink-0">
                          {track.provider === 'youtube' ? (
                             <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#FF0000]"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"></polygon></svg>
                           ) : (
                             <Cloud size={14} className="text-[#ff5500]" />
                           )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

    </div>
  );
}



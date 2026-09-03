import React, { useEffect, useState } from 'react';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import {
  Sparkles,
  Play,
  Volume2,
  Heart,
  ListMusic,
  User,
  Clock,
  Flame,
  Disc3, Cloud,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useAuthStore } from '../../store/useAuthStore';
import { MobileTrackItem } from '../components/MobileTrackItem';
import { MobileLoadingState } from '../components/MobileLoadingState';
import { ResonanceLogo } from '../../components/ResonanceLogo';

const CLIENT_ID = 'lmRjTI0FqeXygHMXc3hRzS7hth20PNk5';
const getScToken = () => localStorage.getItem('soundcloud_oauth_token') || '';

const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 3600) return `${Math.max(1, Math.floor(diffInSeconds / 60))}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  const diffInDays = Math.floor(diffInSeconds / 86400);
  if (diffInDays === 1) return 'Ayer';
  if (diffInDays < 7) return `${diffInDays}d`;
  return `${Math.floor(diffInDays / 7)}sem`;
};

interface MobileHomeViewProps {
  scProps: {
    follows: any[];
    likes: any[];
    scLikes: any[];
    ytLikes: any[];
    resonancePlaylists: any[];
    openArtistProfile: (user: any) => void;
    openPlaylist: (playlist: any, title?: string, isResonance?: boolean) => void;
    openView: (title: string, tracks?: any[]) => void;
    loadLibrary: () => void;
  };
  audioProps: {
    playTrack: (track: any) => void;
  };
  onOpenContext: (track: any) => void;
  onNavigateTab: (tab: any) => void;
}

export function MobileHomeView({
  scProps,
  audioProps,
  onOpenContext,
  onNavigateTab,
}: MobileHomeViewProps) {
  const {
    follows,
    likes,
    scLikes,
    ytLikes,
    resonancePlaylists,
    openArtistProfile,
    openPlaylist,
    openView,
    loadLibrary,
  } = scProps;
  const { playTrack } = audioProps;
  const { currentTrack, isPlaying, pinnedHomeCards, setPinnedHomeCards } = usePlayerStore();
  const [pinSlot, setPinSlot] = useState<number | null>(null);
  const { user } = useAuthStore();

  const [radarTracks, setRadarTracks] = useState<any[]>([]);
  const [forYouTracks, setForYouTracks] = useState<any[]>([]);
  const [isLoadingRadar, setIsLoadingRadar] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // User avatar calculation
  const email = user?.email || '';
  const defaultUsername = email ? email.split('@')[0] : 'Resonance';
  const username = user?.user_metadata?.username || user?.user_metadata?.custom_username || defaultUsername;
  const userAvatar =
    user?.user_metadata?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=3b82f6&color=fff&size=128`;

  // Fetch Release Radar (Concurrent for followed artists)
  const fetchRadar = async () => {
    if (!follows || follows.length === 0) {
      setRadarTracks([]);
      return;
    }

    setIsLoadingRadar(true);
    try {
      const allLatestTracks: any[] = [];
      const promises = follows.slice(0, 20).map(async (artist: any) => {
        const scId = artist.sc_id || (artist.provider === 'soundcloud' ? artist.id : null);
        const ytId =
          artist.yt_id ||
          (artist.provider === 'youtube'
            ? String(artist.id).replace('yt-user-', '')
            : null);

        // SoundCloud probe
        if (scId && !String(scId).startsWith('yt-')) {
          try {
            const res = await tauriFetch(
              `https://api-v2.soundcloud.com/users/${scId}/tracks?client_id=${CLIENT_ID}&limit=3`,
              { headers: { Authorization: `OAuth ${getScToken()}` } }
            );
            if (res.ok) {
              const data = await res.json();
              const tracks = (data.collection || []).map((t: any) => ({
                ...t,
                provider: 'soundcloud',
              }));
              allLatestTracks.push(...tracks);
            }
          } catch (err) {}
        }
      });

      await Promise.all(promises);

      // Sort by newest created_at
      const sorted = allLatestTracks
        .filter((t) => t.created_at)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 15);

      setRadarTracks(sorted);
    } catch (e) {
    } finally {
      setIsLoadingRadar(false);
    }
  };

  // Trigger radar fetch when follows change
  useEffect(() => {
    fetchRadar();
  }, [follows]);

  // Motor Inteligente "Especial Para Ti": calcula el average de Me Gusta + Historial + Playlists
  // y consulta en paralelo tracks afines excluyendo Me Gusta, YouTube, Lázaros y Blacklist.
  const fetchForYou = async () => {
    try {
      const allLikes = [...(likes || []), ...(scLikes || []), ...(ytLikes || [])];
      const likedIds = new Set(allLikes.map((t: any) => String(t.id)));
      const deletedHistory = (scProps as any).deletedHistory || {};
      const deletedIds = new Set(
        Object.values(deletedHistory).flatMap((arr: any) => (arr || []).map((t: any) => String(t.id)))
      );
      const blacklist = usePlayerStore.getState().autoplayBlacklist || [];
      const blacklistSet = new Set(blacklist.map(String));
      const historyTracks = usePlayerStore.getState().listeningHistory || [];
      const playlistTracks = (resonancePlaylists || []).flatMap((p: any) => p.tracks || []);

      // 1. ANÁLISIS DE PERFIL DE GUSTO (AVERAGE)
      const userTastePool = [...allLikes, ...historyTracks, ...playlistTracks];
      const artistCounts: Record<string, number> = {};
      const genreCounts: Record<string, number> = {};

      userTastePool.forEach((t: any) => {
        const art = t.user?.username || t.artist;
        if (art) artistCounts[art] = (artistCounts[art] || 0) + 1;
        const gen = t.genre;
        if (gen) genreCounts[gen.toLowerCase()] = (genreCounts[gen.toLowerCase()] || 0) + 1;
      });

      const topArtists = Object.entries(artistCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([art]) => art);

      const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([gen]) => gen);

      const defaultGenres = ['electronic', 'phonk', 'trap', 'hiphop', 'r-b', 'indie', 'pop', 'synthwave'];
      const chosenGenre =
        topGenres.length > 0
          ? topGenres[Math.floor(Math.random() * topGenres.length)]
          : defaultGenres[Math.floor(Math.random() * defaultGenres.length)];

      // 2. CONSULTAS INTELIGENTES PARALELAS
      const candidateTracks: any[] = [];

      // Consulta A: Género favorito
      const p1 = tauriFetch(
        `https://api-v2.soundcloud.com/tracks?genres=${encodeURIComponent(
          chosenGenre
        )}&limit=25&client_id=${CLIENT_ID}`,
        { headers: { Authorization: `OAuth ${getScToken()}` } }
      )
        .then(async (r) => {
          if (r.ok) {
            const d = await r.json();
            candidateTracks.push(...(d.collection || []));
          }
        })
        .catch(() => {});

      // Consulta B: Artistas favoritos (buscar canciones relacionadas)
      const p2 =
        topArtists.length > 0
          ? (async () => {
              const targetArtist = topArtists[Math.floor(Math.random() * topArtists.length)];
              try {
                const r = await tauriFetch(
                  `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(
                    targetArtist
                  )}&client_id=${CLIENT_ID}&limit=20`,
                  { headers: { Authorization: `OAuth ${getScToken()}` } }
                );
                if (r.ok) {
                  const d = await r.json();
                  candidateTracks.push(...(d.collection || []));
                }
              } catch (e) {}
            })()
          : Promise.resolve();

      // Consulta C: Related tracks de un like aleatorio
      const p3 =
        allLikes.length > 0
          ? (async () => {
              const seedTrack = allLikes[Math.floor(Math.random() * allLikes.length)];
              if (seedTrack?.id && !String(seedTrack.id).startsWith('yt-')) {
                try {
                  const r = await tauriFetch(
                    `https://api-v2.soundcloud.com/tracks/${seedTrack.id}/related?client_id=${CLIENT_ID}&limit=15`,
                    { headers: { Authorization: `OAuth ${getScToken()}` } }
                  );
                  if (r.ok) {
                    const d = await r.json();
                    candidateTracks.push(...(d.collection || []));
                  }
                } catch (e) {}
              }
            })()
          : Promise.resolve();

      await Promise.all([p1, p2, p3]);

      // 3. FILTRADO ULTRA-ESTRICTO
      const seenIds = new Set();
      const cleanRecommendations = candidateTracks
        .filter((t: any) => {
          if (!t || !t.id || seenIds.has(t.id)) return false;
          seenIds.add(t.id);
          const idStr = String(t.id);
          // 1. NO en tus Me Gusta
          if (likedIds.has(idStr)) return false;
          // 2. NO de YouTube
          if (t.provider === 'youtube' || t.yt_videoId || idStr.startsWith('yt-')) return false;
          // 3. NO en mis Lázaros
          if (deletedIds.has(idStr)) return false;
          // 4. NO en Blacklist
          if (blacklistSet.has(idStr)) return false;
          // 5. Debe ser reproducible
          if (t.snipped === true || t.policy === 'BLOCK') return false;
          return true;
        })
        .map((t: any) => ({ ...t, provider: 'soundcloud' }));

      // Barajar y limitar a 10 mejores
      const shuffled = cleanRecommendations.sort(() => 0.5 - Math.random()).slice(0, 10);
      setForYouTracks(shuffled);
    } catch (err) {
      console.error('Error cargando Para Ti inteligente:', err);
    }
  };

  useEffect(() => {
    fetchForYou();
  }, [likes?.length, scLikes?.length, resonancePlaylists?.length]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    loadLibrary();
    await Promise.all([fetchRadar(), fetchForYou()]);
    setIsRefreshing(false);
  };

  const totalLikesCount = (likes?.length || 0) + (scLikes?.length || 0) + (ytLikes?.length || 0);

  return (
    <div
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 44px)',
        maskImage: 'linear-gradient(to bottom, transparent 0px, transparent 15px, black max(env(safe-area-inset-top, 0px), 44px), black 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, transparent 15px, black max(env(safe-area-inset-top, 0px), 44px), black 100%)',
      }}
      className="h-full w-full overflow-y-auto pb-4 px-4 space-y-6 select-none scrollbar-none"
    >
      {/* TOP HEADER WITH LOGO & AVATAR (SCROLLS WITH PAGE) */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ResonanceLogo size={36} />
          <div>
            <span className="text-[10px] font-bold tracking-widest text-accent uppercase block -mb-0.5">
              Multiverso Musical
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight leading-none">Descubrir</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className={`p-2.5 bg-white/5 active:bg-white/10 rounded-full text-neutral-400 active:text-white transition-all ${
              isRefreshing ? 'animate-spin text-accent' : ''
            }`}
            aria-label="Actualizar"
          >
            <RotateCcw size={18} />
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('profile')}
            className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-white/15 shadow-lg active:scale-95 transition-transform bg-neutral-900 flex-shrink-0"
            aria-label="Perfil"
          >
            <img
              src={userAvatar}
              alt={username}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  username
                )}&background=3b82f6&color=fff&size=128`;
              }}
            />
          </button>
        </div>
      </header>      {/* QUICK SHORTCUTS GRID */}
      <section className="grid grid-cols-2 gap-2.5">
        {[0, 1].map((index) => {
          const cardConfig = pinnedHomeCards[index] || { type: index === 0 ? 'likes' : 'sc' };
          
          let title = "Vacio";
          let subtitle = "";
          let icon = <Disc3 size={20} fill="currentColor" />;
          let colorTheme = "emerald";
          let action = () => {};
          
          if (cardConfig.type === 'likes') {
            title = "Tus Me Gusta";
            subtitle = `${totalLikesCount} temas`;
            icon = <Heart size={20} fill="currentColor" />;
            colorTheme = "emerald";
            action = () => openView('Tus Me Gusta', likes);
          } else if (cardConfig.type === 'sc') {
            title = "SoundCloud";
            subtitle = `${scLikes?.length || 0} temas`;
            icon = <Cloud size={20} fill="currentColor" />;
            colorTheme = "amber";
            action = () => openView('Me Gusta (SoundCloud)', scLikes);
          } else if (cardConfig.type === 'yt') {
            title = "YouTube";
            subtitle = `${ytLikes?.length || 0} temas`;
            icon = <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"></polygon></svg>;
            colorTheme = "red";
            action = () => openView('Me Gusta (YouTube)', ytLikes);
          } else if (cardConfig.type === 'custom') {
            const pl = resonancePlaylists.find(p => String(p.id) === String(cardConfig.id));
            if (pl) {
              title = pl.title;
              subtitle = `${pl.track_count || 0} pistas`;
              icon = pl.artwork_url ? <img src={pl.artwork_url} className="w-full h-full object-cover rounded-xl" alt="" /> : <Disc3 size={20} fill="currentColor" />;
              colorTheme = "purple";
              action = () => openView(pl.title, pl.tracks);
            }
          }

          const gradients: Record<string, string> = {
            emerald: "from-emerald-950/40 to-neutral-900/80 border-emerald-500/20",
            amber: "from-amber-950/40 to-neutral-900/80 border-amber-500/20",
            red: "from-red-950/40 to-neutral-900/80 border-red-500/20",
            purple: "from-purple-950/40 to-neutral-900/80 border-purple-500/20"
          };
          
          const iconBgs: Record<string, string> = {
            emerald: "bg-emerald-500/20 text-emerald-400",
            amber: "bg-amber-500/20 text-amber-400",
            red: "bg-red-500/20 text-red-400",
            purple: "bg-purple-500/20 text-purple-400"
          };

          const textColors: Record<string, string> = {
            emerald: "text-emerald-400/80",
            amber: "text-amber-400/80",
            red: "text-red-400/80",
            purple: "text-purple-400/80"
          };

          return (
            <div
              key={index}
              onClick={action}
              onContextMenu={(e) => { e.preventDefault(); setPinSlot(index); }}
              onTouchStart={(e) => {
                // Long press logic
                const timer = setTimeout(() => { setPinSlot(index); }, 600);
                e.currentTarget.dataset.timer = timer.toString();
              }}
              onTouchEnd={(e) => {
                clearTimeout(Number(e.currentTarget.dataset.timer));
              }}
              onTouchMove={(e) => {
                clearTimeout(Number(e.currentTarget.dataset.timer));
              }}
              className={`flex items-center gap-3 p-3 bg-gradient-to-br border rounded-2xl cursor-pointer active:scale-[0.98] transition-transform shadow-md ${gradients[colorTheme] || gradients.emerald}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs ${iconBgs[colorTheme] || iconBgs.emerald}`}>
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-bold text-white truncate">{title}</h3>
                <p className={`text-[10px] font-semibold truncate ${textColors[colorTheme] || textColors.emerald}`}>{subtitle}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* RELEASE RADAR SECTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <h2 className="text-base font-bold text-white tracking-tight">Release Radar</h2>
          </div>
          {radarTracks.length > 0 && (
            <span className="text-[10px] font-semibold text-neutral-500">
              Nuevos Lanzamientos
            </span>
          )}
        </div>

        {isLoadingRadar ? (
          <MobileLoadingState message="Buscando nuevos lanzamientos de tus artistas..." className="py-10" />
        ) : radarTracks.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {radarTracks.map((track) => {
              const trackArt = track.artwork_url
                ? track.artwork_url.replace('-large', '-t300x300')
                : 'https://placehold.co/300x300/18181b/ffffff?text=♪';
              const isCur = currentTrack?.id === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className="w-36 flex-shrink-0 group cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="relative w-36 h-36 rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-lg mb-2">
                    <img
                      src={trackArt}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[9px] font-bold text-white flex items-center gap-1">
                      <Clock size={10} />
                      {timeAgo(track.created_at)}
                    </div>
                    <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center shadow-lg">
                      {isCur && isPlaying ? (
                        <Volume2 size={16} className="animate-pulse" />
                      ) : (
                        <Play size={16} fill="white" className="ml-0.5" />
                      )}
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate leading-tight">
                    {track.title}
                  </h4>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                    {track.user?.username || track.artist}
                  </p>
                </div>
              );
            })}
          </div>
        ) : follows && follows.length > 0 ? (
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 text-center">
            <Disc3 size={24} className="mx-auto text-neutral-500 mb-2 opacity-50" />
            <p className="text-xs text-neutral-400 font-medium">
              Tus artistas seguidos no tienen lanzamientos en los últimos 30 días.
            </p>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 text-center">
            <Disc3 size={24} className="mx-auto text-neutral-500 mb-2 opacity-50" />
            <p className="text-xs text-neutral-400 font-medium">
              Sigue a tus artistas favoritos en Resonance para ver sus últimos lanzamientos aquí.
            </p>
          </div>
        )}
      </section>

      {/* FOLLOWED ARTISTS ROW */}
      {follows && follows.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight">Artistas Seguidos</h2>
            <button
              onClick={() => openView('Artistas Seguidos', follows)}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Ver todos ({follows.length})
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {follows.map((artist: any) => {
              const avatar = artist.avatar_url
                ? artist.avatar_url.replace('-large', '-t300x300')
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    artist.username || 'Artist'
                  )}&background=3b82f6&color=fff&size=128`;

              return (
                <div
                  key={artist.id}
                  onClick={() => openArtistProfile(artist)}
                  className="flex flex-col items-center flex-shrink-0 w-20 group cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="w-18 h-18 rounded-full overflow-hidden border-2 border-white/10 shadow-lg bg-neutral-900 mb-1.5 p-0.5">
                    <img
                      src={avatar}
                      alt={artist.username}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <span className="text-xs font-semibold text-neutral-200 truncate w-full text-center">
                    {artist.username}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* PARA TI / RECOMMENDATIONS */}
      {forYouTracks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Especial Para Ti</h2>
          </div>

          <div className="space-y-1">
            {forYouTracks.slice(0, 6).map((track, idx) => (
              <MobileTrackItem
                key={`${track.id}-${idx}`}
                track={track}
                onPlay={playTrack}
                onOpenContext={onOpenContext}
              />
            ))}
          </div>
        </section>
      )}

      {/* MODAL DE FIJAR PLAYLIST */}
      {pinSlot !== null && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPinSlot(null)} />
          <div className="bg-[#181818] border border-white/10 w-full max-w-sm rounded-3xl p-5 relative z-10 shadow-2xl animate-in slide-in-from-bottom-10 fade-in">
            <h3 className="text-lg font-black text-white mb-1">Elegir acceso directo</h3>
            <p className="text-xs text-neutral-400 mb-4">Selecciona qué lista quieres fijar aquí.</p>
            
            <div className="space-y-2 max-h-[50vh] overflow-y-auto scrollbar-none pb-2">
              <div
                onClick={() => {
                  const newPins = [...pinnedHomeCards];
                  newPins[pinSlot] = { type: 'likes' };
                  setPinnedHomeCards(newPins);
                  setPinSlot(null);
                }}
                className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer"
              >
                <Heart size={20} className="text-emerald-400" />
                <span className="text-sm font-bold text-white">Tus Me Gusta</span>
              </div>
              <div
                onClick={() => {
                  const newPins = [...pinnedHomeCards];
                  newPins[pinSlot] = { type: 'sc' };
                  setPinnedHomeCards(newPins);
                  setPinSlot(null);
                }}
                className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer"
              >
                <Cloud size={20} className="text-amber-400" />
                <span className="text-sm font-bold text-white">SoundCloud Likes</span>
              </div>
              <div
                onClick={() => {
                  const newPins = [...pinnedHomeCards];
                  newPins[pinSlot] = { type: 'yt' };
                  setPinnedHomeCards(newPins);
                  setPinSlot(null);
                }}
                className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"></polygon></svg>
                <span className="text-sm font-bold text-white">YouTube Likes</span>
              </div>
              
              {resonancePlaylists.map(pl => (
                <div
                  key={pl.id}
                  onClick={() => {
                    const newPins = [...pinnedHomeCards];
                    newPins[pinSlot] = { type: 'custom', id: pl.id };
                    setPinnedHomeCards(newPins);
                    setPinSlot(null);
                  }}
                  className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer"
                >
                  <Disc3 size={20} className="text-purple-400" />
                  <span className="text-sm font-bold text-white">{pl.title}</span>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setPinSlot(null)}
              className="w-full mt-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

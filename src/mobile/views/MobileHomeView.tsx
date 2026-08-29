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
  Disc3,
  RefreshCw,
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
  const { currentTrack, isPlaying } = usePlayerStore();
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

  // Fetch fresh discovery tracks for "Especial Para Ti"
  // (Excluye terminantemente: tus Me Gusta, YouTube, Lázaros y Blacklist)
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

      const genresList = ['dance', 'electronic', 'trap', 'hiphop', 'r-b', 'indie', 'pop'];
      const randomGenre = genresList[Math.floor(Math.random() * genresList.length)];
      const res = await tauriFetch(
        `https://api-v2.soundcloud.com/tracks?genres=${randomGenre}&limit=35&client_id=${CLIENT_ID}`,
        { headers: { Authorization: `OAuth ${getScToken()}` } }
      );

      if (res.ok) {
        const data = await res.json();
        const raw = data.collection || [];
        const filtered = raw
          .filter((t: any) => {
            if (!t || !t.id) return false;
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
          .map((t: any) => ({ ...t, provider: 'soundcloud' }))
          .slice(0, 10);

        setForYouTracks(filtered);
      }
    } catch (err) {
      console.error('Error cargando Para Ti:', err);
    }
  };

  useEffect(() => {
    fetchForYou();
  }, [likes?.length, scLikes?.length]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    loadLibrary();
    await Promise.all([fetchRadar(), fetchForYou()]);
    setIsRefreshing(false);
  };

  const totalLikesCount = (likes?.length || 0) + (scLikes?.length || 0) + (ytLikes?.length || 0);

  return (
    <div className="h-full w-full overflow-y-auto pt-[max(env(safe-area-inset-top,0px),16px)] pb-36 px-4 space-y-6 select-none">
      {/* TOP HEADER WITH LOGO & AVATAR */}
      <header className="flex items-center justify-between pt-2">
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
            aria-label="Refrescar"
          >
            <RefreshCw size={18} />
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
      </header>

      {/* QUICK SHORTCUTS GRID */}
      <section className="grid grid-cols-2 gap-2.5">
        {/* TUS ME GUSTA */}
        <div
          onClick={() => openView('Tus Me Gusta', likes)}
          className="flex items-center gap-3 p-3 bg-gradient-to-br from-emerald-950/40 to-neutral-900/80 border border-emerald-500/20 rounded-2xl cursor-pointer active:scale-[0.98] transition-transform shadow-md"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Heart size={20} fill="currentColor" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white truncate">Tus Me Gusta</h3>
            <p className="text-[10px] text-emerald-400/80 font-semibold">{totalLikesCount} temas</p>
          </div>
        </div>

        {/* SOUNDCLOUD LIKES */}
        <div
          onClick={() => openView('Me Gusta (SoundCloud)', scLikes)}
          className="flex items-center gap-3 p-3 bg-gradient-to-br from-amber-950/40 to-neutral-900/80 border border-amber-500/20 rounded-2xl cursor-pointer active:scale-[0.98] transition-transform shadow-md"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 font-black text-xs">
            SC
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white truncate">SoundCloud</h3>
            <p className="text-[10px] text-amber-400/80 font-semibold">{scLikes?.length || 0} temas</p>
          </div>
        </div>
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

      {/* RESONANCE PLAYLISTS CAROUSEL */}
      {resonancePlaylists && resonancePlaylists.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListMusic size={16} className="text-purple-400" />
              <h2 className="text-base font-bold text-white tracking-tight">Tus Playlists</h2>
            </div>
            <button
              onClick={() => onNavigateTab('library')}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Biblioteca
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {resonancePlaylists.slice(0, 4).map((pl: any) => (
              <div
                key={pl.id}
                onClick={() => openPlaylist(pl, pl.title, true)}
                className="p-3.5 bg-white/5 hover:bg-white/10 active:scale-[0.98] rounded-2xl border border-white/5 transition-all cursor-pointer flex flex-col justify-between h-28"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <ListMusic size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white truncate">{pl.title}</h4>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    {pl.tracks?.length || 0} canciones
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

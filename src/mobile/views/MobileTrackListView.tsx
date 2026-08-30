import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  Play,
  Pause,
  Shuffle,
  Search,
  UserPlus,
  UserCheck,
  Disc3,
  ListMusic,
  Sparkles,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { MobileTrackItem } from '../components/MobileTrackItem';
import { MobileLoadingState } from '../components/MobileLoadingState';

interface MobileTrackListViewProps {
  scProps: {
    viewTitle: string;
    viewContext?: any[];
    goBack: () => void;
    toggleFollow?: (artist: any) => void;
    follows?: any[];
    loadMoreYtLikes?: () => void;
    openArtistProfile?: (user: any) => void;
    openPlaylist?: (playlist: any, title?: string, isResonance?: boolean) => void;
    isLoadingTracks?: boolean;
    isSearching?: boolean;
  };
  audioProps: {
    playTrack: (track: any) => void;
    togglePlay: () => void;
  };
  onOpenContext: (track: any) => void;
}

export function MobileTrackListView({
  scProps,
  audioProps,
  onOpenContext,
}: MobileTrackListViewProps) {
  const {
    viewTitle,
    viewContext,
    goBack,
    toggleFollow,
    follows,
    loadMoreYtLikes,
    isLoadingTracks,
    isSearching,
  } = scProps;
  const { playTrack, togglePlay } = audioProps;
  const { viewTracks, viewUsers, currentTrack, isPlaying, isShuffle } = usePlayerStore();

  const [filterQuery, setFilterQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const isArtistProfile = viewTitle.startsWith('Perfil:');
  const artistNameFallback = viewTitle.replace('Perfil: ', '').trim();

  // Read artistData from viewUsers (where useArtistProfile sets it) or viewContext
  const artistData =
    (viewUsers && viewUsers.length > 0 ? viewUsers[0] : null) ||
    (viewContext && viewContext.length > 0 ? viewContext[0] : null) ||
    { username: artistNameFallback };

  const isFollowed =
    artistData && follows
      ? follows.some(
          (a) =>
            a.id === artistData.id ||
            a.username?.toLowerCase() === artistData.username?.toLowerCase() ||
            (artistData.sc_id && a.sc_id === artistData.sc_id)
        )
      : false;

  const isCurrentTrackInView = Boolean(
    currentTrack && viewTracks?.some((t) => String(t.id) === String(currentTrack.id))
  );
  const isViewPlaying = isPlaying && isCurrentTrackInView;

  const filteredTracks = useMemo(() => {
    if (!viewTracks) return [];
    if (!filterQuery.trim()) return viewTracks;
    const q = filterQuery.toLowerCase();
    return viewTracks.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.user?.username?.toLowerCase().includes(q) ||
        (t as any).artist?.toLowerCase().includes(q)
    );
  }, [viewTracks, filterQuery]);

  const handlePlayAll = (shuffle: boolean = false) => {
    if (!viewTracks || viewTracks.length === 0) return;
    if (shuffle) {
      usePlayerStore.setState({ isShuffle: true });
      const randIndex = Math.floor(Math.random() * viewTracks.length);
      playTrack(viewTracks[randIndex]);
    } else if (isCurrentTrackInView) {
      togglePlay();
    } else {
      playTrack(viewTracks[0]);
    }
  };

  const bannerImg = artistData?.banner_url
    ? artistData.banner_url
    : artistData?.avatar_url
    ? artistData.avatar_url.replace('-large', '-t500x500')
    : null;

  const isLoading = isLoadingTracks || isSearching;

  return (
    <div className="h-full w-full flex flex-col bg-neutral-950 text-white select-none relative overflow-hidden">
      {/* STICKY TOP HEADER */}
      <header
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 44px)',
        }}
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 bg-neutral-950/90 backdrop-blur-2xl border-b border-white/10 flex-shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={goBack}
            className="p-1.5 -ml-1 text-neutral-300 active:text-white bg-white/5 active:bg-white/15 rounded-full transition-transform active:scale-90"
            aria-label="Volver"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-base font-bold text-white truncate max-w-[220px]">
            {isArtistProfile ? artistData?.username || artistNameFallback : viewTitle}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowSearch(!showSearch)}
          className={`p-2 rounded-full transition-colors ${
            showSearch ? 'bg-accent text-white' : 'text-neutral-400 active:text-white bg-white/5'
          }`}
          aria-label="Filtrar en lista"
        >
          <Search size={18} />
        </button>
      </header>

      {/* FILTER BAR IF TOGGLED */}
      {showSearch && (
        <div className="px-4 py-2 bg-neutral-900 border-b border-white/10 flex-shrink-0 animate-in slide-in-from-top-2 duration-200">
          <input
            type="search"
            placeholder="Filtrar canciones en esta lista..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            autoFocus
            className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-accent"
          />
        </div>
      )}

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto pb-6 px-3 scrollbar-none">
        {/* ARTIST PROFILE HERO BANNER */}
        {isArtistProfile && (
          <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl bg-neutral-900 my-3 border border-white/10">
            {bannerImg ? (
              <div className="relative h-44 w-full">
                <img
                  src={bannerImg}
                  alt={artistData.username}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
              </div>
            ) : (
              <div className="h-28 bg-gradient-to-br from-indigo-900 to-purple-900" />
            )}

            <div className="p-4 pt-0 relative -mt-12 flex flex-col gap-3">
              <div className="flex items-end justify-between">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-xl bg-neutral-900">
                  <img
                    src={
                      artistData.avatar_url?.replace('-large', '-t300x300') ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        artistData.username || 'Artist'
                      )}&background=3b82f6&color=fff&size=256`
                    }
                    alt={artistData.username}
                    className="w-full h-full object-cover"
                  />
                </div>

                {toggleFollow && (
                  <button
                    type="button"
                    onClick={() => toggleFollow(artistData)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-md ${
                      isFollowed
                        ? 'bg-white/15 text-neutral-300 border border-white/10'
                        : 'bg-white text-black font-extrabold'
                    }`}
                  >
                    {isFollowed ? (
                      <>
                        <UserCheck size={15} /> Siguiendo
                      </>
                    ) : (
                      <>
                        <UserPlus size={15} /> Seguir
                      </>
                    )}
                  </button>
                )}
              </div>

              <div>
                <h1 className="text-2xl font-black text-white tracking-tight leading-tight">
                  {artistData.username || artistNameFallback}
                </h1>
                <p className="text-xs text-neutral-400 font-semibold mt-0.5 flex items-center gap-2">
                  {artistData.total_followers > 0 && (
                    <span>
                      {new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(
                        artistData.total_followers
                      )}{' '}
                      seguidores
                    </span>
                  )}
                  {artistData.city && <span>• {artistData.city}</span>}
                </p>
              </div>

              {artistData.bio && (
                <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                  {artistData.bio}
                </p>
              )}

              {/* ARTIST ACTION BUTTONS */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handlePlayAll(false)}
                  className="flex-1 py-3 px-4 bg-accent text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 transition-all"
                >
                  {isViewPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-0.5" />}
                  <span>{isViewPlaying ? 'Pausar' : 'Reproducir'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePlayAll(true)}
                  className="p-3 bg-white/10 active:bg-white/20 text-white rounded-2xl shadow-md active:scale-95 transition-all"
                  title="Reproducción aleatoria del artista"
                  aria-label="Reproducir artista en aleatorio"
                >
                  <Shuffle size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ARTIST ALBUMS & EPS CAROUSEL */}
        {isArtistProfile && artistData?.albums && artistData.albums.length > 0 && (
          <div className="my-4 space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Álbumes y Lanzamientos ({artistData.albums.length})
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-none">
              {artistData.albums.map((album: any) => {
                const albArt =
                  album.artwork_url ||
                  album.avatar_url ||
                  'https://placehold.co/300x300/18181b/ffffff?text=Album';

                return (
                  <div
                    key={album.id}
                    onClick={() => {
                      if (scProps.openPlaylist) {
                        scProps.openPlaylist(album, album.title);
                      }
                    }}
                    className="w-32 flex-shrink-0 group cursor-pointer active:scale-95 transition-transform"
                  >
                    <div className="w-32 h-32 rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-lg mb-1.5">
                      <img
                        src={albArt}
                        alt={album.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <h4 className="text-xs font-bold text-white truncate">{album.title}</h4>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      {album.track_count ? `${album.track_count} temas` : 'Álbum'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* NON-ARTIST PLAYLIST / LIKES / ARTIST LIST HERO */}
        {!isArtistProfile && (
          <div className="p-4 my-3 rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/10 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-accent tracking-wider">
                {viewTitle === 'Artistas Seguidos' ? 'Artistas' : 'Colección'}
              </span>
              <h1 className="text-xl font-black text-white tracking-tight mt-0.5">{viewTitle}</h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                {viewTitle === 'Artistas Seguidos'
                  ? `${follows?.length || viewTracks?.length || 0} artistas`
                  : `${viewTracks?.length || 0} canciones`}
              </p>
            </div>

            {/* BOTONES DE PLAY SOLO PARA LISTAS DE CANCIONES (NO PARA LISTA DE ARTISTAS SEGUIDOS) */}
            {viewTitle !== 'Artistas Seguidos' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePlayAll(true)}
                  className={`p-3 rounded-2xl transition-all active:scale-90 shadow-md ${
                    isShuffle
                      ? 'bg-accent text-white shadow-[0_0_15px_rgba(59,130,246,0.6)]'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  aria-label="Reproducir en aleatorio"
                >
                  <Shuffle size={20} />
                </button>

                <button
                  type="button"
                  onClick={() => handlePlayAll(false)}
                  className="p-3.5 bg-accent text-white rounded-2xl active:scale-90 transition-all shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                  aria-label={isViewPlaying ? 'Pausar' : 'Reproducir todo'}
                >
                  {isViewPlaying ? (
                    <Pause size={22} fill="white" />
                  ) : (
                    <Play size={22} fill="white" className="ml-0.5" />
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* LOADING SPINNER IF DATA IS BEING FETCHED */}
        {isLoading && (!viewTracks || viewTracks.length === 0) ? (
          <MobileLoadingState
            message={
              isArtistProfile
                ? 'Cargando discografía de SoundCloud y YouTube...'
                : 'Cargando canciones...'
            }
          />
        ) : viewTitle === 'Artistas Seguidos' ? (
          /* ARTIST CARDS GRID FOR ARTISTAS SEGUIDOS */
          <div className="grid grid-cols-2 gap-3">
            {(viewTracks || follows || []).map((artist: any) => {
              const avatar = artist.avatar_url
                ? artist.avatar_url.replace('-large', '-t300x300')
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    artist.username || 'Artist'
                  )}&background=3b82f6&color=fff&size=128`;

              return (
                <div
                  key={artist.id}
                  onClick={() => scProps.openArtistProfile && scProps.openArtistProfile(artist)}
                  className="flex items-center gap-3 p-3 bg-white/5 active:bg-white/10 rounded-2xl border border-white/5 cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-neutral-900 flex-shrink-0">
                    <img src={avatar} alt={artist.username} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white truncate block">
                      {artist.username}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">
                      {artist.followers_count > 0
                        ? `${new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(
                            artist.followers_count
                          )} seguidores`
                        : 'Artista'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TRACK LIST */
          <div className="space-y-1">
            {filteredTracks.map((track, idx) => (
              <MobileTrackItem
                key={`${track.id}-${idx}`}
                track={track}
                index={idx}
                showIndex={true}
                onPlay={playTrack}
                onOpenContext={onOpenContext}
              />
            ))}

            {filteredTracks.length === 0 && !isLoading && (
              <div className="py-20 text-center text-neutral-500">
                <Disc3 size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">No se encontraron canciones en esta lista</p>
              </div>
            )}

            {/* LOAD MORE BUTTON FOR YT LIKES */}
            {viewTitle.includes('YouTube') && loadMoreYtLikes && (
              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={loadMoreYtLikes}
                  className="px-5 py-2.5 bg-white/10 active:bg-white/20 rounded-2xl text-xs font-bold text-neutral-200"
                >
                  Cargar más canciones de YouTube
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

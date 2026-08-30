import React, { useState } from 'react';
import { Search, X, Loader2, User, ListMusic, Sparkles, Flame, Radio } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { MobileTrackItem } from '../components/MobileTrackItem';
import { MobileLoadingState } from '../components/MobileLoadingState';

interface MobileSearchViewProps {
  scProps: {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    handleSearch: (e: any, force?: boolean) => void;
    isSearching: boolean;
    openArtistProfile: (user: any) => void;
    openPlaylist: (playlist: any, title?: string, isResonance?: boolean) => void;
  };
  audioProps: {
    playTrack: (track: any) => void;
  };
  onOpenContext: (track: any) => void;
}

type SearchFilter = 'all' | 'tracks' | 'artists' | 'playlists';

export function MobileSearchView({
  scProps,
  audioProps,
  onOpenContext,
}: MobileSearchViewProps) {
  const {
    searchQuery,
    setSearchQuery,
    handleSearch,
    isSearching,
    openArtistProfile,
    openPlaylist,
  } = scProps;
  const { playTrack } = audioProps;
  const { viewTracks, viewUsers, viewPlaylists } = usePlayerStore();

  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');

  const genres = [
    { name: 'Phonk', color: 'from-purple-900 to-indigo-900' },
    { name: 'Hardstyle', color: 'from-red-900 to-amber-900' },
    { name: 'Electronic', color: 'from-blue-900 to-cyan-900' },
    { name: 'Hip Hop', color: 'from-amber-900 to-orange-900' },
    { name: 'Lo-Fi', color: 'from-emerald-900 to-teal-900' },
    { name: 'Synthwave', color: 'from-pink-900 to-purple-900' },
  ];

  const handleGenreClick = (genreName: string) => {
    setSearchQuery(genreName);
    const fakeEvent = { preventDefault: () => {} };
    handleSearch(fakeEvent, false);
  };

  // Debounced auto-search as the user types
  React.useEffect(() => {
    if (!searchQuery || !searchQuery.trim()) return;
    const timer = setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} };
      handleSearch(fakeEvent, false);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const hasResults =
    (viewTracks && viewTracks.length > 0) ||
    (viewUsers && viewUsers.length > 0) ||
    (viewPlaylists && viewPlaylists.length > 0);

  return (
    <div className="h-full w-full overflow-y-auto pt-[env(safe-area-inset-top,12px)] pb-[calc(env(safe-area-inset-bottom,0px)+80px)] px-4 space-y-4 select-none scrollbar-none">
      {/* HEADER */}
      <header>
        <span className="text-[10px] font-bold tracking-widest text-accent uppercase">
          Multiverso SC + YT
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight">Buscar</h1>
      </header>

      {/* SEARCH BAR */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(e, true);
        }}
        className="relative"
      >
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
        />
        <input
          type="search"
          placeholder="Canciones, artistas, álbumes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-neutral-900/90 border border-white/10 rounded-2xl py-3.5 pl-11 pr-10 text-white placeholder-neutral-500 focus:outline-none focus:border-accent text-sm shadow-inner transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-white bg-white/5 rounded-full"
          >
            <X size={14} />
          </button>
        )}
      </form>

      {/* FILTER PILLS (Only shown if we have a search query or results) */}
      {(searchQuery || hasResults) && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'Todo' },
            { id: 'tracks', label: `Canciones (${viewTracks?.length || 0})` },
            { id: 'artists', label: `Artistas (${viewUsers?.length || 0})` },
            { id: 'playlists', label: `Playlists (${viewPlaylists?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as SearchFilter)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                activeFilter === tab.id
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'bg-white/5 text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* LOADING STATE */}
      {isSearching && (
        <MobileLoadingState message="Escaneando SoundCloud y YouTube..." className="py-20" />
      )}

      {/* RESULTS LIST */}
      {!isSearching && hasResults && (
        <div className="space-y-6">
          {/* ARTISTS SECTION */}
          {(activeFilter === 'all' || activeFilter === 'artists') && (
            <section className="space-y-2.5">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Artistas {viewUsers?.length ? `(${viewUsers.length})` : ''}
              </h3>
              {viewUsers && viewUsers.length > 0 ? (
                activeFilter === 'artists' ? (
                  /* FULL GRID WHEN IN ARTISTS TAB */
                  <div className="grid grid-cols-2 gap-3">
                    {viewUsers.map((user: any) => {
                      const avatar = user.avatar_url
                        ? user.avatar_url.replace('-large', '-t300x300')
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            user.username || 'Artist'
                          )}&background=3b82f6&color=fff&size=128`;

                      return (
                        <div
                          key={user.id}
                          onClick={() => openArtistProfile(user)}
                          className="flex items-center gap-3 p-3 bg-white/5 active:bg-white/10 rounded-2xl border border-white/5 cursor-pointer active:scale-95 transition-transform"
                        >
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-neutral-900 flex-shrink-0">
                            <img
                              src={avatar}
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white truncate block">
                              {user.username}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">
                              {user.followers_count > 0
                                ? `${new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(
                                    user.followers_count
                                  )} seguidores`
                                : 'Artista'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* HORIZONTAL ROW WHEN IN ALL TAB */
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
                    {viewUsers.map((user: any) => {
                      const avatar = user.avatar_url
                        ? user.avatar_url.replace('-large', '-t300x300')
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            user.username || 'Artist'
                          )}&background=3b82f6&color=fff&size=128`;

                      return (
                        <div
                          key={user.id}
                          onClick={() => openArtistProfile(user)}
                          className="flex flex-col items-center flex-shrink-0 w-20 group cursor-pointer active:scale-95 transition-transform"
                        >
                          <div className="w-18 h-18 rounded-full overflow-hidden border-2 border-white/10 bg-neutral-900 shadow-md p-0.5">
                            <img
                              src={avatar}
                              alt={user.username}
                              className="w-full h-full object-cover rounded-full"
                            />
                          </div>
                          <span className="text-xs font-semibold text-white truncate w-full text-center mt-1">
                            {user.username}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : activeFilter === 'artists' ? (
                <p className="text-center py-10 text-neutral-500 text-xs">
                  No se encontraron artistas para esta búsqueda
                </p>
              ) : null}
            </section>
          )}

          {/* TRACKS LIST */}
          {(activeFilter === 'all' || activeFilter === 'tracks') && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Canciones {viewTracks?.length ? `(${viewTracks.length})` : ''}
              </h3>
              {viewTracks && viewTracks.length > 0 ? (
                <div className="space-y-1">
                  {viewTracks.map((track: any, idx: number) => (
                    <MobileTrackItem
                      key={`${track.id}-${idx}`}
                      track={track}
                      onPlay={playTrack}
                      onOpenContext={onOpenContext}
                    />
                  ))}
                </div>
              ) : activeFilter === 'tracks' ? (
                <p className="text-center py-10 text-neutral-500 text-xs">
                  No se encontraron canciones para esta búsqueda
                </p>
              ) : null}
            </section>
          )}

          {/* PLAYLISTS LIST */}
          {(activeFilter === 'all' || activeFilter === 'playlists') && (
            <section className="space-y-2.5">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Playlists {viewPlaylists?.length ? `(${viewPlaylists.length})` : ''}
              </h3>
              {viewPlaylists && viewPlaylists.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {viewPlaylists.map((pl: any) => (
                    <div
                      key={pl.id}
                      onClick={() => openPlaylist(pl, pl.title)}
                      className="p-3 bg-white/5 hover:bg-white/10 active:scale-[0.98] rounded-2xl border border-white/5 transition-all cursor-pointer"
                    >
                      <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center mb-2 shadow-md overflow-hidden">
                        {pl.artwork_url ? (
                          <img
                            src={pl.artwork_url.replace('-large', '-t300x300')}
                            alt={pl.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ListMusic size={24} className="text-white/70" />
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-white truncate">{pl.title}</h4>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                        {pl.track_count ? `${pl.track_count} canciones • ` : ''}
                        {pl.user?.username || 'SoundCloud'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : activeFilter === 'playlists' ? (
                <p className="text-center py-10 text-neutral-500 text-xs">
                  No se encontraron playlists para esta búsqueda
                </p>
              ) : null}
            </section>
          )}
        </div>
      )}

      {/* EMPTY DISCOVERY STATE */}
      {!isSearching && !hasResults && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 text-neutral-400">
            <Sparkles size={16} className="text-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Explora por género</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {genres.map((g) => (
              <div
                key={g.name}
                onClick={() => handleGenreClick(g.name)}
                className={`p-4 rounded-2xl bg-gradient-to-br ${g.color} border border-white/10 shadow-lg cursor-pointer active:scale-95 transition-all`}
              >
                <h4 className="text-base font-black text-white">{g.name}</h4>
                <span className="text-[10px] text-white/60 font-semibold">Tocar para buscar</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import {
  Heart,
  History,
  ListMusic,
  User,
  Plus,
  Trash2,
  Upload,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Music2,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

interface MobileLibraryViewProps {
  scProps: {
    likes: any[];
    scLikes: any[];
    ytLikes: any[];
    resonancePlaylists: any[];
    playlists: any[];
    follows: any[];
    deletedHistory: Record<string, any[]>;
    recoverTrack: (track: any, source: string) => void;
    deletePlaylist: (id: string) => void;
    openPlaylist: (playlist: any, title?: string, isResonance?: boolean) => void;
    openView: (title: string, tracks?: any[]) => void;
    openArtistProfile: (user: any) => void;
  };
  onCreatePlaylist: () => void;
}

type LibraryFilter = 'all' | 'playlists' | 'likes' | 'artists' | 'lazaro';

export function MobileLibraryView({
  scProps,
  onCreatePlaylist,
}: MobileLibraryViewProps) {
  const {
    likes,
    scLikes,
    ytLikes,
    resonancePlaylists,
    playlists,
    follows,
    deletedHistory,
    recoverTrack,
    deletePlaylist,
    openPlaylist,
    openView,
    openArtistProfile,
  } = scProps;

  const { localTracks } = usePlayerStore();
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>('all');

  const totalDeletedCount = Object.values(deletedHistory || {}).reduce(
    (acc, arr) => acc + (arr?.length || 0),
    0
  );

  return (
    <div className="h-full w-full overflow-y-auto pt-[max(env(safe-area-inset-top,0px),16px)] pb-36 px-4 space-y-5 select-none">
      {/* HEADER */}
      <header className="flex items-center justify-between pt-2">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-accent uppercase">
            Colección Unificada
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">Tu Biblioteca</h1>
        </div>

        <button
          type="button"
          onClick={onCreatePlaylist}
          className="flex items-center gap-1 px-3 py-2 bg-accent text-white font-bold text-xs rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)] active:scale-95 transition-all"
        >
          <Plus size={16} /> Playlist
        </button>
      </header>

      {/* FILTER PILLS */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Todo' },
          { id: 'playlists', label: `Playlists (${(resonancePlaylists?.length || 0) + (playlists?.length || 0)})` },
          { id: 'likes', label: 'Me Gusta' },
          { id: 'artists', label: `Artistas (${follows?.length || 0})` },
          ...(totalDeletedCount > 0
            ? [{ id: 'lazaro', label: `Lázaro (${totalDeletedCount})` }]
            : []),
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id as LibraryFilter)}
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

      {/* SECTION 1: LIKES CARDS (If all or likes) */}
      {(activeFilter === 'all' || activeFilter === 'likes') && (
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Colecciones de Me Gusta
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {/* TUS ME GUSTA (RESONANCE) */}
            <div
              onClick={() => openView('Tus Me Gusta', likes)}
              className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900/60 to-neutral-900 border border-emerald-500/30 shadow-lg cursor-pointer active:scale-95 transition-all flex flex-col justify-between h-32"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Heart size={22} fill="currentColor" />
              </div>
              <div>
                <h4 className="font-black text-sm text-white">Tus Me Gusta</h4>
                <p className="text-[11px] text-emerald-400/90 font-semibold mt-0.5">
                  {likes?.length || 0} canciones
                </p>
              </div>
            </div>

            {/* SOUNDCLOUD LIKES */}
            <div
              onClick={() => openView('Me Gusta (SoundCloud)', scLikes)}
              className="p-4 rounded-2xl bg-gradient-to-br from-amber-900/60 to-neutral-900 border border-amber-500/30 shadow-lg cursor-pointer active:scale-95 transition-all flex flex-col justify-between h-32"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm">
                SC
              </div>
              <div>
                <h4 className="font-black text-sm text-white">SoundCloud</h4>
                <p className="text-[11px] text-amber-400/90 font-semibold mt-0.5">
                  {scLikes?.length || 0} canciones
                </p>
              </div>
            </div>

            {/* YOUTUBE LIKES */}
            <div
              onClick={() => openView('Me Gusta (YouTube)', ytLikes)}
              className="p-4 rounded-2xl bg-gradient-to-br from-red-900/60 to-neutral-900 border border-red-500/30 shadow-lg cursor-pointer active:scale-95 transition-all flex flex-col justify-between h-32"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-black text-sm">
                YT
              </div>
              <div>
                <h4 className="font-black text-sm text-white">YouTube</h4>
                <p className="text-[11px] text-red-400/90 font-semibold mt-0.5">
                  {ytLikes?.length || 0} canciones
                </p>
              </div>
            </div>

            {/* HISTORIAL */}
            <div
              onClick={() => openView('Historial de Reproducción', [])}
              className="p-4 rounded-2xl bg-gradient-to-br from-blue-900/60 to-neutral-900 border border-blue-500/30 shadow-lg cursor-pointer active:scale-95 transition-all flex flex-col justify-between h-32"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <History size={22} />
              </div>
              <div>
                <h4 className="font-black text-sm text-white">Historial</h4>
                <p className="text-[11px] text-blue-400/90 font-semibold mt-0.5">
                  Recientes
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 2: PLAYLISTS (If all or playlists) */}
      {(activeFilter === 'all' || activeFilter === 'playlists') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Playlists de Resonance
            </h3>
          </div>

          <div className="space-y-2">
            {resonancePlaylists && resonancePlaylists.length > 0 ? (
              resonancePlaylists.map((pl: any) => (
                <div
                  key={pl.id}
                  onClick={() => openPlaylist(pl, pl.title, true)}
                  className="flex items-center justify-between p-3.5 bg-white/5 hover:bg-white/10 active:bg-white/15 rounded-2xl border border-white/5 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-md flex-shrink-0">
                      <ListMusic size={22} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-white truncate">{pl.title}</h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {pl.tracks?.length || 0} canciones
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`¿Eliminar la playlist "${pl.title}"?`)) {
                        deletePlaylist(pl.id);
                      }
                    }}
                    className="p-2 text-neutral-500 hover:text-red-400 active:scale-90 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center">
                <ListMusic size={28} className="mx-auto text-neutral-500 mb-2 opacity-50" />
                <p className="text-xs text-neutral-400 font-medium mb-3">
                  No tienes playlists personalizadas todavía.
                </p>
                <button
                  type="button"
                  onClick={onCreatePlaylist}
                  className="px-4 py-2 bg-white/10 active:bg-white/20 text-white font-bold text-xs rounded-xl"
                >
                  Crear mi primera playlist
                </button>
              </div>
            )}

            {/* IMPORTED SC & YT PLAYLISTS */}
            {playlists && playlists.length > 0 && (
              <div className="pt-4 space-y-2">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Playlists Importadas de Cuentas
                </h4>
                {playlists.map((pl: any) => (
                  <div
                    key={pl.id}
                    onClick={() => openPlaylist(pl, pl.title)}
                    className="flex items-center gap-3.5 p-3 bg-white/5 hover:bg-white/10 active:bg-white/15 rounded-2xl border border-white/5 transition-all cursor-pointer"
                  >
                    <img
                      src={
                        pl.artwork_url
                          ? pl.artwork_url.replace('-large', '-t50x50')
                          : 'https://placehold.co/50x50/18181b/ffffff?text=PL'
                      }
                      alt=""
                      className="w-11 h-11 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-sm text-white truncate">{pl.title}</h5>
                      <p className="text-xs text-neutral-400 truncate mt-0.5">
                        {pl.track_count || pl.tracks?.length || 0} canciones • {pl.user?.username || 'SoundCloud'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* SECTION 3: ARTISTS (If all or artists) */}
      {(activeFilter === 'all' || activeFilter === 'artists') && (
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Artistas Seguidos ({follows?.length || 0})
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {follows && follows.length > 0 ? (
              follows.map((artist: any) => {
                const avatar = artist.avatar_url
                  ? artist.avatar_url.replace('-large', '-t300x300')
                  : 'https://placehold.co/100x100/18181b/ffffff?text=👤';

                return (
                  <div
                    key={artist.id}
                    onClick={() => openArtistProfile(artist)}
                    className="p-3 bg-white/5 hover:bg-white/10 active:scale-[0.98] rounded-2xl border border-white/5 flex items-center gap-3 cursor-pointer transition-all"
                  >
                    <img
                      src={avatar}
                      alt={artist.username}
                      className="w-12 h-12 rounded-full object-cover border border-white/10"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-white truncate">{artist.username}</h4>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Artista</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="col-span-2 text-center py-6 text-neutral-500 text-xs">
                No sigues a ningún artista todavía
              </p>
            )}
          </div>
        </section>
      )}

      {/* SECTION 4: MOTOR LÁZARO (If lazaro or all with deleted) */}
      {(activeFilter === 'all' || activeFilter === 'lazaro') && totalDeletedCount > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <RotateCcw size={16} className="text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Motor Lázaro (Pistas Eliminadas)
            </h3>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <p className="text-xs text-amber-200/80 mb-2">
              Puedes restaurar canciones que hayas borrado recientemente de tus listas.
            </p>
            {Object.entries(deletedHistory).map(([listTitle, tracks]) =>
              (tracks || []).map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-bold text-white truncate">{t.title}</p>
                    <p className="text-[10px] text-neutral-400 truncate">Origen: {listTitle}</p>
                  </div>
                  <button
                    onClick={() => recoverTrack(t, listTitle)}
                    className="px-2.5 py-1.5 bg-amber-500 text-black font-bold text-xs rounded-lg active:scale-95"
                  >
                    Recuperar
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

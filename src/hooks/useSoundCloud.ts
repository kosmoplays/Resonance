import { useState } from "react";
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { usePlayerStore } from "../store/usePlayerStore";
import YTMusic from "ytmusic-api";

const ytmusic = new YTMusic();

// Importamos nuestros 3 micro-cerebros modulares


import { useResonanceLibrary } from "./useResonanceLibrary";
import { useSearchEngine } from "./useSearchEngine";
import { useArtistProfile } from "./useArtistProfile";

const CLIENT_ID = "lmRjTI0FqeXygHMXc3hRzS7hth20PNk5";
const getScToken = () => localStorage.getItem("soundcloud_oauth_token") || "";

export function useSoundCloud(isOffline: boolean) {

  const [viewTitle, setViewTitle] = useState<string>("Inicio");
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);

  const library = useResonanceLibrary(isOffline, viewTitle, setPlaylists);

  const profile = useArtistProfile(
    isOffline,
    (val) => searchEngine.setIsSearching(val),
    (title, tracks, users) => {
      setViewTitle(title);
      usePlayerStore.getState().setViewTracks(tracks);
      usePlayerStore.getState().setViewUsers(users);
    },
    viewTitle
  );

  // Función puente para actualizar la vista principal de manera segura
  const safeOpenView = (title: string, tracks: any[], users: any[] = []) => {
    if (!title.startsWith("Perfil:")) profile.viewHistoryRef.current = [];
    setViewTitle(title);
    usePlayerStore.getState().setViewTracks(tracks);
    usePlayerStore.getState().setViewUsers(users);
    usePlayerStore.getState().setViewPlaylists([]); // Purga de playlists
  };

  const searchEngine = useSearchEngine(isOffline, safeOpenView, viewTitle);

  const openPlaylist = async (playlist: any) => {
    if (isOffline) return;

    const scrollContainer = document.querySelector('.profile-bg-wrapper');
    profile.viewHistoryRef.current.push({
      title: viewTitle,
      tracks: usePlayerStore.getState().viewTracks,
      users: usePlayerStore.getState().viewUsers,
      scrollTop: scrollContainer ? scrollContainer.scrollTop : 0
    });

    setViewTitle(playlist.title);
    setIsLoadingTracks(true);
    usePlayerStore.getState().setViewTracks([]);

    const filterPlayableTracks = (tracks: any[]) => tracks.filter((t: any) => t && t.media && t.media.transcodings && t.snipped !== true && t.policy !== "BLOCK");

    try {
        if (playlist.provider === 'youtube') {
          // 1. EXTRACCIÓN PROFUNDA YOUTUBE MUSIC
          try {
            await ytmusic.initialize();
            let plData: any = null;
            
            // Los IDs de YT Music pueden ser Álbumes o Playlists, intentamos ambos (Fallo silencioso cruzado)
            try {
              plData = await ytmusic.getAlbum(playlist.yt_playlistId);
            } catch (e) {
              plData = await ytmusic.getPlaylist(playlist.yt_playlistId);
            }

            if (plData && plData.songs) {
              const ytTracks = plData.songs.map((v: any) => {
                const thumbs = v.thumbnails || plData.thumbnails || [];
                const finalThumb = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : 'https://placehold.co/500x500/1a1a1a/333333?text=YT';
                return {
                  id: `yt-${v.videoId}`,
                  title: v.name,
                  user: { username: v.artists?.map((a:any) => a.name).join(', ') || plData.name || 'Desconocido', provider: 'youtube' },
                  artwork_url: finalThumb,
                  playback_count: 0,
                  provider: 'youtube',
                  yt_videoId: v.videoId
                };
              });
              usePlayerStore.getState().setViewTracks(ytTracks);
            }
          } catch (err) {
            console.error("Error obteniendo playlist de YT Music:", err);
          }
        } else if (playlist.provider === 'resonance') {
        usePlayerStore.getState().setViewTracks(playlist.tracks || []);
      } else {
        const rawTracks = playlist.tracks || [];
        const hydratedTracks = rawTracks.filter((t: any) => t.media);
        usePlayerStore.getState().setViewTracks(filterPlayableTracks(hydratedTracks));

        const missingIds = rawTracks.filter((t: any) => !t.media).map((t: any) => t.id);
        if (missingIds.length > 0) {
          let fetchedTracks: any[] = [];
          for (let i = 0; i < missingIds.length; i += 50) {
            const chunk = missingIds.slice(i, i + 50).join('%2C');
            const res = await tauriFetch(`https://api-v2.soundcloud.com/tracks?ids=${chunk}&client_id=${CLIENT_ID}`, { headers: { Authorization: `OAuth ${getScToken()}` } });
            if (res.ok) {
              const data = await res.json();
              fetchedTracks = [...fetchedTracks, ...data];
            }
          }
          const allTracks = [...hydratedTracks, ...fetchedTracks];
          usePlayerStore.getState().setViewTracks(filterPlayableTracks(allTracks));
          setPlaylists(prev => prev.map(p => p.id === playlist.id ? { ...p, tracks: allTracks } : p));
        }
      }
    } catch (error) {
      console.error("Error abriendo Álbum/Playlist:", error);
    }

    setIsLoadingTracks(false);
  };

  // --- EL ENCHUFE FINAL ---
  // Devolvemos el mismo objeto exacto que esperaba App.tsx, extrayendo
  // las funciones correspondientes de cada micro-cerebro.
  return {
    viewTitle, isLoadingTracks, playlists, openPlaylist, openView: safeOpenView,
    
    // Conexiones de la Base de Datos
    likes: library.likes,
    scLikes: library.scLikes,
    ytLikes: library.ytLikes,
    resonancePlaylists: library.resonancePlaylists,
    follows: library.follows,
    deletedHistory: library.deletedHistory,
    recoverTrack: library.recoverTrack,
    loadLibrary: library.loadLibrary,
    loadMoreYtLikes: library.loadMoreYtLikes,
    createPlaylist: library.createPlaylist,
    updatePlaylist: library.updatePlaylist,
    deletePlaylist: library.deletePlaylist,
    addTrackToPlaylist: library.addTrackToPlaylist,
    removeTrackFromPlaylist: library.removeTrackFromPlaylist,
    toggleFollow: library.toggleFollow,
    toggleLike: library.toggleLike,
    removeLikeExternal: library.removeLikeExternal,
    
    // Conexiones del Motor de Búsqueda
    searchQuery: searchEngine.searchQuery,
    setSearchQuery: searchEngine.setSearchQuery,
    isSearching: searchEngine.isSearching,
    handleSearch: searchEngine.handleSearch,
    
    // Conexiones del Perfil del Artista
    openArtistProfile: profile.openArtistProfile,
    goBack: profile.goBack
  };
}

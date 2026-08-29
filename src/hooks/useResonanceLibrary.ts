import { useState, useRef } from "react";
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { usePlayerStore, Track } from "../store/usePlayerStore";
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
export interface Playlist { 
  id: number; 
  title: string; 
  tracks: Track[]; 
  artwork_url: string; 
}
const CLIENT_ID = "lmRjTI0FqeXygHMXc3hRzS7hth20PNk5";
const getScToken = () => localStorage.getItem("soundcloud_oauth_token") || "";

export function useResonanceLibrary(isOffline: boolean, viewTitle: string, setPlaylists: any) {
  const [likes, setLikes] = useState<Track[]>([]);
  const [scLikes, setScLikes] = useState<Track[]>([]);
  const [ytLikes, setYtLikes] = useState<any[]>([]); // 🛡️ Tipado dinámico para admitir la estructura nativa de YouTube
  const [ytNextPageToken, setYtNextPageToken] = useState<string | null>(null);
  const isFetchingYtRef = useRef(false);
  const [resonancePlaylists, setResonancePlaylists] = useState<any[]>([]);
  const [follows, setFollows] = useState<any[]>([]);

  // 🛡️ MEMORIA DE ELIMINADOS (Lista Negra y Motor Lázaro)
  const [deletedHistory, setDeletedHistory] = useState<Record<string, any[]>>(() => {
    try { return JSON.parse(localStorage.getItem('resonance_deleted_history') || '{}'); }
    catch { return {}; }
  });

  const addToDeletedHistory = (listId: string, track: any) => {
    setDeletedHistory(prev => {
      const currentList = prev[listId] || [];
      if (currentList.some(t => t.id === track.id)) return prev;
      // Guardamos un máximo de 30 canciones borradas por lista para no saturar memoria
      const updated = { ...prev, [listId]: [track, ...currentList].slice(0, 30) };
      localStorage.setItem('resonance_deleted_history', JSON.stringify(updated));
      return updated;
    });
  };

  const filterPlayableTracks = (tracks: any[]) => {
    return tracks.filter((t: any) => t && t.media && t.media.transcodings && t.snipped !== true && t.policy !== "BLOCK");
  };

  const loadLibrary = async () => {
      if (isOffline) return;
      try {
        const user = useAuthStore.getState().user;
        if (!user) return;

        // 1. EXTRACCIÓN NÚCLEO SUPABASE (Resonance)
        const [likesRes, playlistsDbRes, followsDbRes] = await Promise.all([
          supabase.from('resonance_likes').select('track_data').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('resonance_playlists').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('resonance_follows').select('artist_data').eq('user_id', user.id).order('created_at', { ascending: false })
        ]);

        if (likesRes.error) throw likesRes.error;
        if (playlistsDbRes.error) throw playlistsDbRes.error;
        if (followsDbRes.error) throw followsDbRes.error;

        let finalLikes = likesRes.data.map((row: any) => row.track_data);
        let finalPlaylists: any[] = [];

        setResonancePlaylists(playlistsDbRes.data);
        setFollows(followsDbRes.data.map((row: any) => row.artist_data));

        // 2. EXTRACCIÓN SOUNDCLOUD (Cuentas Nativas)
        try {
          const meRes = await tauriFetch(`https://api-v2.soundcloud.com/me?client_id=${CLIENT_ID}`, { headers: { Authorization: `OAuth ${getScToken()}` } });
          if (meRes.ok) {
            const myUserId = (await meRes.json()).id;
            const [playlistsRes, scLikesRes] = await Promise.all([
              tauriFetch(`https://api-v2.soundcloud.com/users/${myUserId}/playlists?client_id=${CLIENT_ID}&limit=50`, { headers: { Authorization: `OAuth ${getScToken()}` } }),
              tauriFetch(`https://api-v2.soundcloud.com/users/${myUserId}/likes?client_id=${CLIENT_ID}&limit=100`, { headers: { Authorization: `OAuth ${getScToken()}` } })
            ]);

            if (playlistsRes.ok) {
              const playlistsData = await playlistsRes.json();
              finalPlaylists = [...finalPlaylists, ...(playlistsData.collection || []).map((p: any) => ({ ...p, provider: 'soundcloud' }))];
            }
            if (scLikesRes.ok) {
              const scLikesData = await scLikesRes.json();
              const playableScLikes = filterPlayableTracks(
                scLikesData.collection.map((item: any) => {
                  const t = item.track;
                  // Fallback: si el track no tiene artwork, usar el avatar del artista (SC a veces devuelve null)
                  if (t && !t.artwork_url && t.user?.avatar_url) {
                    t.artwork_url = t.user.avatar_url.replace('-large', '-t500x500');
                  } else if (t?.artwork_url) {
                    t.artwork_url = t.artwork_url.replace('-large', '-t500x500');
                  }
                  return t;
                })
              );
              const scHistory = JSON.parse(localStorage.getItem('resonance_deleted_history') || '{}')["Me Gusta (SoundCloud)"] || [];
              setScLikes(playableScLikes.filter((t: any) => !scHistory.some((d: any) => d.id === t.id)));
            }
          }
        } catch (e) { console.error("Error SC Library:", e); }

        // 3. EXTRACCIÓN YOUTUBE (Cuentas Vinculadas mediante OAuth)
        let ytToken = localStorage.getItem("youtube_access_token");
        const ytRefreshToken = localStorage.getItem("youtube_refresh_token");

        if (ytToken || ytRefreshToken) {
          try {
            // 🛡️ MOTOR DE AUTO-RENOVACIÓN: Si el token principal no está, forjamos uno nuevo en la sombra
            if (!ytToken && ytRefreshToken) {
               console.warn("🛡️ Token caducado. Forjando nueva llave maestra en la sombra...");
               const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: new URLSearchParams({
                     client_id: "237657675945-gs5o7vfoi2i5c7lu86q8u4c8jb56rcle.apps.googleusercontent.com",
                     client_secret: "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",
                     refresh_token: ytRefreshToken,
                     grant_type: "refresh_token"
                  })
               });
               const refreshData = await refreshRes.json();
               if (refreshData.access_token) {
                   ytToken = refreshData.access_token;
                   localStorage.setItem("youtube_access_token", String(ytToken));
               }
            }

            // 🚀 PAGINACIÓN DINÁMICA: Pedimos solo la primera página y guardamos la llave para el scroll
            let allYtLikes: any[] = [];
            let likesPageRes = await tauriFetch(`https://www.googleapis.com/youtube/v3/videos?myRating=like&part=snippet,contentDetails&maxResults=50`, { headers: { Authorization: `Bearer ${ytToken}` } });
            
            // 🛡️ INTERCEPTOR EN VUELO: Si caducó mientras la app estaba abierta (401), renovamos y reintentamos al instante
            if (likesPageRes.status === 401 && ytRefreshToken) {
               console.warn("🛡️ Intercepción 401 en vuelo. Reactivando token...");
               const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: new URLSearchParams({
                     client_id: "237657675945-gs5o7vfoi2i5c7lu86q8u4c8jb56rcle.apps.googleusercontent.com",
                     client_secret: "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",
                     refresh_token: ytRefreshToken,
                     grant_type: "refresh_token"
                  })
               });
               const refreshData = await refreshRes.json();
               if (refreshData.access_token) {
                   ytToken = refreshData.access_token;
                   localStorage.setItem("youtube_access_token", String(ytToken));
                   // Reintento táctico sin que el usuario lo note
                   likesPageRes = await tauriFetch(`https://www.googleapis.com/youtube/v3/videos?myRating=like&part=snippet,contentDetails&maxResults=50`, { headers: { Authorization: `Bearer ${ytToken}` } });
               }
            }

            if (likesPageRes.ok) {
               const data = await likesPageRes.json();
               allYtLikes = data.items || [];
               setYtNextPageToken(data.nextPageToken || null);
            } else {
               const errText = await likesPageRes.text();
               console.error("🔴 Error API YouTube (Likes):", errText);
               if (likesPageRes.status === 401 || errText.includes("401")) {
                   console.warn("🛡 Auto-Purga: Token de YouTube expirado. Se requiere re-vinculación.");
                   localStorage.removeItem("youtube_access_token");
                   window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Token de YouTube expirado. Ve a Perfil para re-vincular.', type: 'error' } }));
               }
             }

            const garbageRegex = /(interview|vlog|podcast|teaser|trailer|full album|making of|tour|behind the scenes|short|snippet)/i;
            const parseIsoDuration = (iso: string) => {
              const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
              if (!match) return 0;
              const h = parseInt(match[1] || '0', 10);
              const m = parseInt(match[2] || '0', 10);
              const s = parseInt(match[3] || '0', 10);
              return (h * 3600) + (m * 60) + s;
            };

            const validYtLikes = allYtLikes.filter((v: any) => {
               if (garbageRegex.test(v.snippet?.title)) return false;
               const sec = parseIsoDuration(v.contentDetails?.duration || "");
               if (sec > 0 && (sec < 60 || sec > 1800)) return false; // Eliminar Shorts (<60s) o documentales largos (>30 min)
               return true;
            }).map((v: any) => {
               const thumbs = v.snippet.thumbnails;
               const thumbUrl = thumbs?.maxres?.url || thumbs?.high?.url || thumbs?.standard?.url || thumbs?.default?.url || 'https://placehold.co/500x500/1a1a1a/333333?text=YT';
               return {
                  id: `yt-${v.id}`,
                  title: v.snippet.title,
                  user: { id: `yt-user-${v.snippet.channelId}`, username: v.snippet.channelTitle, provider: 'youtube', yt_id: v.snippet.channelId },
                  artwork_url: thumbUrl,
                  provider: 'youtube',
                  yt_videoId: v.id
               };
            });

             // 🗂 Filtramos lista negra y guardamos estado
            const ytHistory = JSON.parse(localStorage.getItem('resonance_deleted_history') || '{}')["Me Gusta (YouTube)"] || [];
            setYtLikes(validYtLikes.filter((t: any) => !ytHistory.some((d: any) => d.id === t.id)));

            const ytPlaylistsRes = await tauriFetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50", { headers: { Authorization: `Bearer ${ytToken}` } });
            
            if (ytPlaylistsRes.ok) {
              const ytPlData = await ytPlaylistsRes.json();
              const ytPlaylistsFormat = (ytPlData.items || []).map((p: any) => {
                 const thumbs = p.snippet.thumbnails;
                 const thumbUrl = thumbs?.maxres?.url || thumbs?.high?.url || thumbs?.standard?.url || thumbs?.default?.url || 'https://placehold.co/500x500/1a1a1a/333333?text=YT';
                 return {
                    id: `yt-pl-${p.id}`,
                    title: p.snippet.title,
                    tracks: [], // Se hidratan automáticamente al abrirlas
                    artwork_url: thumbUrl,
                    provider: 'youtube',
                    yt_playlistId: p.id
                 };
              });
              finalPlaylists = [...finalPlaylists, ...ytPlaylistsFormat];
            } else {
              console.error("🔴 Error API YouTube (Playlists):", await ytPlaylistsRes.text());
            }
          } catch (e) { console.error("Error YT Library:", e); }
        }

        // --- DEDUPLICACIÓN MAESTRA DE LA BIBLIOTECA ---
        const uniqueLikesMap = new Map();
        finalLikes.forEach(t => {
          if (t && t.id && !uniqueLikesMap.has(t.id)) uniqueLikesMap.set(t.id, t);
        });
        let finalUniqueLikes = Array.from(uniqueLikesMap.values());
        
        const nativeHistory = JSON.parse(localStorage.getItem('resonance_deleted_history') || '{}')["Tus Me Gusta"] || [];
        finalUniqueLikes = finalUniqueLikes.filter((t: any) => !nativeHistory.some((d: any) => d.id === t.id));

        setLikes(finalUniqueLikes);
        setPlaylists(finalPlaylists);

        // Si ya estabas viendo la ventana de Me Gusta, refrescamos en vivo
        if (viewTitle === "Tus Me Gusta") {
          usePlayerStore.getState().setViewTracks(finalUniqueLikes);
        }

      } catch (error) { console.error("Error cargando librería Resonance:", error); }
    };

  const loadMoreYtLikes = async () => {
    if (!ytNextPageToken || isFetchingYtRef.current) return;
    const ytToken = localStorage.getItem("youtube_access_token");
    if (!ytToken) return;

    isFetchingYtRef.current = true;
    try {
       const res = await tauriFetch(`https://www.googleapis.com/youtube/v3/videos?myRating=like&part=snippet,contentDetails&maxResults=50&pageToken=${ytNextPageToken}`, { headers: { Authorization: `Bearer ${ytToken}` } });
       if (res.ok) {
          const data = await res.json();
          setYtNextPageToken(data.nextPageToken || null);

          const garbageRegex = /(interview|vlog|podcast|teaser|trailer|full album|making of|tour|behind the scenes|short|snippet)/i;
          const parseIsoDuration = (iso: string) => {
                const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                if (!match) return 0;
                const h = parseInt(match[1] || '0', 10);
                const m = parseInt(match[2] || '0', 10);
                const s = parseInt(match[3] || '0', 10);
                return (h * 3600) + (m * 60) + s;
              };

          const newValidLikes = (data.items || []).filter((v: any) => {
             if (garbageRegex.test(v.snippet?.title)) return false;
             const sec = parseIsoDuration(v.contentDetails?.duration || "");
             if (sec > 0 && (sec < 60 || sec > 1800)) return false;
             return true;
          }).map((v: any) => {
             const thumbs = v.snippet.thumbnails;
             const thumbUrl = thumbs?.maxres?.url || thumbs?.high?.url || thumbs?.standard?.url || thumbs?.default?.url || 'https://placehold.co/500x500/1a1a1a/333333?text=YT';
             return {
                id: `yt-${v.id}`,
                title: v.snippet.title,
                user: { id: `yt-user-${v.snippet.channelId}`, username: v.snippet.channelTitle, provider: 'youtube', yt_id: v.snippet.channelId },
                artwork_url: thumbUrl,
                provider: 'youtube',
                yt_videoId: v.id
             };
          });

          const ytHistory = JSON.parse(localStorage.getItem('resonance_deleted_history') || '{}')["Me Gusta (YouTube)"] || [];
          const filteredNewLikes = newValidLikes.filter((t: any) => !ytHistory.some((d: any) => d.id === t.id));

          setYtLikes(prev => {
             const updated = [...prev, ...filteredNewLikes];
             if (viewTitle === "Me Gusta (YouTube)") {
                usePlayerStore.getState().setViewTracks(updated);
             }
             return updated;
          });
       }
    } catch (e) {
       console.error("Error paginación YT:", e);
    }
    isFetchingYtRef.current = false;
  };  

  const createPlaylist = async (title: string) => {
    const user = useAuthStore.getState().user;
    if (!user || !title.trim()) return;
    
    const newPlaylist = { user_id: user.id, title: title.trim(), tracks: [], artwork_url: '' };
    const { data, error } = await supabase.from('resonance_playlists').insert(newPlaylist).select().single();
    
    if (!error && data) {
      setResonancePlaylists(prev => [data, ...prev]);
    } else {
      console.error("Error creando playlist:", error);
    }
  };

  const addTrackToPlaylist = async (playlistId: string, track: Track) => {
    const playlist = resonancePlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    if (playlist.tracks.some((t: any) => t.id === track.id)) return;
    
    const updatedTracks = [...playlist.tracks, track];
    const L = 0;
    const artwork = updatedTracks[L]?.artwork_url || '';
    
    setResonancePlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, tracks: updatedTracks, artwork_url: artwork } : p));
    await supabase.from('resonance_playlists').update({ tracks: updatedTracks, artwork_url: artwork }).eq('id', playlistId);
  };

  // 🛡 MOTOR DE EDICIÓN DE PLAYLISTS
  const updatePlaylist = async (playlistId: string, newTitle: string, newArtwork: string) => {
    setResonancePlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, title: newTitle, artwork_url: newArtwork } : p));
    await supabase.from('resonance_playlists').update({ title: newTitle, artwork_url: newArtwork }).eq('id', playlistId);
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Playlist actualizada con éxito', type: 'success' } }));
  };

  // 🛡️ MÁQUINA DE DESTRUCCIÓN DE PLAYLISTS
  const deletePlaylist = async (playlistId: string) => {
    setResonancePlaylists(prev => prev.filter(p => p.id !== playlistId));
    await supabase.from('resonance_playlists').delete().match({ id: playlistId });
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Playlist destruida', type: 'error' } }));
  };

  // 🛡 EXTIRPADOR DE PISTAS INDIVIDUALES
  const removeTrackFromPlaylist = async (playlistId: string, trackId: string | number) => {
    const playlist = resonancePlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    // Anotar en el historial antes de matar
    const trackToDel = playlist.tracks.find((t: any) => t.id === trackId);
    if (trackToDel) addToDeletedHistory(playlistId, trackToDel);

    const updatedTracks = playlist.tracks.filter((t: any) => t.id !== trackId);
    const L = 0;
    const artwork = updatedTracks.length > 0 ? (updatedTracks[L]?.artwork_url || '') : '';
    
    setResonancePlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, tracks: updatedTracks, artwork_url: artwork } : p));
    if (viewTitle === playlist.title) usePlayerStore.getState().setViewTracks(updatedTracks);
    
    await supabase.from('resonance_playlists').update({ tracks: updatedTracks, artwork_url: artwork }).eq('id', playlistId);
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Pista eliminada', type: 'error' } }));
  };

  const toggleFollow = async (artist: any) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user || !artist || !artist.id) return;

      const safeId = String(artist.id);
      const isFollowing = follows.some(a => String(a.id) === safeId);
      
      if (isFollowing) {
        setFollows(prev => prev.filter(a => String(a.id) !== safeId));
        await supabase.from('resonance_follows').delete().match({ user_id: user.id, artist_id: safeId });
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Dejaste de seguir al creador', type: 'error' } }));
      } else {
        setFollows(prev => [artist, ...prev]);
        await supabase.from('resonance_follows').insert({ user_id: user.id, artist_id: safeId, artist_data: artist });
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Añadido a tus Siguiendo', type: 'success' } }));
      }
    } catch (err) { console.error("Error crítico al seguir artista:", err); }
  };

  const toggleLike = async (track: Track) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const isNativeLiked = likes.some(t => t.id === track.id);
    const isYtLiked = track.provider === 'youtube' && ytLikes.some(t => t.id === track.id);
    const isScLiked = track.provider === 'soundcloud' && scLikes.some(t => t.id === track.id);

    // 🛡️ SISTEMA NATIVO UNIFICADO (RESONANCE)
    // Ya no borramos de YT/SC externos para evitar confusión. 
    // El corazón funciona exclusivamente para la biblioteca nativa "Tus Me Gusta".
    if (isNativeLiked) {
      addToDeletedHistory("Tus Me Gusta", track);
      const newLikes = likes.filter(t => t.id !== track.id);
      setLikes(newLikes);
      if (viewTitle === "Tus Me Gusta") usePlayerStore.getState().setViewTracks(newLikes);
      await supabase.from('resonance_likes').delete().match({ user_id: user.id, track_id: String(track.id) });
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Eliminada de Tus Me Gusta', type: 'error' } }));
    } else {
      const newLikes = [track, ...likes];
      setLikes(newLikes);
      if (viewTitle === "Tus Me Gusta") usePlayerStore.getState().setViewTracks(newLikes);
      await supabase.from('resonance_likes').insert({ user_id: user.id, track_id: String(track.id), track_data: track });
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Añadida a Tus Me Gusta', type: 'success' } }));
    }
  };

  const removeLikeExternal = async (track: Track, listId: string) => {
    if (listId === "Me Gusta (YouTube)") {
      const ytToken = localStorage.getItem("youtube_access_token");
      if (ytToken && (track as any).yt_videoId) {
        addToDeletedHistory("Me Gusta (YouTube)", track);
        await tauriFetch(`https://www.googleapis.com/youtube/v3/videos/rate?id=${(track as any).yt_videoId}&rating=none`, {
          method: 'POST', headers: { Authorization: `Bearer ${ytToken}` }
        });
        const updated = ytLikes.filter(t => t.id !== track.id);
        setYtLikes(updated);
        if (viewTitle === "Me Gusta (YouTube)") usePlayerStore.getState().setViewTracks(updated);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Eliminada de YouTube', type: 'error' } }));
      }
    } else if (listId === "Me Gusta (SoundCloud)") {
      const scToken = getScToken();
      if (scToken) {
        addToDeletedHistory("Me Gusta (SoundCloud)", track);
        await tauriFetch(`https://api-v2.soundcloud.com/likes/tracks/${track.id}?client_id=${CLIENT_ID}`, {
          method: 'DELETE', headers: { Authorization: `OAuth ${scToken}` }
        });
        const updated = scLikes.filter(t => t.id !== track.id);
        setScLikes(updated);
        if (viewTitle === "Me Gusta (SoundCloud)") usePlayerStore.getState().setViewTracks(updated);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Eliminada de SoundCloud', type: 'error' } }));
      }
    } else if (listId === "Tus Me Gusta") {
       // Si lo llaman por error para la lista nativa, reutilizamos toggleLike
       toggleLike(track);
    }
  };

  // 🛡️ MOTOR LÁZARO (Recuperación desde la ultratumba)
  const recoverTrack = async (listId: string, track: any) => {
    // 1. Borramos de la lista negra
    setDeletedHistory(prev => {
      const updated = { ...prev, [listId]: (prev[listId] || []).filter(t => t.id !== track.id) };
      localStorage.setItem('resonance_deleted_history', JSON.stringify(updated));
      return updated;
    });

    // 2. Ejecutamos la petición inversa según el dominio
    if (listId === "Me Gusta (YouTube)") {
      const ytToken = localStorage.getItem("youtube_access_token");
      if (ytToken && track.yt_videoId) {
        await tauriFetch(`https://www.googleapis.com/youtube/v3/videos/rate?id=${track.yt_videoId}&rating=like`, {
          method: 'POST', headers: { Authorization: `Bearer ${ytToken}` }
        });
        setYtLikes(prev => { const n = [track, ...prev]; if (viewTitle === listId) usePlayerStore.getState().setViewTracks(n); return n; });
      }
    } else if (listId === "Me Gusta (SoundCloud)") {
      const scToken = getScToken();
      if (scToken) {
        await tauriFetch(`https://api-v2.soundcloud.com/likes/tracks/${track.id}?client_id=${CLIENT_ID}`, {
          method: 'POST', headers: { Authorization: `OAuth ${scToken}` }
        });
        setScLikes(prev => { const n = [track, ...prev]; if (viewTitle === listId) usePlayerStore.getState().setViewTracks(n); return n; });
      }
    } else if (listId === "Tus Me Gusta") {
      const user = useAuthStore.getState().user;
      if (user) {
        await supabase.from('resonance_likes').insert({ user_id: user.id, track_id: String(track.id), track_data: track });
        setLikes(prev => { const n = [track, ...prev]; if (viewTitle === listId) usePlayerStore.getState().setViewTracks(n); return n; });
      }
    } else {
      // Era una lista normal de Supabase
      await addTrackToPlaylist(listId, track);
    }
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Pista recuperada', type: 'success' } }));
  };

  // 🗑️ OCULTAR DE RESONANCE (Eliminar permanentemente y mandar a Lázaros)
  const hideFromResonance = async (track: any) => {
    if (!track) return;
    const trackIdStr = String(track.id);

    // 1. Guardar en historial de eliminadas bajo "Resonance (Ocultas)"
    addToDeletedHistory('Resonance (Ocultas)', track);

    // 2. Añadir a la lista negra permanente de autoplay
    const currentBlacklist = usePlayerStore.getState().autoplayBlacklist;
    if (!currentBlacklist.includes(trackIdStr)) {
      const updated = [...currentBlacklist, trackIdStr];
      usePlayerStore.setState({ autoplayBlacklist: updated });
      localStorage.setItem('resonance_blacklist', JSON.stringify(updated));
    }

    // 3. Quitar de likes de Resonance si existía
    const user = useAuthStore.getState().user;
    if (user) {
      try {
        await supabase.from('resonance_likes').delete().match({ user_id: user.id, track_id: trackIdStr });
      } catch (e) {}
      setLikes(prev => prev.filter(t => String(t.id) !== trackIdStr));
    }

    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { msg: 'Canción eliminada de Resonance y enviada a Lázaro', type: 'error' }
      })
    );
  };

  return {
    likes, scLikes, ytLikes, resonancePlaylists, follows, deletedHistory, recoverTrack, hideFromResonance,
    loadLibrary, loadMoreYtLikes, createPlaylist, updatePlaylist, deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist, toggleFollow, toggleLike, removeLikeExternal
  };
}


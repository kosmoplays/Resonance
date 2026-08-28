import { useRef } from "react";
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { usePlayerStore } from "../store/usePlayerStore";
import { ytApiFetch } from "../lib/ytToken";
import { supabase } from "../lib/supabase";

const CLIENT_ID = "lmRjTI0FqeXygHMXc3hRzS7hth20PNk5";
const getScToken = () => localStorage.getItem("soundcloud_oauth_token") || "";

export function useArtistProfile(
  isOffline: boolean,
  setIsSearching: (val: boolean) => void,
  openView: (title: string, tracks: any[], users: any[]) => void,
  viewTitle: string
) {
  const profileCacheRef = useRef<Record<string, {tracks: any[], user: any}>>({});
  const viewHistoryRef = useRef<{title: string, tracks: any[], users: any[], scrollTop?: number}[]>([]);

  const viewTitleRef = useRef(viewTitle);
  viewTitleRef.current = viewTitle;

  const goBack = () => {
    if (viewHistoryRef.current.length > 0) {
      const prev = viewHistoryRef.current.pop();
      if (prev) {
        usePlayerStore.getState().setViewTracks(prev.tracks);
        usePlayerStore.getState().setViewUsers(prev.users);
        openView(prev.title, prev.tracks, prev.users);
        setTimeout(() => {
          const scrollContainer = document.querySelector('.profile-bg-wrapper');
          if (scrollContainer) scrollContainer.scrollTop = prev.scrollTop || 0;
        }, 50);
      }
    } else {
      openView("Inicio", [], []);
    }
  };

  const openArtistProfile = async (user: any) => {
    if (isOffline) return;
    setIsSearching(true);
    try {
      if (!viewTitle.startsWith("Perfil:")) {
        viewHistoryRef.current.push({
          title: viewTitle,
          tracks: usePlayerStore.getState().viewTracks,
          users: usePlayerStore.getState().viewUsers
        });
      }

      const safeId = String(user.id);
      const artistName = user.username || user.name || "Artista";

      openView(`Perfil: ${artistName}`, [], [user]);

      // --- RESOLUCIÓN DE IDENTIDAD ---
      // 🛡 INYECCIÓN DE OVERRIDES MANUALES
      const overrides = JSON.parse(localStorage.getItem('resonance_artist_overrides') || '{}');
      let override = overrides[safeId] || overrides[artistName.toLowerCase()];
      
      // Sincronización transparente con Supabase (descarga)
      if (!isOffline && !override) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            const { data: dbOverrides } = await supabase
              .from('resonance_artist_overrides')
              .select('sc_handle, yt_handle, artist_key')
              .eq('user_id', sessionData.session.user.id)
              .in('artist_key', [safeId, artistName.toLowerCase()]);
              
            if (dbOverrides && dbOverrides.length > 0) {
              override = dbOverrides[0];
              // Guardar en caché local para futuros usos sin lag
              overrides[override.artist_key] = override;
              localStorage.setItem('resonance_artist_overrides', JSON.stringify(overrides));
            }
          }
        } catch (e) {
          console.error("Error sincronizando overrides de Supabase:", e);
        }
      }

      let scOverridePermalink = override?.sc_handle || null;
      let ytOverrideHandle = override?.yt_handle || null;

      // SC: prioridad al ID numérico directo (viene de canciones SC), luego permalink, luego búsqueda exacta
      let scId: any = user.sc_id || (user.provider === 'soundcloud' ? user.id : null);
      // YT: prioridad al ID del canal (viene de canciones YT o búsqueda)
      let ytId: any = user.yt_id || (user.provider === 'youtube' && user.id ? String(user.id).replace('yt-user-', '') : null);

      let scTracks: any[] = [];
      let ytTracks: any[] = [];

      let enrichedUser: any = {
        ...user,
        bio: user.bio || '',
        banner_url: user.banner_url || '',
        total_followers: user.followers_count || 0,
        sc_handle: scOverridePermalink || (user.provider === 'soundcloud' ? user.permalink : (user.sc_handle || null)),
        yt_handle: ytOverrideHandle || (user.provider === 'youtube' ? (user.permalink || user.yt_handle) : (user.yt_handle || null)),
        providers: user.providers ? [...user.providers] : (user.provider ? [user.provider] : []),
        albums: []
      };

      // Limpiar IDs si hay overrides para forzar re-búsqueda por el nuevo handle
      if (scOverridePermalink) {
        scId = null;
        user.permalink = scOverridePermalink; // Forzar a la Ruta 1 (resolución directa) a usar este permalink
        user.provider = 'soundcloud'; // Asegurar que entre en la condición de Ruta 1
      }
      if (ytOverrideHandle) {
        ytId = null; 
        // Modificaremos la búsqueda YT para priorizar el ytOverrideHandle si existe.
      }

      // ── RESOLUCIÓN SC ─────────────────────────────────────────────────────────
      // Ruta 1: Si el user trae permalink (viene de canción SC), resolvemos directamente por URL — resultado 100% preciso
      if (!scId && user.permalink && (user.provider === 'soundcloud' || !user.provider)) {
        try {
          const res = await tauriFetch(
            `https://api-v2.soundcloud.com/resolve?url=https://soundcloud.com/${user.permalink}&client_id=${CLIENT_ID}`,
            { headers: { Authorization: `OAuth ${getScToken()}` } }
          );
          if (res.ok) {
            const data = await res.json();
            scId = data.id;
            enrichedUser.sc_handle = data.permalink;
            if (!enrichedUser.providers.includes('soundcloud')) enrichedUser.providers.push('soundcloud');
          }
        } catch (e) {}
      }

      // Ruta 2: Fallback por nombre — sistema de puntuación para evitar artistas homónimos
      if (!scId) {
        try {
          const res = await tauriFetch(
            `https://api-v2.soundcloud.com/search/users?q=${encodeURIComponent(artistName)}&client_id=${CLIENT_ID}&limit=10`,
            { headers: { Authorization: `OAuth ${getScToken()}` } }
          );
          if (res.ok) {
            const data = await res.json();
            const qNorm = artistName.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            // Scoring: damos puntos según calidad de la coincidencia
            const scored = (data.collection || []).map((u: any) => {
              const rawHandle = u.permalink || '';
              const uName = u.username.toLowerCase().replace(/[^a-z0-9]/g, '');
              const uHandle = rawHandle.toLowerCase().replace(/[^a-z0-9]/g, '');
              let score = 0;
              if (uName === qNorm) score += 10;               // Nombre exacto
              else if (uName.includes(qNorm)) score += 5;    // Nombre contiene query
              if (uHandle === qNorm) score += 8;             // Handle exacto
              else if (uHandle.includes(qNorm)) score += 4;  // Handle contiene query
              // Penalizar fuertemente handles con sufijos numéricos (auto-generados por SC)
              // "brz37094", "jeremias-barboza-782214466", etc.
              if (/\d{4,}/.test(rawHandle)) score -= 6;      // 4+ dígitos consecutivos en el handle
              if (/[-_]\d+$/.test(rawHandle)) score -= 4;    // termina en -número o _número
              return { u, score };
            });

            const best = scored.filter((s: any) => s.score > 0).sort((a: any, b: any) => b.score - a.score)[0];
            if (best) {
              scId = best.u.id;
              enrichedUser.sc_handle = best.u.permalink;
              if (!enrichedUser.providers.includes('soundcloud')) enrichedUser.providers.push('soundcloud');
            }
          }
        } catch (e) {}
      }

      // ── RESOLUCIÓN YT ─────────────────────────────────────────────────────────
      // Usa la API oficial con el token OAuth del usuario (mismo que para los Me Gusta)
      if (!ytId) {
        try {
          const ytSearchQuery = ytOverrideHandle || artistName;
          const data = await ytApiFetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(ytSearchQuery)}&type=channel&maxResults=5`
          );
          if (data?.items?.length > 0) {
            let exactCh = data.items[0];
            if (ytOverrideHandle) {
               // Si buscamos por handle, intentamos hacer match con el handle devuelto (customUrl o snippet.title)
               exactCh = data.items.find((i: any) => 
                 (i.snippet.customUrl || '').toLowerCase() === ytOverrideHandle.toLowerCase() ||
                 (i.snippet.title || '').toLowerCase() === ytOverrideHandle.toLowerCase()
               ) || data.items[0];
            } else {
               // Preferir coincidencia exacta de nombre de canal
               exactCh = data.items.find((i: any) =>
                 i.snippet.title.toLowerCase() === artistName.toLowerCase()
               ) || data.items[0];
            }
            ytId = exactCh.id.channelId;
            enrichedUser.yt_handle = exactCh.snippet.customUrl || exactCh.snippet.title;
            enrichedUser.yt_id = ytId;
            if (!enrichedUser.providers.includes('youtube')) enrichedUser.providers.push('youtube');
          }
        } catch (e) {}
      }

      // ── FETCH SC ─────────────────────────────────────────────────────────────
      const fetchSC = async () => {
        let allFetchedTracks: any[] = [];
        if (scId) {
          // Datos del usuario (bio, banner, stats)
          try {
            const userRes = await tauriFetch(
              `https://api-v2.soundcloud.com/users/${scId}?client_id=${CLIENT_ID}`,
              { headers: { Authorization: `OAuth ${getScToken()}` } }
            );
            if (userRes.ok) {
              const userData = await userRes.json();
              enrichedUser.bio = userData.description || enrichedUser.bio;
              enrichedUser.banner_url = userData.visuals?.visuals?.[0]?.visual_url || enrichedUser.banner_url;
              if (userData.followers_count > enrichedUser.total_followers) enrichedUser.total_followers = userData.followers_count;
              if (userData.verified) enrichedUser.verified = true;
              if (!enrichedUser.sc_handle) enrichedUser.sc_handle = userData.permalink;
              if (!enrichedUser.avatar_url || enrichedUser.avatar_url.includes('placehold')) {
                enrichedUser.avatar_url = userData.avatar_url?.replace('-large', '-t500x500');
              }
            }
          } catch (e) {}

          // Tracks y spotlight
          try {
            const [tracksRes, spotRes] = await Promise.all([
              tauriFetch(`https://api-v2.soundcloud.com/users/${scId}/tracks?client_id=${CLIENT_ID}&limit=50`, { headers: { Authorization: `OAuth ${getScToken()}` } }),
              tauriFetch(`https://api-v2.soundcloud.com/users/${scId}/spotlight?client_id=${CLIENT_ID}&limit=20`, { headers: { Authorization: `OAuth ${getScToken()}` } })
            ]);
            if (tracksRes.ok) { const d = await tracksRes.json(); allFetchedTracks = [...allFetchedTracks, ...(d.collection || [])]; }
            if (spotRes.ok) { const d = await spotRes.json(); allFetchedTracks = [...allFetchedTracks, ...(d.collection || [])]; }
          } catch (e) {}

          // Albums y playlists
          try {
            const [albumsRes, playlistsRes] = await Promise.all([
              tauriFetch(`https://api-v2.soundcloud.com/users/${scId}/albums?client_id=${CLIENT_ID}&limit=15`, { headers: { Authorization: `OAuth ${getScToken()}` } }),
              tauriFetch(`https://api-v2.soundcloud.com/users/${scId}/playlists?client_id=${CLIENT_ID}&limit=15`, { headers: { Authorization: `OAuth ${getScToken()}` } })
            ]);
            let allSCAlbums: any[] = [];
            if (albumsRes.ok) { const d = await albumsRes.json(); allSCAlbums = [...allSCAlbums, ...(d.collection || [])]; }
            if (playlistsRes.ok) { const d = await playlistsRes.json(); allSCAlbums = [...allSCAlbums, ...(d.collection || [])]; }
            const uniqueAlbumsMap = new Map();
            allSCAlbums.forEach((a: any) => {
              if (a && a.track_count && a.track_count > 0 && !uniqueAlbumsMap.has(a.id)) {
                uniqueAlbumsMap.set(a.id, { ...a, provider: 'soundcloud' });
              }
            });
            enrichedUser.albums = [...(enrichedUser.albums || []), ...Array.from(uniqueAlbumsMap.values())];
          } catch (e) {}
        }

        // Búsqueda de tracks adicionales por nombre (solo si tenemos scId para filtrar por user.id)
        if (scId) {
          try {
            const searchTracksRes = await tauriFetch(
              `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(artistName)}&client_id=${CLIENT_ID}&limit=40`,
              { headers: { Authorization: `OAuth ${getScToken()}` } }
            );
            if (searchTracksRes.ok) {
              const stData = await searchTracksRes.json();
              const matchedTracks = (stData.collection || []).filter((t: any) => t.user?.id === scId);
              allFetchedTracks = [...allFetchedTracks, ...matchedTracks];
            }
          } catch (e) {}
        }

        const uniqueTracks = new Map();
        const artistAvatar = enrichedUser.avatar_url;
        allFetchedTracks.forEach((t: any) => {
          if (t && t.id && !uniqueTracks.has(t.id)) {
            // Si el track no tiene imagen, usar el avatar del artista como fallback
            const artworkRaw = t.artwork_url || t.user?.avatar_url || artistAvatar || null;
            const artwork = artworkRaw ? artworkRaw.replace('-large', '-t500x500') : null;
            uniqueTracks.set(t.id, { ...t, artwork_url: artwork, provider: 'soundcloud' });
          }
        });
        scTracks = Array.from(uniqueTracks.values());
      };

      // ── FETCH YT ─────────────────────────────────────────────────────────────
      const fetchYT = async () => {
        if (!ytId) return;
        try {
          // 1. Datos del canal (bio, banner, stats, handle)
          const chanData = await ytApiFetch(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${ytId}`
          );
          if (chanData?.items?.length > 0) {
            const ch = chanData.items[0];
            const snip = ch.snippet;
            const stats = ch.statistics;
            const brand = ch.brandingSettings?.image;

            if (!enrichedUser.bio) enrichedUser.bio = snip.description || "";
            if (!enrichedUser.banner_url && brand?.bannerExternalUrl) {
              enrichedUser.banner_url = brand.bannerExternalUrl + "=w2560-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj";
            }
            if (!enrichedUser.avatar_url || enrichedUser.avatar_url.includes('placehold')) {
              enrichedUser.avatar_url = snip.thumbnails?.high?.url || snip.thumbnails?.default?.url;
            }
            enrichedUser.yt_handle = snip.customUrl || enrichedUser.yt_handle || snip.title;
            enrichedUser.yt_id = ytId;
            const subCount = parseInt(stats?.subscriberCount || "0", 10);
            if (subCount > enrichedUser.total_followers) enrichedUser.total_followers = subCount;
            if (!enrichedUser.providers.includes("youtube")) enrichedUser.providers.push("youtube");
          }

          // 2. Playlists del canal
          const plData = await ytApiFetch(
            `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${ytId}&maxResults=20`
          );
          if (plData?.items?.length > 0) {
            const ytPlaylists = plData.items.map((p: any) => ({
              id: `yt-pl-${p.id}`,
              title: p.snippet.title,
              artwork_url: p.snippet.thumbnails?.high?.url || p.snippet.thumbnails?.default?.url || "https://placehold.co/500x500/1a1a1a/333333?text=YT",
              track_count: p.contentDetails?.itemCount || 0,
              provider: "youtube",
              yt_playlistId: p.id,
            }));
            const existingIds = new Set((enrichedUser.albums || []).map((a: any) => a.id));
            enrichedUser.albums = [...(enrichedUser.albums || []), ...ytPlaylists.filter((p: any) => !existingIds.has(p.id))];
          }

          // 3. Vídeos del canal con duración para filtrado inteligente
          // Paso A: buscar los IDs de los vídeos más vistos
          const videosSearchData = await ytApiFetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${ytId}&order=viewCount&type=video&maxResults=40`
          );
          const videoIds = (videosSearchData?.items || [])
            .filter((v: any) => v.id?.videoId)
            .map((v: any) => v.id.videoId)
            .join(',');

          // Paso B: obtener detalles con duración (contentDetails)
          let videosWithDuration: any[] = [];
          if (videoIds) {
            const detailsData = await ytApiFetch(
              `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}`
            );

            // Parsear duración ISO 8601 (PT4M33S, PT1H23M, etc.)
            const parseIso = (iso: string): number => {
              const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
              if (!m) return 0;
              return (parseInt(m[1] || '0') * 3600) + (parseInt(m[2] || '0') * 60) + parseInt(m[3] || '0');
            };

            // Patrones que DEFINITIVAMENTE no son música
            const hardRejectRegex = /\b(gameplay|let'?s?\s*play|playthrough|walkthrough|speedrun|stream highlights?|gaming|game\s+review|unboxing|vlog|podcast|interview|reaction|challenge|challenge|prank|mukbang|asmr cooking|commentary)\b/i;
            // Patrones que podrían no ser música pero hay que revisar con duración
            const softRejectRegex = /\b(live|teaser|trailer|making of|behind the scenes|tour|documentary|full album)\b/i;

            videosWithDuration = (detailsData?.items || []).filter((v: any) => {
              const title = v.snippet?.title || '';
              const dur = parseIso(v.contentDetails?.duration || '');

              // Rechazar hard: gameplays sin importar duración
              if (hardRejectRegex.test(title)) return false;

              // Rechazar si menos de 30 segundos (bumpers/idents)
              if (dur > 0 && dur < 30) return false;

              // Rechazar si más de 4 horas (streams/documentales largos)
              if (dur > 14400) return false;

              // Para soft-reject (live, trailer, etc.), solo rechazar si duración < 2 min (teaser)
              // Los lives musicales de larga duración los mantenemos
              if (softRejectRegex.test(title) && dur > 0 && dur < 120) return false;

              return true;
            }).map((v: any) => ({
              id: `yt-${v.id}`,
              title: v.snippet.title,
              user: { username: enrichedUser.username, id: `yt-user-${ytId}`, provider: 'youtube', yt_id: ytId },
              artwork_url: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.maxres?.url || v.snippet.thumbnails?.default?.url || 'https://placehold.co/500x500/1a1a1a/333333?text=YT',
              playback_count: 0,
              provider: 'youtube',
              yt_videoId: v.id,
              duration: parseIso(v.contentDetails?.duration || ''),
            }));
          }
          ytTracks = videosWithDuration;
        } catch (err) {
          console.error("Error YT Profile:", err);
        }
      };

      await Promise.all([fetchSC(), fetchYT()]);

      // ── MERGE DE TRACKS ──────────────────────────────────────────────────────
      const rawTracks = [...scTracks, ...ytTracks];
      const mergedTracksMap = new Map();
      const normalize = (txt: string) => (txt || "").toLowerCase().replace(/[^a-z0-9]/g, '');
      const blacklist = JSON.parse(localStorage.getItem('resonance_unlinked') || '[]');

      rawTracks.forEach((track: any) => {
        const titNorm = normalize(track.title);
        let foundKey = null;
        for (const [key, existing] of mergedTracksMap.entries()) {
          const exTitNorm = normalize(existing.title);
          if (titNorm && exTitNorm && titNorm.length > 3 && (titNorm === exTitNorm || titNorm.includes(exTitNorm) || exTitNorm.includes(titNorm))) {
            const isBlacklisted = blacklist.includes(`${existing.id}|${track.id}`) || blacklist.includes(`${track.id}|${existing.id}`);
            if (!isBlacklisted) { foundKey = key; break; }
          }
        }

        if (foundKey) {
          const existing = mergedTracksMap.get(foundKey);
          if (!existing.providers) { existing.providers = [existing.provider]; existing.merged_from = [{ ...existing }]; }
          if (!existing.providers.includes(track.provider)) { existing.providers.push(track.provider); existing.merged_from.push({ ...track }); }
          if (track.provider === 'soundcloud') existing.sc_playback = Math.max(existing.sc_playback || 0, track.playback_count || 0);
          if (track.provider === 'youtube') existing.yt_playback = Math.max(existing.yt_playback || 0, track.playback_count || 0);
          existing.playback_count = (existing.sc_playback || 0) + (existing.yt_playback || 0);
        } else {
          track.providers = [track.provider];
          track.merged_from = [{ ...track }];
          if (track.provider === 'soundcloud') track.sc_playback = track.playback_count || 0;
          if (track.provider === 'youtube') track.yt_playback = track.playback_count || 0;
          mergedTracksMap.set(track.id, track);
        }
      });

      const combinedTracks = Array.from(mergedTracksMap.values()).sort((a, b) => (b.playback_count || 0) - (a.playback_count || 0));

      if (!enrichedUser.albums || enrichedUser.albums.length === 0) {
        if (combinedTracks.length > 0) {
          enrichedUser.albums = [{
            id: `virtual-essentials-${safeId}`,
            title: 'The Essentials',
            artwork_url: enrichedUser.banner_url || combinedTracks[0]?.artwork_url || 'https://placehold.co/500x500/1a1a1a/333333?text=ESSENTIALS',
            track_count: combinedTracks.length,
            provider: 'resonance',
            tracks: combinedTracks
          }];
        }
      }

      profileCacheRef.current[safeId] = { tracks: combinedTracks, user: enrichedUser };

      if (viewTitleRef.current === `Perfil: ${artistName}`) {
        openView(`Perfil: ${artistName}`, combinedTracks, [enrichedUser]);
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
    }
    setIsSearching(false);
  };

  return { openArtistProfile, goBack, viewHistoryRef };
}

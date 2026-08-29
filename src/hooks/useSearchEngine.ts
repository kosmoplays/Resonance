import { useState, useRef } from "react";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { usePlayerStore } from "../store/usePlayerStore";
import { ytApiFetch } from "../lib/ytToken";

const CLIENT_ID = "lmRjTI0FqeXygHMXc3hRzS7hth20PNk5";
const getScToken = () => localStorage.getItem("soundcloud_oauth_token") || "";

export function useSearchEngine(isOffline: boolean, openView: (title: string, tracks: any[], users: any[]) => void, viewTitle: string) {  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // 🛡 SENSOR DE SECCIÓN EN CALIENTE
  const viewTitleRef = useRef(viewTitle);
  viewTitleRef.current = viewTitle;

  const filterPlayableTracks = (tracks: any[]) => {
    return tracks.filter((t: any) => t && t.media && t.media.transcodings && t.snipped !== true && t.policy !== "BLOCK");
  };

    const handleSearch = async (e: React.FormEvent | { preventDefault: () => void }, forceNavigate = false) => {
    if (e?.preventDefault) e.preventDefault();
    if (!searchQuery.trim() || isOffline) return;
    
    setIsSearching(true);
    if (forceNavigate) {
      openView(`Resultados: ${searchQuery}`, [], []);
    }
    
    try {
      const query = encodeURIComponent(searchQuery);

      // --- MOTOR YOUTUBE (API OFICIAL v3, con auto-renovación de token) ---
      const fetchYTMusic = async () => {
        try {
          const data = await ytApiFetch(
            "https://www.googleapis.com/youtube/v3/search?part=snippet&q=" +
            encodeURIComponent(searchQuery) +
            "&type=video,channel&maxResults=25&relevanceLanguage=es"
          );

          if (data && data.items && data.items.length > 0) {
            const ytTracks: any[] = [];
            const ytUsers: any[] = [];

            for (const item of data.items || []) {
              const snip = item.snippet;
              if (item.id.kind === "youtube#video") {
                const thumb =
                  snip.thumbnails?.high?.url ||
                  snip.thumbnails?.medium?.url ||
                  snip.thumbnails?.default?.url ||
                  "https://placehold.co/500x500/1a1a1a/333333?text=YT";
                ytTracks.push({
                  id: "yt-" + item.id.videoId,
                  title: snip.title,
                  user: {
                    id: "yt-user-" + snip.channelId,
                    username: snip.channelTitle,
                    provider: "youtube",
                    yt_id: snip.channelId,
                  },
                  artwork_url: thumb,
                  playback_count: 0,
                  provider: "youtube",
                  yt_videoId: item.id.videoId,
                });
              } else if (item.id.kind === "youtube#channel") {
                const thumb =
                  snip.thumbnails?.high?.url ||
                  snip.thumbnails?.medium?.url ||
                  snip.thumbnails?.default?.url ||
                  "https://placehold.co/500x500/1a1a1a/333333?text=USER";
                ytUsers.push({
                  id: "yt-user-" + item.id.channelId,
                  username: snip.title,
                  avatar_url: thumb,
                  permalink: snip.customUrl || snip.title,
                  followers_count: 0,
                  verified: false,
                  provider: "youtube",
                  yt_id: item.id.channelId,
                });
              }
            }

            return { tracks: ytTracks, users: ytUsers };
          }
        } catch (err: any) {}

        // 🛡 FALLBACK: Búsqueda pública de YouTube si no hay OAuth
        try {
          const endpoints = [
            'https://pipedapi.kavin.rocks',
            'https://api.piped.privacydev.net',
            'https://pipedapi.leptons.xyz'
          ];
          for (const ep of endpoints) {
            try {
              const res = await tauriFetch(`${ep}/search?q=${query}&filter=all`, { timeout: 3500 } as any);
              if (res.ok) {
                const pData = await res.json();
                const ytTracks: any[] = [];
                const ytUsers: any[] = [];

                for (const item of pData.items || []) {
                  if (item.type === 'stream') {
                    const videoId = item.url ? item.url.replace('/watch?v=', '') : item.id;
                    ytTracks.push({
                      id: 'yt-' + videoId,
                      title: item.title,
                      user: {
                        id: 'yt-user-' + (item.uploaderUrl || item.uploaderName),
                        username: item.uploaderName,
                        provider: 'youtube',
                      },
                      artwork_url: item.thumbnail || 'https://placehold.co/500x500/1a1a1a/333333?text=YT',
                      playback_count: item.views || 0,
                      provider: 'youtube',
                      yt_videoId: videoId,
                      duration: item.duration || 0,
                    });
                  } else if (item.type === 'channel') {
                    ytUsers.push({
                      id: 'yt-user-' + item.url?.replace('/channel/', ''),
                      username: item.name,
                      avatar_url: item.avatar || 'https://placehold.co/500x500/1a1a1a/333333?text=USER',
                      followers_count: item.subscribers || 0,
                      verified: item.verified || false,
                      provider: 'youtube',
                      yt_id: item.url?.replace('/channel/', ''),
                    });
                  }
                }
                if (ytTracks.length > 0 || ytUsers.length > 0) {
                  return { tracks: ytTracks, users: ytUsers };
                }
              }
            } catch (e) {}
          }
        } catch (err) {}

        return { tracks: [], users: [] };
      };

            // --- BÚSQUEDA MULTIVERSO SIMULTÁNEA ---
      const [tracksRes, usersRes, playlistsRes, ytData] = await Promise.all([
        tauriFetch(`https://api-v2.soundcloud.com/search/tracks?q=${query}&client_id=${CLIENT_ID}&limit=40`, { headers: { Authorization: `OAuth ${getScToken()}` } }),
        tauriFetch(`https://api-v2.soundcloud.com/search/users?q=${query}&client_id=${CLIENT_ID}&limit=10`, { headers: { Authorization: `OAuth ${getScToken()}` } }),
        tauriFetch(`https://api-v2.soundcloud.com/search/playlists?q=${query}&client_id=${CLIENT_ID}&limit=15`, { headers: { Authorization: `OAuth ${getScToken()}` } }),
        fetchYTMusic()
      ]);

      const tracksData = await tracksRes.json();
      const usersData = await usersRes.json();
      const playlistsData = await playlistsRes.json();

      const scPlaylists = (playlistsData.collection || []).filter((p: any) => p.track_count > 0).map((p: any) => ({ ...p, provider: 'soundcloud' }));

      const ytTracks = (ytData as any)?.tracks || [];
      const ytUsers = (ytData as any)?.users || [];

      const scPlayableTracks = filterPlayableTracks(tracksData.collection).map((t: any) => ({
        ...t, provider: 'soundcloud'
      }));

      // --- MOTOR DE DEDUPLICACIÓN ---
      const rawTracks = [...scPlayableTracks, ...ytTracks];
      const mergedMap = new Map();
      const normalize = (txt: string) => (txt || "").toLowerCase().replace(/[^a-z0-9]/g, '');
      const blacklist = JSON.parse(localStorage.getItem('resonance_unlinked') || '[]');

      rawTracks.forEach((track: any) => {
        const artNorm = normalize(track.user?.username);
        const titNorm = normalize(track.title);

        let foundKey = null;
        for (const [key, existing] of mergedMap.entries()) {
          const exArtNorm = normalize(existing.user?.username);
          const exTitNorm = normalize(existing.title);

          if ((artNorm && exArtNorm && (artNorm.includes(exArtNorm) || exArtNorm.includes(artNorm))) &&
              (titNorm && exTitNorm && (titNorm.includes(exTitNorm) || exTitNorm.includes(titNorm)))) {
            const isBlacklisted = blacklist.includes(`${existing.id}|${track.id}`) || blacklist.includes(`${track.id}|${existing.id}`);
            if (!isBlacklisted) {
              foundKey = key;
              break;
            }
          }
        }

        if (foundKey) {
            const existing = mergedMap.get(foundKey);
            if (!existing.providers) {
              existing.providers = [existing.provider];
              existing.merged_from = [{ ...existing }];
            }
            if (!existing.providers.includes(track.provider)) {
              existing.providers.push(track.provider);
              existing.merged_from.push({ ...track });
            }
            
            if (track.provider === 'soundcloud') existing.sc_playback = Math.max(existing.sc_playback || 0, track.playback_count || 0);
            if (track.provider === 'youtube') existing.yt_playback = Math.max(existing.yt_playback || 0, track.playback_count || 0);
            
            existing.playback_count = (existing.sc_playback || 0) + (existing.yt_playback || 0);
          } else {
            track.providers = [track.provider];
            track.merged_from = [{ ...track }];
            if (track.provider === 'soundcloud') track.sc_playback = track.playback_count || 0;
            if (track.provider === 'youtube') track.yt_playback = track.playback_count || 0;
            mergedMap.set(track.id, track);
          }
      });

      const allTracks = Array.from(mergedMap.values()) as any[];
      const queryLower = searchQuery.toLowerCase().trim();

      const sortedTracks = allTracks.sort((a, b) => {
        const titleA = a.title?.toLowerCase() || "";
        const titleB = b.title?.toLowerCase() || "";
        const artistA = a.user?.username?.toLowerCase() || "";
        const artistB = b.user?.username?.toLowerCase() || "";
        
        if (titleA === queryLower && titleB !== queryLower) return -1;
        if (titleA !== queryLower && titleB === queryLower) return 1;
        if (artistA === queryLower && artistB !== queryLower) return -1;
        if (artistA !== queryLower && artistB === queryLower) return 1;
        if (titleA.startsWith(queryLower) && !titleB.startsWith(queryLower)) return -1;
        if (!titleA.startsWith(queryLower) && titleB.startsWith(queryLower)) return 1;
        
        return (b.playback_count || b.likes_count || 0) - (a.playback_count || a.likes_count || 0);
      });

      // --- DEDUPLICACIÓN DE USUARIOS ---
      const scUsers = (usersData.collection || []).map((u: any) => ({ ...u, provider: 'soundcloud', sc_id: u.id }));
      const ytUsersWithIds = ytUsers.map((u: any) => ({ ...u, yt_id: u.id.replace('yt-user-', '') }));
      const rawUsers = [...scUsers, ...ytUsersWithIds];
      const mergedUsersMap = new Map();

      rawUsers.forEach((user: any) => {
        const userNorm = normalize(user.username);
        let foundKey = null;
        for (const [key, existing] of mergedUsersMap.entries()) {
          if (userNorm && normalize(existing.username) && userNorm === normalize(existing.username)) {
            foundKey = key; break;
          }
        }

        if (foundKey) {
          const existing = mergedUsersMap.get(foundKey);
          if (!existing.providers) existing.providers = [existing.provider];
          if (!existing.providers.includes(user.provider)) existing.providers.push(user.provider);
          
          if (user.sc_id) existing.sc_id = user.sc_id;
          if (user.yt_id) existing.yt_id = user.yt_id;

          existing.followers_count = Math.max(existing.followers_count || 0, user.followers_count || 0);
          if (user.verified) existing.verified = true;
        } else {
          user.providers = [user.provider];
          mergedUsersMap.set(user.id, user);
        }
      });

     const topUsers = Array.from(mergedUsersMap.values()).sort((a: any, b: any) => (b.followers_count || 0) - (a.followers_count || 0));

      // 🛡️ ACTUALIZACIÓN SÍNCRONA DE ESTADO EN ZUSTAND PARA VISTA MÓVIL Y DESKTOP
      usePlayerStore.getState().setViewTracks(sortedTracks);
      usePlayerStore.getState().setViewUsers(topUsers);
      usePlayerStore.getState().setViewPlaylists(scPlaylists);

      if (forceNavigate) {
        openView(`Resultados: ${searchQuery}`, sortedTracks, topUsers);
      }
    } catch (error) { console.error("Error en búsqueda:", error); }
    setIsSearching(false);
  };

  return {
    searchQuery, setSearchQuery, isSearching, setIsSearching, handleSearch
  };
}
















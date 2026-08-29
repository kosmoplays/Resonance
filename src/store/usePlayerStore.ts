import { create } from 'zustand';

// 🛡 INIT DB: Motor nativo para evadir cuotas de LocalStorage (Permite Blobs binarios ilimitados)
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('resonance_local_db', 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('local_tracks')) {
        req.result.createObjectStore('local_tracks', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export interface Track {
  id: number;
  title: string;
  user: { username: string; avatar_url?: string };
  media: { transcodings: any[] };
  artwork_url: string;
  genre?: string;
  description?: string;
  playback_count?: number;
  track_authorization?: string;
  provider?: 'spotify' | 'soundcloud' | 'youtube' | 'local';
  yt_videoId?: string;
  local_blob?: Blob; // Contenedor binario del archivo físico
}

interface PlayerState {
  isMiniPlayer: boolean;
  viewUsers: any[];
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  isShuffle: boolean;
  isAutoplayEnabled: boolean;
  loopMode: 0 | 1 | 2;
  viewTracks: Track[];
  viewPlaylists: any[];

  // VARIABLES DE PANEL Y COLA
  queue: Track[];
  activePanel: 'none' | 'details' | 'queue' | 'lyrics';
  autoplayBlacklist: string[];
  localTracks: Track[];
  listeningHistory: Track[];

  // MUTADORES
  loadLocalTracks: () => Promise<void>;
  addLocalTrack: (track: Track) => Promise<void>;
  removeLocalTrack: (id: string | number) => Promise<void>;
  setCurrentTrack: (track: Track | null) => void;
  addToHistory: (track: Track) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  toggleShuffle: () => void;
  toggleAutoplay: () => void;
  cycleLoopMode: () => void;
  setViewTracks: (tracks: Track[]) => void;
  setViewUsers: (users: any[]) => void;
  setViewPlaylists: (playlists: any[]) => void;
  toggleAutoplayBlacklist: (trackId: string) => void;

  addToQueue: (track: Track) => void;
  playNextInQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  popNextFromQueue: () => Track | undefined;
  toggleQueue: () => void;
  toggleDetails: () => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;

  // ✂️ RESONANCE CUTS
  trackCuts: Record<string, { intervals: { start: number; end: number }[]; active: boolean }>;
  setTrackCuts: (
    trackId: string,
    intervals: { start: number; end: number }[],
    active: boolean
  ) => void;
  setIsMiniPlayer: (isMini: boolean) => void;
  syncCutsWithCloud: (userId: string) => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  // VALORES INICIALES
  isMiniPlayer: false,
  viewUsers: [],
  currentTrack: null,
  isPlaying: false,
  volume: parseFloat(localStorage.getItem('resonance_volume') || '1'),
  progress: 0,
  duration: 0,
  isShuffle: false,
  isAutoplayEnabled: localStorage.getItem('resonance_autoplay_enabled') !== 'false',
  loopMode: 0,
  viewTracks: [],
  viewPlaylists: [],
  queue: [],
  activePanel: 'none',
  autoplayBlacklist: (() => {
    try {
      return JSON.parse(localStorage.getItem('resonance_blacklist') || '[]');
    } catch {
      return [];
    }
  })(),
  listeningHistory: (() => {
    try {
      return JSON.parse(localStorage.getItem('resonance_listening_history') || '[]');
    } catch {
      return [];
    }
  })(),
  localTracks: [],
  trackCuts: JSON.parse(localStorage.getItem('resonance_track_cuts_local') || '{}'),

  // FUNCIONES
  setTrackCuts: (trackId, intervals, active) =>
    set((state) => {
      // 1. Clamp y limpiar inválidos (inicio >= fin)
      const clamped = intervals
        .map((i) => ({ start: Math.max(0, i.start), end: Math.max(0, i.end) }))
        .filter((i) => i.end > i.start);

      // 2. Normalizar: ordenar por start y fusionar solapamientos
      let normalized = clamped.sort((a, b) => a.start - b.start);
      const merged = [];
      if (normalized.length > 0) {
        let current = { ...normalized[0] };
        for (let i = 1; i < normalized.length; i++) {
          if (normalized[i].start <= current.end) {
            current.end = Math.max(current.end, normalized[i].end);
          } else {
            merged.push(current);
            current = { ...normalized[i] };
          }
        }
        merged.push(current);
      }

      const newCuts = { ...state.trackCuts, [trackId]: { intervals: merged, active } };
      localStorage.setItem('resonance_track_cuts_local', JSON.stringify(newCuts));
      return { trackCuts: newCuts };
    }),

  setIsMiniPlayer: (isMini) => set({ isMiniPlayer: isMini }),

  syncCutsWithCloud: async (userId: string) => {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase
        .from('resonance_track_cuts')
        .select('track_key, intervals, is_active')
        .eq('user_id', userId);

      if (error) throw error;
      if (data) {
        const cloudCuts: Record<string, any> = {};
        data.forEach((row) => {
          cloudCuts[row.track_key] = { intervals: row.intervals, active: row.is_active };
        });

        set((state) => {
          const merged = { ...cloudCuts, ...state.trackCuts };
          localStorage.setItem('resonance_track_cuts_local', JSON.stringify(merged));
          return { trackCuts: merged };
        });
      }
    } catch (e) {
      console.error('Error sincronizando cortes desde la nube:', e);
    }
  },

  loadLocalTracks: async () => {
    try {
      const db = await initDB();
      const tx = db.transaction('local_tracks', 'readonly');
      const req = tx.objectStore('local_tracks').getAll();
      req.onsuccess = () => set({ localTracks: req.result || [] });
    } catch (e) {
      console.error('Error loading local tracks', e);
    }
  },

  addLocalTrack: async (track) => {
    try {
      const db = await initDB();
      const tx = db.transaction('local_tracks', 'readwrite');
      tx.objectStore('local_tracks').put(track);
      tx.oncomplete = () => set((state) => ({ localTracks: [track, ...state.localTracks] }));
    } catch (e) {
      console.error('Error saving local track', e);
    }
  },

  removeLocalTrack: async (id) => {
    try {
      const db = await initDB();
      const tx = db.transaction('local_tracks', 'readwrite');
      tx.objectStore('local_tracks').delete(id);
      tx.oncomplete = () =>
        set((state) => ({
          localTracks: state.localTracks.filter((t: Track) => t.id !== id),
          viewTracks: state.viewTracks.filter((t: Track) => t.id !== id),
        }));
    } catch (e) {
      console.error('Error deleting local track', e);
    }
  },

  setCurrentTrack: (track) => set({ currentTrack: track }),
  addToHistory: (track) => {
    if (!track || !track.id) return;
    set((state) => {
      const prev = state.listeningHistory || [];
      const filtered = prev.filter((t) => String(t.id) !== String(track.id));
      const updated = [track, ...filtered].slice(0, 100);
      localStorage.setItem('resonance_listening_history', JSON.stringify(updated));
      return { listeningHistory: updated };
    });
  },
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => {
    localStorage.setItem('resonance_volume', volume.toString());
    set({ volume });
  },
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
  toggleAutoplay: () =>
    set((state) => {
      const next = !state.isAutoplayEnabled;
      localStorage.setItem('resonance_autoplay_enabled', String(next));
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: {
            msg: next ? 'Autoplay activado' : 'Autoplay desactivado',
            type: 'success',
          },
        })
      );
      return { isAutoplayEnabled: next };
    }),
  cycleLoopMode: () => set((state) => ({ loopMode: ((state.loopMode + 1) % 3) as 0 | 1 | 2 })),
  setViewTracks: (tracks) => set({ viewTracks: tracks }),
  setViewUsers: (users) => set({ viewUsers: users }),
  setViewPlaylists: (playlists) => set({ viewPlaylists: playlists }),
  toggleAutoplayBlacklist: (trackId) =>
    set((state) => {
      const isBlacklisted = state.autoplayBlacklist.includes(trackId);
      const newList = isBlacklisted
        ? state.autoplayBlacklist.filter((id) => id !== trackId)
        : [...state.autoplayBlacklist, trackId];
      localStorage.setItem('resonance_blacklist', JSON.stringify(newList));
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: {
            msg: isBlacklisted ? 'Autoplay permitido' : 'Excluida del Autoplay',
            type: isBlacklisted ? 'success' : 'error',
          },
        })
      );
      return { autoplayBlacklist: newList };
    }),

  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  playNextInQueue: (track) =>
    set((state) => ({ queue: [track, ...state.queue], activePanel: 'queue' })),
  removeFromQueue: (index) =>
    set((state) => {
      const newQueue = [...state.queue];
      newQueue.splice(index, 1);
      return { queue: newQueue };
    }),
  clearQueue: () => set({ queue: [] }),
  popNextFromQueue: () => {
    const { queue } = get();
    if (queue.length === 0) return undefined;
    const nextTrack = queue[0];
    set({ queue: queue.slice(1) });
    return nextTrack;
  },

  toggleQueue: () =>
    set((state) => ({ activePanel: state.activePanel === 'queue' ? 'none' : 'queue' })),
  toggleDetails: () =>
    set((state) => ({ activePanel: state.activePanel === 'details' ? 'none' : 'details' })),
  reorderQueue: (startIndex, endIndex) =>
    set((state) => {
      const newQueue = [...state.queue];
      const [removed] = newQueue.splice(startIndex, 1);
      newQueue.splice(endIndex, 0, removed);
      return { queue: newQueue };
    }),
}));

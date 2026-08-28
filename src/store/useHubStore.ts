import { create } from 'zustand';

// En la versión standalone de Resonance, el Hub Store
// solo existe como compatibilidad para los componentes
// que lo importan (ej: Sidebar). No enruta a otras apps.
export type AppType = 'hub' | 'resonance';

interface HubState {
  activeApp: AppType;
  launchApp: (app: AppType) => void;
}

export const useHubStore = create<HubState>((set) => ({
  activeApp: 'resonance', // Siempre en resonance en la versión standalone
  launchApp: (app) => set({ activeApp: app }),
}));
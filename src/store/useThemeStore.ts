import { create } from 'zustand';

interface ThemeState {
  theme: string;
  setTheme: (theme: string) => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark', // Por defecto
  
  setTheme: (theme: string) => {
    // 1. Cambiamos la etiqueta en el HTML para que el CSS reaccione
    document.documentElement.setAttribute('data-theme', theme);
    // 2. Lo guardamos en el disco duro del navegador
    localStorage.setItem('resonance-theme', theme);
    // 3. Actualizamos el estado
    set({ theme });
  },

  initTheme: () => {
    // Al abrir la app, miramos si guardaste un tema antes
    const savedTheme = localStorage.getItem('resonance-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    set({ theme: savedTheme });
  }
}));
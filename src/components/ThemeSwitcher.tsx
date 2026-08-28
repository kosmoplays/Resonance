import { Palette, Sun, Moon, Atom } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";
import { useEffect } from "react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const themes = [
    { id: 'dark', name: 'Oscuro', icon: <Moon size={16} />, accentColor: '#3b82f6' },
    { id: 'light', name: 'Claro', icon: <Sun size={16} />, accentColor: '#3b82f6' },
    { id: 'cyberpunk', name: 'Cyberpunk', icon: <Atom size={16} />, accentColor: '#00ff41' }
  ];
  
  return (
    <div className="w-full">
      <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
        <Palette size={14} /> Aspecto visual
      </h3>
      <div className="flex flex-col gap-2">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${
              theme === t.id 
                ? 'bg-accent/20 text-accent ring-1 ring-accent/50' 
                : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-main'
            }`}
          >
            {/* Pequeño icono de color dinámico */}
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${theme === t.id ? 'bg-accent' : 'bg-neutral-600'}`} style={{ backgroundColor: theme === t.id ? t.accentColor : undefined }}></div>
            {t.icon}
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
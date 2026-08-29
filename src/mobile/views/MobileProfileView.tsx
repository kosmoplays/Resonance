import React, { useState } from 'react';
import {
  User,
  LogOut,
  Palette,
  ExternalLink,
  Shield,
  Info,
  Check,
  Radio,
  Sparkles,
  Link,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';

interface MobileProfileViewProps {
  scProps?: any;
}

export function MobileProfileView({ scProps }: MobileProfileViewProps) {
  const { user, signOut } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  const [scTokenInput, setScTokenInput] = useState('');
  const [showScModal, setShowScModal] = useState(false);

  const themes = [
    { id: 'dark', name: 'Oscuro Puro', color: '#000000', accent: '#3b82f6' },
    { id: 'glass', name: 'Liquid Glass', color: '#09090b', accent: '#a855f7' },
    { id: 'cyberpunk', name: 'Cyberpunk Neon', color: '#050510', accent: '#06b6d4' },
    { id: 'midnight', name: 'Medianoche', color: '#020617', accent: '#6366f1' },
    { id: 'emerald', name: 'Esmeralda', color: '#022c22', accent: '#10b981' },
    { id: 'sunset', name: 'Atardecer', color: '#1c1917', accent: '#f97316' },
  ];

  const handleSaveScToken = () => {
    if (scTokenInput.trim()) {
      localStorage.setItem('soundcloud_oauth_token', scTokenInput.trim());
      window.dispatchEvent(
        new CustomEvent('show-toast', { detail: { msg: 'Token de SoundCloud guardado', type: 'success' } })
      );
      setShowScModal(false);
    }
  };

  const hasYtToken = Boolean(localStorage.getItem('youtube_access_token'));
  const hasScToken = Boolean(localStorage.getItem('soundcloud_oauth_token'));

  return (
    <div className="h-full w-full overflow-y-auto pt-[max(env(safe-area-inset-top,0px),16px)] pb-36 px-4 space-y-6 select-none">
      {/* HEADER */}
      <header className="pt-2">
        <span className="text-[10px] font-bold tracking-widest text-accent uppercase">
          Configuración y Perfil
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight">Mi Perfil</h1>
      </header>

      {/* USER CARD */}
      <section className="p-4 rounded-3xl bg-neutral-900/90 border border-white/10 shadow-xl flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-accent to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-md">
          {user?.email ? user.email.charAt(0).toUpperCase() : <User size={24} />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-white truncate">
            {user?.email ? user.email.split('@')[0] : 'Usuario Resonance'}
          </h2>
          <p className="text-xs text-neutral-400 truncate mt-0.5">
            {user?.email || 'Sesión no vinculada'}
          </p>
        </div>
        <button
          onClick={signOut}
          className="p-2.5 text-neutral-400 hover:text-red-400 bg-white/5 active:bg-red-500/10 rounded-2xl transition-colors"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </section>

      {/* EXTERNAL LINKED ACCOUNTS */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Link size={16} className="text-accent" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Cuentas Vinculadas
          </h3>
        </div>

        <div className="space-y-2">
          {/* SOUNDCLOUD */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs">
                SC
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">SoundCloud</h4>
                <p className="text-xs text-neutral-400">
                  {hasScToken ? 'Token activo conectado' : 'Sesión nativa activa'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowScModal(true)}
              className="px-3 py-1.5 bg-white/10 active:bg-white/20 text-xs font-semibold rounded-xl text-neutral-200"
            >
              Gestionar
            </button>
          </div>

          {/* YOUTUBE */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-black text-xs">
                YT
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">YouTube Music</h4>
                <p className="text-xs text-neutral-400">
                  {hasYtToken ? 'Cuenta Google conectada' : 'No conectada (búsqueda pública)'}
                </p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${
                hasYtToken
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {hasYtToken ? 'Conectado' : 'Público'}
            </span>
          </div>
        </div>
      </section>

      {/* THEME SELECTOR */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette size={16} className="text-accent" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Tema Visual
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {themes.map((t) => {
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all active:scale-95 text-left ${
                  isSelected
                    ? 'bg-white/15 border-accent shadow-md'
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: t.accent }}
                  />
                  <span className="text-xs font-bold text-white">{t.name}</span>
                </div>
                {isSelected && <Check size={16} className="text-accent" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* APP INFO */}
      <section className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
        <div className="flex items-center gap-2 text-neutral-400">
          <Info size={16} />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Acerca de Resonance</h4>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          Resonance v1.0 Mobile • Cliente no oficial unificado de SoundCloud & YouTube Music con
          soporte de biblioteca propia en Supabase y motor de cortes Resonance Cuts.
        </p>
      </section>

      {/* MODAL TOKEN SC */}
      {showScModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-bold text-white">Token OAuth de SoundCloud</h3>
            <p className="text-xs text-neutral-400">
              Pega tu token de sesión de SoundCloud (`OAuth 2-...`) para acceder a todos tus me gusta privados.
            </p>
            <input
              type="text"
              placeholder="2-322582-..."
              value={scTokenInput}
              onChange={(e) => setScTokenInput(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowScModal(false)}
                className="flex-1 py-2.5 bg-white/10 rounded-xl text-xs font-semibold text-neutral-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveScToken}
                className="flex-1 py-2.5 bg-accent text-white font-semibold text-xs rounded-xl"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

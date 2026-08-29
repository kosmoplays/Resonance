import React, { useState, useEffect } from 'react';
import {
  User,
  LogOut,
  Edit3,
  Check,
  X,
  Link,
  Info,
  Loader2,
  Image,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { ResonanceLogo } from '../../components/ResonanceLogo';
import { supabase } from '../../lib/supabase';

interface MobileProfileViewProps {
  scProps?: any;
}

export function MobileProfileView({ scProps }: MobileProfileViewProps) {
  const { user, signOut, updateProfile } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  const [scTokenInput, setScTokenInput] = useState('');
  const [showScModal, setShowScModal] = useState(false);

  const email = user?.email || 'usuario@resonance.app';
  const defaultUsername = email ? email.split('@')[0] : 'Usuario Resonance';
  const username = user?.user_metadata?.username || user?.user_metadata?.custom_username || defaultUsername;
  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=3b82f6&color=fff&size=256`;

  const handleOpenEdit = () => {
    setEditName(username);
    setEditAvatar(user?.user_metadata?.avatar_url || '');
    setIsEditing(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      await updateProfile({
        username: editName.trim(),
        avatar_url: editAvatar.trim() || undefined,
      });
      window.dispatchEvent(
        new CustomEvent('show-toast', { detail: { msg: 'Perfil actualizado con éxito', type: 'success' } })
      );
      setIsEditing(false);
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      window.dispatchEvent(
        new CustomEvent('show-toast', { detail: { msg: 'Error al actualizar perfil', type: 'error' } })
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveScToken = async () => {
    if (scTokenInput.trim() && user?.id) {
      localStorage.setItem('soundcloud_oauth_token', scTokenInput.trim());

      try {
        await supabase.from('linked_accounts').upsert({
          user_id: user.id,
          account_id: 'soundcloud-' + Date.now(),
          provider: 'soundcloud',
          account_name: 'Cuenta SoundCloud',
        });
      } catch (e) {}

      window.dispatchEvent(
        new CustomEvent('show-toast', { detail: { msg: 'Token de SoundCloud guardado', type: 'success' } })
      );
      setShowScModal(false);
      setScTokenInput('');
    }
  };

  const hasYtToken = Boolean(localStorage.getItem('youtube_access_token'));
  const hasScToken = Boolean(localStorage.getItem('soundcloud_oauth_token'));

  return (
    <div className="h-full w-full overflow-y-auto pt-[max(env(safe-area-inset-top,0px),16px)] pb-36 px-4 space-y-6 select-none">
      {/* HEADER WITH LOGO */}
      <header className="pt-2 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-accent uppercase">
            Cuenta y Ajustes
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">Mi Perfil</h1>
        </div>
        <ResonanceLogo size={36} />
      </header>

      {/* USER PROFILE CARD */}
      <section className="p-4 rounded-3xl bg-neutral-900/90 border border-white/10 shadow-xl flex items-center gap-4 relative overflow-hidden">
        {/* AVATAR */}
        <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-neutral-950 border-2 border-white/10 shadow-md flex-shrink-0">
          <img
            src={avatarUrl}
            alt={username}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                username
              )}&background=3b82f6&color=fff&size=256`;
            }}
          />
        </div>

        {/* USER INFO */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-black text-white truncate">{username}</h2>
          <p className="text-xs text-neutral-400 truncate mt-0.5">{email}</p>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenEdit}
            className="p-2.5 text-neutral-400 hover:text-white bg-white/5 active:bg-white/15 rounded-2xl transition-colors"
            title="Editar perfil"
          >
            <Edit3 size={18} />
          </button>
          <button
            onClick={signOut}
            className="p-2.5 text-neutral-400 hover:text-red-400 bg-white/5 active:bg-red-500/10 rounded-2xl transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </section>

      {/* EDIT PROFILE FORM MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Editar Perfil</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1.5 text-neutral-400 hover:text-white bg-white/5 rounded-full"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Tu nombre de usuario"
                  className="w-full bg-black/50 border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
                  URL de Foto de Perfil (Opcional)
                </label>
                <input
                  type="url"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  placeholder="https://ejemplo.com/avatar.jpg"
                  className="w-full bg-black/50 border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 bg-white/10 rounded-2xl text-xs font-bold text-neutral-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !editName.trim()}
                  className="flex-1 py-3 bg-accent text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(59,130,246,0.5)] disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  {hasScToken ? 'Token de cuenta activo' : 'Sesión nativa activa'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowScModal(true)}
              className="px-3 py-1.5 bg-white/10 active:bg-white/20 text-xs font-semibold rounded-xl text-neutral-200"
            >
              Configurar
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

      {/* APP INFO */}
      <section className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
        <div className="flex items-center gap-2 text-neutral-400">
          <Info size={16} />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Acerca de Resonance</h4>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          Resonance v1.0 • Reproductor de música multiplataforma unificado con SoundCloud, YouTube Music,
          biblioteca Supabase y motor de cortes Resonance Cuts.
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

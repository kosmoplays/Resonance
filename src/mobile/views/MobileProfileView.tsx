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
  const [ytTokenInput, setYtTokenInput] = useState('');
  const [showYtModal, setShowYtModal] = useState(false);
  const [showLazaroModal, setShowLazaroModal] = useState(false);

  const deletedHistory = scProps?.deletedHistory || {};
  const lazaroCount = Object.values(deletedHistory).reduce(
    (acc: number, arr: any) => acc + (arr?.length || 0),
    0
  );

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
      const token = scTokenInput.trim();
      localStorage.setItem('soundcloud_oauth_token', token);

      try {
        await supabase.from('linked_accounts').upsert({
          user_id: user.id,
          account_id: `soundcloud-${user.id}`,
          provider: 'soundcloud',
          account_name: 'SoundCloud Móvil',
          access_token: token,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id, provider' as any });
      } catch (e) {}

      window.dispatchEvent(
        new CustomEvent('show-toast', { detail: { msg: 'Cuenta de SoundCloud actualizada', type: 'success' } })
      );
      setShowScModal(false);
      setScTokenInput('');
    }
  };

  const handleSaveYtToken = async () => {
    if (ytTokenInput.trim() && user?.id) {
      const token = ytTokenInput.trim();
      
      if (token.startsWith('1//')) {
        localStorage.setItem('youtube_refresh_token', token);
        try {
           const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                 client_id: "237657675945-gs5o7vfoi2i5c7lu86q8u4c8jb56rcle.apps.googleusercontent.com",
                 client_secret: "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",
                 refresh_token: token,
                 grant_type: "refresh_token"
              })
           });
           const refreshData = await refreshRes.json();
           if (refreshData.access_token) {
               localStorage.setItem('youtube_access_token', refreshData.access_token);
           }
        } catch(e) {}
      } else {
        localStorage.setItem('youtube_access_token', token);
      }

      try {
        await supabase.from('linked_accounts').upsert({
          user_id: user.id,
          account_id: `youtube-${user.id}`,
          provider: 'youtube',
          account_name: 'YouTube Music Móvil',
          access_token: token,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id, provider' as any });
      } catch (e) {}

      window.dispatchEvent(
        new CustomEvent('show-toast', { detail: { msg: 'Cuenta de YouTube actualizada', type: 'success' } })
      );
      setShowYtModal(false);
      setYtTokenInput('');
    }
  };

  const hasYtToken = Boolean(localStorage.getItem('youtube_access_token'));
  const hasScToken = Boolean(localStorage.getItem('soundcloud_oauth_token'));

  return (
    <div
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 44px)',
        maskImage: 'linear-gradient(to bottom, transparent 0px, transparent 15px, black max(env(safe-area-inset-top, 0px), 44px), black 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, transparent 15px, black max(env(safe-area-inset-top, 0px), 44px), black 100%)',
      }}
      className="h-full w-full overflow-y-auto pb-4 px-4 space-y-5 select-none scrollbar-none"
    >
      {/* HEADER WITH LOGO (SCROLLS WITH PAGE) */}
      <header className="flex items-center justify-between">
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

      {/* MOTOR LÁZARO (BOTÓN ELEGANTE QUE ABRE PANEL DE RECUPERACIÓN) */}
      <section>
        <button
          type="button"
          onClick={() => setShowLazaroModal(true)}
          className="w-full p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border border-white/10 active:scale-[0.98] transition-all flex items-center justify-between shadow-lg text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black flex-shrink-0 shadow-inner">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-white">Motor Lázaro</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {lazaroCount} {lazaroCount === 1 ? 'canción' : 'canciones'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Pistas eliminadas u ocultas listas para restaurar
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-accent px-3 py-1.5 bg-white/5 rounded-xl">
            Abrir
          </span>
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
                  {hasScToken ? 'Token de cuenta activo' : 'Sesión nativa activa'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowScModal(true)}
              className="px-3 py-1.5 bg-white/10 active:bg-white/20 text-xs font-semibold rounded-xl text-neutral-200"
            >
              {hasScToken ? 'Actualizar' : 'Configurar'}
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
                  {hasYtToken ? 'Cuenta conectada' : 'No conectada (búsqueda pública)'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowYtModal(true)}
              className="px-3 py-1.5 bg-white/10 active:bg-white/20 text-xs font-semibold rounded-xl text-neutral-200"
            >
              {hasYtToken ? 'Actualizar' : 'Configurar'}
            </button>
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

      {/* MODAL MOTOR LÁZARO */}
      {showLazaroModal && (
        <div className="fixed inset-0 z-[150] flex flex-col justify-end p-0 bg-black/80 backdrop-blur-md">
          <div className="bg-neutral-900 border-t border-white/10 rounded-t-3xl p-5 max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>Motor Lázaro</span>
                  <span className="text-xs font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full">
                    {lazaroCount}
                  </span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Canciones ocultas que no volverán a sonar a menos que las revivas
                </p>
              </div>
              <button
                onClick={() => setShowLazaroModal(false)}
                className="p-2 text-neutral-400 hover:text-white bg-white/5 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {lazaroCount === 0 ? (
                <div className="py-16 text-center text-neutral-500 space-y-2">
                  <p className="text-sm font-semibold">No tienes canciones en el Motor Lázaro</p>
                  <p className="text-xs text-neutral-600">
                    Las canciones que elimines de Resonance aparecerán aquí para que puedas restaurarlas
                  </p>
                </div>
              ) : (
                Object.entries(deletedHistory).map(([source, tracks]: [string, any]) => {
                  if (!tracks || tracks.length === 0) return null;
                  return (
                    <div key={source} className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                          {source} ({tracks.length})
                        </span>
                        {scProps.restoreAllFromHistory && (
                          <button
                            onClick={() => scProps.restoreAllFromHistory(source)}
                            className="text-xs font-bold text-accent active:opacity-70"
                          >
                            Revivir todas
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {tracks.map((t: any) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5"
                          >
                            <div className="min-w-0 pr-3">
                              <h5 className="font-bold text-xs text-white truncate">{t.title}</h5>
                              <p className="text-[10px] text-neutral-400 truncate">
                                {t.user?.username || t.artist || 'Desconocido'}
                              </p>
                            </div>
                            {scProps.restoreTrackFromHistory && (
                              <button
                                onClick={() => scProps.restoreTrackFromHistory(source, t.id)}
                                className="px-3 py-1.5 bg-accent/20 text-accent font-bold text-xs rounded-xl active:scale-95 flex-shrink-0"
                              >
                                Revivir
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL TOKEN SC */}
      {showScModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white">Vincular Token de SoundCloud</h3>
            <p className="text-xs text-neutral-400">
              Pega tu token de sesión de SoundCloud (`OAuth 2-...`) para acceder a todos tus me gusta privados. Se actualizará tu cuenta vinculada sin duplicar registros.
            </p>
            <input
              type="text"
              placeholder="2-322582-..."
              value={scTokenInput}
              onChange={(e) => setScTokenInput(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
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

      {/* MODAL TOKEN YOUTUBE */}
      {showYtModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white">Vincular Cuenta de YouTube</h3>
            <p className="text-xs text-neutral-400">
              Pega tu <strong>youtube_refresh_token</strong> (suele empezar por <code>1//</code>). Puedes encontrarlo en tu PC abriendo Resonance, pulsando <code>F12</code>, yendo a "Aplicación" &gt; "Almacenamiento Local". Esto evitará que caduque en el móvil.
            </p>
            <input
              type="text"
              placeholder="ya29.a0AfH6SM..."
              value={ytTokenInput}
              onChange={(e) => setYtTokenInput(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowYtModal(false)}
                className="flex-1 py-2.5 bg-white/10 rounded-xl text-xs font-semibold text-neutral-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveYtToken}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl"
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

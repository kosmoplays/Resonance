import { BadgeCheck, Cloud, UserPlus, UserMinus, ExternalLink, Play, Wrench, X } from "lucide-react";
import { useState } from "react";
import { openUrl } from '@tauri-apps/plugin-opener';
import { supabase } from '../lib/supabase';

interface ProfileHeaderProps {
  profileUser: any;
  goBack?: () => void;
  toggleFollow: (user: any) => void;
  follows: any[];
  onPlay?: () => void;
  onRefresh?: () => void;
}

export function ProfileHeader({ profileUser, toggleFollow, follows, onPlay, onRefresh }: ProfileHeaderProps) {
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [scOverrideInput, setScOverrideInput] = useState("");
  const [ytOverrideInput, setYtOverrideInput] = useState("");

  if (!profileUser) return null;

  const providers = profileUser.providers || [profileUser.provider];
  const isHybrid = providers.includes('soundcloud') && providers.includes('youtube');
  const isYouTube = providers.includes('youtube');
  const isFollowing = follows?.some((a: any) => String(a.id) === String(profileUser.id));

  const handleSaveOverride = async () => {
    const overrides = JSON.parse(localStorage.getItem('resonance_artist_overrides') || '{}');
    const safeId = String(profileUser.id);
    const key = safeId;
    
    if (!overrides[key]) overrides[key] = {};
    
    // Extraer handles limpiando URLs
    let scClean = scOverrideInput.trim();
    if (scClean.includes('soundcloud.com/')) scClean = scClean.split('soundcloud.com/')[1].split('/')[0];
    
    let ytClean = ytOverrideInput.trim();
    if (ytClean.includes('youtube.com/')) {
       ytClean = ytClean.split('youtube.com/')[1].split('/')[0];
       if (ytClean.startsWith('@')) ytClean = ytClean;
       else if (ytClean === 'c' || ytClean === 'channel') ytClean = ytOverrideInput.split('/').pop() || '';
    }

    if (scClean) overrides[key].sc_handle = scClean;
    if (ytClean) overrides[key].yt_handle = ytClean.startsWith('@') ? ytClean : '@' + ytClean;
    
    // 1. Guardar en local (Respuesta rápida)
    localStorage.setItem('resonance_artist_overrides', JSON.stringify(overrides));
    setShowOverrideModal(false);

    // 2. Sincronizar con Supabase en segundo plano
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        await supabase.from('resonance_artist_overrides').upsert({
          user_id: sessionData.session.user.id,
          artist_key: key,
          sc_handle: overrides[key].sc_handle || null,
          yt_handle: overrides[key].yt_handle || null
        }, { onConflict: 'user_id, artist_key' });
      }
    } catch (e) {
      console.error("Error guardando override en Supabase:", e);
    }

    if (onRefresh) onRefresh();
  };

  return (
    <div className="relative w-full min-h-[460px] flex flex-col justify-end px-10 pb-10 pt-24 mb-8 overflow-hidden rounded-b-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.6)] border-b border-white/5 bg-base group/header">
      
      {/* Fondo Híbrido Protegido */}
      <div
        className={`absolute inset-0 -z-20 bg-cover bg-center transition-all duration-1000 ${profileUser.banner_url ? 'opacity-90 saturate-110' : 'opacity-80 blur-[80px] saturate-[2.0] scale-125'}`}
        style={{ backgroundImage: `url(${profileUser.banner_url || profileUser.avatar_url?.replace('-large', '-t500x500')})` }}
      />
      
      {/* Capas de contraste extremo obligatoria */}
      <div className="absolute inset-0 -z-15 bg-black/60 mix-blend-multiply" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-base via-base/80 to-transparent" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-base/90 via-base/40 to-transparent" />
      
      {/* Info del Artista Nivel AAA */}
      <div className="flex flex-col md:flex-row items-center md:items-end text-center md:text-left gap-6 md:gap-10 w-full max-w-5xl mx-auto z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] ring-[4px] ring-white/20 bg-neutral-900 flex-shrink-0 relative group mx-auto md:mx-0">
          <img
            src={profileUser?.avatar_url?.replace('-large', '-t500x500') || 'https://placehold.co/500x500/1a1a1a/333333?text=USER'}
            alt={profileUser.username}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="flex flex-col items-center md:items-start gap-3 w-full max-w-3xl">
          
          {/* Píldoras de Estadísticas e Insignias Híbridas */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-1">
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
              {isHybrid ? 'Artista Híbrido' : 'Artista Verificado'}
            </span>
            {profileUser.total_followers > 0 && (
              <span className="text-[11px] font-bold text-neutral-200 drop-shadow-md bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/5 flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-accent"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                {new Intl.NumberFormat('es-ES').format(profileUser.total_followers)} Seguidores
              </span>
            )}
          </div>

          {/* Título Principal */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-white flex items-center justify-center md:justify-start gap-4 drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] tracking-tighter -ml-1 line-clamp-2 leading-none">
            {profileUser?.username || "Artista Desconocido"}
            {(profileUser?.verified || profileUser?.badges?.verified) && (
              <BadgeCheck size={48} className={`flex-shrink-0 drop-shadow-lg transition-colors ${
                isHybrid ? 'text-[#3b82f6]' : isYouTube ? 'text-[#FF0000]' : 'text-[#ff5500]'
              }`} />
            )}
          </h1>

          {/* Arrobas Multi-Plataforma */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {profileUser?.sc_handle && (
                <span 
                  onClick={(e) => { e.stopPropagation(); setRedirectUrl(`https://soundcloud.com/${profileUser.sc_handle}`); }}
                  className="text-xs font-semibold text-white/90 flex items-center gap-1.5 bg-black/50 px-3 py-1.5 rounded-md border border-white/10 shadow-md backdrop-blur-md hover:bg-black/70 transition-colors cursor-pointer"
                >
                  <Cloud size={14} className="text-[#ff5500]" />@{profileUser.sc_handle}
                </span>
              )}
              {profileUser?.yt_handle && (
                <span 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    const exactUrl = profileUser.yt_id ? `https://youtube.com/channel/${profileUser.yt_id}` : `https://youtube.com/${profileUser.yt_handle.startsWith('@') ? '' : '@'}${profileUser.yt_handle.replace(/\s+/g, '')}`;
                    setRedirectUrl(exactUrl); 
                  }}
                  className="text-xs font-semibold text-white/90 flex items-center gap-1.5 bg-black/50 px-3 py-1.5 rounded-md border border-white/10 shadow-md backdrop-blur-md hover:bg-black/70 transition-colors cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#FF0000]"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"></polygon></svg>
                  {profileUser.yt_handle}
                </span>
              )}

            {!profileUser?.sc_handle && !profileUser?.yt_handle && (
              <span className="text-xs font-semibold text-white/90 bg-black/50 px-3 py-1.5 rounded-md border border-white/10 shadow-md backdrop-blur-md">@{profileUser?.permalink || "usuario"}</span>
            )}
          </div>
          
          {/* Biografía Expandible */}
          {profileUser.bio && (
            <p className="text-sm font-medium text-white/80 w-full max-w-2xl mt-3 drop-shadow-md line-clamp-2 hover:line-clamp-none transition-all leading-relaxed bg-black/40 p-4 rounded-xl backdrop-blur-md border border-white/5 shadow-inner cursor-pointer">
              {profileUser.bio}
            </p>
          )}
          
          {/* Botón Seguir */}
          <div className="flex items-center gap-4 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <button
              onClick={(e) => { e.stopPropagation(); if (onPlay) onPlay(); }}
              className="px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition-all bg-[#3b82f6] hover:bg-[#2563eb] text-white hover:scale-105 shadow-[0_0_20px_rgba(59,130,246,0.4)]"
            >
              <Play size={16} className="fill-current" /> Reproducir
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleFollow(profileUser); }}
              className={`px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition-all ${isFollowing ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20' : 'bg-white text-black hover:scale-105 shadow-lg'}`}
            >
              {isFollowing ? <><UserMinus size={16} /> Siguiendo</> : <><UserPlus size={16} /> Seguir</>}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN DE REDIRECCIÓN EXTERNA */}
      {redirectUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={(e) => { e.stopPropagation(); setRedirectUrl(null); }}>
           <div className="bg-[#181818] border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative flex flex-col items-center text-center" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-12 bg-[#3b82f6]/20 rounded-full flex items-center justify-center mb-4 text-[#3b82f6] ring-1 ring-[#3b82f6]/30">
                <ExternalLink size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Redirección Externa</h3>
              <p className="text-sm text-neutral-400 mb-6">Estás a punto de salir de Resonance. ¿Deseas abrir la página oficial del artista en tu navegador web predeterminado?</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setRedirectUrl(null)} className="flex-1 py-2.5 rounded-lg font-bold text-sm bg-white/5 hover:bg-white/10 text-white transition-colors">Cancelar</button>
                <button 
                  onClick={async () => { if (redirectUrl) await openUrl(redirectUrl); setRedirectUrl(null); }} 
                  className="flex-1 py-2.5 rounded-lg font-bold text-sm bg-[#3b82f6] hover:bg-[#2563eb] text-white transition-colors shadow-lg shadow-[#3b82f6]/20 flex items-center justify-center"
                >
                  Abrir Enlace
                </button>
              </div>
           </div>
        </div>
      )}

      {/* BOTÓN DE CORRECCIÓN MANUAL (Wrench) */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowOverrideModal(true); }}
        className="absolute top-8 right-8 z-50 p-2 rounded-full bg-black/40 border border-white/10 text-white/50 hover:text-white hover:bg-black/80 backdrop-blur-md opacity-0 group-hover/header:opacity-100 transition-all shadow-lg"
        title="Corregir enlaces del artista"
      >
        <Wrench size={20} />
      </button>

      {/* MODAL DE CORRECCIÓN MANUAL */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={(e) => { e.stopPropagation(); setShowOverrideModal(false); }}>
           <div className="bg-[#181818] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowOverrideModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X size={20}/></button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white"><Wrench size={18} /></div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Vincular Enlaces Manualmente</h3>
                  <p className="text-xs text-neutral-400">Si Resonance no encontró el perfil correcto</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className="text-xs font-bold text-white/70 mb-1.5 flex items-center gap-1.5"><Cloud size={14} className="text-[#ff5500]"/> URL o Handle de SoundCloud</label>
                  <input 
                    type="text" 
                    placeholder="Ej: https://soundcloud.com/artista o @artista"
                    value={scOverrideInput}
                    onChange={(e) => setScOverrideInput(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#ff5500] focus:ring-1 focus:ring-[#ff5500] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white/70 mb-1.5 flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#FF0000]"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"></polygon></svg>
                    URL o Handle de YouTube
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ej: https://youtube.com/@artista o @artista"
                    value={ytOverrideInput}
                    onChange={(e) => setYtOverrideInput(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#FF0000] focus:ring-1 focus:ring-[#FF0000] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <button onClick={() => setShowOverrideModal(false)} className="flex-1 py-2.5 rounded-lg font-bold text-sm bg-white/5 hover:bg-white/10 text-white transition-colors">Cancelar</button>
                <button 
                  onClick={handleSaveOverride} 
                  className="flex-1 py-2.5 rounded-lg font-bold text-sm bg-white hover:bg-neutral-200 text-black transition-colors shadow-lg"
                >
                  Guardar y Recargar
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
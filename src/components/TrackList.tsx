import { type } from '@tauri-apps/plugin-os';
const isMobile = type() === 'ios' || type() === 'android';
import { Play, Volume2, Cloud, Heart, HelpCircle, ChevronDown, ChevronUp, Unplug, X, HardDrive, MoreVertical } from "lucide-react";
import { useState } from "react";
import { usePlayerStore } from "../store/usePlayerStore";


interface TrackListProps {
  openArtistProfile?: any;
  tracks: any[];
  currentTrack: any;
  playTrack: (track: any) => void;
  setContextMenu: (state: any) => void;
  likes: any[];
  scLikes?: any[];
  ytLikes?: any[];
  toggleLike: (track: any) => void;
  onRemoveTrack?: (trackId: any) => void;
}

export function TrackList({ tracks, currentTrack, playTrack, setContextMenu, likes, scLikes, ytLikes, toggleLike, openArtistProfile, onRemoveTrack }: TrackListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { autoplayBlacklist } = usePlayerStore();

  const isTrackLiked = (track: any) => {
    return likes?.some((t: any) => String(t.id) === String(track.id));
  };

  return (
    <ul className="flex flex-col gap-1">
      {tracks.map((track, index) => {
        const isActive = currentTrack?.id === track.id;
        const isBlacklisted = autoplayBlacklist?.includes(String(track.id));
        
        return (
          <li
            key={track.id}
            style={{ contentVisibility: 'auto', containIntrinsicSize: '60px' }}
            className="flex flex-col w-full"
          >
            <div
              onClick={() => playTrack(track)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ visible: true, x: e.pageX, y: e.pageY, track });
              }}
              className={`flex items-center px-4 py-2.5 w-full rounded-lg cursor-pointer transition-all duration-300 group ${isActive ? 'bg-white/10' : 'hover:bg-white/5'} ${isBlacklisted && !isActive ? 'opacity-30 grayscale hover:opacity-100 hover:grayscale-0' : ''}`}
            >
              <div className="w-10 flex justify-center items-center text-neutral-500 font-medium text-sm flex-shrink-0">
                <span className={`group-hover:hidden ${isActive ? 'hidden' : 'block'}`}>{index + 1}</span>
                <Play size={16} className={`text-white hidden group-hover:block ${isActive ? '!hidden' : ''}`} fill="currentColor" />
                {isActive && <Volume2 size={16} className="text-accent drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
              </div>

              <img
                  src={track.artwork_url?.replace('-large', '-t50x50') || track.user?.avatar_url?.replace('-large', '-t50x50') || 'https://placehold.co/50x50/1a1a1a/333333?text=RN'}
                  className="w-10 h-10 rounded bg-neutral-800 ml-6 mr-4 object-cover flex-shrink-0 shadow-md"
                  alt=""
                />

              <div className="flex-1 flex flex-col min-w-0 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {((track as any).providers || [(track as any).provider || ((track as any).permalink_url || typeof (track as any).id === 'number' ? 'soundcloud' : 'unknown')]).map((prov: string, idx: number) => (
                        <span key={idx} title={prov === 'youtube' ? "Disponible en YouTube" : prov === 'soundcloud' ? "Disponible en SoundCloud" : "Fuente desconocida"} className="flex items-center">
                          {prov === 'youtube' ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#FF0000] flex-shrink-0 drop-shadow-md">
                              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94 2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"></path>
                              <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"></polygon>
                            </svg>
                          ) : prov === 'soundcloud' ? (
                            <Cloud size={16} className="text-[#ff5500] flex-shrink-0 fill-[#ff5500]/20" />
                          ) : prov === 'local' ? (
                            <HardDrive size={15} className="text-[#10b981] flex-shrink-0 drop-shadow-md" />
                          ) : (
                            <HelpCircle size={15} className="text-neutral-500 opacity-60 flex-shrink-0" />
                          )}
                        </span>
                      ))}
                    </div>
                  <p className={`text-sm font-semibold truncate flex items-center gap-2 ${isActive ? 'text-accent' : 'text-neutral-100'}`}>
                    {track.title}
                    {(track.policy === 'SNIP' || track.snipped === true) && (
                      <span className="text-[9px] font-black bg-[#ff5500]/20 text-[#ff5500] px-1.5 py-0.5 rounded uppercase tracking-widest border border-[#ff5500]/30 shrink-0">
                        SNIPPET
                      </span>
                    )}
                  </p>
                </div>
                <p 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (openArtistProfile && track.user) openArtistProfile(track.user);
                  }}
                  className="text-xs text-neutral-400 truncate mt-0.5 hover:underline hover:text-white cursor-pointer transition-colors w-max relative z-10"
                >
                  {track.user?.username}
                </p>
              </div>

              <button
                 onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                 className={`p-2 transition-all ${isTrackLiked(track) || isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} focus:opacity-100`}
                 title="Me Gusta"
               >
                 <Heart
                   size={16}
                   className={isTrackLiked(track) ? "text-[#3b82f6] fill-[#3b82f6] drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "text-neutral-500 hover:text-white"}
                 />
               </button>

                {/* BOTÓN DE MENÚ CONTEXTUAL (SOLO MÓVIL) */}
                {isMobile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setContextMenu({ visible: true, x: e.pageX, y: e.pageY, track });
                    }}
                    className="p-2 mr-2 transition-all opacity-100 text-neutral-400 focus:opacity-100"
                    title="Opciones"
                  >
                    <MoreVertical size={16} />
                  </button>
                )}

                {/* 🛡️ BOTÓN DE ELIMINACIÓN DE PISTA (Solo visible en Playlists propias) */}
                {onRemoveTrack && !isMobile && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveTrack(track.id); }}
                    className="p-2 mr-2 transition-all opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-neutral-500 hover:text-red-400 rounded-full flex-shrink-0"
                    title="Quitar de la Playlist"
                  >
                    <X size={16} />
                  </button>
                )}

                <div className="w-48 flex flex-col items-end justify-center pr-4">
                  <div className="flex flex-col items-end justify-center transition-all duration-300">
                    <span className="text-[13px] font-bold text-neutral-300">
                      {((track as any).playback_count || 0) > 0 ? new Intl.NumberFormat('es-ES').format((track as any).playback_count) : ''}
                    </span>
                    {(track as any).providers && (track as any).providers.length > 1 && (
                      <div className="flex items-center gap-2 mt-1 opacity-60 group-hover/stats:opacity-100 transition-opacity">
                        {((track as any).sc_playback || 0) > 0 && (
                          <span className="flex items-center gap-1 text-[9.5px] text-[#ff5500] font-semibold" title={`SoundCloud: ${new Intl.NumberFormat('es-ES').format((track as any).sc_playback)}`}>
                            <Cloud size={9} className="fill-[#ff5500]/20" />
                            {new Intl.NumberFormat('es-ES', { notation: "compact", maximumFractionDigits: 1 }).format((track as any).sc_playback)}
                          </span>
                        )}
                        {((track as any).yt_playback || 0) > 0 && (
                          <span className="flex items-center gap-1 text-[9.5px] text-[#FF0000] font-semibold" title={`YouTube: ${new Intl.NumberFormat('es-ES').format((track as any).yt_playback)}`}>
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.94 2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"></polygon></svg>
                            {new Intl.NumberFormat('es-ES', { notation: "compact", maximumFractionDigits: 1 }).format((track as any).yt_playback)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* BOTÓN DESPLEGABLE HÍBRIDO CON ANIMACIÓN DE DESPLAZAMIENTO AISLADO */}
                  {(track as any).providers && (track as any).providers.length > 1 && (
                    <div className={`overflow-hidden transition-all duration-300 ease-out flex items-center justify-end ${expandedId === track.id ? 'max-w-[40px] opacity-100 translate-x-0 ml-3' : 'max-w-0 opacity-0 translate-x-4 group-hover/stats:max-w-[40px] group-hover/stats:opacity-100 group-hover/stats:translate-x-0 group-hover/stats:ml-3'}`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === track.id ? null : track.id); }}
                        className={`p-1.5 rounded-md transition-all shrink-0 ${expandedId === track.id ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                        title="Ver fuentes mezcladas"
                      >
                        {expandedId === track.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* CAJA DESPLEGABLE DE FUENTES HÍBRIDAS */}
              {expandedId === track.id && (track as any).providers && (track as any).providers.length > 1 && (
                <div className="flex flex-col bg-black/40 rounded-b-lg border-x border-b border-white/5 mx-4 mb-2 p-3 animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Archivos Originales Fusionados</span>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      const blacklist = JSON.parse(localStorage.getItem('resonance_unlinked') || '[]');
                      const merged = (track as any).merged_from || [];
                      merged.forEach((s1: any) => {
                        merged.forEach((s2: any) => {
                          if (s1.id !== s2.id) blacklist.push(`${s1.id}|${s2.id}`);
                        });
                      });
                      localStorage.setItem('resonance_unlinked', JSON.stringify([...new Set(blacklist)]));
                      setExpandedId(null);
                    }} className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors" title="Desvincular y no volver a unir">
                      <Unplug size={12} /> Separar
                    </button>
                  </div>                  {((track as any).merged_from || []).map((sourceTrack: any, idx: number) => {
                    const prov = sourceTrack.provider;
                    return (
                      <div key={idx} className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded transition-colors group">
                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                          <div className="relative w-8 h-8 rounded bg-neutral-800 flex-shrink-0 overflow-hidden shadow-sm">
                            <img src={sourceTrack.artwork_url?.replace('-large', '-t50x50') || 'https://placehold.co/50x50/1a1a1a/333333?text=N/A'} className="w-full h-full object-cover" alt="portada" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-tl bg-black/90 flex items-center justify-center backdrop-blur-md">
                                {prov === 'youtube' ? (
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-[#FF0000]"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"></polygon></svg>
                                ) : prov === 'soundcloud' ? (
                                  <Cloud size={10} className="text-[#ff5500] fill-[#ff5500]/20" />
                                ) : (
                                  <HelpCircle size={10} className="text-neutral-500" />
                                )}
                            </div>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[13px] font-semibold text-white truncate group-hover:text-accent transition-colors">{sourceTrack.title}</span>
                            <span className="text-[10px] text-neutral-400 truncate">{sourceTrack.user?.username} • {prov === 'youtube' ? 'YouTube Music' : 'SoundCloud'}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-medium whitespace-nowrap">
                          {(sourceTrack.playback_count || 0) > 0 ? new Intl.NumberFormat('es-ES').format(sourceTrack.playback_count) : '---'} reprod.
                        </span>
                      </div>
                    );
                  })}
                  {(!((track as any).merged_from) || ((track as any).merged_from).length === 0) && (
                     <div className="text-xs text-neutral-500 font-medium p-2 text-center border border-dashed border-white/10 rounded mt-2">Los metadatos originales no están en caché. Refresca la vista para cargarlos.</div>
                  )}
                </div>
              )}
            </li>
        );
      })}
    </ul>
  );
}
import { Search, Loader2, User, ChevronDown, ChevronUp, Unplug, Cloud, HelpCircle, Heart, LayoutGrid, List, ArrowDownUp, X, CheckCheck } from "lucide-react";
import { usePlayerStore } from "../store/usePlayerStore";
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { HomeView } from "../views/HomeView";
import { ProfileView } from "../views/ProfileView";
import { ContextMenu } from "./ContextMenu";
import { TrackList } from "./TrackList";
import { ArtistGrid } from "./ArtistGrid";
import { ProfileHeader } from "./ProfileHeader";
import { useMobile } from "../hooks/useMobile";
export function MainContent({
  isLoadingTracks, isSearching, playTrack, viewTitle, analyserRef,
  useWidget, openArtistProfile, likes, scLikes, ytLikes, toggleLike, removeLikeExternal, resonancePlaylists,
  addTrackToPlaylist, removeTrackFromPlaylist, follows, toggleFollow, goBack, openPlaylist, loadMoreYtLikes, deletedHistory, recoverTrack }: any) {
  const isMobile = useMobile();
  const { viewTracks, viewUsers, viewPlaylists, currentTrack, isPlaying, autoplayBlacklist } = usePlayerStore();

  const isProfile = viewTitle.startsWith('Perfil:');
  const isSearch = viewTitle.startsWith('Resultados:');
  
  // VÍNCULO DIRECTO Y SEGURO
  const L = 0;
  const profileUser = (isProfile && viewUsers && viewUsers.length > 0) ? (viewUsers[L] as any) : null;
      
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, track: any | null }>({ visible: false, x: 0, y: 0, track: null });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // 🛡️ Estados para la gestión avanzada de la vista "Siguiendo"
  const [followSearch, setFollowSearch] = useState("");
  const [followViewMode, setFollowViewMode] = useState<'grid' | 'list'>('grid');

  // 🛡️ Estado del Motor Lógico de Ordenación de Listas
  const [sortFilter, setSortFilter] = useState<'default' | 'az' | 'za' | 'artist' | 'popular'>('default');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [profileSearchQuery, setProfileSearchQuery] = useState("");
  // Al cambiar de vista, reiniciamos el filtro
  useEffect(() => { setSortFilter('default'); setProfileSearchQuery(""); }, [viewTitle]);
  const bgRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const albumsCarouselRef = useRef<HTMLDivElement>(null);

  // Control del Carrusel sin mover la página
  useEffect(() => {
    const searchCarousel = carouselRef.current;
    const albumsCarousel = albumsCarouselRef.current;

    const handleNativeWheel = (e: WheelEvent) => {
      const el = e.currentTarget as HTMLElement;
      // Solo secuestramos la rueda si realmente hay elementos ocultos (desbordamiento)
      if (e.deltaY !== 0 && el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    if (searchCarousel) searchCarousel.addEventListener("wheel", handleNativeWheel, { passive: false });
    if (albumsCarousel) albumsCarousel.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      if (searchCarousel) searchCarousel.removeEventListener("wheel", handleNativeWheel);
      if (albumsCarousel) albumsCarousel.removeEventListener("wheel", handleNativeWheel);
    };
  }, [viewUsers, profileUser]);
  
  useEffect(() => {
    const handleClick = () => setContextMenu({ visible: false, x: 0, y: 0, track: null });
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // --- MOTOR DE FÍSICA VISUAL (60 FPS) ---
  useEffect(() => {
    if (!analyserRef?.current || useWidget || !isPlaying) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationId: number;

    let smoothedBass = 0;
    let phase = 0; 

    const renderFrame = () => {
      animationId = requestAnimationFrame(renderFrame);
      analyser.getByteFrequencyData(dataArray);

      let bassSum = 0;
      for (let i = 0; i < 12; i++) { bassSum += dataArray[i]; }
      const rawIntensity = (bassSum / 12) / 255;
      
      smoothedBass += (rawIntensity - smoothedBass) * 0.12;
      phase += 0.005 + (smoothedBass * 0.04);

      if (bgRef.current) {
        const movementRadius = 15 + (smoothedBass * 25);
        const x = Math.sin(phase * 0.8) * movementRadius;
        const y = Math.cos(phase * 0.6) * movementRadius;
        const scale = 1.1 + (smoothedBass * 0.12);
        const activeOpacity = 0.6 + (smoothedBass * 0.4);

        bgRef.current.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0) scale(${scale})`;
        bgRef.current.style.opacity = `${activeOpacity}`;
      }
    };

    renderFrame();

    return () => {
      cancelAnimationFrame(animationId);
      if (bgRef.current) {
        bgRef.current.style.transform = 'translate(-50%, -50%) translate3d(0px, 0px, 0) scale(1.1)';
        bgRef.current.style.opacity = '0.8';
        bgRef.current.style.transition = 'transform 1s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 1s ease-out';
        setTimeout(() => { if (bgRef.current) bgRef.current.style.transition = 'none'; }, 1000);
      }
    };
  }, [isPlaying, useWidget, analyserRef]);

  // 🛡️ Lógica de Ordenación de Playlists (Filtros Lógicos de Rendimiento AAA)
    const sortedViewTracks = useMemo(() => {
      if (sortFilter === 'default') return viewTracks;
      const tracksCopy = [...viewTracks];
      if (sortFilter === 'az') return tracksCopy.sort((a: any, b: any) => (a.title || "").localeCompare(b.title || ""));
      if (sortFilter === 'za') return tracksCopy.sort((a: any, b: any) => (b.title || "").localeCompare(a.title || ""));
      if (sortFilter === 'artist') return tracksCopy.sort((a: any, b: any) => (a.user?.username || "").localeCompare(b.user?.username || ""));
      if (sortFilter === 'popular') return tracksCopy.sort((a: any, b: any) => ((b.playback_count || b.sc_playback || b.yt_playback) || 0) - ((a.playback_count || a.sc_playback || a.yt_playback) || 0));
      return tracksCopy;
    }, [viewTracks, sortFilter]);

    // Preparación de arrays para el perfil
    const topTracks = isProfile ? sortedViewTracks.slice(0, 5) : sortedViewTracks;
    const restTracks = isProfile ? sortedViewTracks.slice(5) : [];

    // 🛡️ Preparación del motor de filtrado en vivo para la vista "Siguiendo"
    const filteredFollows = (viewTitle === "Artistas Seguidos" && viewUsers) 
      ? viewUsers.filter((u: any) => (u.username || u.name || "").toLowerCase().includes(followSearch.toLowerCase())) 
      : [];

    // 🛡️ Detección de Lista Activa para el motor de eliminación
    const activeResonancePlaylist = resonancePlaylists?.find((p: any) => p.title === viewTitle);

    return (
      <main className="flex-1 flex flex-col min-w-0 bg-base relative overflow-hidden ">
        
        {/* FLECHA DE RETROCESO FIJA ABSOLUTA (INMÓVIL AL SCROLL) */}
        {!isMobile && viewTitle !== "Inicio" && (
          <button 
            onClick={goBack} 
            className="absolute top-6 left-8 z-50 w-12 h-12 flex items-center justify-center bg-black/40 hover:bg-[#3b82f6]/90 text-white rounded-full transition-all duration-300 backdrop-blur-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.6)] group hover:scale-105"
            title="Volver"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><path d="m15 18-6-6 6-6"/></svg>
          </button>
        )}

        {/* MOTOR PROCEDURAL AEROESPACIAL */}
         {(currentTrack?.artwork_url || currentTrack?.user?.avatar_url) && (
         <div className={`absolute inset-0 z-0 pointer-events-none overflow-hidden transition-opacity duration-1000 ${isSearch ? 'opacity-10' : 'opacity-100'}`}>
           <style>{`
               @keyframes reactor-pulse {
                 0%, 100% { transform: translate(-50%, -50%) translate3d(0,0,0) scale(1.1); opacity: 0.5; }
                 50% { transform: translate(-50%, -50%) translate3d(0,0,0) scale(1.15); opacity: 0.85; }
               }
               .engine-active {
                 animation: reactor-pulse 10s infinite ease-in-out;
               }
             `}</style>
                     <div
            id="black-hole-bg"
            ref={bgRef}
            className={`absolute top-1/2 left-1/2 w-[150vw] h-[150vh] bg-no-repeat bg-cover bg-center ${useWidget && isPlaying ? 'engine-active' : ''}`}
            style={{
              backgroundImage: `url(${currentTrack.artwork_url?.replace('-large', '-t500x500') || currentTrack.user?.avatar_url?.replace('-large', '-t500x500')})`,
              transform: 'translate(-50%, -50%) translate3d(0px, 0px, 0) scale(1.1)',              filter: 'blur(100px) saturate(250%) brightness(0.65)',
              opacity: 0.80,
              willChange: 'transform, opacity'
            }}
          />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJub25lIi8+CjxwYXRoIGQ9Ik0wIDBoNHYxSDB6IiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDgpIi8+Cjwvc3ZnPg==')] opacity-60 mix-blend-overlay z-[1]" />
          <div className="absolute inset-0 bg-black/40 z-[2]" />
          <div className="absolute inset-0 bg-gradient-to-b from-base/80 via-base/95 to-base z-10" />
        </div>
      )}

      {/* CONTENEDOR UNIFICADO CON SCROLL INFINITO */}
      <div 
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
          if (scrollHeight - scrollTop - clientHeight < 200) {
            if (viewTitle === "Me Gusta (YouTube)" && loadMoreYtLikes) {
              loadMoreYtLikes();
            }
          }
        }}
        className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden relative z-10 profile-bg-wrapper"
      >

        
                
        {viewTitle === "Inicio" ? (
          <HomeView follows={follows} likes={likes} playTrack={playTrack} openArtistProfile={openArtistProfile} openPlaylist={openPlaylist} />
        ) : viewTitle === "Mi Perfil" ? (
          <ProfileView likes={likes} resonancePlaylists={resonancePlaylists} follows={follows} />
        ) : viewTitle === "Artistas Seguidos" ? (
          <div className="w-full max-w-5xl mx-auto px-4 md:px-10 pt-6 md:pt-16 pb-24 animate-in fade-in duration-500">
            <header className="mb-8 border-b border-white/5 pb-8">
              <h1 className="text-5xl font-black text-white tracking-tight mb-4 flex items-center gap-4 drop-shadow-xl">
                <User className="text-emerald-400" size={48} />
                Siguiendo
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-neutral-400 font-medium text-lg">Tu colección personal de creadores.</p>
                {viewUsers && viewUsers.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input autoComplete="off" spellCheck="false"  
                        type="text" 
                        placeholder="Buscar artista..." 
                        value={followSearch} 
                        onChange={(e) => setFollowSearch(e.target.value)} 
                        className="bg-black/40 border border-white/10 rounded-full py-2 pl-9 pr-4 text-sm text-white placeholder-neutral-500 outline-none focus:border-emerald-500/50 focus:bg-white/5 transition-all w-48 sm:w-64"
                      />
                    </div>
                    <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-1">
                      <button onClick={() => setFollowViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${followViewMode === 'grid' ? 'bg-white/10 text-emerald-400' : 'text-neutral-500 hover:text-white'}`} title="Vista Cuadrícula">
                        <LayoutGrid size={16} />
                      </button>
                      <button onClick={() => setFollowViewMode('list')} className={`p-1.5 rounded-md transition-colors ${followViewMode === 'list' ? 'bg-white/10 text-emerald-400' : 'text-neutral-500 hover:text-white'}`} title="Vista Lista">
                        <List size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </header>
            
            {viewUsers && viewUsers.length > 0 ? (
              filteredFollows.length > 0 ? (
                followViewMode === 'grid' ? (
                  <ArtistGrid users={filteredFollows} openArtistProfile={openArtistProfile} mode="grid" />
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredFollows.map((user: any) => (
                      <div 
                        key={user.id} 
                        onClick={() => openArtistProfile(user)} 
                        className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 rounded-xl cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <img src={user.avatar_url?.replace('-large', '-t50x50') || 'https://placehold.co/50x50/1a1a1a/333333?text=USER'} alt={user.username} className="w-12 h-12 rounded-full object-cover shadow-md" />
                          <div className="flex flex-col">
                            <span className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors tracking-tight">{user.username || user.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity pr-4">
                          {(user.providers || [user.provider]).map((prov: string, idx: number) => (
                            <span key={idx}>
                              {prov === 'youtube' ? (
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#FF0000]">
                                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"></path>
                                  <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"></polygon>
                                </svg>
                              ) : (
                                <Cloud size={20} className="text-[#ff5500]" />
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
                  <Search size={32} className="mb-4 opacity-30 text-emerald-400" />
                  <p>No se encontraron artistas que coincidan con "<span className="text-white">{followSearch}</span>"</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-neutral-600 bg-white/5 border border-white/5 rounded-3xl shadow-inner mt-8">
                 <User size={64} className="mb-6 opacity-20 text-emerald-400" />
                 <p className="text-xl font-bold text-neutral-400">Aún no sigues a ningún artista</p>
                 <p className="text-sm text-neutral-500 mt-2">Busca a tus creadores favoritos y pulsa "Seguir".</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* CABECERA (Perfil del Artista o Búsqueda) */}
            {isProfile && profileUser ? (
              <ProfileHeader
                profileUser={profileUser}
                toggleFollow={toggleFollow}
                follows={follows}
                onRefresh={() => openArtistProfile(profileUser)}
                onPlay={() => {
                  const L = 0;
                  if (sortedViewTracks && sortedViewTracks.length > L) {
                    playTrack(sortedViewTracks[L]);
                  }
                }}
              />
            ) : (
              <header className="px-10 pt-16 pb-8 flex-shrink-0 w-full max-w-5xl mx-auto relative z-[60]">
                <div className="flex items-end gap-6 mb-4">
                  {activeResonancePlaylist?.artwork_url && (
                    <img 
                      src={activeResonancePlaylist.artwork_url.replace('-large', '-t500x500')} 
                      alt={activeResonancePlaylist.title}
                      className="w-40 h-40 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] object-cover border border-white/10"
                    />
                  )}
                  <h1 className="text-5xl font-black text-white tracking-tight truncate drop-shadow-xl flex-1 pb-2">{viewTitle}</h1>
                </div>
                <div className="flex items-center w-full gap-4 text-sm font-medium text-neutral-300 drop-shadow-md">
                  <span>{viewTracks.length} canciones</span>
                  {(isLoadingTracks || isSearching) && (
                    <span className="flex items-center gap-2 text-accent">
                      <Loader2 size={14} className="animate-spin" /> Buscando metadatos...
                    </span>
                  )}

                  {/* 🛡️ Selector Lógico de Ordenación */}
                  {viewTracks.length > 1 && !isSearching && !isLoadingTracks && (
                    <div className="ml-auto relative z-[9999] animate-in fade-in">
                       <button 
                         onClick={() => setIsSortOpen(!isSortOpen)}
                         className="flex items-center gap-2 bg-black/40 border border-white/10 hover:border-white/30 rounded-full py-1.5 px-4 text-xs font-bold text-neutral-300 hover:text-white transition-colors select-none shadow-sm"
                       >
                         <ArrowDownUp size={14} className="text-[#3b82f6]" />
                         {sortFilter === 'default' && 'Orden original'}
                         {sortFilter === 'az' && 'Título (A-Z)'}
                         {sortFilter === 'za' && 'Título (Z-A)'}
                         {sortFilter === 'artist' && 'Por Artista'}
                         {sortFilter === 'popular' && 'Más populares'}
                       </button>

                       {isSortOpen && (
                         <>
                           {/* Overlay portado al body para asegurar que cubre toda la pantalla y no queda atrapado. Transparente por petición del usuario. */}
                           {createPortal(
                             <div className="fixed inset-0 z-[99998]" onClick={() => setIsSortOpen(false)} />,
                             document.body
                           )}
                           {/* El recuadro del menú flotante */}
                           <div className="absolute right-0 top-full mt-2 w-56 bg-[#121212] border border-white/10 rounded-xl shadow-2xl z-[99999] overflow-hidden py-1 animate-in slide-in-from-top-2 fade-in duration-200 ring-1 ring-black">
                             {[
                               { id: 'default', label: 'Orden original' },
                               { id: 'az', label: 'Título (A-Z)' },
                               { id: 'za', label: 'Título (Z-A)' },
                               { id: 'artist', label: 'Por Artista' },
                               { id: 'popular', label: 'Más populares' }
                             ].map(opt => (
                               <button
                                 key={opt.id}
                                 onClick={() => { setSortFilter(opt.id as any); setIsSortOpen(false); }}
                                 className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${sortFilter === opt.id ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'text-neutral-300 hover:bg-white/10 hover:text-white'}`}
                               >
                                 {opt.label}
                               </button>
                             ))}
                           </div>
                         </>
                       )}
                    </div>
                  )}
                </div>
              </header>

            )}

            {/* CONTENIDO PRINCIPAL (Listas y Cuadrículas) */}
            <div className="w-full max-w-5xl mx-auto px-10 pb-12">
              {viewTracks.length === 0 && (!viewUsers || viewUsers.length === 0) && !isLoadingTracks && !isSearching ? (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-600 animate-in fade-in duration-500">
                  <Search size={48} className="mb-4 opacity-30" />
                  <p className="text-lg">Selecciona una lista o usa el buscador</p>
                </div>
              ) : viewTracks.length === 0 && isSearching && isProfile ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#3b82f6] animate-in fade-in duration-500">
                  <Loader2 size={48} className="mb-4 animate-spin opacity-80" />
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80">Sincronizando Discografía...</p>
                </div>
              ) : (
                <div className="w-full">
                  
                  {/* Artistas Encontrados (Búsqueda) */}
                  {viewUsers && viewUsers.length > 0 && isSearch && (
                    <div className="mb-12">
                      <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Artistas Encontrados</h3>
                      <ArtistGrid users={viewUsers} openArtistProfile={openArtistProfile} carouselRef={carouselRef} mode="carousel" />
                    </div>
                  )}

                  {/* Playlists Encontradas (Búsqueda) */}
                  {viewPlaylists && viewPlaylists.length > 0 && isSearch && (
                    <div className="mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                      <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Playlists Descubiertas</h3>
                      <div ref={albumsCarouselRef} className="flex gap-6 overflow-x-auto pb-6 pt-2 px-2 -mx-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {viewPlaylists.map((album: any) => (
                          <div key={album.id} onClick={() => openPlaylist && openPlaylist(album)} className="flex flex-col gap-3 cursor-pointer group min-w-[160px] max-w-[160px]">
                            <div className="w-40 h-40 rounded-xl overflow-hidden shadow-lg border border-white/5 group-hover:border-[#10b981]/50 transition-all duration-500 relative bg-neutral-900 shrink-0">
                              <img src={album.artwork_url ? album.artwork_url.replace('-large', '-t500x500') : 'https://placehold.co/500x500/1a1a1a/333333?text=PL'} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 backdrop-blur-[2px]">
                                <div className="w-12 h-12 bg-[#10b981] rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="black" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col px-1">
                              <p className="text-base font-bold text-white truncate group-hover:text-[#10b981] transition-colors">{album.title}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Cloud size={12} className="text-[#ff5500]" />
                                <p className="text-xs text-neutral-400 font-medium truncate">{album.track_count || 0} pistas</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* --- ESENCIA DEL PERFIL DE ARTISTA (REDESIGN AAA) --- */}
                  {isProfile ? (
                    <div className="animate-in fade-in duration-700 w-full relative">
                      
                      {/* 🔍 BUSCADOR INTERNO DEL PERFIL */}
                      <div className="relative mb-8 max-w-md">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 z-10" />
                        <input
                          type="text"
                          placeholder={`Buscar en la discografía de ${profileUser?.username || 'este artista'}...`}
                          value={profileSearchQuery}
                          onChange={(e) => setProfileSearchQuery(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-full py-3 pl-12 pr-4 text-sm text-white placeholder-neutral-500 outline-none focus:border-[#3b82f6] focus:bg-black/60 transition-all shadow-inner backdrop-blur-md"
                        />
                        {profileSearchQuery && (
                          <button onClick={() => setProfileSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Sección: Top Tracks (Contenedor de Cristal) */}
                      <div className="relative bg-[#181818]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl mb-14 overflow-hidden group hover:border-white/10 transition-colors duration-500">
                        {/* Glow Atmosférico Interno */}
                        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-[#3b82f6]/10 to-transparent pointer-events-none" />
                        
                        <div className="mb-8 relative z-10 flex items-end justify-between">
                          <div>
                            <h3 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                              Éxitos Populares
                            </h3>
                            <p className="text-sm text-neutral-400 mt-2 font-medium">Las pistas más reproducidas del ecosistema híbrido.</p>
                          </div>
                          <span className="hidden sm:flex text-[10px] font-black bg-[#3b82f6]/20 text-[#3b82f6] px-4 py-2 rounded-full tracking-[0.2em] uppercase border border-[#3b82f6]/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]">Top 5 Global</span>
                        </div>

                        {/* Cabecera Lista */}
                        <div className="flex items-center text-[11px] font-bold text-neutral-500 uppercase tracking-[0.15em] border-b border-white/10 pb-3 mb-4 px-4 relative z-10">
                          <span className="w-10 text-center">#</span>
                          <span className="flex-1 ml-6">Obra y Autor</span>
                          <span className="hidden md:block w-48 text-right pr-4">Reproducciones</span>
                        </div>
                        
                        <div className="relative z-10">
                          <TrackList
                            tracks={topTracks}
                            currentTrack={currentTrack}
                            playTrack={playTrack}
                            setContextMenu={setContextMenu}
                            likes={likes}
                            ytLikes={ytLikes}
                            scLikes={scLikes}
                            toggleLike={toggleLike}
                            openArtistProfile={openArtistProfile}
                            onRemoveTrack={activeResonancePlaylist ? (trackId: any) => removeTrackFromPlaylist(activeResonancePlaylist.id, trackId) : undefined}
                          />
                        </div>
                      </div>

                      {/* --- SECCIÓN: DISCOGRAFÍA Y EPs (NUEVA ESENCIA AAA COMPACTA) --- */}
                  {isProfile && (
                    <div className="mt-16 w-full animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-12">
                      {profileUser?.albums?.length > 0 && (
                        <div className="relative bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-2xl overflow-hidden group hover:border-white/20 transition-all duration-700">
                          {/* Glow decorativo esmeralda */}
                          <div className="absolute top-0 right-0 w-64 h-64 bg-[#10b981]/10 blur-[80px] pointer-events-none rounded-full" />
                          
                          <div className="flex items-center justify-between mb-8 relative z-10">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-[#10b981]/20 text-[#10b981] rounded-xl shadow-inner border border-[#10b981]/30">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/></svg>
                              </div>
                              <div>
                                <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Discografía Oficial</h2>
                                <p className="text-sm font-medium text-neutral-400 mt-1">Álbumes y recopilaciones de estudio.</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="relative z-10">
                            {/* CARRUSEL HORIZONTAL COMPACTO */}
                            <div ref={albumsCarouselRef} className="flex gap-6 overflow-x-auto pb-6 pt-2 px-2 -mx-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                              {profileUser.albums.map((album: any) => (
                                <div key={album.id} onClick={() => openPlaylist && openPlaylist(album)} className="flex flex-col gap-3 cursor-pointer group min-w-[160px] max-w-[160px]">
                                  <div className="w-40 h-40 rounded-xl overflow-hidden shadow-lg border border-white/5 group-hover:border-[#10b981]/50 transition-all duration-500 relative bg-neutral-900 shrink-0">
                                    <img src={album.artwork_url ? album.artwork_url.replace('-large', '-t500x500') : 'https://placehold.co/500x500/1a1a1a/333333?text=ALBUM'} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 backdrop-blur-[2px]">
                                      <div className="w-12 h-12 bg-[#10b981] rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="black" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col px-1">
                                    <p className="text-base font-bold text-white truncate group-hover:text-[#10b981] transition-colors">{album.title}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      {(album.providers?.includes('soundcloud') || album.provider === 'soundcloud') && (
                                        <Cloud size={12} className="text-[#ff5500]" />
                                      )}
                                      {(album.providers?.includes('youtube') || album.provider === 'youtube') && (
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-[#FF0000]"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94 2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"></polygon></svg>
                                      )}
                                      {(album.provider === 'resonance') && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="animate-[spin_10s_linear_infinite]"><defs><linearGradient id="acc-album" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs><circle cx="12" cy="12" r="3" fill="#000" stroke="url(#acc-album)" strokeWidth="1.5" /><ellipse cx="12" cy="12" rx="10" ry="3.5" stroke="url(#acc-album)" strokeWidth="1.5" transform="rotate(30 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="3.5" stroke="url(#acc-album)" strokeWidth="1.5" transform="rotate(-30 12 12)" /></svg>
                                      )}
                                      <p className="text-xs text-neutral-400 font-medium truncate">{album.track_count || 0} pistas</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {restTracks.length > 0 && (
                        <div className="relative bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-2xl overflow-hidden group hover:border-white/20 transition-all duration-700">
                          {/* Glow decorativo violeta */}
                          <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/10 blur-[80px] pointer-events-none rounded-full" />
                          
                          <div className="flex items-center justify-between mb-8 relative z-10">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl shadow-inner border border-purple-500/30">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                              </div>
                              <div>
                                <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-md">
                                  {profileUser?.albums?.length > 0 ? "Sencillos y EPs" : "Catálogo Completo"}
                                </h2>
                                <p className="text-sm font-medium text-neutral-400 mt-1">Lanzamientos individuales y colaboraciones.</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="relative z-10">
                            {/* LISTA COMPACTA ALTA DENSIDAD */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3">
                              {restTracks.map((track: any) => {
                                const isActive = currentTrack?.id === track.id;
                                const isExcluded = autoplayBlacklist?.includes(String(track.id));
                                return (
                                  <div
                                    key={track.id}
                                    className={`flex flex-col rounded-xl transition-all duration-300 group border overflow-hidden ${
                                      isActive ? 'bg-purple-500/10 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'
                                    } ${isExcluded && !isActive ? 'opacity-40 grayscale-[50%]' : ''}`}
                                  >
                                    <div 
                                      onClick={() => playTrack(track)}
                                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ visible: true, x: e.pageX, y: e.pageY, track }); }}
                                      className="flex items-center gap-4 p-3 cursor-pointer w-full relative"
                                    >
                                      <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-neutral-900 shadow-md">
                                        <img src={track.artwork_url ? track.artwork_url.replace('-large', '-t50x50') : 'https://placehold.co/50x50/1a1a1a/333333?text=RN'} alt={track.title} className={`w-full h-full object-cover transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                          {isActive ? (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                                          ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex flex-col flex-1 min-w-0">
                                       <div className={`text-[15px] font-black tracking-tight mb-0.5 flex items-center gap-2 ${isActive ? 'text-purple-400' : 'text-white group-hover:text-purple-400'} transition-colors`}>
                                         <span className="truncate">{track.title}</span>
                                         {(track.policy === 'SNIP' || track.snipped === true) && (
                                           <span className="text-[9px] font-black bg-[#ff5500]/20 text-[#ff5500] px-1.5 py-0.5 rounded uppercase tracking-widest border border-[#ff5500]/30 shrink-0">
                                             SNIPPET
                                           </span>
                                         )}
                                       </div>
                                       <div className="flex items-center gap-2 text-xs text-neutral-400 font-semibold truncate hover:text-white transition-colors w-max">
                                          <span>{track.user?.username}</span>
                                          {track.playback_count > 0 && (
                                            <>
                                              <span className="w-1 h-1 rounded-full bg-neutral-600"></span>
                                              <span>{new Intl.NumberFormat('es-ES', { notation: "compact" }).format(track.playback_count)} reprod.</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* MÓDULO DE METADATOS Y ACCIONES (Iconos, Like y Desplegable animado) */}
                                      <div className="flex items-center pr-2 group/stats">
                                        {/* Iconos Híbridos */}
                                        <div className="flex items-center gap-1.5 opacity-50 group-hover/stats:opacity-100 transition-opacity mr-3">
                                          {(track.providers?.includes('soundcloud') || track.provider === 'soundcloud') && (
                                            <Cloud size={14} className="text-[#ff5500]" />
                                          )}
                                          {(track.providers?.includes('youtube') || track.provider === 'youtube') && (
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#FF0000]"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.94 2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"></polygon></svg>
                                          )}
                                        </div>
                                        
                                        {/* Botón Heart Interactivo */}
                                        <button
                                          onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                                          className={`p-2 rounded-full transition-all z-20 ${
                                            likes?.some((l: any) => l.id === track.id)
                                            ? 'text-[#3b82f6] opacity-100 hover:bg-[#3b82f6]/20'
                                            : 'text-neutral-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100'
                                          }`}
                                        >
                                          <Heart size={16} className={likes?.some((l: any) => l.id === track.id) ? "fill-current" : ""} />
                                        </button>

                                        {/* BOTÓN DESPLEGABLE HÍBRIDO (ANIMACIÓN DESPLAZAMIENTO LATERAL AISLADO) */}
                                        {(track as any).providers && (track as any).providers.length > 1 && (
                                          <div className={`overflow-hidden transition-all duration-300 ease-out flex items-center justify-end ${expandedId === track.id ? 'max-w-[40px] opacity-100 translate-x-0 ml-1' : 'max-w-0 opacity-0 translate-x-4 group-hover/stats:max-w-[40px] group-hover/stats:opacity-100 group-hover/stats:translate-x-0 group-hover/stats:ml-1'}`}>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === track.id ? null : track.id); }}
                                              className={`p-1.5 rounded-md transition-all shrink-0 z-30 ${expandedId === track.id ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
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
                                       <div className="flex flex-col bg-black/20 border-t border-white/5 p-3 animate-in slide-in-from-top-2 fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                                         <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Archivos Originales</span>
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
                                          </div>
                                         {((track as any).merged_from || []).map((sourceTrack: any, idx: number) => {
                                           const prov = sourceTrack.provider;
                                           return (
                                             <div key={idx} className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded transition-colors group/src">
                                               <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                                                 <div className="relative w-8 h-8 rounded bg-neutral-800 flex-shrink-0 overflow-hidden shadow-sm">
                                                   <img src={sourceTrack.artwork_url?.replace('-large', '-t50x50') || 'https://placehold.co/50x50/1a1a1a/333333?text=N/A'} className="w-full h-full object-cover" alt="portada" />
                                                   <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-tl bg-black/90 flex items-center justify-center backdrop-blur-md">
                                                       {prov === 'youtube' ? (
                                                         <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-[#FF0000]"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94 2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"></polygon></svg>
                                                       ) : prov === 'soundcloud' ? (
                                                         <Cloud size={10} className="text-[#ff5500] fill-[#ff5500]/20" />
                                                       ) : (
                                                         <HelpCircle size={10} className="text-neutral-500" />
                                                       )}
                                                   </div>
                                                 </div>
                                                 <div className="flex flex-col min-w-0">
                                                   <span className="text-xs font-semibold text-white truncate group-hover/src:text-purple-400 transition-colors">{sourceTrack.title}</span>
                                                   <span className="text-[9px] text-neutral-400 truncate">{sourceTrack.user?.username}</span>
                                                 </div>
                                               </div>
                                               <span className="text-[10px] text-neutral-500 font-medium whitespace-nowrap">
                                                 {(sourceTrack.playback_count || 0) > 0 ? new Intl.NumberFormat('es-ES', { notation: "compact" }).format(sourceTrack.playback_count) : '---'} reprod.
                                               </span>
                                             </div>
                                           );
                                         })}
                                         {(!((track as any).merged_from) || ((track as any).merged_from).length === 0) && (
                                            <div className="text-[10px] text-neutral-500 font-medium p-2 text-center border border-dashed border-white/10 rounded mt-1">Refresca la vista para cargar metadatos.</div>
                                         )}
                                       </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                    </div>
                  ) : (
                    /* --- ESTADO NORMAL (BÚSQUEDA / PLAYLISTS) --- */
                    <div className="animate-in fade-in duration-500 w-full">
                      {/* Cabecera Lista */}
                      <div className="flex items-center text-xs font-bold text-neutral-500 uppercase tracking-wider border-b border-white/5 pb-3 mb-4 px-4">
                        <span className="w-10 text-center">#</span>
                        <span className="flex-1 ml-6">Obra y Autor</span>
                        <span className="hidden md:block w-48 text-right pr-4">Reproducciones</span>
                      </div>
                      
                      <TrackList
                        tracks={topTracks}
                        currentTrack={currentTrack}
                        playTrack={playTrack}
                        setContextMenu={setContextMenu}
                          likes={likes}
                          ytLikes={ytLikes}
                          scLikes={scLikes}
                          toggleLike={toggleLike}
                          openArtistProfile={openArtistProfile}
                          onRemoveTrack={activeResonancePlaylist ? (trackId: any) => removeTrackFromPlaylist(activeResonancePlaylist.id, trackId) : undefined}
                        />

                        {/* 🛡️ MÓDULO LÁZARO (Papelera por Lista) */}
                        {viewTitle !== "Tus Me Gusta" && deletedHistory && deletedHistory[activeResonancePlaylist?.id || viewTitle] && deletedHistory[activeResonancePlaylist?.id || viewTitle].length > 0 && (
                          <div className="mt-12 pt-6 border-t border-white/10 animate-in slide-in-from-bottom-4">
                            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                              Eliminado Recientemente
                            </h4>
                            <ul className="flex flex-col gap-2">
                              {deletedHistory[activeResonancePlaylist?.id || viewTitle].map((track: any) => (
                                <li key={track.id} className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-red-500/10 opacity-70 hover:opacity-100 hover:border-red-500/30 transition-all group">
                                <div className="flex items-center gap-4 truncate">
                                  <img src={track.artwork_url || 'https://placehold.co/50x50/1a1a1a/333333?text=RN'} className="w-10 h-10 rounded shadow-md object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                                  <div className="flex flex-col truncate">
                                    <span className="text-sm font-bold text-neutral-300 line-through decoration-red-500/50 group-hover:decoration-transparent transition-all truncate">{track.title}</span>
                                    <span className="text-[10px] text-neutral-500 truncate">{track.user?.username}</span>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => recoverTrack(activeResonancePlaylist?.id || viewTitle, track)} 
                                  className="p-2 bg-red-500/10 hover:bg-[#10b981]/20 text-red-400 hover:text-[#10b981] text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                                  title="Recuperar a la lista"
                                >
                                  Recuperar
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Módulo de Menú Contextual AAA */}
      <ContextMenu
          contextMenu={contextMenu}
          setContextMenu={setContextMenu}
          playTrack={playTrack}
          resonancePlaylists={resonancePlaylists}
          addTrackToPlaylist={addTrackToPlaylist}
          removeTrackFromPlaylist={removeTrackFromPlaylist}
          toggleLike={toggleLike}
          removeLikeExternal={removeLikeExternal}
          viewTitle={viewTitle}
        />
      </main>
  );
}

















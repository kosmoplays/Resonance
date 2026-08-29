import { Heart, Search, Library, Settings, X, Radio, ChevronDown, Cloud, Plus, Loader2, RefreshCw, User, Trash2, Edit3, HardDrive, Upload, LayoutGrid, Globe, Keyboard } from "lucide-react";
import { useEffect, useState } from "react";
import { VirtualKeyboard } from "./VirtualKeyboard";
import { useAuthStore } from "../store/useAuthStore";
import { usePlayerStore } from '../store/usePlayerStore';
import { AutoScrollText } from './AutoScrollText';
import { useHubStore } from "../store/useHubStore";

export function Sidebar({ isMobile, loadLibrary, handleSearch, searchQuery, setSearchQuery, isOffline, likes, scLikes, ytLikes, playlists, openPlaylist, openView, viewTitle, setShowSettings, resonancePlaylists, createPlaylist, updatePlaylist, deletePlaylist, follows }: any) {
    const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced'>('idle');
    const [showLocalUpload, setShowLocalUpload] = useState(false);
  const [localTitle, setLocalTitle] = useState("");
  const [localArtist, setLocalArtist] = useState("");
  const [localAudio, setLocalAudio] = useState<File | null>(null);
  const [localImage, setLocalImage] = useState<File | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowKeyboard(k => !k);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleVirtualType = (char: string) => {
    if (char === 'BACKSPACE') {
      setSearchQuery((prev: string) => prev.slice(0, -1));
    } else {
      setSearchQuery((prev: string) => prev + char);
    }
  };
  const { localTracks, addLocalTrack } = usePlayerStore();

  
  const [isProvidersOpen, setIsProvidersOpen] = useState(false);

  // 🛡️ ESTADOS PARA MODALES IN-APP DE PLAYLISTS
    const [playlistToDelete, setPlaylistToDelete] = useState<any>(null);
    const [playlistToEdit, setPlaylistToEdit] = useState<any>(null);
    const [editPlaylistTitle, setEditPlaylistTitle] = useState("");
    const [editPlaylistArtwork, setEditPlaylistArtwork] = useState("");
    
  // Enganche reactivo: Suscribe la barra lateral a los cambios en tiempo real del usuario
  const { user } = useAuthStore();

    // --- MOTOR DE BÚSQUEDA FLUIDA (DEBOUNCE) ---
  useEffect(() => {
    // Si el buscador está vacío, detenemos la ejecución
    if (!searchQuery.trim()) return;

    // Configuramos un temporizador de 600 milisegundos
    const timer = setTimeout(() => {
      // Engañamos a tu función original simulando un evento de formulario
      handleSearch({ preventDefault: () => {} }, false);
    }, 600);

    // Si el usuario vuelve a escribir antes de 600ms, cancelamos el temporizador anterior
    return () => clearTimeout(timer);
  }, [searchQuery]); // Esto se ejecuta cada vez que 'searchQuery' cambia

  return (
    <aside className={`${isMobile ? 'w-full' : 'w-64'} bg-elevated flex-shrink-0 flex flex-col border-r border-white/5 z-20`}>
      <div className={`${isMobile ? 'p-4' : 'p-7'} pb-4`}>
        
        {!isMobile && (
          <div className="flex items-center justify-between mb-8 text-white">
            <div
              className="flex items-center gap-3 p-1.5 -ml-1.5 rounded-xl"
              title="Resonance"
            >
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-[#3b82f6]/20 border border-[#3b82f6]/30 group-hover:scale-105 transition-transform shadow-inner">
                <LayoutGrid size={16} className="text-[#3b82f6]" />
              </div>
              <h2 className="text-lg font-black tracking-widest uppercase group-hover:text-[#3b82f6] transition-colors">Resonance</h2>
            </div>
            {/* NUEVA RUEDITA DE CONFIGURACIÓN MINIMALISTA */}
            <button 
              onClick={() => setShowSettings(true)}
              className="text-neutral-500 hover:text-white transition-colors group p-1"
              title="Configuración de la aplicación"
            >
              <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500" />
            </button>
          </div>
        )}
        
        {/* BARRA DE BÚSQUEDA INTERACTIVA */}
        {!isMobile && (
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(e, true); }} className="mb-6 relative group">
            <div className="flex gap-2 relative">
              <div className="relative flex items-center flex-1 transition-all duration-300 group-focus-within:scale-[1.02]">
                <Search size={16} className="absolute left-3 text-neutral-500 transition-colors group-focus-within:text-accent z-10" />
                
                <input 
                  autoComplete="off" spellCheck="false"
                  id="search-input"
                  type="text" 
                  placeholder="Buscar canciones..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/5 rounded-md py-2.5 pl-10 pr-10 text-sm text-white placeholder-neutral-500 outline-none focus:border-accent/50 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(var(--accent),0.1)] transition-all duration-300"
                />
                
                {/* Botón de limpieza rápida que aparece solo si hay texto */}
                {searchQuery && (
                  <button 
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                    }} 
                    className="absolute right-3 text-neutral-400 hover:text-white transition-colors z-10 animate-in zoom-in duration-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              <button 
                type="button" 
                onClick={() => setShowKeyboard(!showKeyboard)}
                title="Teclado Virtual (Ctrl+K)"
                className={`flex items-center justify-center w-10 shrink-0 rounded-md border transition-colors ${showKeyboard ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#3b82f6]' : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white hover:bg-white/10'}`}
              >
                <Keyboard size={16} />
              </button>
            </div>
          </form>
        )}

        <VirtualKeyboard 
          isOpen={showKeyboard} 
          onClose={() => setShowKeyboard(false)} 
          onType={handleVirtualType} 
        />

        <button
            onClick={async () => {
              setSyncState('syncing');
              await loadLibrary();
              setSyncState('synced');
            }}
            disabled={isOffline || syncState === 'syncing'}
            className={`w-full text-white text-xs uppercase tracking-widest font-bold py-3 px-4 rounded-md transition-all flex justify-center items-center gap-2 shadow-lg ${syncState === 'synced' ? 'bg-[#10b981] hover:bg-[#059669] shadow-[#10b981]/20' : 'bg-accent hover:bg-[#2563eb] shadow-[#3b82f6]/20'} disabled:bg-neutral-800 disabled:text-neutral-500`}
          >
            {syncState === 'syncing' ? (
              <><Loader2 size={16} className="animate-spin" /> Sincronizando...</>
            ) : syncState === 'synced' ? (
              <><RefreshCw size={16} /> Sincronizado</>
            ) : (
              <><Library size={16} /> Sincronizar</>
            )}
          </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div>
           <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 pl-2">Descubrir</p>
           <div
             onClick={() => { setSearchQuery(""); openView("Inicio", []); }}
             className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors mb-2 ${viewTitle === "Inicio" ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-neutral-400 hover:text-white'}`}
           >
            <Radio size={16} className={viewTitle === "Inicio" ? 'text-[#3b82f6]' : ''} />
            <span className="font-semibold text-sm">Radar / Inicio</span>
          </div>

          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 pl-2 mt-6">Tu Biblioteca</p>
          
          {/* 💙 ME GUSTA NATIVOS (RESONANCE) */}
          <div
            onClick={() => openView("Tus Me Gusta", likes)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors mb-1 ${viewTitle === "Tus Me Gusta" ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-neutral-400 hover:text-white'}`}
          >
            <Heart size={16} className={viewTitle === "Tus Me Gusta" ? 'text-accent fill-[#3b82f6]' : ''} />
            <span className="font-semibold text-sm">Tus Me Gusta</span>
          </div>

          {/* ☁️ ME GUSTA EXTERNOS (SOUNDCLOUD) */}
          <div
            onClick={() => openView("Me Gusta (SoundCloud)", scLikes || [])}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors mb-1 ${viewTitle === "Me Gusta (SoundCloud)" ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-neutral-400 hover:text-white'}`}
          >
            <Cloud size={16} className={viewTitle === "Me Gusta (SoundCloud)" ? 'text-[#ff5500]' : 'text-neutral-500'} />
            <span className="font-semibold text-sm">Me Gusta (SC)</span>
          </div>

          {/* 🔴 ME GUSTA EXTERNOS (YOUTUBE) */}
          <div
            onClick={() => openView("Me Gusta (YouTube)", ytLikes || [])}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${viewTitle === "Me Gusta (YouTube)" ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-neutral-400 hover:text-white'}`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className={`w-4 h-4 flex-shrink-0 ${viewTitle === "Me Gusta (YouTube)" ? 'text-[#FF0000]' : 'text-neutral-500'}`}>
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94 2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"></path>
              <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"></polygon>
            </svg>
            <span className="font-semibold text-sm">Me Gusta (YT)</span>
          </div>
        </div>

          <div
            onClick={() => openView("Artistas Seguidos", [], follows)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer mt-1 transition-colors ${viewTitle === "Artistas Seguidos" ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-neutral-400 hover:text-white'}`}
          >
            <User size={16} className={viewTitle === "Artistas Seguidos" ? 'text-emerald-400' : ''} />
            <span className="font-semibold text-sm">Siguiendo</span>
          </div>

          {/* FASE 4: TUS PLAYLISTS RESONANCE */}
          <div className="mt-4 mb-2">
            <div className="flex items-center justify-between pl-2 pr-3 mb-2">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Tus Playlists</p>
              <button 
                onClick={() => {
                  setIsCreatingPlaylist(true);
                  setNewPlaylistName("");
                }}
                className="text-neutral-500 hover:text-white transition-colors p-1 bg-white/5 hover:bg-white/10 rounded-md"
                title="Crear Playlist"
              >
                <Plus size={14} />
              </button>
            </div>

            {isCreatingPlaylist && (
              <div className="px-2 mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newPlaylistName.trim()) {
                      createPlaylist(newPlaylistName);
                    }
                    setIsCreatingPlaylist(false);
                    setNewPlaylistName("");
                  }}
                >
                  <input
                    type="text"
                    autoFocus
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsCreatingPlaylist(false);
                        setNewPlaylistName("");
                      }
                    }}
                    onBlur={() => setIsCreatingPlaylist(false)}
                    placeholder="Nombre de la playlist..."
                    className="w-full bg-black/40 border border-[#3b82f6]/50 rounded-md py-1.5 px-3 text-xs text-white placeholder-neutral-500 outline-none focus:ring-1 focus:ring-[#3b82f6] shadow-inner transition-all"
                  />
                </form>
              </div>
            )}

            <ul className="space-y-1">
                {resonancePlaylists?.map((playlist: any) => {
                  return (
                    <li
                      key={playlist.id}
                      onClick={() => openView(playlist.title, playlist.tracks)}
                      className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm font-medium transition-colors group ${viewTitle === playlist.title ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <img
                          src={playlist.artwork_url ? playlist.artwork_url.replace('-large', '-t50x50') : 'https://placehold.co/50x50/1a1a1a/333333?text=RP'}
                          className="w-6 h-6 rounded bg-neutral-800 object-cover flex-shrink-0 shadow-md"
                          alt=""
                        />
                        <AutoScrollText speed={0.4}><span className="pr-2">{playlist.title}</span></AutoScrollText>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlaylistToEdit(playlist);
                            setEditPlaylistTitle(playlist.title);
                            setEditPlaylistArtwork(playlist.artwork_url || "");
                          }}
                          className="p-1 hover:bg-[#3b82f6]/20 text-neutral-500 hover:text-[#3b82f6] rounded-md transition-all flex-shrink-0"
                          title="Editar Playlist"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlaylistToDelete(playlist);
                          }}
                          className="p-1 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 rounded-md transition-all flex-shrink-0"
                          title="Destruir Playlist"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
          </div>
        </div>

        {/* FASE 4: DESPLEGABLE DE OTROS PROVEEDORES */}
        <div className="mt-2">
          <button
            onClick={() => setIsProvidersOpen(!isProvidersOpen)}
            className="w-full flex items-center justify-between text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-2 py-2 hover:bg-white/5 rounded-md transition-colors group"
          >
            <span className="group-hover:text-white transition-colors">Datos Externos</span>
            {/* Animación orgánica de rotación vertical (180 grados) */}
            <ChevronDown size={14} className={`transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isProvidersOpen ? '-rotate-180 text-white' : 'rotate-0 text-neutral-500'}`} />
          </button>

          {/* MOTOR FÍSICO DE ACORDEÓN: Transición matemática de altura usando Grid y Opacidad */}
            <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isProvidersOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
              <div className="overflow-hidden">
                <div className="space-y-4 pl-2 pb-2">
                  {/* 📁 ARCHIVOS LOCALES (Bóveda Offline) */}
                  <div>
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 pl-2 pt-1">Mi Bóveda Local</p>
                    <div
                      onClick={() => openView("Archivos Locales", localTracks)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors mb-1 ${viewTitle === "Archivos Locales" ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-neutral-400 hover:text-white'}`}
                    >
                      <HardDrive size={16} className={viewTitle === "Archivos Locales" ? 'text-[#10b981]' : 'text-neutral-500'} />
                      <span className="font-semibold text-sm">Archivos Locales</span>
                    </div>
                    <button
                      onClick={() => setShowLocalUpload(true)}
                      className="flex items-center gap-2 px-3 py-1.5 ml-2 mt-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition-colors w-max"
                    >
                      <Upload size={12} /> Añadir Canción
                    </button>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 pl-2 pt-1 mt-2 border-t border-white/5 pt-4">Playlists Importadas</p>
                  <ul className="space-y-1">
                    {playlists.map((playlist: any) => {
                      const L=0;
                      const playlistImage = playlist.artwork_url || playlist.tracks?.[L]?.artwork_url;
                      return (
                        <li
                          key={playlist.id}
                          onClick={() => openPlaylist(playlist)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm font-medium transition-colors truncate ${viewTitle === playlist.title ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}
                        >
                          <img
                            src={playlistImage ? playlistImage.replace('-large', '-t50x50') : 'https://placehold.co/50x50/1a1a1a/333333?text=PL'}
                            className="w-6 h-6 rounded bg-neutral-800 object-cover flex-shrink-0 shadow-md"
                            alt=""
                          />
                          <AutoScrollText speed={0.4}><span className="pr-2">{playlist.title}</span></AutoScrollText>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TARJETA DE PERFIL (BOTÓN INFERIOR) */}
        {!isMobile && (
          <div className="p-4 mt-auto border-t border-white/5 bg-black/20">
            <div
              onClick={() => openView("Mi Perfil", [])}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all group ${viewTitle === "Mi Perfil" ? 'bg-white/10' : 'hover:bg-white/5'}`}
            >
              <div className="w-9 h-9 rounded-full overflow-hidden bg-[#3b82f6] flex-shrink-0">
                 <img
                   src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.user_metadata?.username || user?.email?.split('@')[0] || 'U'}&background=3b82f6&color=fff`}
                   alt="Avatar"
                   className="w-full h-full object-cover"
                 />
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className="text-sm font-bold text-white truncate group-hover:text-[#3b82f6] transition-colors">
                  {user?.user_metadata?.username || user?.email?.split('@')[0] || 'Usuario'}
                </span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">
                  Cuenta Básica
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 🛡️ MODAL IN-APP: ELIMINAR PLAYLIST */}
      {playlistToDelete && (
        <div className="fixed inset-0 z-[1] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setPlaylistToDelete(null)}>
          <div className="bg-[#181818] border border-red-500/30 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Trash2 className="text-red-500" size={20}/> Destruir Playlist</h3>
            <p className="text-sm text-neutral-400 mb-6">¿Estás seguro de que deseas eliminar "<span className="text-white">{playlistToDelete.title}</span>" para siempre? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setPlaylistToDelete(null)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg transition-colors border border-white/5">Cancelar</button>
              <button onClick={() => {
                deletePlaylist(playlistToDelete.id);
                if (viewTitle === playlistToDelete.title) openView("Inicio", []);
                setPlaylistToDelete(null);
              }} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-red-500/20">Sí, destruir</button>
            </div>
          </div>
        </div>
      )}

      {/* 🛡️ MODAL IN-APP: EDITAR PLAYLIST */}
      {playlistToEdit && (
        <div className="fixed inset-0 z-[1] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setPlaylistToEdit(null)}>
          <div className="bg-[#181818] border border-[#3b82f6]/30 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Edit3 className="text-[#3b82f6]" size={20}/> Personalizar Playlist</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Nombre</label>
                <input type="text" value={editPlaylistTitle} onChange={(e) => setEditPlaylistTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:border-[#3b82f6] outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">URL de la Portada</label>
                <input type="text" value={editPlaylistArtwork} onChange={(e) => setEditPlaylistArtwork(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:border-[#3b82f6] outline-none transition-colors" placeholder="https://..." />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPlaylistToEdit(null)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg transition-colors border border-white/5">Cancelar</button>
              <button onClick={() => {
                if (editPlaylistTitle.trim()) {
                  updatePlaylist(playlistToEdit.id, editPlaylistTitle.trim(), editPlaylistArtwork.trim());
                  if (viewTitle === playlistToEdit.title) {
                    // Refresco en caliente si estás dentro de la lista
                    openView(editPlaylistTitle.trim(), usePlayerStore.getState().viewTracks);
                  }
                }
                setPlaylistToEdit(null);
              }} className="flex-1 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-[#3b82f6]/20">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SUBIDA BINARIA LOCAL */}
      {showLocalUpload && (
        <div className="fixed inset-0 z-[1] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={() => setShowLocalUpload(false)}>
           <div className="bg-surface border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
             <button onClick={() => setShowLocalUpload(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors">
               <X size={20} />
             </button>
             <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Upload className="text-[#10b981]" /> Subir Audio Local</h2>
             <form onSubmit={async (e) => {
               e.preventDefault();
               if (!localTitle || !localArtist || !localAudio) {
                  window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Faltan datos obligatorios', type: 'error' } }));
                  return;
               }
               try {
                 let imageUrl = 'https://placehold.co/500x500/1a1a1a/333333?text=LOCAL';
                 if (localImage) {
                    const buffer = await localImage.arrayBuffer();
                    const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                    imageUrl = `data:${localImage.type};base64,${base64}`;
                 }
                 const newTrack = {
                   id: `local-${Date.now()}`,
                   title: localTitle,
                   user: { username: localArtist },
                   artwork_url: imageUrl,
                   provider: 'local' as const,
                   local_blob: localAudio,
                   playback_count: 0
                 };
                 await addLocalTrack(newTrack as any);
                 window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Pista añadida a Archivos Locales', type: 'success' } }));
                 setShowLocalUpload(false); setLocalTitle(""); setLocalArtist(""); setLocalAudio(null); setLocalImage(null);
                 if (viewTitle === "Archivos Locales") openView("Archivos Locales", [newTrack, ...localTracks]);
               } catch(err) { console.error(err); }
             }} className="space-y-4">
               <div>
                 <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Título de la Canción</label>
                 <input type="text" required value={localTitle} onChange={(e) => setLocalTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-white focus:border-[#10b981] outline-none transition-colors" placeholder="Ej: Midnight City" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Nombre del Artista</label>
                 <input type="text" required value={localArtist} onChange={(e) => setLocalArtist(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-white focus:border-[#10b981] outline-none transition-colors" placeholder="Ej: M83" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Archivo de Audio (Cualquier formato)</label>
                 <input type="file" accept="audio/*" required onChange={(e) => { const L=0; setLocalAudio(e.target.files?.[L] || null); }} className="w-full text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#10b981]/20 file:text-[#10b981] hover:file:bg-[#10b981]/30 cursor-pointer transition-colors" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Portada (Opcional)</label>
                 <input type="file" accept="image/*" onChange={(e) => { const L=0; setLocalImage(e.target.files?.[L] || null); }} className="w-full text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer transition-colors" />
               </div>
               <button type="submit" className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 mt-2">
                 <Upload size={18} /> Guardar en Mi Música
               </button>
             </form>
           </div>
        </div>
      )}

       </aside>
  );
}






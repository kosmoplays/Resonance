import { usePlayerStore } from "../store/usePlayerStore";

// Aquí definimos qué "cables" necesita este componente para funcionar
interface ContextMenuProps {
  contextMenu: { visible: boolean; x: number; y: number; track: any | null };
  setContextMenu: (state: any) => void;
  playTrack: (track: any) => void;
  resonancePlaylists: any[];
  addTrackToPlaylist: (playlistId: string, track: any) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string | number) => void;
  toggleLike: (track: any) => void;
  removeLikeExternal: (track: any, listId: string) => void;
  viewTitle: string;
}

export function ContextMenu({
  contextMenu, setContextMenu, playTrack, resonancePlaylists, addTrackToPlaylist, removeTrackFromPlaylist, toggleLike, removeLikeExternal, viewTitle }: ContextMenuProps) {
    // Traemos las funciones de la cola desde el cerebro (Zustand)
  const { playNextInQueue, addToQueue, autoplayBlacklist, toggleAutoplayBlacklist, removeLocalTrack } = usePlayerStore();

  // 🛡️ Cerebro de Inteligencia Contextual
  const activeResonancePlaylist = resonancePlaylists?.find(p => p.title === viewTitle);
  const isLikeList = viewTitle === "Tus Me Gusta" || viewTitle === "Me Gusta (SoundCloud)" || viewTitle === "Me Gusta (YouTube)";
  const canDelete = activeResonancePlaylist || isLikeList;

  // Si el menú no está visible, no renderizamos nada (ahorra memoria)
  if (!contextMenu.visible || !contextMenu.track) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed bg-black border border-white/20 shadow-[0_20px_70px_rgba(0,0,0,0.95)] ring-1 ring-white/10 rounded-xl py-2 w-56 text-sm text-white overflow-hidden pointer-events-auto z-[9999]"
      style={{ 
        top: Math.min(contextMenu.y, window.innerHeight - 280), 
        left: Math.min(contextMenu.x, window.innerWidth - 240)
      }}
    >
      <button 
        className="w-full text-left px-4 py-2 hover:bg-white/10 active:bg-accent/20 active:text-accent transition-colors" 
        onClick={() => {
          playTrack(contextMenu.track);
          setContextMenu({ visible: false, x: 0, y: 0, track: null });
        }}
      >
        Reproducir ahora
      </button>
      
      <div className="h-px bg-white/10 my-1"></div>

      <button 
        className="w-full text-left px-4 py-2 hover:bg-white/10 active:bg-accent/20 active:text-accent transition-colors" 
        onClick={() => {
          playNextInQueue(contextMenu.track);
          setContextMenu({ visible: false, x: 0, y: 0, track: null });
        }}
      >
        Reproducir a continuación
      </button>

      {/* BOTÓN AÑADIDO: Añadir a la cola */}
      <button 
        className="w-full text-left px-4 py-2 hover:bg-white/10 active:bg-accent/20 active:text-accent transition-colors" 
        onClick={() => {
          addToQueue(contextMenu.track);
          setContextMenu({ visible: false, x: 0, y: 0, track: null });
        }}
      >
        Añadir a la cola
      </button>

      {resonancePlaylists?.length > 0 && (
        <>
          <div className="h-px bg-white/10 my-1"></div>
          <div className="px-4 py-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Añadir a Playlist:</div>
          <div className="max-h-32 overflow-y-auto [scrollbar-width:none]">
            {resonancePlaylists.map((p: any) => (
              <button 
                key={p.id} 
                className="w-full text-left px-4 py-1.5 hover:bg-white/10 active:bg-accent/20 active:text-accent transition-colors truncate text-xs text-neutral-300" 
                onClick={() => { 
                  addTrackToPlaylist(p.id, contextMenu.track); 
                  setContextMenu({ visible: false, x: 0, y: 0, track: null }); 
                }}
              >
                + {p.title}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="h-px bg-white/10 my-1"></div>

      <button
        className="w-full text-left px-4 py-2 hover:bg-white/10 active:bg-accent/20 active:text-accent transition-colors"
        onClick={() => {
          toggleAutoplayBlacklist(String(contextMenu.track.id));
          setContextMenu({ visible: false, x: 0, y: 0, track: null });
        }}
      >
        {autoplayBlacklist?.includes(String(contextMenu.track.id)) ? "✅ Permitir Autoplay" : "⛔ Excluir de Autoplay"}
      </button>

      <button
        className="w-full text-left px-4 py-2 hover:bg-white/10 active:bg-accent/20 active:text-accent transition-colors"
        onClick={() => {
          navigator.clipboard.writeText(contextMenu.track.permalink_url || `https://soundcloud.com/${contextMenu.track.id}`);
          setContextMenu({ visible: false, x: 0, y: 0, track: null });
        }}
      >
        Copiar enlace
      </button>
      
      {/* 🛡️ GATILLO DESTRUCTIVO CONTEXTUAL */}
      {canDelete && (
        <>
          <div className="h-px bg-white/10 my-1"></div>

      {contextMenu.track?.provider === 'local' && (
        <>
          <button
            className="w-full text-left px-4 py-2 hover:bg-red-500/20 active:bg-red-500/40 text-red-400 transition-colors"
            onClick={() => {
              removeLocalTrack(contextMenu.track.id);
              setContextMenu({ visible: false, x: 0, y: 0, track: null });
              window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Archivo local borrado', type: 'success' } }));
            }}
          >
            Borrar de Archivos Locales
          </button>
          <div className="h-px bg-white/10 my-1"></div>
        </>
      )}

      <button
        className="w-full text-left px-4 py-2 hover:bg-red-500/20 active:bg-red-500/40 text-red-400 transition-colors"
        onClick={() => {
              if (activeResonancePlaylist) {
                removeTrackFromPlaylist(activeResonancePlaylist.id, contextMenu.track.id);
              } else if (isLikeList) {
                if (viewTitle === "Tus Me Gusta") {
                  toggleLike(contextMenu.track); // Elimina de nativo
                } else {
                  removeLikeExternal(contextMenu.track, viewTitle); // Elimina de YT/SC
                }
              }
              setContextMenu({ visible: false, x: 0, y: 0, track: null });
            }}
          >
            Eliminar de la lista
          </button>
        </>
      )}
    </div>
  );
}
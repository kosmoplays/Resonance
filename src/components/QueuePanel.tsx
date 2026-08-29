import { usePlayerStore } from '../store/usePlayerStore';
import { AutoScrollText } from './AutoScrollText';
import { ListMusic, Trash2, Pin, PinOff, X, ChevronUp, ChevronDown } from 'lucide-react';

interface QueuePanelProps {
  isPanelPinned: boolean;
  setIsPanelPinned: (pinned: boolean) => void;
}

export function QueuePanel({ isPanelPinned, setIsPanelPinned }: QueuePanelProps) {
  const { activePanel, queue, clearQueue, toggleQueue, reorderQueue, removeFromQueue } = usePlayerStore();

  return (
    <aside
      className={`bg-elevated flex flex-col flex-shrink-0 z-20 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
        activePanel === 'queue' ? 'w-80 opacity-100 border-l border-white/5 translate-x-0' : 'w-0 opacity-0 border-transparent translate-x-12 pointer-events-none'
      }`}
    >
      <div className="w-80 p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-6 text-white border-b border-white/10 pb-4">
          <h3 className="font-bold tracking-widest uppercase text-xs text-neutral-400 flex items-center gap-2">
            <ListMusic size={16} className="text-accent" /> Cola
          </h3>
          <div className="flex gap-2">
            {queue && queue.length > 0 && (
              <button onClick={clearQueue} className="text-neutral-500 hover:text-red-400 transition-colors bg-white/5 p-1.5 rounded-full hover:bg-red-500/20 border border-white/5 shadow-md" title="Vaciar cola">
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={() => setIsPanelPinned(!isPanelPinned)} className={`transition-colors p-1.5 rounded-full border shadow-md ${isPanelPinned ? 'text-[#3b82f6] bg-[#3b82f6]/20 border-[#3b82f6]/50' : 'text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border-white/5'}`} title={isPanelPinned ? "Desfijar panel" : "Fijar panel"}>
              {isPanelPinned ? <PinOff size={16} /> : <Pin size={16} />}
            </button>
            <button onClick={() => { setIsPanelPinned(false); toggleQueue(); }} className="text-neutral-500 hover:text-white transition-colors bg-white/5 p-1.5 rounded-full hover:bg-white/10 border border-white/5 shadow-md">
              <X size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] space-y-4 pr-1 pb-6">
            
            {/* --- LISTA DE COLA CON CONTROL DE ORDENACIN FLUIDO --- */}
            <div className="flex flex-col gap-1 min-h-[150px]">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1 mb-1">A continuacin</p>
              {(!queue || queue.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-32 text-neutral-600 border border-dashed border-white/10 rounded-lg bg-white/5 animate-in fade-in duration-500">
                  <p className="text-xs font-medium">La cola est vaca.</p>
                </div>
              ) : (
                queue.map((track, index) => (
                  <div
                    key={`queue-item-container-${track.id}-${index}`}
                    className="group flex items-center gap-2 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-transparent hover:border-white/5 select-none"
                  >
                    {/* BOTONES DE ORDENACIN RPIDA */}
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          if (index > 0) reorderQueue(index, index - 1);
                        }}
                        disabled={index === 0}
                        className="text-neutral-400 hover:text-white disabled:opacity-20 p-0.5"
                        title="Mover arriba"
                      >
                         <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (index < queue.length - 1) reorderQueue(index, index + 1);
                        }}
                        disabled={index === queue.length - 1}
                        className="text-neutral-400 hover:text-white disabled:opacity-20 p-0.5"
                        title="Mover abajo"
                      >
                         <ChevronDown size={14} />
                      </button>
                    </div>
                    
                    <img
                      src={track.artwork_url?.replace('-large', '-t50x50') || track.user?.avatar_url?.replace('-large', '-t50x50') || 'https://placehold.co/50x50/1a1a1a/333333'}
                      alt="Portada"
                      className="w-10 h-10 rounded-md object-cover flex-shrink-0 shadow-md"
                    />
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <AutoScrollText speed={0.4}>
                        <p className="text-sm font-semibold text-white leading-tight pr-2">{track.title}</p>
                      </AutoScrollText>
                      <AutoScrollText speed={0.5}>
                        <p className="text-[10px] text-neutral-400 mt-0.5 pr-2">{track.user?.username}</p>
                      </AutoScrollText>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(index);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all cursor-pointer z-10"
                      title="Quitar de la cola"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
        </div>
      </div>
    </aside>
  );
}


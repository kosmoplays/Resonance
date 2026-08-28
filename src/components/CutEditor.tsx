import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, Scissors, Power } from "lucide-react";
import { usePlayerStore } from "../store/usePlayerStore";
import { supabase } from "../lib/supabase";

export function CutEditor({ onClose, handleSeek }: { onClose: () => void, handleSeek: (time: number) => void }) {
  const { currentTrack, duration, trackCuts, setTrackCuts } = usePlayerStore();
  const trackId = String(currentTrack?.yt_videoId ? "yt-" + currentTrack.yt_videoId : currentTrack?.id);
  
  const existingConfig = trackCuts[trackId] || { intervals: [], active: true };
  const [intervals, setIntervals] = useState<{start: number, end: number}[]>(existingConfig.intervals);
  const [isActive, setIsActive] = useState<boolean>(existingConfig.active);
  const [showConfirm, setShowConfirm] = useState(false);

  const initialConfig = useRef(existingConfig);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [intervals, isActive]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAdd = () => {
    setIntervals([...intervals, { start: 0, end: Math.min(10, duration) }]);
  };

  const handleUpdate = (index: number, field: 'start' | 'end', value: string) => {
    let seconds = 0;
    if (value.includes(':')) {
       const [m, s] = value.split(':');
       seconds = (parseInt(m) || 0) * 60 + (parseInt(s) || 0);
    } else {
       seconds = parseFloat(value) || 0;
    }
    const newInt = [...intervals];
    newInt[index][field] = Math.max(0, Math.min(seconds, duration));
    setIntervals(newInt);
  };

  const handleRemove = (index: number) => {
    setIntervals(intervals.filter((_, i) => i !== index));
  };
  
  const handleToggleActive = () => {
    setIsActive(!isActive);
  };

  const handleCancel = () => {
    const hasChanges = JSON.stringify(intervals) !== JSON.stringify(initialConfig.current.intervals) || isActive !== initialConfig.current.active;
    if (hasChanges) {
      setShowConfirm(true);
      return;
    }
    // Revertir en el store en caso de que hubiera algo
    setTrackCuts(trackId, initialConfig.current.intervals, initialConfig.current.active);
    onClose();
  };

  const handleSave = async () => {
    setTrackCuts(trackId, intervals, isActive);
    initialConfig.current = { intervals, active: isActive };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        await supabase.from('resonance_track_cuts').upsert({
          user_id: sessionData.session.user.id,
          track_key: trackId,
          intervals: intervals,
          is_active: isActive
        }, { onConflict: 'user_id, track_key' });
      }
    } catch (e) {
      console.error("Error guardando cortes en Supabase:", e);
    }
    onClose();
  };

  const handlePreview = (start: number) => {
    handleSeek(Math.max(0, start - 3));
  };

  if (!currentTrack) return null;

  if (showConfirm) {
    return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setShowConfirm(false)}>
        <div className="bg-[#181818] border border-white/10 p-6 rounded-2xl max-w-sm shadow-2xl relative flex flex-col items-center text-center" onClick={e => e.stopPropagation()}>
          <h3 className="text-xl font-bold text-white mb-2">Cambios sin guardar</h3>
          <p className="text-neutral-400 text-sm mb-6">¿Estás seguro de que quieres salir? Se perderán todas las modificaciones.</p>
          <div className="flex gap-3 w-full">
            <button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2.5 rounded-lg font-bold text-sm bg-white/5 hover:bg-white/10 text-white transition-colors">Volver</button>
            <button onClick={() => { setShowConfirm(false); setTrackCuts(trackId, initialConfig.current.intervals, initialConfig.current.active); onClose(); }} className="flex-1 px-4 py-2.5 rounded-lg font-bold text-sm bg-[#ff0000] hover:bg-[#cc0000] text-white transition-colors">Descartar</button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in" onClick={handleCancel}>
      <div className="bg-[#181818] border border-white/10 p-6 rounded-2xl w-full max-w-2xl shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff5500]/20 rounded-full flex items-center justify-center text-[#ff5500]"><Scissors size={18} /></div>
            <div>
              <h3 className="text-xl font-bold text-white leading-tight">Resonance Cuts</h3>
              <p className="text-sm text-neutral-400">Define qué partes de la canción quieres saltarte.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleToggleActive}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${isActive ? 'bg-[#ff5500]/20 text-[#ff5500] ring-1 ring-[#ff5500]/50' : 'bg-white/5 text-neutral-400 hover:bg-white/10'}`}
            >
              <Power size={16} /> {isActive ? 'Cortes Activados' : 'Cortes Desactivados'}
            </button>
            <button onClick={handleCancel} className="text-white/50 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
          </div>
        </div>

        {/* Visual Timeline Preciso */}
        <div className="w-full h-8 bg-neutral-900 rounded-lg relative overflow-hidden mb-6 ring-1 ring-white/10 shadow-inner">
          {intervals.map((skip, i) => {
            const left = (skip.start / duration) * 100;
            const width = ((Math.max(skip.start, Math.min(skip.end, duration)) - skip.start) / duration) * 100;
            return (
              <div 
                key={i}
                className="absolute h-full cursor-pointer transition-all"
                style={{
                  left: `${left}%`, width: `${width}%`,
                  opacity: isActive ? 0.9 : 0.4,
                  background: isActive 
                    ? `repeating-linear-gradient(45deg, rgba(255, 60, 0, 0.2), rgba(255, 60, 0, 0.2) 4px, rgba(255, 60, 0, 0.7) 4px, rgba(255, 60, 0, 0.7) 8px)`
                    : `repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05) 4px, rgba(255, 255, 255, 0.2) 4px, rgba(255, 255, 255, 0.2) 8px)`,
                  borderLeft: isActive ? '2px solid #ff3c00' : '1px solid rgba(255,255,255,0.3)',
                  borderRight: isActive ? '2px solid #ff3c00' : '1px solid rgba(255,255,255,0.3)'
                }}
                onClick={() => handlePreview(skip.start)}
                title="Previsualizar la transición (Contexto 3s)"
              />
            );
          })}
        </div>

        <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto mb-6 pr-2">
          {intervals.length === 0 && <p className="text-neutral-500 text-center py-4 text-sm font-medium">No hay cortes configurados.</p>}
          {intervals.map((skip, i) => (
            <div key={`${i}-${skip.start}-${skip.end}`} className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5">
              <span className="text-white/50 font-bold text-xs w-6">{i + 1}.</span>
              <div className="flex-1 flex items-center gap-3">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Inicio (Saltar desde)</label>
                  <input 
                    type="text" 
                    defaultValue={formatTime(skip.start)}
                    onBlur={(e) => handleUpdate(i, 'start', e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(i, 'start', e.currentTarget.value) }}
                    className="bg-black/50 border border-white/10 rounded p-1.5 text-sm text-white w-20 text-center focus:border-[#ff5500] outline-none"
                  />
                </div>
                <div className="h-px bg-white/20 w-4 mt-4"></div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Fin (Reanudar en)</label>
                  <input 
                    type="text" 
                    defaultValue={formatTime(skip.end)}
                    onBlur={(e) => handleUpdate(i, 'end', e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(i, 'end', e.currentTarget.value) }}
                    className="bg-black/50 border border-white/10 rounded p-1.5 text-sm text-white w-20 text-center focus:border-[#ff5500] outline-none"
                  />
                </div>
              </div>
              
              <button 
                onClick={() => handlePreview(skip.start)} 
                className={`text-xs font-bold transition-colors px-3 py-1.5 rounded-lg ${isActive ? 'text-[#ff5500] hover:text-white bg-[#ff5500]/10 hover:bg-[#ff5500]/20' : 'text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10'}`}
              >
                Preview
              </button>
              
              <button onClick={() => handleRemove(i)} className="p-2 text-neutral-500 hover:text-[#FF0000] hover:bg-[#FF0000]/10 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mt-auto">
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            <Plus size={16} /> Añadir salto
          </button>
          
          <div className="flex gap-3">
            <button onClick={handleCancel} className="px-6 py-2.5 rounded-lg font-bold text-sm bg-transparent hover:bg-white/5 text-neutral-400 hover:text-white transition-colors">Cancelar</button>
            <button 
              onClick={handleSave} 
              className="px-6 py-2.5 rounded-lg font-bold text-sm bg-[#ff5500] hover:bg-[#e04a00] text-white transition-colors shadow-lg"
            >
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}






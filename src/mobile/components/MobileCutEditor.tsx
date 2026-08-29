import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, Scissors, Play, Check } from "lucide-react";
import { usePlayerStore } from "../../store/usePlayerStore";
import { supabase } from "../../lib/supabase";

export function MobileCutEditor({ audioProps, onClose }: any) {
  const { currentTrack, duration, trackCuts, setTrackCuts } = usePlayerStore();
  const { handleSeek } = audioProps;

  const trackId = String(currentTrack?.yt_videoId ? "yt-" + currentTrack.yt_videoId : currentTrack?.id);
  const existingConfig = trackCuts[trackId] || { intervals: [], active: true };
  
  const [intervals, setIntervals] = useState<{start: number, end: number}[]>(existingConfig.intervals);
  const [isActive, setIsActive] = useState<boolean>(existingConfig.active);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  const close = () => {
    setMounted(false);
    setTimeout(onClose, 400);
  };

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
      const parts = value.split(':');
      seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else {
      seconds = parseInt(value) || 0;
    }
    
    const newIntervals = [...intervals];
    newIntervals[index][field] = seconds;
    setIntervals(newIntervals);
  };

  const handleRemove = (index: number) => {
    setIntervals(intervals.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setTrackCuts(trackId, intervals, isActive);
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
    } catch (e) {}
    close();
  };

  if (!currentTrack) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[200] flex flex-col bg-neutral-900 transition-transform duration-500 ${mounted ? 'translate-y-0' : 'translate-y-full'}`}>
      
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+16px)] bg-[#1a1a1a] shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#3b82f6]/20 rounded-full flex items-center justify-center text-[#3b82f6]">
            <Scissors size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">Resonance Cuts</h1>
            <p className="text-xs text-neutral-400 truncate max-w-[200px]">{currentTrack.title}</p>
          </div>
        </div>
        <button onClick={close} className="p-2 bg-white/10 rounded-full active:scale-90 text-white"><X size={20} /></button>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl mb-6">
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg">Activar Cortes</h3>
            <p className="text-xs text-neutral-400">Saltar las partes aburridas automáticamente</p>
          </div>
          <button 
            onClick={() => setIsActive(!isActive)}
            className={`w-14 h-8 rounded-full transition-colors relative flex items-center ${isActive ? 'bg-[#3b82f6]' : 'bg-neutral-700'}`}
          >
            <div className={`w-6 h-6 bg-white rounded-full absolute shadow-sm transition-transform ${isActive ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="space-y-4">
          {intervals.map((interval, i) => (
            <div key={i} className={`p-4 rounded-2xl border transition-colors ${isActive ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-sm text-neutral-300">Corte #{i + 1}</span>
                <button onClick={() => handleRemove(i)} className="p-2 text-red-400 bg-red-400/10 rounded-full active:scale-90"><Trash2 size={16} /></button>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-neutral-500 mb-1 block">Inicio (M:SS)</label>
                  <input 
                    type="text" 
                    value={formatTime(interval.start)} 
                    onChange={(e) => handleUpdate(i, 'start', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-center font-mono text-lg focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
                <div className="text-neutral-500 font-bold mt-4">➔</div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-neutral-500 mb-1 block">Fin (M:SS)</label>
                  <input 
                    type="text" 
                    value={formatTime(interval.end)} 
                    onChange={(e) => handleUpdate(i, 'end', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-center font-mono text-lg focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <button 
                  onClick={() => handleSeek(interval.start)}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/10 py-3 rounded-xl active:bg-white/20 text-sm font-bold"
                >
                  <Play size={16} fill="currentColor" /> Probar Inicio
                </button>
              </div>
            </div>
          ))}

          <button 
            onClick={handleAdd}
            className="w-full border-2 border-dashed border-white/20 py-4 rounded-2xl flex items-center justify-center gap-2 text-neutral-400 active:bg-white/5 font-bold"
          >
            <Plus size={20} /> Añadir Corte
          </button>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-[#1a1a1a] shadow-[0_-10px_20px_rgba(0,0,0,0.5)] flex gap-4">
        <button onClick={close} className="flex-1 py-4 bg-white/10 rounded-2xl font-bold active:scale-[0.98]">Cancelar</button>
        <button onClick={handleSave} className="flex-[2] py-4 bg-[#3b82f6] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-[0.98]">
          <Check size={20} /> Guardar Cambios
        </button>
      </div>

    </div>,
    document.body
  );
}

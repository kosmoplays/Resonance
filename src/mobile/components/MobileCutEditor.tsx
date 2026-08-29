import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Scissors, Play, Check, ChevronDown, Sparkles, Volume2 } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { supabase } from '../../lib/supabase';

interface MobileCutEditorProps {
  audioProps: {
    handleSeek: (time: number) => void;
  };
  onClose: () => void;
}

export function MobileCutEditor({ audioProps, onClose }: MobileCutEditorProps) {
  const { currentTrack, duration, trackCuts, setTrackCuts } = usePlayerStore();
  const { handleSeek } = audioProps;

  const trackId = String(currentTrack?.yt_videoId ? 'yt-' + currentTrack.yt_videoId : currentTrack?.id);
  const existingConfig = trackCuts[trackId] || { intervals: [], active: true };

  const [intervals, setIntervals] = useState<{ start: number; end: number }[]>(existingConfig.intervals);
  const [isActive, setIsActive] = useState<boolean>(existingConfig.active);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const close = () => {
    setMounted(false);
    setTimeout(onClose, 300);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAdd = () => {
    const defaultStart = 0;
    const defaultEnd = Math.min(15, Math.floor(duration || 30));
    setIntervals([...intervals, { start: defaultStart, end: defaultEnd }]);
  };

  const handleUpdate = (index: number, field: 'start' | 'end', delta: number) => {
    const newIntervals = [...intervals];
    const curVal = newIntervals[index][field];
    const maxVal = duration || 600;
    const updated = Math.max(0, Math.min(maxVal, curVal + delta));

    newIntervals[index][field] = updated;
    // ensure start < end
    if (field === 'start' && updated >= newIntervals[index].end) {
      newIntervals[index].end = Math.min(maxVal, updated + 5);
    } else if (field === 'end' && updated <= newIntervals[index].start) {
      newIntervals[index].start = Math.max(0, updated - 5);
    }

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
        await supabase.from('resonance_track_cuts').upsert(
          {
            user_id: sessionData.session.user.id,
            track_key: trackId,
            intervals: intervals,
            is_active: isActive,
          },
          { onConflict: 'user_id, track_key' }
        );
      }
    } catch (e) {}

    window.dispatchEvent(
      new CustomEvent('show-toast', { detail: { msg: 'Cortes guardados con éxito', type: 'success' } })
    );
    close();
  };

  if (!currentTrack) return null;

  return (
    <div className="fixed inset-0 z-[140] flex flex-col justify-end">
      {/* BACKDROP */}
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={close}
      />

      {/* SHEET */}
      <div
        className={`relative bg-neutral-900 border-t border-white/10 rounded-t-[32px] p-6 pb-[max(env(safe-area-inset-bottom,0px),24px)] max-h-[85vh] flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.8)] transition-transform duration-300 ease-out ${
          mounted ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* DRAG HANDLE */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4 flex-shrink-0" />

        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-2xl">
              <Scissors size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Resonance Cuts</h2>
              <p className="text-xs text-neutral-400 truncate max-w-[200px] mt-0.5">
                {currentTrack.title}
              </p>
            </div>
          </div>
          <button
            onClick={close}
            className="p-2 text-neutral-400 hover:text-white bg-white/5 rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
          {/* TOGGLE CARD */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <span className="font-semibold text-sm text-white block">Activar Saltos de Audio</span>
              <span className="text-xs text-neutral-400 block mt-0.5">
                Salta intros largas o fragmentos no deseados
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-12 h-7 rounded-full transition-colors relative flex items-center ${
                isActive ? 'bg-accent shadow-[0_0_12px_rgba(59,130,246,0.6)]' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full absolute transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* INTERVALS */}
          <div className="space-y-3">
            {intervals.map((interval, i) => (
              <div
                key={i}
                className={`p-4 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                    Zona de Salto #{i + 1}
                  </span>
                  <button
                    onClick={() => handleRemove(i)}
                    className="p-1.5 text-red-400 bg-red-500/10 active:bg-red-500/20 rounded-xl"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* CONTROLS */}
                <div className="grid grid-cols-2 gap-3">
                  {/* START TIME */}
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">
                      Inicio
                    </span>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleUpdate(i, 'start', -1)}
                        className="w-7 h-7 flex items-center justify-center bg-white/10 active:bg-white/20 rounded-lg text-xs font-bold"
                      >
                        -1s
                      </button>
                      <span className="font-mono text-sm font-bold text-white">
                        {formatTime(interval.start)}
                      </span>
                      <button
                        onClick={() => handleUpdate(i, 'start', 1)}
                        className="w-7 h-7 flex items-center justify-center bg-white/10 active:bg-white/20 rounded-lg text-xs font-bold"
                      >
                        +1s
                      </button>
                    </div>
                  </div>

                  {/* END TIME */}
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">
                      Fin
                    </span>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleUpdate(i, 'end', -1)}
                        className="w-7 h-7 flex items-center justify-center bg-white/10 active:bg-white/20 rounded-lg text-xs font-bold"
                      >
                        -1s
                      </button>
                      <span className="font-mono text-sm font-bold text-white">
                        {formatTime(interval.end)}
                      </span>
                      <button
                        onClick={() => handleUpdate(i, 'end', 1)}
                        className="w-7 h-7 flex items-center justify-center bg-white/10 active:bg-white/20 rounded-lg text-xs font-bold"
                      >
                        +1s
                      </button>
                    </div>
                  </div>
                </div>

                {/* TEST BUTTON */}
                <button
                  onClick={() => handleSeek(Math.max(0, interval.start - 2))}
                  className="w-full mt-3 py-2 bg-white/10 active:bg-white/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 text-neutral-200"
                >
                  <Play size={13} fill="currentColor" /> Probar salto (-2s antes)
                </button>
              </div>
            ))}

            <button
              onClick={handleAdd}
              className="w-full border-2 border-dashed border-white/15 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-neutral-400 active:bg-white/5 font-semibold text-xs transition-colors"
            >
              <Plus size={16} /> Añadir otro corte
            </button>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="pt-4 border-t border-white/10 flex gap-3 flex-shrink-0">
          <button
            onClick={close}
            className="flex-1 py-3 bg-white/5 active:bg-white/10 rounded-2xl text-xs font-bold text-neutral-300"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-[2] py-3 bg-accent text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(59,130,246,0.5)] active:scale-[0.98]"
          >
            <Check size={16} /> Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}

import { usePlayerStore } from '../../store/usePlayerStore';
import { Play, Pause, SkipForward } from 'lucide-react';
import { AutoScrollText } from '../../components/AutoScrollText';

export function MobileMiniPlayer({ audioProps, onClick }: any) {
  const { currentTrack, isPlaying, progress, duration } = usePlayerStore();
  const { togglePlay, playNext } = audioProps;

  if (!currentTrack) return null;

  return (
    <div className="px-2 w-full pt-1">
      <div 
        onClick={onClick}
        className="flex items-center bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-lg relative overflow-hidden active:scale-[0.98] transition-transform cursor-pointer"
      >
        {/* PROGRESS BAR BACKGROUND */}
        <div 
          className="absolute bottom-0 left-0 h-1 bg-white/20" 
          style={{ width: `${(progress / (duration || 1)) * 100}%` }}
        />

        <img 
          src={currentTrack.artwork_url?.replace('-large', '-t50x50') || 'https://placehold.co/50x50/1a1a1a/333333?text=RN'} 
          className="w-10 h-10 object-cover rounded-lg mr-3 shadow-md" 
          alt="artwork" 
        />
        
        <div className="flex-1 min-w-0 pr-2">
          <AutoScrollText speed={0.5}>
            <span className="text-sm font-bold text-white">{currentTrack.title}</span>
            <span className="mx-2 text-neutral-500">•</span>
            <span className="text-sm text-neutral-400">{currentTrack.user?.username}</span>
          </AutoScrollText>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="p-3 text-white active:scale-90 transition-transform"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); playNext(); }}
            className="p-3 text-white active:scale-90 transition-transform"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}

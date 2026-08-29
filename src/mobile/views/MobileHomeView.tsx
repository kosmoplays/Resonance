import { usePlayerStore } from '../../store/usePlayerStore';
import { Play } from 'lucide-react';

export function MobileHomeView({ scProps, audioProps }: any) {
  const { resonancePlaylists, viewTitle, openPlaylist } = scProps;

  return (
    <div className="h-full w-full overflow-y-auto pb-32 pt-[env(safe-area-inset-top)] px-4">
      <h1 className="text-3xl font-black tracking-tighter mt-8 mb-6">Radar Resonance</h1>
      
      <div className="flex flex-col gap-4">
        {resonancePlaylists?.map((list: any) => (
          <div 
            key={list.id} 
            onClick={() => openPlaylist(list.id, list.title, true)}
            className="flex items-center bg-white/5 border border-white/5 rounded-2xl p-3 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center flex-shrink-0 shadow-lg">
              <Play fill="white" size={24} className="ml-1" />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="font-bold text-lg leading-tight mb-1">{list.title}</h3>
              <p className="text-xs text-white/50">{list.tracks?.length || 0} pistas • Radar</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

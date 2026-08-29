import { usePlayerStore } from '../../store/usePlayerStore';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import { AutoScrollText } from '../../components/AutoScrollText';

export function MobileTrackListView({ scProps, audioProps, setMobileContext }: any) {
  const { viewTitle, goBack } = scProps;
  const { playTrack } = audioProps;
  const { viewTracks, currentTrack, isPlaying } = usePlayerStore();

  return (
    <div className="h-full w-full flex flex-col bg-black relative">
      {/* HEADER */}
      <div className="flex items-center gap-4 px-4 py-6 pt-[env(safe-area-inset-top)] bg-gradient-to-b from-white/10 to-transparent sticky top-0 z-20 backdrop-blur-md">
        <button onClick={goBack} className="p-2 -ml-2 text-white active:scale-90">
          <ChevronLeft size={28} />
        </button>
        <AutoScrollText speed={0.5}>
          <h1 className="text-2xl font-bold tracking-tighter text-white">{viewTitle}</h1>
        </AutoScrollText>
      </div>

      {/* TRACKS */}
      <div className="flex-1 overflow-y-auto pb-32 px-2">
        <div className="flex flex-col gap-1 mt-2">
          {viewTracks?.map((track: any) => {
            const isActive = currentTrack?.id === track.id;
            
            return (
              <div 
                key={track.id}
                onClick={() => playTrack(track)}
                className={`flex items-center p-2 rounded-2xl active:scale-[0.98] transition-transform ${isActive ? 'bg-white/10' : 'bg-transparent'}`}
              >
                <div className="relative w-14 h-14 flex-shrink-0">
                  <img src={track.artwork_url?.replace('-large', '-t50x50') || 'https://placehold.co/50x50/1a1a1a/333333?text=RN'} className="w-full h-full object-cover rounded-xl shadow-md" alt="" />
                </div>
                
                <div className="flex-1 min-w-0 ml-4 flex flex-col justify-center">
                  <h3 className={`text-base font-bold truncate ${isActive ? 'text-[#3b82f6]' : 'text-white'}`}>
                    {track.title}
                  </h3>
                  <p className="text-sm text-white/50 truncate">{track.user?.username}</p>
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); setMobileContext({ visible: true, track }); }}
                  className="p-3 -mr-2 text-white/50 active:scale-90 active:text-white transition-colors"
                >
                  <MoreVertical size={20} />
                </button>
              </div>
            );
          })}

          {(!viewTracks || viewTracks.length === 0) && (
            <div className="flex flex-col items-center justify-center py-20 text-white/30">
              <p className="font-medium text-lg">No hay pistas aquí</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

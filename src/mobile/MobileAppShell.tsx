import { useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileMiniPlayer } from './components/MobileMiniPlayer';
import { MobileFullPlayer } from './components/MobileFullPlayer';
import { MobileHomeView } from './views/MobileHomeView';
import { MobileLibraryView } from './views/MobileLibraryView';
import { MobileSearchView } from './views/MobileSearchView';
import { MobileTrackListView } from './views/MobileTrackListView';
import { MobileContextMenu } from './components/MobileContextMenu';
import { MobileSplash } from './components/MobileSplash';
import { MobileCutEditor } from './components/MobileCutEditor';

export function MobileAppShell({ audioProps, scProps }: any) {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library'>('home');
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [showMobileCuts, setShowMobileCuts] = useState(false);
  const [mobileContext, setMobileContext] = useState<{ visible: boolean, track: any | null }>({ visible: false, track: null });
  const { currentTrack } = usePlayerStore();
  const { viewTitle } = scProps;

  const isViewingList = viewTitle && !['Inicio', 'Búsqueda', 'Librería'].includes(viewTitle);

  return (
    <div className="flex flex-col h-full w-full bg-black text-white overflow-hidden relative">
      <MobileSplash />
      
      {/* BACKGROUND LIQUID GLASS */}
      {currentTrack?.artwork_url && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          <img 
            src={currentTrack.artwork_url.replace('-large', '-t500x500')} 
            className="w-full h-full object-cover blur-3xl scale-110 opacity-50 transition-all duration-1000" 
            alt="background" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black" />
        </div>
      )}

      {/* VIEWS */}
      <div className="flex-1 overflow-hidden z-10 relative">
        {isViewingList ? (
          <MobileTrackListView scProps={scProps} audioProps={audioProps} setMobileContext={setMobileContext} />
        ) : (
          <>
            {activeTab === 'home' && <MobileHomeView scProps={scProps} audioProps={audioProps} />}
            {activeTab === 'search' && <MobileSearchView scProps={scProps} audioProps={audioProps} />}
            {activeTab === 'library' && <MobileLibraryView scProps={scProps} audioProps={audioProps} />}
          </>
        )}
      </div>

      {/* MINI PLAYER & BOTTOM NAV CONTAINER */}
      
        <div className="z-40 relative flex flex-col pointer-events-auto bg-black/40 backdrop-blur-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] pb-[env(safe-area-inset-bottom)]">
          <MobileMiniPlayer 
            audioProps={audioProps} 
            onClick={() => setIsFullPlayerOpen(true)} 
          />
          <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} scProps={scProps} />
        </div>
      
      {/* FULL PLAYER BOTTOM SHEET */}
      {isFullPlayerOpen && (
        <MobileFullPlayer 
          audioProps={audioProps}
          scProps={scProps}
          onClose={() => setIsFullPlayerOpen(false)}
          onOpenCuts={() => setShowMobileCuts(true)} 
        />
      )}

      {/* CUT EDITOR */}
      {showMobileCuts && <MobileCutEditor audioProps={audioProps} onClose={() => setShowMobileCuts(false)} />}

      {/* CONTEXT MENU BOTTOM SHEET */}
      {mobileContext.visible && (
        <MobileContextMenu 
          track={mobileContext.track}
          scProps={scProps}
          audioProps={audioProps}
          onClose={() => setMobileContext({ visible: false, track: null })}
        />
      )}
    </div>
  );
}





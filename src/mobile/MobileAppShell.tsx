import React, { useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { MobileBottomNav, MobileTab } from './components/MobileBottomNav';
import { MobileMiniPlayer } from './components/MobileMiniPlayer';
import { MobileFullPlayer } from './components/MobileFullPlayer';
import { MobileContextMenu } from './components/MobileContextMenu';
import { MobileCutEditor } from './components/MobileCutEditor';
import { MobilePlaylistModal } from './components/MobilePlaylistModal';
import { MobileToast } from './components/MobileToast';
import { MobileHomeView } from './views/MobileHomeView';
import { MobileSearchView } from './views/MobileSearchView';
import { MobileLibraryView } from './views/MobileLibraryView';
import { MobileProfileView } from './views/MobileProfileView';
import { MobileTrackListView } from './views/MobileTrackListView';

interface MobileAppShellProps {
  audioProps: any;
  scProps: any;
  lyricsProps: any;
  toast: any;
}

export function MobileAppShell({
  audioProps,
  scProps,
  lyricsProps,
  toast,
}: MobileAppShellProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>('home');
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [showCuts, setShowCuts] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [mobileContext, setMobileContext] = useState<{ visible: boolean; track: any | null }>({
    visible: false,
    track: null,
  });

  const { currentTrack } = usePlayerStore();
  const { viewTitle, createPlaylist } = scProps;

  // Check if we are viewing a drilldown list (e.g. specific Playlist, Liked songs, Artist Profile, etc.)
  const isDrilldown =
    viewTitle &&
    !['Inicio', 'Búsqueda', 'Librería', 'Mi Perfil'].includes(viewTitle) &&
    !viewTitle.startsWith('Resultados:');

  // Si viewTitle cambia a Resultados, asegurar que la pestaña activa sea Búsqueda
  React.useEffect(() => {
    if (viewTitle?.startsWith('Resultados:') && activeTab !== 'search') {
      setActiveTab('search');
    }
  }, [viewTitle, activeTab]);

  const handleCreatePlaylist = (title: string) => {
    if (createPlaylist) {
      createPlaylist(title);
      window.dispatchEvent(
        new CustomEvent('show-toast', { detail: { msg: `Playlist "${title}" creada`, type: 'success' } })
      );
    }
  };

  const handleTabPress = (tab: MobileTab) => {
    // If we were inside a drilldown list and pressed a tab, reset viewTitle to root
    if (tab === 'home') scProps.openView('Inicio', []);
    if (tab === 'search') scProps.openView('Búsqueda', []);
    if (tab === 'library') scProps.openView('Librería', []);
    if (tab === 'profile') scProps.openView('Mi Perfil', []);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-black text-white overflow-hidden relative font-sans">
      {/* TOAST ALERTS */}
      <MobileToast toast={toast} />

      {/* AMBIENT BACKGROUND GLOW */}
      {currentTrack?.artwork_url && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-25 overflow-hidden">
          <img
            src={currentTrack.artwork_url.replace('-large', '-t500x500')}
            className="w-full h-full object-cover blur-3xl scale-125 transition-all duration-1000"
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-neutral-950/70 to-black" />
        </div>
      )}

      {/* MAIN VIEWPORT */}
      <main className="flex-1 overflow-hidden z-10 relative">
        {isDrilldown ? (
          <MobileTrackListView
            scProps={scProps}
            audioProps={audioProps}
            onOpenContext={(track) => setMobileContext({ visible: true, track })}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <MobileHomeView
                scProps={scProps}
                audioProps={audioProps}
                onOpenContext={(track) => setMobileContext({ visible: true, track })}
                onNavigateTab={(t) => {
                  setActiveTab(t);
                  handleTabPress(t);
                }}
              />
            )}
            {activeTab === 'search' && (
              <MobileSearchView
                scProps={scProps}
                audioProps={audioProps}
                onOpenContext={(track) => setMobileContext({ visible: true, track })}
              />
            )}
            {activeTab === 'library' && (
              <MobileLibraryView
                scProps={scProps}
                onCreatePlaylist={() => setShowCreatePlaylist(true)}
              />
            )}
            {activeTab === 'profile' && <MobileProfileView scProps={scProps} />}
          </>
        )}
      </main>

      {/* DOCKED BOTTOM AREA: MINI-PLAYER + BOTTOM NAVIGATION */}
      <div className="z-30 relative flex flex-col flex-shrink-0 pointer-events-auto">
        <MobileMiniPlayer
          audioProps={audioProps}
          scProps={scProps}
          onExpand={() => setIsFullPlayerOpen(true)}
        />
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onTabPress={handleTabPress}
        />
      </div>

      {/* FULL PLAYER SHEET */}
      {isFullPlayerOpen && (
        <MobileFullPlayer
          audioProps={audioProps}
          scProps={scProps}
          lyricsProps={lyricsProps}
          onClose={() => setIsFullPlayerOpen(false)}
          onOpenContext={(track) => setMobileContext({ visible: true, track })}
          onOpenCuts={() => setShowCuts(true)}
        />
      )}

      {/* RESONANCE CUTS EDITOR SHEET */}
      {showCuts && (
        <MobileCutEditor
          audioProps={audioProps}
          onClose={() => setShowCuts(false)}
        />
      )}

      {/* CONTEXT MENU ACTION SHEET */}
      {mobileContext.visible && (
        <MobileContextMenu
          track={mobileContext.track}
          scProps={scProps}
          audioProps={audioProps}
          onClose={() => setMobileContext({ visible: false, track: null })}
          onOpenCuts={(track) => {
            setMobileContext({ visible: false, track: null });
            setShowCuts(true);
          }}
          onCreatePlaylist={() => setShowCreatePlaylist(true)}
        />
      )}

      {/* CREATE PLAYLIST MODAL */}
      <MobilePlaylistModal
        isOpen={showCreatePlaylist}
        onClose={() => setShowCreatePlaylist(false)}
        onCreate={handleCreatePlaylist}
      />

      {/* MOUNT INVISIBLE AUDIO & IFRAME NODES FOR AUDIO ENGINE */}
      <audio ref={audioProps.audioRef} className="hidden" />
      <iframe
        ref={audioProps.iframeRef}
        className="hidden"
        allow="autoplay; encrypted-media"
        src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/2126409108&auto_play=false"
      />
    </div>
  );
}

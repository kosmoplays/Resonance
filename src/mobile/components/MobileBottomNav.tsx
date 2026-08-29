import React from 'react';
import { Compass, Search, Library, User } from 'lucide-react';

export type MobileTab = 'home' | 'search' | 'library' | 'profile';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  setActiveTab: (tab: MobileTab) => void;
  onTabPress?: (tab: MobileTab) => void;
}

export function MobileBottomNav({
  activeTab,
  setActiveTab,
  onTabPress,
}: MobileBottomNavProps) {
  const tabs: { id: MobileTab; label: string; icon: React.ElementType }[] = [
    { id: 'home', label: 'Descubrir', icon: Compass },
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'library', label: 'Biblioteca', icon: Library },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <nav className="w-full bg-neutral-950/90 backdrop-blur-2xl border-t border-white/10 px-4 pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),8px)] flex items-center justify-around z-30 transition-colors">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              if (onTabPress) onTabPress(tab.id);
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 active:scale-90 touch-manipulation relative ${
              isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Icon
              size={22}
              className={`transition-transform duration-200 ${
                isActive ? 'scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.6)] text-white' : ''
              }`}
              strokeWidth={isActive ? 2.4 : 1.8}
            />
            <span
              className={`text-[10px] tracking-tight mt-1 transition-all ${
                isActive ? 'font-bold text-white' : 'font-medium text-neutral-400'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

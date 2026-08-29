import { Home, Search, Library } from 'lucide-react';

export function MobileBottomNav({ activeTab, setActiveTab, scProps }: any) {
  const { openView } = scProps;
  const tabs = [
    { id: 'home', icon: Home, label: 'Inicio', title: 'Inicio' },
    { id: 'search', icon: Search, label: 'Buscar', title: 'Búsqueda' },
    { id: 'library', icon: Library, label: 'Biblioteca', title: 'Librería' },
  ];

  return (
    <div className="flex items-center justify-around px-2 pt-2 pb-2 border-t border-white/5">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => {
            setActiveTab(tab.id);
            openView(tab.title);
          }}
          className={`flex flex-col items-center gap-1 p-2 transition-all duration-300 ${
            activeTab === tab.id ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <tab.icon size={22} className={`${activeTab === tab.id ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}`} />
          <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

import { Heart, History } from 'lucide-react';

export function MobileLibraryView({ scProps }: any) {
  const { openView } = scProps;

  const cards = [
    { id: 'likes-sc', title: 'Me Gusta', subtitle: 'SoundCloud', icon: Heart, color: 'from-[#ff5500] to-[#ff8800]' },
    { id: 'likes-yt', title: 'Me Gusta', subtitle: 'YouTube', icon: Heart, color: 'from-[#FF0000] to-[#ff4444]' },
    { id: 'history', title: 'Historial', subtitle: 'Resonance', icon: History, color: 'from-[#3b82f6] to-[#2563eb]' },
  ];

  return (
    <div className="h-full w-full overflow-y-auto pb-32 pt-[env(safe-area-inset-top)] px-4">
      <h1 className="text-3xl font-black tracking-tighter mt-8 mb-6">Tu Biblioteca</h1>
      
      <div className="grid grid-cols-2 gap-4">
        {cards.map(c => (
          <div 
            key={c.id}
            onClick={() => {
              if (c.id === 'likes-sc') openView('Me Gusta (SoundCloud)');
              if (c.id === 'likes-yt') openView('Me Gusta (YouTube)');
              if (c.id === 'history') openView('Historial de Reproducción');
            }}
            className="aspect-square rounded-3xl p-4 flex flex-col justify-end bg-gradient-to-br relative overflow-hidden active:scale-[0.96] transition-transform"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-20`} />
            <c.icon size={32} className="absolute top-4 right-4 text-white/50" />
            <h3 className="font-bold text-lg relative z-10 leading-tight">{c.title}</h3>
            <p className="text-xs text-white/70 relative z-10">{c.subtitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

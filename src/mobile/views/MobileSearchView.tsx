import { Search } from 'lucide-react';

export function MobileSearchView({ scProps }: any) {
  const { searchQuery, setSearchQuery, handleSearch } = scProps;

  return (
    <div className="h-full w-full overflow-y-auto pb-32 pt-[env(safe-area-inset-top)] px-4">
      <h1 className="text-3xl font-black tracking-tighter mt-8 mb-6">Búsqueda</h1>
      
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(e, true); }} className="relative mb-6">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="search"
          placeholder="Artistas, canciones o enlaces..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-neutral-500 focus:outline-none focus:bg-white/15 transition-colors text-lg"
        />
      </form>
    </div>
  );
}

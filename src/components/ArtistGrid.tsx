import { BadgeCheck, Cloud } from "lucide-react";

interface ArtistGridProps {
  users: any[];
  openArtistProfile: (user: any) => void;
  // Añadimos el "| null" aquí abajo para contentar a TypeScript
  carouselRef?: React.RefObject<HTMLDivElement | null>; 
  mode: 'carousel' | 'grid';
}

export function ArtistGrid({ users, openArtistProfile, carouselRef, mode }: ArtistGridProps) {
  if (!users || users.length === 0) return null;

  const containerClass = mode === 'carousel'
    ? "flex gap-6 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6";

  const itemClass = mode === 'carousel'
    ? "flex flex-col items-center gap-3 w-28 flex-shrink-0 cursor-pointer group"
    : "bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-4 cursor-pointer group transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:-translate-y-1";

  const imageContainerClass = mode === 'carousel'
    ? "w-24 h-24 rounded-full overflow-hidden shadow-lg ring-1 ring-white/10 group-hover:ring-accent group-hover:scale-105 transition-all duration-300 relative"
    : "w-32 h-32 rounded-full overflow-hidden shadow-2xl ring-4 ring-black/50 group-hover:ring-emerald-500/50 group-hover:scale-105 transition-all duration-500 bg-neutral-900 relative flex-shrink-0";

  return (
    <div ref={carouselRef} className={containerClass}>
      {users.map((user: any) => (
        <div key={user.id} onClick={() => openArtistProfile(user)} className={itemClass}>
          
          {/* FOTO DE PERFIL */}
          <div className={imageContainerClass}>
            <img
              src={user.artwork_url || user.avatar_url?.replace('-large', '-t500x500') || 'https://placehold.co/200x200/1a1a1a/333333'}
              alt={user.username || user.name}
              className="w-full h-full object-cover"
            />
            {/* INSIGNIA PROVEEDOR (Solo en modo Grid) */}
            {mode === 'grid' && (
              <div className="absolute bottom-2 right-2 bg-black/80 p-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                {((user as any).providers || [(user as any).provider]).includes('youtube') ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#FF0000]">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"></path>
                    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"></polygon>
                  </svg>
                ) : (
                  <Cloud size={14} className="text-[#ff5500] fill-[#ff5500]/20" />
                )}
              </div>
            )}
          </div>

          {/* INFORMACIÓN DEL ARTISTA */}
          <div className="flex flex-col items-center w-full">
            <p className={`font-bold w-full text-center transition-colors flex items-center justify-center gap-1.5 truncate ${mode === 'carousel' ? 'text-sm text-neutral-300 group-hover:text-white' : 'text-base text-white group-hover:text-emerald-400'}`}>
              <span className="truncate">{user.username || user.name}</span>
              {(user.verified || user.badges?.verified) && (
                <BadgeCheck size={mode === 'carousel' ? 14 : 16} className={`flex-shrink-0 transition-colors ${
                  ((user as any).providers || [(user as any).provider]).includes('soundcloud') && ((user as any).providers || [(user as any).provider]).includes('youtube') 
                    ? 'text-[#3b82f6]' 
                    : ((user as any).providers || [(user as any).provider]).includes('youtube') 
                      ? 'text-[#FF0000]' 
                      : 'text-[#ff5500]'
                }`} />
              )}
            </p>

            {/* PLATAFORMAS (Solo en modo Carousel) */}
            {mode === 'carousel' && (
              <div className="flex items-center justify-center gap-1.5 mt-1 mb-0.5">
                {((user as any).providers || [(user as any).provider]).map((prov: string, idx: number) => (
                  <span key={idx} className="flex items-center">
                    {prov === 'youtube' ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-[#FF0000] flex-shrink-0 drop-shadow-md">
                        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"></path>
                        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"></polygon>
                      </svg>
                    ) : (
                      <Cloud size={12} className="text-[#ff5500] flex-shrink-0 fill-[#ff5500]/20" />
                    )}
                  </span>
                ))}
              </div>
            )}

            <p className={`${mode === 'carousel' ? 'text-[10px] mt-0.5' : 'text-[11px] mt-1 tracking-wider uppercase font-semibold'} text-neutral-500 truncate w-full text-center`}>
              @{user.permalink || (user.username || user.name)?.replace(/\s+/g, '').toLowerCase() || "artista"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { User, LogOut, Settings, Edit3, Heart, ListMusic, Zap, X, Check, Loader2 } from "lucide-react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
// Ajusta esta ruta a donde tengas tu cliente de Supabase exportado
// Ajusta esta ruta a donde tengas tu cliente de Supabase exportado
import { supabase } from "../lib/supabase";
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';


const SoundCloudIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M11.17 11.53c0 .26-.06.51-.15.76-.08.2-.19.38-.32.53.07-.15.12-.32.16-.5.03-.17.05-.35.05-.53 0-.17-.02-.34-.05-.51-.04-.17-.09-.34-.16-.5.13.15.24.33.32.53.09.24.15.5.15.76zm-.9 7.71c-.02.26-.07.51-.16.74-.08.2-.19.39-.32.55.08-.15.13-.33.17-.51.04-.18.06-.36.06 -.55 0-.17-.02-.35-.06-.53-.04-.18-.09-.35-.17-.51.13.16.24.34.32.54.09.23.14.49.16.75zm .97-1.47c-.09.25-.15.51-.15.77 0 .25.06.51.15.75.08-.19.19-.36.32-.52-.07-.14-.12-.32-.16-.5-.03-.17-.05-.35-.05-.53 0-.17.02-.34.05-.5.04-.18.09-.35.16-.5-.13-.15-.24-.32-.32-.52-.09-.23-.15-.48-.15-.74 zm7.54-3.13C16.94 4.54 14.16 3 11.02 3 7.37 3 4.3 5.6 3.7 9.07 1.6 9.4 0 11.23 0 13.43c0 2.37 1.93 4.3 4.3 4.3h14.28c2.99 0 5.42-2.43 5.42-5.42 0-2.88-2.25-5.23-5.07-5.41a5.61 5.61 0 0 0-3.64-1.27z" />
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"></path>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"></polygon>
  </svg>
);

export function ProfileView({ likes, resonancePlaylists, follows }: any) {
  const { user, signOut, updateProfile } = useAuthStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  // 🛡️ Estados para la Inyección Manual del Token de SoundCloud
  const [showScTokenInput, setShowScTokenInput] = useState(false);
  const [scTokenInput, setScTokenInput] = useState("");

  // 1. Iniciamos vacío. Supabase se encargará de llenarlo al cargar.
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);

  // 2. FASE DE APERTURA: Traer datos de Supabase al abrir el perfil
  useEffect(() => {
    const fetchLinkedAccounts = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('linked_accounts')
        .select('*')
        .eq('user_id', user.id);

      if (!error && data) {
        // Adaptamos los datos de la base de datos al formato que usa tu UI
        const formattedAccounts = data.map(dbAccount => ({
          id: dbAccount.account_id,
          provider: dbAccount.provider,
          accountName: dbAccount.account_name,
          isPrimary: false
        }));
        setLinkedAccounts(formattedAccounts);
      }
    };

    fetchLinkedAccounts();
  }, [user?.id]);

  const handleUnlink = async (accountId: string) => {
    if (!user?.id) return;

    // 1. Actualización optimista: borramos de la UI inmediatamente para que sea fluido
    setLinkedAccounts(prevAccounts => prevAccounts.filter(acc => acc.id !== accountId));

    // 2. Borramos de Supabase
    const { error } = await supabase
      .from('linked_accounts')
      .delete()
      .match({ account_id: accountId, user_id: user.id });

    if (error) {
      console.error("Error eliminando cuenta en la nube:", error);
    }

    // 3. Limpiamos las llaves locales del navegador por seguridad
    if (accountId.startsWith('youtube')) {
      localStorage.removeItem("youtube_access_token");
      localStorage.removeItem("youtube_refresh_token");
    } else if (accountId.startsWith('soundcloud')) {
      localStorage.removeItem("soundcloud_oauth_token");
    }
    
    // 4. Disparamos la alerta visual de destrucción
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg: 'Cuenta desvinculada', type: 'error' } }));
  };
  
  const handleSaveSoundCloudToken = async () => {
    if (!scTokenInput.trim() || !user?.id) return;
    
    // 1. Guardamos la llave maestra en el disco duro local
    localStorage.setItem("soundcloud_oauth_token", scTokenInput.trim());

    // 2. Registramos la conexión en la base de datos central de Resonance
    const dbAccountData = {
      user_id: user.id,
      account_id: "soundcloud-" + Date.now(),
      provider: 'soundcloud',
      account_name: "Cuenta de SoundCloud"
    };

    const { error: dbError } = await supabase.from('linked_accounts').insert([dbAccountData]);

    if (!dbError) {
      setLinkedAccounts(prevAccounts => [
        ...prevAccounts,
        {
          id: dbAccountData.account_id,
          provider: 'soundcloud',
          accountName: dbAccountData.account_name,
          isPrimary: prevAccounts.length === 0
        }
      ]);
    } else {
      console.error("Error guardando cuenta SC en Supabase:", dbError);
    }
    
    setShowScTokenInput(false);
    setScTokenInput("");
  };

    const handleConnectYouTube = async () => {
      try {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
        const redirectUri = "http://127.0.0.1:1420/callback";
        const provider = "youtube";
        
        // 🛡 Usamos prompt=consent%20select_account y access_type=offline para forzar la llave maestra de Google
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/youtube.readonly&prompt=consent%20select_account&access_type=offline&state=${provider}`;
        
        new WebviewWindow('oauth-window-yt', {
          url: authUrl,
          title: 'Iniciar sesión en YouTube',
          width: 450,
          height: 750,
          center: true,
          focus: true,
        });
      } catch (error) {
        console.error("💥 Error crítico al ejecutar YouTube:", error);
      }
    };

  const email = user?.email || "correo@desconocido.com";
  const defaultUsername = email.split('@');
  const username = user?.user_metadata?.username || defaultUsername;
  const avatarUrl = user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${username}&background=3b82f6&color=fff&size=256`;

  const handleOpenEdit = () => {
    setEditName(username);
    setEditAvatar(user?.user_metadata?.avatar_url || "");
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        username: editName,
        avatar_url: editAvatar
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const isProcessing = useRef(false);

  // --- MOTOR DE OAUTH GOOGLE (YOUTUBE) ---
  const exchangeYouTubeCodeForToken = async (authCode: string) => {
    if (isProcessing.current || !user?.id) return;
    isProcessing.current = true;

    try {
      // Credenciales maestras de Google Cloud inyectadas
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
      const redirectUri = "http://127.0.0.1:1420/callback";

      const tokenBody = new URLSearchParams({
        grant_type: "authorization_code",
        code: authCode,
        redirect_uri: redirectUri,
        client_id: clientId
      });

      // 🛡️ Bypaseamos el CORS de Google enviando la petición por el backend (Tauri)
      const response = await tauriFetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenBody.toString()
      });

      const tokenData = await response.json();
      
      if (!response.ok) {
        throw new Error(tokenData.error_description || "Rechazado por Google");
      }

      const accessToken = tokenData.access_token;
      
      localStorage.setItem("youtube_access_token", accessToken);
      if (tokenData.refresh_token) {
          localStorage.setItem("youtube_refresh_token", tokenData.refresh_token);
        }
      

      let finalAccountId = "youtube-" + Date.now();
      let finalAccountName = "Cuenta de YouTube";

      try {
        // Pedimos acceso de solo lectura al canal usando tauriFetch para evitar bloqueos
        const profileResponse = await tauriFetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
          headers: { "Authorization": `Bearer ${accessToken}` }
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.items && profileData.items.length > 0) {
            const L = 0;
            finalAccountId = profileData.items[L].id;
            finalAccountName = profileData.items[L].snippet.title;
          }
        }
      } catch (profileError) {
        console.warn("⚠ Error al pedir perfil de YT, usando nombre genérico.");
      }

      const dbAccountData = {
        user_id: user.id,
        account_id: finalAccountId,
        provider: 'youtube',
        account_name: finalAccountName
      };

      const { error: dbError } = await supabase.from('linked_accounts').insert([dbAccountData]);

      if (dbError) {
        console.error("Error guardando cuenta en Supabase:", dbError);
      } else {
        setLinkedAccounts(prevAccounts => [
          ...prevAccounts,
          {
            id: finalAccountId,
            provider: 'youtube',
            accountName: finalAccountName,
            isPrimary: prevAccounts.length === 0
          }
        ]);
      }

    } catch (error) {
      console.error("💥 Error en el proceso de YouTube:", error);
    } finally {
      setTimeout(() => { isProcessing.current = false; }, 2000);
    }
  };

  useEffect(() => {
    const handleStorage = async (e: StorageEvent) => {
      if (e.key === "oauth-code" && e.newValue) {
        const code = e.newValue;
        const provider = localStorage.getItem("oauth-provider");
        
        localStorage.removeItem("oauth-code");
        localStorage.removeItem("oauth-provider");
        
        try {
          // 🛡️ Identificamos la ventana exacta que debemos destruir
          const windowLabel = provider === 'youtube' ? 'oauth-window-yt' : (provider === 'soundcloud' ? 'oauth-window-sc' : 'oauth-window');
          const oauthWin = await WebviewWindow.getByLabel(windowLabel);
          if (oauthWin) {
            await oauthWin.close();
          }
        } catch (err) {}

        // 🛡 Enrutador maestro de tokens (Solo YouTube usa WebViews asíncronos ahora)
         if (provider === "youtube") {
           exchangeYouTubeCodeForToken(code); // Inyecta el token y guarda la cuenta
         }
       }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
          <div className="w-full max-w-5xl mx-auto px-10 pt-16 pb-24 animate-in fade-in duration-500 relative">
        
        {/* FONDO DINÁMICO DE PERFIL: Lámpara de Lava */}
        <div className="fixed top-0 right-0 bottom-[90px] left-64 z-0 pointer-events-none overflow-hidden bg-[#09090b]">
          <style>{`
            @keyframes lava-blob-1 {
              0% { transform: scale(2.5) translate(0%, 0%) rotate(0deg); }
              50% { transform: scale(3.5) translate(-10%, 10%) rotate(10deg); }
              100% { transform: scale(2.5) translate(10%, -10%) rotate(-5deg); }
            }
            @keyframes lava-blob-2 {
              0% { transform: scale(3.5) translate(10%, -10%) rotate(0deg); }
              50% { transform: scale(2.5) translate(-10%, 0%) rotate(-10deg); }
              100% { transform: scale(3.5) translate(0%, 10%) rotate(5deg); }
            }
            .lava-1 { animation: lava-blob-1 45s infinite alternate ease-in-out; }
            .lava-2 { animation: lava-blob-2 35s infinite alternate ease-in-out; }
          `}</style>
          <div className="absolute inset-0 bg-cover bg-center opacity-40 blur-[150px] saturate-[2.0]" style={{ backgroundImage: `url(${avatarUrl})` }} />
          <div className="absolute inset-0 bg-cover bg-center opacity-60 blur-[120px] saturate-100 opacity-30 lava-1 origin-top-left" style={{ backgroundImage: `url(${avatarUrl})` }} />
          <div className="absolute inset-0 bg-cover bg-center opacity-60 blur-[120px] saturate-100 opacity-30 lava-2 origin-bottom-right" style={{ backgroundImage: `url(${avatarUrl})` }} />
          <div className="absolute inset-0 backdrop-blur-[100px] bg-[#09090b]/50 z-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/60 to-[#09090b] z-20" />
        </div>

        <button title="Ajustes de cuenta" className="absolute top-16 right-10 p-3 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-all group z-20">
          <Settings size={24} className="group-hover:rotate-90 transition-transform duration-500" />
        </button>

        <div className="flex flex-col md:flex-row items-center md:items-end text-center md:text-left gap-8 mb-12 relative z-10">
          <div className="relative group cursor-pointer" onClick={handleOpenEdit}>
            <div className="w-40 h-40 rounded-full overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-4 ring-white/10 bg-neutral-900 flex-shrink-0">
              <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
              <Edit3 size={24} className="text-white mb-2" />
            </div>
          </div>
          <div className="flex flex-col gap-2 pb-2">
            <p className="text-xs font-black text-[#3b82f6] uppercase tracking-[0.2em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Perfil de Resonance</p>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight flex items-center gap-4 drop-shadow-[0_4px_24px_rgba(0,0,0,1)]">
              {username}
              <button onClick={handleOpenEdit} className="text-neutral-500 hover:text-white transition-colors">
                <Edit3 size={24} />
              </button>
            </h1>
            <p className="text-neutral-400 font-medium flex items-center gap-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              <User size={16} /> {email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-2 md:gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-2 md:p-4 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left hover:bg-white/10 transition-colors cursor-pointer">
            <div className="p-3 bg-[#3b82f6]/20 text-[#3b82f6] rounded-full"><Heart size={20} /></div>
            <div>
              <p className="text-lg md:text-2xl font-black text-white">{likes?.length || 0}</p>
              <p className="text-[8px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Me Gusta</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-2 md:p-4 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left hover:bg-white/10 transition-colors cursor-pointer">
            <div className="p-3 bg-purple-500/20 text-purple-400 rounded-full"><ListMusic size={20} /></div>
            <div>
              <p className="text-lg md:text-2xl font-black text-white">{resonancePlaylists?.length || 0}</p>
              <p className="text-[8px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Playlists</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-2 md:p-4 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left hover:bg-white/10 transition-colors cursor-pointer">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full"><User size={20} /></div>
            <div>
              <p className="text-lg md:text-2xl font-black text-white">{follows?.length || 0}</p>
              <p className="text-[8px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Siguiendo</p>
            </div>
          </div>
        </div>
        
          {/* NUEVO PANEL DE INTEGRACIONES (Múltiples Cuentas) */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col justify-between gap-6">
            <div>
              <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                <Zap size={16} className="text-[#3b82f6]" /> Integraciones
              </h3>
              <p className="text-xs text-neutral-400">Puedes vincular múltiples cuentas.</p>
            </div>

            <div className="space-y-5">
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConnectYouTube}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#FF0000]/10 hover:bg-[#FF0000]/20 text-[#FF0000] rounded-lg transition-colors text-sm font-bold border border-[#FF0000]/20"
                >
                  <YouTubeIcon /> Añadir cuenta de YouTube
                </button>

                {showScTokenInput ? (
                  <div className="w-full bg-black/40 border border-[#ff5500]/30 rounded-lg p-5 animate-in fade-in slide-in-from-top-2 shadow-inner">
                    <h4 className="text-xs font-bold text-[#ff5500] uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Zap size={14} /> Vincular Token Manual
                    </h4>
                    <p className="text-[10px] text-neutral-400 mb-4 leading-relaxed">
                      SoundCloud bloquea el inicio de sesión en apps de terceros. Para vincular tu cuenta:<br/><br/>
                      1. Abre SoundCloud.com en tu navegador e inicia sesión.<br/>
                      2. Pulsa <b>F12</b> (Herramientas de Desarrollador).<br/>
                      3. Ve a la pestaña <span className="text-white font-semibold">Application</span> (o Almacenamiento) &gt; <span className="text-white font-semibold">Local Storage</span>.<br/>
                      4. Busca la clave <code className="text-white bg-white/10 px-1.5 py-0.5 rounded border border-white/20">oauth_token</code> y pega su valor numérico aquí.
                    </p>
                    <input
                      type="text"
                      value={scTokenInput}
                      onChange={(e) => setScTokenInput(e.target.value)}
                      placeholder="Ejemplo: 2-123456-987654321-aBcDeFgHiJk..."
                      className="w-full bg-black/60 border border-white/10 rounded-md py-3 px-3 text-xs text-white focus:border-[#ff5500] outline-none mb-4 transition-colors shadow-inner"
                    />
                    <div className="flex gap-3">
                      <button onClick={() => { setShowScTokenInput(false); setScTokenInput(""); }} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-md transition-colors border border-white/5">Cancelar</button>
                      <button onClick={handleSaveSoundCloudToken} className="flex-1 py-2.5 bg-[#ff5500] hover:bg-[#e04b00] text-white text-xs font-bold rounded-md transition-colors shadow-[0_0_15px_rgba(255,85,0,0.4)]">Vincular Token</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowScTokenInput(true)}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#ff5500]/10 hover:bg-[#ff5500]/20 text-[#ff5500] rounded-lg transition-colors text-sm font-bold border border-[#ff5500]/20"
                  >
                    <SoundCloudIcon /> Añadir cuenta de SoundCloud
                  </button>
                )}
              </div>

              <div className="pt-4 border-t border-white/10">
                <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Tus Cuentas ({linkedAccounts.length})</h4>
                
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {linkedAccounts.map((acc) => {
                    const isYouTube = acc.provider === 'youtube';
                    const brandColor = isYouTube ? 'text-[#FF0000]' : 'text-[#ff5500]';
                    const brandBg = isYouTube ? 'bg-[#FF0000]/20' : 'bg-[#ff5500]/20';
                    
                    return (
                      <div key={acc.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5 hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${brandBg} flex items-center justify-center ${brandColor}`}>
                            {isYouTube ? <YouTubeIcon /> : <SoundCloudIcon />}
                          </div>

                          <div>
                            <p className="text-sm font-bold text-white flex items-center gap-2">
                              {acc.accountName}
                              {acc.isPrimary && (
                                <span className="text-[8px] bg-white/10 text-neutral-300 px-1.5 py-0.5 rounded uppercase tracking-wider">Principal</span>
                              )}
                            </p>
                            <p className="text-[10px] text-neutral-400 capitalize">Proveedor: {acc.provider}</p>
                          </div>
                        </div>
                        <button
                        onClick={() => handleUnlink(acc.id)}
                        className="text-xs text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all font-bold">
                          Desvincular
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={signOut}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-semibold border border-red-500/20 mt-2"
              >
                <LogOut size={18} /> Cerrar Sesión de Resonance
              </button>
            </div>
          </div>
        </div>

        {/* MODAL DE EDICIÓN */}
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-surface border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
              <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
              <h2 className="text-2xl font-bold text-white mb-6">Editar Perfil</h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Nombre de Usuario</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white focus:border-[#3b82f6] outline-none transition-colors" placeholder="Tu nombre en Resonance" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">URL del Avatar (Opcional)</label>
                  <input type="text" value={editAvatar} onChange={(e) => setEditAvatar(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white focus:border-[#3b82f6] outline-none transition-colors" placeholder="https://ejemplo.com/mifoto.jpg" />
                  <p className="text-[10px] text-neutral-500 mt-2">Pega el enlace directo a una imagen (jpg, png, gif). Si lo dejas en blanco, usaremos uno generado por defecto.</p>
                </div>
                <button onClick={handleSaveProfile} disabled={isSaving} className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold py-3 px-4 rounded-lg transition-all flex justify-center items-center gap-2 mt-4">
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Guardar Cambios</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}

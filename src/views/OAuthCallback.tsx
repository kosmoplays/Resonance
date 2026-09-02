import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function OAuthCallback() {
  const [status, setStatus] = useState("Cazando token...");

  useEffect(() => {
    if (window.location.hostname === "127.0.0.1") {
      setStatus("Alineando servidores...");
      window.location.hostname = "localhost";
      return;
    }

    const handleAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");
      const provider = urlParams.get("state") || "spotify";

      if (error) {
        setStatus(`Spotify dijo no: ${error}`);
        return;
      }

      if (code) {
        setStatus("¡Código cazado! Enviando a la nave nodriza...");
        
        try {
          // Send event to the main window via Tauri IPC
          const { emit } = await import('@tauri-apps/api/event');
          await emit('oauth-success', { provider, code });
        } catch (e) {
          console.error("Tauri emit failed, falling back to localStorage", e);
        }

        // Fallback for web version
        localStorage.setItem("oauth-provider", provider);
        localStorage.setItem("oauth-code", code); 

        setStatus("¡Misión Cumplida! Cerrando...");

        setTimeout(() => {
          window.close(); // Cierre web estándar
        }, 1000);
      } else {
        setStatus("Aquí no hay nada...");
      }
    };

    handleAuth();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090b] text-white p-6 text-center select-none">
      <Loader2 size={48} className="text-[#1db954] animate-spin mb-6" />
      <h1 className="text-2xl font-black mb-2">Conectado con Éxito</h1>
      <p className="text-neutral-400 text-sm font-mono bg-[#1db954]/10 border border-[#1db954]/20 text-[#1db954] px-4 py-2 rounded-lg mt-4 shadow-[0_0_15px_rgba(29,185,84,0.2)]">
        {status}
      </p>
    </div>
  );
}
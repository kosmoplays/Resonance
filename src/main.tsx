import React from "react";
import ReactDOM from "react-dom/client";
import { ResonanceApp } from "./ResonanceApp";
import "./App.css";

import { OAuthCallback } from "./views/OAuthCallback";

import { useAuthStore } from "./store/useAuthStore";
import { AuthView } from "./views/AuthView";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

const AppRoot = () => {
  const { session, isInitialized, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (window.location.pathname === '/callback') {
    return <OAuthCallback />;
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-neutral-400">
        <Loader2 size={32} className="animate-spin text-[#3b82f6] mb-4" />
        <p className="text-sm font-semibold tracking-widest uppercase">Cargando Resonance...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthView />;
  }

  return <ResonanceApp />;
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>,
);

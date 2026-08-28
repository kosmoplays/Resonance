import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { AudioWaveform, Loader2, Mail, Lock } from "lucide-react";

export function AuthView() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al cargar la pantalla, buscamos si hay una cuenta previa recordada
  useEffect(() => {
    const savedEmail = localStorage.getItem("resonance_last_email");
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Si el registro va bien, Supabase a veces requiere confirmación por email, 
        // pero por defecto en desarrollo suele iniciar sesión directamente.
      }
      
      // Si todo sale bien, guardamos el email en el disco duro para la próxima vez
      localStorage.setItem("resonance_last_email", email);
      
    } catch (err: any) {
      setError(err.message || "Ha ocurrido un error en la autenticación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-base flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo estético */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#3b82f6]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-surface border border-white/5 rounded-2xl shadow-2xl p-8 z-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="flex flex-col items-center mb-8">
          <AudioWaveform size={48} className="text-[#3b82f6] mb-4 drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
          <h1 className="text-3xl font-black text-white tracking-tight">Resonance</h1>
          <p className="text-neutral-400 text-sm mt-1">
            {isLogin ? "Bienvenido de nuevo a la frecuencia." : "Únete a la nueva era del sonido."}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="email"
              placeholder="Tu correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none focus:border-[#3b82f6] focus:bg-white/5 transition-all"
              required
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none focus:border-[#3b82f6] focus:bg-white/5 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold py-3 px-4 rounded-lg transition-all flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] mt-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : (isLogin ? "Entrar a Resonance" : "Crear cuenta")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-neutral-400 hover:text-white text-xs transition-colors"
          >
            {isLogin ? "¿No tienes cuenta? Regístrate aquí" : "¿Ya tienes una cuenta? Inicia sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: { username?: string; avatar_url?: string }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isInitialized: false, // Para saber si Supabase ya comprobó la sesión al abrir la app

  initialize: async () => {
    // 1. Pedimos la sesión actual al abrir la app
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user || null, isInitialized: true });

    // 2. Nos suscribimos a cualquier cambio (si se loguea o desloguea en otra pestaña/ventana)
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user || null });
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },

  // NUEVA FUNCIÓN PARA ACTUALIZAR DATOS EN SUPABASE
  updateProfile: async (data) => {
    const { data: authData, error } = await supabase.auth.updateUser({
      data: data // Esto inyecta los datos en el user_metadata de Supabase
    });
    
    if (error) throw error;
    
    // Actualizamos el estado local para que la UI reaccione instantáneamente
    set({ user: authData.user });
  }
}));
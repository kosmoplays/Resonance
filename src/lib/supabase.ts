import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Chivato de depuración (puedes borrar los console.log cuando funcione)
console.log("Supabase URL detectada:", supabaseUrl ? "SÍ" : "NO", supabaseUrl);
console.log("Supabase Key detectada:", supabaseAnonKey ? "SÍ" : "NO");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase en el archivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
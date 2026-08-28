
-- Crear tabla de letras
CREATE TABLE resonance_lyrics (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  track_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  lyrics_data jsonb NOT NULL,
  raw_text text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(track_id, user_id)
);

-- RLS
ALTER TABLE resonance_lyrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede leer las letras" ON resonance_lyrics FOR SELECT USING (true);
CREATE POLICY "Usuarios pueden insertar/actualizar letras" ON resonance_lyrics FOR ALL USING (auth.uid() = user_id);


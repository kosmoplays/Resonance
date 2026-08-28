-- Script para crear la tabla de correcciones manuales de artistas (Overrides)

CREATE TABLE IF NOT EXISTS resonance_artist_overrides (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    artist_key text NOT NULL,
    sc_handle text,
    yt_handle text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, artist_key)
);

ALTER TABLE resonance_artist_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden gestionar sus propios overrides" 
ON resonance_artist_overrides 
FOR ALL 
USING (auth.uid() = user_id);

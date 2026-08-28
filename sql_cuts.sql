-- Script para la tabla de Cortes de Canciones (Resonance Cuts)

CREATE TABLE IF NOT EXISTS resonance_track_cuts (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    track_key text NOT NULL,
    intervals jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array de objetos: [{"start": 10.5, "end": 20.0}] (Partes a SALTAR)
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, track_key)
);

ALTER TABLE resonance_track_cuts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden gestionar sus propios cortes" 
ON resonance_track_cuts 
FOR ALL 
USING (auth.uid() = user_id);

-- Supabase SQL migration for the Virtual Gallery
-- Run this in the Supabase SQL Editor to create the artworks table

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS artworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT UNIQUE,
  title TEXT NOT NULL,
  artist TEXT,
  year INT,
  movement TEXT,
  origin TEXT,
  medium TEXT,
  museum TEXT,
  image_url_3d TEXT,
  image_url_hd TEXT,
  dimensions TEXT,
  description TEXT,
  description_long TEXT,
  audio_narration TEXT,
  tags TEXT[] DEFAULT '{}',
  highlight BOOLEAN DEFAULT FALSE,
  source_api TEXT,
  position_x FLOAT,
  position_y FLOAT DEFAULT 1.6,
  position_z FLOAT,
  rotation_y FLOAT,
  room_id INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artworks_movement ON artworks(movement);
CREATE INDEX IF NOT EXISTS idx_artworks_room_id ON artworks(room_id);
CREATE INDEX IF NOT EXISTS idx_artworks_source_id ON artworks(source_id);
CREATE INDEX IF NOT EXISTS idx_artworks_position_z ON artworks(position_z);
CREATE INDEX IF NOT EXISTS idx_artworks_year ON artworks(year);

ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;

-- Allow public read access (authenticated/anonymous)
CREATE POLICY "Allow public read access" ON artworks
  FOR SELECT USING (true);

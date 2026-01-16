-- FIX WIKI SCHEMA V2 (ULTRA SOPHISTICATED)
-- Jalankan ini di Supabase SQL Editor

-- 1. Tambah kolom 'type' jika belum ada
ALTER TABLE public.bola_articles 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'BOLA';

-- 2. Tambah kolom 'image_url' untuk gambar ilustrasi
ALTER TABLE public.bola_articles 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. Pastikan RLS Aktif
ALTER TABLE public.bola_articles ENABLE ROW LEVEL SECURITY;

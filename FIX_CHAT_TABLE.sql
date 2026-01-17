-- FIX CHAT TABLE PERMISSIONS
-- Jalankan script ini di SQL Editor Supabase untuk memperbaiki masalah pesan hilang (tidak tersimpan)

-- 1. Pastikan RLS Aktif tapi Izinkan Semua Akses (Untuk Mode Development/Public Chat)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 2. Hapus policy lama yang mungkin memblokir (jika ada)
DROP POLICY IF EXISTS "Public Read" ON public.chat_messages;
DROP POLICY IF EXISTS "Public Insert" ON public.chat_messages;
DROP POLICY IF EXISTS "Public Update" ON public.chat_messages;
DROP POLICY IF EXISTS "Public Delete" ON public.chat_messages;

-- 3. Buat Policy Baru yang Terbuka (Mengizinkan Insert/Select untuk semua orang)
CREATE POLICY "Public Read" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON public.chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON public.chat_messages FOR UPDATE USING (true);
CREATE POLICY "Public Delete" ON public.chat_messages FOR DELETE USING (true);

-- 4. Ulangi untuk tabel chat_rooms dan chat_room_members agar tidak error load data
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Rooms" ON public.chat_rooms FOR SELECT USING (true);
CREATE POLICY "Public Insert Rooms" ON public.chat_rooms FOR INSERT WITH CHECK (true);

ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Members" ON public.chat_room_members FOR SELECT USING (true);
CREATE POLICY "Public Insert Members" ON public.chat_room_members FOR INSERT WITH CHECK (true);

-- 5. Pastikan kolom user_id tipe-nya TEXT agar cocok dengan email
-- Jika user_id awalnya UUID, ini akan mengubahnya menjadi TEXT (aman untuk email)
-- DO NOT RUN THIS IF YOU STRICTLY USE UUIDs. But based on code 'profile.email', we need text.
-- ALTER TABLE public.chat_messages ALTER COLUMN user_id TYPE TEXT; 

-- Selesai! Coba refresh aplikasi setelah menjalankan ini.

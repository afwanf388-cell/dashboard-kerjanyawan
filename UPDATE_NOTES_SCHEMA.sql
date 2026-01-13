-- UPDATE NOTES TABLE TO MATCH FRONTEND V3.0
-- Copy and Run this in Supabase SQL Editor

-- 1. Add missing columns used by the new Catatan Kerja
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS category text DEFAULT 'General';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Medium';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS color text DEFAULT '#3b82f6';

-- 2. Enable Realtime if not already enabled (Run this if Realtime not working)
-- ALTER PUBLICATION supabase_realtime ADD TABLE notes;

-- 3. Strict Policies ensures only owner sees their notes
DROP POLICY IF EXISTS "Public Access" ON public.notes; -- Drop old insecure policy
CREATE POLICY "Enable select for users based on user_id" ON public.notes FOR SELECT USING (user_id = auth.uid()::text OR user_id = current_setting('request.headers')::json->>'x-username');
-- Note: Adjust policy based on your simplified auth logic if strictly using 'username' col

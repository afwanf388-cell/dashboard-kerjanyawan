import { createClient } from '@supabase/supabase-js';

// Hardcoded fallback credentials (sama seperti di GlobalChat.jsx)
const HARDCODED_URL = 'https://szgmyyflvyggrgyzoeod.supabase.co';
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6Z215eWZsdnlnZ3JneXpvZW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Mzc1NTUsImV4cCI6MjA4MzIxMzU1NX0.BHcptshSo784tQXO4Abltpw7KbOIQ9wcFBk76zKdaKE';

// Prioritaskan .env, fallback ke hardcoded
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || HARDCODED_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || HARDCODED_KEY;

// Buat client jika credentials valid
export const supabase = (SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL !== 'https://your-project-id.supabase.co')
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

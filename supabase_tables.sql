-- ============================================
-- SUPABASE TABLES FOR PERSONAL DASHBOARD
-- Cloud Sync Database Schema
-- Created: 2026-01-06
-- ============================================

-- 0. USER ACCOUNTS TABLE (Autentikasi Kustom)
CREATE TABLE IF NOT EXISTS user_accounts (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT,
    role TEXT DEFAULT 'user',
    avatar TEXT,
    bg_image TEXT,
    status TEXT DEFAULT 'Online',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can insert user_accounts" ON user_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own account" ON user_accounts FOR SELECT USING (true);
CREATE POLICY "Users can update own account" ON user_accounts FOR UPDATE USING (true);

-- ============================================

-- 1. NOTES TABLE (Catatan Kerja)
CREATE TABLE IF NOT EXISTS notes (
    id BIGINT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    content TEXT,
    date TEXT,
    status TEXT DEFAULT 'Draft',
    importance TEXT DEFAULT 'Normal',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
CREATE POLICY "Users can view own notes" ON notes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
CREATE POLICY "Users can insert own notes" ON notes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
CREATE POLICY "Users can update own notes" ON notes FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;
CREATE POLICY "Users can delete own notes" ON notes FOR DELETE USING (true);

-- ============================================

-- 2. LOGIN DATA TABLE
CREATE TABLE IF NOT EXISTS login_data (
    id BIGINT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    username TEXT,
    email TEXT,
    password TEXT,
    website TEXT,
    description TEXT,
    created_date TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE login_data ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own login_data" ON login_data FOR SELECT USING (true);
CREATE POLICY "Users can insert own login_data" ON login_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own login_data" ON login_data FOR UPDATE USING (true);
CREATE POLICY "Users can delete own login_data" ON login_data FOR DELETE USING (true);

-- ============================================

-- 3. FINANCE DATA TABLE
CREATE TABLE IF NOT EXISTS finance_data (
    id BIGINT PRIMARY KEY,
    user_id TEXT NOT NULL,
    month INTEGER NOT NULL,
    gaji NUMERIC DEFAULT 0,
    bonus NUMERIC DEFAULT 0,
    thr NUMERIC DEFAULT 0,
    emas NUMERIC DEFAULT 0,
    pinjaman NUMERIC DEFAULT 0,
    pengeluaran NUMERIC DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE finance_data ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own finance_data" ON finance_data FOR SELECT USING (true);
CREATE POLICY "Users can insert own finance_data" ON finance_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own finance_data" ON finance_data FOR UPDATE USING (true);
CREATE POLICY "Users can delete own finance_data" ON finance_data FOR DELETE USING (true);

-- ============================================

-- 4. SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS schedules (
    id BIGINT PRIMARY KEY,
    user_id TEXT NOT NULL,
    market_name TEXT NOT NULL,
    days TEXT,
    close_time TEXT,
    open_time TEXT,
    link TEXT,
    status TEXT DEFAULT 'active',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own schedules" ON schedules FOR SELECT USING (true);
CREATE POLICY "Users can insert own schedules" ON schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own schedules" ON schedules FOR UPDATE USING (true);
CREATE POLICY "Users can delete own schedules" ON schedules FOR DELETE USING (true);

-- ============================================

-- 5. STAFF MISTAKES TABLE
CREATE TABLE IF NOT EXISTS staff_mistakes (
    id BIGINT PRIMARY KEY,
    user_id TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    date DATE,
    evidence_link TEXT,
    description TEXT,
    severity TEXT DEFAULT 'Medium',
    livechat_code TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE staff_mistakes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own staff_mistakes" ON staff_mistakes FOR SELECT USING (true);
CREATE POLICY "Users can insert own staff_mistakes" ON staff_mistakes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own staff_mistakes" ON staff_mistakes FOR UPDATE USING (true);
CREATE POLICY "Users can delete own staff_mistakes" ON staff_mistakes FOR DELETE USING (true);

-- ============================================

-- 6. BOLA ARTICLES TABLE
CREATE TABLE IF NOT EXISTS bola_articles (
    id BIGINT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT DEFAULT 'Taktik',
    update_date TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bola_articles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own bola_articles" ON bola_articles FOR SELECT USING (true);
CREATE POLICY "Users can insert own bola_articles" ON bola_articles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own bola_articles" ON bola_articles FOR UPDATE USING (true);
CREATE POLICY "Users can delete own bola_articles" ON bola_articles FOR DELETE USING (true);

-- ============================================

-- 7. GLOBAL CHATS TABLE (Legacy)
CREATE TABLE IF NOT EXISTS global_chats (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT,
    username TEXT,
    message TEXT,
    attachment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE global_chats ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view global_chats" ON global_chats FOR SELECT USING (true);
CREATE POLICY "Anyone can insert global_chats" ON global_chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete own global_chats" ON global_chats FOR DELETE USING (true);

-- ============================================

-- 8. CHAT TYPING TABLE
CREATE TABLE IF NOT EXISTS chat_typing (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT UNIQUE,
    username TEXT,
    room_id UUID,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_typing ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view chat_typing" ON chat_typing FOR SELECT USING (true);
CREATE POLICY "Anyone can insert chat_typing" ON chat_typing FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete chat_typing" ON chat_typing FOR DELETE USING (true);

-- ============================================
-- ADVANCED CHAT TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    type TEXT CHECK (type IN ('global','group','private')) DEFAULT 'global',
    created_by TEXT,
    pinned_message_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Initial Global Room
INSERT INTO chat_rooms (id, name, type) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Global Community', 'global')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view chat_rooms" ON chat_rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can insert chat_rooms" ON chat_rooms FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id TEXT,
    username TEXT,
    message TEXT,
    attachment TEXT,
    reply_to BIGINT,
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read messages" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can send messages" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "User can update own message" ON chat_messages FOR UPDATE USING (true);
CREATE POLICY "User can delete own message" ON chat_messages FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS chat_room_members (
    id BIGSERIAL PRIMARY KEY,
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id TEXT,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view members" ON chat_room_members FOR SELECT USING (true);
CREATE POLICY "Anyone can join rooms" ON chat_room_members FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS chat_reads (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id TEXT,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

ALTER TABLE chat_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view read status" ON chat_reads FOR SELECT USING (true);
CREATE POLICY "Anyone can insert read status" ON chat_reads FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS chat_mentions (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT REFERENCES chat_messages(id) ON DELETE CASCADE,
    mentioned_user TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view mentions" ON chat_mentions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert mentions" ON chat_mentions FOR INSERT WITH CHECK (true);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_login_data_user_id ON login_data(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_data_user_id ON finance_data(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_mistakes_user_id ON staff_mistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_bola_articles_user_id ON bola_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_global_chats_created_at ON global_chats(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_typing_room_id ON chat_typing(room_id, last_active);

-- Admin Check Logic
CREATE OR REPLACE FUNCTION is_admin(room UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_room_members
    WHERE room_id = room
      AND user_id = auth.jwt() ->> 'email'
      AND role IN ('admin','moderator')
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Default Admin
INSERT INTO chat_room_members (room_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'afwan388@gmail.com', 'admin')
ON CONFLICT DO NOTHING;

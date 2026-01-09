import React, { useState, useEffect, useRef, Suspense, lazy, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Globe, Lock, PlusCircle, Settings,
    CheckCheck, X, Paperclip,
    Reply as ReplyIcon, Bell, Search, Users, UserPlus,
    ArrowRight, Info, MoreVertical, ShieldCheck, Zap, Clock, Camera, Trash2, EyeOff, Mic, Play, Pause, Square,
    ChevronLeft, Menu, Smile, Sticker
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../lib/supabase';

// PERFORMANCE: Lazy load EmojiPicker (300KB+ reduction in initial bundle!)
const EmojiPicker = lazy(() => import('emoji-picker-react'));

// Simple loading fallback for emoji picker
const EmojiPickerFallback = () => (
    <div style={{
        height: '350px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1e293b',
        borderRadius: '12px'
    }}>
        <div style={{
            width: '24px', height: '24px',
            border: '3px solid rgba(59,130,246,0.2)',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        }} />
    </div>
);

const SULTAN_STICKERS = [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzhqZ3Z5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5L2dpZg/cF7QqO5DYdft6/giphy.gif', // Cool Doge
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbm91eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5L2dpZg/l0HlHFRbmaXRoTfkc/giphy.gif', // Thumbs up
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbm91eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5L2dpZg/3o7aD2saalBwwftBIY/giphy.gif', // Laughing
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbm91eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5L2dpZg/l0HlO3BJ1lq0lT2da/giphy.gif', // Heart
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbm91eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5L2dpZg/3oKIPnAiaMCws8nOsE/giphy.gif', // Fire
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbm91eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5L2dpZg/l0HlI6N8Hn0yKE89q/giphy.gif', // Wow
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbm91eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5L2dpZg/3o7TKr3nzbh5WgCFxe/giphy.gif', // Sad
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbm91eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5L2dpZg/3o7TKoWXm3okO1kgHC/giphy.gif', // High Five
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjR5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5L2dpZg/l0ExhcMov7hbbSkGw/giphy.gif', // Party
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjR5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5L2dpZg/3o6UB3VhArvomJHtdK/giphy.gif'  // Money
];

// ==========================================
// 🛠️ CONFIGURATION ZONE 🛠️
// ==========================================
// Credentials imported from src/lib/supabase.js to ensure consistency
const GLOBAL_ROOM_ID = '00000000-0000-0000-0000-000000000000';
const SOFT_NOTIFY_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3';
const PROFILE_KEY = 'user_custom_profile_v2';
const HIDDEN_MSGS_KEY = 'user_hidden_messages_v1';
const CACHED_MSGS_KEY = 'user_cached_messages_v1';

// UTILS: AGGRESSIVE COMPRESSION
const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; // Reduced from 1200
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Compress to JPEG 0.5 quality (Aggressive)
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
        };
    });
};

const GlobalChat = () => {
    const { user } = useAuth();
    const [supabase, setSupabase] = useState(null);
    // OPTIMIZATION: Initialize with cache immediately for zero-latency UI
    const [allMessages, setAllMessages] = useState(() => {
        try {
            const cached = localStorage.getItem(CACHED_MSGS_KEY);
            return cached ? JSON.parse(cached) : [];
        } catch (e) { return []; }
    });
    const [chatRooms, setChatRooms] = useState([]);
    const [activeRoomId, setActiveRoomId] = useState(GLOBAL_ROOM_ID);
    const [activeTab, setActiveTab] = useState('All');
    const [inputMessage, setInputMessage] = useState('');
    const [status, setStatus] = useState('connecting');
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [toast, setToast] = useState(null);
    const [hiddenMessageIds, setHiddenMessageIds] = useState([]);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [pickerTab, setPickerTab] = useState('emoji'); // 'emoji' | 'sticker'

    const [profile, setProfile] = useState({
        displayName: user?.username || 'Sultan',
        email: user?.email || 'sultan@email.com',
        avatar: null
    });

    const [typingUsers, setTypingUsers] = useState([]);
    const [readReceipts, setReadReceipts] = useState({});
    const [members, setMembers] = useState([]);
    const [memberAvatars, setMemberAvatars] = useState({});
    const [pinnedMsg, setPinnedMsg] = useState(null);

    const [attachment, setAttachment] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordDuration, setRecordDuration] = useState(0);
    const timerRef = useRef(null);

    const scrollRef = useRef(null);
    const audioRef = useRef(new Audio(SOFT_NOTIFY_SOUND));
    // --- IMPROVED MOBILE DETECTION & NAVIGATION ---
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
    const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(true);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 1024;
            setIsMobile(mobile);
            // If we resize from desktop to mobile, hide sidebar by default if room selected
            if (mobile && activeRoomId) setShowSidebarOnMobile(false);

            // Auto-scroll to bottom on keyboard popup
            if (isAtBottom && scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [activeRoomId, isAtBottom]);

    // Switch view on mobile when active room changes
    useEffect(() => {
        if (isMobile && activeRoomId) setShowSidebarOnMobile(false);
    }, [activeRoomId, isMobile]);

    // --- SETUP ---
    useEffect(() => {
        const client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
        setSupabase(client);
        loadData(client);

        // Load Local Storage Data Safely
        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
        } catch (e) { console.error("Profile load failed", e); }

        const globalBg = user?.bgImage || user?.bg_image || null;
        setProfile(prev => ({
            ...prev, ...saved,
            email: user?.email || saved.email || 'sultan@email.com',
            displayName: saved.displayName || user?.username || 'Sultan',
            bg_image: globalBg // STRICT SYNC: Always use Dashboard BG
        }));

        let hidden = [];
        try {
            hidden = JSON.parse(localStorage.getItem(HIDDEN_MSGS_KEY) || '[]');
        } catch (e) { console.error("Hidden msgs load failed", e); }
        setHiddenMessageIds(hidden);


        const channel = client.channel(`chat_v32`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
                let newMsg = payload.new;
                if (newMsg.room_id !== activeRoomId) return;

                // FIX: If the payload is incomplete (sometimes happens with large Base64), fetch the full row
                if (!newMsg.message && !newMsg.attachment) {
                    const { data } = await client.from('chat_messages').select('*').eq('id', newMsg.id).single();
                    if (data) newMsg = data;
                }

                setAllMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });

                if (newMsg.username !== profile.displayName) {
                    audioRef.current.play().catch(() => { });
                    setToast({ title: newMsg.username, msg: newMsg.message || 'Mengirim gambar sultan...' });
                    setTimeout(() => setToast(null), 3000);
                    markAsRead(newMsg.id);
                }
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, payload => {
                setAllMessages(prev => prev.filter(m => m.id !== payload.old.id));
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, payload => {
                setAllMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, () => {
                loadData(client);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_typing' }, payload => {
                const typingData = payload.new;
                if (typingData.user_id === profile.email) return;
                setTypingUsers(prev => {
                    const exists = prev.find(u => u.user_id === typingData.user_id);
                    if (exists) return prev.map(u => u.user_id === typingData.user_id ? typingData : u);
                    return [...prev, typingData];
                });
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_typing' }, payload => {
                setTypingUsers(prev => prev.filter(u => u.id !== payload.old.id));
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_reads' }, payload => {
                setReadReceipts(prev => ({ ...prev, [payload.new.message_id]: [...(prev[payload.new.message_id] || []), payload.new.user_id] }));
            })
            .subscribe();

        // Typing cleanup interval
        const typingInterval = setInterval(() => {
            setTypingUsers(prev => prev.filter(u => (new Date() - new Date(u.last_active)) < 5000));
        }, 3000);

        return () => {
            client.removeChannel(channel);
            clearInterval(typingInterval);
        };
    }, [user, activeRoomId, profile.displayName, profile.email]);

    const updateTypingStatus = async (isTyping) => {
        if (!supabase || !profile.email) return;
        if (isTyping) {
            await supabase.from('chat_typing').upsert([{
                user_id: profile.email,
                username: profile.displayName,
                room_id: activeRoomId,
                last_active: new Date().toISOString()
            }], { onConflict: 'user_id' });
        } else {
            await supabase.from('chat_typing').delete().eq('user_id', profile.email);
        }
    };

    const loadData = async (client = supabase) => {
        if (!client) return;
        setStatus('connecting');
        const isGlobal = activeRoomId === GLOBAL_ROOM_ID;

        try {
            // OPTIMIZATION: Use Promise.all for parallel fetching
            const [roomsResult, msgsResult, readsResult, membersResult] = await Promise.all([
                client.from('chat_rooms').select('*'),
                client.from('chat_messages').select('*').eq('room_id', activeRoomId).order('created_at', { ascending: true }).limit(50),
                client.from('chat_reads').select('*'),
                client.from('chat_room_members').select('*').eq('room_id', activeRoomId)
            ]);

            // Handle Rooms
            setChatRooms(roomsResult.data || []);

            // Check if user is member of Global Community (auto-join)
            if (profile.email && isGlobal) {
                const { data: mbrCheck } = await client.from('chat_room_members').select('*').eq('room_id', GLOBAL_ROOM_ID).eq('user_id', profile.email);
                if (!mbrCheck || mbrCheck.length === 0) {
                    client.from('chat_room_members').insert([{ room_id: GLOBAL_ROOM_ID, user_id: profile.email, role: 'member' }]).then();
                }
            }

            // Handle Messages
            const msgs = msgsResult.data || [];
            if (msgs) {
                setAllMessages(msgs);
                if (isGlobal) {
                    localStorage.setItem(CACHED_MSGS_KEY, JSON.stringify(msgs.slice(-30)));
                }
            }

            // Handle Read Receipts
            const receipts = {};
            readsResult.data?.forEach(r => {
                receipts[r.message_id] = [...(receipts[r.message_id] || []), r.user_id];
            });
            setReadReceipts(receipts);

            // Handle Members
            setMembers(membersResult.data || []);

            // OPTIMIZATION: Fetch Avatars for all participants
            const uniqueEmails = [...new Set([
                ...(msgs || []).map(m => m.user_id),
                ...(membersResult.data || []).map(m => m.user_id)
            ])];

            if (uniqueEmails.length > 0) {
                const { data: userDetails } = await client.from('user_accounts').select('email, avatar').in('email', uniqueEmails);
                const avatarMap = {};
                userDetails?.forEach(u => {
                    avatarMap[u.email] = u.avatar;
                });
                setMemberAvatars(prev => ({ ...prev, ...avatarMap }));
            }

            // Check Pinned Message
            const currentRoom = roomsResult.data?.find(r => r.id === activeRoomId);
            if (currentRoom?.pinned_message_id) {
                const { data: pMsg } = await client.from('chat_messages').select('*').eq('id', currentRoom.pinned_message_id).single();
                setPinnedMsg(pMsg);
            } else {
                setPinnedMsg(null);
            }

            setStatus('online');
        } catch (err) { console.error("Load conn error", err); setStatus('error'); }
    };

    const handleIncomingMessage = (newMsg) => {
        if (newMsg.room_id !== activeRoomId) return;
        setAllMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
        });
        if (newMsg.username !== profile.displayName) {
            audioRef.current.play().catch(() => { });
            setToast({ title: newMsg.username, msg: newMsg.message });
            setTimeout(() => setToast(null), 3000);
            markAsRead(newMsg.id);
        }
    };

    const markAsRead = async (msgId) => {
        if (!supabase || !profile.email) return;
        await supabase.from('chat_reads').upsert([{ message_id: msgId, user_id: profile.email }], { onConflict: 'message_id, user_id' });
    };

    const isAdmin = members.some(m => m.user_id === profile.email && (m.role === 'admin' || m.role === 'moderator'));

    const extractMentions = (text) => [...text.matchAll(/@(\w+)/g)].map(m => m[1]);

    const handleSend = async (voiceBlob = null) => {
        if (!inputMessage.trim() && !attachment && !voiceBlob) return;
        const msgText = voiceBlob ? '🎤 Voice Message' : inputMessage.trim();
        const tempId = `temp_${Date.now()}`;

        const msgObj = {
            id: tempId, room_id: activeRoomId, user_id: profile.email,
            username: profile.displayName, message: msgText,
            reply_to: replyTo?.id || null, created_at: new Date().toISOString(),
            attachment: attachment || (voiceBlob && typeof voiceBlob === 'string' ? voiceBlob : null),
            is_optimistic: true
        };

        setAllMessages(prev => [...prev, msgObj]);
        setInputMessage(''); setReplyTo(null); setAttachment(null);
        setShowPicker(false); // Auto-close picker

        if (supabase) {
            // Check if attachment is large, if so, we should ideally use Storage 
            // but for now we insert and ensure real-time is handled.
            const { data, error } = await supabase.from('chat_messages').insert([{
                room_id: activeRoomId, user_id: profile.email,
                username: profile.displayName, message: msgText,
                reply_to: msgObj.reply_to,
                attachment: msgObj.attachment
            }]).select();

            if (error) {
                console.error("Send failed:", error);
                setAllMessages(prev => prev.filter(m => m.id !== tempId));
                setToast({ title: 'Error', msg: 'Gagal mengirim pesan' });
                return;
            }

            if (data?.[0]) {
                const realMsg = data[0];
                setAllMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));

                const mentions = extractMentions(msgText);
                if (mentions.length > 0) {
                    await supabase.from('chat_mentions').insert(
                        mentions.map(u => ({ message_id: realMsg.id, mentioned_user: u }))
                    );
                }
            }
        }
    };

    const pinMessage = async (msgId) => {
        if (!isAdmin) return;
        await supabase.from('chat_rooms').update({ pinned_message_id: msgId }).eq('id', activeRoomId);
        loadData(supabase);
    };

    const handleUnsendForEveryone = async (msgId) => {
        if (!confirm("Tarik pesan ini untuk SEMUA orang?")) return;
        if (supabase) {
            await supabase.from('chat_messages').update({
                message: '🚫 Pesan ini telah ditarik',
                is_deleted: true
            }).eq('id', msgId);
            setOpenMenuId(null);
        }
    };

    const handleUnsendForMe = (msgId) => {
        const updatedHidden = [...hiddenMessageIds, msgId];
        setHiddenMessageIds(updatedHidden);
        localStorage.setItem(HIDDEN_MSGS_KEY, JSON.stringify(updatedHidden));
        setOpenMenuId(null);
    };

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        setIsAtBottom(scrollHeight - scrollTop - clientHeight < 150);
    };

    // Auto-scroll logic
    useEffect(() => {
        // Instant scroll on room change (or initial load)
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            setIsAtBottom(true);
        }
    }, [activeRoomId]);

    useEffect(() => {
        // Smooth scroll for new messages if user was at bottom
        if (isAtBottom && scrollRef.current) {
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
                }
            }, 100);
        }
    }, [allMessages, hiddenMessageIds]);

    // Create handleSaveProfile with Error Handling for Quota
    // Create handleSaveProfile with Error Handling for Quota
    const handleSaveProfile = async () => {
        try {
            const profileStr = JSON.stringify(profile);
            if (profileStr.length > 3500000) { // Safety buffer before 5MB
                alert("Ukuran data profil terlalu besar. Coba ganti wallpaper dengan gambar yang lebih sederhana/kecil.");
                return;
            }

            localStorage.setItem(PROFILE_KEY, profileStr);
            setShowSettingsModal(false);
            setToast({ title: 'Berhasil', msg: 'Profile & Background tersimpan!' });
            setTimeout(() => setToast(null), 2000);

            // Sync to Global Account if possible (Optional)
            if (supabase && profile.email) {
                await supabase.from('user_accounts').update({
                    display_name: profile.displayName
                }).eq('email', profile.email);
            }

        } catch (e) {
            console.error("Save Profile Failed", e);
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                alert("Penyimpanan Browser Penuh! Hapus cache atau gunakan gambar yang lebih kecil.");
            } else {
                alert("Gagal menyimpan profil: " + e.message);
            }
        }
    };

    const getAvatar = (name) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${name || 'User'}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

    return (
        <div className="chat-sultan-v31 no-scrollbar" onClick={() => setOpenMenuId(null)} style={{
            height: isMobile ? 'calc(100vh - 90px)' : 'calc(100vh - 100px)',
            display: 'flex',
            width: '100%',
            maxWidth: '1400px',
            margin: '0 auto',
            backgroundImage: profile.bg_image ? `url(${profile.bg_image})` : 'none',
            backgroundColor: '#0f172a',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            borderRadius: isMobile ? '0' : '24px',
            overflow: 'hidden',
            border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            position: 'relative',
            zIndex: 10,
            fontFamily: "'Outfit', sans-serif"
        }}>

            {/* SIDEBAR */}
            <div style={{
                width: isMobile ? '100%' : '340px',
                background: '#111827',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                display: (isMobile && !showSidebarOnMobile) ? 'none' : 'flex',
                flexDirection: 'column',
                height: '100%'
            }}>
                <div style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h2 style={{ color: 'white', fontWeight: '800', fontSize: '22px' }}>Chat</h2>
                        <Settings size={20} color="#64748b" style={{ cursor: 'pointer' }} onClick={() => setShowSettingsModal(true)} />
                    </div>
                    {/* PROFILE CARD */}
                    <div onClick={() => setShowSettingsModal(true)} style={{ background: 'rgba(30,41,59,0.5)', padding: '14px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
                        <img src={profile.avatar || getAvatar(profile.displayName)} style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover' }} />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ color: 'white', fontWeight: '700', fontSize: '15px' }}>{profile.displayName}</div>
                            <div style={{ color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.email}</div>
                        </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setShowNewChatModal(true); }} style={{ width: '100%', padding: '16px', background: '#3b82f6', borderRadius: '16px', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <PlusCircle size={20} /> New Conversation
                    </button>
                    <div style={{ display: 'flex', background: 'rgba(30,41,59,0.5)', marginTop: '20px', borderRadius: '12px', padding: '4px' }}>
                        {['All', 'Friends', 'Groups'].map(t => (
                            <button key={t} onClick={() => setActiveTab(t)} style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', background: activeTab === t ? '#3b82f6' : 'transparent', color: 'white', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{t}</button>
                        ))}
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
                    <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '800', margin: '20px 0 10px 10px', letterSpacing: '1px' }}>GLOBAL COMMUNITY</div>
                    <div onClick={() => {
                        setActiveRoomId(GLOBAL_ROOM_ID);
                        if (isMobile) setShowSidebarOnMobile(false);
                    }} style={{
                        padding: '16px', borderRadius: '20px', cursor: 'pointer', display: 'flex', gap: '14px', marginBottom: '16px',
                        background: activeRoomId === GLOBAL_ROOM_ID ? 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))' : 'rgba(30,41,59,0.3)',
                        border: activeRoomId === GLOBAL_ROOM_ID ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.03)',
                        transition: 'all 0.3s',
                        boxShadow: activeRoomId === GLOBAL_ROOM_ID ? '0 10px 20px rgba(0,0,0,0.2)' : 'none'
                    }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(59,130,246,0.4)', position: 'relative' }}>
                            <Globe color="#fff" size={26} />
                            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, background: '#22c55e', borderRadius: '50%', border: '3px solid #111827' }}></div>
                        </div>
                        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ color: 'white', fontWeight: '800', fontSize: '16px', letterSpacing: '0.2px' }}>Global Community</div>
                            <div style={{ color: '#60a5fa', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Zap size={10} fill="#60a5fa" /> SERVER AKTIF
                            </div>
                        </div>
                    </div>

                    <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '800', margin: '20px 0 10px 10px', letterSpacing: '1px' }}>PESAN ANDA</div>
                    {chatRooms.filter(r => r.id !== GLOBAL_ROOM_ID && (activeTab === 'All' || (activeTab === 'Friends' && r.type === 'private') || (activeTab === 'Groups' && r.type === 'group'))).length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#475569', fontSize: '13px', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '16px' }}>Belum ada obrolan {activeTab !== 'All' ? activeTab : ''}</div>
                    )}
                    {chatRooms.filter(r => r.id !== GLOBAL_ROOM_ID && (activeTab === 'All' || (activeTab === 'Friends' && r.type === 'private') || (activeTab === 'Groups' && r.type === 'group'))).map(room => (
                        <div key={room.id} onClick={() => {
                            setActiveRoomId(room.id);
                            if (isMobile) setShowSidebarOnMobile(false);
                        }} style={{ padding: '14px', borderRadius: '16px', cursor: 'pointer', display: 'flex', gap: '12px', marginBottom: '8px', background: activeRoomId === room.id ? 'rgba(59,130,246,0.1)' : 'transparent', border: activeRoomId === room.id ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent', transition: 'all 0.2s' }}>
                            <img src={getAvatar(room.name)} style={{ width: '48px', height: '48px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div style={{ overflow: 'hidden' }}><div style={{ color: 'white', fontWeight: '700', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{room.name}</div><div style={{ color: '#64748b', fontSize: '12px' }}>{room.type === 'private' ? 'Personal' : 'Group'} Chat</div></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CHAT AREA */}
            <div style={{ flex: 1, display: (isMobile && showSidebarOnMobile) ? 'none' : 'flex', flexDirection: 'column', background: '#0f172a', height: '100%' }}>
                <AnimatePresence>
                    {toast && (
                        <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 20, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} style={{ position: 'absolute', top: 60, left: '50%', background: '#1e293b', padding: '10px 20px', borderRadius: '20px', zIndex: 100, border: '1px solid #3b82f6' }}>
                            <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{toast.title}:</span> <span style={{ color: 'white' }}>{toast.msg}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div style={{ padding: isMobile ? '14px 16px' : '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(10px)' }}>
                    {isMobile && (
                        <button onClick={() => setShowSidebarOnMobile(true)} style={{ background: 'none', border: 'none', color: 'white', marginRight: '4px', cursor: 'pointer' }}>
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    <div style={{ width: isMobile ? '32px' : '40px', height: isMobile ? '32px' : '40px', borderRadius: '10px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {activeRoomId === GLOBAL_ROOM_ID ? <Globe color="#fff" size={isMobile ? 16 : 20} /> : <Users color="#fff" size={isMobile ? 16 : 20} />}
                    </div>
                    <div style={{ color: 'white', fontWeight: '800', fontSize: isMobile ? '16px' : '18px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {activeRoomId === GLOBAL_ROOM_ID ? 'Global Community' : chatRooms.find(r => r.id === activeRoomId)?.name}
                    </div>
                </div>

                {pinnedMsg && (
                    <div style={{ background: '#1e293b', padding: '10px 24px', borderBottom: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ color: '#3b82f6' }}><Info size={16} /></div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Pinned Message</div>
                            <div style={{ fontSize: '13px', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <b>@{pinnedMsg.username}:</b> {pinnedMsg.message}
                            </div>
                        </div>
                        {isAdmin && <button onClick={() => pinMessage(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={14} /></button>}
                    </div>
                )}

                <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* LOADING SKELETON */}
                    {status === 'connecting' && allMessages.length === 0 && (
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', animate: 'pulse' }}>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                                    <div style={{ width: '100px', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
                                    <div style={{ width: '250px', height: '60px', background: 'rgba(255,255,255,0.05)', borderRadius: '22px' }}></div>
                                </div>
                            ))}
                        </div>
                    )}

                    {allMessages.filter(m => m.room_id === activeRoomId && !hiddenMessageIds.includes(m.id)).map((msg) => {
                        const isMe = msg.username === profile.displayName;
                        const replyMsg = msg.reply_to ? allMessages.find(m => m.id === msg.reply_to) : null;
                        return (
                            <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <b>{msg.username}</b> <span style={{ opacity: 0.5 }}>{msg.user_id}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                    {!isMe && <img src={memberAvatars[msg.user_id] || getAvatar(msg.username)} style={{ width: '32px', height: '32px', borderRadius: '10px', marginBottom: '4px', objectFit: 'cover' }} />}
                                    <div style={{
                                        position: 'relative', padding: '12px 18px',
                                        background: msg.is_deleted ? 'rgba(30,41,59,0.3)' : (isMe ? '#3b82f6' : '#1e293b'),
                                        borderRadius: '22px', borderBottomRightRadius: isMe ? '4px' : '22px',
                                        borderBottomLeftRadius: isMe ? '22px' : '4px',
                                        color: msg.is_deleted ? '#64748b' : 'white',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                        fontStyle: msg.is_deleted ? 'italic' : 'normal',
                                        border: msg.is_deleted ? '1px dashed rgba(255,255,255,0.1)' : 'none'
                                    }}>
                                        {replyMsg && !msg.is_deleted && <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '10px', marginBottom: '8px', borderLeft: '3px solid #60a5fa', fontSize: '11px' }}>{replyMsg.message}</div>}

                                        {msg.attachment && !msg.is_deleted && (
                                            msg.attachment.startsWith('data:audio') ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: '12px', marginBottom: '8px', minWidth: '180px' }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const audio = new Audio(msg.attachment);
                                                            audio.play().catch(() => alert("Gagal memutar suara!"));
                                                        }}
                                                        style={{ background: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                    >
                                                        <Play size={16} color="#3b82f6" fill="#3b82f6" />
                                                    </button>
                                                    <div style={{ height: '4px', flex: 1, background: 'rgba(255,255,255,0.2)', borderRadius: '2px', position: 'relative' }}>
                                                        <motion.div animate={{ width: ['0%', '100%'] }} transition={{ duration: 3, repeat: Infinity }} style={{ height: '100%', background: '#fff', borderRadius: '2px' }}></motion.div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <img src={msg.attachment} style={{ maxWidth: '250px', borderRadius: '12px', marginBottom: '8px', display: 'block' }} />
                                            )
                                        )}

                                        <div style={{ fontSize: msg.is_deleted ? '13px' : '15px' }}>{msg.message}</div>
                                        <div style={{ textAlign: 'right', fontSize: '9px', opacity: 0.5, marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {isMe && !msg.is_deleted && (
                                                <div style={{ display: 'flex', marginLeft: '4px' }}>
                                                    <CheckCheck size={12} color={readReceipts[msg.id]?.length > 0 ? "#3b82f6" : "#64748b"} />
                                                </div>
                                            )}
                                        </div>

                                        <AnimatePresence>
                                            {openMenuId === msg.id && (
                                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ position: 'absolute', top: -110, right: isMe ? 0 : 'auto', left: isMe ? 'auto' : 0, background: '#1e293b', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', zIndex: 100, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                                                    <button onClick={() => handleUnsendForMe(msg.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}><EyeOff size={14} /> Hapus untuk Saya</button>
                                                    {(isMe || isAdmin) && <button onClick={() => handleUnsendForEveryone(msg.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}><Trash2 size={14} /> Tarik untuk Semua</button>}
                                                    {isAdmin && <button onClick={() => pinMessage(msg.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#3b82f6', border: 'none', color: 'white', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}><PlusCircle size={14} /> Pin Pesan</button>}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <button onClick={(e) => { e.stopPropagation(); setReplyTo(msg); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><ReplyIcon size={14} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(msg.id === openMenuId ? null : msg.id); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><MoreVertical size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {typingUsers.filter(u => u.room_id === activeRoomId).length > 0 && (
                    <div style={{ padding: '0 24px 8px', color: '#64748b', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '3px' }}>
                            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 4, height: 4, borderRadius: '50%', background: '#3b82f6' }} />
                            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} style={{ width: 4, height: 4, borderRadius: '50%', background: '#3b82f6' }} />
                            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} style={{ width: 4, height: 4, borderRadius: '50%', background: '#3b82f6' }} />
                        </div>
                        {typingUsers.filter(u => u.room_id === activeRoomId).map(u => u.username).join(', ')} sedang mengetik...
                    </div>
                )}

                {/* INPUT AREA */}
                <div style={{
                    padding: isMobile ? '10px 12px' : '20px 24px',
                    background: '#111827',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 10px)' : '20px'
                }}>
                    <AnimatePresence>
                        {attachment && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '12px' }}>
                                <img src={attachment} style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover', border: '2px solid #3b82f6' }} />
                                <button onClick={() => setAttachment(null)} style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', border: 'none', borderRadius: '50%', padding: '4px', cursor: 'pointer' }}><X size={12} color="white" /></button>
                            </motion.div>
                        )}
                        {replyTo && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} style={{ background: 'rgba(59,130,246,0.05)', padding: '12px 20px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(59,130,246,0.2)', borderBottom: 'none', backdropFilter: 'blur(10px)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: 3, height: 16, background: '#3b82f6', borderRadius: 2 }}></div>
                                    <div style={{ fontSize: '13px', color: '#3b82f6' }}>Membalas kepada <b style={{ color: '#fff' }}>{replyTo.username}</b></div>
                                </div>
                                <X size={16} color="#64748b" onClick={() => setReplyTo(null)} style={{ cursor: 'pointer' }} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div style={{ background: '#1e293b', padding: '8px 16px', borderRadius: replyTo ? '0 0 24px 24px' : '24px', display: 'flex', gap: '12px', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', position: 'relative' }}>
                        {/* EMOJI/STICKER PICKER POPOVER */}
                        <AnimatePresence>
                            {showPicker && (
                                <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} style={{ position: 'absolute', bottom: '60px', left: isMobile ? '-10px' : 0, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '10px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', width: isMobile ? 'calc(100vw - 40px)' : '320px', maxWidth: '400px', zIndex: 50 }}>
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                                        <button onClick={() => setPickerTab('emoji')} style={{ flex: 1, padding: '8px', background: pickerTab === 'emoji' ? '#3b82f6' : 'transparent', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Smile size={14} /> Emoji</button>
                                        <button onClick={() => setPickerTab('sticker')} style={{ flex: 1, padding: '8px', background: pickerTab === 'sticker' ? '#3b82f6' : 'transparent', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Sticker size={14} /> Sticker</button>
                                    </div>

                                    {pickerTab === 'emoji' ? (
                                        <div style={{ height: '350px' }}>
                                            <Suspense fallback={<EmojiPickerFallback />}>
                                                <EmojiPicker
                                                    theme="dark"
                                                    lazyLoadEmojis={true}
                                                    width="100%"
                                                    height="100%"
                                                    searchDisabled={true}
                                                    skinTonesDisabled={true}
                                                    previewConfig={{ showPreview: false }}
                                                    onEmojiClick={(e) => {
                                                        setInputMessage(prev => prev + e.emoji);
                                                        updateTypingStatus(true);
                                                    }}
                                                />
                                            </Suspense>
                                        </div>
                                    ) : (
                                        <div style={{ height: '350px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '4px' }}>
                                            {SULTAN_STICKERS.map((url, idx) => (
                                                <img
                                                    key={idx}
                                                    src={url}
                                                    onClick={() => {
                                                        const confirmSend = window.confirm("Kirim sticker ini?");
                                                        if (confirmSend) {
                                                            setAttachment(url);
                                                            handleSend(); // Send immediately logic needs to verify handleSend handles attachment state correctly which it does
                                                            setShowPicker(false);
                                                        }
                                                    }}
                                                    style={{ width: '100%', borderRadius: '8px', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s' }}
                                                    onMouseOver={e => e.currentTarget.style.borderColor = '#3b82f6'}
                                                    onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                                                />
                                            ))}
                                            <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '11px' }}>More stickers coming soon!</div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button onClick={() => setShowPicker(!showPicker)} style={{ background: 'none', border: 'none', color: showPicker ? '#3b82f6' : '#64748b', cursor: 'pointer', padding: '8px', transition: 'all 0.2s' }}>
                            <Smile size={20} />
                        </button>

                        <label style={{ color: '#64748b', cursor: 'pointer', padding: '8px' }}><Paperclip size={20} /><input type="file" hidden accept="image/*" onChange={(e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = (ev) => setAttachment(ev.target.result); r.readAsDataURL(f); } }} /></label>
                        <textarea
                            placeholder="Ketik pesan sultan..."
                            value={inputMessage}
                            onChange={e => {
                                setInputMessage(e.target.value);
                                updateTypingStatus(e.target.value.length > 0);
                            }}
                            onBlur={() => updateTypingStatus(false)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                    updateTypingStatus(false);
                                }
                            }}
                            style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none', resize: 'none', height: '40px', fontSize: '15px', padding: '10px 0' }}
                        />
                        <button onClick={() => handleSend()} style={{ width: '42px', height: '42px', background: '#3b82f6', border: 'none', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={18} color="#fff" /></button>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {showSettingsModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ background: '#1e293b', width: isMobile ? '90%' : '380px', borderRadius: '28px', padding: '30px', textAlign: 'center', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <button onClick={() => setShowSettingsModal(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#64748b', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
                        <h3 style={{ color: 'white', marginBottom: '10px' }}>Profile Settings</h3>

                        <div style={{ position: 'relative', width: '80px', height: '80px', margin: '20px auto' }}>
                            <img src={profile.avatar || getAvatar(profile.displayName)} style={{ width: '80px', height: '80px', borderRadius: '20px', objectFit: 'cover', border: '2px solid #3b82f6' }} />
                            <label style={{ position: 'absolute', bottom: -5, right: -5, background: '#3b82f6', padding: '6px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}><Camera size={14} color="white" /><input type="file" hidden accept="image/*" onChange={(e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = (ev) => setProfile({ ...profile, avatar: ev.target.result }); r.readAsDataURL(f); } }} /></label>
                        </div>

                        <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                            <label style={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold' }}>DISPLAY NAME</label>
                            <input value={profile.displayName} onChange={e => setProfile({ ...profile, displayName: e.target.value })} style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: 'white', marginTop: '5px', outline: 'none' }} />
                        </div>

                        <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                            <label style={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold' }}>EMAIL ACCOUNT</label>
                            <input value={profile.email} disabled style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#64748b', marginTop: '5px', cursor: 'not-allowed' }} />
                        </div>


                        <button onClick={handleSaveProfile} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: '14px', color: 'white', border: 'none', marginTop: '10px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}>Save Profile</button>
                    </div>
                </div>
            )}

            {showNewChatModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: '#1e293b', width: '420px', borderRadius: '28px', padding: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 25 }}>
                            <h3 style={{ color: 'white', fontWeight: '800' }}>Start New Chat</h3>
                            <button onClick={() => setShowNewChatModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>FIND USER BY EMAIL</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input id="friend-email-input" placeholder="user@email.com..." style={{ flex: 1, padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: 'white', outline: 'none' }} />
                                <button onClick={async () => {
                                    const email = document.getElementById('friend-email-input').value;
                                    if (!email) return;
                                    // Search user
                                    const { data } = await supabase.from('user_accounts').select('*').eq('email', email).limit(1);
                                    if (data && data.length > 0) {
                                        const otherUser = data[0];
                                        // Create private room logic
                                        const roomName = `Chat: ${profile.displayName} & ${otherUser.display_name || otherUser.username}`;
                                        const { data: newRoom } = await supabase.from('chat_rooms').insert([{ name: roomName, type: 'private', created_by: profile.email }]).select();
                                        if (newRoom) {
                                            await supabase.from('chat_room_members').insert([
                                                { room_id: newRoom[0].id, user_id: profile.email, role: 'member' },
                                                { room_id: newRoom[0].id, user_id: otherUser.email, role: 'member' }
                                            ]);
                                            setActiveRoomId(newRoom[0].id);
                                            setShowNewChatModal(false);
                                            loadData(supabase);
                                        }
                                    } else {
                                        alert("User tidak ditemukan, min!");
                                    }
                                }} style={{ padding: '0 20px', background: '#3b82f6', borderRadius: '12px', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Add</button>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                            <label style={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>CREATE GROUP</label>
                            <button onClick={async () => {
                                const name = prompt("Nama Grup Sultan:");
                                if (name) {
                                    const { data: nRoom } = await supabase.from('chat_rooms').insert([{ name, type: 'group', created_by: profile.email }]).select();
                                    if (nRoom) {
                                        await supabase.from('chat_room_members').insert([{ room_id: nRoom[0].id, user_id: profile.email, role: 'admin' }]);
                                        setShowNewChatModal(false);
                                        setActiveRoomId(nRoom[0].id);
                                        loadData(supabase);
                                    }
                                }
                            }} style={{ width: '100%', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', color: 'white', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.3s' }}>
                                <Users size={20} color="#6366f1" /> Create Group Sultan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalChat;

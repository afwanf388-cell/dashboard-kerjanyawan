import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
    Plus, Trash2, Save, Search, Clock, NotebookPen, X,
    Edit3, Info, Calendar, Hash, Type, Clipboard,
    ChevronRight, Sparkles, CheckCircle2, AlertCircle, Palette,
    Pin, PinOff, Tag, Layers, Zap, Copy, FileText, CheckSquare,
    Link2, ImageIcon, ExternalLink, Paperclip, ScanLine, ArrowUp, ArrowDown, Mouse
} from 'lucide-react';

const NOTE_COLORS = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#f59e0b', // Orange
    '#10b981', // Emerald
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#eab308', // Yellow
    '#6366f1', // Indigo
    '#f43f5e', // Rose
];

const CATEGORIES = [
    { label: 'General', icon: Layers, color: '#94a3b8' },
    { label: 'Urgent', icon: AlertCircle, color: '#ef4444' },
    { label: 'Project', icon: Zap, color: '#8b5cf6' },
    { label: 'Personal', icon: Sparkles, color: '#ec4899' },
];

const TEMPLATES = [
    {
        name: 'Report BEDA',
        title: 'BEDA - [NO REKENING]',
        content: 'Mohon dibantu untuk melampirkan tampilan Profile E-Wallet akun xxx anda sebagai bentuk verifikasi ya bosku, karena kami cek nama rekening yang terdaftar ada perbedaan penulisan nama rekeningnya ya bosku.'
    },
    {
        name: 'Akun Terlock',
        title: 'AKUN TERLOCK REK (BEDA NAMA)',
        content: 'Untuk akun anda terlock otomatis oleh sistem dikarenakan rekening anda terbaca berbeda namanya ya bosku, untuk perihal tersebut mohon di informasikan nama rekening yang sesuai pada rekening tersebut ya bosku.'
    },
];

const NoteCard = React.memo(({ note, index, themeColor, themeFont, openNoteModal, togglePin, deleteNote }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: Math.min(index * 0.05, 0.5), type: 'spring', stiffness: 300, damping: 25 }}
        whileHover={{ y: -10, scale: 1.02 }}
        onClick={() => openNoteModal(note)}
        style={{
            background: 'rgba(15, 23, 42, 0.85)', // Increased opacity slightly for better contrast without blur
            // backdropFilter: 'blur(20px)', // REMOVED CAUSE OF LAG (Macet)
            borderRadius: '32px',
            padding: '28px',
            cursor: 'pointer',
            border: `1px solid ${note.isPinned ? `${note.color}60` : 'rgba(255,255,255,0.08)'}`,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '380px',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            boxShadow: note.isPinned
                ? `0 20px 50px -10px ${note.color}40, 0 0 0 1px ${note.color}30`
                : '0 15px 35px -10px rgba(0,0,0,0.5)',
        }}
    >
        {/* Decorative Accent & Glow */}
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '8px',
            background: note.color || '#3b82f6',
            borderRadius: '32px 32px 0 0',
            opacity: 0.8
        }} />

        {note.isPinned && (
            <div style={{
                position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px',
                background: note.color, filter: 'blur(60px)', opacity: 0.15, pointerEvents: 'none'
            }} />
        )}

        {/* Header: Title & Badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {note.isPinned && (
                        <div style={{
                            padding: '5px 10px', borderRadius: '10px', background: `${note.color}20`,
                            color: note.color, display: 'flex', alignItems: 'center', gap: '5px',
                            border: `1px solid ${note.color}40`
                        }}>
                            <Pin size={10} fill={note.color} />
                            <span style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PINNED</span>
                        </div>
                    )}
                    <div style={{
                        padding: '5px 10px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '5px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <Tag size={10} />
                        <span style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{note.category || 'GENERAL'}</span>
                    </div>
                </div>
                {note.priority === 'High' && (
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px #ef4444', animation: 'pulse 1.5s infinite' }} />
                )}
            </div>

            <h4 style={{
                fontSize: '18px', fontWeight: '900', color: note.color || 'white',
                margin: 0, lineHeight: '1.4',
                fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.3px',
                textShadow: `0 0 20px ${note.color}40`,
                wordBreak: 'break-word'
            }}>
                {note.title || 'Catatan Baru'}
            </h4>
        </div>

        {/* Content Body - SCROLLABLE & CLICKABLE */}
        <div
            className="custom-card-scroll"
            style={{
                flex: 1,
                overflowY: 'auto',
                paddingRight: '12px',
                margin: '10px 0',
                position: 'relative',
                cursor: 'pointer',
                maskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)'
            }}
        >
            <p style={{
                fontSize: '15px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.7',
                margin: 0, whiteSpace: 'pre-wrap',
                fontFamily: themeFont
            }}>
                {note.content || 'Mulailah menulis isi catatanmu di sini...'}
            </p>
        </div>

        {/* Footer: Date & Actions */}
        <div style={{
            marginTop: '24px', paddingTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '10px',
                    background: `rgba(${themeColor}, 0.1)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: `rgb(${themeColor})`
                }}>
                    <Calendar size={14} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: 'white', fontWeight: '800' }}>{note.date}</span>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>DIAMBIL</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                <motion.button
                    whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.08)' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); togglePin(note.id, e); }}
                    style={{
                        width: '42px', height: '42px', borderRadius: '14px',
                        background: note.isPinned ? `${note.color}15` : 'rgba(255,255,255,0.03)',
                        color: note.isPinned ? note.color : 'rgba(255,255,255,0.3)',
                        border: `1px solid ${note.isPinned ? `${note.color}40` : 'rgba(255,255,255,0.05)'}`,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                    <Pin size={16} fill={note.isPinned ? note.color : 'transparent'} />
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.1, background: 'rgba(239, 68, 68, 0.15)' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id, e); }}
                    style={{
                        width: '42px', height: '42px', borderRadius: '14px',
                        background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                    <Trash2 size={16} />
                </motion.button>
            </div>
        </div>
    </motion.div>
));

const CatatanKerja = () => {
    // ... rest of the component ...
    const { user } = useAuth();
    const [notes, setNotes] = useState([]);
    const [activeNote, setActiveNote] = useState(null);
    const [search, setSearch] = useState('');
    const [saveStatus, setSaveStatus] = useState('Standby');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
    const [isInitialLoaded, setIsInitialLoaded] = useState(false);
    const [themeColor, setThemeColor] = useState('59, 130, 246'); // Default Blue RGB
    const [themeFont, setThemeFont] = useState("'Inter', sans-serif"); // Default Font
    const [showScrollTop, setShowScrollTop] = useState(false);

    // Scroll Detector
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- Dynamic Theme Sync ---
    useEffect(() => {
        if (user?.username) {
            const updateTheme = () => {
                const saved = localStorage.getItem(`dashboard_settings_${user.username}`);
                if (saved) {
                    const settings = JSON.parse(saved);
                    if (settings.sidebarColor) {
                        setThemeColor(settings.sidebarColor);
                    }
                    if (settings.fontFamily) {
                        setThemeFont(settings.fontFamily);
                    }
                }
            };
            updateTheme();
            window.addEventListener('storage', updateTheme);
            const interval = setInterval(updateTheme, 1000);
            return () => {
                window.removeEventListener('storage', updateTheme);
                clearInterval(interval);
            };
        }
    }, [user?.username]);
    const [activeTab, setActiveTab] = useState('All');

    // Initial load from localStorage ONLY
    useEffect(() => {
        if (!user?.username) return;

        const loadLocal = () => {
            try {
                const saved = localStorage.getItem(`app_catatan_kerja_${user.username}`);
                if (saved && saved !== 'undefined' && saved !== 'null') {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) setNotes(parsed);
                }
            } catch (e) {
                console.error("Local load error:", e);
            }
            setIsInitialLoaded(true);
        };

        loadLocal();
    }, [user?.username]);

    // Resize listener
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const timerRef = useRef(null);
    const titleRef = useRef(null);

    // Sync with Cloud
    useEffect(() => {
        if (!supabase || !user?.username || !isInitialLoaded) return;

        const syncWithCloud = async () => {
            setSaveStatus('Sinkronisasi...');
            try {
                const { data: cloudData, error: fetchError } = await supabase
                    .from('notes')
                    .select('*')
                    .eq('user_id', user.username)
                    .order('id', { ascending: true });

                if (fetchError) throw fetchError;

                if (cloudData) {
                    // 1. Normalize Cloud Data to match App State (camelCase)
                    const normalizedCloud = cloudData.map(n => ({
                        ...n,
                        id: n.id,
                        title: n.title,
                        content: n.content,
                        date: n.date,
                        color: typeof n.color === 'string' ? n.color : '#3b82f6',
                        category: n.category || 'General',
                        priority: n.priority || 'Medium',
                        attachments: n.attachments || [],
                        // Map snake_case to camelCase
                        isPinned: n.is_pinned,
                        lastUpdated: n.last_updated || new Date().toISOString()
                    }));

                    setNotes(prevLocal => {
                        // 2. Map for fast lookup
                        const cloudMap = new Map(normalizedCloud.map(n => [n.id, n]));

                        // 3. Start with Normalized Cloud Data
                        const mergedStore = [...normalizedCloud];

                        // 4. Recovery: Check for notes in Local that are NOT in Cloud (Offline Created)
                        // OR Local notes that are NEWER than Cloud (Offline Edits)
                        if (Array.isArray(prevLocal)) {
                            prevLocal.forEach(localNote => {
                                const cloudNote = cloudMap.get(localNote.id);

                                if (!cloudNote) {
                                    // Note exists locally but not in Cloud -> Keep it locally
                                    mergedStore.push(localNote);
                                } else {
                                    // Note exists in both. Compare Timestamps.
                                    const localTime = new Date(localNote.lastUpdated || 0).getTime();
                                    const cloudTime = new Date(cloudNote.lastUpdated || 0).getTime();

                                    if (localTime > cloudTime) {
                                        // Local is newer! Overwrite the cloud entry in the store with local.
                                        const index = mergedStore.findIndex(n => n.id === cloudNote.id);
                                        if (index !== -1) {
                                            mergedStore[index] = localNote;
                                        }
                                    }
                                }
                            });
                        }

                        // 5. Deduplicate by ID and Sort
                        const uniqueNotes = Array.from(new Map(mergedStore.map(n => [n.id, n])).values());
                        return uniqueNotes.sort((a, b) => (a.id || 0) - (b.id || 0));
                    });

                    setSaveStatus('Awan Terhubung');
                }
            } catch (err) {
                console.error("Cloud Sync Error:", err);
                setSaveStatus('Mode Offline');
            }
        };

        syncWithCloud();

        // Realtime Subscription
        const channel = supabase
            .channel(`notes_rt_${user.username}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${user.username}` },
                (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const raw = payload.new;
                        // Normalize incoming RT data
                        const updatedNote = {
                            ...raw,
                            color: typeof raw.color === 'string' ? raw.color : '#3b82f6',
                            isPinned: raw.is_pinned,
                            lastUpdated: raw.last_updated
                        };

                        setNotes(prev => {
                            const exists = prev.find(n => n.id === updatedNote.id);
                            // If local is newer, ignore RT update (prevent overwrite while typing)
                            if (exists) {
                                const localTime = new Date(exists.lastUpdated || 0).getTime();
                                const remoteTime = new Date(updatedNote.lastUpdated || 0).getTime();
                                if (localTime > remoteTime) return prev; // Ignore older RT

                                return prev.map(n => n.id === updatedNote.id ? updatedNote : n);
                            }
                            return [...prev, updatedNote];
                        });
                    } else if (payload.eventType === 'DELETE') {
                        setNotes(prev => prev.filter(n => n.id !== payload.old.id));
                    }
                })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.username, isInitialLoaded]);

    // Auto-save to localStorage
    useEffect(() => {
        if (!user?.username || !isInitialLoaded) return;
        localStorage.setItem(`app_catatan_kerja_${user.username}`, JSON.stringify(notes));
    }, [notes, user?.username, isInitialLoaded]);

    // Auto-resize title when modal opens or note changes
    useEffect(() => {
        if (isModalOpen && titleRef.current) {
            titleRef.current.style.height = 'auto';
            titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
        }
    }, [isModalOpen, activeNote?.id]);

    // Simplified UI control functions
    const openNoteModal = (note) => {
        if (!note) return;

        // ULTIMATE SANITIZATION: Ensure NO field is ever null/undefined before opening modal
        const safeNote = {
            ...note,
            id: note.id || Date.now(),
            title: note.title || '',
            content: note.content || '',
            date: note.date || new Date().toLocaleDateString('id-ID'),
            color: (typeof note.color === 'string' && note.color.startsWith('#')) ? note.color : '#3b82f6',
            lastUpdated: note.lastUpdated || note.last_updated || new Date().toLocaleString('id-ID'),
            isPinned: !!note.isPinned,
            category: note.category || 'General',
            priority: note.priority || 'Medium',
            attachments: Array.isArray(note.attachments) ? note.attachments : []
        };

        console.log("Opening Safe Note:", safeNote); // Debugging
        setActiveNote(safeNote);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setActiveNote(null);
    };

    const syncToCloud = async (note) => {
        if (!supabase || !user) return;
        setSaveStatus('Menyimpan...');
        const { error } = await supabase.from('notes').upsert({
            id: note.id,
            user_id: user.username,
            title: note.title,
            content: note.content,
            date: note.date,
            color: note.color || '#3b82f6',
            last_updated: new Date().toISOString(),
            is_pinned: !!note.isPinned,
            category: note.category || 'General',
            priority: note.priority || 'Medium',
            attachments: Array.isArray(note.attachments) ? note.attachments : []
        });
        if (!error) setSaveStatus('Tersimpan');
        else setSaveStatus('Gagal Sync');
    };

    const handleUpdateNote = (field, value) => {
        if (!activeNote) return;
        // Defensive check: Ensure we're not setting undefined values
        const safeValue = value === undefined || value === null ? '' : value;
        const updated = {
            ...activeNote,
            [field]: safeValue,
            lastUpdated: new Date().toLocaleString('id-ID')
        };
        setActiveNote(updated);

        setNotes(prev => Array.isArray(prev) ? prev.map(n => n.id === updated.id ? updated : n) : [updated]);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => syncToCloud(updated), 1000);
    };

    const addNewNote = () => {
        const newNote = {
            id: Date.now(),
            title: '',
            content: '',
            date: new Date().toLocaleDateString('id-ID'),
            color: '#3b82f6',
            lastUpdated: new Date().toLocaleString('id-ID'),
            isPinned: false,
            category: activeTab === 'All' ? 'General' : activeTab,
            priority: 'Medium',
            attachments: []
        };
        setNotes(prev => [...(Array.isArray(prev) ? prev : []), newNote]);
        setActiveNote(newNote);
        setIsModalOpen(true);
        syncToCloud(newNote);
    };

    const togglePin = (id, e) => {
        if (e) e.stopPropagation();
        setNotes(prev => prev.map(n => {
            if (n.id === id) {
                const updated = { ...n, isPinned: !n.isPinned };
                syncToCloud(updated);
                if (activeNote?.id === id) setActiveNote(updated);
                return updated;
            }
            return n;
        }));
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setSaveStatus('Disalin!');
        setTimeout(() => setSaveStatus('Awan Terhubung'), 2000);
    };

    const applyTemplate = (template) => {
        handleUpdateNote('title', template.title);
        handleUpdateNote('content', template.content);
        setSaveStatus('Template Digunakan');
    };

    const scanForLinks = () => {
        if (!activeNote?.content) return;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = activeNote.content.match(urlRegex) || [];
        const existingUrls = (activeNote.attachments || []).map(a => a.url);

        const newAttachments = matches
            .filter(url => !existingUrls.includes(url))
            .map(url => ({
                id: Date.now() + Math.random(),
                url,
                type: url.match(/\.(jpeg|jpg|gif|png|webp)/i) ? 'image' : 'link',
                date: new Date().toLocaleDateString('id-ID')
            }));

        if (newAttachments.length > 0) {
            const updated = {
                ...activeNote,
                attachments: [...(activeNote.attachments || []), ...newAttachments]
            };
            handleUpdateNote('attachments', updated.attachments);
            setSaveStatus(`Ditemukan ${newAttachments.length} Link!`);
        }
    };

    const deleteNote = async (id, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm('Hapus?')) return;

        setNotes(prev => prev.filter(n => n.id !== id));
        if (activeNote?.id === id) closeModal();

        if (supabase) await supabase.from('notes').delete().eq('id', id);
    };

    // Lock scroll when modal is open
    useEffect(() => {
        const mainElement = document.querySelector('main');
        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
            if (mainElement) mainElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            if (mainElement) mainElement.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'unset';
            if (mainElement) mainElement.style.overflow = 'auto';
        };
    }, [isModalOpen]);

    const filteredNotes = React.useMemo(() => {
        return Array.isArray(notes) ? notes.filter(n => {
            if (!n || typeof n !== 'object') return false;
            const searchSafe = (search || '').toLowerCase();
            const titleSafe = String(n.title || '').toLowerCase();
            const contentSafe = String(n.content || '').toLowerCase();
            const matchesSearch = titleSafe.includes(searchSafe) || contentSafe.includes(searchSafe);
            const matchesCategory = activeTab === 'All' || n.category === activeTab;
            return matchesSearch && matchesCategory;
        }).sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return (a.id || 0) - (b.id || 0);
        }) : [];
    }, [notes, search, activeTab]);

    const getNoteStats = (content) => {
        try {
            const text = content === null || content === undefined ? '' : String(content);
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            const chars = text.length;
            return { words, chars };
        } catch (e) {
            return { words: 0, chars: 0 };
        }
    };

    const getCardGradient = (index) => {
        const gradients = [
            'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)',
            'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
            'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
        ];
        return gradients[index % gradients.length];
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 100px)', gap: '24px' }}>
            <style>
                {`
                    .custom-card-scroll::-webkit-scrollbar {
                        width: 4px;
                    }
                    .custom-card-scroll::-webkit-scrollbar-track {
                        background: rgba(255, 255, 255, 0.01);
                        border-radius: 10px;
                    }
                    .custom-card-scroll::-webkit-scrollbar-thumb {
                        background: rgba(${themeColor}, 0.2);
                        border-radius: 10px;
                        border: 1px solid rgba(255,255,255,0.05);
                    }
                    .custom-card-scroll::-webkit-scrollbar-thumb:hover {
                        background: rgba(${themeColor}, 0.5);
                    }
                    /* Ensure smooth transition for cards */
                    .notes-grid {
                        perspective: 1000px;
                    }
                `}
            </style>
            {/* Header Section - Ultra Premium Design */}
            <div className="glass-effect notes-header" style={{
                padding: '32px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '24px',
                borderRadius: '30px',
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative background glow */}
                <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '300px', height: '300px', background: 'var(--primary)', filter: 'blur(150px)', opacity: 0.1, pointerEvents: 'none' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', zIndex: 1 }}>
                    <motion.div
                        whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                        style={{
                            width: '64px', height: '64px', borderRadius: '20px',
                            background: `linear-gradient(135deg, rgb(${themeColor}), rgba(${themeColor}, 0.7))`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 12px 30px rgba(${themeColor}, 0.5), inset 0 0 15px rgba(255,255,255,0.3)`,
                            position: 'relative'
                        }}>
                        <div style={{ position: 'absolute', inset: '-4px', borderRadius: '24px', border: `2px solid rgba(${themeColor}, 0.3)`, filter: 'blur(2px)' }} />
                        <NotebookPen size={32} color="white" />
                    </motion.div>
                    <div>
                        <h1 style={{
                            fontSize: 'clamp(24px, 5vw, 34px)',
                            fontWeight: '900',
                            color: 'white',
                            margin: 0,
                            letterSpacing: '-1px',
                            fontFamily: "'Outfit', sans-serif"
                        }}>
                            Catatan <span style={{ color: `rgb(${themeColor})`, textShadow: `0 0 20px rgba(${themeColor}, 0.5)` }}>Kerja</span>
                        </h1>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                                {Array.isArray(notes) ? notes.length : 0} Ide & Tugas
                            </p>
                            <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }} />
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: '700' }}>
                                v3.0 Digital Brain
                            </p>
                        </div>
                    </div>
                </div>

                <div className="notes-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px', width: isMobile ? '100%' : 'auto', position: 'relative', zIndex: 1 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                        <input
                            type="text"
                            placeholder="Cari ide brilianmu..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                width: '100%',
                                minWidth: isMobile ? '0' : '300px',
                                padding: '16px 20px 16px 52px',
                                fontSize: '15px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '18px',
                                color: 'white',
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                outline: 'none',
                                fontWeight: '600',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                            }}
                            onFocus={(e) => {
                                e.target.style.background = 'rgba(255,255,255,0.05)';
                                e.target.style.borderColor = `rgba(${themeColor}, 0.4)`;
                                e.target.style.boxShadow = `0 0 20px rgba(${themeColor}, 0.15), inset 0 2px 4px rgba(0,0,0,0.2)`;
                            }}
                            onBlur={(e) => {
                                e.target.style.background = 'rgba(255,255,255,0.03)';
                                e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';
                            }}
                        />
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={addNewNote}
                        style={{
                            padding: '16px 28px',
                            borderRadius: '18px',
                            background: `linear-gradient(135deg, rgb(${themeColor}) 0%, rgba(${themeColor}, 0.8) 100%)`,
                            color: 'white',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            fontWeight: '800',
                            fontSize: '15px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: `0 10px 25px rgba(${themeColor}, 0.3), 0 0 0 1px rgba(255,255,255,0.1) inset`,
                            letterSpacing: '0.5px'
                        }}>
                        <Plus size={22} strokeWidth={3} /> <span className="hide-mobile">BARU</span>
                    </motion.button>
                </div>
            </div>

            {/* Premium Category Tabs - Floating Island Style */}
            <div style={{
                display: 'flex',
                gap: '8px',
                padding: '8px',
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(10px)',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.05)',
                width: 'fit-content',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }} className="no-scrollbar">
                {['All', ...CATEGORIES.map(c => c.label)].map(tab => {
                    const CategoryIcon = tab === 'All' ? Layers : CATEGORIES.find(c => c.label === tab)?.icon || Hash;
                    const isActive = activeTab === tab;
                    const tabColor = tab === 'All' ? `rgb(${themeColor})` : (CATEGORIES.find(c => c.label === tab)?.color || `rgb(${themeColor})`);
                    const isThemedTab = tab === 'All';
                    const effectiveColor = isThemedTab ? `rgb(${themeColor})` : tabColor;
                    const effectiveRgb = isThemedTab ? themeColor : (isActive ? effectiveColor : '255,255,255');

                    return (
                        <motion.button
                            key={tab}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '12px 24px',
                                borderRadius: '18px',
                                background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                                color: isActive ? 'white' : 'rgba(255,255,255,0.4)',
                                border: isActive ? `1px solid rgba(${isThemedTab ? themeColor : '255,255,255'}, 0.3)` : '1px solid transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontWeight: '800',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                whiteSpace: 'nowrap',
                                position: 'relative'
                            }}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="tab-glow"
                                    style={{
                                        position: 'absolute', inset: 0, borderRadius: '18px',
                                        boxShadow: `0 0 20px rgba(${isThemedTab ? themeColor : '255,255,255'}, 0.2)`, pointerEvents: 'none'
                                    }}
                                />
                            )}
                            <CategoryIcon size={18} color={isActive ? effectiveColor : 'currentColor'} />
                            {tab}
                            {/* Counter Chip - More Sophisticated */}
                            <span style={{
                                padding: '4px 10px',
                                borderRadius: '10px',
                                background: isActive ? `rgba(${isThemedTab ? themeColor : '255,255,255'}, 0.1)` : 'rgba(255,255,255,0.03)',
                                color: isActive ? effectiveColor : 'white',
                                fontSize: '11px',
                                fontWeight: '900',
                                marginLeft: '6px',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                {tab === 'All' ? (Array.isArray(notes) ? notes.length : 0) : (Array.isArray(notes) ? notes.filter(n => n.category === tab).length : 0)}
                            </span>
                        </motion.button>
                    );
                })}
            </div>

            {/* Masonry-style Grid Cards Area */}
            <div className="notes-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
                gap: '24px',
                padding: isMobile ? '0' : '10px',
                flex: 1,
                alignItems: 'start'
            }}>
                {filteredNotes.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px', textAlign: 'center' }}>
                        <div style={{ padding: '30px', borderRadius: '30px', background: 'rgba(255,255,255,0.03)', marginBottom: '24px' }}>
                            <NotebookPen size={80} style={{ opacity: 0.2, color: 'var(--primary)' }} />
                        </div>
                        <h3 style={{ fontSize: '24px', color: 'white', fontWeight: '700', marginBottom: '8px' }}>Mulai Menulis Hari Ini</h3>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '300px' }}>Klik tombol di atas untuk membuat catatan kerja pertamamu.</p>
                    </motion.div>
                ) : (
                    filteredNotes.map((note, index) => (
                        <NoteCard
                            key={note.id || index}
                            note={note}
                            index={index}
                            themeColor={themeColor}
                            themeFont={themeFont}
                            openNoteModal={openNoteModal}
                            togglePin={togglePin}
                            deleteNote={deleteNote}
                        />
                    ))
                )}
            </div>

            {/* PRO Modal Editor - Ultra Premium Re-Design */}
            {createPortal(
                <AnimatePresence>
                    {isModalOpen && activeNote && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed',
                                top: 0, left: 0, right: 0, bottom: 0,
                                zIndex: 99999,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: isMobile ? '0' : '20px',
                                background: 'rgba(0, 0, 0, 0.9)',
                                backdropFilter: 'blur(20px)',
                                overflow: 'hidden'
                            }}
                            onClick={closeModal}
                        >
                            <motion.div
                                key={activeNote.id}
                                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ duration: 0.2 }}
                                onClick={e => e.stopPropagation()}
                                style={{
                                    width: '100%',
                                    maxWidth: '1200px',
                                    height: isMobile ? '100%' : '85vh',
                                    background: '#111827',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: isMobile ? '0' : '24px',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: isMobile ? 'column' : 'row',
                                    boxShadow: '0 50px 100px rgba(0,0,0,0.8)',
                                    position: 'relative'
                                }}
                            >
                                {/* Editor Sidebar (Meta Data) */}
                                <div className="note-sidebar" style={{
                                    width: isMobile ? '100%' : '320px',
                                    minHeight: isMobile ? 'auto' : '100%', // Prevent collapse
                                    borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                    borderBottom: isMobile ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                    background: 'rgba(255,255,255,0.02)',
                                    padding: isMobile ? '20px' : '32px 24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '20px',
                                    flexShrink: 0,
                                    overflowY: isMobile ? 'visible' : 'auto'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '12px',
                                                background: activeNote?.color ? `${activeNote.color}20` : 'rgba(59,130,246,0.1)',
                                                color: activeNote?.color || 'var(--primary)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.3s ease'
                                            }}>
                                                <NotebookPen size={20} />
                                            </div>
                                            <h5 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: 'white', letterSpacing: '-0.5px' }}>Detail Catatan</h5>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>LAMPIRAN & BUKTI</label>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <motion.button
                                                        whileHover={{ scale: 1.02 }}
                                                        onClick={scanForLinks}
                                                        style={{
                                                            padding: '12px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                                                            color: '#60a5fa', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                                        }}
                                                    >
                                                        <ScanLine size={16} /> Scan Link di Isi
                                                    </motion.button>

                                                    <div style={{
                                                        maxHeight: '250px',
                                                        overflowY: 'auto',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '8px',
                                                        paddingRight: '4px'
                                                    }} className="editor-scrollbar">
                                                        {(activeNote.attachments || []).length === 0 ? (
                                                            <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>
                                                                <Paperclip size={24} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '8px' }} />
                                                                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontWeight: '600' }}>Belum ada lampiran</p>
                                                            </div>
                                                        ) : (
                                                            activeNote.attachments.map(att => (
                                                                <motion.div
                                                                    key={att.id}
                                                                    initial={{ scale: 0.9, opacity: 0 }}
                                                                    animate={{ scale: 1, opacity: 1 }}
                                                                    style={{
                                                                        padding: '10px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                                                                        display: 'flex', flexDirection: 'column', gap: '10px'
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: att.type === 'image' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: att.type === 'image' ? '#10b981' : '#3b82f6' }}>
                                                                            {att.type === 'image' ? <ImageIcon size={16} /> : <Link2 size={16} />}
                                                                        </div>
                                                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                                                            <p style={{ fontSize: '11px', color: 'white', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{att.url}</p>
                                                                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>{att.date}</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => {
                                                                                const updated = activeNote.attachments.filter(a => a.id !== att.id);
                                                                                handleUpdateNote('attachments', updated);
                                                                            }}
                                                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>

                                                                    {att.type === 'image' && (
                                                                        <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                                            <img src={att.url} alt="preview" style={{ width: '100%', height: '80px', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                                                                        </div>
                                                                    )}

                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                                                        <motion.a
                                                                            href={att.url} target="_blank" rel="noopener noreferrer"
                                                                            whileHover={{ background: 'rgba(255,255,255,0.08)' }}
                                                                            style={{ padding: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', color: '#94a3b8', fontSize: '9px', fontWeight: '800', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                                                        >
                                                                            <ExternalLink size={10} /> BUKA
                                                                        </motion.a>
                                                                        <motion.button
                                                                            onClick={() => copyToClipboard(att.url)}
                                                                            whileHover={{ background: 'rgba(255,255,255,0.08)' }}
                                                                            style={{ padding: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', color: '#94a3b8', border: 'none', fontSize: '9px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                                                        >
                                                                            <Copy size={10} /> SALIN
                                                                        </motion.button>
                                                                    </div>
                                                                </motion.div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>KONTROL CEPAT</label>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <motion.button
                                                        whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.1)' }}
                                                        onClick={() => handleUpdateNote('isPinned', !activeNote.isPinned)}
                                                        style={{ flex: 1, padding: '10px', borderRadius: '12px', background: activeNote.isPinned ? `${activeNote.color}20` : 'rgba(255,255,255,0.03)', border: `1px solid ${activeNote.isPinned ? activeNote.color : 'rgba(255,255,255,0.05)'}`, color: activeNote.isPinned ? activeNote.color : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                                                    >
                                                        <Pin size={14} fill={activeNote.isPinned ? activeNote.color : 'transparent'} /> {activeNote.isPinned ? 'Pinned' : 'Pin'}
                                                    </motion.button>
                                                    <motion.button
                                                        whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.1)' }}
                                                        onClick={() => copyToClipboard(`${activeNote.title}\n\n${activeNote.content}`)}
                                                        style={{ flex: 1, padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                                                    >
                                                        <Copy size={14} /> Salin
                                                    </motion.button>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>PRIORITAS</label>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                                    {['Low', 'Medium', 'High'].map(p => (
                                                        <button
                                                            key={p}
                                                            onClick={() => handleUpdateNote('priority', p)}
                                                            style={{
                                                                padding: '8px', borderRadius: '8px', fontSize: '10px', fontWeight: '900',
                                                                background: activeNote.priority === p ? (p === 'High' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)') : 'rgba(255,255,255,0.02)',
                                                                border: `1px solid ${activeNote.priority === p ? (p === 'High' ? '#ef4444' : 'white') : 'rgba(255,255,255,0.05)'}`,
                                                                color: activeNote.priority === p ? 'white' : '#64748b',
                                                                cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase'
                                                            }}
                                                        >
                                                            {p}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>KATEGORI</label>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                                    {CATEGORIES.map(cat => (
                                                        <button
                                                            key={cat.label}
                                                            onClick={() => handleUpdateNote('category', cat.label)}
                                                            style={{
                                                                padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px',
                                                                background: activeNote.category === cat.label ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
                                                                border: `1px solid ${activeNote.category === cat.label ? 'white' : 'transparent'}`,
                                                                color: activeNote.category === cat.label ? 'white' : '#64748b',
                                                                cursor: 'pointer', transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <cat.icon size={12} />
                                                            <span style={{ fontSize: '11px', fontWeight: '700' }}>{cat.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* TEMPLATES */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>SMART TEMPLATES</label>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {TEMPLATES.map(tmp => (
                                                        <button
                                                            key={tmp.name}
                                                            onClick={() => applyTemplate(tmp)}
                                                            style={{
                                                                padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                                                                color: 'white', fontSize: '12px', fontWeight: '700', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px'
                                                            }}
                                                        >
                                                            <FileText size={14} color={activeNote.color} />
                                                            {tmp.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>WARNA TEMA</label>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                    {NOTE_COLORS.map(color => (
                                                        <motion.div
                                                            key={color}
                                                            whileHover={{ scale: 1.2 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => handleUpdateNote('color', color)}
                                                            style={{
                                                                width: '24px', height: '24px', borderRadius: '50%',
                                                                background: color, cursor: 'pointer',
                                                                border: activeNote?.color === color ? '3px solid white' : '2px solid transparent',
                                                                boxShadow: activeNote?.color === color ? `0 0 10px ${color}` : 'none',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <motion.button
                                            whileHover={{ background: 'rgba(239, 68, 68, 0.1)', scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => deleteNote(activeNote?.id)}
                                            style={{
                                                padding: '14px', borderRadius: '16px',
                                                background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444',
                                                border: '1px solid rgba(239, 68, 68, 0.1)', fontWeight: '800',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                            }}>
                                            <Trash2 size={18} /> Hapus Catatan
                                        </motion.button>
                                    </div>
                                </div>

                                {/* Main Editor Area */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'transparent' }}>
                                    {/* Toolbar / Top Bar */}
                                    <div style={{
                                        padding: isMobile ? '16px 20px' : '24px 32px',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        background: 'rgba(15, 23, 42, 0.3)',
                                        paddingTop: isMobile ? 'env(safe-area-inset-top, 16px)' : '24px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                                                    <CheckCircle2 size={12} color="#10b981" />
                                                </motion.div>
                                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#10b981', textTransform: 'uppercase' }}>{saveStatus}</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => {
                                                    syncToCloud(activeNote);
                                                    setSaveStatus('Tersimpan Manual');
                                                    setTimeout(() => closeModal(), 500);
                                                }}
                                                style={{
                                                    padding: '10px 24px', borderRadius: '12px',
                                                    background: activeNote?.color || 'var(--primary)',
                                                    color: 'white', border: 'none', fontWeight: 'bold', fontSize: '13px',
                                                    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                                    boxShadow: `0 4px 15px ${activeNote?.color || '#3b82f6'}40`
                                                }}
                                            >
                                                <Save size={16} /> Simpan
                                            </motion.button>

                                            <motion.button
                                                whileHover={{ rotate: 90, background: 'rgba(255,255,255,0.1)' }}
                                                onClick={closeModal}
                                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}>
                                                <X size={20} />
                                            </motion.button>
                                        </div>
                                    </div>

                                    {/* Flexible Canvas */}
                                    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '0px 60px' }} className="editor-scrollbar">
                                        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {/* Title Area - Auto Resizing Textarea */}
                                            <textarea
                                                ref={titleRef}
                                                rows="1"
                                                value={activeNote?.title || ''}
                                                onChange={e => {
                                                    handleUpdateNote('title', e.target.value);
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                }}
                                                placeholder="Judul Catatan..."
                                                style={{
                                                    background: 'transparent', border: 'none',
                                                    fontSize: isMobile ? '28px' : 'clamp(32px, 5vw, 42px)',
                                                    fontWeight: '900',
                                                    color: activeNote?.color || 'white',
                                                    textShadow: `0 0 30px ${activeNote?.color}40`,
                                                    outline: 'none', width: '100%', resize: 'none',
                                                    lineHeight: '1.3', letterSpacing: '-1px',
                                                    overflow: 'hidden', wordBreak: 'break-word',
                                                    transition: 'color 0.3s ease'
                                                }}
                                            />

                                            {/* Content Area - Seamless Integration */}
                                            <div style={{
                                                position: 'relative',
                                                width: '100%',
                                                padding: '0'
                                            }}>
                                                {/* Productivity Toolbar */}
                                                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <button onClick={() => handleUpdateNote('content', activeNote.content + '\n• ')} style={{ padding: '6px 12px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Layers size={14} /> <span style={{ fontSize: '12px', fontWeight: '700' }}>List</span>
                                                    </button>
                                                    <button onClick={() => handleUpdateNote('content', activeNote.content + '\n[ ] ')} style={{ padding: '6px 12px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <CheckSquare size={14} /> <span style={{ fontSize: '12px', fontWeight: '700' }}>To-do</span>
                                                    </button>
                                                    <button onClick={() => handleUpdateNote('content', activeNote.content + `\n--- ${new Date().toLocaleTimeString()} ---\n`)} style={{ padding: '6px 12px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Clock size={14} /> <span style={{ fontSize: '12px', fontWeight: '700' }}>Time</span>
                                                    </button>
                                                </div>

                                                <textarea
                                                    value={activeNote?.content || ''}
                                                    onChange={e => handleUpdateNote('content', e.target.value)}
                                                    placeholder="Mulailah mengetik ide brilianmu di sini..."
                                                    style={{
                                                        width: '100%',
                                                        minHeight: isMobile ? '400px' : '500px',
                                                        background: 'transparent', border: 'none',
                                                        fontSize: isMobile ? '16px' : '18px',
                                                        color: 'rgba(255,255,255,0.85)',
                                                        outline: 'none', resize: 'none', lineHeight: '1.6',
                                                        paddingBottom: '100px',
                                                        fontFamily: themeFont
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile Bottom Action Bar */}
                                    <div className="note-mobile-footer" style={{
                                        padding: '16px 20px',
                                        borderTop: '1px solid rgba(255,255,255,0.08)',
                                        background: '#0b1224',
                                        zIndex: 10
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800' }}>KARAKTER</span>
                                                <span style={{ fontSize: '14px', fontWeight: '900', color: 'white' }}>{getNoteStats(activeNote?.content).chars}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', flex: 1, justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => {
                                                        syncToCloud(activeNote);
                                                        setSaveStatus('Tersimpan Manual');
                                                        setTimeout(() => closeModal(), 500);
                                                    }}
                                                    style={{
                                                        padding: '12px 20px',
                                                        background: activeNote?.color || 'var(--primary)',
                                                        border: 'none',
                                                        borderRadius: '14px',
                                                        color: 'white',
                                                        fontWeight: '800',
                                                        fontSize: '13px',
                                                        flex: 1,
                                                        maxWidth: '120px',
                                                        boxShadow: `0 4px 15px ${(activeNote?.color || '#3b82f6')}40`
                                                    }}
                                                >
                                                    Simpan
                                                </button>
                                                <button
                                                    onClick={() => deleteNote(activeNote?.id)}
                                                    style={{
                                                        padding: '12px 16px',
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                                        borderRadius: '14px',
                                                        color: '#ef4444',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <style>{`
                                .note-sidebar { display: flex !important; }
                                .note-mobile-footer { display: none !important; }
                                
                                @media (max-width: 900px) {
                                    .note-sidebar { display: none !important; }
                                    .note-mobile-footer { display: block !important; }
                                    .editor-scrollbar { padding: 30px 20px !important; }
                                }

                                .editor-scrollbar::-webkit-scrollbar {
                                    width: 6px;
                                }
                                .editor-scrollbar::-webkit-scrollbar-track {
                                    background: transparent;
                                }
                                .editor-scrollbar::-webkit-scrollbar-thumb {
                                    background: rgba(255,255,255,0.1);
                                    border-radius: 10px;
                                }
                            `}</style>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.5); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 1; }
                }

                @media (max-width: 768px) {
                    .notes-header {
                        padding: 16px 20px !important;
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    .notes-header-actions {
                        width: 100%;
                        flex-direction: row;
                    }
                    .notes-header-actions input {
                        min-width: 0 !important;
                    }
                    .notes-grid {
                        grid-template-columns: 1fr !important;
                        padding: 0 !important;
                    }
                    .hide-mobile {
                        display: none;
                    }
                }
            `}</style>

            {/* Smart Scroll Control System */}
            {/* 1. Custom Scrollbar Styling - MOVED OUTSIDE AnimatePresence for stability */}
            <style>{`
                /* PC Scrollbar */
                ::-webkit-scrollbar {
                    width: 10px;
                }
                ::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, 0.6);
                    border-left: 1px solid rgba(255,255,255,0.05);
                }
                ::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, rgba(${themeColor}, 0.5), rgba(${themeColor}, 0.8));
                    border-radius: 5px;
                    border: 2px solid rgba(15, 23, 42, 1);
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: rgb(${themeColor});
                }
            `}</style>

            <AnimatePresence>
                {/* 2. Floating Action Pill */}
                {showScrollTop && (
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        style={{
                            position: 'fixed',
                            bottom: '30px',
                            right: '30px',
                            zIndex: 90,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            alignItems: 'center'
                        }}
                    >
                        {/* Progress Ring / Top Indicator */}
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            style={{
                                width: '48px', height: '48px', borderRadius: '16px',
                                background: 'rgba(15, 23, 42, 0.8)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: `rgb(${themeColor})`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
                            }}
                        >
                            <ArrowUp size={20} strokeWidth={3} />
                        </motion.button>

                        {/* Mid Decoration - Scroll Mouse */}
                        <div style={{
                            width: '32px', height: '54px', borderRadius: '20px',
                            background: `linear-gradient(180deg, rgba(${themeColor}, 0.2) 0%, rgba(${themeColor}, 0) 100%)`,
                            border: `1px solid rgba(${themeColor}, 0.3)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '4px 0'
                        }}>
                            <motion.div
                                animate={{ y: [0, 8, 0] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                style={{ width: '4px', height: '8px', borderRadius: '4px', background: `rgb(${themeColor})` }}
                            />
                        </div>

                        {/* Bottom Action */}
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                            style={{
                                width: '48px', height: '48px', borderRadius: '16px',
                                background: 'rgba(15, 23, 42, 0.8)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
                            }}
                        >
                            <ArrowDown size={20} strokeWidth={3} />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default CatatanKerja;

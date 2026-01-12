import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
    Plus, Trash2, Save, Search, Clock, NotebookPen, X,
    Edit3, Info, Calendar, Hash, Type, Clipboard,
    ChevronRight, Sparkles, CheckCircle2, AlertCircle, Palette
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

const CatatanKerja = () => {
    const { user } = useAuth();
    const [notes, setNotes] = useState([]);
    const [activeNote, setActiveNote] = useState(null);
    const [search, setSearch] = useState('');
    const [saveStatus, setSaveStatus] = useState('Standby');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
    const [isInitialLoaded, setIsInitialLoaded] = useState(false);

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

                if (cloudData && Array.isArray(cloudData)) {
                    // Filter out any potential nulls and ensure color exists
                    const validData = cloudData.filter(n => n && typeof n === 'object').map(n => ({
                        ...n,
                        color: typeof n.color === 'string' ? n.color : '#3b82f6'
                    }));
                    setNotes(validData);
                    setSaveStatus('Awan Terhubung');
                }
            } catch (err) {
                console.error("Cloud Sync Error:", err);
                setSaveStatus('Mode Offline');
            }
        };

        syncWithCloud();

        // Realtime
        const channel = supabase
            .channel(`notes_rt_${user.username}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${user.username}` },
                (payload) => {
                    const updatedNote = payload.new;
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        setNotes(prev => {
                            const exists = prev.find(n => n.id === updatedNote.id);
                            if (exists) return prev.map(n => n.id === updatedNote.id ? updatedNote : n);
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
            lastUpdated: note.lastUpdated || note.last_updated || new Date().toLocaleString('id-ID')
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
            last_updated: new Date().toISOString()
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
            lastUpdated: new Date().toLocaleString('id-ID')
        };
        setNotes(prev => [newNote, ...(Array.isArray(prev) ? prev : [])]);
        setActiveNote(newNote);
        setIsModalOpen(true);
        syncToCloud(newNote);
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

    const filteredNotes = Array.isArray(notes) ? notes.filter(n => {
        if (!n || typeof n !== 'object') return false;
        const searchSafe = (search || '').toLowerCase();
        const titleSafe = String(n.title || '').toLowerCase();
        const contentSafe = String(n.content || '').toLowerCase();
        return titleSafe.includes(searchSafe) || contentSafe.includes(searchSafe);
    }) : [];

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
            {/* Header Section */}
            <div className="glass-effect notes-header" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', borderRadius: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <motion.div
                        whileHover={{ rotate: 15, scale: 1.1 }}
                        style={{
                            width: '56px', height: '56px', borderRadius: '16px',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)',
                            flexShrink: 0
                        }}>
                        <NotebookPen size={28} color="white" />
                    </motion.div>
                    <div>
                        <h1 style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: '800', color: 'white', margin: 0, letterSpacing: '-0.5px' }}>Catatan Kerja</h1>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Sparkles size={14} color="var(--primary)" /> {Array.isArray(notes) ? notes.length : 0} Ide & Tugas
                        </p>
                    </div>
                </div>

                <div className="notes-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px', width: isMobile ? '100%' : 'auto' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Cari..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                width: '100%',
                                minWidth: isMobile ? '0' : '250px',
                                padding: '12px 16px 12px 48px',
                                fontSize: '14px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '14px',
                                color: 'white',
                                transition: 'all 0.3s ease',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={addNewNote}
                        style={{
                            padding: '12px 20px',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            color: 'white',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}>
                        <Plus size={20} /> <span className="hide-mobile">Baru</span>
                    </motion.button>
                </div>
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
                        <motion.div
                            key={note.id || index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ y: -8, scale: 1.02 }}
                            onClick={() => openNoteModal(note)}
                            style={{
                                background: 'rgba(15, 23, 42, 0.8)',
                                backdropFilter: 'blur(16px)',
                                borderRadius: '28px',
                                padding: '32px',
                                cursor: 'pointer',
                                border: '1px solid rgba(255,255,255,0.05)',
                                height: 'auto', // Now dynamic based on content
                                minHeight: '180px',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative',
                                overflow: 'hidden',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                            }}
                        >
                            {/* Visual Accent */}
                            <div style={{
                                position: 'absolute', top: 0, left: 0, width: '100%', height: '6px',
                                background: note.color || getCardGradient(index)
                            }} />

                            <h4 style={{
                                fontSize: '19px', fontWeight: '900', color: note.color || 'white', marginBottom: '16px',
                                lineHeight: '1.4', wordBreak: 'break-word', letterSpacing: '-0.3px',
                                textShadow: `0 0 20px ${note.color}40`
                            }}>
                                {note.title || 'Tanpa Judul'}
                            </h4>

                            <p style={{
                                fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.7',
                                wordBreak: 'break-word', marginBottom: '24px',
                                whiteSpace: 'pre-wrap' // Preserve line breaks for clean look
                            }}>
                                {note.content ? (note.content.length > 250 ? note.content.substring(0, 250) + '...' : note.content) : 'Kosong...'}
                            </p>

                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: '700' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Calendar size={14} />
                                    </div>
                                    <span>{note.date}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <motion.button
                                        whileHover={{ scale: 1.1, background: 'rgba(239, 68, 68, 0.2)' }}
                                        onClick={(e) => deleteNote(note.id, e)}
                                        style={{
                                            width: '38px', height: '38px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                            border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center'
                                        }}>
                                        <Trash2 size={16} />
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* PRO Modal Editor - Ultra Premium Re-Design */}
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
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>TERAKHIR DIUBAH</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: '600' }}>
                                                <Clock size={14} style={{ color: activeNote?.color || 'var(--primary)' }} /> {activeNote?.lastUpdated || activeNote?.last_updated || new Date().toLocaleString('id-ID')}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>STATISTIK</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>KARAKTER</p>
                                                    <p style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>{getNoteStats(activeNote?.content).chars}</p>
                                                </div>
                                                <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>KATA</p>
                                                    <p style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>{getNoteStats(activeNote?.content).words}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* COLOR PICKER */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>WARNA TEMA</label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                {NOTE_COLORS.map(color => (
                                                    <motion.div
                                                        key={color}
                                                        whileHover={{ scale: 1.2 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handleUpdateNote('color', color)}
                                                        style={{
                                                            width: '32px', height: '32px', borderRadius: '50%',
                                                            background: color, cursor: 'pointer',
                                                            border: activeNote?.color === color ? '3px solid white' : '2px solid transparent',
                                                            boxShadow: activeNote?.color === color ? `0 0 15px ${color}` : 'none',
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
                                                    paddingBottom: '100px' // Ruang ekstra di bawah agar nyaman mengetik
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
            </AnimatePresence>

            <style>{`
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
        </div>
    );
};

export default CatatanKerja;

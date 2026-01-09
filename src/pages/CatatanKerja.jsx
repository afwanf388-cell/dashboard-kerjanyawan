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
    // Key localStorage yang unik per user
    const [notes, setNotes] = useState([]);
    const [isInitialLoaded, setIsInitialLoaded] = useState(false);

    // Initial Load based on USER
    useEffect(() => {
        if (user?.username) {
            // Reset state untuk menghindari data bocor dari user sebelumnya
            setNotes([]);
            setIsInitialLoaded(false);

            const saved = localStorage.getItem(`app_catatan_kerja_${user.username}`);
            if (saved) {
                try {
                    setNotes(JSON.parse(saved));
                } catch (e) {
                    setNotes([]);
                }
            } else {
                setNotes([]);
            }
            setIsInitialLoaded(true);
        } else {
            setNotes([]);
            setIsInitialLoaded(false);
        }
    }, [user?.username]);

    const [activeNote, setActiveNote] = useState(null);
    const [search, setSearch] = useState('');
    const [saveStatus, setSaveStatus] = useState('Terurai Otomatis');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const timerRef = useRef(null);
    const titleRef = useRef(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Auto-resize title when modal opens or note changes
    useEffect(() => {
        if (isModalOpen && titleRef.current) {
            titleRef.current.style.height = 'auto';
            titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
        }
    }, [isModalOpen, activeNote?.id]);

    // Initial Load from Cloud (if available) - Improved Logic
    useEffect(() => {
        if (supabase && user?.username) {
            setSaveStatus('Sinkronisasi Awan...');
            supabase.from('notes')
                .select('*')
                .eq('user_id', user.username)
                .order('id', { ascending: true })
                .then(({ data, error }) => {
                    if (error) {
                        console.error("Cloud fetch error:", error);
                        setSaveStatus('Mode Offline');
                        return;
                    }

                    if (data && data.length > 0) {
                        // Cloud has data, use as source of truth but preserve local-only fields like 'color'
                        setNotes(prevNotes => {
                            const localColorMap = new Map(prevNotes.map(n => [n.id, n.color]));
                            return data.map(cloudNote => ({
                                ...cloudNote,
                                color: localColorMap.get(cloudNote.id) || cloudNote.color || NOTE_COLORS[0]
                            }));
                        });
                        setSaveStatus('Awan Terhubung');
                    } else if (notes.length > 0) {
                        // Cloud is empty but local has data -> Sync Local to Cloud
                        setSaveStatus('Mencadangkan ke Awan...');
                        const syncPromises = notes.map(note => syncToCloud(note));
                        Promise.all(syncPromises).then(() => {
                            setSaveStatus('Awan Terhubung');
                        });
                    } else {
                        setSaveStatus('Awan Kosong');
                    }
                });
        }
    }, [user?.username]);

    // Local Backup & Cloud Sync
    useEffect(() => {
        if (!user?.username || !isInitialLoaded) return;
        localStorage.setItem(`app_catatan_kerja_${user.username}`, JSON.stringify(notes));
    }, [notes, user?.username, isInitialLoaded]);

    const syncToCloud = async (note) => {
        if (!supabase || !user) return;

        setSaveStatus('Menyimpan ke Awan...');
        const { error } = await supabase.from('notes').upsert({
            id: note.id,
            user_id: user.username, // Wajib menggunakan username, tidak ada guest
            title: note.title,
            content: note.content,
            date: note.date,
            status: note.status || 'Draft',
            importance: note.importance || 'Normal',
            last_updated: new Date().toISOString() // Use standard ISO for DB
        });

        if (!error) setSaveStatus('Tersimpan di Awan');
        else setSaveStatus('Gagal Sync Antar Perangkat');
    };

    const handleUpdateNote = (field, value) => {
        if (!activeNote) return;

        // Optimistic UI Update
        const updatedNote = { ...activeNote, [field]: value, lastUpdated: new Date().toLocaleString('id-ID') };
        setActiveNote(updatedNote);

        setNotes(prevNotes =>
            prevNotes.map(n => n.id === updatedNote.id ? updatedNote : n)
        );

        // Debounce Sync
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            syncToCloud(updatedNote);
        }, 1000);
    };

    const addNewNote = async () => {
        const newNote = {
            id: Date.now(),
            title: '',
            content: '',
            date: new Date().toLocaleDateString('id-ID'),
            status: 'Draft',
            importance: 'Normal',
            color: NOTE_COLORS[0],
            lastUpdated: new Date().toLocaleString('id-ID')
        };

        setNotes(prev => [...prev, newNote]);
        setActiveNote(newNote);
        setIsModalOpen(true);
        syncToCloud(newNote); // Sync creation immediately
    };

    const deleteNote = async (id, e) => {
        if (e) e.stopPropagation();
        if (window.confirm('Hapus catatan ini secara permanen?')) {
            setNotes(prevNotes => prevNotes.filter(n => n.id !== id));

            if (activeNote && activeNote.id === id) {
                setActiveNote(null);
                setIsModalOpen(false);
            }

            if (supabase) {
                await supabase.from('notes').delete().eq('id', id);
            }
        }
    };

    const openNoteModal = (note) => {
        setActiveNote(note);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setActiveNote(null);
    };

    const filteredNotes = notes.filter(n =>
        (n.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (n.content || '').toLowerCase().includes(search.toLowerCase())
    );

    const getNoteStats = (content) => {
        const words = content ? content.trim().split(/\s+/).length : 0;
        const chars = content ? content.length : 0;
        return { words, chars };
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
                            <Sparkles size={14} color="var(--primary)" /> {notes.length} Ide & Tugas
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
                            key={note.id}
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
                {isModalOpen && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            style={{
                                width: '100%', maxWidth: '1100px', height: '90vh',
                                background: '#0b1120', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '32px', overflow: 'hidden', display: 'flex',
                                boxShadow: '0 30px 60px rgba(0,0,0,0.6)'
                            }}
                        >
                            {/* Editor Sidebar (Meta Data) */}
                            <div className="note-sidebar" style={{
                                width: '300px', borderRight: '1px solid rgba(255,255,255,0.05)',
                                background: 'rgba(255,255,255,0.02)', padding: '40px 24px',
                                display: 'flex', flexDirection: 'column', gap: '32px'
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <NotebookPen size={20} />
                                        </div>
                                        <h5 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: 'white', letterSpacing: '-0.5px' }}>Detail Catatan</h5>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>TERAKHIR DIUBAH</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: '600' }}>
                                                <Clock size={14} className="text-primary" /> {activeNote?.lastUpdated || '-'}
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
                                    padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'rgba(15, 23, 42, 0.3)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ padding: '8px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                                                <CheckCircle2 size={14} color="#10b981" />
                                            </motion.div>
                                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{saveStatus}</span>
                                        </div>
                                    </div>
                                    <motion.button
                                        whileHover={{ rotate: 90, background: 'rgba(255,255,255,0.1)' }}
                                        onClick={closeModal}
                                        style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}>
                                        <X size={20} />
                                    </motion.button>
                                </div>

                                {/* Flexible Canvas */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '40px 60px' }} className="editor-scrollbar">
                                    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                        {/* Title Area - Auto Resizing Textarea */}
                                        <textarea
                                            ref={titleRef}
                                            rows="1"
                                            value={activeNote?.title}
                                            onChange={e => {
                                                handleUpdateNote('title', e.target.value);
                                                e.target.style.height = 'auto';
                                                e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            placeholder="Judul Catatan..."
                                            style={{
                                                background: 'transparent', border: 'none',
                                                fontSize: 'clamp(32px, 5vw, 42px)', fontWeight: '900',
                                                color: activeNote?.color || 'white',
                                                textShadow: `0 0 30px ${activeNote?.color}40`,
                                                outline: 'none', width: '100%', resize: 'none',
                                                lineHeight: '1.4', letterSpacing: '-1.5px',
                                                overflow: 'hidden', wordBreak: 'break-word',
                                                transition: 'color 0.3s ease'
                                            }}
                                        />

                                        {/* Content Area */}
                                        <div style={{
                                            position: 'relative',
                                            background: 'rgba(255,255,255,0.02)',
                                            borderRadius: '24px',
                                            padding: '32px',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            minHeight: '400px',
                                            boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.2)'
                                        }}>
                                            <textarea
                                                value={activeNote?.content}
                                                onChange={e => handleUpdateNote('content', e.target.value)}
                                                placeholder="Mulailah mengetik ide brilianmu di sini..."
                                                style={{
                                                    width: '100%', height: '100%', minHeight: '350px',
                                                    background: 'transparent', border: 'none',
                                                    fontSize: '17px', color: 'rgba(255,255,255,0.8)',
                                                    outline: 'none', resize: 'none', lineHeight: '1.8'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile Bottom Action Bar */}
                                <div className="note-mobile-footer" style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.8)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', flexDir: 'column' }}>
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>KARAKTER</span>
                                            <span style={{ fontSize: '14px', fontWeight: '800' }}>{getNoteStats(activeNote?.content).chars}</span>
                                        </div>
                                        <button
                                            onClick={() => deleteNote(activeNote?.id)}
                                            style={{ padding: '10px 20px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '12px', color: '#ef4444', fontWeight: '800', fontSize: '13px' }}
                                        >
                                            Hapus
                                        </button>
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
                    </div>
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

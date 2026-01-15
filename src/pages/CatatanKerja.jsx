import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import {
    Plus, Trash2, Save, Search, Clock, NotebookPen, X,
    Edit3, Info, Calendar, Hash, Type, Clipboard,
    ChevronRight, Sparkles, CheckCircle2, AlertCircle, Palette,
    Pin, PinOff, Tag, Layers, Zap, Copy, FileText, CheckSquare,
    Link2, ImageIcon, ExternalLink, Paperclip, ScanLine, ArrowUp, ArrowDown, Mouse, Database
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

const NoteCard = React.memo(({ note, index, themeColor, themeFont, openNoteModal, togglePin, deleteNote }) => {
    // Advanced Optimization: Use hardware acceleration and skip off-screen rendering
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                delay: Math.min(index * 0.03, 0.3),
                type: 'spring',
                stiffness: 260,
                damping: 20
            }}
            whileHover={{ y: -8, scale: 1.01 }}
            onClick={() => openNoteModal(note)}
            style={{
                background: 'rgba(15, 23, 42, 0.85)',
                // Hardware acceleration
                transform: 'translateZ(0)',
                willChange: 'transform, opacity',
                borderRadius: '32px',
                padding: '28px',
                cursor: 'pointer',
                border: `1px solid ${note.isPinned ? `${note.color}60` : 'rgba(255,255,255,0.08)'}`,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '380px',
                transition: 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease',
                boxShadow: note.isPinned
                    ? `0 15px 30px -5px ${note.color}20`
                    : '0 8px 20px -10px rgba(0,0,0,0.5)',
            }}
        >
            {/* Decorative Accent */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '6px',
                background: note.color || '#3b82f6',
                borderRadius: '32px 32px 0 0',
                opacity: 0.9
            }} />

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
                </div>

                <h4 style={{
                    fontSize: '18px', fontWeight: '900', color: note.color || 'white',
                    margin: 0, lineHeight: '1.4',
                    fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.3px',
                    wordBreak: 'break-word'
                }}>
                    {note.title || 'Catatan Baru'}
                </h4>
            </div>

            {/* Content Body - Full Scrolling Enabled */}
            <div
                className="custom-card-scroll"
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingRight: '12px',
                    margin: '10px 0',
                    cursor: 'text',
                    position: 'relative',
                    zIndex: 2
                }}
            >
                <p style={{
                    fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6',
                    margin: 0, whiteSpace: 'pre-wrap',
                    fontFamily: themeFont
                }}>
                    {note.content || 'Mulailah menulis isi catatanmu...'}
                </p>
            </div>

            {/* Footer */}
            <div style={{
                marginTop: '16px', paddingTop: '16px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: `rgba(${themeColor}, 0.1)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: `rgb(${themeColor})`
                    }}>
                        <Calendar size={12} />
                    </div>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>{note.date}</span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); togglePin(note.id, e); }}
                        style={{
                            width: '36px', height: '36px', borderRadius: '12px',
                            background: note.isPinned ? `${note.color}15` : 'rgba(255,255,255,0.03)',
                            color: note.isPinned ? note.color : 'rgba(255,255,255,0.3)',
                            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                        <Pin size={14} fill={note.isPinned ? note.color : 'transparent'} />
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.1, background: 'rgba(239, 68, 68, 0.15)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id, e); }}
                        style={{
                            width: '36px', height: '36px', borderRadius: '12px',
                            background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444',
                            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                        <Trash2 size={14} />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}, (prev, next) => {
    // Advanced memo check to prevent re-renders when irrelevant props change
    return prev.note.id === next.note.id &&
        prev.note.title === next.note.title &&
        prev.note.content === next.note.content &&
        prev.note.isPinned === next.note.isPinned &&
        prev.note.color === next.note.color &&
        prev.note.category === next.note.category &&
        prev.themeColor === next.themeColor &&
        prev.themeFont === next.themeFont;
});

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

    // Virtualization State
    const [visibleCount, setVisibleCount] = useState(24);
    const [isSyncing, setIsSyncing] = useState(false);

    // Debounced Search
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Scroll Detector - Only for Scroll to Top Button
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- Dynamic Theme Sync ---
    useEffect(() => {
        if (user?.username) {
            const updateTheme = () => {
                try {
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
                } catch (e) {
                    console.error("Theme sync error:", e);
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

    // --- FILE REPOSITORY LOGIC ---
    const [viewMode, setViewMode] = useState('NOTES'); // 'NOTES' | 'REPOSITORY'
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

    // --- PREMIUM DELETE MODAL ---
    const [deleteModal, setDeleteModal] = useState(null); // { id, title, type: 'file' | 'note' }
    const [isDeleting, setIsDeleting] = useState(false);

    // File Handlers
    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        await processFiles(files);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files || []);
        if (files.length === 0) return;
        await processFiles(files);
    };

    const processFiles = async (files) => {
        setSaveStatus('Mengupload...');
        const newFileNodes = [];

        for (const file of files) {
            // Limit size to 5MB to prevent DB issues
            if (file.size > 5 * 1024 * 1024) {
                alert(`File ${file.name} terlalu besar (>5MB).`);
                continue;
            }

            try {
                const base64 = await toBase64(file);
                const newFileNode = {
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    user_id: user.username,
                    title: file.name, // Use title for filename
                    content: base64, // Store data in content
                    category: 'REPOSITORY_FILE',
                    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
                    color: '#3b82f6', // Default color, rarely used
                    priority: 'Low',
                    isPinned: false
                };
                newFileNodes.push(newFileNode);

                // Sync to Supabase immediately for each file (safer)
                if (supabase) {
                    const { error } = await supabase.from('notes').upsert({
                        id: newFileNode.id,
                        user_id: user.username,
                        title: newFileNode.title,
                        content: newFileNode.content,
                        category: newFileNode.category,
                        date: newFileNode.date,
                        color: newFileNode.color,
                        is_pinned: newFileNode.isPinned,
                        priority: newFileNode.priority,
                        last_updated: new Date().toISOString()
                    });
                    if (error) console.error("Upload failed", error);
                }
            } catch (err) {
                console.error("File processing error", err);
            }
        }

        setNotes(prev => [...newFileNodes, ...(Array.isArray(prev) ? prev : [])]);
        setSaveStatus('Cloud Connected');
    };

    const toBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    const downloadFile = (note) => {
        try {
            if (!note.content) {
                alert("Konten file tidak ditemukan!");
                return;
            }

            // check if content is a data URL
            if (note.content.startsWith('data:')) {
                const parts = note.content.split(',');
                const mime = parts[0].match(/:(.*?);/)[1];
                const bstr = atob(parts[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                const blob = new Blob([u8arr], { type: mime });
                const url = URL.createObjectURL(blob);

                const link = document.createElement("a");
                link.href = url;
                link.download = note.title;
                document.body.appendChild(link);
                link.click();

                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 100);
            } else {
                // Fallback for raw base64 or other formats
                const link = document.createElement("a");
                link.href = note.content;
                link.download = note.title;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error("Download failed:", error);
            alert("Gagal mengunduh file. Data mungkin korup atau terlalu besar.");
        }
    };

    const getFileIcon = (filename) => {
        if (!filename) return <FileText size={24} color="#94a3b8" />;
        const ext = filename.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <ImageIcon size={24} color="#ec4899" />;
        if (['pdf'].includes(ext)) return <FileText size={24} color="#ef4444" />;
        if (['doc', 'docx'].includes(ext)) return <FileText size={24} color="#3b82f6" />;
        if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileText size={24} color="#10b981" />;
        if (['zip', 'rar', '7z', 'pk'].includes(ext)) return <Layers size={24} color="#f59e0b" />;
        return <FileText size={24} color="#94a3b8" />;
    };

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
        try {
            localStorage.setItem(`app_catatan_kerja_${user.username}`, JSON.stringify(notes));
        } catch (e) {
            console.error("Quota exceeded or localStorage error:", e);
            if (e.name === 'QuotaExceededError') {
                setSaveStatus('Memory Penuh!');
            }
        }
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

    const deleteNote = (id, e, type = 'note') => {
        if (e) e.stopPropagation();
        const target = notes.find(n => n.id === id);
        if (!target) return;

        setDeleteModal({
            id: target.id,
            title: target.title || (type === 'note' ? 'Catatan Tanpa Judul' : 'File Tanpa Nama'),
            type: type
        });
    };

    const confirmDeleteAction = async () => {
        if (!deleteModal) return;
        setIsDeleting(true);

        try {
            // Actual deletion logic
            setNotes(prev => prev.filter(n => n.id !== deleteModal.id));
            if (activeNote?.id === deleteModal.id) closeModal();

            if (supabase) {
                await supabase.from('notes').delete().eq('id', deleteModal.id);
            }

            setSaveStatus('Terhapus!');
            setTimeout(() => setSaveStatus('Awan Terhubung'), 2000);
        } catch (error) {
            console.error("Delete error:", error);
            setSaveStatus('Gagal Hapus');
        } finally {
            setIsDeleting(false);
            setDeleteModal(null);
        }
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
        if (!Array.isArray(notes)) return [];
        const searchSafe = (debouncedSearch || '').toLowerCase();

        // 1. Efficient Filtering
        const results = notes.filter(n => {
            if (!n) return false;
            const isFile = n.category === 'REPOSITORY_FILE';

            if (viewMode === 'NOTES') {
                if (isFile) return false;
                const matchesCategory = activeTab === 'All' || n.category === activeTab;
                if (!matchesCategory) return false;

                if (!searchSafe) return true;
                const titleSafe = String(n.title || '').toLowerCase();
                const contentSafe = String(n.content || '').toLowerCase();
                return titleSafe.includes(searchSafe) || contentSafe.includes(searchSafe);
            } else {
                if (!isFile) return false;
                if (!searchSafe) return true;
                return String(n.title || '').toLowerCase().includes(searchSafe);
            }
        });

        // 2. Efficient Sorting (Oldest First)
        return results.sort((a, b) => {
            // Priority 1: Pinned Notes
            const pinA = a.is_pinned || a.isPinned;
            const pinB = b.is_pinned || b.isPinned;
            if (pinA !== pinB) return pinA ? -1 : 1;

            // Priority 2: Precise Timestamp Sorting (Oldest First)
            const timeA = new Date(a.last_updated || a.lastUpdated || a.id).getTime();
            const timeB = new Date(b.last_updated || b.lastUpdated || b.id).getTime();
            return (timeA || 0) - (timeB || 0);
        });
    }, [notes, debouncedSearch, activeTab, viewMode]);

    // 3. Virtualization: Only take visible items
    const visibleNotes = React.useMemo(() => {
        return filteredNotes.slice(0, visibleCount);
    }, [filteredNotes, visibleCount]);

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
                            defaultValue={search}
                            onChange={e => {
                                // Optimized: Don't set main search state on every keystroke
                                // Let the debounced effect handle it from a local ref or simpler way
                                if (timerRef.current) clearTimeout(timerRef.current);
                                timerRef.current = setTimeout(() => {
                                    setSearch(e.target.value);
                                }, 300);
                            }}
                            style={{
                                width: '100%',
                                minWidth: isMobile ? '0' : '300px',
                                padding: '16px 20px 16px 52px',
                                fontSize: '15px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '18px',
                                color: 'white',
                                transition: 'all 0.3s ease',
                                outline: 'none',
                                fontWeight: '600',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                            }}
                            onFocus={(e) => {
                                e.target.style.background = 'rgba(255,255,255,0.05)';
                                e.target.style.borderColor = `rgba(${themeColor}, 0.4)`;
                            }}
                            onBlur={(e) => {
                                e.target.style.background = 'rgba(255,255,255,0.03)';
                                e.target.style.borderColor = 'rgba(255,255,255,0.08)';
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
                            display: viewMode === 'NOTES' ? 'flex' : 'none',
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

                    {/* VIEW MODE SWITCHER */}
                    <div style={{
                        display: 'flex',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '4px',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <button
                            onClick={() => setViewMode('NOTES')}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '12px',
                                background: viewMode === 'NOTES' ? `rgb(${themeColor})` : 'transparent',
                                color: viewMode === 'NOTES' ? 'white' : 'rgba(255,255,255,0.5)',
                                border: 'none',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                transition: 'all 0.3s',
                                fontSize: '12px'
                            }}
                        >
                            <NotebookPen size={14} /> {isMobile ? '' : 'Catatan'}
                        </button>
                        <button
                            onClick={() => setViewMode('REPOSITORY')}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '12px',
                                background: viewMode === 'REPOSITORY' ? `rgb(${themeColor})` : 'transparent',
                                color: viewMode === 'REPOSITORY' ? 'white' : 'rgba(255,255,255,0.5)',
                                border: 'none',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                transition: 'all 0.3s',
                                fontSize: '12px'
                            }}
                        >
                            <Layers size={14} /> {isMobile ? '' : 'Arsip'}
                        </button>
                    </div>
                </div>
            </div>

            {/* === NOTES VIEW === */}
            {viewMode === 'NOTES' && (
                <>
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
                                        {tab === 'All' ? (Array.isArray(notes) ? notes.filter(n => n.category !== 'REPOSITORY_FILE').length : 0) : (Array.isArray(notes) ? notes.filter(n => n.category === tab).length : 0)}
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
                                    <NotebookPen size={80} style={{ opacity: 0.2, color: `rgb(${themeColor})` }} />
                                </div>
                                <h3 style={{ fontSize: '24px', color: 'white', fontWeight: '700', marginBottom: '8px' }}>Mulai Menulis Hari Ini</h3>
                                <p style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '300px' }}>Klik tombol di atas untuk membuat catatan kerja pertamamu.</p>
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

                    {/* Infinite Scroll Removed - Loading all at once for stability */}


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
                </>
            )}

            {/* === REPOSITORY VIEW - SUPER SOPHISTICATED === */}
            {viewMode === 'REPOSITORY' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

                    {/* PREMIUM STATS HEADER */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                        gap: '20px',
                        marginBottom: '32px'
                    }}>
                        {/* Total Files */}
                        <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            style={{
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
                                borderRadius: '24px',
                                padding: '24px',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '100px', height: '100px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', filter: 'blur(40px)' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '18px',
                                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
                                }}>
                                    <Layers size={28} color="white" />
                                </div>
                                <div>
                                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Total Arsip</p>
                                    <p style={{ fontSize: '32px', fontWeight: '900', color: 'white', lineHeight: 1 }}>{filteredNotes.length}</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Storage Used */}
                        <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            style={{
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(34, 211, 238, 0.1) 100%)',
                                borderRadius: '24px',
                                padding: '24px',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '100px', height: '100px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', filter: 'blur(40px)' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '18px',
                                    background: 'linear-gradient(135deg, #10b981, #22d3ee)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)'
                                }}>
                                    <Database size={28} color="white" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Penyimpanan</p>
                                    <p style={{ fontSize: '24px', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                                        {(() => {
                                            const totalBytes = filteredNotes.reduce((acc, f) => acc + (f.content?.length || 0) * 0.75, 0);
                                            if (totalBytes < 1024) return `${Math.round(totalBytes)} B`;
                                            if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
                                            return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
                                        })()}
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* File Types */}
                        <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            style={{
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(249, 115, 22, 0.1) 100%)',
                                borderRadius: '24px',
                                padding: '24px',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '100px', height: '100px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '50%', filter: 'blur(40px)' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '18px',
                                    background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)'
                                }}>
                                    <FileText size={28} color="white" />
                                </div>
                                <div>
                                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>File .PK</p>
                                    <p style={{ fontSize: '32px', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                                        {filteredNotes.filter(f => f.title?.toLowerCase().endsWith('.pk')).length}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* PREMIUM UPLOAD AREA */}
                    <motion.div
                        whileHover={{ scale: 1.005 }}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            borderRadius: '28px',
                            padding: '4px',
                            background: isDragOver
                                ? `linear-gradient(135deg, rgb(${themeColor}), rgba(139, 92, 246, 1), rgb(${themeColor}))`
                                : 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                            cursor: 'pointer',
                            marginBottom: '40px',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'all 0.4s ease'
                        }}
                    >
                        <div style={{
                            background: 'rgba(15, 23, 42, 0.95)',
                            borderRadius: '24px',
                            padding: '50px 40px',
                            textAlign: 'center',
                            position: 'relative'
                        }}>
                            {/* Animated Background Particles */}
                            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: '24px', pointerEvents: 'none' }}>
                                {[...Array(6)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{
                                            y: [0, -20, 0],
                                            opacity: [0.1, 0.3, 0.1],
                                            scale: [1, 1.2, 1]
                                        }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 3 + i * 0.5,
                                            delay: i * 0.3
                                        }}
                                        style={{
                                            position: 'absolute',
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: `rgb(${themeColor})`,
                                            left: `${15 + i * 15}%`,
                                            bottom: '30%'
                                        }}
                                    />
                                ))}
                            </div>

                            <input type="file" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
                            <div style={{ pointerEvents: 'none', position: 'relative', zIndex: 1 }}>
                                <motion.div
                                    animate={isDragOver ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                                    transition={{ repeat: Infinity, duration: 0.5 }}
                                    style={{
                                        width: '88px', height: '88px', borderRadius: '24px',
                                        background: `linear-gradient(135deg, rgb(${themeColor}), rgba(139, 92, 246, 0.8))`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 24px',
                                        boxShadow: `0 16px 40px rgba(${themeColor}, 0.4), inset 0 0 20px rgba(255,255,255,0.2)`,
                                        position: 'relative'
                                    }}
                                >
                                    <motion.div
                                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        style={{
                                            position: 'absolute',
                                            inset: '-8px',
                                            borderRadius: '28px',
                                            border: `2px solid rgb(${themeColor})`,
                                            opacity: 0.5
                                        }}
                                    />
                                    <ArrowUp size={40} color="white" strokeWidth={2.5} />
                                </motion.div>

                                <h3 style={{
                                    fontSize: '26px',
                                    fontWeight: '900',
                                    marginBottom: '12px',
                                    color: 'white',
                                    background: `linear-gradient(135deg, white, rgba(${themeColor}, 0.8))`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    {isDragOver ? '🎯 Lepaskan File di Sini!' : 'Upload File ke Cloud Arsip'}
                                </h3>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
                                    Drag & drop file kamu di sini, atau <span style={{ color: `rgb(${themeColor})`, fontWeight: '700' }}>klik untuk browse</span>.
                                    Semua file tersimpan aman & terenkripsi di cloud.
                                </p>

                                {/* Supported File Types */}
                                <div style={{
                                    display: 'flex',
                                    gap: '10px',
                                    justifyContent: 'center',
                                    marginTop: '24px',
                                    flexWrap: 'wrap'
                                }}>
                                    {[
                                        { ext: '.PK', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
                                        { ext: '.PDF', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
                                        { ext: '.DOCX', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
                                        { ext: '.XLS', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
                                        { ext: 'IMAGE', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
                                    ].map(type => (
                                        <span key={type.ext} style={{
                                            padding: '8px 14px',
                                            borderRadius: '10px',
                                            background: type.bg,
                                            color: type.color,
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            letterSpacing: '0.5px',
                                            border: `1px solid ${type.color}30`
                                        }}>
                                            {type.ext}
                                        </span>
                                    ))}
                                </div>

                                <p style={{ marginTop: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>
                                    📁 Maximum file size: 5MB per file
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* SEARCH & FILTER BAR */}
                    <div style={{
                        display: 'flex',
                        gap: '16px',
                        marginBottom: '28px',
                        flexWrap: 'wrap',
                        alignItems: 'center'
                    }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                            <input
                                type="text"
                                placeholder="Cari file..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '14px 18px 14px 50px',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    outline: 'none',
                                    transition: 'all 0.3s'
                                }}
                            />
                        </div>
                        <div style={{
                            padding: '12px 20px',
                            borderRadius: '14px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '13px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Layers size={16} /> {filteredNotes.length} File
                        </div>
                    </div>

                    {/* PREMIUM FILE GRID */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '24px'
                    }}>
                        <AnimatePresence mode="popLayout">
                            {filteredNotes.map((file, index) => {
                                if (!file) return null;
                                // ... file processing logic remains the same ...
                                const filename = file.title || 'unnamed_file';
                                const ext = filename.split('.').pop()?.toLowerCase() || '';
                                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                                const isPK = ext === 'pk';
                                const isPDF = ext === 'pdf';
                                const isDoc = ['doc', 'docx'].includes(ext);
                                const isExcel = ['xls', 'xlsx', 'csv'].includes(ext);
                                const isZip = ['zip', 'rar', '7z'].includes(ext);

                                // Calculate file size from base64
                                const fileSize = (() => {
                                    const bytes = (file.content?.length || 0) * 0.75;
                                    if (bytes < 1024) return `${Math.round(bytes)} B`;
                                    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                                    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
                                })();

                                const getTypeColor = () => {
                                    if (isPK) return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #f97316)', label: 'DATA FILE', icon: '📊' };
                                    if (isPDF) return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', label: 'DOKUMEN', icon: '📄' };
                                    if (isDoc) return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', label: 'WORD DOC', icon: '📝' };
                                    if (isExcel) return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)', label: 'SPREADSHEET', icon: '📈' };
                                    if (isImage) return { bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #db2777)', label: 'GAMBAR', icon: '🖼️' };
                                    if (isZip) return { bg: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6', gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)', label: 'ARSIP ZIP', icon: '📦' };
                                    return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', gradient: 'linear-gradient(135deg, #64748b, #475569)', label: 'FILE', icon: '📁' };
                                };

                                const typeStyle = getTypeColor();

                                return (
                                    <motion.div
                                        key={file.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                                        transition={{ delay: Math.min(index * 0.05, 0.5), type: 'spring', stiffness: 300, damping: 25 }}
                                        whileHover={{
                                            y: -12,
                                            rotateX: 2,
                                            rotateY: -2,
                                            boxShadow: `0 30px 60px rgba(0,0,0,0.4), 0 0 40px ${typeStyle.color}30`
                                        }}
                                        style={{
                                            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.7) 100%)',
                                            borderRadius: '28px',
                                            border: `1px solid ${typeStyle.color}20`,
                                            overflow: 'hidden',
                                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                            position: 'relative',
                                            transformStyle: 'preserve-3d',
                                            perspective: '1000px',
                                            transform: 'translateZ(0)' // Force acceleration
                                        }}
                                    >
                                        {/* Animated Glow Border */}
                                        <motion.div
                                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                                            transition={{ repeat: Infinity, duration: 3 }}
                                            style={{
                                                position: 'absolute',
                                                inset: '-2px',
                                                borderRadius: '30px',
                                                background: `linear-gradient(135deg, ${typeStyle.color}40, transparent, ${typeStyle.color}40)`,
                                                zIndex: 0,
                                                pointerEvents: 'none'
                                            }}
                                        />

                                        {/* Image Preview or Gradient Header */}
                                        <div style={{
                                            height: isImage ? '160px' : '100px',
                                            background: isImage ? 'transparent' : typeStyle.gradient,
                                            position: 'relative',
                                            overflow: 'hidden',
                                            zIndex: 1
                                        }}>
                                            {isImage ? (
                                                <img
                                                    src={file.content}
                                                    alt={file.title}
                                                    loading="lazy"
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        filter: 'brightness(0.9)'
                                                    }}
                                                />
                                            ) : (
                                                <>
                                                    {/* Holographic Background */}
                                                    <motion.div
                                                        animate={{
                                                            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                                                        }}
                                                        transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                                                        style={{
                                                            position: 'absolute',
                                                            inset: 0,
                                                            background: `linear-gradient(135deg, ${typeStyle.color}20, transparent 40%, ${typeStyle.color}10, transparent 60%, ${typeStyle.color}20)`,
                                                            backgroundSize: '200% 200%'
                                                        }}
                                                    />

                                                    {/* Floating Particles */}
                                                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                                                        {[...Array(8)].map((_, i) => (
                                                            <motion.div
                                                                key={i}
                                                                animate={{
                                                                    y: [20, -20, 20],
                                                                    x: [0, i % 2 === 0 ? 10 : -10, 0],
                                                                    opacity: [0.3, 0.6, 0.3]
                                                                }}
                                                                transition={{
                                                                    repeat: Infinity,
                                                                    duration: 3 + i * 0.5,
                                                                    delay: i * 0.3
                                                                }}
                                                                style={{
                                                                    position: 'absolute',
                                                                    width: '4px',
                                                                    height: '4px',
                                                                    borderRadius: '50%',
                                                                    background: 'white',
                                                                    left: `${10 + i * 12}%`,
                                                                    top: `${30 + (i % 3) * 20}%`
                                                                }}
                                                            />
                                                        ))}
                                                    </div>

                                                    {/* 3D FOLDER ICON */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: '50%',
                                                        top: '50%',
                                                        transform: 'translate(-50%, -50%)',
                                                        perspective: '200px'
                                                    }}>
                                                        <motion.div
                                                            animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
                                                            transition={{ repeat: Infinity, duration: 2.5 }}
                                                            style={{
                                                                position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)',
                                                                width: '50px', height: '10px', borderRadius: '50%', background: 'rgba(0,0,0,0.4)', filter: 'blur(6px)'
                                                            }}
                                                        />
                                                        <motion.div
                                                            animate={{ rotateY: [-3, 3, -3], y: [0, -2, 0] }}
                                                            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                                                            style={{
                                                                width: '60px', height: '48px',
                                                                background: `linear-gradient(180deg, ${typeStyle.color}cc, ${typeStyle.color}99)`,
                                                                borderRadius: '6px', position: 'relative', boxShadow: `0 8px 24px ${typeStyle.color}60, inset 0 1px 0 rgba(255,255,255,0.3)`
                                                            }}
                                                        >
                                                            <div style={{
                                                                position: 'absolute', top: '-10px', left: '4px', width: '24px', height: '14px',
                                                                background: `linear-gradient(180deg, ${typeStyle.color}, ${typeStyle.color}dd)`,
                                                                borderRadius: '4px 4px 0 0', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)'
                                                            }} />
                                                            <motion.div
                                                                animate={{ rotateX: [0, -2, 0] }}
                                                                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                                                                style={{
                                                                    position: 'absolute', top: '6px', left: '0', right: '0', bottom: '0',
                                                                    background: `linear-gradient(180deg, ${typeStyle.color}, ${typeStyle.color}bb)`,
                                                                    borderRadius: '4px 6px 6px 6px', boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 4px ${typeStyle.color}40`
                                                                }}
                                                            >
                                                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '18px' }}>{typeStyle.icon}</div>
                                                            </motion.div>
                                                        </motion.div>
                                                    </div>
                                                </>
                                            )}

                                            <div style={{ position: 'absolute', top: '14px', right: '14px', padding: '6px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '11px', fontWeight: '700' }}>{fileSize}</div>
                                        </div>

                                        {/* File Info Section */}
                                        <div style={{ padding: '24px', position: 'relative', zIndex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
                                                <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: typeStyle.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${typeStyle.color}30` }}>
                                                    {getFileIcon(file.title)}
                                                </div>
                                                <div style={{ overflow: 'hidden', flex: 1 }}>
                                                    <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '8px' }}>{file.title}</h4>
                                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={12} /> {file.date}</span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <motion.button whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => downloadFile(file)}
                                                    style={{ flex: 1, padding: '16px', borderRadius: '16px', background: typeStyle.gradient, color: 'white', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: `0 10px 25px ${typeStyle.color}50` }}>
                                                    <ArrowDown size={18} strokeWidth={2.5} /> DOWNLOAD
                                                </motion.button>
                                                <motion.button whileHover={{ scale: 1.1, background: 'rgba(239, 68, 68, 0.2)' }} whileTap={{ scale: 0.9 }} onClick={(e) => deleteNote(file.id, e, 'file')}
                                                    style={{ padding: '16px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Trash2 size={18} />
                                                </motion.button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* Loading trigger removed */}


                    {/* EMPTY STATE */}
                    {filteredNotes.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                textAlign: 'center',
                                padding: '100px 20px',
                                background: 'rgba(15, 23, 42, 0.4)',
                                borderRadius: '28px',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}
                        >
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 3 }}
                                style={{
                                    width: '120px', height: '120px',
                                    borderRadius: '40px',
                                    background: `linear-gradient(135deg, rgba(${themeColor}, 0.2), rgba(139, 92, 246, 0.1))`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 28px',
                                    border: `2px solid rgba(${themeColor}, 0.2)`
                                }}
                            >
                                <Layers size={50} style={{ color: `rgb(${themeColor})`, opacity: 0.6 }} />
                            </motion.div>
                            <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'white', marginBottom: '12px' }}>
                                Arsip File Kosong
                            </h3>
                            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.4)', maxWidth: '400px', margin: '0 auto' }}>
                                Upload file pertamamu dengan drag & drop atau klik area upload di atas untuk memulai!
                            </p>
                        </motion.div>
                    )}
                </motion.div>
            )
            }

            {/* Premium Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteModal && (
                    <DeleteConfirmationModal
                        isOpen={!!deleteModal}
                        onClose={() => setDeleteModal(null)}
                        onConfirm={confirmDeleteAction}
                        target={deleteModal}
                        isDeleting={isDeleting}
                        customTitle={`Hapus ${deleteModal.type === 'file' ? 'File' : 'Catatan'}?`}
                        customDescription={
                            <>Apakah Anda yakin ingin menghapus <span style={{ color: '#ef4444', fontWeight: '800' }}>"{deleteModal.title}"</span> secara permanen? Tindakan ini tidak dapat dibatalkan.</>
                        }
                    />
                )}
            </AnimatePresence>

            {/* Scroll to Top button */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: 20 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        style={{
                            position: 'fixed', bottom: '100px', right: '30px',
                            width: '50px', height: '50px', borderRadius: '15px',
                            background: `rgb(${themeColor})`, color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 10px 20px rgba(${themeColor}, 0.3)`,
                            zIndex: 1000, border: 'none', cursor: 'pointer'
                        }}
                    >
                        <ArrowUp size={24} />
                    </motion.button>
                )}
            </AnimatePresence>
        </div >
    );
};


export default CatatanKerja;


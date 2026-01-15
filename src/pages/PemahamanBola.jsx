import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Trash2, BookOpen, Clock, Tag, ChevronRight, Search, Target,
    Activity, BarChart2, ShieldAlert, Award, Edit2, X, ArrowLeft,
    Zap, Hash, Calculator, HelpCircle, Trophy, FileText, Settings,
    Maximize2, Minimize2, Type
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const WikiHub = () => {
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState('BOLA'); // 'BOLA' | 'TOGEL'
    const [articles, setArticles] = useState([]);
    const [showEditor, setShowEditor] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('Semua');
    const [editingId, setEditingId] = useState(null);
    const [syncStatus, setSyncStatus] = useState('Standby');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isInitialLoaded, setIsInitialLoaded] = useState(false);
    const [dashboardFont, setDashboardFont] = useState("'Inter', sans-serif");

    // Sync Dashboard Font
    useEffect(() => {
        const updateFont = () => {
            const saved = localStorage.getItem(`dashboard_settings_${user?.username}`);
            if (saved) {
                const settings = JSON.parse(saved);
                if (settings.fontFamily) setDashboardFont(settings.fontFamily);
            }
        };
        updateFont();
        window.addEventListener('storage', updateFont);
        const interval = setInterval(updateFont, 1000);
        return () => {
            window.removeEventListener('storage', updateFont);
            clearInterval(interval);
        };
    }, [user?.username]);

    // --- PREMIUM DELETE MODAL STATE ---
    const [deleteModal, setDeleteModal] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: '',
        type: 'BOLA'
    });

    const sections = {
        BOLA: {
            title: 'Football Intelligence',
            subtitle: 'Mastering Strategy & Analysis',
            color: '#10b981',
            bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), transparent)',
            categories: [
                { name: 'Semua', icon: BookOpen, color: '#3b82f6' },
                { name: 'Taktik', icon: Target, color: '#10b981' },
                { name: 'Latihan', icon: Activity, color: '#f59e0b' },
                { name: 'Analisis', icon: BarChart2, color: '#ec4899' },
                { name: 'Peraturan', icon: ShieldAlert, color: '#ef4444' },
            ]
        },
        TOGEL: {
            title: 'Numbers Mastery',
            subtitle: 'Data-Driven Predictions & Logic',
            color: '#8b5cf6',
            bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), transparent)',
            categories: [
                { name: 'Semua', icon: BookOpen, color: '#3b82f6' },
                { name: 'Dasar', icon: FileText, color: '#8b5cf6' },
                { name: 'Istilah', icon: Tag, color: '#06b6d4' },
                { name: 'Rumus', icon: Calculator, color: '#eab308' },
                { name: 'Panduan', icon: HelpCircle, color: '#f43f5e' },
            ]
        }
    };

    const DEFAULT_ARTICLES = [
        {
            id: 1,
            title: 'PENGERTIAN VOOR SPORTBOOK',
            category: 'Taktik',
            type: 'BOLA',
            updateDate: new Date().toLocaleDateString(),
            content: `**0,0 = 0 = Tidak ada voor (leg-legan)**\nContoh pasang Atalanta, taruhan akan menang jika Atalanta menang dengan minimal selisih 1 gol. Bila hasil akhir imbang, taruhan draw (uang kembali).\n\n**0-0,5 = 0,25 = Voor 1/4**\nHarus menang berapa? Contoh pasang Atalanta ngepur 1/4 SPAL, taruhan akan menang jika Atalanta menang dengan minimal selisih 1 gol.\n\n**0,5 = 0,50 = Voor 1/2**\nHarus menang berapa? Contoh pasang Atalanta ngepur 1/2 SPAL, taruhan akan menang jika Atalanta menang dengan minimal selisih 1 gol.`
        },
        {
            id: 2,
            title: 'ISTILAH DASAR DALAM TOGEL',
            category: 'Dasar',
            type: 'TOGEL',
            updateDate: new Date().toLocaleDateString(),
            content: `**JP (Jackpot)**: Hasil kemenangan telak atau utama yang didapatkan pemain.\n\n**AS, KOP, KEPALA, EKOR**: Posisi angka dalam 4 digit togel (Contoh: 1234 -> 1=As, 2=Kop, 3=Kepala, 4=Ekor).\n\n**BB (Bolak Balik)**: Memasang angka secara terbalik untuk berjaga-jaga (Contoh: Pasang 12 BB, maka 21 juga terpasang).\n\n**AKAS**: Angka Keramat atau Angka Sakti.\n\n**BBFS (Bolak Balik Full Set)**: Sebuah sistem di mana pemain memilih beberapa angka (biasanya 5-7 digit) untuk digenerate menjadi semua kemungkinan 2D, 3D, atau 4D.`
        },
        {
            id: 3,
            title: 'RUMUS BBFS 4D/3D/2D',
            category: 'Rumus',
            type: 'TOGEL',
            updateDate: new Date().toLocaleDateString(),
            content: `BBFS adalah metode paling populer untuk memenangkan togel dengan modal sedang.\n\n**Keuntungan BBFS:**\n1. Peluang menang jauh lebih tinggi dibanding tebak manual.\n2. Mengurangi resiko "kepeleset" satu angka.\n3. Memudahkan pemain yang memiliki modal cukup besar untuk investasi.\n\n**Tips:** Jangan menggunakan terlalu banyak angka (maksimal 7 digit) agar biaya pasang (bet) tidak terlalu besar dibanding hadiah JP-nya.`
        }
    ];

    useEffect(() => {
        if (!supabase || !user?.username) return;

        const syncProcess = async () => {
            setSyncStatus('Sinkronisasi...');
            try {
                const { data: cloudData, error: fetchError } = await supabase
                    .from('bola_articles')
                    .select('*')
                    .eq('user_id', user.username)
                    .order('id', { ascending: true });

                if (fetchError) throw fetchError;

                const savedLocal = localStorage.getItem(`articles_v2_${user.username}`);
                const localData = savedLocal ? JSON.parse(savedLocal) : [];

                if (cloudData && cloudData.length > 0) {
                    const finalData = cloudData.map(item => ({
                        ...item,
                        id: Number(item.id),
                        type: item.type || 'BOLA',
                        updateDate: item.update_date || item.updateDate
                    }));
                    setArticles(finalData);
                    localStorage.setItem(`articles_v2_${user.username}`, JSON.stringify(finalData));
                    setSyncStatus('Cloud Connected');
                } else if (Array.isArray(localData) && localData.length > 0) {
                    setArticles(localData);
                    setSyncStatus('Backing up...');
                    for (const item of localData) {
                        await syncToCloud(item);
                    }
                    setSyncStatus('Cloud Connected');
                } else {
                    setArticles(DEFAULT_ARTICLES);
                    setSyncStatus('Ready');
                }
                setIsInitialLoaded(true);
            } catch (err) {
                console.error("Wiki Sync Error:", err);
                setSyncStatus('Offline Mode');
                const savedLocal = localStorage.getItem(`articles_v2_${user.username}`);
                setArticles(savedLocal ? JSON.parse(savedLocal) : DEFAULT_ARTICLES);
                setIsInitialLoaded(true);
            }
        };

        syncProcess();

        const channel = supabase
            .channel(`wiki_rt_${user.username}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bola_articles', filter: `user_id=eq.${user.username}` },
                (payload) => {
                    if (!payload.new && payload.eventType !== 'DELETE') return;

                    if (payload.eventType === 'DELETE') {
                        setArticles(prev => prev.filter(a => a.id !== Number(payload.old.id)));
                    } else {
                        const updated = {
                            ...payload.new,
                            id: Number(payload.new.id),
                            updateDate: payload.new.update_date || payload.new.updateDate,
                            type: payload.new.type || 'BOLA'
                        };
                        setArticles(prev => {
                            const exists = prev.find(a => a.id === updated.id);
                            if (exists) return prev.map(a => a.id === updated.id ? updated : a);
                            return [...prev, updated].sort((a, b) => a.id - b.id);
                        });
                    }
                }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.username]);

    useEffect(() => {
        if (user?.username && isInitialLoaded) {
            localStorage.setItem(`articles_v2_${user.username}`, JSON.stringify(articles));
        }
    }, [articles, user?.username, isInitialLoaded]);

    const syncToCloud = async (item, action = 'upsert') => {
        if (!supabase || !user) return;
        setSyncStatus('Menyimpan...');
        try {
            if (action === 'delete') {
                await supabase.from('bola_articles').delete().eq('id', item.id);
            } else {
                await supabase.from('bola_articles').upsert({
                    id: item.id,
                    user_id: user.username,
                    title: item.title,
                    content: item.content,
                    category: item.category,
                    type: item.type || 'BOLA',
                    update_date: item.updateDate,
                    last_updated: new Date().toISOString()
                });
            }
            setSyncStatus('Cloud Connected');
        } catch (err) {
            console.error("Sync to cloud error:", err);
            setSyncStatus('Offline Mode');
        }
    };

    const handleSave = (e) => {
        e.preventDefault();
        const now = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

        if (editingId) {
            const current = articles.find(a => a.id === editingId);
            if (!current) return;
            const updated = { ...current, ...formData, updateDate: now };
            setArticles(articles.map(a => a.id === editingId ? updated : a));
            syncToCloud(updated);
            if (selectedArticle?.id === editingId) setSelectedArticle(updated);
        } else {
            const newItem = { ...formData, id: Date.now(), updateDate: now, type: activeSection };
            setArticles([...articles, newItem]);
            syncToCloud(newItem);
        }
        setShowEditor(false);
        setEditingId(null);
    };

    const confirmDeleteAction = async () => {
        if (!deleteModal) return;
        setIsDeleting(true);
        const item = articles.find(a => a.id === deleteModal.id);
        setArticles(articles.filter(a => a.id !== deleteModal.id));
        if (item) await syncToCloud(item, 'delete');
        if (selectedArticle?.id === deleteModal.id) setSelectedArticle(null);
        setIsDeleting(false);
        setDeleteModal(null);
    };

    const filteredArticles = useMemo(() => {
        if (!Array.isArray(articles)) return [];
        return articles.filter(a => {
            if (!a) return false;
            const matchesType = a.type === activeSection;
            const matchesCategory = activeCategory === 'Semua' || a.category === activeCategory;
            const searchLow = (searchQuery || '').toLowerCase();
            const titleMatch = (a.title || '').toLowerCase().includes(searchLow);
            const contentMatch = (a.content || '').toLowerCase().includes(searchLow);
            return matchesType && matchesCategory && (titleMatch || contentMatch);
        });
    }, [articles, activeSection, activeCategory, searchQuery]);

    const activeTheme = sections[activeSection] || sections.BOLA;

    return (
        <div className="wiki-master-container" style={{
            display: 'flex', flexDirection: 'column', gap: '24px',
            minHeight: 'calc(100vh - 120px)', position: 'relative'
        }}>
            {/* TOP BRAIN SWITCHER */}
            <div className="glass-effect" style={{
                padding: '12px', borderRadius: '24px', display: 'flex', justifyContent: 'center', gap: '12px',
                background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(20px)'
            }}>
                {Object.entries(sections).map(([key, config]) => {
                    const isActive = activeSection === key;
                    return (
                        <motion.button
                            key={key} whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}
                            onClick={() => { setActiveSection(key); setActiveCategory('Semua'); setSelectedArticle(null); }}
                            style={{
                                padding: '12px 32px', borderRadius: '18px',
                                background: isActive ? config.color : 'rgba(255,255,255,0.03)',
                                color: isActive ? 'white' : 'rgba(255,255,255,0.4)',
                                border: 'none', display: 'flex', alignItems: 'center', gap: '12px',
                                fontWeight: '900', fontSize: '15px', cursor: 'pointer', transition: 'all 0.4s',
                                boxShadow: isActive ? `0 10px 30px ${config.color}40` : 'none'
                            }}
                        >
                            {key === 'BOLA' ? <Trophy size={20} /> : <Hash size={20} />}
                            {config.title}
                        </motion.button>
                    );
                })}
            </div>

            <div className="wiki-main-grid" style={{
                display: 'grid', gridTemplateColumns: selectedArticle ? '280px 1fr 1fr' : '280px 1fr',
                gap: '24px', height: 'calc(100vh - 200px)', transition: 'all 0.5s'
            }}>
                {/* LEFT SIDEBAR */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass-effect" style={{ padding: '24px', borderRadius: '30px', background: 'rgba(15, 23, 42, 0.4)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                            <div style={{ width: '8px', height: '24px', borderRadius: '4px', background: activeTheme.color }} />
                            <h3 style={{ fontSize: '13px', fontWeight: '900', color: 'white', letterSpacing: '1px' }}>KATEGORI {activeSection}</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {activeTheme.categories.map(cat => {
                                const isActive = activeCategory === cat.name;
                                return (
                                    <motion.button
                                        key={cat.name} whileHover={{ x: 5 }} onClick={() => setActiveCategory(cat.name)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px',
                                            borderRadius: '16px', background: isActive ? `${cat.color}20` : 'transparent',
                                            color: isActive ? cat.color : 'rgba(255,255,255,0.4)',
                                            border: isActive ? `1px solid ${cat.color}40` : '1px solid transparent',
                                            fontWeight: '800', fontSize: '14px', cursor: 'pointer', textAlign: 'left'
                                        }}
                                    >
                                        {cat.icon && React.createElement(cat.icon, { size: 18 })} {cat.name}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            setFormData({ title: '', content: '', category: activeTheme.categories[1]?.name || 'Umum', type: activeSection });
                            setEditingId(null);
                            setShowEditor(true);
                        }}
                        style={{
                            padding: '24px', borderRadius: '30px',
                            background: `linear-gradient(135deg, ${activeTheme.color}, rgba(0,0,0,0.4))`,
                            color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer'
                        }}
                    >
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Plus size={24} strokeWidth={3} />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: '900', margin: 0 }}>Tambah Wawasan</h4>
                            <p style={{ fontSize: '12px', opacity: 0.7, margin: '4px 0 0' }}>Bagi pengetahuanmu untuk tim.</p>
                        </div>
                    </motion.button>

                    <div style={{ marginTop: 'auto', padding: '16px', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontWeight: '800' }}>{syncStatus}</span>
                    </div>
                </div>

                {/* MIDDLE: LIST */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }} className="custom-scroll">
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} size={20} />
                        <input
                            placeholder={`Cari dalam perpustakaan ${activeSection.toLowerCase()}...`}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%', padding: '20px 20px 20px 60px', borderRadius: '24px',
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                color: 'white', fontSize: '15px'
                            }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: selectedArticle ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {filteredArticles.map(article => (
                            <motion.div
                                key={article.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                onClick={() => setSelectedArticle(article)}
                                style={{
                                    padding: '24px', cursor: 'pointer', borderRadius: '24px', transition: 'all 0.4s',
                                    background: selectedArticle?.id === article.id ? `${activeTheme.color}15` : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${selectedArticle?.id === article.id ? activeTheme.color : 'rgba(255,255,255,0.05)'}`,
                                    position: 'relative', overflow: 'hidden'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div style={{ padding: '6px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', fontSize: '10px', fontWeight: '900', color: 'rgba(255,255,255,0.4)' }}>
                                        {(article.category || 'UMUM').toUpperCase()}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Clock size={12} /> {article.updateDate}
                                    </div>
                                </div>
                                <h4 style={{ fontSize: '18px', fontWeight: '900', color: 'white', marginBottom: '10px' }}>{article.title || 'Tanpa Judul'}</h4>
                                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.6' }}>
                                    {(article.content || '').replace(/\*\*/g, '')}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: READER */}
                <AnimatePresence>
                    {selectedArticle && (
                        <motion.div
                            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
                            className="glass-effect"
                            style={{
                                borderRadius: '30px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                                background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)',
                                position: isFullScreen ? 'fixed' : 'relative',
                                inset: isFullScreen ? '20px' : 'auto', zIndex: isFullScreen ? 1000 : 1,
                                height: '100%'
                            }}
                        >
                            <div style={{ height: '160px', width: '100%', background: `linear-gradient(to bottom, ${activeTheme.color}30, transparent)`, position: 'relative', padding: '32px' }}>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                    <span style={{ padding: '4px 12px', borderRadius: '8px', background: 'white', color: 'black', fontSize: '10px', fontWeight: '950' }}>{(selectedArticle.category || 'UMUM').toUpperCase()}</span>
                                </div>
                                <h2 style={{ fontSize: '24px', fontWeight: '950', color: 'white', margin: 0 }}>{selectedArticle.title}</h2>
                                <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', gap: '8px' }}>
                                    <button onClick={() => setIsFullScreen(!isFullScreen)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer' }}>
                                        {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                    </button>
                                    <button onClick={() => setSelectedArticle(null)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
                                </div>
                            </div>
                            <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }} className="custom-scroll">
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '32px' }}>
                                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => {
                                        setFormData({ title: selectedArticle.title, content: selectedArticle.content, category: selectedArticle.category, type: selectedArticle.type });
                                        setEditingId(selectedArticle.id);
                                        setShowEditor(true);
                                    }} style={{ padding: '10px 20px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: 'none', cursor: 'pointer', fontWeight: '800' }}>EDIT</motion.button>
                                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => setDeleteModal({ id: selectedArticle.id, title: selectedArticle.title })} style={{ padding: '10px 20px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: 'none', cursor: 'pointer', fontWeight: '800' }}>HAPUS</motion.button>
                                </div>
                                <div className="article-content" style={{ fontSize: '16px', lineHeight: '1.8', color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap' }}>
                                    {(selectedArticle.content || "").split('\n').map((line, i) => {
                                        if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
                                            return <h3 key={i} style={{ color: activeTheme.color, marginTop: '24px', fontWeight: '900' }}>{line.replace(/\*\*/g, '')}</h3>;
                                        }
                                        return <p key={i}>{line}</p>;
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* EDITOR */}
            <AnimatePresence>
                {showEditor && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            style={{ width: '100%', maxWidth: '700px', background: '#0f172a', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}
                        >
                            <div style={{
                                padding: '32px',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: `linear-gradient(90deg, ${activeTheme.color}15, transparent)`
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '14px',
                                        background: activeTheme.color, display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        boxShadow: `0 8px 20px ${activeTheme.color}40`
                                    }}>
                                        {activeSection === 'BOLA' ? <Trophy size={24} color="white" /> : <Hash size={24} color="white" />}
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '22px', fontWeight: '950', color: 'white', margin: 0, fontFamily: dashboardFont }}>
                                            {editingId ? 'Edit Wawasan' : 'Tulis Wawasan Baru'}
                                        </h2>
                                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, fontFamily: dashboardFont }}>
                                            Database {activeSection} • {activeTheme.subtitle}
                                        </p>
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ rotate: 90, scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setShowEditor(false)}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}
                                >
                                    <X size={20} />
                                </motion.button>
                            </div>

                            <form onSubmit={handleSave} style={{ padding: '40px', fontFamily: dashboardFont }}>
                                <div style={{ display: 'grid', gap: '32px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '24px' }}>
                                        {/* TITLE INPUT */}
                                        <div style={{ position: 'relative' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '900', color: activeTheme.color, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>
                                                <FileText size={14} /> Judul Artikel
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }}>
                                                    <Type size={18} />
                                                </div>
                                                <input
                                                    required
                                                    value={formData.title}
                                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                    style={{
                                                        width: '100%', padding: '18px 18px 18px 52px', borderRadius: '18px',
                                                        background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)',
                                                        color: 'white', fontSize: '15px', fontFamily: dashboardFont,
                                                        outline: 'none', transition: 'all 0.3s ease',
                                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                                                    }}
                                                    onFocus={e => {
                                                        e.target.style.borderColor = activeTheme.color;
                                                        e.target.style.boxShadow = `0 0 20px ${activeTheme.color}20, inset 0 2px 4px rgba(0,0,0,0.2)`;
                                                        e.target.parentElement.firstChild.style.color = activeTheme.color;
                                                    }}
                                                    onBlur={e => {
                                                        e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                                                        e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';
                                                        e.target.parentElement.firstChild.style.color = 'rgba(255,255,255,0.2)';
                                                    }}
                                                    placeholder="Contoh: Strategi Offside..."
                                                />
                                            </div>
                                        </div>

                                        {/* CATEGORY SELECT */}
                                        <div>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '900', color: activeTheme.color, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>
                                                <Tag size={14} /> Kategori
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <select
                                                    value={formData.category}
                                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                                    style={{
                                                        width: '100%', padding: '18px', borderRadius: '18px',
                                                        background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)',
                                                        color: 'white', fontSize: '15px', fontFamily: dashboardFont,
                                                        appearance: 'none', outline: 'none', transition: 'all 0.3s ease',
                                                        backgroundImage: `linear-gradient(45deg, transparent 50%, rgba(255,255,255,0.2) 50%), linear-gradient(135deg, rgba(255,255,255,0.2) 50%, transparent 50%)`,
                                                        backgroundPosition: `calc(100% - 20px) calc(1em + 2px), calc(100% - 15px) calc(1em + 2px)`,
                                                        backgroundSize: `5px 5px, 5px 5px`,
                                                        backgroundRepeat: 'no-repeat'
                                                    }}
                                                >
                                                    {activeTheme.categories.filter(c => c.name !== 'Semua').map(c => (
                                                        <option key={c.name} value={c.name} style={{ background: '#0f172a' }}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CONTENT TEXTAREA */}
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '900', color: activeTheme.color, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>
                                            <BookOpen size={14} /> Isi Wawasan (Markdown Enabled)
                                        </label>
                                        <textarea
                                            required
                                            value={formData.content}
                                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                                            style={{
                                                width: '100%', minHeight: '260px', padding: '24px', borderRadius: '24px',
                                                background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)',
                                                color: 'white', fontSize: '16px', lineHeight: '1.7', fontFamily: dashboardFont,
                                                resize: 'none', outline: 'none', transition: 'all 0.3s ease',
                                                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)'
                                            }}
                                            onFocus={e => {
                                                e.target.style.borderColor = activeTheme.color;
                                                e.target.style.boxShadow = `0 0 25px ${activeTheme.color}15, inset 0 2px 8px rgba(0,0,0,0.3)`;
                                            }}
                                            onBlur={e => {
                                                e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                                                e.target.style.boxShadow = 'inset 0 2px 8px rgba(0,0,0,0.3)';
                                            }}
                                            placeholder="Tulis detail pemahamanmu... Gunakan **Teks** untuk cetak tebal."
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '20px', marginTop: '40px' }}>
                                    <motion.button
                                        type="button"
                                        whileHover={{ background: 'rgba(255,255,255,0.08)', scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setShowEditor(false)}
                                        style={{
                                            flex: 1, padding: '20px', borderRadius: '20px',
                                            background: 'rgba(255,255,255,0.03)', color: 'white',
                                            border: '1px solid rgba(255,255,255,0.1)', fontWeight: '800',
                                            cursor: 'pointer', fontFamily: dashboardFont, fontSize: '14px'
                                        }}
                                    >
                                        BATAL
                                    </motion.button>
                                    <motion.button
                                        type="submit"
                                        whileHover={{ scale: 1.02, boxShadow: `0 15px 35px ${activeTheme.color}40` }}
                                        whileTap={{ scale: 0.98 }}
                                        style={{
                                            flex: 2, padding: '20px', borderRadius: '20px',
                                            background: activeTheme.color, color: 'white', border: 'none',
                                            fontWeight: '950', cursor: 'pointer',
                                            fontFamily: dashboardFont, fontSize: '14px', letterSpacing: '0.5px'
                                        }}
                                    >
                                        SIMPAN KE DATABASE {activeSection}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {deleteModal && (
                <DeleteConfirmationModal
                    isOpen={!!deleteModal}
                    onClose={() => setDeleteModal(null)}
                    onConfirm={confirmDeleteAction}
                    target={deleteModal}
                    isDeleting={isDeleting}
                    customTitle="Hapus Artikel?"
                />
            )}

            <style>{`
                .custom-scroll::-webkit-scrollbar { width: 5px; }
                .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                @media (max-width: 1000px) {
                    .wiki-main-grid { grid-template-columns: 1fr !important; height: auto !important; }
                }
            `}</style>
        </div>
    );
};

export default WikiHub;

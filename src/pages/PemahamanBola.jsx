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
    const [fullscreenImage, setFullscreenImage] = useState(null);
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
        type: 'BOLA',
        imageUrls: ['']
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
                // 1. Ambil data dari Cloud
                const { data: cloudData, error: fetchError } = await supabase
                    .from('bola_articles')
                    .select('*')
                    .eq('user_id', user.username)
                    .order('id', { ascending: true });

                if (fetchError) throw fetchError;

                // 2. Ambil data dari Local
                const savedLocal = localStorage.getItem(`articles_v2_${user.username}`);
                const localData = savedLocal ? JSON.parse(savedLocal) : [];

                const processedCloud = (cloudData || []).map(item => ({
                    ...item,
                    id: Number(item.id),
                    type: item.type || 'BOLA',
                    imageUrl: item.image_url || item.imageUrl || '',
                    updateDate: item.update_date || item.updateDate
                }));

                // 3. MERGE LOGIC: Gabungkan data cloud dengan data local yang belum ada di cloud
                // Gunakan Map untuk de-duplikasi berdasarkan ID
                const articleMap = new Map();

                // Masukkan data cloud dulu (prioritas utama)
                processedCloud.forEach(a => articleMap.set(a.id, a));

                // Masukkan data local yang BELUM ada di cloud atau lebih baru
                if (Array.isArray(localData)) {
                    localData.forEach(localItem => {
                        if (!articleMap.has(localItem.id)) {
                            // Ini data baru yang mungkin belum tersinkron
                            articleMap.set(localItem.id, localItem);
                        }
                    });
                }

                const finalData = Array.from(articleMap.values()).sort((a, b) => a.id - b.id);

                if (finalData.length > 0) {
                    setArticles(finalData);
                    localStorage.setItem(`articles_v2_${user.username}`, JSON.stringify(finalData));

                    // Jika ada data local yang belum di cloud, coba sinkronkan
                    const unsynced = finalData.filter(f => !processedCloud.find(c => c.id === f.id));
                    if (unsynced.length > 0) {
                        setSyncStatus('Backing up...');
                        for (const item of unsynced) {
                            await syncToCloud(item);
                        }
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
                            type: payload.new.type || 'BOLA',
                            imageUrl: (payload.new.image_url || '').split(',')[0] || '',
                            imageUrls: (payload.new.image_url || '').split(',').filter(url => url.trim() !== '')
                        };
                        setArticles(prev => {
                            const exists = prev.find(a => a.id === updated.id);
                            if (exists) {
                                if (JSON.stringify(exists) === JSON.stringify(updated)) return prev;
                                return prev.map(a => a.id === updated.id ? updated : a);
                            }
                            return [...prev, updated].sort((a, b) => a.id - b.id);
                        });
                    }
                }
            ).subscribe();

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
                const { error } = await supabase.from('bola_articles').delete().eq('id', item.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('bola_articles').upsert({
                    id: item.id,
                    user_id: user.username,
                    title: item.title,
                    content: item.content,
                    category: item.category,
                    type: item.type || 'BOLA',
                    image_url: Array.isArray(item.imageUrls) ? item.imageUrls.filter(url => url.trim() !== '').join(',') : (item.imageUrl || ''),
                    update_date: item.updateDate,
                    last_updated: new Date().toISOString()
                });
                if (error) throw error;
            }
            setSyncStatus('Cloud Connected');
            return true;
        } catch (err) {
            console.error("Sync to cloud error:", err);
            setSyncStatus('Database Error');
            return false;
        }
    };

    const handleSave = (e) => {
        e.preventDefault();
        const now = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

        if (editingId) {
            const current = articles.find(a => a.id === editingId);
            if (!current) return;
            const updated = { ...current, ...formData, updateDate: now, imageUrl: formData.imageUrls[0] || '' };
            setArticles(articles.map(a => a.id === editingId ? updated : a));
            syncToCloud(updated);
            if (selectedArticle?.id === editingId) setSelectedArticle(updated);
        } else {
            const newItem = { ...formData, id: Date.now(), updateDate: now, type: activeSection, imageUrl: formData.imageUrls[0] || '' };
            setArticles([...articles, newItem]);
            syncToCloud(newItem);
            setSelectedArticle(newItem);
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
                    <div className="glass-effect" style={{
                        padding: '24px', borderRadius: '30px',
                        background: 'rgba(2, 6, 17, 0.85)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.01)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                            <div style={{
                                width: '4px', height: '20px', borderRadius: '2px',
                                background: activeTheme.color,
                                boxShadow: `0 0 15px ${activeTheme.color}`
                            }} />
                            <h3 style={{ fontSize: '11px', fontWeight: '900', color: 'rgba(255,255,255,0.9)', letterSpacing: '2px', textTransform: 'uppercase' }}>KATEGORI {activeSection}</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {activeTheme.categories.map(cat => {
                                const isActive = activeCategory === cat.name;
                                return (
                                    <motion.button
                                        key={cat.name} whileHover={{ x: 8, background: 'rgba(255,255,255,0.03)' }}
                                        onClick={() => setActiveCategory(cat.name)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px',
                                            borderRadius: '16px', background: isActive ? `${cat.color}15` : 'transparent',
                                            color: isActive ? cat.color : 'rgba(255,255,255,0.45)',
                                            border: isActive ? `1px solid ${cat.color}30` : '1px solid transparent',
                                            fontWeight: isActive ? '900' : '700', fontSize: '13.5px', cursor: 'pointer', textAlign: 'left',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                    >
                                        <div style={{
                                            opacity: isActive ? 1 : 0.6,
                                            transform: isActive ? 'scale(1.1)' : 'scale(1)',
                                            transition: 'transform 0.3s ease'
                                        }}>
                                            {cat.icon && React.createElement(cat.icon, { size: 16 })}
                                        </div>
                                        {cat.name}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            setFormData({ title: '', content: '', category: activeTheme.categories[1]?.name || 'Umum', type: activeSection, imageUrls: [''] });
                            setEditingId(null);
                            setShowEditor(true);
                        }}
                        style={{
                            padding: '24px', borderRadius: '30px',
                            background: `linear-gradient(135deg, ${activeTheme.color}, rgba(0,0,0,0.4))`,
                            color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer',
                            boxShadow: `0 10px 40px ${activeTheme.color}30`
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
                        <Search style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} size={18} />
                        <input
                            placeholder={`Cari dalam perpustakaan ${activeSection.toLowerCase()}...`}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%', padding: '24px 24px 24px 64px', borderRadius: '24px',
                                background: 'rgba(2, 6, 17, 0.7)', border: '1px solid rgba(255,255,255,0.06)',
                                color: 'white', fontSize: '15px', fontWeight: '600',
                                boxShadow: '0 15px 35px rgba(0,0,0,0.4), inset 0 2px 10px rgba(0,0,0,0.5)',
                                outline: 'none', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                            onFocus={e => {
                                e.target.style.borderColor = activeTheme.color;
                                e.target.style.boxShadow = `0 15px 45px rgba(0,0,0,0.5), 0 0 20px ${activeTheme.color}15, inset 0 2px 10px rgba(0,0,0,0.5)`;
                            }}
                            onBlur={e => {
                                e.target.style.borderColor = 'rgba(255,255,255,0.06)';
                                e.target.style.boxShadow = '0 15px 35px rgba(0,0,0,0.4), inset 0 2px 10px rgba(0,0,0,0.5)';
                            }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: selectedArticle ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {filteredArticles.map(article => (
                            <motion.div
                                key={article.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                onClick={() => setSelectedArticle(article)}
                                style={{
                                    padding: '0', cursor: 'pointer', borderRadius: '28px', transition: 'all 0.4s',
                                    background: selectedArticle?.id === article.id ? 'rgba(15, 23, 42, 0.8)' : 'rgba(4, 9, 23, 0.65)',
                                    border: `1px solid ${selectedArticle?.id === article.id ? activeTheme.color : 'rgba(255,255,255,0.05)'}`,
                                    position: 'relative', overflow: 'hidden',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                                }}
                                whileHover={{ y: -8, boxShadow: `0 30px 60px rgba(0,0,0,0.6), 0 0 30px ${activeTheme.color}10` }}
                            >
                                {article.imageUrl && (
                                    <div style={{ height: '150px', width: '100%', overflow: 'hidden', position: 'relative', background: '#020617' }}>
                                        <img
                                            src={article.imageUrl}
                                            alt={article.title}
                                            loading="lazy"
                                            decoding="async"
                                            style={{
                                                width: '100%', height: '100%', objectFit: 'cover',
                                                opacity: 0.85, transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                                                imageRendering: 'auto'
                                            }}
                                        />
                                        <div
                                            className="img-overlay"
                                            style={{
                                                position: 'absolute', inset: 0,
                                                background: 'linear-gradient(to top, rgba(2, 6, 17, 0.9), transparent 70%)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                opacity: 0, transition: 'opacity 0.4s ease'
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (article.imageUrl) setFullscreenImage(article.imageUrl);
                                            }}
                                        >
                                            <motion.div
                                                whileHover={{ scale: 1.2, background: 'rgba(255,255,255,0.2)' }}
                                                whileTap={{ scale: 0.9 }}
                                                style={{ padding: '12px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.1)' }}
                                            >
                                                <Maximize2 size={22} color="white" />
                                            </motion.div>
                                        </div>
                                    </div>
                                )}
                                <div style={{ padding: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <div style={{ padding: '6px 12px', borderRadius: '8px', background: `${activeTheme.color}15`, fontSize: '9px', fontWeight: '900', color: activeTheme.color, letterSpacing: '0.5px' }}>
                                            {(article.category || 'UMUM').toUpperCase()}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                                            <Clock size={12} /> {article.updateDate}
                                        </div>
                                    </div>
                                    <h4 style={{ fontSize: '18px', fontWeight: '900', color: 'rgba(255,255,255,0.95)', marginBottom: '12px', lineHeight: '1.4' }}>{article.title || 'Tanpa Judul'}</h4>
                                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.7' }}>
                                        {(article.content || '').replace(/\*\*/g, '')}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                        {filteredArticles.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', padding: '100px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '30px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                                <BookOpen size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                                <p style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '800' }}>Belum ada wawasan di kategori ini.</p>
                            </div>
                        )}
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
                            {/* HERO HEADER */}
                            <div
                                style={{ height: '280px', width: '100%', position: 'relative', overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}
                                onClick={() => selectedArticle.imageUrl && setFullscreenImage(selectedArticle.imageUrl)}
                            >
                                {selectedArticle.imageUrl ? (
                                    <motion.img
                                        initial={{ scale: 1.2, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 1.2, ease: "easeOut" }}
                                        src={selectedArticle.imageUrl}
                                        loading="eager"
                                        decoding="async"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, imageRendering: 'auto' }}
                                        alt=""
                                    />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', background: `linear-gradient(to bottom, ${activeTheme.color}60, transparent)` }} />
                                )}
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #020617, transparent 60%)' }} />
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.5s ease-out' }} className="hero-zoom-hint">
                                    <div style={{ padding: '14px 28px', borderRadius: '40px', background: 'rgba(1, 4, 12, 0.8)', backdropFilter: 'blur(15px)', color: 'white', fontSize: '12px', fontWeight: '900', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', letterSpacing: '1px' }}>
                                        <Maximize2 size={16} /> PERBESAR GAMBAR
                                    </div>
                                </div>

                                <div style={{ position: 'absolute', inset: 0, padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                        <span style={{ padding: '6px 16px', borderRadius: '12px', background: activeTheme.color, color: 'white', fontSize: '11px', fontWeight: '950', boxShadow: `0 4px 15px ${activeTheme.color}40` }}>{(selectedArticle.category || 'UMUM').toUpperCase()}</span>
                                        <span style={{ padding: '6px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '11px', fontWeight: '950', backdropFilter: 'blur(5px)' }}>{selectedArticle.updateDate}</span>
                                    </div>
                                    <h2 style={{ fontSize: '32px', fontWeight: '950', color: 'white', margin: 0, lineHeight: '1.2', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{selectedArticle.title}</h2>
                                </div>

                                <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', gap: '10px' }}>
                                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => setIsFullScreen(!isFullScreen)} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => setSelectedArticle(null)} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', cursor: 'pointer', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></motion.button>
                                </div>
                            </div>

                            {/* CONTENT AREA */}
                            <div style={{ padding: '40px', flex: 1, overflowY: 'auto', position: 'relative' }} className="custom-scroll">
                                {/* Blurred Backdrop Content */}
                                {selectedArticle.imageUrl && (
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, width: '100%', height: '400px',
                                        opacity: 0.15, pointerEvents: 'none', zIndex: 0,
                                        maskImage: 'linear-gradient(to bottom, black, transparent)',
                                        WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)'
                                    }}>
                                        <img src={selectedArticle.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(60px)' }} alt="" />
                                    </div>
                                )}

                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{ display: 'flex', gap: '16px', marginBottom: '40px' }}>
                                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => {
                                            const urls = selectedArticle.imageUrls || (selectedArticle.image_url ? selectedArticle.image_url.split(',') : ['']);
                                            setFormData({
                                                title: selectedArticle.title,
                                                content: selectedArticle.content,
                                                category: selectedArticle.category,
                                                type: selectedArticle.type,
                                                imageUrls: urls.length > 0 ? urls : ['']
                                            });
                                            setEditingId(selectedArticle.id);
                                            setShowEditor(true);
                                        }} style={{ flex: 1, padding: '16px', borderRadius: '20px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)', cursor: 'pointer', fontWeight: '900', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                            <Edit2 size={18} /> EDIT
                                        </motion.button>
                                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setDeleteModal({ id: selectedArticle.id, title: selectedArticle.title })} style={{ flex: 1, padding: '16px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', fontWeight: '900', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                            <Trash2 size={18} /> HAPUS
                                        </motion.button>
                                    </div>

                                    <div className="article-content" style={{ fontSize: '17px', lineHeight: '1.9', color: 'rgba(255,255,255,0.92)', whiteSpace: 'pre-wrap' }}>
                                        {(selectedArticle.content || "").split('\n').map((line, i) => {
                                            if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
                                                return <h3 key={i} style={{ color: activeTheme.color, marginTop: '32px', marginBottom: '16px', fontWeight: '950', fontSize: '20px' }}>{line.replace(/\*\*/g, '')}</h3>;
                                            }
                                            return <p key={i} style={{ marginBottom: '16px' }}>{line}</p>;
                                        })}
                                    </div>

                                    {/* Multi Image Gallery */}
                                    {(selectedArticle.imageUrls || []).length > 1 && (
                                        <div style={{ marginTop: '40px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                                <Maximize2 size={16} color={activeTheme.color} />
                                                <span style={{ fontSize: '13px', fontWeight: '900', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px' }}>GALLERY ILUSTRASI</span>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                                {selectedArticle.imageUrls.slice(1).map((url, idx) => (
                                                    <motion.div
                                                        key={idx} whileHover={{ scale: 1.03, y: -5 }}
                                                        onClick={() => setFullscreenImage(url)}
                                                        style={{ height: '180px', borderRadius: '20px', overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}
                                                    >
                                                        <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" loading="lazy" />
                                                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)', display: 'flex', alignItems: 'flex-end', padding: '15px', opacity: 0, transition: 'opacity 0.3s' }} className="gallery-hover">
                                                            <Maximize2 size={18} color="white" />
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
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
                                background: `linear-gradient(90deg, ${activeTheme.color}20, transparent)`,
                                backdropFilter: 'blur(20px)'
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
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 1fr)', gap: '24px' }}>
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
                                                    }}
                                                    onBlur={e => {
                                                        e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                                                        e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';
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
                                                        appearance: 'none', outline: 'none', transition: 'all 0.3s ease'
                                                    }}
                                                >
                                                    {activeTheme.categories.filter(c => c.name !== 'Semua').map(c => (
                                                        <option key={c.name} value={c.name} style={{ background: '#0f172a' }}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* IMAGE URL INPUT */}
                                    {/* MULTI IMAGE URL INPUT */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '900', color: activeTheme.color, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                <Plus size={14} /> Link Gambar Ilustrasi (Multi-Upload Support)
                                            </label>
                                            <motion.button
                                                type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                                onClick={() => setFormData({ ...formData, imageUrls: [...formData.imageUrls, ''] })}
                                                style={{ padding: '6px 14px', borderRadius: '10px', background: `${activeTheme.color}15`, border: `1px solid ${activeTheme.color}30`, color: activeTheme.color, fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}
                                            >
                                                + TAMBAH LINK
                                            </motion.button>
                                        </div>
                                        <div style={{ display: 'grid', gap: '12px' }}>
                                            {formData.imageUrls.map((url, index) => (
                                                <div key={index} style={{ display: 'grid', gridTemplateColumns: url ? '80px 1fr 50px' : '1fr 50px', gap: '16px', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)', padding: '12px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    {url && (
                                                        <div style={{ height: '60px', borderRadius: '12px', overflow: 'hidden', border: `2px solid ${activeTheme.color}40` }}>
                                                            <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                                                        </div>
                                                    )}
                                                    <input
                                                        value={url}
                                                        onChange={e => {
                                                            const newUrls = [...formData.imageUrls];
                                                            newUrls[index] = e.target.value;
                                                            setFormData({ ...formData, imageUrls: newUrls });
                                                        }}
                                                        style={{
                                                            width: '100%', padding: '14px', borderRadius: '12px',
                                                            background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)',
                                                            color: 'white', fontSize: '14px', fontFamily: dashboardFont,
                                                            outline: 'none', transition: 'all 0.3s ease'
                                                        }}
                                                        placeholder={`Link Gambar #${index + 1}...`}
                                                    />
                                                    <motion.button
                                                        type="button" whileHover={{ scale: 1.1, color: '#ef4444' }}
                                                        onClick={() => {
                                                            const newUrls = formData.imageUrls.filter((_, i) => i !== index);
                                                            setFormData({ ...formData, imageUrls: newUrls.length ? newUrls : [''] });
                                                        }}
                                                        style={{ padding: '10px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
                                                    >
                                                        <Trash2 size={18} />
                                                    </motion.button>
                                                </div>
                                            ))}
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

            {/* LIGHTBOX */}
            <AnimatePresence>
                {fullscreenImage && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setFullscreenImage(null)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 99999,
                            background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <img
                                src={fullscreenImage}
                                style={{
                                    maxWidth: '100%', maxHeight: '90vh', borderRadius: '24px',
                                    boxShadow: '0 30px 100px rgba(0,0,0,0.8)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    transform: 'translateZ(0)',
                                    imageRendering: 'auto'
                                }}
                                alt="Full view"
                            />
                            <div style={{ position: 'absolute', bottom: '-60px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '20px' }}>
                                <motion.a
                                    href={fullscreenImage} target="_blank" rel="noopener noreferrer"
                                    whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.2)' }}
                                    style={{
                                        padding: '12px 24px', borderRadius: '30px', background: 'rgba(255,255,255,0.1)',
                                        color: 'white', textDecoration: 'none', fontSize: '13px', fontWeight: '800',
                                        backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)',
                                        display: 'flex', alignItems: 'center', gap: '8px'
                                    }}
                                >
                                    <Maximize2 size={18} /> LIHAT ASLI
                                </motion.a>
                                <motion.button
                                    whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.2)' }}
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = fullscreenImage;
                                        link.download = `artikel-bola-${Date.now()}.png`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                    style={{
                                        padding: '12px 24px', borderRadius: '30px', background: 'rgba(255,255,255,0.1)',
                                        color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', fontWeight: '800',
                                        backdropFilter: 'blur(10px)', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '8px'
                                    }}
                                >
                                    <FileText size={18} /> SIMPAN GAMBAR
                                </motion.button>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                                onClick={() => setFullscreenImage(null)}
                                style={{
                                    position: 'absolute', top: '-60px', right: 0,
                                    width: '44px', height: '44px', borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <X size={24} />
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .custom-scroll::-webkit-scrollbar { width: 5px; }
                .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                @media (max-width: 1000px) {
                    .wiki-main-grid { grid-template-columns: 1fr !important; height: auto !important; }
                }
                .wiki-main-grid > div:nth-child(2) > div > div:hover .img-overlay {
                    opacity: 1 !important;
                }
                [style*="cursor: pointer"]:hover .hero-zoom-hint {
                    opacity: 1 !important;
                }
            `}</style>
        </div>
    );
};

export default WikiHub;

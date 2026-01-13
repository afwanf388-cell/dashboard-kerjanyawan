import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, BookOpen, Clock, Tag, ChevronRight, Search, Target, Activity, BarChart2, ShieldAlert, Award, Edit2, X, ArrowLeft, Cloud, CloudOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const PemahamanBola = () => {
    const { user } = useAuth();

    const [articles, setArticles] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('Semua');
    const [editingId, setEditingId] = useState(null);
    const [syncStatus, setSyncStatus] = useState('Offline');
    const [isInitialLoaded, setIsInitialLoaded] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: 'Taktik'
    });

    const categories = [
        { name: 'Semua', icon: <BookOpen size={18} />, color: '#3b82f6' },
        { name: 'Taktik', icon: <Target size={18} />, color: '#10b981' },
        { name: 'Latihan', icon: <Activity size={18} />, color: '#f59e0b' },
        { name: 'Analisis', icon: <BarChart2 size={18} />, color: '#ec4899' },
        { name: 'Peraturan', icon: <ShieldAlert size={18} />, color: '#ef4444' },
    ];

    const DEFAULT_ARTICLES = [
        {
            id: 1, // MUST BE NUMERIC FOR BIGINT
            title: 'PENGERTIAN VOOR SPORTBOOK',
            category: 'Taktik',
            updateDate: new Date().toLocaleDateString(),
            content: `**0,0 = 0 = Tidak ada voor (leg-legan)**
Contoh pasang Atalanta, taruhan akan menang jika Atalanta menang dengan minimal selisih 1 gol. Bila hasil akhir imbang, taruhan draw (uang kembali).
- Atalanta 1-0 SPAL (menang)
- Atalanta 0-0 SPAL (draw uang kembali)
- Atalanta 0-1 SPAL (kalah)

**0-0,5 = 0,25 = Voor 1/4**
Harus menang berapa? Contoh pasang Atalanta ngepur 1/4 SPAL, taruhan akan menang jika Atalanta menang dengan minimal selisih 1 gol.
- Atalanta 1-0 SPAL (menang)
- Atalanta 0-0 SPAL (kalah setengah dari nominal taruhan)
- Atalanta 0-1 SPAL (kalah)

**0,5 = 0,50 = Voor 1/2**
Harus menang berapa? Contoh pasang Atalanta ngepur 1/2 SPAL, taruhan akan menang jika Atalanta menang dengan minimal selisih 1 gol.
- Atalanta 1-0 SPAL (menang)
- Atalanta 0-0 SPAL (kalah)

**0,5-1 = 0,75 = Voor 3/4**
Harus menang berapa? Contoh pasang Atalanta ngepur 3/4 SPAL, taruhan akan menang jika Atalanta menang dengan minimal selisih 2 gol.
- Atalanta 2-0 SPAL (menang)
- Atalanta 1-0 SPAL (menang setengah)
- Atalanta 0-0 SPAL (kalah)

**1 = 1,0 = Voor 1**
Harus menang berapa? Contoh pasang Atalanta ngepur 1 SPAL, taruhan akan menang jika Atalanta menang dengan minimal selisih 2 gol.
- Atalanta 2-0 SPAL (menang)
- Atalanta 1-0 SPAL (draw uang kembali)
- Atalanta 0-0 SPAL (kalah)

**1-1,5 = 1,25 = Voor 1-1/4**
Harus menang berapa? Contoh pasang Atalanta ngepur 1-1/4 SPAL, taruhan akan menang jika Atalanta menang dengan minimal selisih 2 gol.
- Atalanta 2-0 SPAL (menang)
- Atalanta 1-0 (kalah setengah)
- Atalanta 0-0 SPAL (kalah)

**1,5 = 1,50 = Voor 1-1/2**
Harus menang berapa? Contoh pasang Atalanta ngepur 1-1/2 SPAL, taruhan akan menang jika Atalanta menang dengan minimal selisih 2 gol.
- Atalanta 2-0 (menang)
- Atalanta 1-0 (kalah)

**1,5-2 = 1,75 = Voor 1-3/4**
Harus menang berapa? Contoh pasang Atalanta ngepur 1-3/4 SPAL, taruhan akan menang jika Atalanta menang dengan minimal selisih 3 gol.
- Atalanta 3-0 SPAL (menang)
- Atalanta 2-0 SPAL (menang setengah)
- Atalanta 1-0 SPAL (kalah)

**2 = 2,0 = Voor 2**
Harus menang berapa? Contoh pasang Atalanta ngepur 2 SPAL, taruhan akan menang jika Atalanta menang dengan minimal selisih 3 gol.
- Atalanta 3-0 SPAL (menang)
- Atalanta 2-0 SPAL (draw uang kembali)
- Atalanta 1-0 SPAL (kalah)

**2-2,5 = 2,25 = Voor 2-1/4**
Harus menang berapa? Contoh pasang Atalanta ngepur 2-1/4 SPAL, taruhan akan menang jika Atalanta menang dengan minimal selisih 3 gol.
- Atalanta 3-0 SPAL (menang)
- Atalanta 2-0 SPAL (kalah setengah)
- Atalanta 1-0 SPAL (kalah)

**2,5 = 2,50 = Voor 2-1/2**
Harus menang berapa? Contoh pasang Atalanta ngepur 2-1/2 SPAL, taruhan akan menang jika Atalanta menang dengan minimal selisih 3 gol.
- Atalanta 3-0 SPAL (menang)
- Atalanta 2-0 SPAL (kalah)

**2,5-3 = 2,75 = Voor 2-3/4**
Harus menang berapa? Contoh pasang Atalanta ngepur 2-3/4 SPAL, taruhan akan menang jika Atalanta menang dengan minimal selisih 4 gol.
- Atalanta 4-0 SPAL (menang)
- Atalanta 3-0 SPAL (menang setengah)
- Atalanta 2-0 SPAL (kalah)

**3 = 3,0 = Voor 3**
Harus menang berapa? Contoh pasang Atalanta ngepur 3 SPAL, taruhan akan menang jika Atalanta menang dengan minimal selisih 4 gol.
- Atalanta 4-0 SPAL (menang)
- Atalanta 3-0 SPAL (draw uang kembali)
- Atalanta 2-0 SPAL (kalah)`
        }
    ];

    // Unified Initial Load & Sync Logic
    useEffect(() => {
        if (!supabase || !user?.username) return;

        const syncProcess = async () => {
            setSyncStatus('Syncing...');

            try {
                // 1. Fetch Cloud Data
                const { data: cloudData, error: fetchError } = await supabase
                    .from('bola_articles')
                    .select('*')
                    .eq('user_id', user.username)
                    .order('id', { ascending: true });

                if (fetchError) throw fetchError;

                // 2. Load Local Data (fresh from storage to avoid closure capture issues)
                const savedLocal = localStorage.getItem(`bola_articles_${user.username}`);
                const localData = savedLocal ? JSON.parse(savedLocal) : [];

                if (cloudData && cloudData.length > 0) {
                    const finalData = cloudData.map(item => ({
                        ...item,
                        id: Number(item.id),
                        updateDate: item.update_date || item.updateDate
                    }));
                    setArticles(finalData);
                    localStorage.setItem(`bola_articles_${user.username}`, JSON.stringify(finalData));
                    setSyncStatus('Cloud Connected');
                } else if (localData.length > 0) {
                    setSyncStatus('Backing up...');
                    setArticles(localData);
                    const syncPromises = localData.map(item => syncToCloud(item));
                    await Promise.all(syncPromises);
                    setSyncStatus('Cloud Connected');
                } else {
                    setArticles(DEFAULT_ARTICLES);
                    setSyncStatus('Cloud Ready');
                }

                setIsInitialLoaded(true);
            } catch (err) {
                console.error("Sync Error:", err);
                setSyncStatus('Offline Mode');
                const savedLocal = localStorage.getItem(`bola_articles_${user.username}`);
                if (savedLocal) setArticles(JSON.parse(savedLocal));
                else setArticles(DEFAULT_ARTICLES);
                setIsInitialLoaded(true);
            }
        };

        syncProcess();

        const channel = supabase
            .channel(`bola_articles_${user.username}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'bola_articles',
                filter: `user_id=eq.${user.username}`
            }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    setArticles(prev => {
                        const normalizedItem = {
                            ...payload.new,
                            id: Number(payload.new.id),
                            updateDate: payload.new.update_date || payload.new.updateDate
                        };
                        const exists = prev.find(item => Number(item.id) === normalizedItem.id);
                        if (exists) return prev.map(item => Number(item.id) === normalizedItem.id ? normalizedItem : item);
                        return [...prev, normalizedItem].sort((a, b) => a.id - b.id);
                    });
                } else if (payload.eventType === 'DELETE') {
                    setArticles(prev => prev.filter(item => Number(item.id) !== Number(payload.old.id)));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.username]);

    // Local Backup per User
    useEffect(() => {
        if (user?.username && articles.length > 0) {
            localStorage.setItem(`bola_articles_${user.username}`, JSON.stringify(articles));
        }
    }, [articles, user?.username]);

    const syncToCloud = async (item, action = 'upsert') => {
        if (!supabase || !user) return;

        setSyncStatus('Saving...');

        if (action === 'delete') {
            const { error } = await supabase.from('bola_articles').delete().eq('id', item.id);
            if (!error) setSyncStatus('Cloud Connected');
            else setSyncStatus('Sync Failed');
        } else {
            const { error } = await supabase.from('bola_articles').upsert({
                id: item.id,
                user_id: user.username || 'guest',
                title: item.title,
                content: item.content,
                category: item.category,
                update_date: item.updateDate,
                last_updated: new Date().toISOString()
            });

            if (!error) setSyncStatus('Cloud Connected');
            else setSyncStatus('Sync Failed');
        }
    };

    const saveToLocal = (data) => {
        if (user?.username) {
            localStorage.setItem(`bola_articles_${user.username}`, JSON.stringify(data));
        }
        setArticles(data);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingId) {
            const updatedItem = { ...articles.find(a => a.id === editingId), ...formData, updateDate: new Date().toLocaleDateString() };
            const updatedArticles = articles.map(a =>
                a.id === editingId ? updatedItem : a
            );
            saveToLocal(updatedArticles);
            syncToCloud(updatedItem);
            // Update selected article if it was the one being edited
            if (selectedArticle?.id === editingId) {
                setSelectedArticle(updatedItem);
            }
        } else {
            const newItem = {
                ...formData,
                id: Date.now(),
                updateDate: new Date().toLocaleDateString()
            };
            saveToLocal([...articles, newItem]);
            syncToCloud(newItem);
        }
        setShowModal(false);
        setEditingId(null);
        setFormData({ title: '', content: '', category: 'Taktik' });
    };

    const handleEdit = (article) => {
        setFormData({
            title: article.title,
            content: article.content,
            category: article.category
        });
        setEditingId(article.id);
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Hapus artikel ini?')) {
            const deletedItem = articles.find(a => a.id === id);
            saveToLocal(articles.filter(a => a.id !== id));
            if (deletedItem) syncToCloud(deletedItem, 'delete');
            if (selectedArticle?.id === id) setSelectedArticle(null);
        }
    };

    const filteredArticles = articles.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'Semua' || a.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="bola-layout">

            {/* Left Sidebar: Categories */}
            <div className="bola-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="glass-effect" style={{ padding: '20px', borderRadius: '20px' }}>
                    <h3 className="hide-mobile" style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '20px', letterSpacing: '1px' }}>EXPLORE TOPICS</h3>
                    <div className="bola-categories-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {categories.map(cat => (
                            <button
                                key={cat.name}
                                onClick={() => setActiveCategory(cat.name)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                                    borderRadius: '12px', cursor: 'pointer',
                                    background: activeCategory === cat.name ? `linear-gradient(135deg, ${cat.color}22, ${cat.color}11)` : 'transparent',
                                    color: activeCategory === cat.name ? cat.color : 'var(--text-muted)',
                                    fontWeight: '700', fontSize: '14px', transition: 'all 0.3s ease',
                                    border: activeCategory === cat.name ? `1px solid ${cat.color}33` : '1px solid transparent'
                                }}
                            >
                                {cat.icon} {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="glass-effect"
                    style={{ padding: '20px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), transparent)', border: '1px solid rgba(16,185,129,0.2)', cursor: 'pointer' }}
                    onClick={() => setShowModal(true)}
                >
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '16px' }}>
                        <Plus size={24} />
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'white', marginBottom: '4px' }}>Tulis Artikel</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>Bagikan wawasan taktik atau analisis bola kamu.</p>
                </motion.div>
            </div>

            {/* Middle Column: Article List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '8px' }}>
                <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                    <input
                        placeholder="Cari artikel pemahaman..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px', fontSize: '14px' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredArticles.map(article => (
                        <motion.div
                            key={article.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => setSelectedArticle(article)}
                            style={{
                                padding: '20px', cursor: 'pointer', borderRadius: '20px', transition: 'all 0.3s ease',
                                background: selectedArticle?.id === article.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${selectedArticle?.id === article.id ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.05)'}`,
                                position: 'relative', overflow: 'hidden'
                            }}
                        >
                            {selectedArticle?.id === article.id && (
                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--primary)' }} />
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <span style={{
                                    padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '900',
                                    background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {article.category.toUpperCase()}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} /> {article.updateDate}
                                </span>
                            </div>
                            <h4 style={{ fontSize: '17px', fontWeight: '800', color: 'white', lineHeight: '1.4' }}>{article.title}</h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {article.content}
                            </p>
                        </motion.div>
                    ))}
                    {filteredArticles.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <BookOpen size={32} color="var(--text-muted)" />
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Belum ada artikel di kategori ini.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Reader View */}
            {selectedArticle && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-effect bola-reader"
                    style={{
                        borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.9))'
                    }}
                >
                    <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button
                                    onClick={() => setSelectedArticle(null)}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px' }}
                                    title="Kembali"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <div style={{ padding: '6px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><Award size={18} /></div>
                                <div>
                                    <p style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expert Insights</p>
                                    <p style={{ fontSize: '11px', color: 'white', fontWeight: '600' }}>Admin Wiki</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => handleEdit(selectedArticle)}
                                    style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Edit Artikel"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(selectedArticle.id)}
                                    style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Hapus Artikel"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <button
                                    onClick={() => setSelectedArticle(null)}
                                    style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Tutup"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <h2 style={{ fontSize: 'clamp(24px, 6vw, 36px)', fontWeight: '900', color: 'white', lineHeight: '1.2', marginBottom: '20px', wordBreak: 'break-word' }}>{selectedArticle.title}</h2>

                        <div style={{ display: 'flex', gap: '16px', marginBottom: '40px', padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '12px', fontWeight: '700' }}>
                                <Tag size={14} /> {selectedArticle.category}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600' }}>
                                <Clock size={14} /> Diperbarui {selectedArticle.updateDate}
                            </div>
                        </div>

                        <div style={{ fontSize: '17px', lineHeight: '1.9', color: 'rgba(255,255,255,0.9)', whiteSpace: 'pre-wrap' }}>
                            {selectedArticle.content}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Premium Modal Editor */}
            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(15px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className="glass-effect"
                            style={{ width: '100%', maxWidth: '650px', padding: '0', overflow: 'hidden', borderRadius: '24px' }}
                        >
                            <div style={{ padding: '32px', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), transparent)', borderBottom: '1px solid var(--glass-border)' }}>
                                <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>{editingId ? 'Edit Wawasan Bola' : 'Tambah Wawasan Bola'}</h3>
                                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>{editingId ? 'Sesuaikan detail taktik atau panduan yang sudah ada.' : 'Simpan pengetahuan taktik atau manajemen tim kamu di sini.'}</p>
                            </div>
                            <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
                                <div style={{ display: 'grid', gap: '24px' }}>
                                    <div className="bola-modal-grid">
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>JUDUL ARTIKEL</label>
                                            <input required placeholder="Contoh: Analisis Deep Block..." value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} style={{ width: '100%', padding: '14px', borderRadius: '12px' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>KATEGORI</label>
                                            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={{ width: '100%', padding: '14px', borderRadius: '12px' }}>
                                                <option value="Taktik">Taktik</option>
                                                <option value="Latihan">Latihan</option>
                                                <option value="Analisis">Analisis</option>
                                                <option value="Peraturan">Peraturan</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>ISI KONTEN / WAWASAN</label>
                                        <textarea required rows="8" placeholder="Tuliskan detail pemahaman kamu di sini..." value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} style={{ width: '100%', padding: '16px', borderRadius: '16px', lineHeight: '1.6' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                                    <button type="button" onClick={() => { setShowModal(false); setEditingId(null); setFormData({ title: '', content: '', category: 'Taktik' }); }} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', fontWeight: '700' }}>Batal</button>
                                    <button type="submit" style={{ flex: 1.5, padding: '14px', borderRadius: '14px', background: '#10b981', color: 'white', border: 'none', fontWeight: '900', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)' }}>{editingId ? 'Simpan Perubahan' : 'Publikasikan Artikel'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .bola-layout {
                    display: grid;
                    grid-template-columns: ${selectedArticle ? '260px 1fr 1.5fr' : '260px 1fr'};
                    gap: 24px;
                    height: calc(100vh - 120px);
                }
                .bola-modal-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 20px;
                }

                @media (max-width: 1024px) {
                    .bola-layout {
                        display: flex;
                        flex-direction: column;
                        height: auto;
                        gap: 16px;
                    }
                    .bola-sidebar {
                        order: 2;
                    }
                    .bola-categories-scroll {
                        flex-direction: row !important;
                        overflow-x: auto;
                        padding-bottom: 8px;
                        scrollbar-width: none;
                    }
                    .bola-categories-scroll::-webkit-scrollbar {
                        display: none;
                    }
                    .bola-categories-scroll button {
                        white-space: nowrap;
                        flex-shrink: 0;
                    }
                    .hide-mobile {
                        display: none;
                    }
                    /* Article List */
                    .bola-layout > div:nth-child(2) {
                        order: 1;
                        max-height: 500px;
                    }
                    /* On mobile, if an article is selected, it should take over or sit on top */
                    .bola-reader {
                        position: fixed;
                        top: 0; left: 0; right: 0; bottom: 0;
                        z-index: 1000;
                        margin: 0 !important;
                        border-radius: 0 !important;
                        height: 100dvh;
                        width: 100vw;
                    }
                    .bola-modal-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div >
    );
};

export default PemahamanBola;

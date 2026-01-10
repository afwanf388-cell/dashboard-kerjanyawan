import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Trash2, Edit2, Search, Key, Mail, User, FileText,
    Eye, EyeOff, Copy, Check, Shield, Lock, X, Globe,
    Calendar, MoreVertical, ExternalLink, Cloud, CloudOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const DataLogin = () => {
    const { user } = useAuth();

    // Key localStorage yang unik per user agar data tidak tertukar
    const STORAGE_KEY = user?.username ? `app_login_data_${user.username}` : null;

    const [logins, setLogins] = useState([]);
    const [isInitialLoaded, setIsInitialLoaded] = useState(false);

    // Initial Load based on USER
    useEffect(() => {
        if (user?.username) {
            // Bersihkan state dulu sebelum load data user baru
            setLogins([]);
            setIsInitialLoaded(false);

            const saved = localStorage.getItem(`app_login_data_${user.username}`);
            if (saved) {
                try {
                    setLogins(JSON.parse(saved));
                } catch (e) {
                    setLogins([]);
                }
            } else {
                setLogins([]);
            }
            setIsInitialLoaded(true);
        } else {
            setLogins([]);
            setIsInitialLoaded(false);
        }
    }, [user?.username]);

    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        username: '',
        email: '',
        password: '',
        website: '',
        description: ''
    });
    const [editingId, setEditingId] = useState(null);
    const [showPassword, setShowPassword] = useState({});
    const [copiedId, setCopiedId] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [syncStatus, setSyncStatus] = useState('Offline');

    // Unified Initial Load & Sync Logic
    useEffect(() => {
        if (!supabase || !user?.username) return;

        const syncProcess = async () => {
            setSyncStatus('Syncing...');

            try {
                // 1. Fetch Cloud Data
                const { data: cloudData, error: fetchError } = await supabase
                    .from('login_data')
                    .select('*')
                    .eq('user_id', user.username)
                    .order('id', { ascending: false });

                if (fetchError) throw fetchError;

                // 2. Load Local Data (fresh from storage to avoid closure issues)
                const savedLocal = localStorage.getItem(`app_login_data_${user.username}`);
                const localData = savedLocal ? JSON.parse(savedLocal) : [];

                if (cloudData && cloudData.length > 0) {
                    // Cloud has data - prioritize it
                    setLogins(cloudData);
                    setSyncStatus('Cloud Connected');
                } else if (localData.length > 0) {
                    // Cloud empty but local has data - Back up to cloud
                    setSyncStatus('Backing up...');
                    setLogins(localData);
                    const syncPromises = localData.map(item => syncToCloud(item));
                    await Promise.all(syncPromises);
                    setSyncStatus('Cloud Connected');
                } else {
                    setSyncStatus('Cloud Ready');
                }

                setIsInitialLoaded(true);
            } catch (err) {
                console.error("Sync Error:", err);
                setSyncStatus('Offline Mode');
                const savedLocal = localStorage.getItem(`app_login_data_${user.username}`);
                if (savedLocal) setLogins(JSON.parse(savedLocal));
                setIsInitialLoaded(true);
            }
        };

        syncProcess();

        const channel = supabase
            .channel(`login_data_${user.username}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'login_data',
                filter: `user_id=eq.${user.username}`
            }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    setLogins(prev => {
                        const exists = prev.find(l => l.id === payload.new.id);
                        if (exists) return prev.map(l => l.id === payload.new.id ? payload.new : l);
                        return [payload.new, ...prev];
                    });
                } else if (payload.eventType === 'DELETE') {
                    setLogins(prev => prev.filter(l => l.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.username]);

    // Local Backup & Cloud Sync
    useEffect(() => {
        if (!user?.username || !isInitialLoaded) return;
        localStorage.setItem(`app_login_data_${user.username}`, JSON.stringify(logins));
    }, [logins, user?.username, isInitialLoaded]);

    const syncToCloud = async (loginItem, action = 'upsert') => {
        if (!supabase || !user) return;

        setSyncStatus('Saving...');

        if (action === 'delete') {
            const { error } = await supabase.from('login_data').delete().eq('id', loginItem.id);
            if (!error) setSyncStatus('Cloud Connected');
            else setSyncStatus('Sync Failed');
        } else {
            const { error } = await supabase.from('login_data').upsert({
                id: loginItem.id,
                user_id: user.username, // Hilangkan fallback 'guest' agar tidak bocor
                title: loginItem.title,
                username: loginItem.username,
                email: loginItem.email,
                password: loginItem.password,
                website: loginItem.website || '',
                description: loginItem.description || '',
                created_date: loginItem.createdDate,
                last_updated: new Date().toISOString()
            });

            if (!error) setSyncStatus('Cloud Connected');
            else setSyncStatus('Sync Failed');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Cek minimal Judul Akun terisi
        if (!formData.title) {
            alert('Judul Akun wajib diisi!');
            return;
        }

        const item = {
            ...formData,
            id: editingId || Date.now(),
            createdDate: editingId
                ? logins.find(l => l.id === editingId)?.createdDate
                : new Date().toLocaleDateString('id-ID'),
            password: btoa(formData.password || '') // Encode password jika ada
        };

        if (editingId) {
            setLogins(prev => prev.map(l => l.id === editingId ? item : l));
        } else {
            setLogins(prev => [item, ...prev]);
        }

        // Sync to Cloud
        syncToCloud(item);

        setShowModal(false);
        resetForm();
    };

    const resetForm = () => {
        setFormData({ title: '', username: '', email: '', password: '', website: '', description: '' });
        setEditingId(null);
    };

    const handleDelete = (id) => {
        if (window.confirm('Hapus data login ini secara permanen?')) {
            const deletedItem = logins.find(l => l.id === id);
            setLogins(prev => prev.filter(l => l.id !== id));

            // Sync delete to Cloud
            if (deletedItem) syncToCloud(deletedItem, 'delete');
        }
        setActiveDropdown(null);
    };

    const handleEdit = (item) => {
        setFormData({
            ...item,
            password: item.password ? atob(item.password) : '',
            website: item.website || ''
        });
        setEditingId(item.id);
        setShowModal(true);
        setActiveDropdown(null);
    };

    const togglePassword = (id) => {
        setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copyToClipboard = async (text, id) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Gagal menyalin');
        }
    };

    const getDecryptedPassword = (encrypted) => {
        if (!encrypted) return '';
        try { return atob(encrypted); } catch { return '••••••••'; }
    };

    const filteredLogins = logins.filter(l =>
        (l.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.username || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.email || '').toLowerCase().includes(search.toLowerCase())
    );

    const getInitials = (text) => {
        if (!text) return '??';
        return text.substring(0, 2).toUpperCase();
    };

    const getRandomColor = (str) => {
        const colors = [
            'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            'linear-gradient(135deg, #10b981, #059669)',
            'linear-gradient(135deg, #f59e0b, #d97706)',
            'linear-gradient(135deg, #ef4444, #dc2626)',
            'linear-gradient(135deg, #ec4899, #db2777)',
            'linear-gradient(135deg, #06b6d4, #0891b2)'
        ];
        let hash = 0;
        for (let i = 0; i < (str || '').length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div style={{ minHeight: 'calc(100vh - 100px)' }}>
            {/* Header */}
            <header style={{
                marginBottom: '32px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '20px'
            }}>
                <div>
                    <motion.h2
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}
                    >
                        <div style={{
                            padding: '10px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            display: 'flex',
                            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                            flexShrink: 0
                        }}>
                            <Key size={24} />
                        </div>
                        <span style={{ wordBreak: 'break-word' }}>Data Login (v2.0)</span>
                    </motion.h2>
                    <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                        <Shield size={16} /> Kelola akun dan password kamu • {logins.length} tersimpan
                    </p>
                </div>
                <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { resetForm(); setShowModal(true); }}
                    style={{
                        padding: '14px 28px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        color: 'white',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontWeight: '700',
                        fontSize: '15px',
                        boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)',
                        cursor: 'pointer'
                    }}
                >
                    <Plus size={20} /> Tambah Akun Baru
                </motion.button>
            </header>

            {/* Search Bar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-effect"
                style={{ padding: '20px', marginBottom: '32px', borderRadius: '18px' }}
            >
                <div style={{ position: 'relative', maxWidth: '600px' }}>
                    <Search size={20} style={{
                        position: 'absolute',
                        left: '18px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)'
                    }} />
                    <input
                        type="text"
                        placeholder="Cari berdasarkan judul, username, atau email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '16px 16px 16px 54px',
                            fontSize: '15px',
                            borderRadius: '14px',
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid var(--glass-border)',
                            color: 'white',
                            outline: 'none'
                        }}
                    />
                </div>
            </motion.div>

            {/* Cards Grid */}
            <div className="login-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))',
                gap: '24px'
            }}>
                <AnimatePresence mode="popLayout">
                    {filteredLogins.map((login, index) => (
                        <motion.div
                            key={login.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(59, 130, 246, 0.1)' }}
                            layout
                            className="glass-effect"
                            style={{
                                padding: '24px',
                                position: 'relative',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '18px',
                                border: '1px solid rgba(255,255,255,0.06)',
                                background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.4))',
                                backdropFilter: 'blur(16px)'
                            }}
                        >
                            {/* Decorative Top Bar */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: getRandomColor(login.title || login.username), opacity: 0.8 }} />

                            {/* Status Badge */}
                            <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div style={{
                                    padding: '4px 10px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.1)',
                                    color: '#10b981', fontSize: '10px', fontWeight: '800', display: 'flex',
                                    alignItems: 'center', gap: '4px', border: '1px solid rgba(16, 185, 129, 0.2)'
                                }}>
                                    <Shield size={10} /> SECURED
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setActiveDropdown(activeDropdown === login.id ? null : login.id)}
                                        style={{ background: 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '8px', padding: '6px', color: 'var(--text-muted)', cursor: 'pointer' }}
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                    <AnimatePresence>
                                        {activeDropdown === login.id && (
                                            <motion.div initial={{ opacity: 0, scale: 0.9, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                                                style={{ position: 'absolute', right: 0, top: '100%', marginTop: '8px', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '8px', minWidth: '150px', zIndex: 100, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                                            >
                                                <button onClick={() => handleEdit(login)} style={{ width: '100%', padding: '10px 12px', background: 'none', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                                                    <Edit2 size={14} color="var(--primary)" /> Edit
                                                </button>
                                                <button onClick={() => handleDelete(login.id)} style={{ width: '100%', padding: '10px 12px', background: 'none', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                                                    <Trash2 size={14} /> Hapus
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Profile Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginTop: '10px' }}>
                                <div style={{
                                    width: '64px', height: '64px', borderRadius: '20px',
                                    background: getRandomColor(login.title || login.username),
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '22px', fontWeight: '900', color: 'white',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                                    border: '3px solid rgba(255,255,255,0.1)'
                                }}>
                                    {getInitials(login.title || login.username)}
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <h4 style={{ fontSize: '20px', fontWeight: '900', color: 'white', marginBottom: '4px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                        {login.title}
                                    </h4>

                                </div>
                            </div>

                            {/* Compartment: Credentials */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {login.username && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.2)', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', top: '-10px', left: '-10px', width: '40px', height: '40px', background: 'rgba(16, 185, 129, 0.2)', filter: 'blur(20px)', borderRadius: '50%' }} />
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={18} /></div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <p style={{ fontSize: '10px', color: '#10b981', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Username</p>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                                            </div>
                                            <p style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{login.username}</p>
                                        </div>
                                        <button onClick={() => copyToClipboard(login.username, `user-${login.id}`)} style={{ background: 'rgba(255,255,255,0.03)', border: 'none', color: copiedId === `user-${login.id}` ? '#10b981' : 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                                            {copiedId === `user-${login.id}` ? <Check size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                )}
                                {login.email && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'rgba(15, 23, 42, 0.3)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.3s' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Mail size={16} /></div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email / Info</p>
                                            <p style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{login.email}</p>
                                        </div>
                                        <button onClick={() => copyToClipboard(login.email, `email-${login.id}`)} style={{ background: 'rgba(255,255,255,0.03)', border: 'none', color: copiedId === `email-${login.id}` ? '#10b981' : 'var(--text-muted)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                                            {copiedId === `email-${login.id}` ? <Check size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                )}

                                {login.password && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'rgba(15, 23, 42, 0.3)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={16} /></div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password / PIN</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <p style={{ fontSize: '13px', fontWeight: '800', fontFamily: 'monospace', letterSpacing: showPassword[login.id] ? '0' : '3px', color: '#8b5cf6' }}>
                                                    {showPassword[login.id] ? getDecryptedPassword(login.password) : '••••••••'}
                                                </p>
                                                <button onClick={() => togglePassword(login.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '0', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                    {showPassword[login.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                        <button onClick={() => copyToClipboard(getDecryptedPassword(login.password), `pass-${login.id}`)} style={{ background: 'rgba(255,255,255,0.03)', border: 'none', color: copiedId === `pass-${login.id}` ? '#10b981' : 'var(--text-muted)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                                            {copiedId === `pass-${login.id}` ? <Check size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Compartment: Notes */}
                            {login.description && (
                                <div style={{ padding: '14px', background: 'rgba(0,0,0,0.2)', borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <FileText size={12} color="var(--primary)" />
                                        <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Catatan</span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{login.description}</p>
                                </div>
                            )}

                            {/* Action: Website */}
                            {login.website && (
                                <motion.a
                                    href={login.website.startsWith('http') ? login.website : `https://${login.website}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    whileHover={{ background: 'rgba(59, 130, 246, 0.2)', scale: 1.02 }}
                                    style={{
                                        marginTop: 'auto',
                                        padding: '12px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        color: 'var(--primary)',
                                        textDecoration: 'none',
                                        fontSize: '13px',
                                        fontWeight: '800',
                                        border: '1px solid rgba(59, 130, 246, 0.2)',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <Globe size={16} /> Buka Link Website <ExternalLink size={12} />
                                </motion.a>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Premium Modal Editor */}
            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} className="glass-effect" style={{ width: '100%', maxWidth: '520px', padding: 0, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
                            {/* Modal Header */}
                            <div style={{ padding: '32px 32px 24px', borderBottom: '1px solid var(--glass-border)', background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.1), transparent)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                                        <div style={{ padding: '14px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)' }}>
                                            {editingId ? <Edit2 size={26} color="white" /> : <Shield size={26} color="white" />}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '6px', color: 'white' }}>{editingId ? 'Edit Akses Akun' : 'Amankan Akun Baru'}</h3>
                                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>Simpan kredensial kamu dengan enkripsi lokal</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                                </div>
                            </div>

                            {/* Modal Form */}
                            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                        <FileText size={16} /> Judul Akun (Wajib)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Contoh: Facebook Admin, PIN Bank, dll"
                                        style={{ width: '100%', height: '52px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0 16px', color: 'white', outline: 'none' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                            <User size={16} /> Username
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                                            placeholder="Opsional"
                                            style={{ width: '100%', height: '52px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0 16px', color: 'white', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                            <Mail size={16} /> Email / Info Lain
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="Opsional / Bebas Isi"
                                            style={{ width: '100%', height: '52px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0 16px', color: 'white', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                        <Lock size={16} /> Password / PIN
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Opsional / Bebas Isi"
                                        style={{ width: '100%', height: '52px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0 16px', color: 'white', outline: 'none' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                        <Globe size={16} /> Link Website
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.website}
                                        onChange={e => setFormData({ ...formData, website: e.target.value })}
                                        placeholder="https://google.com"
                                        style={{ width: '100%', height: '52px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0 16px', color: 'white', outline: 'none', marginBottom: '20px' }}
                                    />

                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                        <FileText size={16} /> Catatan (Opsional)
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Tambahkan info tambahan di sini..."
                                        style={{ width: '100%', minHeight: '100px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '16px', color: 'white', outline: 'none', resize: 'vertical', fontSize: '14px', lineHeight: '1.5' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', fontWeight: '700', cursor: 'pointer' }}>Batal</button>
                                    <button onClick={handleSubmit} style={{ flex: 1, padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white', border: 'none', fontWeight: '800', fontSize: '15px', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)', cursor: 'pointer' }}>{editingId ? 'Update Akses' : 'Simpan Akses'}</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <style>{`
                @media (max-width: 768px) {
                    .login-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div >
    );
};

export default DataLogin;

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
    Plus, Wallet, TrendingUp, TrendingDown, Award, Banknote,
    Trash2, Search, GripHorizontal, Coins, Landmark, Zap, X,
    Save, ChevronDown, ChevronUp, Edit2, RotateCcw
} from 'lucide-react';

/* =========================
   UTIL
========================= */
const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);

const Keuangan = () => {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [syncStatus, setSyncStatus] = useState('🟢 Sinkronisasi Cloud OK');

    // Gold Price State
    // Default manual price or fallback
    const [goldPrice, setGoldPrice] = useState(1360000);
    const [isPriceManual, setIsPriceManual] = useState(false);
    const [tempPrice, setTempPrice] = useState('');

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    // Batch Form State
    const [formData, setFormData] = useState({
        gaji: '',
        bonus: '',
        thr: '',
        emas: '', // Grams
        pinjaman: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedDates, setExpandedDates] = useState({});

    /* =========================
       EFFECTS
    ========================= */
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch Gold Price (Only if not manual)
    useEffect(() => {
        const loadPrice = async () => {
            const savedPrice = localStorage.getItem('aceh_gold_price');
            const savedMode = localStorage.getItem('is_gold_manual');

            if (savedMode === 'true' && savedPrice) {
                setGoldPrice(Number(savedPrice));
                setIsPriceManual(true);
            } else {
                try {
                    const response = await fetch('https://logammulia-api.vercel.app/api/antam');
                    if (response.ok) {
                        const result = await response.json();
                        if (result.data && result.data[0]) {
                            setGoldPrice(Number(result.data[0].harga));
                        }
                    }
                } catch (e) {
                    console.warn("Gold price API failed");
                }
            }
        };
        loadPrice();
    }, []);

    /* =========================
       FETCH DATA
    ========================= */
    const fetchData = useCallback(async () => {
        if (!user?.username) return;
        setLoading(true);
        try {
            const localKey = `finance_trx_${user.username}`;
            const cached = localStorage.getItem(localKey);
            if (cached) setTransactions(JSON.parse(cached));

            if (supabase) {
                const { data, error } = await supabase
                    .from('financial_records')
                    .select('*')
                    .eq('user_id', user.username)
                    .order('date', { ascending: false });

                if (error) throw error;
                if (data) {
                    setTransactions(data);
                    localStorage.setItem(localKey, JSON.stringify(data));
                    setSyncStatus('🟢 Sinkronisasi Awan OK');
                } else {
                    setSyncStatus('🔴 Sinkronisasi Awan Kosong');
                }
            }
        } catch (err) {
            console.error("Fetch Error:", err);
            setSyncStatus('🔴 Offline / Error Fetch');
        } finally {
            setLoading(false);
        }
    }, [user?.username]);

    useEffect(() => {
        fetchData();
        const channel = supabase?.channel(`financial_records_${user?.username}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'financial_records',
                filter: `user_id=eq.${user?.username}`
            }, () => fetchData())
            .subscribe();
        return () => { if (channel) supabase.removeChannel(channel); };
    }, [user?.username, fetchData]);

    /* =========================
       LOGIC: BATCH & MANUAL PRICE
    ========================= */
    const handleGoldPriceSave = () => {
        const p = Number(tempPrice.replace(/[^0-9]/g, ''));
        if (p > 0) {
            setGoldPrice(p);
            setIsPriceManual(true);
            localStorage.setItem('aceh_gold_price', p);
            localStorage.setItem('is_gold_manual', 'true');
            setShowPriceModal(false);
        }
    };

    const handleResetPrice = async () => {
        setIsPriceManual(false);
        localStorage.removeItem('aceh_gold_price');
        localStorage.setItem('is_gold_manual', 'false');
        try {
            const response = await fetch('https://logammulia-api.vercel.app/api/antam');
            if (response.ok) {
                const result = await response.json();
                if (result.data && result.data[0]) {
                    setGoldPrice(Number(result.data[0].harga));
                }
            }
        } catch (e) { }
        setShowPriceModal(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newRecords = [];
        const types = ['gaji', 'bonus', 'thr', 'emas', 'pinjaman'];
        const timestamp = Date.now();

        types.forEach((type, index) => {
            const valStr = formData[type];
            if (valStr && valStr !== '0' && valStr !== '') {
                const cleanAmount = type === 'emas'
                    ? parseFloat(valStr.toString().replace(',', '.'))
                    : Number(valStr.toString().replace(/[^0-9]/g, ''));

                if (cleanAmount > 0) {
                    newRecords.push({
                        id: timestamp + index,
                        user_id: user.username,
                        type: type,
                        amount: cleanAmount,
                        description: formData.description || `Input ${type} batch`,
                        date: formData.date
                    });
                }
            }
        });

        if (newRecords.length === 0) {
            alert("Mohon isi minimal satu kategori!");
            return;
        }

        const updated = [...newRecords, ...transactions];
        setTransactions(updated);
        localStorage.setItem(`finance_trx_${user.username}`, JSON.stringify(updated));

        setShowModal(false);
        setFormData({
            gaji: '', bonus: '', thr: '', emas: '', pinjaman: '',
            description: '', date: new Date().toISOString().split('T')[0]
        });

        try {
            const recordsToInsert = newRecords.map(({ id, ...rest }) => rest);
            const { error } = await supabase.from('financial_records').insert(recordsToInsert);
            if (error) throw error;
            setSyncStatus('🟢 Sinkronisasi Awan OK');
        } catch (err) {
            setSyncStatus('🔴 Gagal Upload (Disimpan Lokal)');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Hapus transaksi ini?")) return;
        const updated = transactions.filter(t => t.id !== id);
        setTransactions(updated);
        localStorage.setItem(`finance_trx_${user.username}`, JSON.stringify(updated));
        try { await supabase.from('financial_records').delete().eq('id', id); } catch (err) { }
    };

    const toggleDate = (date) => {
        setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
    };

    // Calculate Stats
    const stats = useMemo(() => {
        const sum = (t) => t.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const byType = (type) => transactions.filter(t => t.type === type);

        const totalGaji = sum(byType('gaji'));
        const totalBonus = sum(byType('bonus'));
        const totalTHR = sum(byType('thr'));
        const totalEmasGrams = sum(byType('emas'));
        const totalPinjaman = sum(byType('pinjaman'));

        const totalEmasValue = totalEmasGrams * goldPrice;
        const totalPemasukan = totalGaji + totalBonus + totalTHR + totalEmasValue;
        const saldoBersih = totalPemasukan - totalPinjaman;

        return { totalGaji, totalBonus, totalTHR, totalEmasGrams, totalEmasValue, totalPinjaman, saldoBersih };
    }, [transactions, goldPrice]);

    // Group Transactions By Date
    const groupedTransactions = useMemo(() => {
        const groups = {};
        transactions.forEach(t => {
            if (!groups[t.date]) groups[t.date] = { date: t.date, items: [], totalIn: 0, totalOut: 0, goldDelta: 0, types: new Set() };
            groups[t.date].items.push(t);
            groups[t.date].types.add(t.type);

            if (t.type === 'pinjaman') {
                groups[t.date].totalOut += Math.abs(t.amount);
            } else if (t.type === 'emas') {
                groups[t.date].goldDelta += Number(t.amount);
            } else {
                groups[t.date].totalIn += Number(t.amount);
            }
        });

        // Convert to array and sort
        const arr = Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));

        // Filter by search
        if (!searchTerm) return arr;
        return arr.filter(g =>
            g.items.some(i => i.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            g.date.includes(searchTerm)
        );
    }, [transactions, searchTerm]);

    const handleInputChange = (e, field) => {
        let val = e.target.value;
        if (field !== 'emas' && field !== 'description' && field !== 'date') val = val.replace(/\D/g, '');
        setFormData(prev => ({ ...prev, [field]: val }));
    };

    /* =========================
       RENDER
    ========================= */
    return (
        <div className="keuangan-container">
            <style>{`
                :root {
                    --primary: #3b82f6; --primary-dark: #1d4ed8;
                    --bg-dark: #0f172a; --bg-card: rgba(30, 41, 59, 0.7);
                    --text-main: #f8fafc; --text-muted: #94a3b8;
                    --glass-border: rgba(255, 255, 255, 0.08);
                }
                .keuangan-container {
                    padding: ${isMobile ? '16px' : '40px'};
                    min-height: 100vh; color: var(--text-main); font-family: 'Inter', sans-serif;
                    background: radial-gradient(circle at top right, #1e293b 0%, #0f172a 60%);
                }
                .glass-card {
                    background: var(--bg-card); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                    border: 1px solid var(--glass-border); border-radius: 24px; padding: 24px;
                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1); transition: transform 0.2s ease;
                }
                .hero-card {
                    background: linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%);
                    border: 1px solid rgba(6, 182, 212, 0.3); text-align: center; position: relative; overflow: hidden;
                    padding: 40px; border-radius: 32px; margin-bottom: 32px;
                }
                .btn-primary {
                    background: linear-gradient(90deg, #3b82f6, #06b6d4); border: none; padding: 12px 24px;
                    border-radius: 16px; color: white; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px;
                    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3); transition: all 0.2s;
                }
                .btn-primary:active { transform: scale(0.95); }
                .search-bar {
                    background: rgba(15, 23, 42, 0.6); border: 1px solid var(--glass-border); border-radius: 12px;
                    padding: 10px 16px; color: white; width: 100%; outline: none;
                }
                .trx-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; margin-top: 16px; }
                .trx-table th { text-align: left; padding: 16px; color: var(--text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
                .trx-row { background: rgba(255,255,255,0.03); transition: all 0.2s; cursor: pointer; }
                .trx-row:hover { background: rgba(255,255,255,0.05); }
                .trx-row td { padding: 16px; border-top: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); }
                .trx-row td:first-child { border-left: 1px solid var(--glass-border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
                .trx-row td:last-child { border-right: 1px solid var(--glass-border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
                
                .badge { padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 4px; display: inline-block; margin-bottom: 4px;}
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 50; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
                .modal-content { width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; background: #1e293b; border-radius: 24px; padding: 24px; border: 1px solid var(--glass-border); }
                .batch-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 16px; }
                .form-group { margin-bottom: 16px; }
                .form-label { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-bottom: 8px; font-weight: 600; text-transform: uppercase; }
                .form-input { 
                    width: 100%; background: #0f172a; border: 1px solid var(--glass-border); color: white; 
                    padding: 12px; border-radius: 12px; font-size: 16px; outline: none; transition: border-color 0.2s; 
                }
                .form-input:focus { border-color: var(--primary); }
                .grid-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 32px; }
            `}</style>

            {/* HERDER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '900', background: 'linear-gradient(to right, #60a5fa, #2dd4bf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                        Wealth Command
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: syncStatus.includes('OK') ? '#4ade80' : '#f87171' }}>
                        <Zap size={14} /> <span style={{ fontSize: '12px', fontWeight: '600' }}>{syncStatus}</span>
                    </div>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={20} /> Input Rekapan
                </button>
            </div>

            {/* HERO */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="hero-card">
                <Wallet size={120} style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1, transform: 'rotate(15deg)', color: 'white' }} />
                <p style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '12px', fontWeight: '700', marginBottom: '8px', opacity: 0.8 }}>Total Kekayaan Bersih</p>
                <h2 style={{ fontSize: '48px', fontWeight: '800', margin: 0, textShadow: '0 0 30px rgba(6, 182, 212, 0.4)' }}>
                    {formatRupiah(stats.saldoBersih)}
                </h2>

                {/* Gold Price Control */}
                <div style={{ marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(234, 179, 8, 0.15)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                    <Coins size={16} className="text-yellow-400" />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#facc15' }}>
                            {isPriceManual ? 'Harga Emas (Manual/Aceh)' : 'Harga Emas Nasional'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'white' }}>{formatRupiah(goldPrice)} /gram</span>
                    </div>
                    <button onClick={() => { setTempPrice(goldPrice.toString()); setShowPriceModal(true); }} className="hover:bg-white/10 p-1 rounded-full transition">
                        <Edit2 size={12} className="text-yellow-400" />
                    </button>
                </div>
            </motion.div>

            {/* STATS */}
            <div className="grid-stats">
                <StatCard title="Gaji" value={stats.totalGaji} icon={<Banknote size={20} color="#60a5fa" />} color="rgba(59, 130, 246, 0.1)" />
                <StatCard title="Bonus" value={stats.totalBonus} icon={<Award size={20} color="#c084fc" />} color="rgba(192, 132, 252, 0.1)" />
                <StatCard title="THR" value={stats.totalTHR} icon={<Landmark size={20} color="#34d399" />} color="rgba(52, 211, 153, 0.1)" />
                <StatCard title="Emas" value={stats.totalEmasValue} sub={`${stats.totalEmasGrams.toFixed(2)} Gr`} icon={<Coins size={20} color="#facc15" />} color="rgba(250, 204, 21, 0.1)" />
                <StatCard title="Pinjaman" value={stats.totalPinjaman} icon={<TrendingDown size={20} color="#f87171" />} color="rgba(248, 113, 113, 0.1)" isDanger />
            </div>

            {/* REKAPAN TABLE */}
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}><GripHorizontal size={20} /> Rekapan Per Tanggal</h3>
                    <div style={{ position: 'relative', width: '200px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                        <input className="search-bar" style={{ paddingLeft: '40px' }} placeholder="Cari..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <div style={{ padding: '16px', overflowX: 'auto' }}>
                    <table className="trx-table">
                        <thead>
                            <tr>
                                <th>Tanggal</th>
                                <th>Akumulasi</th>
                                <th style={{ textAlign: 'right' }}>Total Masuk</th>
                                <th style={{ textAlign: 'right' }}>Total Keluar</th>
                                <th style={{ width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedTransactions.map(group => (
                                <React.Fragment key={group.date}>
                                    <tr className="trx-row" onClick={() => toggleDate(group.date)}>
                                        <td style={{ fontWeight: '600', color: 'white', whiteSpace: 'nowrap' }}>
                                            {new Date(group.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {Array.from(group.types).map(t => (
                                                    <span key={t} className="badge" style={{
                                                        background: t === 'pinjaman' ? 'rgba(239, 68, 68, 0.2)' : t === 'emas' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                                        color: t === 'pinjaman' ? '#fca5a5' : t === 'emas' ? '#fde047' : '#6ee7b7'
                                                    }}>{t}</span>
                                                ))}
                                                {group.goldDelta > 0 && <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#facc15' }}>+{group.goldDelta}g</span>}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: '700', color: '#4ade80' }}>
                                            {group.totalIn > 0 ? formatRupiah(group.totalIn) : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: '700', color: '#f87171' }}>
                                            {group.totalOut > 0 ? formatRupiah(group.totalOut) : '-'}
                                        </td>
                                        <td style={{ textAlign: 'center', color: '#94a3b8' }}>
                                            {expandedDates[group.date] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </td>
                                    </tr>
                                    <AnimatePresence>
                                        {expandedDates[group.date] && (
                                            <tr>
                                                <td colSpan={5} style={{ padding: 0, border: 'none' }}>
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', margin: '0 16px 16px' }}
                                                    >
                                                        <table style={{ width: '100%' }}>
                                                            <tbody>
                                                                {group.items.map(item => (
                                                                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                        <td style={{ padding: '8px 0', fontSize: '13px', color: '#cbd5e1' }}>{item.type.toUpperCase()}</td>
                                                                        <td style={{ padding: '8px 0', fontSize: '13px', color: '#94a3b8' }}>{item.description}</td>
                                                                        <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: item.type === 'pinjaman' ? '#f87171' : 'white' }}>
                                                                            {item.type === 'emas' ? `${item.amount} Gram` : formatRupiah(item.amount)}
                                                                        </td>
                                                                        <td style={{ width: '40px', paddingLeft: '16px' }}>
                                                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-slate-500 hover:text-red-500"><Trash2 size={14} /></button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </motion.div>
                                                </td>
                                            </tr>
                                        )}
                                    </AnimatePresence>
                                </React.Fragment>
                            ))}
                            {groupedTransactions.length === 0 && (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Belum ada rekapan data.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL PRICE EDIT */}
            <AnimatePresence>
                {showPriceModal && (
                    <div className="modal-overlay">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="modal-content" style={{ maxWidth: '400px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0, fontWeight: '800', fontSize: '18px' }}>Set Harga Emas (Aceh)</h3>
                                <button onClick={() => setShowPriceModal(false)}><X className="text-slate-400" /></button>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Harga Per Gram (IDR)</label>
                                <input
                                    className="form-input"
                                    value={formatRupiah(tempPrice).replace('Rp', '')}
                                    onChange={e => setTempPrice(e.target.value)}
                                    placeholder="Contoh: 1.450.000"
                                    autoFocus
                                />
                                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>Merubah nominal ini akan menghitung ulang total nilai aset emas Anda.</p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <button onClick={handleResetPrice} className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)', justifyContent: 'center' }}>
                                    <RotateCcw size={16} /> Reset
                                </button>
                                <button onClick={handleGoldPriceSave} className="btn-primary" style={{ justifyContent: 'center' }}>
                                    <Save size={16} /> Simpan
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL BATCH INPUT */}
            <AnimatePresence>
                {showModal && (
                    <div className="modal-overlay">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="modal-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                                <h3 style={{ margin: 0, fontWeight: '800', fontSize: '20px' }}>Rekap Pemasukan & Pinjaman</h3>
                                <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '16px', marginBottom: '24px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                    <p style={{ fontSize: '12px', color: '#60a5fa', marginBottom: '8px' }}>PENGATURAN UMUM</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Tanggal Transaksi</label>
                                            <input type="date" className="form-input" value={formData.date} onChange={e => handleInputChange(e, 'date')} required />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Keterangan</label>
                                            <input className="form-input" placeholder="Misal: Rejeki Januari" value={formData.description} onChange={e => handleInputChange(e, 'description')} />
                                        </div>
                                    </div>
                                </div>

                                <div className="batch-grid">
                                    <div className="form-group">
                                        <label className="form-label">💼 Gaji Pokok <span style={{ color: '#60a5fa' }}>IDR</span></label>
                                        <input className="form-input" placeholder="0" value={formData.gaji ? formatRupiah(formData.gaji).replace('Rp', '') : ''} onChange={e => handleInputChange(e, 'gaji')} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">🎁 Bonus <span style={{ color: '#c084fc' }}>IDR</span></label>
                                        <input className="form-input" placeholder="0" value={formData.bonus ? formatRupiah(formData.bonus).replace('Rp', '') : ''} onChange={e => handleInputChange(e, 'bonus')} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">🕌 THR <span style={{ color: '#34d399' }}>IDR</span></label>
                                        <input className="form-input" placeholder="0" value={formData.thr ? formatRupiah(formData.thr).replace('Rp', '') : ''} onChange={e => handleInputChange(e, 'thr')} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">🥇 Beli Emas (3.3gr = 1 Mayam) <span style={{ color: '#facc15' }}>GRAM</span></label>
                                        <input type="number" step="0.01" className="form-input" placeholder="0.00" value={formData.emas} onChange={e => handleInputChange(e, 'emas')} style={{ borderColor: '#facc15' }} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">📉 Ambil Pinjaman <span style={{ color: '#f87171' }}>IDR</span></label>
                                        <input className="form-input" placeholder="0" value={formData.pinjaman ? formatRupiah(formData.pinjaman).replace('Rp', '') : ''} onChange={e => handleInputChange(e, 'pinjaman')} style={{ borderColor: '#ef4444', color: '#fca5a5' }} />
                                    </div>
                                </div>

                                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px', marginTop: '24px' }}>
                                    <Save size={20} /> SIMPAN REKAPAN
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const StatCard = ({ title, value, icon, color, sub, isDanger }) => (
    <div className="glass-card stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="stat-icon" style={{ width: '40px', height: '40px', borderRadius: '12px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{title}</span>
        <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: isDanger ? '#f87171' : 'white' }}>{formatRupiah(value)}</h4>
        {sub && <span style={{ fontSize: '10px', color: '#eab308', fontWeight: '600' }}>{sub}</span>}
    </div>
);

export default Keuangan;
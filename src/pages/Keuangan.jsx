import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
    Plus, Wallet, TrendingUp, TrendingDown, Award, Banknote,
    Trash2, Search, Calendar, Filter, GripHorizontal,
    ArrowUpRight, ArrowDownLeft, Coins, Landmark, Zap, X
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
    const [syncStatus, setSyncStatus] = useState('🟢 Sinkronisasi Cloud OK');

    // Gold Price State
    const [goldPrice, setGoldPrice] = useState(1360000);
    const [isPriceLoading, setIsPriceLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    // Form State
    const [formData, setFormData] = useState({
        type: 'gaji', // gaji, bonus, thr, emas, pinjaman
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    // Filters
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    /* =========================
       EFFECTS
    ========================= */
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchGoldPrice = async () => {
            setIsPriceLoading(true);
            try {
                const response = await fetch('https://logammulia-api.vercel.app/api/antam');
                if (response.ok) {
                    const result = await response.json();
                    if (result.data && result.data[0]) {
                        setGoldPrice(Number(result.data[0].harga));
                    }
                }
            } catch (e) {
                console.warn("Gold price fetch failed, using fallback");
            } finally {
                setIsPriceLoading(false);
            }
        };
        fetchGoldPrice();
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
                    setSyncStatus('🟢 Sinkronisasi Cloud OK');
                } else {
                    setSyncStatus('🔴 Sinkronisasi Awan Kosong (Data Baru)');
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
       CRUD & LOGIC
    ========================= */
    const handleSubmit = async (e) => {
        e.preventDefault();
        const cleanAmount = Number(formData.amount.replace(/[^0-9.]/g, ''));

        const newItem = {
            id: Date.now(),
            user_id: user.username,
            type: formData.type,
            amount: cleanAmount,
            description: formData.description,
            date: formData.date
        };

        const updated = [newItem, ...transactions];
        setTransactions(updated);
        localStorage.setItem(`finance_trx_${user.username}`, JSON.stringify(updated));

        setShowModal(false);
        setFormData({ type: 'gaji', amount: '', description: '', date: new Date().toISOString().split('T')[0] });

        try {
            await supabase.from('financial_records').insert({
                user_id: user.username,
                type: newItem.type,
                amount: newItem.amount,
                description: newItem.description,
                date: newItem.date
            });
            setSyncStatus('🟢 Sinkronisasi Cloud OK');
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

    const stats = useMemo(() => {
        const totalGaji = transactions.filter(t => t.type === 'gaji').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const totalBonus = transactions.filter(t => t.type === 'bonus').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const totalTHR = transactions.filter(t => t.type === 'thr').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const totalEmasGrams = transactions.filter(t => t.type === 'emas').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const totalEmasValue = totalEmasGrams * goldPrice;
        const totalPinjaman = transactions.filter(t => t.type === 'pinjaman').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        const totalPemasukan = totalGaji + totalBonus + totalTHR + totalEmasValue;
        const saldoBersih = totalPemasukan - totalPinjaman;

        return { totalGaji, totalBonus, totalTHR, totalEmasGrams, totalEmasValue, totalPinjaman, saldoBersih, totalPemasukan };
    }, [transactions, goldPrice]);

    const monthlyData = useMemo(() => {
        const months = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = d.toLocaleString('default', { month: 'short' });
            months[key] = 0;
        }
        transactions.forEach(t => {
            if (t.type !== 'pinjaman') {
                const val = t.type === 'emas' ? (Number(t.amount) * goldPrice) : Number(t.amount);
                const d = new Date(t.date);
                const key = d.toLocaleString('default', { month: 'short' });
                if (months[key] !== undefined) months[key] += val;
            }
        });
        return Object.entries(months).map(([name, value]) => ({ name, value }));
    }, [transactions, goldPrice]);

    const filteredTransactions = transactions.filter(t => {
        const matchType = filterType === 'all' ? true : t.type === filterType;
        const matchSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || t.amount?.toString().includes(searchTerm);
        return matchType && matchSearch;
    });

    /* =========================
       RENDER
    ========================= */
    return (
        <div className="keuangan-container">
            {/* INJECTED CSS */}
            <style>{`
                :root {
                    --primary: #3b82f6; --primary-dark: #1d4ed8;
                    --bg-dark: #0f172a; --bg-card: rgba(30, 41, 59, 0.7);
                    --text-main: #f8fafc; --text-muted: #94a3b8;
                    --glass-border: rgba(255, 255, 255, 0.08);
                    --success: #10b981; --danger: #ef4444; --warning: #eab308;
                }
                .keuangan-container {
                    padding: ${isMobile ? '20px' : '40px'};
                    min-height: 100vh; color: var(--text-main); font-family: 'Inter', sans-serif;
                    background: radial-gradient(circle at top right, #1e293b 0%, #0f172a 60%);
                }
                .glass-card {
                    background: var(--bg-card); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                    border: 1px solid var(--glass-border); border-radius: 24px; padding: 24px;
                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1); transition: transform 0.2s ease;
                }
                .glass-card:hover { transform: translateY(-3px); border-color: rgba(255,255,255,0.15); }
                .hero-card {
                    background: linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%);
                    border: 1px solid rgba(6, 182, 212, 0.3); text-align: center; position: relative; overflow: hidden;
                    padding: 40px; border-radius: 32px; margin-bottom: 32px;
                }
                .hero-bg-icon { position: absolute; top: -20px; right: -20px; opacity: 0.1; transform: rotate(15deg); color: white; }
                .grid-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
                .grid-visuals { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 32px; }
                .stat-card { display: flex; flex-direction: column; gap: 8px; position: relative; overflow: hidden; }
                .stat-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
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
                .search-bar:focus { border-color: var(--primary); }
                .trx-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                .trx-table th { text-align: left; padding: 16px; color: var(--text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
                .trx-table td { padding: 16px; border-top: 1px solid var(--glass-border); font-size: 14px; }
                .badge { padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 50; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
                .modal-content { width: 90%; max-width: 450px; background: #1e293b; border-radius: 24px; padding: 24px; border: 1px solid var(--glass-border); }
                .form-group { margin-bottom: 16px; }
                .form-label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 8px; font-weight: 600; text-transform: uppercase; }
                .form-input { 
                    width: 100%; background: #0f172a; border: 1px solid var(--glass-border); color: white; 
                    padding: 12px; border-radius: 12px; font-size: 16px; outline: none; transition: border-color 0.2s; 
                }
                .form-input:focus { border-color: var(--primary); }
                .type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
                .type-btn { 
                    background: #0f172a; border: 1px solid var(--glass-border); color: var(--text-muted); padding: 10px; 
                    border-radius: 12px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;
                }
                .type-btn.active { background: var(--primary); color: white; border-color: var(--primary); }
                .bar-container { width: 100%; height: 200px; display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; padding-top: 20px; }
                .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end; }
                .bar-track { width: 100%; background: rgba(255,255,255,0.05); border-radius: 8px 8px 0 0; position: relative; height: 100%; display: flex; align-items: flex-end; overflow: hidden; }
                .bar-fill { width: 100%; background: linear-gradient(to top, var(--primary), #06b6d4); border-radius: 8px 8px 0 0; }
            `}</style>

            {/* --- HEADER --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '900', background: 'linear-gradient(to right, #60a5fa, #2dd4bf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                        Wealth Command
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: varColor(syncStatus.includes('OK')) }}>
                        <Zap size={14} /> <span style={{ fontSize: '12px', fontWeight: '600' }}>{syncStatus}</span>
                    </div>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={20} /> Transaksi Baru
                </button>
            </div>

            {/* --- HERO: NET WORTH --- */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="hero-card">
                <Wallet size={120} className="hero-bg-icon" />
                <p style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '12px', fontWeight: '700', marginBottom: '8px', opacity: 0.8 }}>Total Kekayaan Bersih</p>
                <h2 style={{ fontSize: '48px', fontWeight: '800', margin: 0, textShadow: '0 0 30px rgba(6, 182, 212, 0.4)' }}>
                    {formatRupiah(stats.saldoBersih)}
                </h2>
                <div style={{ marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(234, 179, 8, 0.15)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                    <Coins size={16} className="text-yellow-400" />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#facc15' }}>Harga Emas: {isPriceLoading ? 'Update...' : formatRupiah(goldPrice)} /g</span>
                </div>
            </motion.div>

            {/* --- STATS GRID --- */}
            <div className="grid-stats">
                <StatCard title="Pemasukan Gaji" value={stats.totalGaji} icon={<Banknote size={20} color="#60a5fa" />} color="rgba(59, 130, 246, 0.1)" />
                <StatCard title="Bonus & Hadiah" value={stats.totalBonus} icon={<Award size={20} color="#c084fc" />} color="rgba(192, 132, 252, 0.1)" />
                <StatCard title="Tunjangan THR" value={stats.totalTHR} icon={<Landmark size={20} color="#34d399" />} color="rgba(52, 211, 153, 0.1)" />
                <StatCard title="Aset Emas" value={stats.totalEmasValue} sub={`${stats.totalEmasGrams} Gram`} icon={<Coins size={20} color="#facc15" />} color="rgba(250, 204, 21, 0.1)" />
                <StatCard title="Pinjaman (Hutang)" value={stats.totalPinjaman} icon={<TrendingDown size={20} color="#f87171" />} color="rgba(248, 113, 113, 0.1)" isDanger />
            </div>

            {/* --- VISUALS & LIST GRID --- */}
            <div className="grid-visuals">
                {/* CHART */}
                <div className="glass-card" style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ padding: '8px', background: 'rgba(6, 182, 212, 0.2)', borderRadius: '8px' }}><TrendingUp size={20} className="text-cyan-400" /></div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Pertumbuhan Aset (6 Bulan)</h3>
                    </div>
                    <div className="bar-container">
                        {monthlyData.map((d, i) => {
                            const maxVal = Math.max(...monthlyData.map(m => m.value)) || 1;
                            const hEffect = (d.value / maxVal) * 100;
                            return (
                                <div key={i} className="bar-col">
                                    <div className="bar-track">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${hEffect}%` }}
                                            className="bar-fill"
                                            style={{ opacity: 0.6 + (i * 0.1) }}
                                        />
                                    </div>
                                    <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)' }}>{d.name}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* COMPOSITION */}
                <div className="glass-card">
                    <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700' }}>Komposisi</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <CompItem label="Gaji" val={stats.totalGaji} total={stats.totalPemasukan} color="#3b82f6" />
                        <CompItem label="Bonus" val={stats.totalBonus} total={stats.totalPemasukan} color="#a855f7" />
                        <CompItem label="THR" val={stats.totalTHR} total={stats.totalPemasukan} color="#10b981" />
                        <CompItem label="Emas" val={stats.totalEmasValue} total={stats.totalPemasukan} color="#eab308" />
                    </div>
                </div>
            </div>

            {/* --- TRANSACTIONS --- */}
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}><GripHorizontal size={20} /> Riwayat Transaksi</h3>
                    <div style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '400px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                            <input
                                className="search-bar"
                                style={{ paddingLeft: '40px' }}
                                placeholder="Cari transaksi..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="trx-table">
                        <thead>
                            <tr>
                                <th>Tanggal</th>
                                <th>Kategori</th>
                                <th>Deskripsi</th>
                                <th style={{ textAlign: 'right' }}>Nilai</th>
                                <th style={{ textAlign: 'center' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map(t => (
                                <tr key={t.id}>
                                    <td style={{ fontWeight: '500', color: '#cbd5e1' }}>{new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td>
                                        <span className="badge" style={{
                                            background: t.type === 'pinjaman' ? 'rgba(239, 68, 68, 0.2)' : t.type === 'emas' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                            color: t.type === 'pinjaman' ? '#fca5a5' : t.type === 'emas' ? '#fde047' : '#6ee7b7'
                                        }}>
                                            {t.type}
                                        </span>
                                    </td>
                                    <td style={{ color: '#e2e8f0' }}>{t.description || '-'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: '700', color: t.type === 'pinjaman' ? '#f87171' : '#fff' }}>
                                        {t.type === 'pinjaman' ? '-' : '+'} {t.type === 'emas' ? `${t.amount} g` : formatRupiah(t.amount)}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button onClick={() => handleDelete(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Belum ada data transaksi.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODAL --- */}
            <AnimatePresence>
                {showModal && (
                    <div className="modal-overlay">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="modal-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                                <h3 style={{ margin: 0, fontWeight: '800', fontSize: '20px' }}>Input Data Baru</h3>
                                <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Tipe Transaksi</label>
                                    <div className="type-grid">
                                        {['gaji', 'bonus', 'thr', 'emas', 'pinjaman'].map(type => (
                                            <div
                                                key={type}
                                                className={`type-btn ${formData.type === type ? 'active' : ''}`}
                                                onClick={() => setFormData({ ...formData, type, amount: '' })}
                                            >
                                                {type.toUpperCase()}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{formData.type === 'emas' ? 'Berat (Gram)' : 'Nominal (Rp)'}</label>
                                    <input
                                        className="form-input"
                                        style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'monospace' }}
                                        value={formData.type === 'emas' ? formData.amount : formatRupiah(formData.amount).replace('Rp', '').trim()}
                                        onChange={e => {
                                            const v = e.target.value;
                                            // Allow decimals for gold, integers for IDR
                                            const clean = formData.type === 'emas' ? v : v.replace(/\D/g, '');
                                            setFormData({ ...formData, amount: clean });
                                        }}
                                        placeholder="0"
                                        required
                                    />
                                    {formData.type === 'emas' && formData.amount && (
                                        <p style={{ fontSize: '12px', color: '#eab308', marginTop: '8px' }}>
                                            ≈ {formatRupiah(Number(formData.amount) * goldPrice)}
                                        </p>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Keterangan</label>
                                    <input className="form-input" placeholder="Contoh: Bonus Tahunan" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tanggal</label>
                                    <input type="date" className="form-input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                                </div>
                                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px', marginTop: '16px' }}>
                                    SIMPAN DATA
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* --- SUB COMPONENTS --- */
const StatCard = ({ title, value, icon, color, sub, isDanger }) => (
    <div className="glass-card stat-card">
        <div className="stat-icon" style={{ background: color }}>{icon}</div>
        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{title}</span>
        <h4 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: isDanger ? '#f87171' : 'white' }}>{formatRupiah(value)}</h4>
        {sub && <span style={{ fontSize: '10px', color: '#eab308', fontWeight: '600' }}>{sub}</span>}
    </div>
);

const CompItem = ({ label, val, total, color }) => {
    const pct = total > 0 ? (val / total) * 100 : 0;
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>
                <span style={{ color: '#cbd5e1' }}>{label}</span>
                <span style={{ color: color }}>{pct.toFixed(1)}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} style={{ height: '100%', background: color, borderRadius: '4px' }} />
            </div>
        </div>
    );
}

const varColor = (ok) => ok ? '#4ade80' : '#f87171';

export default Keuangan;
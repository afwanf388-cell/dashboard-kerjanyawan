import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
    Plus, Wallet, TrendingUp, TrendingDown, Award, Banknote,
    Trash2, Search, Calendar, Coins, Landmark, Zap, X,
    Save, Edit2, RotateCcw, RefreshCw
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
    const [goldPrice, setGoldPrice] = useState(1360000);
    const [isPriceManual, setIsPriceManual] = useState(false);
    const [tempPrice, setTempPrice] = useState('');
    const [lastUpdated, setLastUpdated] = useState(new Date());

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
    const [editingIds, setEditingIds] = useState([]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const tableEndRef = useRef(null);

    /* =========================
       EFFECTS
    ========================= */
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch Gold Price
    const fetchGoldPrice = async () => {
        const savedPrice = localStorage.getItem('aceh_gold_price');
        const savedMode = localStorage.getItem('is_gold_manual');

        if (savedMode === 'true' && savedPrice) {
            setGoldPrice(Number(savedPrice));
            setIsPriceManual(true);
        } else {
            try {
                // Fetch public Antam price
                const response = await fetch('https://logammulia-api.vercel.app/api/antam');
                if (response.ok) {
                    const result = await response.json();
                    if (result.data && result.data[0]) {
                        setGoldPrice(Number(result.data[0].harga));
                        setLastUpdated(new Date());
                    }
                }
            } catch (e) {
                console.warn("Gold price API failed, using fallback");
            }
        }
    };

    useEffect(() => {
        fetchGoldPrice();
        // Auto refresh gold price every 30 minutes
        const interval = setInterval(fetchGoldPrice, 30 * 60 * 1000);
        return () => clearInterval(interval);
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
                    .order('date', { ascending: true });

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
       LOGIC
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
        await fetchGoldPrice(); // Re-fetch logic
        setShowPriceModal(false);
    };

    // Prepare Edit Form
    const handleEdit = (row) => {
        const data = {
            gaji: row.gaji || '',
            bonus: row.bonus || '',
            thr: row.thr || '',
            emas: row.emasGram || '',
            pinjaman: row.pinjaman || '',
            description: row.items[0]?.description || '',
            date: row.items[0]?.date || new Date().toISOString().split('T')[0]
        };
        setFormData(data);
        setEditingIds(row.items.map(i => i.id));
        setShowModal(true);
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
            if (editingIds.length > 0 && window.confirm("Semua nilai kosong. Hapus data bulan ini?")) {
                // Allow delete
            } else {
                alert("Mohon isi minimal satu kategori!");
                return;
            }
        }

        const currentTrx = editingIds.length > 0
            ? transactions.filter(t => !editingIds.includes(t.id))
            : transactions;

        const updated = [...currentTrx, ...newRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
        setTransactions(updated);
        localStorage.setItem(`finance_trx_${user.username}`, JSON.stringify(updated));

        setShowModal(false);
        setFormData({
            gaji: '', bonus: '', thr: '', emas: '', pinjaman: '',
            description: '', date: new Date().toISOString().split('T')[0]
        });

        if (editingIds.length === 0) setTimeout(() => tableEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);

        try {
            if (editingIds.length > 0) {
                await supabase.from('financial_records').delete().in('id', editingIds);
            }
            if (newRecords.length > 0) {
                const recordsToInsert = newRecords.map(({ id, ...rest }) => rest);
                const { error } = await supabase.from('financial_records').insert(recordsToInsert);
                if (error) throw error;
            }
            setSyncStatus('🟢 Sinkronisasi Awan OK');
        } catch (err) {
            setSyncStatus('🔴 Gagal Upload (Disimpan Lokal)');
        } finally {
            setEditingIds([]);
        }
    };

    const handleDelete = async (items) => {
        if (!window.confirm(`Hapus ${items.length} transaksi di bulan ini?`)) return;
        const idsToDelete = items.map(i => i.id);
        const updated = transactions.filter(t => !idsToDelete.includes(t.id));
        setTransactions(updated);
        localStorage.setItem(`finance_trx_${user.username}`, JSON.stringify(updated));
        try { await supabase.from('financial_records').delete().in('id', idsToDelete); } catch (err) { }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingIds([]);
        setFormData({
            gaji: '', bonus: '', thr: '', emas: '', pinjaman: '',
            description: '', date: new Date().toISOString().split('T')[0]
        });
    };

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

    // ACCUMULATION DATA LOGIC
    const accumulationData = useMemo(() => {
        const groups = new Map();
        const sortedTrx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedTrx.forEach(t => {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    key, dateObj: d, items: [],
                    gaji: 0, bonus: 0, thr: 0, emasVal: 0, emasGram: 0, pinjaman: 0,
                    netMonth: 0
                });
            }
            const g = groups.get(key);
            g.items.push(t);
            const amt = Number(t.amount);
            if (t.type === 'gaji') g.gaji += amt;
            else if (t.type === 'bonus') g.bonus += amt;
            else if (t.type === 'thr') g.thr += amt;
            else if (t.type === 'emas') {
                g.emasGram += amt;
                g.emasVal += (amt * goldPrice);
            }
            else if (t.type === 'pinjaman') g.pinjaman += amt;
        });

        let runningBalance = 0;
        const result = [];

        // Sort keys again to be sure (Map preserves insertion order but safety first)
        const sortedKeys = Array.from(groups.keys()).sort();

        sortedKeys.forEach(key => {
            const g = groups.get(key);
            g.netMonth = (g.gaji + g.bonus + g.thr + g.emasVal) - g.pinjaman;
            runningBalance += g.netMonth;
            g.accumulated = runningBalance;

            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const monthName = g.dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toLowerCase();
                const hasMatch = monthName.includes(searchLower) || g.items.some(i => i.description?.toLowerCase().includes(searchLower));
                if (hasMatch) result.push(g);
            } else {
                result.push(g);
            }
        });

        return result;
    }, [transactions, goldPrice, searchTerm]);

    const handleInputChange = (e, field) => {
        let val = e.target.value;
        if (field !== 'emas' && field !== 'description' && field !== 'date') val = val.replace(/\D/g, '');
        setFormData(prev => ({ ...prev, [field]: val }));
    };

    // GENERATE CHART PATH
    const ChartBackground = ({ data }) => {
        if (!data || data.length < 2) return null;

        const height = 200;
        const width = 1000;
        const maxVal = Math.max(...data.map(d => d.accumulated), 1);
        const minVal = Math.min(...data.map(d => d.accumulated), 0);
        const range = maxVal - minVal;

        // Generate points
        const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((d.accumulated - minVal) / (range || 1)) * height * 0.6 - 20;
            return `${x},${y}`;
        });

        // Area Path
        const pathData = `M0,${height} L0,${height} L${points[0].split(',')[0]},${points[0].split(',')[1]} ` +
            points.join(' L') +
            ` L${width},${points[points.length - 1].split(',')[1]} L${width},${height} Z`;

        // Line Path
        const lineData = `M${points[0]} L` + points.join(' L');

        return (
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.3, overflow: 'hidden', borderRadius: '32px' }}>
                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                    <defs>
                        <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                        </linearGradient>
                    </defs>
                    <motion.path
                        d={pathData}
                        fill="url(#chartGrad)"
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                    />
                    <motion.path
                        d={lineData}
                        fill="none"
                        stroke="#2dd4bf"
                        strokeWidth="3"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                    />
                </svg>
            </div>
        );
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
                    background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.9) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.1); text-align: center; position: relative; overflow: hidden;
                    padding: 60px 20px; border-radius: 32px; margin-bottom: 32px;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    box-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.5);
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
                /* ACCUMULATION TABLE STYLES */
                .acc-table-container { width: 100%; overflow-x: auto; max-height: 600px; overflow-y: auto; }
                .acc-table { 
                    width: 100%; border-collapse: separate; border-spacing: 0; min-width: 800px;
                    font-size: 13px; margin-top: 8px;
                }
                .acc-table th { 
                    position: sticky; top: 0; z-index: 10;
                    background: #0f172a; color: var(--text-muted); 
                    padding: 16px; text-align: right; 
                    font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
                    border-bottom: 2px solid var(--glass-border);
                }
                .acc-table th:first-child { text-align: left; left: 0; z-index: 20; background: #0f172a; } /* Sticky first col */
                .acc-table td { 
                    padding: 16px; border-bottom: 1px solid var(--glass-border); text-align: right; 
                    white-space: nowrap; color: #e2e8f0;
                }
                .acc-table td:first-child { 
                    position: sticky; left: 0; background: rgba(15, 23, 42, 0.95); 
                    text-align: left; font-weight: 600; color: #60a5fa; 
                    border-right: 1px solid var(--glass-border);
                }
                .acc-row:hover td { background: rgba(255,255,255,0.02); }
                .val-pos { color: #4ade80; }
                .val-neg { color: #f87171; }
                .val-neu { color: #94a3b8; opacity: 0.3; }
                .acc-total-cell { font-weight: 800; color: white; background: rgba(255,255,255,0.03); }
                
                .action-btn {
                    padding: 8px; border-radius: 12px; border: none; cursor: pointer;
                    display: inline-flex; align-items: center; justify-content: center;
                    transition: all 0.2s; margin-left: 4px;
                }
                .action-btn.edit { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
                .action-btn.edit:hover { background: #3b82f6; color: white; transform: translateY(-2px); }
                .action-btn.del { background: rgba(239, 68, 68, 0.15); color: #f87171; }
                .action-btn.del:hover { background: #ef4444; color: white; transform: translateY(-2px); }

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
                
                .pulse-dot {
                    width: 8px; height: 8px; background: #4ade80; border-radius: 50%;
                    box-shadow: 0 0 10px #4ade80; animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 0.7; }
                    50% { transform: scale(1.2); opacity: 1; box-shadow: 0 0 20px #4ade80; }
                    100% { transform: scale(0.95); opacity: 0.7; }
                }
            `}</style>

            {/* HERDER & BUTTONS */}
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

            {/* HERO - WITH CHART */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="hero-card">
                {/* Visual Chart Background */}
                <ChartBackground data={accumulationData} />

                {/* Content */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <p style={{ textTransform: 'uppercase', letterSpacing: '4px', fontSize: '11px', fontWeight: '800', marginBottom: '16px', color: '#94a3b8' }}>Total Kekayaan Bersih</p>
                    <h2 style={{ fontSize: isMobile ? '36px' : '56px', fontWeight: '900', margin: '0 0 24px 0', textShadow: '0 10px 30px rgba(0,0,0,0.5)', letterSpacing: '-1px' }}>
                        {formatRupiah(stats.saldoBersih)}
                    </h2>

                    {/* Gold Price Control - Re-styled as Floating Glass Pill */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '16px',
                        background: 'rgba(234, 179, 8, 0.1)', backdropFilter: 'blur(10px)',
                        padding: '10px 20px', borderRadius: '50px',
                        border: '1px solid rgba(234, 179, 8, 0.2)',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {!isPriceManual && <div className="pulse-dot" />}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#facc15', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    {isPriceManual ? 'Harga Emas (Manual)' : `Harga Emas (Antam)`}
                                </span>
                                <span style={{ fontSize: '13px', color: 'white', fontWeight: '600' }}>
                                    {formatRupiah(goldPrice)} /g
                                </span>
                            </div>
                        </div>
                        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)' }} />
                        <button onClick={() => { setTempPrice(goldPrice.toString()); setShowPriceModal(true); }} className="hover:text-white text-yellow-400 transition" title="Edit Harga">
                            <Edit2 size={16} />
                        </button>
                        {!isPriceManual && (
                            <button onClick={fetchGoldPrice} className="hover:text-white text-yellow-400 transition" title="Refresh Harga">
                                <RefreshCw size={16} />
                            </button>
                        )}
                    </div>
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

            {/* ACCUMULATION TABLE (Replacing old list) */}
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={20} /> Akumulasi Tabungan</h3>
                    <div style={{ position: 'relative', width: '200px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                        <input className="search-bar" style={{ paddingLeft: '40px' }} placeholder="Cari..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                <div className="acc-table-container">
                    <table className="acc-table">
                        <thead>
                            <tr>
                                <th>Bulan</th>
                                <th>Gaji Disimpan</th>
                                <th>Bonus</th>
                                <th>THR</th>
                                <th>Emas</th>
                                <th>Pinjaman</th>
                                <th>Total Bulanan</th>
                                <th style={{ color: '#4ade80' }}>Akumulasi Tabungan</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {accumulationData.map((row, index) => (
                                <tr key={row.key} className="acc-row">
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Calendar size={14} className="text-slate-500" />
                                            {row.dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                        </div>
                                    </td>
                                    <td className={row.gaji > 0 ? 'val-pos' : 'val-neu'}>{formatRupiah(row.gaji)}</td>
                                    <td className={row.bonus > 0 ? 'val-pos' : 'val-neu'}>{formatRupiah(row.bonus)}</td>
                                    <td className={row.thr > 0 ? 'val-pos' : 'val-neu'}>{formatRupiah(row.thr)}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <span style={{ color: '#facc15' }}>{formatRupiah(row.emasVal)}</span>
                                            {row.emasGram > 0 && <span style={{ fontSize: '10px', color: '#94a3b8' }}>{row.emasGram}g</span>}
                                        </div>
                                    </td>
                                    <td className={row.pinjaman > 0 ? 'val-neg' : 'val-neu'}>{formatRupiah(row.pinjaman)}</td>
                                    <td style={{ fontWeight: '700', color: row.netMonth >= 0 ? 'white' : '#f87171' }}>
                                        {formatRupiah(row.netMonth)}
                                    </td>
                                    <td className="acc-total-cell" style={{ color: '#4ade80', fontSize: '14px' }}>
                                        {formatRupiah(row.accumulated)}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => handleEdit(row)}
                                                className="action-btn edit"
                                                title="Edit data bulan ini"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(row.items)}
                                                className="action-btn del"
                                                title="Hapus semua data bulan ini"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            <tr ref={tableEndRef} />
                            {accumulationData.length === 0 && (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                        Belum ada data akumulasi. Input data baru untuk memulai.
                                    </td>
                                </tr>
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
                                <h3 style={{ margin: 0, fontWeight: '800', fontSize: '20px' }}>
                                    {editingIds.length > 0 ? 'Edit Rekapan Bulan Ini' : 'Rekap Pemasukan & Pinjaman'}
                                </h3>
                                <button onClick={handleCloseModal} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
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
                                    <Save size={20} /> {editingIds.length > 0 ? 'UPDATE DATA' : 'SIMPAN REKAPAN'}
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
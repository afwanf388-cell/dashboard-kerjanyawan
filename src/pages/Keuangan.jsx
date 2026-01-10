import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Wallet, TrendingUp, TrendingDown, Award, Banknote, Trash2, Edit2, ChevronRight, BarChart3, PiggyBank, Cloud, CloudOff, Coins, Sparkles, X, RefreshCw } from 'lucide-react';

const Keuangan = () => {
    const { user } = useAuth();

    // Key localStorage yang unik per user
    const [monthlyData, setMonthlyData] = useState([]);
    const [isInitialLoaded, setIsInitialLoaded] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [syncStatus, setSyncStatus] = useState('Offline');
    const [goldPrice, setGoldPrice] = useState(2549000); // Default fallback price
    const [isPriceLoading, setIsPriceLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
    const [renderError, setRenderError] = useState(null);

    // Initial State for Form
    const [formData, setFormData] = useState({
        gaji: 0,
        bonus: 0,
        thr: 0,
        pengeluaran: 0,
        emas: 0,
        pinjaman: 0
    });

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch Gold Price from API
    useEffect(() => {
        const fetchGoldPrice = async () => {
            setIsPriceLoading(true);
            try {
                const response = await fetch('https://logammulia-api.vercel.app/api/antam');
                const result = await response.json();
                if (result.data && result.data[0]) {
                    const price = result.data[0].harga;
                    setGoldPrice(Number(price) || 2549000);
                }
            } catch (error) {
                console.error("Failed to fetch gold price:", error);
            } finally {
                setIsPriceLoading(false);
            }
        };

        fetchGoldPrice();
        const interval = setInterval(fetchGoldPrice, 3600000);
        return () => clearInterval(interval);
    }, []);

    // Sync Functions
    const syncToCloud = async (item, action = 'upsert') => {
        if (!supabase || !user?.username) {
            console.warn("Sync skipped: No supabase client or username");
            return;
        }

        try {
            if (action === 'delete') {
                const { error } = await supabase.from('finance_data').delete().eq('id', item.id);
                if (error) throw error;
                console.log("Delete success:", item.id);
            } else {
                const payload = {
                    id: item.id,
                    user_id: user.username,
                    month: Number(item.month),
                    gaji: Number(item.gaji || 0),
                    bonus: Number(item.bonus || 0),
                    thr: Number(item.thr || 0),
                    emas: Number(item.emas || 0),
                    pinjaman: Number(item.pinjaman || 0),
                    pengeluaran: Number(item.pengeluaran || 0),
                    last_updated: new Date().toISOString()
                };

                const { error } = await supabase.from('finance_data').upsert(payload, { onConflict: 'id' });

                if (error) {
                    console.error("Supabase Upsert Error:", error);
                    setSyncStatus('Gagal Simpan');
                    throw error;
                }
                console.log("Upsert success for month:", item.month, payload);
            }
        } catch (err) {
            console.error("Critical Sync Failure:", err);
            setSyncStatus('Cloud Error');
        }
    };

    const syncProcess = useCallback(async () => {
        if (!supabase || !user?.username) return;
        setSyncStatus('Sinkronisasi...');

        try {
            // 1. Fetch Cloud Data
            const { data: cloudData, error: fetchError } = await supabase
                .from('finance_data')
                .select('*')
                .eq('user_id', user.username)
                .order('month', { ascending: true });

            if (fetchError) throw fetchError;

            // 2. Load Local Data
            const savedLocal = localStorage.getItem(`app_finance_v3_${user.username}`);
            const localData = savedLocal ? JSON.parse(savedLocal) : [];

            // 3. Robust Merge Logic
            let finalData = [];
            if (cloudData && cloudData.length > 0) {
                // Cloud as baseline
                finalData = cloudData.map(item => ({
                    ...item,
                    id: Number(item.id)
                }));

                // Identify local entries not in cloud
                const cloudIds = new Set(finalData.map(d => d.id));
                const localOnly = localData.filter(d => !cloudIds.has(Number(d.id)));

                if (localOnly.length > 0) {
                    setSyncStatus('Mencadangkan...');
                    for (const item of localOnly) {
                        await syncToCloud(item);
                    }
                    finalData = [...finalData, ...localOnly].sort((a, b) => a.month - b.month);
                }
                setSyncStatus('Awan Terhubung');
            } else if (localData.length > 0) {
                // Cloud empty, upload local
                setSyncStatus('Mencadangkan...');
                finalData = localData.map(item => ({ ...item, id: Number(item.id) }));
                const syncPromises = finalData.map(item => syncToCloud(item));
                await Promise.all(syncPromises);
                setSyncStatus('Awan Terhubung');
            } else {
                setSyncStatus('Awan Kosong');
            }

            setMonthlyData(finalData);
            localStorage.setItem(`app_finance_v3_${user.username}`, JSON.stringify(finalData));
            setIsInitialLoaded(true);
        } catch (err) {
            console.error("Sync Error:", err);
            setSyncStatus('Error Sinkron');
            const savedLocal = localStorage.getItem(`app_finance_v3_${user.username}`);
            if (savedLocal) setMonthlyData(JSON.parse(savedLocal));
            setIsInitialLoaded(true);
        }
    }, [user?.username, supabase]);

    // Setup RT and Fetch
    useEffect(() => {
        if (!supabase || !user?.username) return;

        syncProcess();

        const channel = supabase
            .channel(`finance_data_${user.username}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'finance_data',
                filter: `user_id=eq.${user.username}`
            }, () => {
                syncProcess();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.username, syncProcess]);

    // Handle Local State changes
    const saveToLocal = (data) => {
        if (user?.username) {
            localStorage.setItem(`app_finance_v3_${user.username}`, JSON.stringify(data));
        }
        setMonthlyData(data);
    };

    const calculatedData = useMemo(() => {
        let runningTotal = 0;
        return (monthlyData || []).map(item => {
            const gaji = Number(item.gaji || 0);
            const bonus = Number(item.bonus || 0);
            const thr = Number(item.thr || 0);
            const pengeluaran = Number(item.pengeluaran || 0);
            const pinjaman = Number(item.pinjaman || 0);

            const totalBulanan = (gaji + bonus + thr) - pengeluaran - pinjaman;
            runningTotal += totalBulanan;
            return {
                ...item,
                totalBulanan: isNaN(totalBulanan) ? 0 : totalBulanan,
                akumulasiTabungan: isNaN(runningTotal) ? 0 : runningTotal
            };
        });
    }, [monthlyData]);

    const stats = useMemo(() => {
        const lastItem = calculatedData.length > 0 ? calculatedData[calculatedData.length - 1] : null;
        const totalCash = lastItem ? (Number(lastItem.akumulasiTabungan) || 0) : 0;
        const totalGaji = (monthlyData || []).reduce((acc, curr) => acc + Number(curr.gaji || 0), 0);
        const totalBonus = (monthlyData || []).reduce((acc, curr) => acc + Number(curr.bonus || 0), 0);
        const totalThr = (monthlyData || []).reduce((acc, curr) => acc + Number(curr.thr || 0), 0);
        const totalPinjaman = (monthlyData || []).reduce((acc, curr) => acc + Number(curr.pinjaman || 0), 0);
        const totalPengeluaran = (monthlyData || []).reduce((acc, curr) => acc + Number(curr.pengeluaran || 0), 0);
        const totalEmasGram = (monthlyData || []).reduce((acc, curr) => acc + Number(curr.emas || 0), 0);
        const totalEmasIDR = totalEmasGram * (Number(goldPrice) || 2549000);

        return { totalAkumulasi: totalCash + totalEmasIDR, totalGaji, totalBonus, totalThr, totalPengeluaran, totalEmasGram, totalEmasIDR, totalPinjaman };
    }, [calculatedData, goldPrice, monthlyData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSyncStatus('Menyimpan...');
        if (editingId) {
            const updatedItem = { ...monthlyData.find(item => item.id === editingId), ...formData };
            const updated = monthlyData.map(item => item.id === editingId ? updatedItem : item);
            saveToLocal(updated);
            await syncToCloud(updatedItem);
        } else {
            const nextMonth = monthlyData.length > 0 ? Math.max(...monthlyData.map(m => m.month)) + 1 : 1;
            const newItem = {
                ...formData,
                id: Date.now(),
                month: nextMonth
            };
            saveToLocal([...monthlyData, newItem]);
            await syncToCloud(newItem);
        }
        setShowModal(false);
        setEditingId(null);
        setFormData({ gaji: 0, bonus: 0, thr: 0, pengeluaran: 0, emas: 0, pinjaman: 0 });
        setSyncStatus('Awan Terhubung');
    };

    const handleEdit = (item) => {
        setFormData({
            gaji: item.gaji,
            bonus: item.bonus,
            thr: item.thr,
            emas: item.emas || 0,
            pinjaman: item.pinjaman || 0,
            pengeluaran: item.pengeluaran || 0
        });
        setEditingId(item.id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Hapus data bulan ini?')) {
            setSyncStatus('Menghapus...');
            const deletedItem = monthlyData.find(item => item.id === id);
            const updated = monthlyData.filter(item => item.id !== id);
            const reordered = updated.map((item, index) => ({ ...item, month: index + 1 }));

            saveToLocal(reordered);
            if (deletedItem) {
                await supabase.from('finance_data').delete().eq('id', deletedItem.id);
            }
            // Cleanup cloud months
            for (const item of reordered) {
                await syncToCloud(item);
            }
            setSyncStatus('Awan Terhubung');
        }
    };

    const formatRupiah = (num) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(Number(num) || 0);
    };

    const formatJt = (num) => {
        const n = Number(num) || 0;
        if (n === 0) return '0';
        if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + ' jt';
        return n.toLocaleString('id-ID');
    };

    const SavingsTrendChart = () => {
        if (calculatedData.length === 0) return (
            <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--primary)' }}><BarChart3 size={24} /></div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>Belum ada data untuk ditampilkan</p>
                </div>
            </div>
        );

        const width = 1000;
        const height = 320;
        const padding = 70;
        const displayData = [{ month: 0, akumulasiTabungan: 0 }, ...calculatedData];
        const maxVal = Math.max(...displayData.map(d => Number(d.akumulasiTabungan) || 0), 1000000) * 1.1;
        const range = maxVal || 1;

        const points = displayData.map((d, i) => {
            const totalItems = displayData.length - 1;
            const x = totalItems > 0 ? (i / totalItems) * (width - padding * 2) + padding : padding;
            const y = height - (Number(d.akumulasiTabungan || 0) / range) * (height - padding * 2) - padding;
            return { x, y };
        });

        let dPath = `M ${points[0].x},${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const cp1x = p0.x + (p1.x - p0.x) / 2;
            dPath += ` C ${cp1x},${p0.y} ${cp1x},${p1.y} ${p1.x},${p1.y}`;
        }

        const areaPath = `${dPath} L ${points[points.length - 1].x},${height - padding} L ${points[0].x},${height - padding} Z`;

        return (
            <div className="glass-effect" style={{ padding: isMobile ? '16px' : '28px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.05), transparent)', pointerEvents: 'none' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={22} /></div>
                    <div>
                        <h4 style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>Financial Growth</h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Trend akumulasi tabungan & aset emas</p>
                    </div>
                </div>
                <div style={{ position: 'relative' }}>
                    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                        <defs>
                            <linearGradient id="mainGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity="0.4" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></linearGradient>
                            <filter id="neonShadow"><feGaussianBlur stdDeviation="6" /><feFlood floodColor="#10b981" floodOpacity="0.5" /><feComposite in2="SourceGraphic" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                        </defs>
                        <path d={areaPath} fill="url(#mainGradient)" />
                        <path d={dPath} fill="none" stroke="#10b981" strokeWidth="5" filter="url(#neonShadow)" />
                        {points.map((p, i) => i === 0 ? null : (
                            <g key={i}>
                                <circle cx={p.x} cy={p.y} r="6" fill="#0f172a" stroke="#10b981" strokeWidth="3" />
                                <text x={p.x} y={p.y - 20} textAnchor="middle" fill="white" fontSize="11" fontWeight="900" style={{ pointerEvents: 'none' }}>{formatJt(displayData[i].akumulasiTabungan)}</text>
                                <text x={p.x} y={height - padding + 25} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10" fontWeight="800">BLN {displayData[i].month}</text>
                            </g>
                        ))}
                    </svg>
                </div>
            </div>
        );
    };

    const handleResetAllFallback = () => {
        if (!user?.username) return;
        if (window.confirm("AWAS! Ini akan menghapus semua data keuangan cadangan di browser ini. Lanjutkan?")) {
            localStorage.removeItem(`app_finance_v3_${user.username}`);
            window.location.reload();
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <header className="finance-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
                <div>
                    <h2 style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>Dashboard Keuangan</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: syncStatus === 'Awan Terhubung' ? '#10b981' : '#f59e0b', boxShadow: syncStatus === 'Awan Terhubung' ? '0 0 10px #10b981' : 'none' }}></div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 'bold' }}>SINKRONISASI: {syncStatus.toUpperCase()}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={syncProcess} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}><RefreshCw size={20} className={syncStatus === 'Sinkronisasi...' ? 'spin-animation' : ''} /></button>
                    <button onClick={() => { setEditingId(null); setFormData({ gaji: 0, bonus: 0, thr: 0, pengeluaran: 0, emas: 0, pinjaman: 0 }); setShowModal(true); }} style={{ padding: '12px 24px', borderRadius: '14px', background: 'var(--primary)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)', cursor: 'pointer' }}>
                        <Plus size={20} /> {isMobile ? '' : 'Input Data'}
                    </button>
                </div>
            </header>

            <div className="chart-container" style={{ order: 1 }}><SavingsTrendChart /></div>

            <div className="finance-stats-grid" style={{ order: 3 }}>
                <div className="glass-effect" style={{ padding: '24px', borderLeft: '4px solid #10b981' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <PiggyBank size={24} color="#10b981" />
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#10b981' }}>TOTAL TABUNGAN</span>
                    </div>
                    <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>{formatRupiah(stats.totalAkumulasi)}</h3>
                </div>
                <div className="glass-effect" style={{ padding: '24px', borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <Banknote size={24} color="#3b82f6" />
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#3b82f6' }}>TOTAL GAJI</span>
                    </div>
                    <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>{formatRupiah(stats.totalGaji)}</h3>
                </div>
                <div className="glass-effect" style={{ padding: '24px', borderLeft: '4px solid #ef4444' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <Wallet size={24} color="#ef4444" />
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#ef4444' }}>TOTAL PINJAMAN</span>
                    </div>
                    <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>{formatRupiah(stats.totalPinjaman)}</h3>
                </div>
                <div className="glass-effect" style={{ padding: '24px', borderLeft: '4px solid #f59e0b', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <Coins size={24} color="#fcd34d" />
                        <div style={{ textAlign: 'right' }}><span style={{ fontSize: '10px', color: '#fcd34d' }}>TABUNGAN EMAS</span></div>
                    </div>
                    <h3 style={{ fontSize: '30px', fontWeight: '900', color: 'white' }}>{stats.totalEmasGram.toString().replace('.', ',')} <span style={{ fontSize: '16px' }}>gr</span></h3>
                    <div style={{ fontSize: '14px', color: '#fcd34d', fontWeight: 'bold' }}>{formatRupiah(stats.totalEmasIDR)}</div>
                </div>
            </div>

            <div className="glass-effect" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '20px', border: '1px solid rgba(251,191,36,0.1)', order: 3.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Sparkles size={20} color="#fbbf24" />
                    <div><div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '800' }}>HARGA EMAS ANTAM LIVE</div><div style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>{formatRupiah(goldPrice)}</div></div>
                </div>
            </div>

            <div className="glass-effect table-premium-container" style={{ borderRadius: '24px', overflow: 'hidden', order: 4 }}>
                <div className="table-responsive-wrapper">
                    <table className="finance-table-v3" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(15, 23, 42, 0.4)', textAlign: 'left' }}>
                                <th style={{ padding: '18px 24px', fontSize: '12px', color: 'var(--text-muted)' }}>BULAN</th>
                                <th style={{ padding: '18px 24px', fontSize: '12px', color: 'var(--text-muted)' }}>GAJI</th>
                                <th style={{ padding: '18px 24px', fontSize: '12px', color: 'var(--text-muted)' }}>BONUS</th>
                                <th style={{ padding: '18px 24px', fontSize: '12px', color: 'var(--text-muted)' }}>EMAS</th>
                                <th style={{ padding: '18px 24px', fontSize: '12px', color: 'var(--text-muted)' }}>PINJAMAN</th>
                                <th style={{ padding: '18px 24px', fontSize: '12px', color: 'var(--text-muted)' }}>OUT</th>
                                <th style={{ padding: '18px 24px', fontSize: '12px', color: '#10b981' }}>TOTAL</th>
                                <th style={{ padding: '18px 24px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>AKSI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {calculatedData.map((item) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '18px 24px', fontWeight: '700', color: 'white' }}>Bulan {item.month}</td>
                                    <td style={{ padding: '18px 24px' }}>{formatJt(item.gaji)}</td>
                                    <td style={{ padding: '18px 24px' }}>{formatJt(item.bonus)}</td>
                                    <td style={{ padding: '18px 24px' }}>{item.emas} gr</td>
                                    <td style={{ padding: '18px 24px', color: '#ef4444' }}>-{formatJt(item.pinjaman)}</td>
                                    <td style={{ padding: '18px 24px', color: '#ef4444' }}>-{formatJt(item.pengeluaran)}</td>
                                    <td style={{ padding: '18px 24px', fontWeight: '900', color: '#10b981' }}>{formatJt(item.akumulasiTabungan)}</td>
                                    <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleEdit(item)} style={{ background: 'rgba(59,130,246,0.1)', border: 'none', color: 'var(--primary)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Edit2 size={14} /></button>
                                            <button onClick={() => handleDelete(item.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {showModal && (
                    <div className="finance-modal-overlay">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-effect finance-modal-content">
                            <div style={{ padding: '24px', background: 'rgba(59,130,246,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: '900', color: 'white' }}>{editingId ? 'Edit Data' : 'Tambah Data'}</h3>
                            </div>
                            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div><label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>GAJI</label><input type="text" value={formData.gaji.toLocaleString('id-ID')} onChange={e => setFormData({ ...formData, gaji: e.target.value.replace(/\D/g, '') })} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} /></div>
                                    <div><label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>OUT</label><input type="text" value={formData.pengeluaran.toLocaleString('id-ID')} onChange={e => setFormData({ ...formData, pengeluaran: e.target.value.replace(/\D/g, '') })} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} /></div>
                                    <div><label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>BONUS</label><input type="text" value={formData.bonus.toLocaleString('id-ID')} onChange={e => setFormData({ ...formData, bonus: e.target.value.replace(/\D/g, '') })} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} /></div>
                                    <div><label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>THR</label><input type="text" value={formData.thr.toLocaleString('id-ID')} onChange={e => setFormData({ ...formData, thr: e.target.value.replace(/\D/g, '') })} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} /></div>
                                    <div><label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>EMAS (GR)</label><input type="number" step="0.01" value={formData.emas} onChange={e => setFormData({ ...formData, emas: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} /></div>
                                    <div><label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>PINJAMAN</label><input type="text" value={formData.pinjaman.toLocaleString('id-ID')} onChange={e => setFormData({ ...formData, pinjaman: e.target.value.replace(/\D/g, '') })} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} /></div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none' }}>Batal</button>
                                    <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 'bold' }}>Simpan</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .chart-container { overflow-x: auto; scrollbar-width: none; }
                .chart-container::-webkit-scrollbar { display: none; }
                .finance-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
                .table-responsive-wrapper { overflow-x: auto; }
                .finance-table-v3 { min-width: 800px; }
                .finance-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
                .finance-modal-content { width: 100%; max-width: 450px; background: #0f172a; border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
                .spin-animation { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default Keuangan;

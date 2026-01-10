import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Wallet, TrendingUp, TrendingDown, Award, Banknote, Trash2, Edit2, ChevronRight, BarChart3, PiggyBank, Cloud, CloudOff, Coins, Sparkles, X } from 'lucide-react';

const Keuangan = () => {
    const { user } = useAuth();

    // Key localStorage yang unik per user
    const [monthlyData, setMonthlyData] = useState([]);
    const [isInitialLoaded, setIsInitialLoaded] = useState(false);

    // Initial Load based on USER
    useEffect(() => {
        if (user?.username) {
            // Bersihkan data lama jika ada saat switching akun
            setMonthlyData([]);
            setIsInitialLoaded(false);

            try {
                const saved = localStorage.getItem(`app_finance_v3_${user.username}`);
                const parsed = saved ? JSON.parse(saved) : [];
                setMonthlyData(Array.isArray(parsed) ? parsed : []);
                setIsInitialLoaded(true);
            } catch (e) {
                console.error("Failed to parse finance data:", e);
                setMonthlyData([]);
            }
        } else {
            setMonthlyData([]);
            setIsInitialLoaded(false);
        }
    }, [user?.username]);

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [syncStatus, setSyncStatus] = useState('Offline');
    const [goldPrice, setGoldPrice] = useState(2549000); // Default fallback price
    const [isPriceLoading, setIsPriceLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
    const [renderError, setRenderError] = useState(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Initial State for Form
    const [formData, setFormData] = useState({
        gaji: 0,
        bonus: 0,
        thr: 0,
        pengeluaran: 0,
        emas: 0,
        pinjaman: 0
    });

    // Fetch Gold Price from API
    useEffect(() => {
        const fetchGoldPrice = async () => {
            setIsPriceLoading(true);
            try {
                // Using a public API for gold price (Antam)
                const response = await fetch('https://logammulia-api.vercel.app/api/antam');
                const result = await response.json();
                if (result.data && result.data[0]) {
                    const price = result.data[0].harga; // Getting the latest price
                    setGoldPrice(Number(price) || 2549000);
                }
            } catch (error) {
                console.error("Failed to fetch gold price:", error);
                // Fallback is already set in initial state
            } finally {
                setIsPriceLoading(false);
            }
        };

        fetchGoldPrice();
        // Refresh price every hour
        const interval = setInterval(fetchGoldPrice, 3600000);
        return () => clearInterval(interval);
    }, []);

    // Initial Load from Cloud (if available) - Improved Logic
    // Unified Initial Load & Sync Logic
    useEffect(() => {
        if (!supabase || !user?.username) return;

        const syncProcess = async () => {
            setSyncStatus('Syncing...');

            try {
                // 1. Fetch Cloud Data
                const { data: cloudData, error: fetchError } = await supabase
                    .from('finance_data')
                    .select('*')
                    .eq('user_id', user.username)
                    .order('month', { ascending: true });

                if (fetchError) throw fetchError;

                // 2. Load Local Data (fresh from storage to avoid closure issues)
                const savedLocal = localStorage.getItem(`app_finance_v3_${user.username}`);
                const localData = savedLocal ? JSON.parse(savedLocal) : [];

                if (cloudData && cloudData.length > 0) {
                    // Cloud has data - prioritize it
                    setMonthlyData(cloudData);
                    setSyncStatus('Cloud Connected');
                } else if (localData.length > 0) {
                    // Cloud empty but local has data - Back up to cloud
                    setSyncStatus('Backing up...');
                    setMonthlyData(localData);
                    const syncPromises = localData.map(item => syncToCloud(item));
                    await Promise.all(syncPromises);
                    setSyncStatus('Cloud Connected');
                } else {
                    setSyncStatus('Awan Kosong');
                }

                setIsInitialLoaded(true);
            } catch (err) {
                console.error("Sync Error:", err);
                setSyncStatus('Offline Mode');
                const savedLocal = localStorage.getItem(`app_finance_v3_${user.username}`);
                if (savedLocal) setMonthlyData(JSON.parse(savedLocal));
                setIsInitialLoaded(true);
            }
        };

        syncProcess();

        const channel = supabase
            .channel(`finance_data_${user.username}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'finance_data',
                filter: `user_id=eq.${user.username}`
            }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    setMonthlyData(prev => {
                        const exists = prev.find(item => item.id === payload.new.id);
                        if (exists) return prev.map(item => item.id === payload.new.id ? payload.new : item);
                        return [...prev, payload.new].sort((a, b) => a.month - b.month);
                    });
                } else if (payload.eventType === 'DELETE') {
                    setMonthlyData(prev => prev.filter(item => item.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.username]);

    // Local Backup
    useEffect(() => {
        if (!user?.username || !isInitialLoaded) return;
        localStorage.setItem(`app_finance_v3_${user.username}`, JSON.stringify(monthlyData));
    }, [monthlyData, user?.username, isInitialLoaded]);

    const syncToCloud = async (item, action = 'upsert') => {
        if (!supabase || !user?.username) return;

        setSyncStatus('Saving...');

        if (action === 'delete') {
            const { error } = await supabase.from('finance_data').delete().eq('id', item.id);
            if (!error) setSyncStatus('Cloud Connected');
            else setSyncStatus('Sync Failed');
        } else {
            const { error } = await supabase.from('finance_data').upsert({
                id: item.id,
                user_id: user.username,
                month: item.month,
                gaji: Number(item.gaji || 0),
                bonus: Number(item.bonus || 0),
                thr: Number(item.thr || 0),
                emas: Number(item.emas || 0),
                pinjaman: Number(item.pinjaman || 0),
                pengeluaran: Number(item.pengeluaran || 0),
                last_updated: new Date().toISOString()
            });

            if (!error) setSyncStatus('Cloud Connected');
            else {
                console.error("Sync error:", error);
                setSyncStatus('Sync Failed');
            }
        }
    };

    const saveToLocal = (data) => {
        if (user?.username) {
            localStorage.setItem(`app_finance_v3_${user.username}`, JSON.stringify(data));
        }
        setMonthlyData(data);
    };

    const calculatedData = useMemo(() => {
        try {
            let runningTotal = 0;
            return (monthlyData || []).map(item => {
                if (!item) return null;
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
            }).filter(Boolean);
        } catch (e) {
            console.error("Error calculating data:", e);
            return [];
        }
    }, [monthlyData]);

    const stats = useMemo(() => {
        try {
            const lastItem = calculatedData.length > 0 ? calculatedData[calculatedData.length - 1] : null;
            const totalCash = lastItem ? (Number(lastItem.akumulasiTabungan) || 0) : 0;
            const totalGaji = (monthlyData || []).reduce((acc, curr) => acc + Number(curr.gaji || 0), 0);
            const totalBonus = (monthlyData || []).reduce((acc, curr) => acc + Number(curr.bonus || 0), 0);
            const totalThr = (monthlyData || []).reduce((acc, curr) => acc + Number(curr.thr || 0), 0);
            const totalPinjaman = (monthlyData || []).reduce((acc, curr) => acc + Number(curr.pinjaman || 0), 0);
            const totalPengeluaran = (monthlyData || []).reduce((acc, curr) => acc + Number(curr.pengeluaran || 0), 0);
            const totalEmasGram = (monthlyData || []).reduce((acc, curr) => acc + Number(curr.emas || 0), 0);
            const totalEmasIDR = totalEmasGram * (Number(goldPrice) || 2549000);

            // Total Tabungan = Cash Accumulation + Gold Value
            const totalAkumulasi = totalCash + totalEmasIDR;

            return { totalAkumulasi, totalGaji, totalBonus, totalThr, totalPengeluaran, totalEmasGram, totalEmasIDR, totalPinjaman };
        } catch (e) {
            console.error("Error calculating stats:", e);
            return { totalAkumulasi: 0, totalGaji: 0, totalBonus: 0, totalThr: 0, totalPengeluaran: 0, totalEmasGram: 0, totalEmasIDR: 0, totalPinjaman: 0 };
        }
    }, [calculatedData, goldPrice, monthlyData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingId) {
            const updatedItem = { ...monthlyData.find(item => item.id === editingId), ...formData };
            const updated = monthlyData.map(item =>
                item.id === editingId ? updatedItem : item
            );
            saveToLocal(updated);
            syncToCloud(updatedItem);
        } else {
            const nextMonth = monthlyData.length > 0 ? Math.max(...monthlyData.map(m => m.month)) + 1 : 1;
            const newItem = {
                ...formData,
                id: Date.now(),
                month: nextMonth
            };
            saveToLocal([...monthlyData, newItem]);
            syncToCloud(newItem);
        }
        setShowModal(false);
        setEditingId(null);
        setFormData({ gaji: 0, bonus: 0, thr: 0, pengeluaran: 0, emas: 0, pinjaman: 0 });
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

    const handleDelete = (id) => {
        if (window.confirm('Hapus data bulan ini?')) {
            const deletedItem = monthlyData.find(item => item.id === id);
            const updated = monthlyData.filter(item => item.id !== id);
            const reordered = updated.map((item, index) => ({ ...item, month: index + 1 }));
            saveToLocal(reordered);

            // Sync delete to Cloud
            if (deletedItem) syncToCloud(deletedItem, 'delete');
        }
    };

    const formatRupiah = (num) => {
        try {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0
            }).format(Number(num) || 0);
        } catch (e) {
            return 'Rp 0';
        }
    };

    const formatJt = (num) => {
        try {
            const n = Number(num) || 0;
            if (n === 0) return '0';
            const absolute = Math.abs(n);
            if (absolute >= 1000000) return (n / 1000000).toFixed(1) + ' jt';
            return n.toLocaleString('id-ID');
        } catch (e) {
            return '0';
        }
    };

    // Enhanced Premium SVG Chart Component
    const SavingsTrendChart = () => {
        if (calculatedData.length === 0) return (
            <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--primary)' }}><BarChart3 size={24} /></div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>Belum ada data untuk ditampilkan</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '4px' }}>Input data bulan pertama untuk melihat grafik pertumbuhan</p>
                </div>
            </div>
        );

        const width = 1000;
        const height = 320;
        const padding = 70;

        // Display data starts from 0 for a continuous line
        const displayData = [{ month: 0, akumulasiTabungan: 0, gaji: 0, bonus: 0, thr: 0, pengeluaran: 0 }, ...calculatedData];
        const maxVal = Math.max(...displayData.map(d => Number(d.akumulasiTabungan) || 0), 1000000) * 1.1;
        const minVal = 0;
        const range = maxVal - minVal || 1;

        const getCoords = (d, i) => {
            const totalItems = displayData.length - 1;
            const x = totalItems > 0 ? (i / totalItems) * (width - padding * 2) + padding : padding;
            const y = height - ((Number(d.akumulasiTabungan || 0) - minVal) / range) * (height - padding * 2) - padding;
            return { x, y };
        };

        const points = displayData.map((d, i) => getCoords(d, i));

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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={22} /></div>
                        <div>
                            <h4 style={{ fontSize: '18px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px' }}>Financial Growth</h4>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Trend akumulasi tabungan & aset emas</p>
                        </div>
                    </div>
                </div>

                <div style={{ position: 'relative' }}>
                    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                        <defs>
                            <linearGradient id="mainGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                            </linearGradient>
                            <filter id="neonShadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="6" result="blur" />
                                <feOffset dx="0" dy="4" result="offsetBlur" />
                                <feFlood floodColor="#10b981" floodOpacity="0.5" result="flood" />
                                <feComposite in="flood" in2="offsetBlur" operator="in" result="shadow" />
                                <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                        </defs>

                        {[0, 0.25, 0.5, 0.75, 1].map(v => (
                            <g key={v}>
                                <line x1={padding} y1={height - (v * (height - padding * 2)) - padding} x2={width - padding} y2={height - (v * (height - padding * 2)) - padding} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                <text x={padding - 15} y={height - (v * (height - padding * 2)) - padding + 4} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="10" fontWeight="700">{formatJt(v * maxVal)}</text>
                            </g>
                        ))}

                        <motion.path initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} d={areaPath} fill="url(#mainGradient)" />
                        <motion.path initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.5, ease: "easeOut" }} d={dPath} fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonShadow)" />

                        {points.map((p, i) => {
                            if (i === 0) return null;
                            const data = displayData[i];
                            const x = p.x;
                            const y = p.y;
                            return (
                                <g key={i}>
                                    <motion.circle initial={{ r: 0 }} animate={{ r: 6 }} transition={{ delay: 0.5 + i * 0.1 }} cx={x} cy={y} fill="#0f172a" stroke="#10b981" strokeWidth="3" style={{ filter: 'drop-shadow(0 0 4px #10b981)' }} />
                                    <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 + i * 0.1 }}>
                                        <rect x={x - 30} y={y - 35} width="60" height="22" rx="6" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(16, 185, 129, 0.2)" />
                                        <text x={x} y={y - 20} textAnchor="middle" fill="white" fontSize="11" fontWeight="900">{formatJt(data.akumulasiTabungan)}</text>
                                        <text x={x} y={height - padding + 25} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10" fontWeight="800">BLN {data.month}</text>
                                    </motion.g>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>
        );
    };

    const handleResetAllFallback = () => {
        if (!user?.username) return;
        if (window.confirm("AWAS! Ini akan menghapus semua data keuangan cadangan milik kamu di browser ini. Lanjutkan?")) {
            localStorage.removeItem(`app_finance_v3_${user.username}`);
            window.location.reload();
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {renderError && (
                <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '12px', color: 'white', textAlign: 'center', order: -2 }}>
                    <h3 style={{ marginBottom: '10px' }}>⚠️ Terjadi kesalahan tampilan</h3>
                    <p style={{ fontSize: '14px', marginBottom: '15px' }}>{renderError}</p>
                    <button onClick={handleResetAllFallback} style={{ padding: '10px 20px', background: '#ef4444', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}>Reset Data Keuangan</button>
                </div>
            )}
            <header className="finance-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px', order: isMobile ? 0 : 0 }}>
                <div style={{ flex: '1 1 100%' }}>
                    <h2 style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>Dashboard Keuangan</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Lacak gaji, bonus, pengeluaran, dan target tabunganmu.</p>
                </div>
            </header>

            {/* Savings Chart - Primary position on mobile */}
            <div className="chart-container" style={{ order: isMobile ? 1 : 10 }}>
                <SavingsTrendChart />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', order: isMobile ? 2 : 0 }}>
                <div style={{ textAlign: isMobile ? 'left' : 'right', borderBottom: isMobile ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingBottom: isMobile ? '12px' : '0', width: isMobile ? '100%' : 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: isMobile ? 'flex-start' : 'flex-end', marginBottom: '4px' }}>
                        <Sparkles size={14} color="#fcd34d" />
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#fcd34d' }}>HARGA EMAS ANTAM</span>
                    </div>
                    <p style={{ fontSize: '20px', fontWeight: '900', color: 'white' }}>{formatRupiah(goldPrice)} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/gr</span></p>
                </div>
                <button
                    onClick={() => { setEditingId(null); setFormData({ gaji: 0, bonus: 0, thr: 0, pengeluaran: 0, emas: 0, pinjaman: 0 }); setShowModal(true); }}
                    style={{
                        padding: '14px 24px', borderRadius: '14px', background: 'var(--primary)', color: 'white',
                        border: 'none', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800',
                        boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)', cursor: 'pointer', width: isMobile ? '100%' : 'auto', justifyContent: 'center'
                    }}
                >
                    <Plus size={20} /> Tambah Data
                </button>
            </div>

            {/* Quick Stats Cards */}
            <div className="finance-stats-grid" style={{ order: 3 }}>
                <motion.div whileHover={{ y: -5 }} className="glass-effect" style={{ padding: '24px', borderLeft: '4px solid #10b981', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), transparent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><PiggyBank size={24} /></div>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#10b981' }}>TOTAL TABUNGAN</span>
                    </div>
                    <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>{formatRupiah(stats.totalAkumulasi)}</h3>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="glass-effect" style={{ padding: '24px', borderLeft: '4px solid #3b82f6', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), transparent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><Banknote size={24} /></div>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#3b82f6' }}>TOTAL GAJI</span>
                    </div>
                    <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>{formatRupiah(stats.totalGaji)}</h3>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="glass-effect" style={{ padding: '24px', borderLeft: '4px solid #ef4444', background: 'linear-gradient(135deg, rgba(239,68,68,0.1), transparent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><Wallet size={24} /></div>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#ef4444' }}>TOTAL PINJAMAN</span>
                    </div>
                    <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>{formatRupiah(stats.totalPinjaman)}</h3>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="glass-effect" style={{ padding: '24px', borderLeft: '4px solid #f59e0b', background: 'linear-gradient(225deg, rgba(245,158,11,0.1), transparent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><TrendingUp size={24} /></div>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#f59e0b' }}>TOTAL BONUS</span>
                    </div>
                    <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>{formatRupiah(stats.totalBonus)}</h3>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="glass-effect" style={{ padding: '24px', borderLeft: '4px solid #ec4899', background: 'linear-gradient(225deg, rgba(236,72,153,0.1), transparent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(236,72,153,0.1)', color: '#ec4899' }}><Award size={24} /></div>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#ec4899' }}>TOTAL THR</span>
                    </div>
                    <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>{formatRupiah(stats.totalThr)}</h3>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="glass-effect" style={{ padding: '24px', borderLeft: '4px solid #ef4444', background: 'linear-gradient(135deg, rgba(239,68,68,0.1), transparent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><TrendingDown size={24} /></div>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#ef4444' }}>TOTAL PENGELUARAN</span>
                    </div>
                    <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>{formatRupiah(stats.totalPengeluaran)}</h3>
                </motion.div>

                <motion.div whileHover={{ y: -5, scale: 1.02 }} className="glass-effect" style={{ padding: '24px', borderLeft: '4px solid #fbbf24', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(251,191,36,0.1), transparent)' }}>
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'rgba(251,191,36,0.05)', borderRadius: '50%', blur: '20px' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', position: 'relative' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}><Coins size={24} /></div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: '#fbbf24', letterSpacing: '1px', textTransform: 'uppercase' }}>Physical Asset</span>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: 'white', marginTop: '2px' }}>TABUNGAN EMAS</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <h3 style={{ fontSize: '32px', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>
                            {stats.totalEmasGram % 1 === 0 ? stats.totalEmasGram : stats.totalEmasGram.toString().replace('.', ',')}
                        </h3>
                        <span style={{ fontSize: '16px', fontWeight: '800', color: '#fbbf24' }}>gr</span>
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Est. Nilai:</div>
                        <div style={{ fontSize: '14px', color: '#fbbf24', fontWeight: '900' }}>{formatRupiah(stats.totalEmasIDR)}</div>
                    </div>
                </motion.div>
            </div>


            {/* Main Table Section */}
            <div className="glass-effect table-premium-container" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', order: 4 }}>
                <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', display: 'flex' }}>
                            <BarChart3 size={20} />
                        </div>
                        <div>
                            <h4 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '800', color: 'white' }}>Laporan Tabungan & Pengeluaran</h4>
                            {isMobile && <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>← Geser tabel ke samping untuk melihat detail →</p>}
                        </div>
                    </div>
                </div>
                <div className="table-responsive-wrapper">
                    <table className="finance-table-v3">
                        <thead>
                            <tr style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
                                <th className="sticky-col" style={{ padding: '18px 24px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bulan</th>
                                <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gaji</th>
                                <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bonus</th>
                                <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>THR</th>
                                <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: '800', color: '#fcd34d', textTransform: 'uppercase' }}>Beli Emas</th>
                                <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: '800', color: '#8b5cf6', textTransform: 'uppercase' }}>Pinjaman</th>
                                <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase' }}>Pengeluaran</th>
                                <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: '800', color: 'rgba(59,130,246,0.8)', textTransform: 'uppercase' }}>Sisa</th>
                                <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: '800', color: '#10b981', textTransform: 'uppercase' }}>Akumulasi</th>
                                <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {calculatedData.map((item, idx) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                                    <td className="sticky-col" data-label="Bulan" style={{ padding: '18px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: 'var(--primary)' }}>{item.month}</div>
                                            <span style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>Bulan {item.month}</span>
                                        </div>
                                    </td>
                                    <td data-label="Gaji" style={{ padding: '18px 24px', fontWeight: '600', color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>{formatJt(item.gaji)}</td>
                                    <td data-label="Bonus" style={{ padding: '18px 24px', fontWeight: '600', color: Number(item.bonus) > 0 ? '#f59e0b' : 'rgba(255,255,255,0.4)', fontSize: '14px' }}>{formatJt(item.bonus)}</td>
                                    <td data-label="THR" style={{ padding: '18px 24px', fontWeight: '600', color: Number(item.thr) > 0 ? '#ec4899' : 'rgba(255,255,255,0.4)', fontSize: '14px' }}>{formatJt(item.thr)}</td>
                                    <td data-label="Emas" style={{ padding: '18px 24px', fontWeight: '600', color: Number(item.emas) > 0 ? '#fbbf24' : 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                                        {item.emas > 0 ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 5px #fbbf24' }}></div>
                                                {item.emas.toString().replace('.', ',')} gr
                                            </div>
                                        ) : '0 gr'}
                                    </td>
                                    <td data-label="Pinjaman" style={{ padding: '18px 24px', fontWeight: '600', color: Number(item.pinjaman) > 0 ? '#8b5cf6' : 'rgba(255,255,255,0.4)', fontSize: '14px' }}>-{formatJt(item.pinjaman)}</td>
                                    <td data-label="Pengeluaran" style={{ padding: '18px 24px', fontWeight: '600', color: '#ef4444', fontSize: '14px' }}>-{formatJt(item.pengeluaran)}</td>
                                    <td data-label="Sisa Bulanan" style={{ padding: '18px 24px', fontWeight: '800', color: item.totalBulanan >= 0 ? 'var(--primary)' : '#ef4444', background: 'rgba(59,130,246,0.02)', fontSize: '14px' }}>{formatJt(item.totalBulanan)}</td>
                                    <td data-label="Akumulasi" style={{ padding: '18px 24px', fontWeight: '900', color: '#10b981', background: 'rgba(16,185,129,0.02)', fontSize: '14px' }}>{formatJt(item.akumulasiTabungan)}</td>
                                    <td data-label="Aksi" style={{ padding: '18px 24px', textAlign: 'right' }}>
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

            {/* Modal Editor */}
            <AnimatePresence>
                {showModal && (
                    <div className="finance-modal-overlay">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-effect finance-modal-content"
                            style={{ margin: isMobile ? 'auto' : '0' }}
                        >
                            <div style={{ padding: isMobile ? '20px' : '32px', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), transparent)', borderBottom: '1px solid var(--glass-border)', position: 'relative' }}>
                                <button
                                    onClick={() => setShowModal(false)}
                                    style={{ position: 'absolute', right: '16px', top: '16px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
                                >
                                    <X size={18} />
                                </button>
                                <h3 style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '900', color: 'white' }}>{editingId ? 'Edit Data Keuangan' : 'Tambah Keuangan Bulan'}</h3>
                                <p style={{ fontSize: isMobile ? '12px' : '14px', color: 'var(--text-muted)', marginTop: '4px' }}>Masukkan detail pendapatan dan pengeluaran bulan ini.</p>
                            </div>
                            <form onSubmit={handleSubmit} style={{ padding: isMobile ? '20px' : '32px', maxHeight: isMobile ? '70vh' : 'auto', overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gap: '18px' }}>
                                    <div className="finance-modal-input-group">
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>GAJI</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="text"
                                                    placeholder="0"
                                                    value={Number(formData.gaji).toLocaleString('id-ID')}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        setFormData({ ...formData, gaji: val || 0 });
                                                    }}
                                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', paddingLeft: '40px' }}
                                                />
                                                <Banknote size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>PENGELUARAN</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="text"
                                                    placeholder="0"
                                                    value={Number(formData.pengeluaran).toLocaleString('id-ID')}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        setFormData({ ...formData, pengeluaran: val || 0 });
                                                    }}
                                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', paddingLeft: '40px', border: '1px solid rgba(239,68,68,0.2)' }}
                                                />
                                                <TrendingDown size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#ef4444' }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="finance-modal-input-group">
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>BONUS</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="text"
                                                    placeholder="0"
                                                    value={Number(formData.bonus).toLocaleString('id-ID')}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        setFormData({ ...formData, bonus: val || 0 });
                                                    }}
                                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', paddingLeft: '40px' }}
                                                />
                                                <TrendingUp size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#f59e0b' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>THR</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="text"
                                                    placeholder="0"
                                                    value={Number(formData.thr).toLocaleString('id-ID')}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        setFormData({ ...formData, thr: val || 0 });
                                                    }}
                                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', paddingLeft: '40px' }}
                                                />
                                                <Award size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#ec4899' }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="finance-modal-input-group">
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>BELI EMAS (GRAM)</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    placeholder="0.000"
                                                    value={formData.emas}
                                                    onChange={e => setFormData({ ...formData, emas: e.target.value })}
                                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', paddingLeft: '40px' }}
                                                />
                                                <Coins size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#fcd34d' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>PINJAMAN</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="text"
                                                    placeholder="0"
                                                    value={Number(formData.pinjaman).toLocaleString('id-ID')}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        setFormData({ ...formData, pinjaman: val || 0 });
                                                    }}
                                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', paddingLeft: '40px' }}
                                                />
                                                <Wallet size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8b5cf6' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                                    <button type="button" onClick={() => { setShowModal(false); setEditingId(null); setFormData({ gaji: 0, bonus: 0, thr: 0, pengeluaran: 0, emas: 0, pinjaman: 0 }); }} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', fontWeight: '700' }}>Batal</button>
                                    <button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: '900', boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)' }}>{editingId ? 'Simpan Perubahan' : 'Simpan Data'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .page-wrapper {
                    animation: pageFadeIn 0.4s ease-out forwards;
                }

                @keyframes pageFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .finance-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }
                .finance-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 20px;
                }
                    .finance-modal-input-group {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 18px;
                    }

                    .finance-modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100vh;
                        background: rgba(0,0,0,0.92);
                        backdrop-filter: blur(20px);
                        -webkit-backdrop-filter: blur(20px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 999999;
                        padding: 20px;
                    }

                    .finance-modal-content {
                        width: 100%;
                        max-width: 450px;
                        background: #0f172a;
                        border-radius: 28px;
                        border: 1px solid rgba(255,255,255,0.1);
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                        overflow: hidden;
                        position: relative;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    @media (max-width: 1024px) {
                        .finance-header {
                            flex-direction: column;
                            align-items: flex-start;
                            gap: 20px;
                        }
                        .finance-header button {
                            width: 100%;
                            justify-content: center;
                        }
                        .finance-stats-grid {
                            grid-template-columns: 1fr;
                        }
                        .finance-modal-input-group {
                            grid-template-columns: 1fr;
                            gap: 12px;
                        }
                        .finance-modal-overlay {
                            padding: 16px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        .finance-modal-content {
                            border-radius: 20px;
                        }
                        .chart-container {
                            overflow-x: auto;
                        }
                        .chart-container > div {
                            min-width: 600px; /* Ensure chart has space */
                        }
                        
                        /* Premium Horizontal Slide Table */
                        .table-premium-container {
                            display: flex;
                            flex-direction: column;
                        }
                        .table-responsive-wrapper {
                            overflow-x: auto;
                            -webkit-overflow-scrolling: touch;
                            position: relative;
                            scrollbar-width: thin;
                            scrollbar-color: rgba(59, 130, 246, 0.3) transparent;
                        }
                        .table-responsive-wrapper::-webkit-scrollbar {
                            height: 6px;
                        }
                        .table-responsive-wrapper::-webkit-scrollbar-thumb {
                            background: rgba(59, 130, 246, 0.3);
                            border-radius: 10px;
                        }
                        
                        .finance-table-v3 {
                            width: 100%;
                            min-width: 900px; /* Force sliding on mobile */
                            border-collapse: separate;
                            border-spacing: 0;
                            text-align: left;
                        }
                        
                        .finance-table-v3 th, .finance-table-v3 td {
                            white-space: nowrap;
                            padding: 18px 20px;
                        }

                        .sticky-col {
                            position: sticky;
                            left: 0;
                            z-index: 10;
                            background: #0f172a !important; /* Match background */
                            box-shadow: 4px 0 10px rgba(0,0,0,0.3);
                        }
                        
                        .finance-table-v3 th.sticky-col {
                            background: rgba(15, 23, 42, 1) !important;
                            z-index: 11;
                        }

                        /* Clear up mobile card view hacks as we are using sticky sliding table now */
                        table, thead, tbody, th, td, tr {
                            display: table-cell; /* Reset to default */
                        }
                        tr {
                            display: table-row !important;
                            margin-bottom: 0 !important;
                            border: none !important;
                            background: none !important;
                            padding: 0 !important;
                        }
                        thead {
                             display: table-header-group !important;
                             position: static !important;
                        }
                        tbody {
                             display: table-row-group !important;
                        }
                        td:before {
                            display: none !important;
                        }
                        td {
                            padding-left: 20px !important;
                            text-align: left !important;
                            justify-content: flex-start !important;
                        }
                        td[data-label="Akumulasi"], td[data-label="Sisa Bulanan"] {
                            margin: 0 !important;
                            padding-right: 20px !important;
                        }
                    }
            `}</style>
        </div>
    );
};

export default Keuangan;

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
    const [goldPrice, setGoldPrice] = useState(1360000); // Fallback price
    const [isPriceLoading, setIsPriceLoading] = useState(false);

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
       FETCH GOLD PRICE
    ========================= */
    useEffect(() => {
        const fetchGoldPrice = async () => {
            setIsPriceLoading(true);
            try {
                // Using a public proxy for Logam Mulia or generic gold API
                // For demo resilience, we use a static fallback if API fails
                // In production, use meaningful third-party API
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
            // Local First
            const localKey = `finance_trx_${user.username}`;
            const cached = localStorage.getItem(localKey);
            if (cached) setTransactions(JSON.parse(cached));

            // Cloud Fetch
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
       CRUD
    ========================= */
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Handle Amount vs Grams
        // If type is 'emas', amount represents GRAMS
        // If type is others, amount represents RUPIAH
        const cleanAmount = Number(formData.amount.replace(/[^0-9.]/g, ''));

        const newItem = {
            id: Date.now(), // Temp ID
            user_id: user.username,
            type: formData.type,
            amount: cleanAmount,
            description: formData.description,
            date: formData.date
        };

        // Optimistic
        const updated = [newItem, ...transactions];
        setTransactions(updated);
        localStorage.setItem(`finance_trx_${user.username}`, JSON.stringify(updated));

        setShowModal(false);
        setFormData({ type: 'gaji', amount: '', description: '', date: new Date().toISOString().split('T')[0] });

        // Cloud
        try {
            const { error } = await supabase.from('financial_records').insert({
                user_id: user.username,
                type: newItem.type,
                amount: newItem.amount,
                description: newItem.description,
                date: newItem.date
            });
            if (error) throw error;
            setSyncStatus('🟢 Sinkronisasi Cloud OK');
        } catch (err) {
            setSyncStatus('🔴 Gagal Upload (Disimpan Lokal)');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Hapus transaksi ini?")) return;

        // Optimistic
        const updated = transactions.filter(t => t.id !== id);
        setTransactions(updated);
        localStorage.setItem(`finance_trx_${user.username}`, JSON.stringify(updated));

        try {
            await supabase.from('financial_records').delete().eq('id', id);
        } catch (err) {
            console.error("Delete Fail", err);
        }
    };

    /* =========================
       CALCULATIONS
    ========================= */
    const stats = useMemo(() => {
        const totalGaji = transactions.filter(t => t.type === 'gaji').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const totalBonus = transactions.filter(t => t.type === 'bonus').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const totalTHR = transactions.filter(t => t.type === 'thr').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        // Emas Calculation: stored amount is in GRAMS
        const totalEmasGrams = transactions.filter(t => t.type === 'emas').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const totalEmasValue = totalEmasGrams * goldPrice; // Automatis harga sekarang

        const totalPinjaman = transactions.filter(t => t.type === 'pinjaman').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        const totalPemasukan = totalGaji + totalBonus + totalTHR + totalEmasValue;
        const saldoBersih = totalPemasukan - totalPinjaman;

        return { totalGaji, totalBonus, totalTHR, totalEmasGrams, totalEmasValue, totalPinjaman, saldoBersih, totalPemasukan };
    }, [transactions, goldPrice]);

    // Chart Data Preparation (Last 6 Months)
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
                const d = new Date(t.date);
                const key = d.toLocaleString('default', { month: 'short' });
                if (months[key] !== undefined) {
                    // Normalize value: if emas, convert to IDR
                    const val = t.type === 'emas' ? (Number(t.amount) * goldPrice) : Number(t.amount);
                    months[key] += val;
                }
            }
        });
        return Object.entries(months).map(([name, value]) => ({ name, value }));
    }, [transactions, goldPrice]);

    const filteredTransactions = transactions.filter(t => {
        const matchType = filterType === 'all' ? true : t.type === filterType;
        const matchSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.amount?.toString().includes(searchTerm);
        return matchType && matchSearch;
    });

    return (
        <div className="min-h-screen text-white p-4 md:p-8 space-y-8 font-sans">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end flex-wrap gap-4">
                <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                        Keuangan Personal
                    </h1>
                    <p className="text-sm font-medium text-slate-400 mt-2 flex items-center gap-2">
                        {syncStatus.includes('OK') ? <Zap size={14} className="text-green-400" /> : <Zap size={14} className="text-red-400" />}
                        {syncStatus}
                    </p>
                </div>
                <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                    <Plus size={20} /> Input Data
                </button>
            </motion.div>

            {/* Price Ticker */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-center gap-3">
                <div className="bg-yellow-500 rounded-full p-1"><Coins size={14} className="text-black" /></div>
                <span className="text-sm font-bold text-yellow-500">
                    Harga Emas Saat Ini: {isPriceLoading ? '...' : formatRupiah(goldPrice)} /gram
                </span>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <SummaryCard icon={<Banknote />} label="Total Gaji" value={stats.totalGaji} color="blue" />
                <SummaryCard icon={<Award />} label="Total Bonus" value={stats.totalBonus} color="purple" />
                <SummaryCard icon={<Landmark />} label="Total THR" value={stats.totalTHR} color="emerald" />
                <SummaryCard
                    icon={<Coins />}
                    label="Emas (Aset)"
                    value={stats.totalEmasValue}
                    subtext={`${stats.totalEmasGrams} Gram`}
                    color="yellow"
                />
                <SummaryCard icon={<TrendingDown />} label="Pinjaman" value={stats.totalPinjaman} color="red" />
                <SummaryCard icon={<Wallet />} label="Saldo Bersih" value={stats.saldoBersih} color={stats.saldoBersih >= 0 ? "green" : "red"} highlight />
            </div>

            {/* Visuals Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-50"><TrendingUp size={100} className="text-white/5" /></div>
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Calendar size={20} className="text-blue-400" /> Tren Aset (6 Bulan)</h3>
                    <div className="flex items-end justify-between h-48 gap-2">
                        {monthlyData.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                <div className="w-full bg-slate-700/50 rounded-t-lg relative h-full flex items-end overflow-hidden">
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${(d.value / (Math.max(...monthlyData.map(m => m.value)) || 1)) * 100}%` }}
                                        className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 opacity-80 group-hover:opacity-100 transition-all rounded-t-lg"
                                    />
                                </div>
                                <span className="text-xs font-bold text-slate-400">{d.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6">
                    <h3 className="text-xl font-bold mb-6">Komposisi Aset</h3>
                    <div className="space-y-4">
                        <CompBar label="Gaji" value={stats.totalGaji} total={stats.totalPemasukan} color="bg-blue-500" />
                        <CompBar label="Bonus" value={stats.totalBonus} total={stats.totalPemasukan} color="bg-purple-500" />
                        <CompBar label="THR" value={stats.totalTHR} total={stats.totalPemasukan} color="bg-emerald-500" />
                        <CompBar label="Emas" value={stats.totalEmasValue} total={stats.totalPemasukan} color="bg-yellow-500" />
                    </div>
                </div>
            </div>

            {/* Transaction List */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden min-h-[400px]">
                <div className="p-6 border-b border-white/5 flex flex-wrap gap-4 justify-between items-center">
                    <h3 className="text-xl font-bold flex items-center gap-2"><GripHorizontal /> Riwayat Transaksi</h3>
                    <div className="flex gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Cari..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-slate-900/50 pl-10 pr-4 py-2 rounded-xl text-sm border border-white/10 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="bg-slate-900/50 px-4 py-2 rounded-xl text-sm border border-white/10 focus:outline-none"
                        >
                            <option value="all">Semua Jenis</option>
                            <option value="gaji">💼 Gaji</option>
                            <option value="bonus">🎁 Bonus</option>
                            <option value="thr">🕌 THR</option>
                            <option value="emas">Coins Emas</option>
                            <option value="pinjaman">📉 Pinjaman</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase font-bold">
                            <tr>
                                <th className="p-4">Tanggal</th>
                                <th className="p-4">Jenis</th>
                                <th className="p-4">Keterangan</th>
                                <th className="p-4 text-right">Nilai / Berat</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredTransactions.map((t) => (
                                <tr key={t.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-mono text-sm text-slate-300">{new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                                            ${t.type === 'pinjaman' ? 'bg-red-500/20 text-red-400' :
                                                t.type === 'gaji' ? 'bg-blue-500/20 text-blue-400' :
                                                    t.type === 'emas' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                                            }`}>
                                            {t.type === 'pinjaman' ? 'DEBIT' : t.type}
                                        </span>
                                    </td>
                                    <td className="p-4 font-medium">{t.description || '-'}</td>
                                    <td className={`p-4 text-right font-bold font-mono ${t.type === 'pinjaman' ? 'text-red-400' : 'text-green-400'}`}>
                                        {t.type === 'pinjaman' ? '-' : '+'}
                                        {t.type === 'emas' ? ` ${t.amount} Gram` : formatRupiah(t.amount)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => handleDelete(t.id)} className="text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-500 italic">
                                        Belum ada data transaksi.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Input */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-900 border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                <h3 className="font-bold text-xl">Tambah Data</h3>
                                <button onClick={() => setShowModal(false)}><X className="text-slate-400 hover:text-white" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Jenis Transaksi</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['gaji', 'bonus', 'thr', 'emas', 'pinjaman'].map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type, amount: '' })} // Reset amount on change
                                                className={`px-2 py-2 rounded-xl text-xs font-bold uppercase border active:scale-95 transition-all
                                                    ${formData.type === type ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                                        {formData.type === 'emas' ? 'Berat (Gram)' : 'Nominal (Rp)'}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.type === 'emas' ? formData.amount : formatRupiah(formData.amount).replace('Rp', '').trim()}
                                        onChange={e => {
                                            const val = e.target.value;
                                            // Allow decimals for Grams, Only integers for IDR
                                            const clean = formData.type === 'emas' ? val : val.replace(/\D/g, '');
                                            setFormData({ ...formData, amount: clean });
                                        }}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 font-mono text-lg font-bold focus:border-blue-500 focus:outline-none"
                                        placeholder={formData.type === 'emas' ? "Contoh: 5.5" : "0"}
                                        required
                                    />
                                    {formData.type === 'emas' && formData.amount && (
                                        <p className="text-xs text-yellow-500 mt-2 font-bold">
                                            Estimasi Nilai: {formatRupiah(Number(formData.amount) * goldPrice)}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Keterangan</label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="Contoh: Gaji Bulan Januari"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tanggal</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                                        required
                                    />
                                </div>

                                <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all mt-4">
                                    Simpan Transaksi
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Components
const SummaryCard = ({ icon, label, value, subtext, color, highlight = false }) => {
    const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);

    const colors = {
        blue: 'from-blue-500/10 to-blue-500/5 text-blue-400 border-blue-500/20',
        purple: 'from-purple-500/10 to-purple-500/5 text-purple-400 border-purple-500/20',
        emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
        yellow: 'from-yellow-500/10 to-yellow-500/5 text-yellow-400 border-yellow-500/20',
        red: 'from-red-500/10 to-red-500/5 text-red-400 border-red-500/20',
        green: 'from-green-500/10 to-green-500/5 text-green-400 border-green-500/20'
    };

    return (
        <motion.div whileHover={{ y: -5 }} className={`relative overflow-hidden rounded-2xl border p-5 bg-gradient-to-br ${colors[color]} ${highlight ? 'ring-2 ring-white/20' : ''}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/5 rounded-xl">{icon}</div>
                {highlight && <div className="text-xs font-bold px-2 py-1 bg-white/10 rounded-lg animate-pulse">LIVE</div>}
            </div>
            <p className="text-xs font-bold uppercase opacity-60 mb-1">{label}</p>
            <h3 className="text-lg md:text-xl font-black truncate">{formatRupiah(value)}</h3>
            {subtext && <p className="text-xs font-medium opacity-80 mt-1">{subtext}</p>}
        </motion.div>
    );
};

const CompBar = ({ label, value, total, color }) => {
    const percent = total > 0 ? (value / total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-400">{label}</span>
                <span>{percent.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${percent}%` }}></div>
            </div>
        </div>
    );
};

export default Keuangan;
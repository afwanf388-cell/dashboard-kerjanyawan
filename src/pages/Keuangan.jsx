import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import {
    Plus, Wallet, TrendingDown, Award, Banknote,
    Trash2, Search, Calendar, Coins, Landmark, Zap, X
} from "lucide-react";

/* =========================
   UTIL
========================= */
const formatRupiah = (num) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(num || 0);

/* =========================
   MAIN COMPONENT
========================= */
const Keuangan = () => {
    const [userId, setUserId] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [syncStatus, setSyncStatus] = useState("🔄 Sinkronisasi...");

    const [formData, setFormData] = useState({
        type: "gaji",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
    });

    const [filterType, setFilterType] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    /* =========================
       AUTH UID (WAJIB)
    ========================= */
    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getUser();
            if (data?.user) setUserId(data.user.id);
        };
        getUser();
    }, []);

    /* =========================
       FETCH DATA (CLOUD FIRST)
    ========================= */
    const fetchData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("financial_records")
                .select("*")
                .eq("user_id", userId)
                .order("date", { ascending: false });

            if (error) throw error;

            setTransactions(data || []);
            localStorage.setItem(`finance_${userId}`, JSON.stringify(data || []));
            setSyncStatus("🟢 Sinkronisasi Cloud OK");
        } catch (err) {
            console.error(err);
            const cache = localStorage.getItem(`finance_${userId}`);
            if (cache) setTransactions(JSON.parse(cache));
            setSyncStatus("🔴 Offline / Error Fetch");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    /* =========================
       INITIAL + REALTIME
    ========================= */
    useEffect(() => {
        if (!userId) return;
        fetchData();

        const channel = supabase
            .channel(`finance-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "financial_records",
                    filter: `user_id=eq.${userId}`,
                },
                fetchData
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [userId, fetchData]);

    /* =========================
       CRUD
    ========================= */
    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            user_id: userId,
            type: formData.type,
            amount: Number(formData.amount),
            description: formData.description,
            date: formData.date,
        };

        setShowModal(false);
        setFormData({ type: "gaji", amount: "", description: "", date: payload.date });

        try {
            await supabase.from("financial_records").insert(payload);
            setSyncStatus("🟢 Sinkronisasi Cloud OK");
        } catch {
            setSyncStatus("🔴 Gagal simpan ke cloud");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Hapus transaksi ini?")) return;
        await supabase.from("financial_records").delete().eq("id", id);
    };

    /* =========================
       CALCULATION
    ========================= */
    const stats = useMemo(() => {
        const sum = (type) =>
            transactions
                .filter((t) => t.type === type)
                .reduce((a, b) => a + (b.amount || 0), 0);

        const totalGaji = sum("gaji");
        const totalBonus = sum("bonus");
        const totalTHR = sum("thr");
        const totalEmas = sum("emas");
        const totalPinjaman = sum("pinjaman");

        const totalPemasukan =
            totalGaji + totalBonus + totalTHR + totalEmas;
        const saldoBersih = totalPemasukan - totalPinjaman;

        return {
            totalGaji,
            totalBonus,
            totalTHR,
            totalEmas,
            totalPinjaman,
            saldoBersih,
        };
    }, [transactions]);

    const filteredTransactions = transactions.filter((t) => {
        const okType = filterType === "all" || t.type === filterType;
        const okSearch =
            t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(t.amount).includes(searchTerm);
        return okType && okSearch;
    });

    /* =========================
       RENDER
    ========================= */
    return (
        <div className="min-h-screen p-4 md:p-8 text-white space-y-8">

            {/* HEADER */}
            <div className="flex justify-between items-end flex-wrap gap-4">
                <div>
                    <h1 className="text-4xl font-black">Keuangan Personal</h1>
                    <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                        <Zap size={14} /> {syncStatus}
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-blue-600 rounded-xl font-bold flex items-center gap-2"
                >
                    <Plus /> Input
                </button>
            </div>

            {/* HERO SALDO */}
            <motion.div className="rounded-3xl p-8 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
                <p className="uppercase text-sm opacity-70">Saldo Bersih</p>
                <h1 className="text-5xl font-black mt-2">
                    {formatRupiah(stats.saldoBersih)}
                </h1>
            </motion.div>

            {/* SUMMARY */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Card icon={<Banknote />} label="Gaji" value={stats.totalGaji} />
                <Card icon={<Award />} label="Bonus" value={stats.totalBonus} />
                <Card icon={<Landmark />} label="THR" value={stats.totalTHR} />
                <Card icon={<Coins />} label="Emas" value={stats.totalEmas} />
                <Card
                    icon={<TrendingDown />}
                    label="Pinjaman"
                    value={stats.totalPinjaman}
                    negative
                />
            </div>

            {/* TRANSAKSI */}
            <div className="bg-slate-800/50 rounded-3xl overflow-hidden">
                <div className="p-4 flex gap-2">
                    <Search size={16} />
                    <input
                        className="bg-transparent outline-none flex-1"
                        placeholder="Cari..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-slate-700 rounded-lg px-2"
                    >
                        <option value="all">Semua</option>
                        <option value="gaji">Gaji</option>
                        <option value="bonus">Bonus</option>
                        <option value="thr">THR</option>
                        <option value="emas">Emas</option>
                        <option value="pinjaman">Pinjaman</option>
                    </select>
                </div>

                <table className="w-full text-sm">
                    <tbody>
                        {filteredTransactions.map((t) => (
                            <tr key={t.id} className="border-t border-white/5">
                                <td className="p-3">{t.date}</td>
                                <td className="p-3 uppercase">{t.type}</td>
                                <td className="p-3">{t.description}</td>
                                <td
                                    className={`p-3 text-right font-bold ${t.type === "pinjaman"
                                            ? "text-red-400"
                                            : "text-emerald-400"
                                        }`}
                                >
                                    {t.type === "pinjaman" ? "-" : "+"}
                                    {formatRupiah(t.amount)}
                                </td>
                                <td className="p-3 text-center">
                                    <button onClick={() => handleDelete(t.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredTransactions.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-6 text-center text-slate-500">
                                    Tidak ada data
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
                        <motion.form
                            onSubmit={handleSubmit}
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-slate-900 p-6 rounded-2xl w-full max-w-md space-y-4"
                        >
                            <div className="flex justify-between">
                                <h3 className="font-bold">Tambah Transaksi</h3>
                                <button type="button" onClick={() => setShowModal(false)}>
                                    <X />
                                </button>
                            </div>

                            <select
                                value={formData.type}
                                onChange={(e) =>
                                    setFormData({ ...formData, type: e.target.value })
                                }
                                className="w-full bg-slate-800 p-2 rounded"
                            >
                                <option value="gaji">Gaji</option>
                                <option value="bonus">Bonus</option>
                                <option value="thr">THR</option>
                                <option value="emas">Emas</option>
                                <option value="pinjaman">Pinjaman</option>
                            </select>

                            <input
                                type="number"
                                placeholder="Nominal"
                                value={formData.amount}
                                onChange={(e) =>
                                    setFormData({ ...formData, amount: e.target.value })
                                }
                                className="w-full bg-slate-800 p-2 rounded"
                                required
                            />

                            <input
                                type="text"
                                placeholder="Keterangan"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                className="w-full bg-slate-800 p-2 rounded"
                            />

                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) =>
                                    setFormData({ ...formData, date: e.target.value })
                                }
                                className="w-full bg-slate-800 p-2 rounded"
                            />

                            <button className="w-full bg-blue-600 py-3 rounded-xl font-bold">
                                Simpan
                            </button>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* =========================
   CARD
========================= */
const Card = ({ icon, label, value, negative }) => (
    <div className="p-5 rounded-2xl bg-slate-800/50">
        <div className="flex justify-between">
            {icon}
            <span className="text-xs opacity-60">{label}</span>
        </div>
        <h3
            className={`mt-2 font-black ${negative ? "text-red-400" : "text-emerald-400"
                }`}
        >
            {formatRupiah(value)}
        </h3>
    </div>
);

export default Keuangan;

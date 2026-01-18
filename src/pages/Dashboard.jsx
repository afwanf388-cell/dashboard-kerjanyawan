import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutGrid, CheckSquare, Clock, Users, TrendingUp, TrendingDown,
    ArrowUpRight, Search, Bell, MessageSquare, MoreHorizontal, Plus,
    Calendar, ChevronDown, Command, CreditCard, DollarSign, Target,
    Settings, Activity, UserX, Key, NotebookPen, Wallet, Globe,
    ExternalLink, Zap, Shield, Landmark
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// --- PREMIUM COMPONENTS ---

const GlassCard = ({ children, style, className, onClick }) => {
    return (
        <motion.div
            whileHover={onClick ? { y: -5, scale: 1.005 } : {}}
            onClick={onClick}
            style={{
                background: 'rgba(11, 15, 25, 0.7)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '28px',
                padding: '28px',
                boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4)',
                cursor: onClick ? 'pointer' : 'default',
                position: 'relative',
                overflow: 'hidden',
                ...style
            }}
            className={`glass-card ${className || ''}`}
        >
            <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', border: '1px solid rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
            {children}
        </motion.div>
    );
};

const MetricCard = ({ title, value, badge, badgeColor, icon: Icon, color, onClick }) => {
    const isNegative = typeof value === 'string' && value.includes('-');

    return (
        <GlassCard onClick={onClick} style={{ minHeight: '200px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '16px',
                    background: `linear-gradient(135deg, rgba(${color}, 0.2), rgba(${color}, 0.05))`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid rgba(${color}, 0.25)`
                }}>
                    <Icon size={24} color={`rgb(${color})`} />
                </div>
                {badge && (
                    <div style={{
                        background: 'rgba(2, 6, 23, 0.6)',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid rgba(255,255,255,0.06)'
                    }}>
                        <ArrowUpRight size={12} color={`rgb(${badgeColor || '16, 185, 129'})`} />
                        <span style={{ fontSize: '11px', fontWeight: '900', color: `rgb(${badgeColor || '16, 185, 129'})`, textTransform: 'uppercase' }}>{badge}</span>
                    </div>
                )}
            </div>
            <div style={{ marginTop: '24px' }}>
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>{title}</p>
                <h2 style={{
                    fontSize: '40px',
                    fontWeight: '900',
                    margin: 0,
                    color: isNegative ? '#ef4444' : 'white',
                    letterSpacing: '-1.5px',
                    textShadow: isNegative ? '0 0 20px rgba(239, 68, 68, 0.2)' : 'none'
                }}>{value}</h2>
            </div>
        </GlassCard>
    );
};

const ActivityItem = ({ type, title, subtitle, date, icon: Icon, color, onClick }) => (
    <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ x: 5, background: 'rgba(255, 255, 255, 0.03)' }}
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '12px 16px',
            borderRadius: '16px',
            cursor: onClick ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            border: '1px solid transparent',
            marginBottom: '4px'
        }}
    >
        <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: `rgba(${color}, 0.1)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: `1px solid rgba(${color}, 0.2)`,
            boxShadow: `0 8px 16px - 4px rgba(${color}, 0.1)`
        }}>
            <Icon size={18} color={`rgb(${color})`} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h4>
                <span style={{ fontSize: '10px', color: '#475569', fontWeight: '900', flexShrink: 0, marginLeft: '8px', textTransform: 'uppercase' }}>{date}</span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</p>
        </div>
        {onClick && (
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                <ArrowUpRight size={12} />
            </div>
        )}
    </motion.div>
);

// --- SWITCH COMPONENT ---
// --- ADVANCED CLOCK ---

// --- ADVANCED CLOCK ---
const AdvancedClock = ({ fontFamily }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const seconds = time.getSeconds().toString().padStart(2, '0');

    const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '900', letterSpacing: '2px' }}>{days[time.getDay()]}</span>
                <span style={{ fontSize: '13px', color: 'white', fontWeight: '800', letterSpacing: '1px' }}>{time.getDate()} {months[time.getMonth()]} {time.getFullYear()}</span>
            </div>
            <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                padding: '8px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'baseline',
                gap: '2px',
                fontFamily: (fontFamily && typeof fontFamily === 'string' && (fontFamily.includes('Orbitron') || fontFamily.includes('DynaPuff'))) ? fontFamily : 'inherit'
            }}>
                <span style={{ fontSize: '28px', fontWeight: '900', color: 'white', letterSpacing: '1px' }}>{hours}:{minutes}</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#3b82f6', width: '20px' }}>{seconds}</span>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD ---
const DASHBOARD_BANK_DATA = [
    { id: 'qris', name: 'QRIS', type: 'Payment Gateway', schedule: '24 Jam', offline: null, color: '234, 179, 8', logo: 'QRIS', status: 'ONLINE', isPopular: true },
    { id: 'usdt', name: 'USDT (TRC20)', type: 'Cryptocurrency', schedule: '24 Jam', offline: null, color: '34, 197, 94', logo: 'USDT', status: 'ONLINE' },
    { id: 'bca', name: 'Bank BCA', type: 'bank', schedule: '00:20 - 22:00', offline: '22:00 - 00:20', color: '59, 130, 246', logo: 'BCA', status: 'OFFLINE' },
    { id: 'mandiri', name: 'Bank Mandiri', type: 'bank', schedule: '03:00 - 23:00', offline: '23:00 - 03:00', color: '245, 158, 11', logo: 'MANDIRI', status: 'OFFLINE' },
    { id: 'bri', name: 'Bank BRI', type: 'bank', schedule: '24 Jam', offline: null, color: '16, 185, 129', logo: 'BRI', status: 'TROUBLE' },
    { id: 'bni', name: 'Bank BNI', type: 'bank', schedule: '24 Jam', offline: null, color: '249, 115, 22', logo: 'BNI', status: 'TROUBLE' },
    { id: 'bsi', name: 'Bank BSI', type: 'bank', schedule: '01:00 - 22:00', offline: '22:00 - 01:00', color: '20, 184, 166', logo: 'BSI', status: 'OFFLINE' },
    { id: 'cimb', name: 'Bank CIMB', type: 'bank', schedule: '24 Jam', offline: null, color: '239, 68, 68', logo: 'CIMB', status: 'ONLINE' },
    { id: 'danamon', name: 'Bank Danamon', type: 'bank', schedule: '24 Jam', offline: null, color: '245, 158, 11', logo: 'DANAMON', status: 'ONLINE' },
    { id: 'seabank', name: 'SeaBank', type: 'bank', schedule: '24 Jam', offline: null, color: '249, 115, 22', logo: 'SEABANK', status: 'ONLINE' },
    { id: 'maybank', name: 'Maybank', type: 'bank', schedule: '24 Jam', offline: null, color: '245, 158, 11', logo: 'MAYBANK', status: 'ONLINE' },
    { id: 'jago', name: 'Bank Jago', type: 'bank', schedule: '24 Jam', offline: null, color: '236, 72, 153', logo: 'JAGO', status: 'ONLINE' },
    { id: 'dana', name: 'DANA', type: 'wallet', schedule: '24 Jam', offline: null, color: '59, 130, 246', logo: 'DANA', status: 'ONLINE' },
    { id: 'ovo', name: 'OVO', type: 'wallet', schedule: '24 Jam', offline: null, color: '139, 92, 246', logo: 'OVO', status: 'ONLINE' },
    { id: 'gopay', name: 'GoPay', type: 'wallet', schedule: '24 Jam', offline: null, color: '16, 185, 129', logo: 'GOPAY', status: 'ONLINE' },
    { id: 'linkaja', name: 'LinkAja', type: 'wallet', schedule: '24 Jam', offline: null, color: '239, 68, 68', logo: 'LINKAJA', status: 'ONLINE' },
];

const getDashboardBankStatus = (bank) => {
    if (bank.status === 'TROUBLE') return 'TROUBLE';
    if (bank.status === 'OFFLINE') return 'OFFLINE'; // Explicit override
    if (bank.schedule === '24 Jam') return 'ONLINE';

    const now = new Date();
    const currentTotalMin = now.getHours() * 60 + now.getMinutes();
    try {
        const [startStr, endStr] = bank.schedule.split(' - ');
        if (!startStr || !endStr) return 'ONLINE';
        const [startH, startM] = startStr.split(':').map(Number);
        const [endH, endM] = endStr.split(':').map(Number);
        const startTotalMin = startH * 60 + startM;
        const endTotalMin = endH * 60 + endM;

        if (startTotalMin < endTotalMin) {
            return (currentTotalMin >= startTotalMin && currentTotalMin < endTotalMin) ? 'ONLINE' : 'OFFLINE';
        } else {
            return (currentTotalMin >= startTotalMin || currentTotalMin < endTotalMin) ? 'ONLINE' : 'OFFLINE';
        }
    } catch (e) { return 'ONLINE'; }
};

const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { dashboardSettings, setDashboardSettings, onOpenSettings } = useOutletContext();
    const [stats, setStats] = useState({
        notes: 0,
        mistakes: 0,
        schedules: 0,
        logins: 0,
        balance: 0,
        income: 0,
        expense: 0,
        latestChat: 'System Synchronized',
        recentActivities: [],
        bankStats: { online: 0, trouble: 0, offline: 0 }
    });
    const [activitySearch, setActivitySearch] = useState('');
    const [activityCategory, setActivityCategory] = useState('all');
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load dynamic statistics
    useEffect(() => {
        const loadStats = async () => {
            if (!user) return;
            try {
                if (!user?.username) return;
                const suffix = `_${user.username} `;

                const localNotes = JSON.parse(localStorage.getItem(`app_catatan_kerja${suffix} `) || '[]');
                const localLogins = JSON.parse(localStorage.getItem(`app_login_data${suffix} `) || '[]');
                const localMistakes = JSON.parse(localStorage.getItem(`app_mistakes${suffix} `) || '[]').filter(m => m.id !== 888888888 && m.staff_name !== 'CONFIG_HIDDEN');
                const localSchedules = JSON.parse(localStorage.getItem(`app_schedules${suffix} `) || '[]');
                let localFinance = JSON.parse(localStorage.getItem(`finance_trx${suffix} `) || '[]');

                // Fetch Gold Price for accurate balance (same logic as Keuangan.jsx)
                let currentGoldPrice = 1360000;
                const savedPrice = localStorage.getItem('aceh_gold_price');
                const savedMode = localStorage.getItem('is_gold_manual');

                if (savedMode === 'true' && savedPrice) {
                    currentGoldPrice = Number(savedPrice);
                } else {
                    try {
                        // Use CORS proxy to prevent browser console errors
                        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent('https://logammulia-api.vercel.app/api/antam')}`);
                        if (response.ok) {
                            const result = await response.json();
                            if (result.data && result.data[0]) {
                                currentGoldPrice = Number(result.data[0].harga);
                            }
                        }
                    } catch (e) {
                        // Fallback silently or log warning if needed, but the proxy should prevent CORS red errors
                        console.warn("Gold price API unavailable, using fallback:", e.message);
                    }
                }

                let totalGaji = 0, totalBonus = 0, totalThr = 0, totalPengeluaran = 0, totalPinjaman = 0, totalEmasGrams = 0;
                localFinance.forEach(t => {
                    const amt = Number(t.amount || 0);
                    if (t.type === 'gaji' || t.type === 'bonus' || t.type === 'thr') totalGaji += amt;
                    if (t.type === 'emas') totalEmasGrams += amt;
                    if (t.type === 'pengeluaran') totalPengeluaran += amt;
                    if (t.type === 'pinjaman') totalPinjaman += amt;
                });

                const totalEmasValue = totalEmasGrams * currentGoldPrice;
                const totalBalance = (totalGaji + totalBonus + totalThr + totalEmasValue - totalPengeluaran - totalPinjaman);

                const formatDate = (d) => {
                    if (!d) return 'Recent';
                    // Convert various date formats to a consistent DD/MM/YYYY for display
                    if (d.includes('-')) { // YYYY-MM-DD
                        const parts = d.split('-');
                        if (parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                        return d;
                    }
                    return d;
                };

                const parseDateScore = (d) => {
                    if (!d) return 0;
                    try {
                        if (d.includes('/')) {
                            const [day, month, year] = d.split('/');
                            return new Date(year, month - 1, day).getTime();
                        }
                        return new Date(d).getTime();
                    } catch (e) { return 0; }
                };

                // Combine activities from ALL sources
                const activities = [
                    ...localNotes.map(n => ({
                        type: 'note',
                        title: `Note: ${n.title || 'Untitled'}`,
                        subtitle: n.content?.substring(0, 40) || 'No content',
                        date: formatDate(n.date),
                        rawDate: n.date,
                        color: '59, 130, 246',
                        icon: NotebookPen,
                        onClick: () => navigate('/catatan')
                    })),
                    ...localMistakes.map(m => ({
                        type: 'mistake',
                        title: `Mistake: ${m.staff_name || 'Staff'}`,
                        subtitle: `${m.type || 'Error'} record`,
                        date: formatDate(m.date),
                        rawDate: m.date,
                        color: '239, 68, 68',
                        icon: UserX,
                        onClick: () => navigate('/kesalahan-staf')
                    })),
                    ...localLogins.map(l => ({
                        type: 'login',
                        title: `Entry: ${l.title}`,
                        subtitle: `Account: ${l.username || l.email || 'No User'}`,
                        date: formatDate(l.createdDate),
                        rawDate: l.createdDate,
                        color: '139, 92, 246',
                        icon: Key,
                        onClick: () => navigate('/data-login')
                    })),
                    ...localFinance.map(f => ({
                        type: 'finance',
                        title: `${f.type.toUpperCase()} Record`,
                        subtitle: `${f.description || 'Finance update'} - ${formatIDR(f.amount)}`,
                        date: formatDate(f.date),
                        rawDate: f.date,
                        color: f.type === 'pengeluaran' || f.type === 'pinjaman' ? '239, 68, 68' : '16, 185, 129',
                        icon: Wallet,
                        onClick: () => navigate('/keuangan')
                    }))
                ].sort((a, b) => parseDateScore(b.rawDate) - parseDateScore(a.rawDate)).slice(0, 20);

                // Use hardcoded data for dashboard to ensure instant consistency with Jadwal Bank page
                const bankCounts = { online: 0, trouble: 0, offline: 0 };

                DASHBOARD_BANK_DATA.forEach(bank => {
                    const status = getDashboardBankStatus(bank);
                    if (status === 'ONLINE') bankCounts.online++;
                    else if (status === 'TROUBLE') bankCounts.trouble++;
                    else bankCounts.offline++;
                });

                setStats({
                    notes: localNotes.length,
                    mistakes: localMistakes.length,
                    schedules: localSchedules.length,
                    logins: localLogins.length,
                    balance: totalBalance,
                    income: totalGaji + totalBonus + totalThr + totalEmasValue,
                    expense: totalPengeluaran + totalPinjaman,
                    latestChat: 'System Synchronized',
                    recentActivities: activities,
                    bankStats: bankCounts
                });
            } catch (e) { console.error(e); }
        };
        loadStats();
        // Refresh every 30 seconds for live feel
        const interval = setInterval(loadStats, 30000);
        return () => clearInterval(interval);
    }, [user?.username]); // Changed from user to user?.username to prevent unnecessary re-runs

    const formatIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

    return (
        <div style={{ color: '#f8fafc' }}>
            {/* Header Area */}
            <div className="dashboard-header-action" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '32px',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div style={{ flex: '1 1 300px', minWidth: isMobile ? '100%' : '300px' }}>
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 style={{ fontSize: isMobile ? '24px' : 'clamp(24px, 5vw, 36px)', fontWeight: '900', margin: 0, color: 'white', letterSpacing: '-1px' }}>
                            Welcome back, <span style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.displayName || user?.username}</span>! 👋
                        </h1>
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>Sistem Dashboard Keamanan Data v2.0</p>
                    </motion.div>
                </div>
                <div style={{
                    display: 'flex',
                    gap: isMobile ? '8px' : '16px',
                    alignItems: 'center',
                    justifyContent: isMobile ? 'space-between' : 'flex-end',
                    flexWrap: 'nowrap',
                    width: isMobile ? '100%' : 'auto'
                }}>
                    <AdvancedClock fontFamily={dashboardSettings.fontFamily} />
                    <button
                        onClick={onOpenSettings}
                        style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            padding: '10px',
                            borderRadius: '14px',
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.2)'
                        }}
                    >
                        <Settings size={20} color="#60a5fa" />
                    </button>
                </div>
            </div>

            <div className="dashboard-grid">
                <div style={{ gridColumn: 'span 4', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    {dashboardSettings.showNotes && (
                        <MetricCard
                            title="Catatan Kerja"
                            value={stats.notes}
                            badge={`${stats.notes} Catatan`}
                            badgeColor="16, 185, 129"
                            icon={NotebookPen}
                            color="59, 130, 246"
                            onClick={() => navigate('/catatan')}
                        />
                    )}
                    {dashboardSettings.showLogins && (
                        <MetricCard
                            title="Data Login"
                            value={stats.logins}
                            badge={`${stats.logins} Akun`}
                            badgeColor="139, 92, 246"
                            icon={Key}
                            color="139, 92, 246"
                            onClick={() => navigate('/data-login')}
                        />
                    )}
                    {dashboardSettings.showMistakes && (
                        <MetricCard
                            title="Kesalahan Staf"
                            value={stats.mistakes}
                            badge={`${stats.mistakes} Record`}
                            badgeColor="239, 68, 68"
                            icon={UserX}
                            color="239, 68, 68"
                            onClick={() => navigate('/kesalahan-staf')}
                        />
                    )}
                    {dashboardSettings.showBalance && (
                        <MetricCard
                            title="Saldo Keuangan"
                            value={formatIDR(stats.balance)}
                            badge={stats.balance >= 0 ? "POSITIF" : "DEFISIT"}
                            badgeColor={stats.balance >= 0 ? "16, 185, 129" : "239, 68, 68"}
                            icon={Wallet}
                            color={stats.balance >= 0 ? "16, 185, 129" : "239, 68, 68"}
                            onClick={() => navigate('/keuangan')}
                        />
                    )}
                    {dashboardSettings.showBank && (
                        <GlassCard onClick={() => navigate('/jadwal-bank')} style={{ minHeight: '200px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(15, 23, 42, 0.9))', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '16px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)'
                                }}>
                                    <Landmark size={24} color="#60a5fa" />
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <motion.div animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
                                    <motion.div animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2, delay: 0.6 }} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308', boxShadow: '0 0 10px #eab308' }} />
                                    <motion.div animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2, delay: 1.2 }} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px #ef4444' }} />
                                </div>
                            </div>
                            <div style={{ marginTop: '30px' }}>
                                <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>Monitoring Bank</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '900', color: 'white', textShadow: '0 0 20px rgba(34, 197, 94, 0.5)' }}>{stats.bankStats?.online || 0}</p>
                                        <p style={{ margin: 0, fontSize: '9px', fontWeight: '900', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ONLINE</p>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '900', color: 'white', textShadow: '0 0 20px rgba(234, 179, 8, 0.5)' }}>{stats.bankStats?.trouble || 0}</p>
                                        <p style={{ margin: 0, fontSize: '9px', fontWeight: '900', color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TROUBLE</p>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '900', color: 'white', textShadow: '0 0 20px rgba(239, 68, 68, 0.5)' }}>{stats.bankStats?.offline || 0}</p>
                                        <p style={{ margin: 0, fontSize: '9px', fontWeight: '900', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>OFFLINE</p>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    )}
                </div>

                {dashboardSettings.showActivity && (
                    <div style={{ gridColumn: 'span 2' }}>
                        <GlassCard style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div>
                                    <h3 style={{ fontSize: '18px', fontWeight: '900', margin: 0 }}>Recent Activity</h3>
                                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>Log aktivitas sistem terbaru</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '11px', fontWeight: '900', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                                    LIVE UPDATES
                                </div>
                            </div>

                            {/* Activity Filters */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }} className="no-scrollbar">
                                {['all', 'note', 'finance', 'mistake', 'login'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActivityCategory(cat)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '10px',
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            textTransform: 'uppercase',
                                            whiteSpace: 'nowrap',
                                            cursor: 'pointer',
                                            background: activityCategory === cat ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                                            border: activityCategory === cat ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.05)',
                                            color: activityCategory === cat ? '#60a5fa' : '#64748b',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div style={{ position: 'relative', marginBottom: '16px' }}>
                                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                                <input
                                    type="text"
                                    placeholder="Search activity..."
                                    value={activitySearch}
                                    onChange={(e) => setActivitySearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(0,0,0,0.2)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '12px',
                                        padding: '10px 10px 10px 36px',
                                        fontSize: '13px',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
                                <AnimatePresence mode="popLayout">
                                    {stats.recentActivities
                                        .filter(act => (activityCategory === 'all' || act.type === activityCategory))
                                        .filter(act => (act.title + act.subtitle).toLowerCase().includes(activitySearch.toLowerCase()))
                                        .length > 0 ? (
                                        stats.recentActivities
                                            .filter(act => (activityCategory === 'all' || act.type === activityCategory))
                                            .filter(act => (act.title + act.subtitle).toLowerCase().includes(activitySearch.toLowerCase()))
                                            .map((act, i) => (
                                                <ActivityItem key={`${act.type}-${i}`} {...act} />
                                            ))
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
                                            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                                <Activity size={32} style={{ opacity: 0.2 }} />
                                            </div>
                                            <p style={{ fontWeight: '700', margin: 0 }}>No matching activity</p>
                                            <p style={{ fontSize: '12px', marginTop: '4px', opacity: 0.6 }}>Try adjusting your filters or search query</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </GlassCard>
                    </div>
                )}

                <div style={{ gridColumn: dashboardSettings.showActivity ? 'span 2' : 'span 4', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {dashboardSettings.showFinance && (
                        <GlassCard style={{ background: 'linear-gradient(135deg, rgba(11, 15, 25, 0.8), rgba(30, 41, 59, 0.4))' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                                <div>
                                    <h3 style={{ fontSize: '20px', fontWeight: '900', margin: 0, color: 'white', letterSpacing: '-0.5px' }}>Finance Analytics</h3>
                                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>Ringkasan transaksi bulan ini</p>
                                </div>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <TrendingUp size={20} color="#38bdf8" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>Income Volume</span>
                                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#22c55e' }}>{formatIDR(stats.income)}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden' }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (stats.income / (stats.income + stats.expense || 1)) * 100)}%` }} transition={{ duration: 1.5, ease: "easeOut" }} style={{ height: '100%', background: 'linear-gradient(to right, #22c55e, #4ade80)', borderRadius: '10px' }} />
                                    </div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>Expense Load</span>
                                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#ef4444' }}>{formatIDR(stats.expense)}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden' }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (stats.expense / (stats.income + stats.expense || 1)) * 100)}%` }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }} style={{ height: '100%', background: 'linear-gradient(to right, #ef4444, #f87171)', borderRadius: '10px' }} />
                                    </div>
                                </div>
                                <div style={{ marginTop: '8px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Net Profit</span>
                                    <span style={{ fontSize: '18px', fontWeight: '900', color: stats.balance >= 0 ? '#38bdf8' : '#ef4444' }}>{formatIDR(stats.balance)}</span>
                                </div>
                            </div>
                        </GlassCard>
                    )}
                    {dashboardSettings.showChat && (
                        <GlassCard style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div>
                                    <h3 style={{ fontSize: '20px', fontWeight: '900', margin: 0, color: 'white', letterSpacing: '-0.5px' }}>Network Hub</h3>
                                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>Pesan terbaru dalam grup chat</p>
                                </div>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MessageSquare size={20} color="#8b5cf6" />
                                </div>
                            </div>
                            <div style={{ padding: '24px', background: 'rgba(2, 6, 23, 0.6)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px', position: 'relative' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900' }}>S</div>
                                    <span style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: '800' }}>System Message</span>
                                </div>
                                <p style={{ margin: 0, fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6', fontWeight: '500' }}>"{stats.latestChat}"</p>
                                <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
                                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8b5cf6' }} />
                                </div>
                            </div>
                            <button onClick={() => navigate('/chat')} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', borderRadius: '16px', color: 'white', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', fontSize: '15px', boxShadow: '0 12px 24px -6px rgba(139, 92, 246, 0.4)', transition: 'all 0.3s ease', letterSpacing: '0.5px' }}>
                                <Globe size={20} /> CONNECT TO HUB
                            </button>
                        </GlassCard>
                    )}
                </div>
            </div>



            <style>{`
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 24px;
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.3); }

                @media (max-width: 1200px) {
                    .dashboard-grid { grid-template-columns: 1fr; }
                    div[style*="gridColumn: span 4"], div[style*="gridColumn: span 2"] { grid-column: span 1 !important; }
                    div[style*="display: flex; gap: 24px"] { flex-direction: column; }
                }
                @media (max-width: 768px) {
                    .dashboard-header-action {
                        margin-bottom: 24px !important;
                        gap: 12px !important;
                    }
                    .dashboard-header-action > div:first-child h1 {
                        font-size: 28px !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Dashboard;

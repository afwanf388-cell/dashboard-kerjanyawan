import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    NotebookPen,
    UserX,
    CalendarCheck,
    Wallet,
    MessageSquare,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    TrendingUp,
    Activity,
    Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ title, value, icon, color, trend, trendUp, onClick }) => (
    <motion.div
        whileHover={{ y: -5, boxShadow: `0 20px 40px ${color}20` }}
        onClick={onClick}
        className="glass-effect card-hover"
        style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', cursor: onClick ? 'pointer' : 'default' }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div style={{
                padding: '14px',
                borderRadius: '14px',
                background: `${color}15`,
                color: color,
                display: 'flex',
                boxShadow: `0 4px 20px ${color}25`
            }}>
                {icon}
            </div>
            {trend && (
                <div style={{
                    fontSize: '12px',
                    color: trendUp ? '#10b981' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: trendUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    padding: '6px 10px',
                    borderRadius: '20px',
                    fontWeight: '600'
                }}>
                    {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {trend}
                </div>
            )}
        </div>
        <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</p>
            <h3 style={{
                fontSize: 'clamp(20px, 5vw, 36px)',
                fontWeight: '800',
                letterSpacing: '-0.5px',
                color: 'white',
                textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                wordBreak: 'break-word'
            }}>{value}</h3>
        </div>
    </motion.div>
);

const ActivityItem = ({ icon, title, time, color }) => (
    <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--glass-border)'
    }}>
        <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color
        }}>
            {icon}
        </div>
        <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>{title}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> {time}
            </p>
        </div>
    </div>
);

import { supabase } from '../lib/supabase';

const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [stats, setStats] = useState({
        notes: 0,
        mistakes: 0,
        schedules: 0,
        logins: 0,
        balance: 0,
        income: 0,
        expense: 0,
        latestChat: 'Belum ada pesan',
        recentActivities: []
    });

    useEffect(() => {
        const loadStats = async () => {
            try {
                // 1. Get Local Data first
                const localNotes = JSON.parse(localStorage.getItem('app_catatan_kerja') || '[]');
                const localLogins = JSON.parse(localStorage.getItem('app_login_data') || '[]');
                const localMistakes = JSON.parse(localStorage.getItem('app_mistakes') || '[]');
                const localSchedules = JSON.parse(localStorage.getItem('app_schedules') || '[]');
                let localFinance = JSON.parse(localStorage.getItem('app_finance_v3') || '[]');

                // Helper to filter valid mistakes (matching KesalahanStaf.jsx)
                const countValidMistakes = (data) => {
                    if (!Array.isArray(data)) return 0;
                    return data.filter(m => {
                        const desc = (m.description || '').toLowerCase().trim();
                        const isExcludedNote = desc === 'note' || desc.includes('note pengecekkan');
                        const rawName = (m.staffName || '').toLowerCase();
                        const isExcludedName = rawName.includes('maxwin') || rawName.includes('rungkad') || rawName.includes('tanggal') || rawName.match(/^\d/);
                        return !isExcludedNote && !isExcludedName;
                    }).length;
                };

                // 2. Fetch from Cloud if we have a user (to fix 0-stat bug on new login)
                // We need actual data now to filter "notes", not just raw count
                let cloudCounts = {
                    notes: localNotes.length,
                    mistakes: countValidMistakes(localMistakes),
                    schedules: localSchedules.length,
                    logins: localLogins.length
                };

                if (supabase && user?.username) {
                    const [resNotes, resMistakes, resSchedules, resLogins, resFinance] = await Promise.all([
                        supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', user.username),
                        supabase.from('staff_mistakes').select('*').eq('user_id', user.username), // Fetch data for filtering
                        supabase.from('schedules').select('*', { count: 'exact', head: true }).eq('user_id', user.username),
                        supabase.from('login_data').select('*', { count: 'exact', head: true }).eq('user_id', user.username),
                        supabase.from('finance_data').select('*').eq('user_id', user.username).order('month', { ascending: true })
                    ]);

                    cloudCounts = {
                        notes: Math.max(localNotes.length, resNotes.count || 0),
                        mistakes: Math.max(countValidMistakes(localMistakes), countValidMistakes(resMistakes.data)),
                        schedules: Math.max(localSchedules.length, resSchedules.count || 0),
                        logins: Math.max(localLogins.length, resLogins.count || 0)
                    };

                    // If cloud has finance data and local is empty (or has fewer months), prioritize cloud
                    if (resFinance.data && resFinance.data.length > localFinance.length) {
                        localFinance = resFinance.data;
                        localStorage.setItem('app_finance_v3', JSON.stringify(localFinance));
                    }
                }

                // Financial calculations (Matching Keuangan.jsx logic)
                let totalCash = 0;
                let totalGaji = 0;
                let totalBonus = 0;
                let totalThr = 0;
                let totalPengeluaran = 0;
                let totalEmasGram = 0;
                let totalPinjaman = 0;

                localFinance.forEach(item => {
                    const gaji = Number(item.gaji || 0);
                    const bonus = Number(item.bonus || 0);
                    const thr = Number(item.thr || 0);
                    const pengeluaran = Number(item.pengeluaran || 0);
                    const pinjaman = Number(item.pinjaman || 0);
                    const emas = Number(item.emas || 0);

                    totalGaji += gaji;
                    totalBonus += bonus;
                    totalThr += thr;
                    totalPengeluaran += pengeluaran;
                    totalPinjaman += pinjaman;
                    totalEmasGram += emas;
                    totalCash += (gaji + bonus + thr - pengeluaran - pinjaman);
                });

                const goldPrice = 2549000;
                const balance = totalCash + (totalEmasGram * goldPrice);
                const income = totalGaji + totalBonus + totalThr;
                const expense = totalPengeluaran + totalPinjaman;

                // Recent Activities logic
                const activities = [];
                if (localNotes.length > 0) {
                    activities.push({
                        icon: <NotebookPen size={20} />,
                        title: `Note: ${localNotes[0].title || 'Untitled'}`,
                        time: localNotes[0].date || 'Just now',
                        color: '#3b82f6'
                    });
                }
                if (localMistakes.length > 0) {
                    activities.push({
                        icon: <UserX size={20} />,
                        title: `Mistake: ${localMistakes[0].staffName}`,
                        time: localMistakes[0].date || 'Just now',
                        color: '#ef4444'
                    });
                }

                setStats({
                    ...cloudCounts,
                    balance,
                    income,
                    expense,
                    latestChat: 'System Synchronized',
                    recentActivities: activities.slice(0, 4)
                });
            } catch (error) {
                console.error("Dashboard Load Error", error);
            }
        };

        loadStats();
        // Removed: interval refresh setiap 10 detik yang menyebabkan lemot
        // Data akan di-refresh saat user kembali ke halaman ini
    }, [user]);

    const formatCurrency = (amount) => {
        return `Rp ${Math.abs(amount).toLocaleString('id-ID')}`;
    };

    const today = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div>
            <header style={{ marginBottom: '32px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <motion.h2
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                fontSize: 'clamp(18px, 5vw, 32px)',
                                fontWeight: '800',
                                marginBottom: '4px',
                                wordBreak: 'break-word',
                                color: 'white',
                                lineHeight: '1.2',
                                textShadow: '0 4px 12px rgba(0,0,0,0.5)'
                            }}
                        >
                            Welcome back, <span className="text-gradient" style={{ filter: 'drop-shadow(0 0 15px rgba(59, 130, 246, 0.4))' }}>{user?.username || 'User'}</span>! 👋
                        </motion.h2>
                        <p style={{
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: 'clamp(12px, 3vw, 14px)',
                            flexWrap: 'wrap'
                        }}>
                            <Clock size={16} /> {today}
                        </p>
                    </div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            borderRadius: '100px',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                        }}
                    >
                        <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' }}></div>
                        <span style={{ color: '#10b981', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Online</span>
                    </motion.div>
                </div>
            </header>

            <div className="dashboard-grid" style={{
                padding: 0,
                marginBottom: '32px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px'
            }}>
                <StatCard
                    title="Catatan Kerja"
                    value={stats.notes}
                    icon={<NotebookPen size={24} />}
                    color="#3b82f6"
                    trend={stats.notes > 0 ? `${stats.notes} Catatan` : null}
                    trendUp={true}
                    onClick={() => navigate('/catatan')}
                />
                <StatCard
                    title="Data Login"
                    value={stats.logins}
                    icon={<Key size={24} />}
                    color="#8b5cf6"
                    trend={stats.logins > 0 ? `${stats.logins} Akun` : null}
                    trendUp={true}
                    onClick={() => navigate('/data-login')}
                />
                <StatCard
                    title="Kesalahan Staf"
                    value={stats.mistakes}
                    icon={<UserX size={24} />}
                    color="#ef4444"
                    trend={stats.mistakes > 0 ? `${stats.mistakes} Record` : null}
                    trendUp={false}
                    onClick={() => navigate('/kesalahan-staf')}
                />
                <StatCard
                    title="Saldo Keuangan"
                    value={formatCurrency(stats.balance)}
                    icon={<Wallet size={24} />}
                    color="#10b981"
                    trend={stats.balance >= 0 ? 'Positif' : 'Defisit'}
                    trendUp={stats.balance >= 0}
                    onClick={() => navigate('/keuangan')}
                />
            </div>

            <div className="dashboard-bottom-grid">
                {/* Recent Activity */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-effect"
                    style={{ padding: 'clamp(16px, 4vw, 28px)' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '18px', fontWeight: '600' }}>Recent Activity</h4>
                        <span style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <TrendingUp size={14} color="var(--success)" />
                            Live updates
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {stats.recentActivities.length > 0 ? (
                            stats.recentActivities.map((activity, i) => (
                                <ActivityItem key={i} {...activity} />
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                <Activity size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                                <p>No recent activity</p>
                                <p style={{ fontSize: '13px' }}>Start adding data to see activity here</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Chat Preview & Quick Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Finance Summary */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass-effect"
                        style={{ padding: '24px' }}
                    >
                        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>Finance Overview</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
                                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Income</span>
                            </div>
                            <span style={{ fontWeight: '600', color: 'var(--success)' }}>{formatCurrency(stats.income)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)' }}></div>
                                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Expense</span>
                            </div>
                            <span style={{ fontWeight: '600', color: 'var(--danger)' }}>{formatCurrency(stats.expense)}</span>
                        </div>
                    </motion.div>

                    {/* Chat Preview */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="glass-effect"
                        style={{ padding: 'clamp(16px, 4vw, 24px)', flex: 1 }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: '600' }}>Global Chat</h4>
                            <MessageSquare size={18} color="var(--primary)" />
                        </div>
                        <div style={{
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '16px',
                            minHeight: '80px',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <p style={{
                                fontSize: '14px',
                                color: stats.latestChat === 'No messages yet' ? 'var(--text-muted)' : 'white',
                                fontStyle: stats.latestChat === 'No messages yet' ? 'italic' : 'normal'
                            }}>
                                {stats.latestChat.length > 80 ? stats.latestChat.substring(0, 80) + '...' : stats.latestChat}
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/chat')}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                color: 'white',
                                border: 'none',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                            }}
                        >
                            <MessageSquare size={18} />
                            Open Chat
                        </button>
                    </motion.div>
                </div>
            </div>

            <style>{`
                .dashboard-bottom-grid {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr;
                    gap: 24px;
                }
                @media (max-width: 1024px) {
                    .dashboard-bottom-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default Dashboard;

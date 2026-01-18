import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Key, NotebookPen, UserX,
    CalendarCheck, BookOpen, Wallet, MessageSquare,
    LogOut, Shield, User, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose, isMobile, onOpenSettings }) => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // --- DYNAMIC THEME LOGIC ---
    const [sidebarColor, setSidebarColor] = useState('59, 130, 246'); // Default Blue

    useEffect(() => {
        if (user?.username) {
            const updateTheme = () => {
                const saved = localStorage.getItem(`dashboard_settings_${user.username}`);
                if (saved) {
                    try {
                        const settings = JSON.parse(saved);
                        if (settings.sidebarColor) {
                            setSidebarColor(settings.sidebarColor);
                        }
                    } catch (e) { }
                }
            };

            updateTheme();
            window.addEventListener('storage', updateTheme);
            const interval = setInterval(updateTheme, 1000);
            return () => {
                window.removeEventListener('storage', updateTheme);
                clearInterval(interval);
            };
        }
    }, [user?.username]);

    const menuItems = [
        { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', end: true },
        { name: 'Data Login', icon: <Key size={20} />, path: '/data-login' },
        { name: 'Catatan Kerja', icon: <NotebookPen size={20} />, path: '/catatan' },
        { name: 'Kesalahan Staf', icon: <UserX size={20} />, path: '/kesalahan-staf' },
        { name: 'Jadwal Result', icon: <CalendarCheck size={20} />, path: '/jadwal' },
        { name: 'Edu Wiki', icon: <BookOpen size={20} />, path: '/bola' },
        { name: 'Jadwal Bank', icon: <MessageSquare size={20} />, path: '/jadwal-bank' }, // Changed icon for consistency
        { name: 'Kalkulator Togel', icon: <LayoutDashboard size={20} />, path: '/kalkulator-togel' },
        { name: 'Kalkulator Bola', icon: <LayoutDashboard size={20} />, path: '/kalkulator-bola' },
        { name: 'Keuangan', icon: <Wallet size={20} />, path: '/keuangan' },
        { name: 'Global Chat', icon: <MessageSquare size={20} />, path: '/chat' },
    ];

    const handleLogout = () => {
        if (onClose) onClose();
        logout();
        window.location.href = '/login';
    };

    const confirmLogout = () => {
        setShowLogoutConfirm(true);
    };

    const handleNavClick = () => {
        if (isMobile && onClose) {
            onClose();
        }
    };

    const getSidebarTransform = () => {
        if (!isMobile) return 'translateX(0)';
        return isOpen ? 'translateX(0)' : 'translateX(-100%)';
    };

    return (
        <>
            <style>
                {`
                @keyframes sidebarGlow {
                    0% { border-right: 1px solid rgba(${sidebarColor}, 0.5); box-shadow: 2px 0 15px rgba(${sidebarColor}, 0.2); }
                    50% { border-right: 1px solid rgba(${sidebarColor}, 0.8); box-shadow: 4px 0 30px rgba(${sidebarColor}, 0.5); } 
                    100% { border-right: 1px solid rgba(${sidebarColor}, 0.5); box-shadow: 2px 0 15px rgba(${sidebarColor}, 0.2); }
                }
                @keyframes logoPulse {
                    0% { transform: scale(1); box-shadow: 0 0 15px rgba(${sidebarColor}, 0.6), 0 0 30px rgba(${sidebarColor}, 0.3); border-color: rgba(${sidebarColor}, 0.8); }
                    25% { transform: scale(1.05); box-shadow: 0 0 25px rgba(${sidebarColor}, 0.8), 0 0 50px rgba(${sidebarColor}, 0.4); border-color: rgba(${sidebarColor}, 1); }
                    50% { transform: scale(1); box-shadow: 0 0 35px rgba(${sidebarColor}, 1), 0 0 70px rgba(${sidebarColor}, 0.6); border-color: rgba(${sidebarColor}, 0.8); }
                    75% { transform: scale(1.05); box-shadow: 0 0 25px rgba(${sidebarColor}, 0.8), 0 0 50px rgba(${sidebarColor}, 0.4); border-color: rgba(${sidebarColor}, 1); }
                    100% { transform: scale(1); box-shadow: 0 0 15px rgba(${sidebarColor}, 0.6), 0 0 30px rgba(${sidebarColor}, 0.3); border-color: rgba(${sidebarColor}, 0.8); }
                }
                @keyframes spinRing {
                    0% { transform: rotate(0deg) scale(1); opacity: 0.3; }
                    50% { transform: rotate(180deg) scale(1.1); opacity: 0.8; }
                    100% { transform: rotate(360deg) scale(1); opacity: 0.3; }
                }
                @keyframes logoScan {
                    0% { top: -100%; opacity: 0; }
                    50% { opacity: 0.5; }
                    100% { top: 200%; opacity: 0; }
                }
                @keyframes activeItemGlow {
                    0% { background-color: rgba(${sidebarColor}, 0.1); border-color: rgba(${sidebarColor}, 0.3); }
                    50% { background-color: rgba(${sidebarColor}, 0.2); border-color: rgb(${sidebarColor}); box-shadow: inset 0 0 10px rgba(${sidebarColor}, 0.2); }
                    100% { background-color: rgba(${sidebarColor}, 0.1); border-color: rgba(${sidebarColor}, 0.3); }
                }
            `}
            </style>
            <div
                style={{
                    width: '280px',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '24px 16px',
                    background: `linear-gradient(180deg, rgba(${sidebarColor}, 0.12) 0%, rgba(2, 6, 23, 1) 100%)`,
                    zIndex: isMobile ? 1100 : 200,
                    transform: getSidebarTransform(),
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    animation: isMobile ? 'none' : 'sidebarGlow 3s infinite',
                    overflowY: 'auto',
                    overflowX: 'hidden'
                }}
            >
                {/* Header Section */}
                <div style={{ padding: '8px 12px 36px', display: 'flex', flexDirection: 'column', gap: '20px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                                width: '46px', height: '46px',
                                background: `linear-gradient(135deg, rgb(${sidebarColor}), rgba(${sidebarColor}, 0.4))`,
                                borderRadius: '15px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                                position: 'relative',
                                overflow: 'hidden',
                                border: `1px solid rgba(${sidebarColor}, 0.5)`,
                                boxShadow: `0 8px 16px rgba(${sidebarColor}, 0.3)`,
                                animation: 'logoPulse 3s infinite ease-in-out'
                            }}>
                                <Shield size={22} color="white" fill="rgba(255,255,255,0.2)" />
                                <div style={{ position: 'absolute', left: 0, width: '100%', height: '2px', background: 'rgba(255,255,255,0.8)', animation: 'logoScan 2s infinite ease-in-out' }}></div>
                            </div>
                            <div>
                                <h1 style={{ fontSize: '18px', fontWeight: '900', color: 'white', margin: 0, textTransform: 'uppercase' }}>PERSONAL</h1>
                                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: 0, fontWeight: '700', textTransform: 'uppercase' }}>PRO SYSTEM</p>
                            </div>
                        </div>
                        {isMobile && <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', padding: '8px', borderRadius: '12px' }}><X size={18} /></button>}
                    </div>
                </div>

                {/* Profile Badge */}
                <motion.div
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        if (isMobile) onClose();
                        onOpenSettings();
                    }}
                    style={{
                        padding: '16px',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                        borderRadius: '20px',
                        marginBottom: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                    }}
                >
                    <div style={{
                        width: '50px', height: '50px',
                        borderRadius: '16px',
                        background: '#1e293b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                        border: `2px solid rgba(${sidebarColor}, 0.4)`
                    }}>
                        {user?.avatar ? <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={24} color={`rgb(${sidebarColor})`} />}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <p style={{ color: 'white', fontWeight: '800', fontSize: '15px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.displayName || user?.username || 'User'}</p>
                        <p style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase' }}>{user?.status || 'Online'}</p>
                    </div>
                </motion.div>

                {/* Menu */}
                <nav style={{ flex: 1 }}>
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            onClick={handleNavClick}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                marginBottom: '4px',
                                color: isActive ? 'white' : '#94a3b8',
                                background: isActive ? `rgba(${sidebarColor}, 0.15)` : 'transparent',
                                border: '1px solid',
                                borderColor: isActive ? `rgba(${sidebarColor}, 0.3)` : 'transparent',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer'
                            })}
                        >
                            {item.icon}
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.name}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Logout */}
                <div style={{ padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <motion.button
                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={confirmLogout}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '14px',
                            width: '100%',
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '16px',
                            color: '#fb7185',
                            fontWeight: '800',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        <LogOut size={16} /> Sign Out
                    </motion.button>
                </div>
            </div>

            {/* Logout Confirm Modal */}
            <AnimatePresence>
                {showLogoutConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(2, 6, 23, 0.85)',
                            backdropFilter: 'blur(15px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 2000, padding: '20px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            style={{
                                width: '100%', maxWidth: '380px',
                                background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '28px', padding: '32px', textAlign: 'center'
                            }}
                        >
                            <h3 style={{ fontSize: '22px', fontWeight: '900', color: 'white', marginBottom: '8px' }}>Yakin mau keluar?</h3>
                            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '32px' }}>Pastikan semua pekerjaan sudah tersimpan aman ya!</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <motion.button onClick={handleLogout} style={{ padding: '16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', cursor: 'pointer' }}>Ya, Logout Sekarang</motion.button>
                                <button onClick={() => setShowLogoutConfirm(false)} style={{ padding: '16px', background: 'transparent', color: '#94a3b8', border: 'none', fontWeight: '700', cursor: 'pointer' }}>Tetap di Sini</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Sidebar;

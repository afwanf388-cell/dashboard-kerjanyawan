import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Key, NotebookPen, UserX,
    CalendarCheck, BookOpen, Wallet, MessageSquare,
    LogOut, ChevronLeft, Shield, User, Camera, Check, X, Mail, Image as ImageIcon, Trash2, Calculator, Trophy, Landmark
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose, isMobile }) => {
    const { logout, user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [profileData, setProfileData] = useState({
        displayName: user?.displayName || user?.username || '',
        status: user?.status || 'Online',
        avatar: user?.avatar || '',
        bgImage: user?.bgImage || ''
    });

    // --- DYNAMIC THEME LOGIC ---
    const [sidebarColor, setSidebarColor] = useState('59, 130, 246'); // Default Blue

    useEffect(() => {
        if (user?.username) {
            const updateTheme = () => {
                const saved = localStorage.getItem(`dashboard_settings_${user.username}`);
                if (saved) {
                    const settings = JSON.parse(saved);
                    if (settings.sidebarColor) {
                        setSidebarColor(settings.sidebarColor);
                    }
                }
            };

            updateTheme();
            // Listen for storage changes to update in real-time
            window.addEventListener('storage', updateTheme);
            const interval = setInterval(updateTheme, 1000); // Polling as fallback for same-tab updates
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
        { name: 'Pemahaman Bola', icon: <BookOpen size={20} />, path: '/bola' },
        { name: 'Jadwal Bank', icon: <Landmark size={20} />, path: '/jadwal-bank' },
        { name: 'Kalkulator Togel', icon: <Calculator size={20} />, path: '/kalkulator-togel' },
        { name: 'Kalkulator Bola', icon: <Trophy size={20} />, path: '/kalkulator-bola' },
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

    const handleProfileUpdate = (e) => {
        e.preventDefault();
        updateUser(profileData);
        setShowProfileModal(false);
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
                @keyframes textShimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
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
                    animation: isMobile ? 'none' : 'sidebarGlow 3s infinite', // Animated Border
                    overflowY: 'auto',
                    overflowX: 'hidden'
                }}
            >
                {/* Header Section - Canggih Version */}
                <div style={{
                    padding: '8px 12px 36px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            {/* Pro Shield Logo */}
                            <div style={{
                                width: '46px', height: '46px',
                                background: `linear-gradient(135deg, rgb(${sidebarColor}), rgba(${sidebarColor}, 0.4))`,
                                borderRadius: '15px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                                position: 'relative',
                                overflow: 'hidden', // For scanning effect
                                border: `1px solid rgba(${sidebarColor}, 0.5)`,
                                boxShadow: `0 8px 16px rgba(${sidebarColor}, 0.3), inset 0 0 10px rgba(255,255,255,0.4)`,
                                animation: 'logoPulse 3s infinite ease-in-out'
                            }}>
                                {/* The Icon */}
                                <Shield size={22} color="white" fill="rgba(255,255,255,0.2)" style={{ position: 'relative', zIndex: 2 }} />

                                {/* Dynamic Scanning Beam */}
                                <div style={{
                                    position: 'absolute',
                                    left: 0, width: '100%', height: '2px',
                                    background: 'rgba(255,255,255,0.8)',
                                    boxShadow: `0 0 10px 2px rgba(${sidebarColor}, 1)`,
                                    animation: 'logoScan 2s infinite ease-in-out',
                                    zIndex: 3
                                }}></div>

                                {/* Inner Electric Glow */}
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: `radial-gradient(circle, rgba(${sidebarColor}, 0.4) 0%, transparent 70%)`,
                                    zIndex: 1
                                }}></div>

                                {/* Double Outer Glow Ring */}
                                <div style={{
                                    position: 'absolute', inset: '-6px',
                                    borderRadius: '20px',
                                    border: `1px dashed rgba(${sidebarColor}, 0.4)`,
                                    animation: 'spinRing 4s infinite linear'
                                }}></div>
                                <div style={{
                                    position: 'absolute', inset: '-2px',
                                    borderRadius: '16px',
                                    border: `1px solid rgba(${sidebarColor}, 0.3)`,
                                    opacity: 0.6
                                }}></div>
                            </div>

                            {/* Title & Badge */}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <h1 style={{
                                        fontSize: '18px', fontWeight: '900',
                                        color: 'white',
                                        margin: 0,
                                        letterSpacing: '-0.5px',
                                        textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                                    }}>PERSONAL</h1>
                                    <span style={{
                                        fontSize: '9px',
                                        fontWeight: '950',
                                        background: `rgb(${sidebarColor})`,
                                        color: 'white',
                                        padding: '2px 6px',
                                        borderRadius: '6px',
                                        letterSpacing: '0.5px',
                                        boxShadow: `0 4px 8px rgba(${sidebarColor}, 0.3)`
                                    }}>PRO</span>
                                </div>
                                <p style={{
                                    fontSize: '11px',
                                    color: '#64748b',
                                    margin: '2px 0 0 0',
                                    fontWeight: '700',
                                    letterSpacing: '0.5px'
                                }}>Management System</p>
                            </div>
                        </div>

                        {isMobile && (
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                    {/* Decorative Divider Line */}
                    <div style={{
                        width: '100%',
                        height: '1px',
                        background: `linear-gradient(90deg, transparent, rgba(${sidebarColor}, 0.3), transparent)`
                    }}></div>
                </div>

                {/* Profile Badge (Premium Design) */}
                <motion.div
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        setProfileData({
                            displayName: user?.displayName || user?.username || '',
                            status: user?.status || 'Online',
                            avatar: user?.avatar || '',
                            bgImage: user?.bgImage || ''
                        });
                        setShowProfileModal(true);
                    }}
                    style={{
                        padding: '16px',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                        borderRadius: '20px',
                        marginBottom: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        flexShrink: 0,
                        cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {/* Decorative Background Glow */}
                    <div style={{
                        position: 'absolute',
                        top: '-20px', right: '-20px',
                        width: '60px', height: '60px',
                        background: 'rgba(59, 130, 246, 0.2)',
                        filter: 'blur(30px)',
                        borderRadius: '50%'
                    }}></div>

                    <div style={{
                        width: '50px', height: '50px',
                        borderRadius: '16px',
                        background: '#1e293b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden',
                        border: `2px solid rgba(${sidebarColor}, 0.4)`,
                        position: 'relative'
                    }}>
                        {user?.avatar ? (
                            <img src={user.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <User size={24} color={`rgb(${sidebarColor})`} />
                        )}

                        {/* Tiny Pulse Status Indicator */}
                        <div style={{
                            position: 'absolute', bottom: '2px', right: '2px',
                            width: '10px', height: '10px',
                            background: '#22c55e',
                            borderRadius: '50%',
                            border: '2px solid #1e293b',
                            boxShadow: '0 0 10px #22c55e'
                        }}></div>
                    </div>

                    <div style={{ overflow: 'hidden', flex: 1 }}>
                        <p style={{
                            color: 'white',
                            fontWeight: '800',
                            fontSize: '15px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            letterSpacing: '0.3px',
                            marginBottom: '1px'
                        }}>
                            {user?.displayName || user?.username || 'User'}
                        </p>
                        <p style={{
                            color: '#64748b',
                            fontSize: '10px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginBottom: '4px',
                            opacity: 0.8
                        }}>
                            {user?.email || 'No email set'}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <p style={{ color: `rgb(${sidebarColor})`, fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user?.status || 'Online'}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Menu */}
                <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                    <p style={{
                        fontSize: '11px', fontWeight: '600', color: '#64748b',
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                        paddingLeft: '12px', marginBottom: '8px'
                    }}>Menu</p>
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
                                animation: isActive ? 'activeItemGlow 2s infinite ease-in-out' : 'none',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                                WebkitTapHighlightColor: 'transparent'
                            })}
                        >
                            <span style={{ flexShrink: 0 }}>{item.icon}</span>
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.name}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Logout - Canggih Version */}
                <div style={{ padding: '20px 0 10px 0', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '12px' }}>
                    <motion.button
                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.5)' }}
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
                            cursor: 'pointer',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                            WebkitTapHighlightColor: 'transparent'
                        }}
                    >
                        <div style={{
                            width: '32px', height: '32px',
                            borderRadius: '10px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <LogOut size={16} />
                        </div>
                        Sign Out
                    </motion.button>
                    <p style={{
                        fontSize: '9px',
                        color: '#475569',
                        textAlign: 'center',
                        marginTop: '12px',
                        fontWeight: '700',
                        letterSpacing: '1px'
                    }}>SYSTEM v2.0.4 PRO</p>
                </div>
            </div>

            {/* Profile Edit Modal */}
            <AnimatePresence>
                {showProfileModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '20px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="glass-effect"
                            style={{
                                width: '100%',
                                maxWidth: '400px',
                                borderRadius: '24px',
                                overflow: 'hidden',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}
                        >
                            <div style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), transparent)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>Edit Profil</h3>
                                <button onClick={() => setShowProfileModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <form onSubmit={handleProfileUpdate} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Direct File Upload Section */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{
                                            width: '100px',
                                            height: '100px',
                                            borderRadius: '24px',
                                            background: '#1e293b',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            border: '3px solid #3b82f6',
                                            boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)'
                                        }}>
                                            {profileData.avatar ? (
                                                <img src={profileData.avatar} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <User size={40} color="#3b82f6" />
                                            )}
                                        </div>
                                        <label
                                            htmlFor="profile-upload"
                                            style={{
                                                position: 'absolute',
                                                bottom: '-8px',
                                                right: '-8px',
                                                width: '36px',
                                                height: '36px',
                                                background: '#3b82f6',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                border: '3px solid #0f172a',
                                                color: 'white',
                                                boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                                            }}
                                        >
                                            <Camera size={18} />
                                            <input
                                                id="profile-upload"
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setProfileData({ ...profileData, avatar: reader.result });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Klik ikon kamera untuk ganti foto</p>
                                </div>

                                {/* Display Name */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nama Akun</label>
                                    <input
                                        type="text"
                                        placeholder="Nama Anda"
                                        value={profileData.displayName}
                                        onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                                        style={{ width: '100%', padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }}
                                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                    />
                                </div>

                                {/* Email Display (Read-only) */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Terdaftar</label>
                                    <div style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '14px',
                                        background: 'rgba(0,0,0,0.2)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        color: '#64748b',
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}>
                                        <Mail size={16} />
                                        {user?.email || '-'}
                                    </div>
                                </div>

                                {/* Status */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status Personal</label>
                                    <input
                                        type="text"
                                        placeholder="Tulis status..."
                                        value={profileData.status}
                                        onChange={(e) => setProfileData({ ...profileData, status: e.target.value })}
                                        style={{ width: '100%', padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }}
                                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                    />
                                </div>

                                {/* Custom Background Section */}
                                <div style={{
                                    padding: '20px',
                                    borderRadius: '20px',
                                    background: profileData.bgImage ? `linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.8)), url(${profileData.bgImage})` : 'rgba(59, 130, 246, 0.05)',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    border: '1px dashed rgba(59, 130, 246, 0.3)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '12px',
                                    textAlign: 'center'
                                }}>
                                    <div>
                                        <p style={{ fontSize: '14px', fontWeight: '700', color: 'white', marginBottom: '4px' }}>Latar Belakang Dashboard</p>
                                        <p style={{ fontSize: '11px', color: '#94a3b8' }}>Gunakan gambar HD, sistem akan otomatis mengoptimalkannya</p>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
                                            <ImageIcon size={16} /> {profileData.bgImage ? 'Ganti Background' : 'Pilih Gambar'}
                                            <input type="file" accept="image/*" onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    if (file.size > 10000000) { alert('Terlalu raksasa min! Maksimal 10MB ya.'); return; }

                                                    const reader = new FileReader();
                                                    reader.onload = (event) => {
                                                        const img = new Image();
                                                        img.onload = () => {
                                                            const canvas = document.createElement('canvas');
                                                            let width = img.width;
                                                            let height = img.height;

                                                            // Auto resize if too big (max 1920px width)
                                                            if (width > 1920) {
                                                                height = Math.round((height * 1920) / width);
                                                                width = 1920;
                                                            }

                                                            canvas.width = width;
                                                            canvas.height = height;
                                                            const ctx = canvas.getContext('2d');
                                                            ctx.drawImage(img, 0, 0, width, height);

                                                            // Compress but keep good quality
                                                            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
                                                            setProfileData({ ...profileData, bgImage: compressedDataUrl });
                                                        };
                                                        img.src = event.target.result;
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }} style={{ display: 'none' }} />
                                        </label>
                                        {profileData.bgImage && (
                                            <button type="button" onClick={() => setProfileData({ ...profileData, bgImage: '' })} style={{ padding: '10px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                        color: 'white',
                                        border: 'none',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        marginTop: '10px'
                                    }}
                                >
                                    <Check size={20} />
                                    Simpan Perubahan
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Logout Confirmation Modal */}
            <AnimatePresence>
                {showLogoutConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(2, 6, 23, 0.85)',
                            backdropFilter: 'blur(15px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2000,
                            padding: '20px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            style={{
                                width: '100%',
                                maxWidth: '380px',
                                background: '#0f172a',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '28px',
                                padding: '32px',
                                textAlign: 'center',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Decorative background glow */}
                            <div style={{ position: 'absolute', top: '-50px', left: '-50px', width: '150px', height: '150px', background: 'rgba(239, 68, 68, 0.1)', filter: 'blur(50px)', borderRadius: '50%' }} />

                            <div style={{
                                width: '64px', height: '64px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '20px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 24px',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#fb7185'
                            }}>
                                <LogOut size={32} />
                            </div>

                            <h3 style={{ fontSize: '22px', fontWeight: '900', color: 'white', marginBottom: '8px' }}>Yakin mau keluar?</h3>
                            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', marginBottom: '32px' }}>
                                Sesi mimin akan segera berakhir. Pastikan semua pekerjaan sudah tersimpan aman ya!
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: '#e11d48' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleLogout}
                                    style={{
                                        padding: '16px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '16px',
                                        fontWeight: '800',
                                        fontSize: '15px',
                                        cursor: 'pointer',
                                        boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)'
                                    }}
                                >
                                    Ya, Logout Sekarang
                                </motion.button>
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    style={{
                                        padding: '16px',
                                        background: 'rgba(255,255,255,0.03)',
                                        color: '#94a3b8',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '16px',
                                        fontWeight: '700',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.color = 'white'}
                                    onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                                >
                                    Tetap di Sini
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Sidebar;


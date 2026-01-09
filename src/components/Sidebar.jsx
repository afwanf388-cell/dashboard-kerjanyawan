import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Key, NotebookPen, UserX,
    CalendarCheck, BookOpen, Wallet, MessageSquare,
    LogOut, ChevronLeft, Shield, User, Camera, Check, X, Mail, Image as ImageIcon, Trash2, Calculator, Trophy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose, isMobile }) => {
    const { logout, user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [profileData, setProfileData] = useState({
        displayName: user?.displayName || user?.username || '',
        status: user?.status || 'Online',
        photoURL: user?.photoURL || '',
        bgImage: user?.bgImage || ''
    });

    const menuItems = [
        { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', end: true },
        { name: 'Data Login', icon: <Key size={20} />, path: '/data-login' },
        { name: 'Catatan Kerja', icon: <NotebookPen size={20} />, path: '/catatan' },
        { name: 'Kesalahan Staf', icon: <UserX size={20} />, path: '/kesalahan-staf' },
        { name: 'Jadwal Result', icon: <CalendarCheck size={20} />, path: '/jadwal' },
        { name: 'Pemahaman Bola', icon: <BookOpen size={20} />, path: '/bola' },
        { name: 'Kalkulator Togel', icon: <Calculator size={20} />, path: '/kalkulator-togel' },
        { name: 'Kalkulator Bola', icon: <Trophy size={20} />, path: '/kalkulator-bola' },
        { name: 'Keuangan', icon: <Wallet size={20} />, path: '/keuangan' },
        { name: 'Global Chat', icon: <MessageSquare size={20} />, path: '/chat' },
    ];

    const handleLogout = () => {
        if (onClose) onClose();
        logout();
        navigate('/login');
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
                    0% { border-right: 1px solid rgba(59, 130, 246, 0.5); box-shadow: 2px 0 15px rgba(59, 130, 246, 0.2); }
                    25% { border-right: 1px solid rgba(139, 92, 246, 0.8); box-shadow: 4px 0 25px rgba(139, 92, 246, 0.4); }
                    50% { border-right: 1px solid rgba(236, 72, 153, 0.8); box-shadow: 4px 0 30px rgba(236, 72, 153, 0.5); } 
                    75% { border-right: 1px solid rgba(139, 92, 246, 0.8); box-shadow: 4px 0 25px rgba(139, 92, 246, 0.4); }
                    100% { border-right: 1px solid rgba(59, 130, 246, 0.5); box-shadow: 2px 0 15px rgba(59, 130, 246, 0.2); }
                }
                @keyframes logoPulse {
                    0% { transform: scale(1); box-shadow: 0 0 15px rgba(59, 130, 246, 0.6); }
                    50% { transform: scale(1.1); box-shadow: 0 0 30px rgba(139, 92, 246, 0.9), 0 0 60px rgba(59, 130, 246, 0.4); background: linear-gradient(135deg, #60a5fa, #a78bfa); }
                    100% { transform: scale(1); box-shadow: 0 0 15px rgba(59, 130, 246, 0.6); }
                }
                @keyframes textShimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes activeItemGlow {
                    0% { background-color: rgba(59, 130, 246, 0.15); border-color: rgba(59, 130, 246, 0.4); }
                    50% { background-color: rgba(59, 130, 246, 0.25); border-color: rgba(139, 92, 246, 0.8); box-shadow: inset 0 0 10px rgba(59, 130, 246, 0.2); }
                    100% { background-color: rgba(59, 130, 246, 0.15); border-color: rgba(59, 130, 246, 0.4); }
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
                    background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
                    zIndex: isMobile ? 1100 : 200,
                    transform: getSidebarTransform(),
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    animation: isMobile ? 'none' : 'sidebarGlow 3s infinite', // Animated Border
                    overflowY: 'auto',
                    overflowX: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '0 12px 32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px',
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            borderRadius: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            animation: 'logoPulse 2s infinite ease-in-out'
                        }}>
                            <Shield size={20} color="white" />
                        </div>
                        <div>
                            <h1 style={{
                                fontSize: '18px', fontWeight: 'bold',
                                background: 'linear-gradient(90deg, #fff, #60a5fa, #fff)',
                                backgroundSize: '200% auto',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                animation: 'textShimmer 3s linear infinite'
                            }}>Personal Dash</h1>
                            <p style={{ fontSize: '12px', color: '#94a3b8' }}>Management System</p>
                        </div>
                    </div>
                    {isMobile && (
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                </div>

                {/* Profile Badge (Premium Design) */}
                <motion.div
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        setProfileData({
                            displayName: user?.displayName || user?.username || '',
                            status: user?.status || 'Online',
                            photoURL: user?.photoURL || '',
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
                        border: '2px solid rgba(59, 130, 246, 0.4)',
                        position: 'relative'
                    }}>
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <User size={24} color="#3b82f6" />
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
                            <p style={{ color: '#3b82f6', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user?.status || 'Online'}</p>
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
                                background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                border: '1px solid',
                                borderColor: isActive ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
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

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    style={{
                        marginTop: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        width: '100%',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '10px',
                        color: '#ef4444',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        flexShrink: 0,
                        WebkitTapHighlightColor: 'transparent'
                    }}
                >
                    <LogOut size={18} />
                    Logout
                </button>
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
                                            {profileData.photoURL ? (
                                                <img src={profileData.photoURL} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                                            setProfileData({ ...profileData, photoURL: reader.result });
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
        </>
    );
};

export default Sidebar;


import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, NotebookPen, Key, UserX, Wallet, Landmark,
    Activity, TrendingUp, MessageSquare, User, Camera, Mail, Image as ImageIcon, Trash2, Check, Settings, LayoutGrid, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Switch = ({ checked, onChange }) => (
    <div
        onClick={() => onChange(!checked)}
        style={{
            width: '42px',
            height: '24px',
            background: checked ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: checked ? 'none' : '1px solid rgba(255,255,255,0.1)'
        }}
    >
        <motion.div
            animate={{ x: checked ? 20 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            style={{
                position: 'absolute',
                top: '2px',
                left: 0,
                width: '18px',
                height: '18px',
                background: 'white',
                borderRadius: '50%',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
        />
    </div>
);

const SettingsModal = ({ isOpen, onClose, settings, setSettings }) => {
    const { user, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'preferences'
    const [profileData, setProfileData] = useState({
        displayName: user?.displayName || user?.username || '',
        status: user?.status || 'Online',
        avatar: user?.avatar || '',
        bgImage: user?.bgImage || ''
    });

    if (!isOpen) return null;

    const toggleSetting = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        await updateUser(profileData);
        // Optionally show a success toast or just close
    };

    const fonts = [
        { name: 'Fun Style', id: "'DynaPuff', system-ui" },
        { name: 'Modern Sans', id: "'Plus Jakarta Sans', sans-serif" },
        { name: 'Futuristic', id: "'Syncopate', sans-serif" },
        { name: 'High-Tech', id: "'Orbitron', sans-serif" },
        { name: 'System Pro', id: "'Inter', sans-serif" },
        { name: 'Neo-Sharp', id: "'Space Grotesk', sans-serif" },
        { name: 'Clean Geometric', id: "'Outfit', sans-serif" },
        { name: 'Ultra Bold', id: "'Unbounded', sans-serif" }
    ];

    const colors = [
        { name: 'Blue', color: '59, 130, 246' },
        { name: 'Purple', color: '139, 92, 246' },
        { name: 'Pink', color: '236, 72, 153' },
        { name: 'Emerald', color: '16, 185, 129' },
        { name: 'Orange', color: '249, 115, 22' },
        { name: 'Gold', color: '234, 179, 8' },
        { name: 'Crimson', color: '225, 29, 72' },
        { name: 'Indigo', color: '99, 102, 241' },
        { name: 'Cyan', color: '6, 182, 212' },
        { name: 'Rose', color: '244, 63, 94' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                background: 'rgba(2, 6, 23, 0.85)',
                backdropFilter: 'blur(15px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '480px',
                    maxHeight: '85vh',
                    background: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                {/* Header */}
                <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(to right, rgba(59, 130, 246, 0.05), transparent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'white', margin: 0 }}>Pengaturan Sistem</h3>
                            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Kelola profil dan preferensi dashboard</p>
                        </div>
                        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px', borderRadius: '12px' }}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '14px' }}>
                        <button
                            onClick={() => setActiveTab('profile')}
                            style={{
                                flex: 1, padding: '10px', borderRadius: '11px', border: 'none',
                                background: activeTab === 'profile' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                color: activeTab === 'profile' ? '#3b82f6' : '#64748b',
                                fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <User size={16} /> Edit Profil
                        </button>
                        <button
                            onClick={() => setActiveTab('preferences')}
                            style={{
                                flex: 1, padding: '10px', borderRadius: '11px', border: 'none',
                                background: activeTab === 'preferences' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                color: activeTab === 'preferences' ? '#3b82f6' : '#64748b',
                                fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <LayoutGrid size={16} /> Dashboard
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    {activeTab === 'profile' ? (
                        <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        width: '90px', height: '90px', borderRadius: '24px', background: '#1e293b',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                        border: `2px solid rgb(${settings.sidebarColor || '59, 130, 246'})`,
                                        boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                                    }}>
                                        {profileData.avatar ? (
                                            <img src={profileData.avatar} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <User size={36} color="#3b82f6" />
                                        )}
                                    </div>
                                    <label htmlFor="settings-profile-upload" style={{
                                        position: 'absolute', bottom: '-6px', right: '-6px', width: '32px', height: '32px',
                                        background: '#3b82f6', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', border: '3px solid #0f172a', color: 'white'
                                    }}>
                                        <Camera size={16} />
                                        <input id="settings-profile-upload" type="file" accept="image/*" onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => setProfileData({ ...profileData, avatar: reader.result });
                                                reader.readAsDataURL(file);
                                            }
                                        }} style={{ display: 'none' }} />
                                    </label>
                                </div>
                                <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Ikon kamera untuk ganti foto</p>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Nama Akun</label>
                                <input type="text" value={profileData.displayName} onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '14px', outline: 'none' }} />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Status</label>
                                <input type="text" value={profileData.status} onChange={(e) => setProfileData({ ...profileData, status: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '14px', outline: 'none' }} />
                            </div>

                            <div style={{
                                padding: '16px', borderRadius: '20px',
                                background: profileData.bgImage ? `linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.7)), url(${profileData.bgImage})` : 'rgba(59, 130, 246, 0.05)',
                                backgroundSize: 'cover', backgroundPosition: 'center', border: '1px dashed rgba(59, 130, 246, 0.3)', textAlign: 'center'
                            }}>
                                <p style={{ fontSize: '13px', fontWeight: '700', color: 'white', marginBottom: '4px' }}>Latar Dashboard</p>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#3b82f6', borderRadius: '8px', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                                        <ImageIcon size={14} /> Ganti
                                        <input type="file" accept="image/*" onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (event) => setProfileData({ ...profileData, bgImage: event.target.result });
                                                reader.readAsDataURL(file);
                                            }
                                        }} style={{ display: 'none' }} />
                                    </label>
                                    {profileData.bgImage && (
                                        <button type="button" onClick={() => setProfileData({ ...profileData, bgImage: '' })} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                    )}
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Aksen & Sidebar (Theme)</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                                    {colors.map(c => (
                                        <button key={c.color} onClick={() => setSettings(prev => ({ ...prev, sidebarColor: c.color }))}
                                            style={{ height: '36px', borderRadius: '10px', background: `rgb(${c.color})`, border: settings.sidebarColor === c.color ? '3px solid white' : 'none', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}>
                                            {settings.sidebarColor === c.color && (
                                                <div style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'white', borderRadius: '50%', width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: `rgb(${c.color})` }} />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Gaya Desain (Fonts)</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                    {fonts.map(font => (
                                        <button key={font.id} onClick={() => setSettings(prev => ({ ...prev, fontFamily: font.id }))}
                                            style={{ padding: '10px', borderRadius: '10px', background: settings.fontFamily === font.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)', border: settings.fontFamily === font.id ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.05)', color: settings.fontFamily === font.id ? 'white' : '#94a3b8', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: font.id, transition: 'all 0.2s' }}>
                                            {font.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '-8px' }}>Visibilitas Fitur</p>
                            {[
                                { key: 'showNotes', label: 'Catatan Kerja', icon: NotebookPen, color: '59, 130, 246' },
                                { key: 'showLogins', label: 'Data Login', icon: Key, color: '139, 92, 246' },
                                { key: 'showMistakes', label: 'Kesalahan Staf', icon: UserX, color: '239, 68, 68' },
                                { key: 'showBalance', label: 'Saldo Keuangan', icon: Wallet, color: '16, 185, 129' },
                                { key: 'showBank', label: 'Jadwal Bank', icon: Landmark, color: '59, 130, 246' },
                                { key: 'showActivity', label: 'Aktivitas Terbaru', icon: Activity, color: '245, 158, 11' },
                                { key: 'showFinance', label: 'Ringkasan Keuangan', icon: TrendingUp, color: '16, 185, 129' },
                                { key: 'showChat', label: 'Panel Chat Global', icon: MessageSquare, color: '59, 130, 246' },
                            ].map((item) => (
                                <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `rgba(${item.color}, 0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <item.icon size={14} color={`rgb(${item.color})`} />
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>{item.label}</span>
                                    </div>
                                    <Switch checked={settings[item.key]} onChange={() => toggleSetting(item.key)} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Footer */}
                <div style={{ padding: '24px', background: 'rgba(2, 6, 23, 0.4)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                        onClick={activeTab === 'profile' ? handleProfileUpdate : onClose}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '16px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            fontSize: '15px',
                            boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        {activeTab === 'profile' ? <><Check size={18} /> Simpan Profil</> : 'Terapkan Perubahan'}
                    </button>
                    {activeTab === 'profile' && (
                        <p style={{ textAlign: 'center', fontSize: '10px', color: '#64748b', marginTop: '12px' }}>Profil akan disinkronkan ke semua perangkat</p>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SettingsModal;

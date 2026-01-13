import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Menu, X } from 'lucide-react';

const Layout = () => {
    const { user } = useAuth();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile screen
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Lock scroll when sidebar open (mobile)
    useEffect(() => {
        document.body.style.overflow = isMobileOpen ? 'hidden' : 'auto';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isMobileOpen]);

    const [fontFamily, setFontFamily] = useState("'Inter', sans-serif");
    const [themeColor, setThemeColor] = useState('59, 130, 246'); // Default Blue RGB

    useEffect(() => {
        if (user?.username) {
            const updateSettings = () => {
                const saved = localStorage.getItem(`dashboard_settings_${user.username}`);
                if (saved) {
                    const settings = JSON.parse(saved);
                    if (settings.fontFamily) {
                        setFontFamily(settings.fontFamily);
                    }
                    if (settings.sidebarColor) {
                        setThemeColor(settings.sidebarColor);
                    }
                }
            };
            updateSettings();
            window.addEventListener('storage', updateSettings);
            const interval = setInterval(updateSettings, 1000);
            return () => {
                window.removeEventListener('storage', updateSettings);
                clearInterval(interval);
            };
        }
    }, [user?.username]);

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const handleCloseSidebar = () => {
        setIsMobileOpen(false);
    };

    return (
        <div
            key={user?.username || 'guest'}
            style={{
                display: 'flex',
                minHeight: '100vh',
                fontFamily: fontFamily,
                backgroundColor: '#020617',
                backgroundImage: user?.bgImage
                    ? `linear-gradient(rgba(2, 6, 23, 0.35), rgba(2, 6, 23, 0.35)), url(${user.bgImage})`
                    : 'linear-gradient(135deg, #020617, #0f172a, #020617)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                boxShadow: 'inset 0 0 100px rgba(0,0,0,0.3)',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: fontFamily
            }}
        >
            {/* MOBILE TOGGLE BUTTON */}
            {isMobile && (
                <button
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    style={{
                        position: 'fixed',
                        top: '16px',
                        left: '16px',
                        zIndex: 1200,
                        width: '56px',
                        height: '56px',
                        background: isMobileOpen
                            ? 'rgba(15, 23, 42, 0.6)'
                            : `linear-gradient(135deg, rgb(${themeColor}), rgba(${themeColor}, 0.8))`,
                        backdropFilter: 'blur(10px)',
                        border: isMobileOpen
                            ? '1px solid rgba(255,255,255,0.1)'
                            : `1px solid rgba(${themeColor}, 0.3)`,
                        borderRadius: '18px',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isMobileOpen
                            ? '0 10px 25px rgba(0,0,0,0.3)'
                            : `0 10px 30px rgba(${themeColor}, 0.4), inset 0 0 15px rgba(255,255,255,0.2)`,
                        cursor: 'pointer',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isMobileOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                >
                    {isMobileOpen ? <X size={26} strokeWidth={2.5} /> : <Menu size={26} strokeWidth={2.5} />}
                    {/* Pulsing Aura for Hamburger */}
                    {!isMobileOpen && (
                        <div style={{
                            position: 'absolute',
                            inset: '-4px',
                            borderRadius: '22px',
                            border: `2px solid rgba(${themeColor}, 0.4)`,
                            filter: 'blur(4px)',
                            animation: 'pulse 2s infinite'
                        }} />
                    )}
                </button>
            )}

            {/* MOBILE OVERLAY (DI BAWAH MAIN CONTENT) */}
            {isMobile && isMobileOpen && (
                <div
                    onClick={handleCloseSidebar}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                        zIndex: 1000 // Between Main and Sidebar
                    }}
                />
            )}

            {/* SIDEBAR */}
            <Sidebar
                isOpen={isMobileOpen}
                onClose={handleCloseSidebar}
                isMobile={isMobile}
            />

            {/* MAIN CONTENT (FIXED: DI ATAS OVERLAY) */}
            <main
                style={{
                    flex: 1,
                    padding: isMobile ? '12px' : '32px',
                    paddingTop: isMobile ? '70px' : '32px',
                    marginLeft: isMobile ? 0 : '280px',
                    width: isMobile ? '100%' : 'calc(100% - 280px)',
                    minHeight: '100vh',
                    overflowX: 'hidden',
                    overflowY: 'auto',
                    transition: 'margin-left 0.3s ease, padding 0.3s ease',
                    position: 'relative',
                    zIndex: 10
                }}
            >
                <div className="page-wrapper">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;

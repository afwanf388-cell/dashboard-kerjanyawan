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
                backgroundColor: '#020617',
                backgroundImage: user?.bgImage
                    ? `linear-gradient(rgba(2, 6, 23, 0.35), rgba(2, 6, 23, 0.35)), url(${user.bgImage})`
                    : 'linear-gradient(135deg, #020617, #0f172a, #020617)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                boxShadow: 'inset 0 0 100px rgba(0,0,0,0.3)',
                position: 'relative',
                overflow: 'hidden'
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
                        zIndex: 1200, // Higher than Sidebar
                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '12px',
                        color: 'white',
                        boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
                        cursor: 'pointer'
                    }}
                >
                    {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
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

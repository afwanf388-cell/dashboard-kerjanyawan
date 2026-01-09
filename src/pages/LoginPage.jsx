import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Shield, Eye, EyeOff, User, Lock, Sparkles, UserPlus, Mail, ArrowRight, Check, Star, Cloud, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

const LoginPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        if (user) navigate('/');
        return () => window.removeEventListener('resize', handleResize);
    }, [user, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!supabase) {
            setError('Cloud connection error.');
            setIsLoading(false);
            return;
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            const { data: users, error: dbError } = await supabase
                .from('user_accounts')
                .select('*')
                .or(`username.eq.${username},email.eq.${username}`)
                .eq('password', password)
                .limit(1);

            if (dbError) throw dbError;

            if (users && users.length > 0) {
                const foundUser = users[0];
                login({
                    id: foundUser.id,
                    username: foundUser.username,
                    displayName: foundUser.display_name || foundUser.username,
                    email: foundUser.email,
                    role: foundUser.role || 'user',
                    avatar: foundUser.avatar,
                    status: 'Online'
                });
                navigate('/');
            } else {
                setError('Invalid username/email or password');
            }
        } catch (err) {
            setError('Login failed: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        try {
            const { error: regError } = await supabase
                .from('user_accounts')
                .insert([{
                    username: username.trim(),
                    email: email.trim(),
                    password: password,
                    role: 'user'
                }]);

            if (regError) throw regError;
            setSuccess('Success! Please sign in.');
            setIsLogin(true);
        } catch (err) {
            setError('Registration failed: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            background: '#0a0a0f',
            color: 'white',
            fontFamily: "'Inter', sans-serif",
            flexDirection: isMobile ? 'column' : 'row'
        }}>
            {/* Left Side: Branding */}
            <div style={{
                flex: isMobile ? 'none' : '1.2',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: isMobile ? '40px 30px' : '60px',
                position: 'relative',
                overflow: 'hidden',
                minHeight: isMobile ? 'auto' : '100vh'
            }}>
                {/* Dot Pattern Overlay */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                    opacity: 0.6
                }} />

                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ position: 'relative', zIndex: 2 }}
                >
                    <div style={{
                        width: '56px', height: '56px',
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '40px',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.3)'
                    }}>
                        <Sparkles size={32} color="white" />
                    </div>

                    <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: '900', lineHeight: '1.1', marginBottom: '24px', letterSpacing: '-1px' }}>
                        DASHBOARD<br />KERJAKU
                    </h1>
                    <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.85)', maxWidth: '400px', lineHeight: '1.6', fontWeight: '500' }}>
                        Sistem manajemen kerja cerdas dengan perhitungan akurat dan efisiensi tingkat tinggi.
                    </p>

                    <div style={{ marginTop: '60px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                                <Shield size={22} />
                            </div>
                            <div>
                                <div style={{ fontWeight: '800', fontSize: '15px', letterSpacing: '0.5px' }}>AKSES AMAN</div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase' }}>Keamanan data terenkripsi end-to-end</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                                <RefreshCw size={22} />
                            </div>
                            <div>
                                <div style={{ fontWeight: '800', fontSize: '15px', letterSpacing: '0.5px' }}>REAL-TIME DATA</div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase' }}>Sinkronisasi data otomatis lintas sesi</div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div style={{ position: 'relative', zIndex: 2, paddingBottom: '10px' }}>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', marginBottom: '30px', width: '200px' }} />
                    <div style={{
                        fontSize: '12px',
                        fontWeight: '900',
                        letterSpacing: '2px',
                        background: 'linear-gradient(to right, #fbbf24, #f59e0b, #fbbf24)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        textShadow: '0 0 10px rgba(251, 191, 36, 0.4)'
                    }}>
                        <Star size={14} color="#fbbf24" fill="#fbbf24" style={{ filter: 'drop-shadow(0 0 5px rgba(251, 191, 36, 0.8))' }} /> CREDIT BY AFWAN
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '5px', fontWeight: '600', letterSpacing: '1px' }}>BUILD WITH PRECISION & ELEGANCE</div>
                </div>
            </div>

            {/* Right Side: Form */}
            <div style={{
                flex: isMobile ? 'none' : '1',
                padding: isMobile ? '50px 30px' : '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f172a'
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ width: '100%', maxWidth: '420px', padding: isMobile ? '0' : '40px' }}
                >
                    <div style={{ marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.5px', marginBottom: '10px' }}>SELAMAT DATANG</h2>
                        <p style={{ color: '#64748b', fontWeight: '600', fontSize: '14px', letterSpacing: '0.5px' }}>MASUK UNTUK MENGELOLA DASHBOARD ANDA</p>
                    </div>

                    <form onSubmit={isLogin ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
                                    {error}
                                </motion.div>
                            )}
                            {success && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '12px', borderRadius: '12px', textAlign: 'center', fontSize: '13px' }}>
                                    {success}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '10px', letterSpacing: '1px' }}>
                                EMAIL ADDRESS / USERNAME
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="mail@smj.com"
                                    required
                                    style={{
                                        width: '100%', height: '54px', paddingLeft: '48px',
                                        background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '12px', color: 'white', fontWeight: '500', outline: 'none'
                                    }}
                                />
                            </div>
                        </div>

                        {!isLogin && (
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '10px', letterSpacing: '1px' }}>
                                    EMAIL ADDRESS
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        required
                                        style={{
                                            width: '100%', height: '54px', paddingLeft: '48px',
                                            background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: '12px', color: 'white', fontWeight: '500', outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '10px', letterSpacing: '1px' }}>
                                SECURE PASSWORD
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    style={{
                                        width: '100%', height: '54px', paddingLeft: '48px', paddingRight: '48px',
                                        background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '12px', color: 'white', fontWeight: '500', outline: 'none'
                                    }}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {!isLogin && (
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '10px', letterSpacing: '1px' }}>
                                    CONFIRM PASSWORD
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    style={{
                                        width: '100%', height: '54px', paddingLeft: '20px',
                                        background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '12px', color: 'white', fontWeight: '500', outline: 'none'
                                    }}
                                />
                            </div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            style={{
                                height: '58px', borderRadius: '14px',
                                background: 'linear-gradient(90deg, #7c3aed, #6366f1)',
                                color: 'white', fontWeight: '900', fontSize: '16px',
                                textTransform: 'uppercase', letterSpacing: '1px',
                                border: 'none', cursor: isLoading ? 'wait' : 'pointer',
                                marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.4)'
                            }}
                        >
                            {isLoading ? 'PROCESSING...' : (
                                <>
                                    <LogIn size={20} />
                                    <span>{isLogin ? 'MASUK SEKARANG' : 'DAFTAR SEKARANG'}</span>
                                </>
                            )}
                        </motion.button>
                    </form>



                    <div style={{ marginTop: '40px', textAlign: 'center' }}>
                        <button
                            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', fontWeight: '800', letterSpacing: '1px', cursor: 'pointer' }}
                        >
                            {isLogin ? 'BELUM PUNYA AKUN? DAFTAR GRATIS' : 'SUDAH PUNYA AKUN? MASUK SEKARANG'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default LoginPage;

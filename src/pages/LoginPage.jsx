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
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { login, user } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    React.useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const getUsers = () => {
        try {
            return JSON.parse(localStorage.getItem('registered_users') || '[]');
        } catch {
            return [];
        }
    };

    const saveUsers = (users) => {
        localStorage.setItem('registered_users', JSON.stringify(users));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        if (!supabase) {
            setError('Cloud connection error. Please check your credentials.');
            setIsLoading(false);
            return;
        }

        try {
            // Wait for visual effect
            await new Promise(resolve => setTimeout(resolve, 800));

            // Query Supabase for user
            const { data: users, error: dbError } = await supabase
                .from('user_accounts')
                .select('*')
                .or(`username.eq.${username},email.eq.${username}`)
                .eq('password', password) // In production, use hashed passwords!
                .limit(1);

            if (dbError) throw dbError;

            if (users && users.length > 0) {
                const foundUser = users[0];
                const userData = {
                    id: foundUser.id,
                    username: foundUser.username,
                    displayName: foundUser.display_name || foundUser.username,
                    email: foundUser.email,
                    role: foundUser.role || 'user',
                    avatar: foundUser.avatar,
                    photoURL: foundUser.avatar, // for compatibility
                    bgImage: foundUser.bg_image,
                    status: foundUser.status || 'Online'
                };
                login(userData);
                navigate('/');
            } else {
                setError('Invalid username/email or password');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Login failed: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        if (!supabase) {
            setError('Cloud connection error. Cannot register.');
            setIsLoading(false);
            return;
        }

        // Validation
        if (username.trim().length < 3) {
            setError('Username must be at least 3 characters');
            setIsLoading(false);
            return;
        }

        if (!email.includes('@')) {
            setError('Please enter a valid email address');
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 800));

            // Check if username or email already exists in Supabase
            const { data: existingUser, error: checkError } = await supabase
                .from('user_accounts')
                .select('username, email')
                .or(`username.eq.${username.trim()},email.eq.${email.trim()}`)
                .limit(1);

            if (checkError) throw checkError;

            if (existingUser && existingUser.length > 0) {
                if (existingUser[0].username === username.trim()) {
                    setError('Username already taken');
                } else {
                    setError('Email already registered');
                }
                setIsLoading(false);
                return;
            }

            // Register new user in Supabase
            const { error: regError } = await supabase
                .from('user_accounts')
                .insert([{
                    username: username.trim(),
                    email: email.trim(),
                    password: password, // In production, hash this!
                    role: 'user'
                }]);

            if (regError) throw regError;

            setSuccess('Account created successfully! You can now sign in.');
            setIsLogin(true);
            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            console.error('Registration error:', err);
            setError('Registration failed: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const switchMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setSuccess('');
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            /* PERFORMANCE: Pure CSS gradient - loads INSTANTLY */
            background: `
                radial-gradient(ellipse at 50% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 40%),
                radial-gradient(ellipse at 20% 60%, rgba(6, 182, 212, 0.08) 0%, transparent 40%),
                linear-gradient(180deg, #020617 0%, #0f172a 40%, #1e1b4b 100%)
            `,
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Animated stars using CSS - very lightweight */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: `
                    radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,0.8), transparent),
                    radial-gradient(2px 2px at 40% 70%, rgba(255,255,255,0.6), transparent),
                    radial-gradient(1px 1px at 50% 50%, rgba(255,255,255,0.5), transparent),
                    radial-gradient(2px 2px at 60% 20%, rgba(255,255,255,0.7), transparent),
                    radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,0.4), transparent),
                    radial-gradient(2px 2px at 80% 40%, rgba(255,255,255,0.6), transparent),
                    radial-gradient(1px 1px at 90% 80%, rgba(255,255,255,0.5), transparent),
                    radial-gradient(1px 1px at 10% 90%, rgba(255,255,255,0.4), transparent),
                    radial-gradient(2px 2px at 30% 10%, rgba(255,255,255,0.7), transparent)
                `,
                backgroundSize: '100% 100%',
                opacity: 0.6,
                pointerEvents: 'none'
            }} />

            {/* Gradient overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.6))',
                zIndex: 1
            }} />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    position: 'relative',
                    zIndex: 10,
                    width: '100%',
                    maxWidth: '440px',
                    margin: '20px',
                    perspective: '1000px'
                }}
            >
                <div
                    className="glass-panel"
                    style={{
                        background: 'rgba(12, 12, 20, 0.85)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        borderRadius: '30px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        overflow: 'hidden',
                        padding: '40px'
                    }}
                >
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            style={{
                                display: 'inline-flex',
                                marginBottom: '24px',
                                padding: '16px',
                                borderRadius: '24px',
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)'
                            }}
                        >
                            {isLogin ? <Shield size={42} className="text-blue-400" /> : <Star size={42} className="text-purple-400" />}
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{
                                fontSize: '28px',
                                fontWeight: '800',
                                marginBottom: '8px',
                                background: 'linear-gradient(to right, #60a5fa, #a78bfa, #f472b6)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                letterSpacing: '-0.5px'
                            }}
                        >
                            {isLogin ? 'Welcome Back' : 'Join the Future'}
                        </motion.h1>
                        <p style={{ color: '#94a3b8', fontSize: '15px' }}>
                            {isLogin ? 'Access your personal dashboard V10' : 'Create your ultimate account today'}
                        </p>
                    </div>

                    {/* Form */}
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#fca5a5',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    marginBottom: '20px',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    justifyContent: 'center'
                                }}
                            >
                                <Shield size={16} /> {error}
                            </motion.div>
                        )}
                        {success && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                style={{
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    color: '#86efac',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    marginBottom: '20px',
                                    fontSize: '14px',
                                    textAlign: 'center'
                                }}
                            >
                                {success}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={isLogin ? handleLogin : handleRegister}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="input-group">
                                <div style={{ position: 'relative' }}>
                                    <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '16px 16px 16px 48px',
                                            borderRadius: '16px',
                                            background: 'rgba(0, 0, 0, 0.3)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            color: 'white',
                                            fontSize: '15px',
                                            outline: 'none',
                                            transition: 'all 0.3s'
                                        }}
                                        className="hover:border-blue-500/50 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {!isLogin && (
                                <div className="input-group">
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                        <input
                                            type="email"
                                            placeholder="Email Address"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '16px 16px 16px 48px',
                                                borderRadius: '16px',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                color: 'white',
                                                fontSize: '15px',
                                                outline: 'none',
                                                transition: 'all 0.3s'
                                            }}
                                            className="hover:border-blue-500/50 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="input-group">
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '16px 48px 16px 48px',
                                            borderRadius: '16px',
                                            background: 'rgba(0, 0, 0, 0.3)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            color: 'white',
                                            fontSize: '15px',
                                            outline: 'none',
                                            transition: 'all 0.3s'
                                        }}
                                        className="hover:border-blue-500/50 focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {!isLogin && (
                                <div className="input-group">
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                        <input
                                            type="password"
                                            placeholder="Confirm Password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '16px 16px 16px 48px',
                                                borderRadius: '16px',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                color: 'white',
                                                fontSize: '15px',
                                                outline: 'none',
                                                transition: 'all 0.3s'
                                            }}
                                            className="hover:border-blue-500/50 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)' }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                marginTop: '30px',
                                padding: '16px',
                                borderRadius: '16px',
                                background: isLogin ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                                border: 'none',
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: '700',
                                cursor: isLoading ? 'wait' : 'pointer',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <span style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                {isLoading ? 'Processing...' : (isLogin ? <>Sign In <ArrowRight size={20} /></> : <>Create Account <Sparkles size={18} /></>)}
                            </span>
                            {/* Shine effect */}
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', transform: 'skewX(-20deg) translateX(-150%)', animation: 'shine 3s infinite' }}></div>
                        </motion.button>
                    </form>

                    <div style={{ marginTop: '24px', textAlign: 'center' }}>
                        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                            <button
                                onClick={switchMode}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: isLogin ? '#60a5fa' : '#f472b6',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    marginLeft: '4px'
                                }}
                            >
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </button>
                        </p>
                    </div>

                    <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                        <p style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>Personal Dashboard V10 Ultimate</p>
                    </div>
                </div>
            </motion.div>

            {/* Removed shine animation for better performance */}
        </div>
    );
};

export default LoginPage;

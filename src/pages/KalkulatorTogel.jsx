import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Coins, SlidersHorizontal, X, Globe, Trophy, Hash, Percent, Target, Grid, Zap, Award } from 'lucide-react';

const POOLS = [
    "HOKI DRAW", "HONGKONG LOTTO", "SYDNEY LOTTO",
    "KING KONG4D MALAM", "KING KONG4D SORE", "TOTOMALI 2330",
    "TOTOMALI 2030", "TOTOMALI 1530", "TOTO CAMBODIA LIVE",
    "TOTO MACAU MALAM 3", "PCSO", "MAGNUM 4D",
    "NEVADA", "CHELSEA 21", "CHELSEA 19",
    "CHELSEA 15", "CHELSEA 11", "BULLSEYE",
    "POIPET 22", "POIPET 19", "POIPET 15",
    "POIPET 12", "CALIFORNIA", "BRUNEI 21",
    "BRUNEI 14", "BRUNEI 02", "CAROLINA EVENING",
    "BANGKOK 0930", "BANGKOK 0130", "HUAHIN 2100",
    "HUAHIN 1630", "HUAHIN 0100", "NEW YORK EVENING",
    "NEW YORK MIDDAY", "FLORIDA EVENING", "FLORIDA MIDDAY",
    "KENTUCKY EVENING", "KENTUCKY MIDDAY", "TOTO MACAU MALAM 2",
    "TOTO MACAU MALAM 1", "TOTO MACAU SORE", "TOTO MACAU SIANG",
    "TOTO MACAU PAGI", "OREGON 12", "OREGON 09",
    "OREGON 06", "OREGON 03", "NORTH CAROLINA DAY",
    "SINGAPORE"
];

// 1. DEFAULT CONFIG (For King Kong, Chelsea, Totomali, Hoki Draw, etc.) - Based on Hoki Draw
const CONFIG_DEFAULT = {
    'DISKON': {
        color: '#0ea5e9', // Changed to Cool Sky Blue
        games: [
            { name: 'DISKON 5D', discount: 0.38, prize: 50000 },
            { name: 'DISKON 4D', discount: 0.20, prize: 7000 },
            { name: 'DISKON 3D', discount: 0.20, prize: 750 },
            { name: 'DISKON 2D', discount: 0.20, prize: 75 },
        ]
    },
    'BET FULL': {
        color: '#ec4899',
        games: [
            { name: 'BET FULL 5D', discount: 0.00, prize: 88000 },
            { name: 'BET FULL 4D', discount: 0.00, prize: 10000 },
            { name: 'BET FULL 3D', discount: 0.00, prize: 1000 },
            { name: 'BET FULL 2D', discount: 0.00, prize: 100 },
        ]
    },
    'TEPAT & BB': {
        color: '#10b981',
        games: [
            { name: '5D TEPAT', discount: 0.00, prize: 50000 },
            { name: '5D BB', discount: 0.00, prize: 350 },
            { name: '4D TEPAT', discount: 0.00, prize: 5000 },
            { name: '4D BB', discount: 0.00, prize: 180 },
            { name: '3D TEPAT', discount: 0.00, prize: 500 },
            { name: '3D BB', discount: 0.00, prize: 75 },
            { name: '2D TEPAT', discount: 0.00, prize: 80 },
            { name: '2D BB', discount: 0.00, prize: 15 },
        ]
    },
    'LAINNYA': {
        color: '#6366f1',
        games: [
            { name: 'COLOK BEBAS', discount: 0.06, prize: 0.9 }, // Shown as x0.9
            { name: 'COLOK BEBAS 2D(2)', discount: 0.10, prize: 4 },
            { name: 'COLOK BEBAS 2D(3)', discount: 0.10, prize: 6 },
            { name: 'COLOK BEBAS 2D(4)', discount: 0.10, prize: 20 },
            { name: 'COLOK BEBAS 2D(5)', discount: 0.10, prize: 200 },
            { name: 'COLOK BEBAS 4D(4)', discount: 0.10, prize: 50 },
            { name: 'COLOK BEBAS 4D(5)', discount: 0.10, prize: 200 },
            { name: 'COLOK NAGA(3)', discount: 0.10, prize: 12 },
            { name: 'COLOK NAGA(4)', discount: 0.10, prize: 30 },
            { name: 'COLOK NAGA(5)', discount: 0.10, prize: 125 },
            { name: 'COLOK JITU', discount: 0.06, prize: 8 },
            { name: 'TENGAH TEPI', discount: 0.02, prize: 1 }, // Prize x1 assumed for Kei games
            { name: 'DASAR GENAP - KECIL', discount: 0.02, prize: 1 },
            { name: 'DASAR GANJIL - BESAR', discount: 0.02, prize: 1 },
            { name: '50 - 50', discount: 0.02, prize: 1 },
            { name: 'SHIO', discount: 0.05, prize: 9.5 },
            { name: 'KOMBINASI', discount: 0.08, prize: 2.7 },
        ]
    }
};

// 2. WLA STANDARD CONFIG (For HK, SGP, SYD, etc.)
// Standard Diskon: 66% (4D), 59% (3D), 29% (2D)
const CONFIG_WLA = {
    'DISKON': {
        color: '#0ea5e9', // Cool Blue
        games: [
            { name: 'DISKON 4D', discount: 0.66, prize: 3000 },
            { name: 'DISKON 3D', discount: 0.59, prize: 400 },
            { name: 'DISKON 2D', discount: 0.29, prize: 70 }, // Default WLA, Override for HK later
        ]
    },
    'BET FULL': {
        color: '#ec4899',
        games: [
            { name: 'BET FULL 4D', discount: 0.00, prize: 9000 },
            { name: 'BET FULL 3D', discount: 0.00, prize: 950 },
            { name: 'BET FULL 2D', discount: 0.00, prize: 95 },
        ]
    }
};

// 3. MACAU CONFIG (High Prizes for Bet Full)
const CONFIG_MACAU = {
    'BET FULL': {
        color: '#ec4899',
        games: [
            { name: 'BET FULL 5D', discount: 0.00, prize: 90000 },
            { name: 'BET FULL 4D', discount: 0.00, prize: 9800 },
            { name: 'BET FULL 3D', discount: 0.00, prize: 980 },
            { name: 'BET FULL 2D', discount: 0.00, prize: 98 },
        ]
    }
};

const POOL_CONFIGS = {};

const getGameData = (poolName) => {
    let baseConfig = JSON.parse(JSON.stringify(CONFIG_DEFAULT)); // Deep copy default

    // Apply WLA Template
    if (['HONGKONG LOTTO', 'SYDNEY LOTTO', 'SINGAPORE', 'MAGNUM 4D', 'PCSO', 'NEVADA', 'BULLSEYE', 'CAROLINA EVENING', 'KENTUCKY EVENING'].includes(poolName)) {
        baseConfig['DISKON'] = { ...baseConfig['DISKON'], ...CONFIG_WLA['DISKON'] }; // Merge Diskon
        if (CONFIG_WLA['BET FULL']) {
            baseConfig['BET FULL'] = { ...baseConfig['BET FULL'], ...CONFIG_WLA['BET FULL'] };
        }
    }

    // Apply Macau Template
    if (poolName.includes('TOTO MACAU')) {
        baseConfig['BET FULL'] = { ...baseConfig['BET FULL'], ...CONFIG_MACAU['BET FULL'] };
    }

    // Specific Overrides
    if (poolName === 'HONGKONG LOTTO') {
        const d2Game = baseConfig['DISKON'].games.find(g => g.name === 'DISKON 2D');
        if (d2Game) d2Game.prize = 65; // User specific request
    }

    return baseConfig;
};

const TABS = ['SEMUA', 'DISKON', 'BET FULL', 'TEPAT & BB', 'LAINNYA'];

const TogelCalculator = () => {
    const [activeTab, setActiveTab] = useState('SEMUA');
    const [selectedPool, setSelectedPool] = useState('HOKI DRAW');
    const [showPoolsModal, setShowPoolsModal] = useState(false);
    const [inputs, setInputs] = useState({});
    const [results, setResults] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPools = POOLS.filter(pool =>
        pool.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get dynamic game data based on selected pool
    const gameData = getGameData(selectedPool);

    const handleInputChange = (gameName, value) => {
        setInputs(prev => ({ ...prev, [gameName]: value }));
    };

    const calculate = (gameName, category) => {
        const rawAmount = parseFloat(inputs[gameName] || 0);
        if (!rawAmount || rawAmount <= 0) return;

        const gameInfo = gameData[category].games.find(g => g.name === gameName);
        if (!gameInfo) return;

        const bayar = rawAmount - (rawAmount * gameInfo.discount);
        const hadiah = rawAmount * gameInfo.prize;

        setResults(prev => ({
            ...prev,
            [gameName]: {
                bayar,
                hadiah,
                input: rawAmount
            }
        }));
    };

    const reset = (gameName) => {
        setInputs(prev => ({ ...prev, [gameName]: '' }));
        setResults(prev => {
            const newResults = { ...prev };
            delete newResults[gameName];
            return newResults;
        });
    };

    const formatRupiah = (num) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
    };

    const sectionsToRender = activeTab === 'SEMUA' ? ['DISKON', 'BET FULL', 'TEPAT & BB', 'LAINNYA'] : [activeTab];

    const getIconForGame = (name) => {
        if (name.includes('COLOK')) return <Zap size={18} />;
        if (name.includes('TEPAT') || name.includes('SHIO')) return <Target size={18} />;
        if (name.includes('BB')) return <Grid size={18} />;
        if (name.includes('DISKON') || name.includes('BET FULL')) return <Hash size={18} />;
        return <Award size={18} />;
    };

    return (
        <div style={{ paddingBottom: '80px', minHeight: '100vh', color: 'white' }}>
            {/* BACKGROUND ACCENTS */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1,
                background: 'radial-gradient(circle at 50% 10%, rgba(14, 165, 233, 0.05), transparent 60%), radial-gradient(circle at 90% 90%, rgba(59, 130, 246, 0.05), transparent 50%)',
                pointerEvents: 'none'
            }} />

            {/* HEADER */}
            <div className="glass-effect" style={{
                padding: '24px 32px', borderRadius: '32px', marginBottom: '32px',
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '20px',
                boxShadow: '0 20px 50px -10px rgba(0,0,0,0.3)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '20px',
                        background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 30px rgba(14, 165, 233, 0.4)',
                        border: '2px solid rgba(255,255,255,0.1)'
                    }}>
                        <Calculator size={36} color="white" strokeWidth={1.5} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                            <h1 style={{
                                fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: '900', color: 'white',
                                letterSpacing: '-1px', textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                            }}>
                                {selectedPool}
                            </h1>
                            <div style={{
                                background: 'linear-gradient(90deg, #0ea5e9, #6366f1)',
                                color: 'white', fontSize: '11px',
                                padding: '4px 10px', borderRadius: '20px', fontWeight: '800',
                                boxShadow: '0 0 10px rgba(14, 165, 233, 0.4)',
                                letterSpacing: '0.5px'
                            }}>
                                LIVE
                            </div>
                        </div>
                        <p style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}>
                            <Coins size={16} color="#0ea5e9" />
                            Professional Prediction & Calculation Tool
                        </p>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(14, 165, 233, 0.3)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPoolsModal(true)}
                    style={{
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(37, 99, 235, 0.1))',
                        border: '1px solid rgba(14, 165, 233, 0.3)',
                        borderRadius: '16px',
                        color: 'white', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '10px',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                    }}
                >
                    <SlidersHorizontal size={18} color="#0ea5e9" className="animate-pulse" />
                    <span style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '0.5px' }}>Ganti Pasaran</span>
                </motion.button>
            </div>

            {/* POOLS MODAL */}
            <AnimatePresence>
                {showPoolsModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 99999,
                            background: 'rgba(2, 6, 23, 0.85)',
                            backdropFilter: 'blur(24px)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'flex-start', // Force to top
                            padding: '40px 16px' // Breather from very top
                        }}
                        onClick={() => setShowPoolsModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: -50, opacity: 0 }} // Slide down from top
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: -50, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '100%',
                                maxWidth: '850px',
                                maxHeight: '85dvh',
                                background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                                borderRadius: '32px',
                                border: '1px solid rgba(14, 165, 233, 0.3)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.7), 0 0 40px rgba(14, 165, 233, 0.15)',
                                position: 'relative'
                            }}
                        >
                            {/* Deep Background Accents at Top */}
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, height: '120px',
                                background: 'linear-gradient(180deg, rgba(14, 165, 233, 0.1), transparent)',
                                pointerEvents: 'none'
                            }} />

                            <div style={{
                                padding: '24px 32px',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'rgba(15, 23, 42, 0.3)',
                                position: 'relative',
                                zIndex: 1
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '44px', height: '44px',
                                        background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                                        borderRadius: '12px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 8px 16px rgba(14, 165, 233, 0.3)'
                                    }}>
                                        <Globe size={24} color="white" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '20px', fontWeight: '900', color: 'white', margin: 0, letterSpacing: '0.5px' }}>PILIH PASARAN</h3>
                                        <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0', textTransform: 'uppercase', fontWeight: '800' }}>{POOLS.length} LIVE MARKETS</p>
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => { setShowPoolsModal(false); setSearchTerm(''); }}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        width: '36px', height: '36px', borderRadius: '10px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <X size={20} />
                                </motion.button>
                            </div>

                            {/* Sophisticated Search Bar */}
                            <div style={{ padding: '24px 32px 16px', position: 'relative', zIndex: 1 }}>
                                <div style={{ position: 'relative' }}>
                                    <Hash style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#0ea5e9' }} size={18} />
                                    <input
                                        type="text"
                                        placeholder="Cari nama pasaran..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '14px 20px 14px 48px',
                                            background: '#0f172a',
                                            border: '1px solid rgba(14, 165, 233, 0.2)',
                                            borderRadius: '16px',
                                            color: 'white',
                                            fontSize: '15px',
                                            fontWeight: '600',
                                            outline: 'none',
                                            transition: 'all 0.3s',
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
                                            letterSpacing: '0.5px'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#0ea5e9';
                                            e.target.style.boxShadow = '0 0 20px rgba(14, 165, 233, 0.2), inset 0 2px 4px rgba(0,0,0,0.4)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'rgba(14, 165, 233, 0.2)';
                                            e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.4)';
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{
                                overflowY: 'auto',
                                padding: '16px 32px 32px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                                gap: '10px',
                                flex: 1,
                                scrollbarWidth: 'thin',
                                scrollbarColor: 'rgba(14, 165, 233, 0.2) transparent'
                            }}>
                                {filteredPools.length > 0 ? (
                                    filteredPools.map(pool => (
                                        <motion.button
                                            key={pool}
                                            onClick={() => { setSelectedPool(pool); setShowPoolsModal(false); setSearchTerm(''); }}
                                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(14, 165, 233, 0.1)', borderColor: '#0ea5e9' }}
                                            whileTap={{ scale: 0.98 }}
                                            style={{
                                                padding: '16px',
                                                borderRadius: '14px',
                                                border: selectedPool === pool ? '2px solid #0ea5e9' : '1px solid rgba(255,255,255,0.05)',
                                                background: selectedPool === pool ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(30, 41, 59, 0.5))' : 'rgba(255,255,255,0.02)',
                                                color: 'white',
                                                fontWeight: selectedPool === pool ? '900' : '600',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px'
                                            }}
                                        >
                                            <div style={{
                                                width: '8px', height: '8px', borderRadius: '50%',
                                                background: selectedPool === pool ? '#0ea5e9' : 'rgba(255,255,255,0.1)',
                                                boxShadow: selectedPool === pool ? '0 0 8px #0ea5e9' : 'none',
                                                flexShrink: 0
                                            }} />
                                            <span style={{ fontSize: '11px', letterSpacing: '0.2px', flex: 1, textTransform: 'uppercase' }}>{pool}</span>
                                            {selectedPool === pool && (
                                                <Target size={12} color="#0ea5e9" />
                                            )}
                                        </motion.button>
                                    ))
                                ) : (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 20px' }}>
                                        <Globe size={40} color="#94a3b8" style={{ opacity: 0.2, marginBottom: '12px' }} />
                                        <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#94a3b8', margin: 0 }}>Pasaran Tidak Ditemukan</p>
                                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Coba gunakan kata kunci lain</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* TABS */}
            <div style={{
                display: 'flex', gap: '12px', overflowX: 'auto', padding: '4px', marginBottom: '40px',
                background: 'rgba(0,0,0,0.2)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)',
                scrollbarWidth: 'none'
            }}>
                {TABS.map(tab => (
                    <motion.button
                        key={tab} onClick={() => setActiveTab(tab)}
                        whileHover={{ backgroundColor: activeTab === tab ? '#0369a1' : 'rgba(255,255,255,0.05)' }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            flex: 1, minWidth: '100px', padding: '16px 24px',
                            borderRadius: '16px', border: 'none',
                            background: activeTab === tab ? 'linear-gradient(135deg, #0ea5e9, #2563eb)' : 'transparent',
                            color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.5)',
                            fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap',
                            boxShadow: activeTab === tab ? '0 10px 20px -5px rgba(14, 165, 233, 0.4)' : 'none',
                            transition: 'color 0.2s', fontSize: '14px', letterSpacing: '0.5px'
                        }}
                    >
                        {tab}
                    </motion.button>
                ))}
            </div>

            {/* SECTIONS */}
            {sectionsToRender.map(category => (
                <div key={category} style={{ marginBottom: '60px' }}>
                    {/* SECTION TITLE */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', position: 'relative' }}>
                        <div style={{ height: '1px', width: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', position: 'absolute' }} />
                        <div style={{
                            padding: '12px 40px', borderRadius: '30px',
                            border: `2px solid ${gameData[category].color}`,
                            background: '#0f172a', color: 'white',
                            fontWeight: '900', textTransform: 'uppercase', fontSize: '16px', letterSpacing: '2px',
                            boxShadow: `0 0 30px ${gameData[category].color}30`,
                            position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '10px'
                        }}>
                            <Trophy size={18} color={gameData[category].color} />
                            {category}
                        </div>
                    </div>

                    {/* GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                        <AnimatePresence mode="popLayout">
                            {gameData[category].games.map((game, idx) => (
                                <motion.div
                                    key={game.name + category}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="glass-effect"
                                    style={{
                                        position: 'relative', overflow: 'hidden',
                                        background: '#1e293b', borderRadius: '24px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)'
                                    }}
                                >
                                    {/* Top Border Gradient */}
                                    <div style={{ height: '4px', background: `linear-gradient(90deg, ${gameData[category].color}, transparent)`, opacity: 0.8 }} />

                                    <div style={{ padding: '24px' }}>
                                        {/* CARD HEADER */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    padding: '10px', borderRadius: '12px',
                                                    background: `${gameData[category].color}20`,
                                                    color: gameData[category].color
                                                }}>
                                                    {getIconForGame(game.name)}
                                                </div>
                                                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'white', margin: 0 }}>{game.name}</h3>
                                            </div>
                                            <div style={{
                                                fontSize: '11px', fontWeight: 'bold',
                                                background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '20px',
                                                color: 'rgba(255,255,255,0.6)'
                                            }}>
                                                Win x{game.prize}
                                            </div>
                                        </div>

                                        {/* INFO BADGE */}
                                        <div style={{
                                            background: '#0f172a', padding: '12px', borderRadius: '12px', marginBottom: '20px',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.02)'
                                        }}>
                                            <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                                                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>DISKON</span>
                                                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fbbf24' }}>{(game.discount * 100).toFixed(0)}%</span>
                                            </div>
                                            <div style={{ textAlign: 'center', flex: 1 }}>
                                                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>HADIAH</span>
                                                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>x{game.prize}</span>
                                            </div>
                                        </div>

                                        {/* INPUT */}
                                        <div style={{ marginBottom: '20px' }}>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={inputs[game.name] || ''}
                                                onChange={(e) => handleInputChange(game.name, e.target.value)}
                                                style={{
                                                    width: '100%', padding: '16px',
                                                    borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
                                                    background: '#020617', color: 'white',
                                                    fontSize: '20px', fontWeight: 'bold', textAlign: 'center',
                                                    outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                                                }}
                                            />
                                        </div>

                                        {/* BUTTONS */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <motion.button
                                                whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }} whileTap={{ scale: 0.98 }}
                                                onClick={() => calculate(game.name, category)}
                                                style={{
                                                    padding: '14px', borderRadius: '12px', border: 'none',
                                                    background: 'linear-gradient(135deg, #ec4899, #be185d)',
                                                    color: 'white', fontWeight: '800', fontSize: '13px', cursor: 'pointer',
                                                    boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)'
                                                }}
                                            >
                                                HITUNG
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }} whileTap={{ scale: 0.98 }}
                                                onClick={() => reset(game.name)}
                                                style={{
                                                    padding: '14px', borderRadius: '12px',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                                                    border: '1px solid rgba(255,255,255,0.1)'
                                                }}
                                            >
                                                RESET
                                            </motion.button>
                                        </div>

                                        {/* RESULTS CARD */}
                                        <AnimatePresence>
                                            {results[game.name] && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    style={{ overflow: 'hidden' }}
                                                >
                                                    <div style={{
                                                        background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))',
                                                        borderRadius: '16px', padding: '20px',
                                                        border: '1px dashed #10b981', position: 'relative'
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Total Bayar</span>
                                                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>
                                                                {formatRupiah(results[game.name].bayar)}
                                                            </span>
                                                        </div>
                                                        <div style={{ height: '1px', background: 'rgba(16, 185, 129, 0.3)', marginBottom: '12px' }} />
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>POTENSI MENANG</span>
                                                            <span style={{ fontSize: '18px', fontWeight: '900', color: '#10b981', textShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}>
                                                                {formatRupiah(results[game.name].hadiah)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TogelCalculator;

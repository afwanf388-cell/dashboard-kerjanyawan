import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Calculator, Plus, Trash2, DollarSign, Info, AlertCircle } from 'lucide-react';

const KalkulatorBola = () => {
    const [betAmount, setBetAmount] = useState('');
    const [matches, setMatches] = useState([
        { id: 1, odds: '', status: 'win_full' },
        { id: 2, odds: '', status: 'win_full' }
    ]);
    const [results, setResults] = useState({
        totalOdds: 0,
        totalReturn: 0,
        netProfit: 0
    });

    // Helper to calculate odds based on status
    const calculateMatchOdds = (odds, status) => {
        const value = parseFloat(odds);
        if (isNaN(value)) return 1;

        switch (status) {
            case 'win_full': return value;
            case 'win_half': return ((value - 1) / 2) + 1;
            case 'lose_half': return 0.5;
            case 'draw': return 1;
            default: return 1;
        }
    };

    // Calculate everything dynamically
    useEffect(() => {
        let currentTotalOdds = 1;
        let validMatches = 0;

        matches.forEach(match => {
            if (match.odds && parseFloat(match.odds) > 0) {
                const calculatedOdds = calculateMatchOdds(match.odds, match.status);
                currentTotalOdds *= calculatedOdds;
                validMatches++;
            }
        });

        // If no valid matches or total odds is 1 (and no matches processed), reset
        if (validMatches === 0) currentTotalOdds = 0;

        const bet = parseFloat(betAmount) || 0;
        const totalReturn = currentTotalOdds * bet;
        // Profit logic: Total Return - Initial Bet.
        // If Total Odds is 0 (invalid), profit is 0.
        // Note: If you lose full (not handled in status? usually it kills the parlay).
        // The prompt says: "Kalah Setengah -> 0.5". It implies "Kalah Full" kills the parlay but usually that means Odds=0.
        // The prompt didn't strictly ask for "Kalah Full" button, but "Pilihan hasil (radio button): Menang Full, Menang Setengah, Kalah Setengah, Seri".
        // It seems this calculator assumes the parlay is still ALIVE (no full loss). Or maybe valid for mix parlay calculation where you verify winning ticket.
        // If a team loses full, the whole parlay is lost (x0). I should probably add "Kalah Full" or just follow instructions strictly. 
        // Instructions: "Menang Full, Menang Setengah, Kalah Setengah, Seri". No 'Kalah Full'. 
        // I will stick strictly to instructions.

        const netProfit = totalReturn - bet;

        setResults({
            totalOdds: validMatches > 0 ? currentTotalOdds : 0,
            totalReturn,
            netProfit
        });
    }, [matches, betAmount]);

    const addMatch = () => {
        const newId = matches.length > 0 ? Math.max(...matches.map(m => m.id)) + 1 : 1;
        setMatches([...matches, { id: newId, odds: '', status: 'win_full' }]);
    };

    const removeMatch = (id) => {
        setMatches(matches.filter(m => m.id !== id));
    };

    const updateMatch = (id, field, value) => {
        setMatches(matches.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const formatRupiah = (num) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
    };

    const formatOdds = (num) => {
        return num % 1 === 0 ? num.toFixed(0) : num.toFixed(3).replace(/\.?0+$/, ''); // Clean formatted odds
    };

    return (
        <div style={{ paddingBottom: '100px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div className="glass-effect" style={{
                padding: '24px', borderRadius: '24px', marginBottom: '30px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(0,0,0,0.4))',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                display: 'flex', alignItems: 'center', gap: '20px'
            }}>
                <div style={{
                    minWidth: '60px', width: '60px', height: '60px', borderRadius: '16px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)'
                }}>
                    <Trophy size={32} color="white" />
                </div>
                <div>
                    <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: '900', color: 'white', letterSpacing: '-1px', marginBottom: '4px' }}>
                        Kalkulator Bola & Parlay
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calculator size={14} color="#10b981" />
                        Professional Mix Parlay Calculator
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                {/* Left Column: Input Bet & Matches */}
                <div style={{ order: 2, '@media (min-width: 1024px)': { order: 1 } }}> {/* Attempting logic for order but CSS in JS needs media query handling carefully or just layout structure */}

                    {/* Bet Amount Card */}
                    <div className="glass-effect" style={{
                        padding: '24px', borderRadius: '24px', marginBottom: '24px',
                        background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '10px', display: 'block', fontWeight: 'bold' }}>
                            Nilai Taruhan (Bet Amount)
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }}>
                                <DollarSign size={20} />
                            </div>
                            <input
                                type="number"
                                placeholder="Contoh: 100000"
                                value={betAmount}
                                onChange={(e) => setBetAmount(e.target.value)}
                                style={{
                                    width: '100%', padding: '16px 16px 16px 48px',
                                    borderRadius: '12px', border: 'none',
                                    background: '#0f172a', color: 'white',
                                    fontWeight: 'bold', fontSize: '18px',
                                    outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                                }}
                            />
                        </div>
                    </div>

                    {/* Matches List */}
                    <AnimatePresence>
                        {matches.map((match, index) => (
                            <motion.div
                                key={match.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="glass-effect"
                                style={{
                                    padding: '24px', borderRadius: '24px', marginBottom: '16px',
                                    background: '#1e293b',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    position: 'relative'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '8px',
                                            background: '#334155', color: 'rgba(255,255,255,0.8)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 'bold', fontSize: '14px'
                                        }}>
                                            {String(index + 1).padStart(2, '0')}
                                        </div>
                                        <span style={{ fontWeight: 'bold', color: 'white' }}>Partai #{index + 1}</span>
                                    </div>
                                    {matches.length > 1 && (
                                        <button
                                            onClick={() => removeMatch(match.id)}
                                            style={{
                                                background: 'transparent', border: 'none', color: '#ef4444',
                                                cursor: 'pointer', padding: '4px'
                                            }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', display: 'block' }}>ODDS</label>
                                    <input
                                        type="number"
                                        placeholder="Input Odds (e.g. 1.85)"
                                        value={match.odds}
                                        onChange={(e) => updateMatch(match.id, 'odds', e.target.value)}
                                        style={{
                                            width: '100%', padding: '12px',
                                            borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                                            background: '#0f172a', color: '#f59e0b',
                                            fontWeight: 'bold', fontSize: '16px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', display: 'block' }}>HASIL PARTAI</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {[
                                            { id: 'win_full', label: 'Menang Full', color: '#10b981' },
                                            { id: 'win_half', label: 'Menang 1/2', color: '#3b82f6' },
                                            { id: 'lose_half', label: 'Kalah 1/2', color: '#f59e0b' }, // Orange for partial loss warning
                                            { id: 'draw', label: 'Seri / Draw', color: '#64748b' }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => updateMatch(match.id, 'status', opt.id)}
                                                style={{
                                                    padding: '10px',
                                                    borderRadius: '8px',
                                                    border: match.status === opt.id ? `2px solid ${opt.color}` : '1px solid rgba(255,255,255,0.1)',
                                                    background: match.status === opt.id ? `${opt.color}20` : 'transparent',
                                                    color: match.status === opt.id ? opt.color : 'rgba(255,255,255,0.6)',
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    <button
                        onClick={addMatch}
                        style={{
                            width: '100%', padding: '16px',
                            borderRadius: '16px', border: '2px dashed rgba(255,255,255,0.2)',
                            background: 'transparent',
                            color: 'white', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Plus size={20} />
                        Tambah Partai
                    </button>
                </div>

                {/* Right Column: Sticky Stats */}
                <div style={{ position: 'relative' }}>
                    <div style={{ position: 'sticky', top: '20px' }}>
                        <div className="glass-effect" style={{
                            padding: '30px', borderRadius: '32px',
                            background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)', // Very dark for contrast
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 20px 50px -10px rgba(0,0,0,0.5)'
                        }}>
                            <h2 style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '2px' }}>
                                Hasil Prediksi
                            </h2>

                            {/* Total Odds */}
                            <div style={{ marginBottom: '30px' }}>
                                <span style={{ fontSize: '14px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Total Odds</span>
                                <div style={{
                                    fontSize: '48px', fontWeight: '900', color: '#f59e0b',
                                    textShadow: '0 0 30px rgba(245, 158, 11, 0.3)',
                                    lineHeight: '1'
                                }}>
                                    {formatOdds(results.totalOdds)}
                                </div>
                                <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '8px', opacity: 0.8 }}>
                                    *Perkalian semua odds valid
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '30px' }} />

                            {/* Profit Stats */}
                            <div style={{ display: 'grid', gap: '20px' }}>
                                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                                    <span style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Total Return (Bayaran)</span>
                                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>
                                        {formatRupiah(results.totalReturn)}
                                    </span>
                                </div>

                                <motion.div
                                    animate={{ scale: results.netProfit !== 0 ? [1, 1.02, 1] : 1 }}
                                    style={{
                                        padding: '20px',
                                        background: results.netProfit >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: '20px',
                                        border: `1px solid ${results.netProfit >= 0 ? '#10b981' : '#ef4444'}`
                                    }}
                                >
                                    <span style={{ fontSize: '14px', color: results.netProfit >= 0 ? '#10b981' : '#ef4444', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                                        Profit Bersih {results.netProfit >= 0 ? '(Untung)' : '(Rugi)'}
                                    </span>
                                    <span style={{
                                        fontSize: '28px',
                                        fontWeight: '900',
                                        color: results.netProfit >= 0 ? '#10b981' : '#ef4444'
                                    }}>
                                        {results.netProfit >= 0 ? '+' : ''}{formatRupiah(results.netProfit)}
                                    </span>
                                </motion.div>
                            </div>
                        </div>

                        {/* Floating Tooltip/Info */}
                        <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px', border: '1px dashed rgba(59, 130, 246, 0.3)', display: 'flex', gap: '12px' }}>
                            <Info size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
                            <p style={{ fontSize: '12px', color: '#93c5fd', lineHeight: '1.5' }}>
                                <strong>Info Rumus:</strong><br />
                                • Menang 1/2: Odds jadi ((Odds - 1) : 2) + 1<br />
                                • Kalah 1/2: Odds jadi 0.5<br />
                                • Seri: Odds jadi 1
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KalkulatorBola;

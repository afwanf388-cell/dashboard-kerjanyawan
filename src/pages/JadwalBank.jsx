import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, RefreshCw, CheckCircle2, XCircle, AlertCircle,
    Landmark, Search, Wallet, Smartphone, ShieldCheck,
    ChevronRight, ArrowUpRight, TrendingUp, TrendingDown,
    Activity, Globe, Zap, Trophy, Grid, Coins
} from 'lucide-react';

import bcaLogo from '../assets/bank-logos/bca.png';
import mandiriLogo from '../assets/bank-logos/mandiri.png';
import bniLogo from '../assets/bank-logos/bni.png';
import briLogo from '../assets/bank-logos/bri.png';
import bsiLogo from '../assets/bank-logos/bsi.png';
import maybankLogo from '../assets/bank-logos/maybank.png';
import cimbLogo from '../assets/bank-logos/cimb.png';
import danamonLogo from '../assets/bank-logos/danamon.png';
import seabankLogo from '../assets/bank-logos/seabank.png';
import jagoLogo from '../assets/bank-logos/jago.png';
import danaLogo from '../assets/bank-logos/dana.png';
import ovoLogo from '../assets/bank-logos/ovo.png';
import gopayLogo from '../assets/bank-logos/gopay.png';
import LinkajaLogo from '../assets/bank-logos/linkaja.png';
import qrisLogo from '../assets/bank-logos/qris.png';
import usdtLogo from '../assets/bank-logos/usdt.png';

const BANK_DATA = [
    { id: 'qris', name: 'QRIS', type: 'Payment Gateway', schedule: '24 Jam', offline: null, color: '234, 179, 8', logo: 'QRIS', status: 'ONLINE', isPopular: true, logoImage: qrisLogo },
    { id: 'usdt', name: 'USDT (TRC20)', type: 'Cryptocurrency', schedule: '24 Jam', offline: null, color: '34, 197, 94', logo: 'USDT', status: 'ONLINE', logoImage: usdtLogo },
    { id: 'bca', name: 'Bank BCA', type: 'bank', schedule: '00:20 - 22:00', offline: '22:00 - 00:20', color: '59, 130, 246', logo: 'BCA', status: 'OFFLINE', logoImage: bcaLogo },
    { id: 'mandiri', name: 'Bank Mandiri', type: 'bank', schedule: '03:00 - 23:00', offline: '23:00 - 03:00', color: '245, 158, 11', logo: 'MANDIRI', status: 'OFFLINE', logoImage: mandiriLogo },
    { id: 'bri', name: 'Bank BRI', type: 'bank', schedule: '24 Jam', offline: null, color: '16, 185, 129', logo: 'BRI', status: 'TROUBLE', logoImage: briLogo },
    { id: 'bni', name: 'Bank BNI', type: 'bank', schedule: '24 Jam', offline: null, color: '249, 115, 22', logo: 'BNI', status: 'TROUBLE', logoImage: bniLogo },
    { id: 'bsi', name: 'Bank BSI', type: 'bank', schedule: '01:00 - 22:00', offline: '22:00 - 01:00', color: '20, 184, 166', logo: 'BSI', status: 'OFFLINE', logoImage: bsiLogo },
    { id: 'cimb', name: 'Bank CIMB', type: 'bank', schedule: '24 Jam', offline: null, color: '239, 68, 68', logo: 'CIMB', status: 'ONLINE', logoImage: cimbLogo },
    { id: 'danamon', name: 'Bank Danamon', type: 'bank', schedule: '24 Jam', offline: null, color: '245, 158, 11', logo: 'DANAMON', status: 'ONLINE', logoImage: danamonLogo },
    { id: 'seabank', name: 'SeaBank', type: 'bank', schedule: '24 Jam', offline: null, color: '249, 115, 22', logo: 'SEABANK', status: 'ONLINE', logoImage: seabankLogo },
    { id: 'maybank', name: 'Maybank', type: 'bank', schedule: '24 Jam', offline: null, color: '245, 158, 11', logo: 'MAYBANK', status: 'ONLINE', logoImage: maybankLogo },
    { id: 'jago', name: 'Bank Jago', type: 'bank', schedule: '24 Jam', offline: null, color: '236, 72, 153', logo: 'JAGO', status: 'ONLINE', logoImage: jagoLogo },
    { id: 'dana', name: 'DANA', type: 'wallet', schedule: '24 Jam', offline: null, color: '59, 130, 246', logo: 'DANA', status: 'ONLINE', logoImage: danaLogo },
    { id: 'ovo', name: 'OVO', type: 'wallet', schedule: '24 Jam', offline: null, color: '139, 92, 246', logo: 'OVO', status: 'ONLINE', logoImage: ovoLogo },
    { id: 'gopay', name: 'GoPay', type: 'wallet', schedule: '24 Jam', offline: null, color: '16, 185, 129', logo: 'GOPAY', status: 'ONLINE', logoImage: gopayLogo },
    { id: 'linkaja', name: 'LinkAja', type: 'wallet', schedule: '24 Jam', offline: null, color: '239, 68, 68', logo: 'LINKAJA', status: 'ONLINE', logoImage: LinkajaLogo },
];

const GlassCard = ({ children, style, className }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            position: 'relative',
            overflow: 'hidden',
            ...style
        }}
        className={className}
    >
        {children}
    </motion.div>
);

const JadwalBank = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('ALL');
    const [banks, setBanks] = useState(BANK_DATA);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(localStorage.getItem('last_bank_sync_time') || '');

    const fetchLiveSchedules = async (force = false) => {
        const now = Date.now();
        const oneHour = 3600000;
        if (!force && lastSync && (now - Number(lastSync) < oneHour)) {
            const cachedData = localStorage.getItem('cached_bank_data');
            if (cachedData) {
                setBanks(JSON.parse(cachedData));
                return;
            }
        }
        setIsSyncing(true);
        try {
            const proxyUrl = 'https://api.allorigins.win/get?url=';
            const targetUrl = encodeURIComponent('https://la80912.com/blog/?categories=JADWAL%20BANK');
            const response = await fetch(`${proxyUrl}${targetUrl}`);
            const json = await response.json();
            if (json.contents) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(json.contents, 'text/html');
                const cards = Array.from(doc.querySelectorAll('.bank-card'));
                if (cards.length > 0) {
                    const liveData = cards.map(card => {
                        const name = card.querySelector('.bank-info h3')?.innerText.trim() || '';
                        const timeRaw = card.querySelector('.operational-hours')?.innerText.trim() || '';
                        const time = timeRaw.replace(' WIB', '').replace('-', ' - ');
                        const baseBank = BANK_DATA.find(b => name.toLowerCase().includes(b.id) || b.name.toLowerCase().includes(name.toLowerCase()));
                        return {
                            id: baseBank?.id || name.toLowerCase().replace(/\s+/g, '-'),
                            name: name,
                            type: card.querySelector('.bank-type')?.innerText.trim() || (name.includes('Bank') ? 'bank' : 'wallet'),
                            schedule: time === '24 Jam' ? '24 Jam' : time,
                            offline: time.includes(' - ') ? time.split(' - ')[1] + ' - ' + time.split(' - ')[0] : null,
                            color: baseBank?.color || '100, 116, 139',
                            logo: baseBank?.logo || name.toUpperCase()
                        };
                    });
                    setBanks(liveData);
                    localStorage.setItem('cached_bank_data', JSON.stringify(liveData));
                    localStorage.setItem('last_bank_sync_time', now.toString());
                    setLastSync(now.toString());
                }
            }
        } catch (error) {
            console.error("Silent Sync Failed:", error);
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        fetchLiveSchedules();
        return () => clearInterval(timer);
    }, []);

    const getBankStatus = (bank) => {
        // First check if it's explicitly marked as trouble (this would come from sync)
        if (bank.status === 'TROUBLE') return 'TROUBLE';

        if (bank.schedule === '24 Jam') return 'ONLINE';
        const now = new Date();
        const hour = now.getHours();
        const min = now.getMinutes();
        const currentTotalMin = hour * 60 + min;
        try {
            const [startStr, endStr] = bank.schedule.split(' - ');
            const [startH, startM] = startStr.split(':').map(Number);
            const [endH, endM] = endStr.split(':').map(Number);
            const startTotalMin = startH * 60 + startM;
            const endTotalMin = endH * 60 + endM;
            if (startTotalMin < endTotalMin) {
                return (currentTotalMin >= startTotalMin && currentTotalMin < endTotalMin) ? 'ONLINE' : 'OFFLINE';
            } else {
                return (currentTotalMin >= startTotalMin || currentTotalMin < endTotalMin) ? 'ONLINE' : 'OFFLINE';
            }
        } catch (e) { return 'ONLINE'; }
    };

    const filteredBanks = banks.filter(bank => {
        const matchesSearch = bank.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === 'ALL' ||
            (activeTab === 'BANK' && (bank.type.toLowerCase().includes('bank') || bank.type.toLowerCase().includes('payment') || bank.type.toLowerCase().includes('crypto'))) ||
            (activeTab === 'WALLET' && bank.type.toLowerCase().includes('wallet'));
        return matchesSearch && matchesTab;
    });

    const onlineCount = banks.filter(b => getBankStatus(b) === 'ONLINE').length;
    const troubleCount = banks.filter(b => getBankStatus(b) === 'TROUBLE').length;
    const offlineCount = banks.filter(b => getBankStatus(b) === 'OFFLINE').length;

    return (
        <div style={{ color: 'white', padding: '20px 0' }}>
            <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>
                        Jadwal <span style={{ background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Bank & E-Wallet</span>
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '8px', fontSize: '15px', fontWeight: '500' }}>Pantau status operasional secara real-time</p>
                </div>

                <GlassCard style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '20px', borderRadius: '16px' }}>
                    <div style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => fetchLiveSchedules(true)}>
                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                            {isSyncing ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                            {isSyncing ? 'SYNCING...' : 'WAKTU SISTEM'}
                        </p>
                        <p style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#60a5fa' }}>
                            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)' }} />
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#10b981' }}>{onlineCount} ONLINE</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 10px rgba(251, 191, 36, 0.6)' }} />
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#fbbf24' }}>{troubleCount} GANGGUAN</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)' }} />
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#ef4444' }}>{offlineCount} OFFLINE</span>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* MARQUEE TICKER */}
            <div style={{
                marginBottom: '32px',
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
            }}>
                <div style={{
                    flexShrink: 0,
                    background: 'linear-gradient(135deg, #ef4444, #991b1b)',
                    padding: '6px 14px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '900',
                    color: 'white',
                    letterSpacing: '1px',
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
                    zIndex: 2,
                    animation: 'pulseGlow 2s infinite ease-in-out'
                }}>
                    PENTING
                </div>
                <div style={{ flex: 1, overflow: 'hidden', zIndex: 1 }}>
                    <div style={{ whiteSpace: 'nowrap', display: 'flex', gap: '30px' }}>
                        <span style={{
                            fontSize: '14px',
                            color: '#e2e8f0',
                            fontWeight: '600',
                            display: 'inline-block',
                            animation: 'tickerSwiper 30s linear infinite'
                        }}>
                            Jadwal bank di atas adalah jadwal rutin offline bank pusat. Jadwal dapat berubah sewaktu-waktu tergantung pada kebijakan masing-masing bank tanpa pemberitahuan terlebih dahulu. &nbsp; • &nbsp;
                            Jadwal bank di atas adalah jadwal rutin offline bank pusat. Jadwal dapat berubah sewaktu-waktu tergantung pada kebijakan masing-masing bank tanpa pemberitahuan terlebih dahulu.
                        </span>
                    </div>
                </div>
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '40px', background: 'linear-gradient(to right, transparent, #020617)', zIndex: 2 }} />
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                        type="text"
                        placeholder="Cari nama bank atau e-wallet..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '16px 16px 16px 48px',
                            background: 'rgba(15, 23, 42, 0.4)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '16px',
                            color: 'white',
                            fontSize: '15px',
                            outline: 'none',
                            transition: 'all 0.3s'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', padding: '4px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {['ALL', 'BANK', 'WALLET'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '10px',
                                border: 'none',
                                background: activeTab === tab ? 'white' : 'transparent',
                                color: activeTab === tab ? '#0f172a' : '#64748b',
                                fontWeight: '800',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '24px'
            }}>
                <AnimatePresence>
                    {filteredBanks.map((bank, index) => {
                        const status = getBankStatus(bank);
                        const statusColor = status === 'ONLINE' ? '#10b981' : (status === 'TROUBLE' ? '#fbbf24' : '#ef4444');
                        const statusBg = status === 'ONLINE' ? 'rgba(16, 185, 129, 0.1)' : (status === 'TROUBLE' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(239, 68, 68, 0.1)');
                        const statusBorder = status === 'ONLINE' ? 'rgba(16, 185, 129, 0.2)' : (status === 'TROUBLE' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)');

                        return (
                            <motion.div
                                key={bank.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <GlassCard style={{
                                    padding: '0',
                                    overflow: 'hidden',
                                    border: `1px solid ${statusBorder}`,
                                }}>
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, width: '100%', height: '4px',
                                        background: statusColor,
                                        boxShadow: `0 0 15px ${statusColor}80`
                                    }} />

                                    <div style={{ padding: '24px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                                <div style={{
                                                    width: '70px', height: '70px',
                                                    borderRadius: '22px',
                                                    background: `linear-gradient(135deg, rgba(${bank.color}, 0.15), rgba(${bank.color}, 0.05))`,
                                                    backdropFilter: 'blur(12px)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    border: `1px solid rgba(${bank.color}, 0.3)`,
                                                    boxShadow: `0 8px 25px -5px rgba(${bank.color}, 0.25), inset 0 0 15px rgba(${bank.color}, 0.05)`,
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}>
                                                    {bank.logoImage ? (
                                                        <img src={bank.logoImage} alt={bank.name}
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: bank.id === 'linkaja' ? 'cover' : 'contain',
                                                                padding: bank.id === 'linkaja' ? '0' : '8px',
                                                                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
                                                            }}
                                                        />
                                                    ) : bank.logo === 'QRIS' ? <span style={{ fontSize: '22px', fontWeight: '900', color: `rgb(${bank.color})`, letterSpacing: '-1px' }}>QRIS</span> :
                                                        bank.logo === 'USDT' ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Coins size={30} color={`rgb(${bank.color})`} /><span style={{ fontSize: '10px', fontWeight: '900', color: `rgb(${bank.color})`, marginTop: '2px' }}>TRC20</span></div> :
                                                            (bank.type.toLowerCase().includes('bank') ? <Landmark size={32} color={`rgb(${bank.color})`} /> : <Smartphone size={32} color={`rgb(${bank.color})`} />)}
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>{bank.name}</h3>
                                                        {bank.isPopular && (
                                                            <div style={{
                                                                background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                                                                padding: '2px 8px',
                                                                borderRadius: '6px',
                                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                                boxShadow: '0 2px 10px rgba(245, 158, 11, 0.4)'
                                                            }}>
                                                                <Trophy size={10} color="white" />
                                                                <span style={{ fontSize: '9px', fontWeight: '900', color: 'white', letterSpacing: '0.5px' }}>POPULER</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginTop: '2px' }}>{bank.type}</p>
                                                </div>
                                            </div>
                                            <div style={{
                                                padding: '6px 14px',
                                                borderRadius: '20px',
                                                background: statusBg,
                                                border: `1px solid ${statusBorder}`,
                                                display: 'flex', alignItems: 'center', gap: '8px'
                                            }}>
                                                <motion.div
                                                    animate={status === 'TROUBLE' ? { opacity: [0.5, 1, 0.5] } : {}}
                                                    transition={{ repeat: Infinity, duration: 1 }}
                                                    style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor, boxShadow: `0 0 10px ${statusColor}` }}
                                                />
                                                <span style={{ fontSize: '11px', fontWeight: '950', color: statusColor, letterSpacing: '0.5px' }}>{status}</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <Clock size={16} color="#64748b" />
                                                    <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>Jam Operasional</span>
                                                </div>
                                                <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{bank.schedule}</span>
                                            </div>
                                            {bank.offline && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.03)', borderRadius: '12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <AlertCircle size={16} color="#ef4444" />
                                                        <span style={{ fontSize: '13px', color: '#f87171', fontWeight: '600' }}>Offline Maintenance</span>
                                                    </div>
                                                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#ef4444' }}>{bank.offline}</span>
                                                </div>
                                            )}
                                            {!bank.offline && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.03)', borderRadius: '12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <ShieldCheck size={16} color="#10b981" />
                                                        <span style={{ fontSize: '13px', color: '#34d399', fontWeight: '600' }}>24 Jam Non-stop</span>
                                                    </div>
                                                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#10b981' }}>TERSEDIA</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{
                                        height: '40px',
                                        background: `linear-gradient(to right, transparent, rgba(${bank.color}, 0.05), transparent)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <div style={{ height: '1px', width: '80%', background: `rgba(${bank.color}, 0.1)` }} />
                                    </div>
                                </GlassCard>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            <style>{`
                @keyframes tickerSwiper {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulseGlow {
                    0% { opacity: 0.8; transform: scale(1); box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); }
                    50% { opacity: 1; transform: scale(1.05); box-shadow: 0 0 25px rgba(239, 68, 68, 0.7); }
                    100% { opacity: 0.8; transform: scale(1); box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); }
                }
            `}</style>
        </div>
    );
};

export default JadwalBank;

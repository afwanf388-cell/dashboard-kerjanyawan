import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Trash2, Search, Calendar, Clock, Globe,
    ExternalLink, X, TrendingUp, Filter, Info,
    Timer, LayoutGrid, Cloud, CloudOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const DEFAULT_SCHEDULES = [
    { "id": 1001, "marketName": "HOKIDRAW", "closeTime": "RESULT 24X", "openTime": "1 JAM SEKALI", "days": "Senin s/d Minggu", "link": "https://hokidraw.com/" },
    { "id": 1002, "marketName": "TOTO MACAU PAGI", "closeTime": "00:00 WIB", "openTime": "00:15 WIB", "days": "Senin s/d Minggu", "link": "https://totomacaunew.us/" },
    { "id": 1003, "marketName": "KENTUCKY MIDDAY", "closeTime": "01:05 WIB", "openTime": "01:20 WIB", "days": "Senin s/d Minggu", "link": "https://www.kylottery.com/apps/" },
    { "id": 1004, "marketName": "FLORIDA MIDDAY", "closeTime": "01:20 WIB", "openTime": "01:30 WIB", "days": "Senin s/d Minggu", "link": "https://floridalottery.com/" },
    { "id": 1005, "marketName": "HUAHIN 0100", "closeTime": "00:45 WIB", "openTime": "01:00 WIB", "days": "Senin s/d Minggu", "link": "https://huahinlottery.com/" },
    { "id": 1006, "marketName": "BANGKOK 0130", "closeTime": "01:15 WIB", "openTime": "01:30 WIB", "days": "Senin s/d Minggu", "link": "https://bangkokpoolstoday.com/" },
    { "id": 1007, "marketName": "NEWYORK MIDDAY", "closeTime": "02:15 WIB", "openTime": "02:25 WIB", "days": "Senin s/d Minggu", "link": "https://nylottery.ny.gov/" },
    { "id": 1008, "marketName": "CAROLINA DAY", "closeTime": "02:45 WIB", "openTime": "03:00 WIB", "days": "Senin s/d Minggu", "link": "https://www.wral.com/entertainment/lottery/" },
    { "id": 1009, "marketName": "BRUNEI 02", "closeTime": "02:30 WIB", "openTime": "02:45 WIB", "days": "Senin s/d Minggu", "link": "https://bruneipools.com/" },
    { "id": 1010, "marketName": "OREGON 03", "closeTime": "03:50 WIB", "openTime": "04:00 WIB", "days": "Senin s/d Minggu", "link": "https://www.oregonlottery.org/pick-4/winning-numbers/" },
    { "id": 1011, "marketName": "OREGON 06", "closeTime": "06:50 WIB", "openTime": "07:00 WIB", "days": "Senin s/d Minggu", "link": "https://www.oregonlottery.org/pick-4/winning-numbers/" },
    { "id": 1012, "marketName": "CALIFORNIA", "closeTime": "09:25 WIB", "openTime": "09:30 WIB", "days": "Senin s/d Minggu", "link": "https://www.calottery.com/draw-games/daily-4" },
    { "id": 1013, "marketName": "FLORIDA EVENING", "closeTime": "09:35 WIB", "openTime": "09:45 WIB", "days": "Senin s/d Minggu", "link": "https://floridalottery.com/games/draw-games/pick-4" },
    { "id": 1014, "marketName": "OREGON 09", "closeTime": "09:50 WIB", "openTime": "10:00 WIB", "days": "Senin s/d Minggu", "link": "https://www.oregonlottery.org/pick-4/winning-numbers/" },
    { "id": 1015, "marketName": "BANGKOK 0930", "closeTime": "09:15 WIB", "openTime": "09:30 WIB", "days": "Senin s/d Minggu", "link": "https://bangkokpoolstoday.com/" },
    { "id": 1016, "marketName": "NEWYORK EVENING", "closeTime": "10:25 WIB", "openTime": "10:35 WIB", "days": "Senin s/d Minggu", "link": "https://nylottery.ny.gov/" },
    { "id": 1017, "marketName": "TOTOCAMBODIA", "closeTime": "10:45 WIB", "openTime": "11:00 WIB", "days": "Senin s/d Minggu", "link": "https://totocambodialive.com/" },
    { "id": 1018, "marketName": "KENTUCKY EVENING", "closeTime": "10:45 WIB", "openTime": "11:00 WIB", "days": "Senin s/d Minggu", "link": "https://www.kylottery.com/apps/" },
    { "id": 1019, "marketName": "CAROLINA EVENING", "closeTime": "11:17 WIB", "openTime": "11:22 WIB", "days": "Senin s/d Minggu", "link": "https://www.wral.com/entertainment/lottery/" },
    { "id": 1020, "marketName": "CHELSEA 11", "closeTime": "11:00 WIB", "openTime": "11:15 WIB", "days": "Senin s/d Minggu", "link": "https://chelseapools.co.uk/" },
    { "id": 1021, "marketName": "OREGON 12", "closeTime": "12:50 WIB", "openTime": "13:00 WIB", "days": "Senin s/d Minggu", "link": "https://www.oregonlottery.org/pick-4/winning-numbers/" },
    { "id": 1022, "marketName": "POIPET12", "closeTime": "12:15 WIB", "openTime": "12:30 WIB", "days": "Senin s/d Minggu", "link": "https://poipetlottery.com/" },
    { "id": 1023, "marketName": "BULLSEYE", "closeTime": "12:00 WIB", "openTime": "12:15 WIB", "days": "Senin s/d Minggu", "link": "https://mylotto.co.nz/results/bullseye" },
    { "id": 1024, "marketName": "TOTOMACAU SIANG", "closeTime": "13:00 WIB", "openTime": "13:15 WIB", "days": "Senin s/d Minggu", "link": "https://totomacaunew.us/" },
    { "id": 1025, "marketName": "SYDNEY", "closeTime": "13:49 WIB", "openTime": "14:05 WIB", "days": "Senin s/d Minggu", "link": "https://sydneyfunlotto.net/" },
    { "id": 1026, "marketName": "BRUNEI 14", "closeTime": "14:30 WIB", "openTime": "14:45 WIB", "days": "Senin s/d Minggu", "link": "https://bruneipools.com/" },
    { "id": 1027, "marketName": "CHELSEA 15", "closeTime": "15:00 WIB", "openTime": "15:15 WIB", "days": "Senin s/d Minggu", "link": "https://chelseapools.co.uk/" },
    { "id": 1028, "marketName": "TOTOMALI 1530", "closeTime": "15:15 WIB", "openTime": "15:30 WIB", "days": "Senin s/d Minggu", "link": "https://totomali.com/" },
    { "id": 1029, "marketName": "POIPET15", "closeTime": "15:15 WIB", "openTime": "15:30 WIB", "days": "Senin s/d Minggu", "link": "https://poipetlottery.com/" },
    { "id": 1030, "marketName": "TOTOMACAU SORE", "closeTime": "16:00 WIB", "openTime": "16:15 WIB", "days": "Senin s/d Minggu", "link": "https://totomacaunew.us/" },
    { "id": 1031, "marketName": "HUAHIN 1630", "closeTime": "16:15 WIB", "openTime": "16:30 WIB", "days": "Senin s/d Minggu", "link": "https://huahinlottery.com/" },
    { "id": 1032, "marketName": "KING KONG4D I", "closeTime": "17:00 WIB", "openTime": "17:15 WIB", "days": "Senin s/d Minggu", "link": "https://kingkongpools.id/" },
    { "id": 1033, "marketName": "SINGAPORE", "closeTime": "17:30 WIB", "openTime": "17:45 WIB", "days": "SELASA \u0026 JUM'AT ( LIBUR )", "link": "https://www.singaporepools.com.sg/" },
    { "id": 1034, "marketName": "MAGNUM4D", "closeTime": "18:10 WIB", "openTime": "18:40 WIB", "days": "RABU, SABTU \u0026 MINGGU", "link": "https://www.magnum4d.my/en" },
    { "id": 1035, "marketName": "TOTOMACAU MALAM I", "closeTime": "19:00 WIB", "openTime": "19:15 WIB", "days": "Senin s/d Minggu", "link": "https://totomacaunew.us/" },
    { "id": 1036, "marketName": "CHELSEA 19", "closeTime": "19:00 WIB", "openTime": "19:15 WIB", "days": "Senin s/d Minggu", "link": "https://chelseapools.co.uk/" },
    { "id": 1037, "marketName": "POIPET19", "closeTime": "19:30 WIB", "openTime": "19:45 WIB", "days": "Senin s/d Minggu", "link": "https://poipetlottery.com/" },
    { "id": 1038, "marketName": "PCSO", "closeTime": "19:50 WIB", "openTime": "20:10 WIB", "days": "Minggu Libur", "link": "https://www.pcso.gov.ph/" },
    { "id": 1039, "marketName": "TOTOMALI 2030", "closeTime": "20:15 WIB", "openTime": "20:30 WIB", "days": "Selasa s/d Minggu", "link": "https://totomali.com/" },
    { "id": 1040, "marketName": "HUAHIN 2100", "closeTime": "20:45 WIB", "openTime": "21:00 WIB", "days": "Selasa s/d Minggu", "link": "https://huahinlottery.com/" },
    { "id": 1041, "marketName": "CHELSEA 21", "closeTime": "21:00 WIB", "openTime": "21:15 WIB", "days": "Senin s/d Minggu", "link": "https://chelseapools.co.uk/" },
    { "id": 1042, "marketName": "NEVADA", "closeTime": "21:15 WIB", "openTime": "21:30 WIB", "days": "Senin s/d Minggu", "link": "https://www.nevadalottery.us/" },
    { "id": 1043, "marketName": "BRUNEI 21", "closeTime": "21:30 WIB", "openTime": "21:45 WIB", "days": "Senin s/d Minggu", "link": "https://bruneipools.com/" },
    { "id": 1044, "marketName": "TOTOMACAU MALAM II", "closeTime": "22:00 WIB", "openTime": "22:15 WIB", "days": "Senin s/d Minggu", "link": "https://totomacaunew.us/" },
    { "id": 1045, "marketName": "POIPET22", "closeTime": "22:30 WIB", "openTime": "22:45 WIB", "days": "Senin s/d Minggu", "link": "https://poipetlottery.com/" },
    { "id": 1046, "marketName": "HONGKONG", "closeTime": "22:59 WIB", "openTime": "23:15 WIB", "days": "Senin s/d Minggu", "link": "https://hongkongfunlotto.net/" },
    { "id": 1047, "marketName": "TOTOMACAU MALAM III", "closeTime": "23:00 WIB", "openTime": "23:15 WIB", "days": "Senin s/d Minggu", "link": "https://totomacaunew.us/" },
    { "id": 1048, "marketName": "TOTOMALI 2330", "closeTime": "23:15 WIB", "openTime": "23:30 WIB", "days": "Senin s/d Minggu", "link": "https://totomali.com/" },
    { "id": 1049, "marketName": "KING KONG4D II", "closeTime": "23:30 WIB", "openTime": "23:45 WIB", "days": "Senin s/d Minggu", "link": "https://kingkongpools.id/" }
];

const JadwalResult = () => {
    const { user } = useAuth();

    // Hybrid State Initialization with MASTER DATA fallback per User
    const [schedules, setSchedules] = useState([]);
    const [isInitialLoaded, setIsInitialLoaded] = useState(false);

    useEffect(() => {
        if (user?.username) {
            const saved = localStorage.getItem(`app_schedules_${user.username}`);
            let initialData = DEFAULT_SCHEDULES;
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.length > 0) {
                        initialData = parsed.map(item => {
                            const masterItem = DEFAULT_SCHEDULES.find(d => d.id === item.id);
                            if (masterItem) return { ...item, link: masterItem.link || item.link };
                            return item;
                        });
                    }
                } catch (e) { console.error("Error parsing schedules", e); }
            }
            setSchedules(initialData);
            setIsInitialLoaded(true);
        } else {
            setSchedules([]);
            setIsInitialLoaded(false);
        }
    }, [user?.username]);

    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [syncStatus, setSyncStatus] = useState('Standby');
    const [isLiveSyncing, setIsLiveSyncing] = useState(false);
    const [formData, setFormData] = useState({
        marketName: '', days: 'Senin s/d Minggu', closeTime: '', openTime: '', link: '', status: 'active'
    });

    // --- LIVE AUTO-SYNC LOGIC ---
    const fetchLiveSchedules = async () => {
        setIsLiveSyncing(true);
        setSyncStatus('Fetching Live Updates...');
        try {
            // Using a CORS Proxy to fetch the HTML from the source
            const proxyUrl = 'https://api.allorigins.win/get?url=';
            const targetUrl = encodeURIComponent('https://la80912.com/blog/?title=JADWAL%20PASARAN%20TOGEL');
            const response = await fetch(`${proxyUrl}${targetUrl}`);
            const json = await response.json();

            if (json.contents) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(json.contents, 'text/html');
                const links = Array.from(doc.querySelectorAll('a')).filter(a => a.innerText.toUpperCase().includes('KUNJUNGI WEBSITE'));

                const liveData = links.map(link => {
                    let container = link.parentElement;
                    while (container && !container.innerText.includes('Hari') && container.parentElement && container.tagName !== 'BODY') {
                        container = container.parentElement;
                    }
                    if (!container) return null;
                    const parts = container.innerText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
                    const hariIdx = parts.indexOf('Hari');
                    const tutupIdx = parts.indexOf('Tutup');
                    const bukaIdx = parts.indexOf('Buka');

                    return {
                        marketName: parts[0],
                        days: hariIdx !== -1 ? parts[hariIdx + 1] : '',
                        closeTime: tutupIdx !== -1 ? parts[tutupIdx + 1] : '',
                        openTime: bukaIdx !== -1 ? parts[bukaIdx + 1] : '',
                        link: link.href
                    };
                }).filter(r => r !== null);

                if (liveData.length > 0) {
                    setSchedules(prev => {
                        const updated = prev.map(existing => {
                            const match = liveData.find(l => l.marketName.toLowerCase() === existing.marketName.toLowerCase());
                            if (match) {
                                return {
                                    ...existing,
                                    closeTime: match.closeTime || existing.closeTime,
                                    openTime: match.openTime || existing.openTime,
                                    days: match.days || existing.days,
                                    link: match.link || existing.link
                                };
                            }
                            return existing;
                        });
                        return updated;
                    });
                    setSyncStatus('All Markets Updated!');
                }
            }
        } catch (error) {
            console.error("Live Sync Failed:", error);
            setSyncStatus('Live Sync Offline');
        } finally {
            setIsLiveSyncing(false);
            setTimeout(() => setSyncStatus('Standby'), 3000);
        }
    };

    // Unified Initial Load & Sync Logic
    useEffect(() => {
        if (!supabase || !user?.username) return;

        fetchLiveSchedules(); // Trigger Auto-Sync on Mount

        const syncProcess = async () => {
            setSyncStatus('Syncing...');

            try {
                // 1. Fetch Cloud Data
                const { data: cloudData, error: fetchError } = await supabase
                    .from('schedules')
                    .select('*')
                    .eq('user_id', user.username);

                if (fetchError) throw fetchError;

                // 2. Load Local Data (fresh from storage to avoid closure capture issues)
                const savedLocal = localStorage.getItem(`app_schedules_${user.username}`);
                const localData = savedLocal ? JSON.parse(savedLocal) : [];

                if (cloudData && cloudData.length > 0) {
                    // Cloud has data - prioritize it as source of truth
                    setSchedules(cloudData.map(item => ({
                        id: Number(item.id), // Ensure numeric
                        marketName: item.market_name,
                        days: item.days,
                        closeTime: item.close_time,
                        openTime: item.open_time,
                        link: item.link
                    })));
                } else if (localData.length > 0) {
                    // Cloud empty but local has data - back up to cloud
                    setSchedules(localData);
                    const syncPromises = localData.map(s => syncToCloud(s));
                    await Promise.all(syncPromises);
                } else {
                    // Both empty - Use Defaults
                    setSchedules(DEFAULT_SCHEDULES);
                }

                setIsInitialLoaded(true);
                setSyncStatus('Standby');
            } catch (err) {
                console.error("Sync Error:", err);
                setSyncStatus('Live Sync Offline');
                const savedLocal = localStorage.getItem(`app_schedules_${user.username}`);
                if (savedLocal) setSchedules(JSON.parse(savedLocal));
                else setSchedules(DEFAULT_SCHEDULES);
                setIsInitialLoaded(true);
            }
        };

        syncProcess();

        const channel = supabase
            .channel(`schedules_${user.username}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'schedules',
                filter: `user_id=eq.${user.username}`
            }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    setSchedules(prev => {
                        const normalizedItem = {
                            id: Number(payload.new.id),
                            marketName: payload.new.market_name,
                            days: payload.new.days,
                            closeTime: payload.new.close_time,
                            openTime: payload.new.open_time,
                            link: payload.new.link
                        };
                        const exists = prev.find(s => Number(s.id) === normalizedItem.id);
                        if (exists) return prev.map(s => Number(s.id) === normalizedItem.id ? normalizedItem : s);
                        return [normalizedItem, ...prev];
                    });
                } else if (payload.eventType === 'DELETE') {
                    setSchedules(prev => prev.filter(s => Number(s.id) !== Number(payload.old.id)));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.username]);

    useEffect(() => {
        if (!user?.username || !isInitialLoaded) return;
        localStorage.setItem(`app_schedules_${user.username}`, JSON.stringify(schedules));
    }, [schedules, user?.username, isInitialLoaded]);

    const syncToCloud = async (item, action = 'upsert') => {
        if (!supabase || !user) return;
        if (action === 'delete') {
            await supabase.from('schedules').delete().eq('id', item.id);
        } else {
            await supabase.from('schedules').upsert({
                id: item.id, user_id: user.username, market_name: item.marketName,
                days: item.days, close_time: item.closeTime, open_time: item.openTime,
                link: item.link || '', last_updated: new Date().toISOString()
            });
        }
    };

    const handleRestoreDefault = () => {
        if (window.confirm('Restore all schedules from MASTER SOURCE? This will overwrite existing data.')) {
            setSchedules(DEFAULT_SCHEDULES);
            DEFAULT_SCHEDULES.forEach(s => syncToCloud(s));
            alert('Default data restored!');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const uniqueId = `manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newItem = { ...formData, id: uniqueId };
        setSchedules(prev => [newItem, ...prev]);
        syncToCloud(newItem);
        setShowModal(false);
        setFormData({ marketName: '', days: 'Senin s/d Minggu', closeTime: '', openTime: '', link: '', status: 'active' });
    };

    const handleDelete = (id) => {
        if (window.confirm('Hapus jadwal ini?')) {
            const deletedItem = schedules.find(s => s.id === id);
            setSchedules(prev => prev.filter(s => s.id !== id));
            if (deletedItem) syncToCloud(deletedItem, 'delete');
        }
    };

    const handleVisitLink = (item) => {
        if (!item.link) return;
        const finalLink = item.link.startsWith('http') ? item.link : `https://${item.link}`;
        window.open(finalLink, '_blank', 'noopener,noreferrer');
    };

    const filteredSchedules = (schedules || []).filter(s =>
        (s.marketName || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ minHeight: '100vh', padding: '40px 20px', color: 'white', position: 'relative', overflow: 'hidden' }}>
            {/* AMBIENT BACKGROUND ELEMENTS */}
            <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '600px', background: 'radial-gradient(circle, rgba(241, 196, 15, 0.08) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none', zIndex: 0 }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', opacity: 0.5 }} />

            {/* NEW ULTRA-PREMIUM HEADER */}
            <div style={{ textAlign: 'center', marginBottom: '80px', position: 'relative', zIndex: 1 }}>
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '12px',
                        background: 'linear-gradient(90deg, rgba(241,196,15,0) 0%, rgba(241,196,15,0.1) 50%, rgba(241,196,15,0) 100%)',
                        padding: '10px 35px', borderRadius: '100px', border: '1px solid rgba(241, 196, 15, 0.2)', marginBottom: '25px'
                    }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Globe size={16} className={isLiveSyncing ? "spin-animation" : "orbit-animation"} color="#f1c40f" />
                            {isLiveSyncing && (
                                <span style={{ position: 'absolute', top: -5, right: -5, width: '8px', height: '8px', borderRadius: '50%', background: '#f1c40f', boxShadow: '0 0 10px #f1c40f' }} />
                            )}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#f1c40f', letterSpacing: '4px', textShadow: '0 0 10px rgba(241,196,15,0.5)' }}>
                            {isLiveSyncing ? "SYNCING LIVE DATA..." : "LIVE SOURCE ACTIVE"}
                        </span>
                    </div>

                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <h1 style={{
                            fontSize: 'clamp(35px, 8vw, 68px)', fontWeight: '1000', margin: 0, letterSpacing: '-2px',
                            lineHeight: '0.9', textTransform: 'uppercase', fontStyle: 'italic',
                            backgroundImage: 'linear-gradient(to bottom, #fff 40%, rgba(255,255,255,0.5) 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                        }}>
                            ALL JADWAL <br />
                            <span style={{ color: '#f1c40f', WebkitTextFillColor: '#f1c40f', textShadow: '0 0 50px rgba(241, 196, 15, 0.4)' }}>PASARAN TOGEL</span>
                        </h1>
                        <div style={{ position: 'absolute', right: '-20px', bottom: '10px', background: '#f1c40f', color: '#000', padding: '4px 12px', fontSize: '12px', fontWeight: '1000', borderRadius: '4px', transform: 'rotate(-5deg)' }}>PRO</div>
                    </div>

                    <p style={{ maxWidth: '600px', margin: '30px auto 0', color: 'rgba(255,255,255,0.4)', fontSize: '16px', fontWeight: '500', lineHeight: '1.6', letterSpacing: '0.5px' }}>
                        Access high-frequency lottery market schedules with millisecond precision logic.
                        Live sync with global master servers.
                    </p>
                </motion.div>
            </div>

            {/* ENHANCED SEARCH & ACTION BAR */}
            <div className="search-action-bar" style={{
                maxWidth: '1000px', margin: '0 auto 60px', display: 'grid',
                gridTemplateColumns: '1fr auto auto', gap: '20px', position: 'relative', zIndex: 1
            }}>
                <div style={{ position: 'relative', group: 'true' }}>
                    <Search size={22} style={{ position: 'absolute', left: '25px', top: '50%', transform: 'translateY(-50%)', color: '#f1c40f', opacity: 0.7 }} />
                    <input
                        type="text" placeholder="Search Markets (Ex: HK, Macau, Sydney)..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', height: '70px', background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '22px',
                            paddingLeft: '70px', color: 'white', fontSize: '18px', outline: 'none',
                            transition: 'all 0.3s ease', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#f1c40f'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                </div>
                <motion.button
                    whileHover={{ scale: 1.02, backgroundColor: '#f1c40f' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowModal(true)}
                    style={{
                        height: '70px', padding: '0 35px', background: 'rgba(241, 196, 15, 0.9)',
                        color: '#000', border: 'none', borderRadius: '22px', fontWeight: '1000',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px'
                    }}
                >
                    <Plus size={24} strokeWidth={3} /> ADD JADWAL
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.1)' }}
                    onClick={handleRestoreDefault}
                    style={{
                        height: '70px', width: '70px', background: 'rgba(255,255,255,0.03)',
                        color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}
                    title="Restore Master Data"
                >
                    <Cloud size={24} />
                </motion.button>
            </div>

            {/* CYBER-TRADING MARKET GRID */}
            <div className="market-grid" style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '25px', maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1
            }}>
                <AnimatePresence>
                    {filteredSchedules.map((item, i) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.01, type: 'spring', stiffness: 100 }}
                            whileHover={{ y: -8, transition: { duration: 0.2 } }}
                            style={{
                                borderRadius: '32px', position: 'relative', overflow: 'hidden',
                                background: 'linear-gradient(165deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.8) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                                padding: '2px' // Border gradient effect
                            }}
                        >
                            {/* Card Background Glow */}
                            <div style={{ position: 'absolute', top: '-20%', right: '-20%', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(241,196,15,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

                            {/* CARD HEADER (MARKET NAME) */}
                            <div style={{
                                background: 'rgba(255,255,255,0.03)', padding: '25px',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f1c40f', boxShadow: '0 0 15px #f1c40f' }}
                                    />
                                    <h3 style={{
                                        fontSize: '22px', fontWeight: '1000', margin: 0, letterSpacing: '0.5px',
                                        color: '#fff', textTransform: 'uppercase', textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                                    }}>
                                        {item.marketName}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '10px' }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div style={{ padding: '25px' }}>
                                {/* DAYS DISPLAY */}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '14px 20px', background: 'rgba(0,0,0,0.3)', borderRadius: '16px',
                                    marginBottom: '20px', border: '1px solid rgba(255,255,255,0.03)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Calendar size={14} color="rgba(255,255,255,0.4)" />
                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', letterSpacing: '1px' }}>ACCESSIBLE</span>
                                    </div>
                                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#f1c40f' }}>{item.days.toUpperCase()}</span>
                                </div>

                                {/* TIME BOXES */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div style={{
                                        padding: '20px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(0,0,0,0.4) 100%)',
                                        borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.15)', position: 'relative'
                                    }}>
                                        <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: '1000', marginBottom: '8px', letterSpacing: '1.5px' }}>MARKET CLOSE</div>
                                        <div style={{ fontSize: '22px', fontWeight: '1000', color: 'white', fontFamily: 'monospace' }}>{item.closeTime}</div>
                                        <Clock size={12} style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.3 }} />
                                    </div>
                                    <div style={{
                                        padding: '20px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(0,0,0,0.4) 100%)',
                                        borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.15)', position: 'relative'
                                    }}>
                                        <div style={{ fontSize: '10px', color: '#10b981', fontWeight: '1000', marginBottom: '8px', letterSpacing: '1.5px' }}>DATA RESULT</div>
                                        <div style={{ fontSize: '22px', fontWeight: '1000', color: 'white', fontFamily: 'monospace' }}>{item.openTime}</div>
                                        <TrendingUp size={12} style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.3 }} />
                                    </div>
                                </div>

                                {/* VISIT BUTTON */}
                                <motion.button
                                    onClick={() => handleVisitLink(item)}
                                    whileHover={item.link ? { scale: 1.02, background: '#f1c40f', color: '#000' } : {}}
                                    whileTap={item.link ? { scale: 0.98 } : {}}
                                    style={{
                                        width: '100%', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                        height: '54px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${item.link ? 'rgba(241, 196, 15, 0.4)' : 'rgba(255,255,255,0.05)'}`,
                                        color: item.link ? '#f1c40f' : 'rgba(255,255,255,0.1)',
                                        fontSize: '13px', fontWeight: '1000', cursor: item.link ? 'pointer' : 'default',
                                        letterSpacing: '2px', transition: 'all 0.3s ease'
                                    }}
                                >
                                    <ExternalLink size={18} /> KUNJUNGI WEBSITE
                                </motion.button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* ULTRA-PREMIUM MODAL */}
            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            style={{
                                width: '100%', maxWidth: '500px', background: '#080808',
                                border: '1px solid rgba(241, 196, 15, 0.4)', borderRadius: '40px',
                                padding: '40px', boxShadow: '0 0 100px rgba(241, 196, 15, 0.1)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                                <h2 style={{ color: '#f1c40f', fontWeight: '1000', margin: 0, fontSize: '32px', letterSpacing: '-1px' }}>JADWAL BARU</h2>
                                <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '10px', borderRadius: '15px', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(255,255,255,0.3)', marginLeft: '15px' }}>MARKET IDENTIFIER</label>
                                    <input placeholder="Ex: HONGKONG POOLS" required value={formData.marketName} onChange={e => setFormData({ ...formData, marketName: e.target.value })} style={{ height: '60px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '0 20px', color: 'white', fontSize: '16px' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(255,255,255,0.3)', marginLeft: '15px' }}>OPERATIONAL WINDOW</label>
                                    <input placeholder="Ex: Senin s/d Minggu" required value={formData.days} onChange={e => setFormData({ ...formData, days: e.target.value })} style={{ height: '60px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '0 20px', color: 'white', fontSize: '16px' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(239, 68, 68, 0.5)', marginLeft: '15px' }}>CLOSE TIME</label>
                                        <input placeholder="22:45 WIB" required value={formData.closeTime} onChange={e => setFormData({ ...formData, closeTime: e.target.value })} style={{ height: '60px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '18px', padding: '0 20px', color: 'white', fontSize: '16px' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(16, 185, 129, 0.5)', marginLeft: '15px' }}>RESULT TIME</label>
                                        <input placeholder="23:00 WIB" required value={formData.openTime} onChange={e => setFormData({ ...formData, openTime: e.target.value })} style={{ height: '60px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '18px', padding: '0 20px', color: 'white', fontSize: '16px' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(241, 196, 15, 0.5)', marginLeft: '15px' }}>OFFICIAL LINK (URL)</label>
                                    <input placeholder="https://example.com" value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} style={{ height: '60px', background: 'rgba(241,196,15,0.03)', border: '1px solid rgba(241,196,15,0.2)', borderRadius: '18px', padding: '0 20px', color: 'white', fontSize: '16px' }} />
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    type="submit"
                                    style={{
                                        height: '65px', borderRadius: '20px', background: '#f1c40f',
                                        color: '#000', fontWeight: '1000', border: 'none',
                                        cursor: 'pointer', fontSize: '18px', marginTop: '10px',
                                        boxShadow: '0 10px 30px rgba(241, 196, 15, 0.3)'
                                    }}
                                >
                                    AUTHORIZE & DEPLOY
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes orbit {
                    from { transform: rotate(0deg) translateX(3px) rotate(0deg); }
                    to { transform: rotate(360deg) translateX(3px) rotate(-360deg); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .orbit-animation {
                    animation: orbit 4s linear infinite;
                }
                .spin-animation {
                    animation: spin 1s linear infinite;
                }
                .glass-effect {
                    backdrop-filter: blur(10px);
                }
                
                @media (max-width: 768px) {
                    .search-action-bar {
                        grid-template-columns: 1fr !important;
                    }
                    .market-grid {
                        grid-template-columns: 1fr !important;
                        gap: 16px !important;
                    }
                    h1 {
                        line-height: 1.1 !important;
                    }
                }

                @media (max-width: 480px) {
                    .market-grid {
                         padding: 0 10px;
                    }
                }
            `}</style>
        </div>
    );
};

export default JadwalResult;


import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Trash2, Search, Calendar, User, Link as LinkIcon,
    Filter, X, AlertTriangle, FileText, ExternalLink,
    UserX, ShieldAlert, ClipboardList, TrendingDown,
    Award, BarChart3, PieChart, Users, Cloud, CloudOff, Import, Database, Sparkles, Link, Clipboard, Wallet, Coins, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const KesalahanStaf = () => {
    const { user } = useAuth();

    // Key localStorage yang unik per user
    const [mistakes, setMistakes] = useState([]);
    const [isInternalInitialLoaded, setIsInternalInitialLoaded] = useState(false);

    // Initial Load based on USER
    useEffect(() => {
        if (user?.username) {
            const saved = localStorage.getItem(`app_mistakes_${user.username}`);
            if (saved) {
                try {
                    setMistakes(JSON.parse(saved));
                } catch (e) {
                    setMistakes([]);
                }
            } else {
                setMistakes([]);
            }
            setIsInternalInitialLoaded(true);
        } else {
            setMistakes([]);
            setIsInternalInitialLoaded(false);
        }
    }, [user?.username]);

    const [showModal, setShowModal] = useState(false);
    const [filters, setFilters] = useState({ staffName: '', date: '' });
    const [syncStatus, setSyncStatus] = useState('Offline');
    const [formData, setFormData] = useState({
        staffName: '',
        date: new Date().toISOString().split('T')[0],
        evidenceLink: '',
        description: '',
        severity: 'Medium',
        livechatCode: ''
    });

    // Smart Import State - Per User
    const [showImportModal, setShowImportModal] = useState(false);
    const [importMethod, setImportMethod] = useState('text'); // 'text' | 'url'
    const [importText, setImportText] = useState('');

    // Lazy initialize states that depend on USER
    const [sheetUrl, setSheetUrl] = useState('');
    const [isAutoSync, setIsAutoSync] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState('-');

    useEffect(() => {
        if (user?.username) {
            setSheetUrl(localStorage.getItem(`staff_sheet_url_${user.username}`) || '');
            setIsAutoSync(localStorage.getItem(`staff_auto_sync_${user.username}`) === 'true');
            setLastSyncTime(localStorage.getItem(`staff_last_sync_${user.username}`) || '-');
        } else {
            setSheetUrl('');
            setIsAutoSync(false);
            setLastSyncTime('-');
        }
    }, [user?.username]);
    const [renderLimit, setRenderLimit] = useState(50);
    const [isInitialLoad, setIsInitialLoad] = useState(true); // Prevent animation flicker on load
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);

    // Monitor screen size for responsive buttons
    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Unified Initial Load & Sync Logic
    useEffect(() => {
        if (!user) return;

        const syncProcess = async () => {
            setSyncStatus('Syncing...');

            try {
                // 1. Fetch Cloud Data
                const { data: cloudData, error: fetchError } = await supabase
                    .from('staff_mistakes')
                    .select('*')
                    .eq('user_id', user.username || user.email)
                    .order('id', { ascending: false });

                if (fetchError) throw fetchError;

                // 2. Load Local Data (fresh from storage)
                const savedLocal = localStorage.getItem(`app_mistakes_${user.username}`);
                const localData = savedLocal ? JSON.parse(savedLocal) : [];

                if (cloudData && cloudData.length > 0) {
                    // Cloud has data - prioritize it
                    const normalizedData = cloudData.map(m => ({
                        ...m,
                        staffName: m.staff_name || '',
                        evidenceLink: m.evidence_link || '',
                        livechatCode: m.livechat_code || '',
                        date: m.date || new Date().toISOString().split('T')[0]
                    }));
                    setMistakes(normalizedData);
                    setSyncStatus('Cloud Connected');
                } else if (localData.length > 0) {
                    // Cloud empty but local has data - back up to cloud
                    setSyncStatus('Backing up...');
                    setMistakes(localData);
                    // Push local items to cloud sequentially or in batch
                    for (const m of localData) {
                        await syncToCloud(m);
                    }
                    setSyncStatus('Cloud Connected');
                } else {
                    setSyncStatus('Cloud Ready');
                }

                setIsInitialLoad(false);

                // Trigger Auto Sync from Sheet if enabled
                if (isAutoSync && sheetUrl) {
                    setTimeout(() => handleImportFromUrl(true), 1000);
                }
            } catch (err) {
                console.error("Sync Error:", err);
                setSyncStatus('Offline Mode');
                const savedLocal = localStorage.getItem(`app_mistakes_${user.username}`);
                if (savedLocal) setMistakes(JSON.parse(savedLocal));
                setIsInitialLoad(false);
            }
        };

        syncProcess();

        const channel = supabase
            .channel(`staff_mistakes_${user.username}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'staff_mistakes',
                filter: `user_id=eq.${user.username || user.email}`
            }, (payload) => {
                // Refresh data on any change
                syncProcess();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.username]);

    // Local Backup & Real-time Sync Trigger
    useEffect(() => {
        if (!user?.username || !isInternalInitialLoaded) return;
        localStorage.setItem(`app_mistakes_${user.username}`, JSON.stringify(mistakes));
    }, [mistakes, user?.username, isInternalInitialLoaded]);

    const syncToCloud = async (item, action = 'upsert') => {
        if (!supabase || !user) return;

        // Ensure we have a user identifier
        const userId = user.username || user.email;
        if (!userId) return;

        setSyncStatus('Saving...');

        if (action === 'delete') {
            const { error } = await supabase.from('staff_mistakes').delete().eq('id', item.id);
            if (!error) setSyncStatus('Cloud Connected');
            else setSyncStatus('Sync Failed');
        } else {
            const { error } = await supabase.from('staff_mistakes').upsert({
                id: item.id,
                user_id: userId,
                staff_name: item.staffName,
                date: item.date,
                evidence_link: item.evidenceLink || '',
                description: item.description,
                severity: item.severity,
                livechat_code: item.livechatCode || '',
                last_updated: new Date().toISOString()
            });

            if (!error) setSyncStatus('Cloud Connected');
            else setSyncStatus('Sync Failed');
        }
    };

    // Fungsi Hitung Periode (1 Periode = 3 Bulan)
    const getPeriodInfo = (dateStr) => {
        const date = dateStr ? new Date(dateStr) : new Date();
        const month = date.getMonth(); // 0-11
        const year = date.getFullYear();

        // P1: Jan-Mar (0,1,2), P2: Apr-Jun (3,4,5), P3: Jul-Sep (6,7,8), P4: Oct-Dec (9,10,11)
        const period = Math.floor(month / 3) + 1;
        const periodNames = ["JAN - MAR", "APR - JUN", "JUL - SEP", "OKT - DES"];

        return {
            id: period,
            name: `P${period}: ${periodNames[period - 1]}`,
            year: year
        };
    };

    const performanceStats = useMemo(() => {
        const currentPeriod = getPeriodInfo();
        const currentYear = currentPeriod.year;

        // Clean name utility (keeps full name, strips trailing IDs/Codes)
        const cleanName = (name) => {
            if (!name) return 'Anonymous';
            return name
                .replace(/\s[\/\-\(].*$/, '') // Remove trailing slashes/parentheses
                .replace(/\s[A-Z\d]{5,}.*$/i, '') // Remove long alphanumeric codes
                .trim()
                .toUpperCase();
        };

        const thisPeriodAll = mistakes.filter(m => {
            const mPeriod = getPeriodInfo(m.date);
            return mPeriod.id === currentPeriod.id && mPeriod.year === currentYear;
        });

        const thisPeriodMistakes = thisPeriodAll.filter(m => {
            const desc = (m.description || '').toLowerCase().trim();
            const isExcludedNote = desc === 'note' || desc.includes('note pengecekkan');
            return !isExcludedNote;
        });

        const staffSummary = {};
        thisPeriodMistakes.forEach(m => {
            const rawName = m.staffName || '';
            const lowerName = rawName.toLowerCase();
            if (lowerName.includes('maxwin') || lowerName.includes('rungkad') || lowerName.includes('tanggal') || lowerName.match(/^\d/)) return;

            const name = cleanName(rawName);

            if (!staffSummary[name]) {
                staffSummary[name] = {
                    count: 0,
                    highRiskCount: 0,
                    initials: name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2)
                };
            }
            staffSummary[name].count += 1;
            if (m.severity === 'High') staffSummary[name].highRiskCount += 1;
        });

        const monthNames = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGT", "SEP", "OKT", "NOV", "DES"];
        const currentPeriodMonths = [(currentPeriod.id - 1) * 3, (currentPeriod.id - 1) * 3 + 1, (currentPeriod.id - 1) * 3 + 2];
        const monthlyData = currentPeriodMonths.map(mIdx => ({
            month: monthNames[mIdx],
            count: thisPeriodMistakes.filter(m => new Date(m.date).getMonth() === mIdx).length
        }));

        const severitySummary = { Low: 0, Medium: 0, High: 0 };
        thisPeriodMistakes.forEach(m => {
            if (severitySummary[m.severity] !== undefined) severitySummary[m.severity] += 1;
        });
        const severityData = Object.entries(severitySummary).map(([name, count]) => ({ name, count }));

        // Unified Bonus Calculation Logic
        const calculateBonus = (count) => {
            if (count <= 25) return 100;
            if (count <= 40) return 85;
            if (count <= 55) return 70;
            if (count <= 70) return 50;
            if (count <= 85) return 25;
            return 0;
        };

        // AFWAN SPECIFIC ANALYTICS (Flexible matching)
        const afwanThisPeriodMistakes = thisPeriodMistakes.filter(m => (m.staffName || '').toUpperCase().includes('AFWAN'));
        const afwanCount = afwanThisPeriodMistakes.length;

        const baseBonus = 30000000;
        const bonusPercent = calculateBonus(afwanCount);
        const afwanBonusRemaining = baseBonus * (bonusPercent / 100);

        const afwanIssueCounts = {};
        afwanThisPeriodMistakes.forEach(m => {
            const desc = (m.description || 'Lainnya').trim().split('\n')[0].substring(0, 30);
            afwanIssueCounts[desc] = (afwanIssueCounts[desc] || 0) + 1;
        });
        const topIssuesAfwan = Object.entries(afwanIssueCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count).slice(0, 4);

        // Core lists for table/bonus
        const staffList = Object.entries(staffSummary).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count);
        const bonusList = staffList.map(staf => {
            const c = staf.count;
            const bp = calculateBonus(c);
            return {
                ...staf,
                baseBonus,
                bonusPercent: bp,
                nominalReceived: baseBonus * (bp / 100),
                loss: baseBonus - (baseBonus * (bp / 100))
            };
        });

        return {
            staffList, bonusList, monthlyData, severityData,
            totalPeriod: thisPeriodAll.length,
            totalMistakes: thisPeriodMistakes.length,
            topIssuesAfwan,
            afwanBonusRemaining,
            afwanCount
        };
    }, [mistakes]);


    const handleSubmit = (e) => {
        e.preventDefault();
        const newMistake = { ...formData, id: Date.now() + Math.floor(Math.random() * 1000) };
        setMistakes(prev => [newMistake, ...prev]);
        syncToCloud(newMistake);
        setShowModal(false);
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            staffName: '',
            date: new Date().toISOString().split('T')[0],
            evidenceLink: '',
            description: '',
            severity: 'Medium',
            livechatCode: ''
        });
    };

    // --- SMART IMPORT LOGIC ---


    // --- OPTIMIZED ROW COMPONENT ---
    // --- OPTIMIZED CARD COMPONENT (Updated to Grid Card) ---
    const MistakeRow = React.memo(({ mistake, index, onDelete, severityColor, isInitialLoad }) => (
        <motion.div
            initial={isInitialLoad ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-effect"
            style={{
                padding: '20px',
                borderRadius: '20px',
                borderLeft: `6px solid ${severityColor}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                background: 'rgba(255,255,255,0.03)',
                position: 'relative',
                overflow: 'hidden',
                height: '100%' // Biar tinggi kartu sama dalam satu baris
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: `linear-gradient(135deg, ${severityColor}, rgba(0,0,0,0.5))`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: '900', color: 'white',
                        boxShadow: `0 4px 12px ${severityColor}44`
                    }}>
                        {(mistake.staffName || '??').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                    </div>
                    <div>
                        <div style={{ fontWeight: '800', color: 'white', fontSize: '15px', textTransform: 'uppercase' }}>{mistake.staffName}</div>
                        <div style={{ fontSize: '11px', color: severityColor, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>{mistake.severity} Risk</div>
                    </div>
                </div>
                <button
                    onClick={() => onDelete(mistake.id)}
                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                >
                    <Trash2 size={16} />
                </button>
            </div>

            <div style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.85)',
                fontWeight: '500',
                lineHeight: '1.6',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                flex: 1,
                minHeight: '60px'
            }}>
                {mistake.description}
            </div>

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255,255,255,0.05)'
            }}>
                {mistake.evidenceLink ? (
                    <a href={mistake.evidenceLink.startsWith('http') ? mistake.evidenceLink : `https://${mistake.evidenceLink}`} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#3b82f6', textDecoration: 'none', fontWeight: '800', padding: '8px 14px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)' }}>
                        <LinkIcon size={14} /> Lihat Bukti
                    </a>
                ) : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontWeight: '600' }}>Tanpa Bukti</span>}

                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>
                    ID: #{String(mistake.id).slice(-4)}
                </div>
            </div>
        </motion.div>
    ));

    const processImportData = async (rawData, isCsv = false, isBackground = false) => {
        if (!rawData.trim()) return;

        console.log("Importing strictly from A, B, C...");
        try {
            const head = rawData.slice(0, 1000);
            const commaCount = (head.match(/,/g) || []).length;
            const semiCount = (head.match(/;/g) || []).length;
            const separator = semiCount > commaCount ? ';' : ',';

            // --- ROBUST CSV SPLITTER (Handles newlines in quotes) ---
            const parseFullCsv = (text, sep) => {
                const rows = [];
                let currentRow = [];
                let currentCell = '';
                let inQuote = false;

                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    const nextChar = text[i + 1];

                    if (char === '"') {
                        if (inQuote && nextChar === '"') { // Escaped quote
                            currentCell += '"'; i++;
                        } else {
                            inQuote = !inQuote;
                        }
                    } else if (char === sep && !inQuote) {
                        currentRow.push(currentCell.trim());
                        currentCell = '';
                    } else if ((char === '\r' || char === '\n') && !inQuote) {
                        if (currentCell || currentRow.length > 0) {
                            currentRow.push(currentCell.trim());
                            rows.push(currentRow);
                            currentRow = [];
                            currentCell = '';
                        }
                        if (char === '\r' && nextChar === '\n') i++;
                    } else {
                        currentCell += char;
                    }
                }
                if (currentCell || currentRow.length > 0) {
                    currentRow.push(currentCell.trim());
                    rows.push(currentRow);
                }
                return rows;
            };

            const allRows = isCsv ? parseFullCsv(rawData, separator) : rawData.split('\n').map(l => l.split('\t'));

            // Pre-scan for context date (Year & Month)
            let contextDate = null;
            for (const row of allRows) {
                for (const cell of row) {
                    const text = (cell || '').trim();
                    const dMatch = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
                    if (dMatch && !text.includes('http')) {
                        contextDate = { y: dMatch[3], m: dMatch[2].padStart(2, '0') };
                        break;
                    }
                }
                if (contextDate) break;
            }

            // Default to current month/year if no date found anywhere
            if (!contextDate) {
                const now = new Date();
                contextDate = { y: now.getFullYear(), m: String(now.getMonth() + 1).padStart(2, '0') };
            }

            // Start from Day 01 of that context month
            let currentDate = `${contextDate.y}-${contextDate.m}-01`;
            const newMistakes = [];

            allRows.forEach((rowData, lineIndex) => {
                // Update date if a new one is found in this row separator
                for (let cell of rowData) {
                    const text = (cell || '').trim();
                    const dMatch = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
                    if (dMatch && !text.includes('http')) {
                        currentDate = `${dMatch[3]}-${dMatch[2].padStart(2, '0')}-${dMatch[1].padStart(2, '0')}`;
                        break;
                    }
                }

                if (!currentDate) return;

                // --- 2. FORCED EXTRACTION (A=0, B=1, C=2) ---
                const rawName = (rowData[0] || '').trim().replace(/^"|"$/g, '');
                const rawLink = (rowData[1] || '').trim().replace(/^"|"$/g, '');
                const rawDesc = (rowData[2] || '').trim().replace(/^"|"$/g, '');

                // Validation: Skip if Name is empty, standalone date, or header junk
                const lowerName = rawName.toLowerCase();
                if (!rawName || lowerName === 'nama' || lowerName.includes('jumlah') || lowerName.includes('tanggal')) return;
                if (rawName.match(/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/)) return;
                if (rawName.length < 3) return;

                let severity = 'Medium';
                const lowerDesc = rawDesc.toLowerCase();
                if (lowerDesc.includes('fatal') || lowerDesc.includes('tidak respon')) severity = 'High';
                else if (lowerDesc.includes('note') || lowerDesc.includes('salah informasi')) severity = 'Low';

                // Generate a STABLE ID based on content to prevent React key reflows (the "running numbers" issue)
                const stableIdString = `${rawName}-${currentDate}-${rawDesc}`.toLowerCase().replace(/\s+/g, '');
                let hash = 0;
                for (let i = 0; i < stableIdString.length; i++) {
                    hash = ((hash << 5) - hash) + stableIdString.charCodeAt(i);
                    hash |= 0;
                }
                const stableId = Math.abs(hash) + (lineIndex * 1);

                newMistakes.push({
                    id: stableId,
                    staffName: rawName,
                    date: currentDate,
                    evidenceLink: rawLink,
                    description: rawDesc || '-',
                    severity: severity,
                    importedAt: new Date().toISOString()
                });
            });

            if (newMistakes.length > 0) {
                setMistakes(newMistakes);

                if (supabase && user) {
                    const userId = user.username || user.email;
                    setSyncStatus('Saving Bulk...');

                    const bulkPayload = newMistakes.map(item => ({
                        id: item.id,
                        user_id: userId,
                        staff_name: item.staffName,
                        date: item.date,
                        evidence_link: item.evidenceLink || '',
                        description: item.description,
                        severity: item.severity,
                        last_updated: new Date().toISOString()
                    }));

                    // Use upsert WITHOUT delete to prevent data 'jumping' to 0
                    const { error } = await supabase.from('staff_mistakes').upsert(bulkPayload, { onConflict: 'id' });
                    if (!error) setSyncStatus('Cloud Connected');
                    else console.error("Bulk sync error:", error);
                }

                setShowImportModal(false);
                const now = new Date().toLocaleTimeString();
                setLastSyncTime(now);
                if (user?.username) {
                    localStorage.setItem(`staff_last_sync_${user.username}`, now);
                }
                if (!isBackground) {
                    setTimeout(() => {
                        alert(`✅ Sukses! ${newMistakes.length} data laporan berhasil ditarik.`);
                    }, 200);
                }
            } else {
                if (!isBackground) {
                    alert('⚠️ Sheet terbaca tapi kolom Nama/Keterangan kosong. Pastikan data ada di kolom A, B, C.');
                }
            }
        } catch (error) {
            console.error('Import Error:', error);
            if (!isBackground) alert('❌ Gagal memproses data: ' + error.message);
        }
    };

    // Helper for robust CSV parsing
    const parseCsvLine = (text, sep) => {
        const result = [];
        let cur = '';
        let inQuote = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') inQuote = !inQuote;
            else if (char === sep && !inQuote) {
                result.push(cur); cur = '';
            } else cur += char;
        }
        result.push(cur);
        return result;
    };

    const handleImportFromUrl = async (isBackground = false) => {
        if (!user?.username) return;
        const urlToUse = isBackground ? localStorage.getItem(`staff_sheet_url_${user.username}`) : sheetUrl;

        if (!urlToUse) {
            if (!isBackground) alert('Masukkan Link Google Sheet terlebih dahulu!');
            return;
        }

        // --- SMART LINK CONVERSION ---
        let fetchUrl = urlToUse.trim();

        if (fetchUrl.includes('docs.google.com/spreadsheets')) {
            if (fetchUrl.includes('/pubhtml')) {
                // Convert Publish to Web (HTML) to CSV
                fetchUrl = fetchUrl.replace('/pubhtml', '/pub?output=csv');
            } else if (fetchUrl.includes('/pub')) {
                // Ensure it has output=csv
                if (!fetchUrl.includes('output=csv')) {
                    fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + 'output=csv';
                }
            } else if (fetchUrl.includes('/edit')) {
                // Convert normal Edit link to Export CSV
                fetchUrl = fetchUrl.replace(/\/edit.*$/, '/export?format=csv');
            }
        }

        if (!isBackground && user?.username) {
            localStorage.setItem(`staff_sheet_url_${user.username}`, urlToUse);
            localStorage.setItem(`staff_auto_sync_${user.username}`, isAutoSync);
        }

        setIsLoadingSheet(true);
        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error('Gagal akses URL: ' + response.status);

            const textData = await response.text();

            // Safety Check: If it starts with <!DOCTYPE html, user gave a wrong link
            if (textData.trim().startsWith('<!DOCTYPE html') || textData.includes('<html')) {
                throw new Error('Link yang dimasukkan bukan link DATA (CSV). Pastikan pilih "Comma-separated values (.csv)" saat Publish to Web.');
            }

            try {
                await processImportData(textData, true, isBackground);
            } catch (processError) {
                console.error('Processing error:', processError);
                if (!isBackground) alert('Error saat memproses data: ' + processError.message);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            if (!isBackground) alert('❌ ' + error.message);
        } finally {
            setIsLoadingSheet(false);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Hapus laporan kesalahan ini secara permanen?')) {
            const deletedItem = mistakes.find(m => m.id === id);
            setMistakes(prev => prev.filter(m => m.id !== id));
            if (deletedItem) syncToCloud(deletedItem, 'delete');
        }
    };

    const handleClearAll = async () => {
        setShowClearConfirm(false);
        setSyncStatus('Deleting All...');

        // Delete from cloud FIRST
        if (supabase && user) {
            const userId = (user && (user.username || user.email)) || 'unknown';

            try {
                const { error } = await supabase
                    .from('staff_mistakes')
                    .delete()
                    .eq('user_id', userId);

                if (error) {
                    console.error('Error deleting from cloud:', error);
                    alert('Gagal hapus dari cloud: ' + error.message);
                    return;
                }
            } catch (e) {
                console.error('Cloud delete exception:', e);
            }
        }

        // Clear local storage (User Specific)
        if (user?.username) {
            localStorage.removeItem(`app_mistakes_${user.username}`);
            localStorage.removeItem(`staff_sheet_url_${user.username}`);
            localStorage.removeItem(`staff_auto_sync_${user.username}`);
            localStorage.removeItem(`staff_last_sync_${user.username}`);
        }

        // Legacy cleanup (Optional)
        localStorage.removeItem('app_mistakes');
        localStorage.removeItem('staff_sheet_url');

        // Reset states
        setMistakes([]);
        setSheetUrl('');
        setIsAutoSync(false);
        setLastSyncTime('-');
        setSyncStatus('Data Cleared');

        alert('✅ Semua data berhasil dihapus!');
    };


    const filteredMistakes = mistakes.filter(m => {
        return (
            (filters.staffName === '' || (m.staffName || '').toLowerCase().includes(filters.staffName.toLowerCase())) &&
            (filters.date === '' || m.date === filters.date)
        );
    });

    // Urutkan berdasarkan Nama Staf A-Z
    const displayedMistakes = [...filteredMistakes].sort((a, b) =>
        (a.staffName || '').localeCompare(b.staffName || '', 'en', { sensitivity: 'base' })
    );

    const getSeverityColor = (sev) => {
        switch (sev) {
            case 'High': return '#ef4444';
            case 'Medium': return '#f59e0b';
            case 'Low': return '#3b82f6';
            default: return '#f59e0b';
        }
    };

    return (
        <div style={{ minHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header Section */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center', // Sejajarkan tengah secara vertikal
                flexWrap: 'nowrap', // PAKSA satu baris, jangan turun
                gap: '12px',
                marginBottom: '10px'
            }}>
                <div style={{ flex: '0 1 auto', minWidth: 0, marginRight: '8px', overflow: 'hidden' }}>
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{
                            fontSize: 'clamp(14px, 4vw, 22px)',
                            fontWeight: '900',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <div style={{
                            padding: '6px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            display: 'flex',
                            flexShrink: 0
                        }}>
                            <UserX size={16} color="white" />
                        </div>
                        <span style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: isMobileView ? '70px' : 'auto'
                        }}>
                            {isMobileView ? 'Staf' : 'Kesalahan Staf'}
                        </span>
                    </motion.h2>
                </div>

                <div className="header-actions-staf" style={{
                    display: 'flex',
                    gap: '6px',
                    flexWrap: 'nowrap',
                    alignItems: 'center',
                    flexShrink: 0, // Jangan biarkan tombol mengecil
                    position: 'relative',
                    zIndex: 9999,
                    pointerEvents: 'auto'
                }}>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            resetForm();
                            setShowModal(true);
                        }}
                        style={{
                            padding: isMobileView ? '8px 10px' : '10px 16px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: 'white',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: '900',
                            fontSize: '11px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            WebkitTapHighlightColor: 'transparent'
                        }}
                    >
                        <Plus size={14} strokeWidth={3} />
                        <span>{isMobileView ? 'Lapor' : 'Laporan Baru'}</span>
                    </button>

                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            setShowImportModal(true);
                        }}
                        style={{
                            padding: isMobileView ? '8px 10px' : '10px 16px',
                            borderRadius: '10px',
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#3b82f6',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: '900',
                            fontSize: '11px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            WebkitTapHighlightColor: 'transparent'
                        }}
                    >
                        <Import size={14} />
                        <span>{isMobileView ? 'Import' : 'Import Docs'}</span>
                    </button>

                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            setShowClearConfirm(true);
                        }}
                        style={{
                            padding: isMobileView ? '8px 10px' : '10px 16px',
                            borderRadius: '10px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: '900',
                            fontSize: '11px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            WebkitTapHighlightColor: 'transparent'
                        }}
                    >
                        <Trash2 size={14} title="Hapus Semua" />
                        <span>{isMobileView ? 'Hapus' : 'Hapus Semua'}</span>
                    </button>
                </div>
            </header>

            {/* NEW Dashboard Stats Section */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                {/* Futuristic Total Counter */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-effect"
                    style={{
                        padding: 'clamp(16px, 4vw, 24px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'clamp(12px, 3vw, 20px)',
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(0,0,0,0.4))',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        boxShadow: '0 0 20px rgba(239, 68, 68, 0.1)'
                    }}
                >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                            padding: 'clamp(10px, 2vw, 16px)', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444',
                            zIndex: 2, position: 'relative'
                        }}><AlertTriangle size={24} /></div>
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{ position: 'absolute', inset: -5, background: '#ef4444', borderRadius: '20px', filter: 'blur(15px)', zIndex: 1 }}
                        />
                    </div>
                    <div>
                        <p style={{ fontSize: 'clamp(10px, 2vw, 12px)', color: 'rgba(255,255,255,0.6)', fontWeight: '800', letterSpacing: '1px' }}>GLOBAL MISTAKES</p>
                        <h3 style={{ fontSize: 'clamp(28px, 6vw, 36px)', fontWeight: '950', color: 'white', letterSpacing: '-1px' }}>{performanceStats.totalMistakes}</h3>
                    </div>
                </motion.div>

                {/* Afwan Bonus Projection Gauge - TRADING STYLE */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-effect"
                    style={{
                        padding: 'clamp(16px, 4vw, 24px)',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 78, 59, 0.2))',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: '0 0 30px rgba(16, 185, 129, 0.1)'
                    }}
                >
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                                <p style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#10b981', fontWeight: '900', letterSpacing: '1px' }}>ESTIMASI BONUS AFWAN</p>
                            </div>
                            <div style={{ display: 'none', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: '800', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                                <Sparkles size={12} /> LIVE
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: '950', color: 'white', letterSpacing: '-0.5px', wordBreak: 'break-all' }}>
                                Rp {performanceStats.afwanBonusRemaining.toLocaleString('id-ID')}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', color: '#10b981', fontSize: 'clamp(10px, 2.5vw, 12px)', fontWeight: '800' }}>
                                (+{(performanceStats.afwanBonusRemaining / 30000000 * 100).toFixed(1)}%)
                            </div>
                        </div>

                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginTop: '15px' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(performanceStats.afwanBonusRemaining / 30000000) * 100}%` }}
                                transition={{ duration: 1.5, type: 'spring' }}
                                style={{ height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', boxShadow: '0 0 15px #10b98166' }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', flexWrap: 'wrap', gap: '4px' }}>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                                Based on {performanceStats.afwanCount} signals
                            </p>
                            <p style={{ fontSize: '10px', color: '#10b981', fontWeight: '800' }}>ACCURACY HIGH</p>
                        </div>
                    </div>
                    {/* Background Icon Watermark */}
                    <Database size={120} style={{ position: 'absolute', right: '-20px', bottom: '-20px', color: 'rgba(16, 185, 129, 0.05)', transform: 'rotate(-15deg)' }} />
                </motion.div>

                {/* Monthly Bar Chart Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-effect" style={{ padding: '24px', gridColumn: 'span 2', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(236, 72, 153, 0.1)' }}><BarChart3 size={18} color="#ec4899" /></div>
                            Distribusi Bulanan ({getPeriodInfo().name})
                        </h4>
                        <div style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            REAL-TIME ANALYTICS
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '160px', padding: '0 40px', position: 'relative' }}>
                        {/* THE NEW LINE GRAPH SVG */}
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
                            {(() => {
                                const maxCount = Math.max(...performanceStats.monthlyData.map(d => d.count), 1);
                                // Clean up unused vars to avoid potential errors
                                return (
                                    <>
                                        <defs>
                                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#ec4899" />
                                                <stop offset="50%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="#f59e0b" />
                                            </linearGradient>
                                        </defs>
                                        <motion.path
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 1 }}
                                            transition={{ duration: 2, ease: "easeInOut" }}
                                            d={`M ${performanceStats.monthlyData.map((data, i) => {
                                                const x = (i === 0 ? 16 : i === 1 ? 50 : 84); // Use numbers, not strings with %
                                                const y = 80 - (data.count / maxCount * 50);
                                                return `${x},${y}`;
                                            }).join(' L ')}`}
                                            fill="none"
                                            stroke="url(#lineGradient)"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            style={{ filter: 'drop-shadow(0 0 8px rgba(236, 72, 153, 0.5))' }}
                                        />
                                    </>
                                );
                            })()}
                        </svg>

                        {/* Grid lines (Reduced opacity for cleaner look) */}
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{ position: 'absolute', bottom: `${(i / 2) * 80 + 20}px`, left: '40px', right: '40px', height: '1px', background: 'rgba(255,255,255,0.03)' }} />
                        ))}

                        {performanceStats.monthlyData.map((data, idx) => {
                            const colors = ['#ec4899', '#3b82f6', '#f59e0b'];
                            const maxCount = Math.max(...performanceStats.monthlyData.map(d => d.count), 1);
                            const barHeight = (data.count / maxCount) * 80;

                            return (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIdx: 2, width: '80px', position: 'relative' }}>
                                    <div style={{
                                        fontSize: '22px',
                                        fontWeight: '950',
                                        color: data.count > 0 ? colors[idx] : 'var(--text-muted)',
                                        textShadow: data.count > 0 ? `0 0 15px ${colors[idx]}66` : 'none',
                                        marginBottom: '4px'
                                    }}>
                                        {data.count}
                                    </div>
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${Math.max(barHeight, 5)}px` }}
                                        transition={{ type: "spring", damping: 15, delay: 0.2 + (idx * 0.1) }}
                                        style={{
                                            width: '40px',
                                            background: data.count > 0 ? `linear-gradient(to top, ${colors[idx]}66, ${colors[idx]}22)` : 'rgba(255,255,255,0.02)',
                                            borderRadius: '8px 8px 4px 4px',
                                            border: `1px solid ${data.count > 0 ? colors[idx] + '66' : 'transparent'}`,
                                            boxShadow: data.count > 0 ? `0 0 20px ${colors[idx]}11` : 'none'
                                        }}
                                    />
                                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'white', letterSpacing: '1px', marginTop: '4px' }}>{data.month}</div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Top Issue Categories (Special for AFWAN FAUZI) */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-effect" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(16, 185, 129, 0.05))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ClipboardList size={18} color="#A855F7" /> Top Issues: AFWAN
                        </h4>
                        <div style={{ padding: '4px 8px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '8px', fontSize: '10px', color: '#A855F7', fontWeight: '800' }}>PERSONAL TRACKER</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {performanceStats.topIssuesAfwan.length === 0 ? (
                            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Belum ada data kesalahan untuk Afwan Fauzi.</div>
                        ) : (
                            performanceStats.topIssuesAfwan.map((issue, idx) => {
                                const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
                                return (
                                    <div key={idx} style={{ position: 'relative' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', fontWeight: '700' }}>
                                            <span style={{ color: 'var(--text-muted)', maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.name.toUpperCase()}</span>
                                            <span style={{ color: 'white' }}>{issue.count} Kali</span>
                                        </div>
                                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(issue.count / performanceStats.topIssuesAfwan[0].count) * 100}%` }}
                                                transition={{ duration: 1, delay: idx * 0.1 }}
                                                style={{ height: '100%', background: colors[idx % colors.length], boxShadow: `0 0 10px ${colors[idx % colors.length]}44` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: '600' }}>
                            Tetap semangat min Afwan, evaluasi point di atas agar bonus tetap aman! 🔥
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Top Cases Section Container */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-effect" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={20} color="var(--primary)" /> Rekapitulasi Staf (Periode Ini)
                    </h4>
                    <div style={{ padding: '6px 16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '20px', color: 'var(--primary)', fontSize: '12px', fontWeight: '800' }}>
                        PERINGKAT KESALAHAN
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ padding: '16px' }}>NAMA STAF</th>
                                <th style={{ padding: '16px', textAlign: 'center' }}>TOTAL KASUS</th>
                                <th style={{ padding: '16px', textAlign: 'center' }}>TINGKAT RISIKO</th>
                                <th style={{ padding: '16px', textAlign: 'center' }}>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {performanceStats.staffList.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Belum ada data di periode ini.</td></tr>
                            ) : (
                                performanceStats.staffList.map((staf, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td data-label="NAMA STAF" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800' }}>
                                                {staf.initials}
                                            </div>
                                            <span style={{ fontSize: '15px', fontWeight: '700' }}>{staf.name}</span>
                                        </td>
                                        <td data-label="TOTAL KASUS" style={{ padding: '16px', textAlign: 'center', fontWeight: '900', fontSize: '20px', color: '#ef4444' }}>{staf.count}</td>
                                        <td data-label="TINGKAT RISIKO" style={{ padding: '16px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                                                {[...Array(3)].map((_, idx) => (
                                                    <div key={idx} style={{ width: '15px', height: '6px', borderRadius: '10px', background: idx < (staf.count > 5 ? 3 : staf.count > 2 ? 2 : 1) ? '#ef4444' : 'rgba(255,255,255,0.1)' }} />
                                                ))}
                                            </div>
                                        </td>
                                        <td data-label="STATUS" style={{ padding: '16px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '800',
                                                background: staf.count > 5 ? 'rgba(239,68,68,0.15)' : staf.count > 2 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                                                color: staf.count > 5 ? '#ef4444' : staf.count > 2 ? '#f59e0b' : '#10b981',
                                                border: `1px solid ${staf.count > 5 ? '#ef444433' : staf.count > 2 ? '#f59e0b33' : '#10b98133'}`
                                            }}>
                                                {staf.count > 5 ? 'WARNING' : staf.count > 2 ? 'ATTENTION' : 'EXCELLENT'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* BONUS TABLE SECTION (New) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-effect" style={{ padding: '24px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Wallet size={20} color="#10b981" /> Estimasi Bonus (Periode {getPeriodInfo().name})
                    </h4>
                    <div style={{ padding: '6px 16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '20px', color: '#10b981', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Coins size={14} /> BASE: IDR 30.000.000
                    </div>
                </div>

                <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', textTransform: 'uppercase', fontSize: '12px', fontWeight: '900', letterSpacing: '0.5px' }}>
                                <th style={{ padding: '16px', textAlign: 'left' }}>NAMA</th>
                                <th style={{ padding: '16px', textAlign: 'center' }}>LC / KESALAHAN</th>
                                <th style={{ padding: '16px', textAlign: 'center' }}>% BONUS</th>
                                <th style={{ padding: '16px', textAlign: 'right' }}>NOMINAL DITERIMA</th>
                                <th style={{ padding: '16px', textAlign: 'right' }}>LOSS (POTONGAN)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {performanceStats.bonusList.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Belum ada data untuk kalkulasi bonus.</td></tr>
                            ) : (
                                performanceStats.bonusList.map((staf, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                                        <td data-label="NAMA" style={{ padding: '16px', fontWeight: '700' }}>{staf.name}</td>
                                        <td data-label="LC / KESALAHAN" style={{ padding: '16px', textAlign: 'center', fontWeight: '800', color: staf.count > 0 ? '#ef4444' : 'white' }}>{staf.count}</td>
                                        <td data-label="% BONUS" style={{ padding: '16px', textAlign: 'center', fontWeight: '900', color: '#10b981' }}>{staf.bonusPercent}%</td>
                                        <td data-label="DITERIMA" style={{ padding: '16px', textAlign: 'right', fontWeight: '700', fontFamily: 'monospace', fontSize: '15px' }}>
                                            Rp {staf.nominalReceived.toLocaleString('id-ID')}
                                        </td>
                                        <td data-label="LOSS" style={{ padding: '16px', textAlign: 'right', fontWeight: '700', fontFamily: 'monospace', fontSize: '15px', color: staf.loss > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                                            Rp {staf.loss.toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Filter Bar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-effect"
                style={{
                    padding: '24px',
                    display: 'flex',
                    gap: '20px',
                    flexWrap: 'wrap',
                    borderRadius: '20px',
                    position: 'relative',
                    zIndex: 10,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1)'
                }}
            >
                <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        placeholder="Cari Nama Staf (Luffy, Zoro, dsb)..."
                        value={filters.staffName}
                        onChange={e => setFilters({ ...filters, staffName: e.target.value })}
                        style={{ width: '100%', paddingLeft: '48px', height: '48px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'white' }}
                    />
                </div>
                <div style={{ width: '220px', position: 'relative' }}>
                    <Calendar size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                        type="date"
                        value={filters.date}
                        onChange={e => setFilters({ ...filters, date: e.target.value })}
                        style={{ width: '100%', paddingLeft: '48px', height: '48px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'white', colorScheme: 'dark' }}
                    />
                </div>
                <motion.button
                    whileHover={{ scale: 1.05, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        // Jika ingin filter langsung aktif, alert sebagai feedback saja
                        alert('✅ Filter telah diterapkan!');
                    }}
                    style={{
                        height: '48px',
                        padding: '0 24px',
                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: '700',
                        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                    }}
                >
                    <Check size={18} /> Submit
                </motion.button>
            </motion.div>



            {/* Mistakes List - Grouped by Date */}
            {
                (() => {
                    // Group mistakes by date (use displayedMistakes for performance)
                    const groupedByDate = displayedMistakes.reduce((acc, mistake) => {
                        const date = mistake.date || 'Tanggal Tidak Diketahui';
                        if (!acc[date]) acc[date] = [];
                        acc[date].push(mistake);
                        return acc;
                    }, {});

                    // Sort dates ascending (oldest first to match sheet flow: 1, 2, 3...)
                    const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(a) - new Date(b));

                    // Slice for performance (Virtualization lite)
                    const totalFound = sortedDates.reduce((sum, d) => sum + groupedByDate[d].length, 0);
                    let renderedCount = 0;

                    const dateList = [];
                    for (const date of sortedDates) {
                        if (renderedCount >= renderLimit) break;

                        const dateMistakes = groupedByDate[date];
                        dateList.push(
                            <div key={date} style={{ marginBottom: '32px' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px',
                                    padding: '16px 24px', background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.15), transparent)',
                                    borderLeft: '4px solid #3b82f6', borderRadius: '0 16px 16px 0'
                                }}>
                                    <Calendar size={22} color="#3b82f6" />
                                    <div>
                                        <div style={{ fontSize: '18px', fontWeight: '800', color: 'white' }}>
                                            {new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                            {dateMistakes.length} Laporan Kesalahan
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))',
                                    gridAutoRows: '1fr', // Paksa tinggi baris sama
                                    gap: '16px'
                                }}>
                                    {dateMistakes.map((mistake, index) => {
                                        renderedCount++;
                                        return <MistakeRow
                                            key={mistake.id}
                                            mistake={mistake}
                                            index={index}
                                            onDelete={handleDelete}
                                            severityColor={getSeverityColor(mistake.severity)}
                                            isInitialLoad={isInitialLoad}
                                        />;
                                    })}
                                </div>
                            </div>
                        );
                    }

                    if (sortedDates.length === 0) {
                        return (
                            <div style={{ textAlign: 'center', padding: '60px' }}>
                                <p style={{ color: 'var(--text-muted)' }}>Tidak ada data yang cocok dengan filter kamu.</p>
                            </div>
                        );
                    }

                    return (
                        <>
                            {dateList}
                            {totalFound > renderLimit && (
                                <div style={{ textAlign: 'center', padding: '20px' }}>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setRenderLimit(prev => prev + 100)}
                                        style={{
                                            padding: '12px 32px', borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.05)', color: 'white',
                                            border: '1px solid var(--glass-border)', fontWeight: '700', cursor: 'pointer'
                                        }}
                                    >
                                        Tampilkan Lebih Banyak ({totalFound - renderLimit} lagi)
                                    </motion.button>
                                </div>
                            )}
                        </>
                    );
                })()
            }

            {/* End of List */}
            <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>
                <div style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase' }}>Akhir dari Laporan</div>
                <div style={{ fontSize: '10px', marginTop: '4px' }}>Semua data sudah ditampilkan</div>
            </div>

            {/* Premium Modal */}
            <AnimatePresence>
                {showModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(2, 6, 23, 0.85)',
                        backdropFilter: 'blur(20px)',
                        display: 'flex',
                        alignItems: 'flex-start', // Muncul dari atas
                        justifyContent: 'center',
                        zIndex: 999999, // Super tinggi agar tidak gelap/blank/terhalang
                        padding: '40px 20px', // Beri ruang di atas
                        overflowY: 'auto', // Bisa di-scroll jika panjang
                        WebkitOverflowScrolling: 'touch'
                    }}
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: -20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: -20 }}
                            className="glass-effect"
                            style={{
                                width: '100%',
                                maxWidth: '520px',
                                padding: 0,
                                overflow: 'hidden',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                marginBottom: '40px' // Ruang bawah
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ padding: '32px 32px 24px', borderBottom: '1px solid var(--glass-border)', background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.1), transparent)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                                        <div style={{ padding: '12px', background: '#ef4444', borderRadius: '14px', color: 'white' }}><AlertTriangle size={28} /></div>
                                        <div>
                                            <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'white', marginBottom: '4px' }}>Lapor Kesalahan</h3>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Input data kesalahan baru</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
                                </div>
                            </div>
                            <form onSubmit={handleSubmit} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '10px' }}>NAMA STAF</label>
                                    <input required value={formData.staffName} onChange={e => setFormData({ ...formData, staffName: e.target.value })} style={{ width: '100%', height: '50px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '0 16px', color: 'white', transition: 'all 0.3s' }} placeholder="Contoh: Budi Santoso" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '10px' }}>TANGGAL</label>
                                        <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ width: '100%', height: '50px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '0 16px', color: 'white' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '10px' }}>SEVERITY</label>
                                        <select value={formData.severity} onChange={e => setFormData({ ...formData, severity: e.target.value })} style={{ width: '100%', height: '50px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '0 16px', color: 'white' }}>
                                            <option value="Low">Low Risk</option>
                                            <option value="Medium">Medium Risk</option>
                                            <option value="High">High Risk</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '10px' }}>DESKRIPSI MASALAH</label>
                                    <textarea required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', height: '120px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '16px', color: 'white', resize: 'none' }} placeholder="Jelaskan detail kesalahan..." />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '10px' }}>BUKTI LINK (Opsional)</label>
                                    <input value={formData.evidenceLink} onChange={e => setFormData({ ...formData, evidenceLink: e.target.value })} style={{ width: '100%', height: '50px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '0 16px', color: 'white' }} placeholder="https://..." />
                                </div>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" style={{ height: '56px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', borderRadius: '16px', color: 'white', fontSize: '16px', fontWeight: '800', cursor: 'pointer', marginTop: '10px', boxShadow: '0 10px 30px rgba(239, 68, 68, 0.3)' }}>Simpan Laporan</motion.button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Import Modal */}
            <AnimatePresence>
                {showImportModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(2, 6, 23, 0.85)',
                        backdropFilter: 'blur(20px)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        zIndex: 999999,
                        padding: '40px 20px',
                        overflowY: 'auto',
                        WebkitOverflowScrolling: 'touch'
                    }}
                        onClick={() => setShowImportModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: -20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: -20 }}
                            className="glass-effect"
                            style={{
                                width: '100%',
                                maxWidth: '600px',
                                padding: 0,
                                overflow: 'hidden',
                                border: '1px solid rgba(255,255,255,0.1)',
                                marginBottom: '40px'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Database size={24} color="#3b82f6" /> Import Data Otomatis
                                </h3>
                                <button onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                {/* Method Toggle */}
                                <div style={{ display: 'flex', gap: '8px', padding: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
                                    <button
                                        onClick={() => setImportMethod('text')}
                                        style={{ flex: 1, padding: '10px', borderRadius: '8px', background: importMethod === 'text' ? 'var(--primary)' : 'transparent', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <Clipboard size={16} /> Copy-Paste
                                    </button>
                                    <button
                                        onClick={() => setImportMethod('url')}
                                        style={{ flex: 1, padding: '10px', borderRadius: '8px', background: importMethod === 'url' ? 'var(--primary)' : 'transparent', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <Link size={16} /> Link Google Sheet
                                    </button>
                                </div>

                                {importMethod === 'text' ? (
                                    <>
                                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                            Copy data dari <b>Google Sheets / Excel</b> atau <b>Docs</b> kamu, lalu Paste di bawah ini.
                                        </p>
                                        <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '10px', border: '1px dashed rgba(59, 130, 246, 0.3)', fontSize: '12px', color: '#94a3b8' }}>
                                            <b>Format:</b> <code>[TANGGAL]</code> (baris baru) <code>NAMA [tab] LINK [tab] KETERANGAN</code>
                                        </div>
                                        <textarea
                                            value={importText}
                                            onChange={e => setImportText(e.target.value)}
                                            placeholder={`01/01/2026\nAFWAN FAUZI\thttps://prnt.sc/...\tSalah respon`}
                                            style={{ width: '100%', height: '160px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '16px', color: 'white', fontFamily: 'monospace', fontSize: '12px', resize: 'none' }}
                                        />
                                        <button
                                            onClick={() => processImportData(importText)}
                                            style={{ padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                                        >
                                            <Sparkles size={18} /> Proses Data
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                            Dashboard akan mengambil data langsung dari Google Sheet kamu secara real-time.
                                            Pastikan link public/share bisa diakses.
                                        </p>
                                        <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '10px', border: '1px dashed rgba(59, 130, 246, 0.3)', fontSize: '12px', color: '#94a3b8' }}>
                                            <b>Caranya:</b> File &rarr; Share &rarr; <b>Publish to Web</b> &rarr; Pilih "Comma-separated values (.csv)"
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="text"
                                                value={sheetUrl || ''}
                                                onChange={e => setSheetUrl(e.target.value)}
                                                placeholder="Tempel link Google Sheet di sini..."
                                                style={{
                                                    width: '100%',
                                                    height: '54px',
                                                    background: 'rgba(0,0,0,0.4)',
                                                    border: '2px solid var(--glass-border)',
                                                    borderRadius: '14px',
                                                    padding: '0 50px 0 16px',
                                                    color: 'white',
                                                    fontSize: '14px',
                                                    outline: 'none',
                                                    transition: 'all 0.3s'
                                                }}
                                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                                onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
                                            />
                                            {sheetUrl && (
                                                <button
                                                    onClick={() => setSheetUrl('')}
                                                    style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                                >
                                                    <X size={18} />
                                                </button>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                            <input
                                                type="checkbox"
                                                checked={isAutoSync}
                                                onChange={e => setIsAutoSync(e.target.checked)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>Automatis Sync</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Update data setiap kali halaman dibuka</div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleImportFromUrl(false)}
                                            disabled={isLoadingSheet}
                                            style={{ padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: isLoadingSheet ? 0.7 : 1 }}
                                        >
                                            {isLoadingSheet ? <div className="spinner" /> : <Cloud size={18} />}
                                            {isLoadingSheet ? 'Sedang Sync...' : 'Simpan & Sync Sekarang'}
                                        </button>

                                        {lastSyncTime !== '-' && (
                                            <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                                                Terakhir sync: {lastSyncTime}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Styles for mobile responsiveness */}
            <style>{`
                @media (max-width: 1024px) {
                    .stats-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .mistake-row {
                        grid-template-columns: 1fr 100px 50px !important;
                        gap: 12px !important;
                        padding: 16px !important;
                        align-items: start !important;
                    }
                    /* Move description to second row in mobile grid */
                    .mistake-row > div:nth-child(3) {
                        grid-column: 1 / -1;
                        padding-right: 0 !important;
                        margin-top: 8px;
                    }
                    /* Move actions to top right */
                    .mistake-row > div:nth-child(4) {
                        grid-row: 1;
                        grid-column: 3;
                        justify-self: end;
                    }
                }

                @media (max-width: 768px) {
                    .mistake-row {
                        grid-template-columns: 1fr 50px !important;
                    }
                    /* Evidence link on its own line */
                    .mistake-row > div:nth-child(2) {
                        grid-column: 1;
                        grid-row: 2;
                        margin-top: 8px;
                    }
                    
                    /* Table Card View for Smaller Screens */
                    table, thead, tbody, th, td, tr {
                        display: block;
                    }
                    thead tr {
                        position: absolute;
                        top: -9999px;
                        left: -9999px;
                    }
                    tr {
                        margin-bottom: 20px;
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 16px;
                        padding: 12px;
                        background: rgba(255,255,255,0.02) !important;
                    }
                    td {
                        border: none !important;
                        position: relative;
                        padding-left: 50% !important;
                        text-align: right !important;
                        min-height: 40px;
                        display: flex !important;
                        align-items: center;
                        justify-content: flex-end;
                    }
                    td:before {
                        content: attr(data-label);
                        position: absolute;
                        left: 12px;
                        width: 45%;
                        padding-right: 10px;
                        white-space: nowrap;
                        text-align: left;
                        font-weight: 800;
                        color: #64748b;
                        font-size: 11px;
                }
            `}</style>
            {/* CUSTOM CLEAR ALL CONFIRMATION MODAL (Reliable alternative to window.confirm) */}
            <AnimatePresence>
                {showClearConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.85)',
                            backdropFilter: 'blur(20px)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            zIndex: 999999,
                            padding: '100px 20px',
                            overflowY: 'auto',
                            WebkitOverflowScrolling: 'touch'
                        }}
                        onClick={() => setShowClearConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: -20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: -20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-effect"
                            style={{
                                width: '100%',
                                maxWidth: '400px',
                                padding: '32px',
                                textAlign: 'center',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(15, 23, 42, 0.95)',
                                borderRadius: '24px',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                            }}
                        >
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '20px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 24px', color: '#ef4444'
                            }}>
                                <AlertTriangle size={32} />
                            </div>
                            <h3 style={{ fontSize: '22px', fontWeight: '800', color: 'white', marginBottom: '12px' }}>
                                Hapus Semua Data?
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '32px' }}>
                                Tindakan ini akan menghapus seluruh laporan kesalahan dari database cloud dan lokal secara <b>permanen</b>. Tidak bisa dibatalkan!
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowClearConfirm(false)}
                                    style={{
                                        padding: '14px', borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.05)', color: 'white',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        fontWeight: '700', fontSize: '14px', cursor: 'pointer'
                                    }}
                                >
                                    BATAL
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02, background: '#ef4444' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleClearAll}
                                    style={{
                                        padding: '14px', borderRadius: '12px',
                                        background: '#dc2626', color: 'white', border: 'none',
                                        fontWeight: '800', fontSize: '14px', cursor: 'pointer'
                                    }}
                                >
                                    YA, HAPUS
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default KesalahanStaf;

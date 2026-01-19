import React, { useState, useEffect, useRef, Suspense, lazy, useCallback, useMemo, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Search, X, Paperclip, MoreVertical, Phone, Video, Info, Smile,
    Check, CheckCheck, Star, Trash2, Reply, Settings, Bell, Hash,
    ChevronRight, ChevronDown, MessageSquare, RefreshCw, Copy, Edit3,
    Flag, Bookmark, Heart, Eye, EyeOff, Pin, ZoomIn, Download, Volume2, VolumeX,
    Mic, Square, Play, Pause, Plus, Users, Globe, Headset, Eraser
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { database } from '../lib/firebase';
import { ref, push, set, onValue, off, update, remove, query, orderByChild, equalTo, limitToLast } from 'firebase/database';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

// ... existing code ...


const generateChatId = (id1, id2) => {
    const combined = [id1, id2].sort().join(':');
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const hex = Math.abs(hash).toString(16).padEnd(32, '0');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(12, 15)}-a${hex.slice(15, 18)}-${hex.slice(18, 30)}`;
};

// CONFIG
const GLOBAL_ROOM_ID = '00000000-0000-0000-0000-000000000000';
const NOTIFY_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3';
const CACHED_MSGS_KEY = 'global_chat_messages_v3';

// Compress Image Helper
const compressImage = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX = 800;
            let { width, height } = img;
            if (width > height && width > MAX) { height *= MAX / width; width = MAX; }
            else if (height > MAX) { width *= MAX / height; height = MAX; }
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => resolve(null);
    };
    reader.onerror = () => resolve(null);
});

const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Generate deterministic PM Room ID from two user emails
const getPrivateRoomId = (email1, email2) => {
    return generateChatId(email1, email2);
};

const GlobalChat = () => {
    const { user } = useAuth();

    // Core States
    const [messages, setMessages] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeRoom, setActiveRoom] = useState(GLOBAL_ROOM_ID);
    const [selectedContact, setSelectedContact] = useState(null);
    const [attachment, setAttachment] = useState(null);
    const [replyTo, setReplyTo] = useState(null);
    const [sharedMedia, setSharedMedia] = useState([]);

    // UI States
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showRightPanel, setShowRightPanel] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
    const [showContactList, setShowContactList] = useState(true);
    const [activeMessageMenu, setActiveMessageMenu] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [editText, setEditText] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [toast, setToast] = useState(null);
    const [isStarred, setIsStarred] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [lastMessages, setLastMessages] = useState({});
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [showAddGroupModal, setShowAddGroupModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [customGroups, setCustomGroups] = useState([]);
    const [deleteRoomModal, setDeleteRoomModal] = useState(null); // { id, title, isGlobal }
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [visualViewportHeight, setVisualViewportHeight] = useState(window.innerHeight);

    // Chat Settings (persisted)
    const [chatSettings, setChatSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('chat_settings_v1');
            return saved ? JSON.parse(saved) : {
                notifications: true,
                notificationSound: true,
                showTimestamp: true,
                compactMode: false,
                fontSize: 'medium',
                bubbleStyle: 'modern',
                autoScroll: true,
                showAvatars: true,
                showReadReceipts: true,
                enterToSend: true,
            };
        } catch { return { notifications: true, notificationSound: true, showTimestamp: true, compactMode: false, fontSize: 'medium', bubbleStyle: 'modern', autoScroll: true, showAvatars: true, showReadReceipts: true, enterToSend: true }; }
    });

    const scrollRef = useRef(null);
    const audioRef = useRef(new Audio(NOTIFY_SOUND));
    const inputRef = useRef(null);
    const recordingTimerRef = useRef(null);

    const profile = useMemo(() => ({
        id: user?.id,
        displayName: user?.displayName || user?.username || 'Guest',
        email: user?.email || 'guest@example.com',
        avatar: user?.avatar || null,
    }), [user]);

    const isAdmin = useMemo(() => ['taufikhidayaat56@gmail.com', 'afwanf388@gmail.com'].includes(profile.email), [profile.email]);

    const getAvatar = (name) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${name || 'User'}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

    // Show Toast Notification
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Save settings to localStorage
    const updateChatSettings = (key, value) => {
        const newSettings = { ...chatSettings, [key]: value };
        setChatSettings(newSettings);
        localStorage.setItem('chat_settings_v1', JSON.stringify(newSettings));
        showToast(`${key} updated`);
    };

    // Clear all messages (Server Side for Admin, Hidden for others)
    const handleClearChatHistory = async () => {
        if (!isAdmin) {
            showToast('Akses ditolak: Hanya Admin yang bisa membersihkan riwayat ini', 'error');
            return;
        }

        let roomTitle = 'Percakapan ini';
        if (activeRoom === GLOBAL_ROOM_ID) roomTitle = 'Global Chat';
        else {
            const group = customGroups.find(g => g.id === activeRoom);
            if (group) roomTitle = `Grup: ${group.name}`;
            else {
                const contact = contacts.find(c => getPrivateRoomId(profile.email, c.email) === activeRoom);
                if (contact) roomTitle = `Chat: ${contact.name}`;
            }
        }

        setDeleteRoomModal({ id: activeRoom, title: roomTitle, isGlobal: activeRoom === GLOBAL_ROOM_ID });
        setShowSettings(false);
    };

    // Load Messages (Firebase version)
    useEffect(() => {
        if (!database || !user) return;

        setIsLoading(true);
        // Safety timeout to stop loading spinner after 5 seconds if no response
        const timeout = setTimeout(() => setIsLoading(false), 5000);

        const messagesRef = ref(database, `messages/${activeRoom}`);
        const messagesQuery = query(messagesRef, limitToLast(100));

        const unsubscribe = onValue(messagesQuery, (snapshot) => {
            clearTimeout(timeout);
            const data = snapshot.val();
            if (data) {
                const messageList = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
                setMessages(messageList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));

                const media = messageList
                    .filter(m => m.attachment?.startsWith('data:image'))
                    .map(m => ({ id: m.id, url: m.attachment, sender: m.username, time: m.created_at }));
                setSharedMedia(media);

                // Notification sound logic
                const lastMsg = messageList[messageList.length - 1];
                if (lastMsg && lastMsg.user_id !== profile.email && chatSettings.notificationSound) {
                    // Only play if it's a new message (simple check with timestamp)
                    const msgTime = new Date(lastMsg.created_at).getTime();
                    if (Date.now() - msgTime < 5000) {
                        audioRef.current.play().catch(() => { });
                    }
                }
            } else {
                setMessages([]);
                setSharedMedia([]);
            }
            setIsLoading(false);
        }, (error) => {
            clearTimeout(timeout);
            console.error('Firebase Error:', error);
            showToast(`Firebase Error: ${error.message}`, 'error');
            setIsLoading(false);
        });

        return () => {
            clearTimeout(timeout);
            off(messagesRef, 'value', unsubscribe);
        };
    }, [activeRoom, user, profile.email, chatSettings.notificationSound]);

    // --- ADVANCED AUTO-SCROLL LOGIC ---
    const messagesEndRef = useRef(null);

    const scrollToBottom = (behavior = 'smooth') => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior });
        }
    };

    // Auto-scroll when messages update
    useEffect(() => {
        if (chatSettings.autoScroll && isAtBottom) {
            scrollToBottom('smooth');
        } else if (!isAtBottom) {
            setShowScrollButton(true);
        }
    }, [messages, chatSettings.autoScroll]);

    // Handle initial load scroll
    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom('auto');
        }
    }, [activeRoom]);

    // Detect if user is at bottom
    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const offset = 100; // tolerance
        const bottom = scrollHeight - scrollTop <= clientHeight + offset;
        setIsAtBottom(bottom);
        if (bottom) setShowScrollButton(false);
    };

    // --- ULTIMATE MOBILE VIEWPORT & KEYBOARD HANDLING (SUPER SOPHISTICATED) ---
    const [viewportStyle, setViewportStyle] = useState({
        height: window.visualViewport ? window.visualViewport.height : window.innerHeight,
        top: 0
    });

    // 1. Lock Body Scroll on Mobile to prevent "Rubber Banding"
    useLayoutEffect(() => {
        if (isMobile) {
            // Store original values
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalStyle;
            };
        }
    }, [isMobile]);

    // 2. Track Visual Viewport for precise Keyboard adjustments
    useEffect(() => {
        if (!window.visualViewport) return;

        const handleViewportChange = () => {
            const { height, offsetTop } = window.visualViewport;

            setViewportStyle({
                height: height,
                top: offsetTop
            });
            setVisualViewportHeight(height);

            // "Super Canggih": Auto-scroll key adjustment
            if (document.activeElement === inputRef.current && isAtBottom) {
                setTimeout(() => scrollToBottom('auto'), 0); // Instant correction
                setTimeout(() => scrollToBottom('smooth'), 100); // Smooth follow-up
            }
        };

        window.visualViewport.addEventListener('resize', handleViewportChange);
        window.visualViewport.addEventListener('scroll', handleViewportChange);

        handleViewportChange(); // Init

        return () => {
            window.visualViewport.removeEventListener('resize', handleViewportChange);
            window.visualViewport.removeEventListener('scroll', handleViewportChange);
        };
    }, [isAtBottom]);

    // Track Unread Messages for ALL rooms
    useEffect(() => {
        if (!database || !user || !contacts.length) return;

        const rooms = [GLOBAL_ROOM_ID, ...contacts.map(c => getPrivateRoomId(profile.email, c.email))];
        const unsubscribes = [];

        rooms.forEach(roomId => {
            const roomRef = ref(database, `messages/${roomId}`);
            const roomQuery = query(roomRef, limitToLast(1));

            const unsub = onValue(roomQuery, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const lastMsgId = Object.keys(data)[0];
                    const lastMsg = data[lastMsgId];

                    // Update last message preview
                    setLastMessages(prev => ({ ...prev, [roomId]: lastMsg }));

                    // Increment unread if not in active room and message is not from me
                    if (roomId !== activeRoom && lastMsg.user_id !== profile.email) {
                        setUnreadCounts(prev => ({
                            ...prev,
                            [roomId]: (prev[roomId] || 0) + 1
                        }));
                    }
                } else {
                    // Room empty or deleted
                    setLastMessages(prev => {
                        const next = { ...prev };
                        delete next[roomId];
                        return next;
                    });
                    setUnreadCounts(prev => {
                        const next = { ...prev };
                        delete next[roomId];
                        return next;
                    });
                }
            });
            unsubscribes.push({ ref: roomRef, unsub });
        });

        return () => {
            unsubscribes.forEach(({ ref: r, unsub }) => off(r, 'value', unsub));
        };
    }, [database, user, contacts, profile.email, activeRoom, chatSettings.notifications]);

    // Reset unread count when room becomes active
    useEffect(() => {
        if (activeRoom) {
            setUnreadCounts(prev => ({ ...prev, [activeRoom]: 0 }));
        }
    }, [activeRoom]);

    // Load Custom Groups
    useEffect(() => {
        if (!database) return;
        const groupsRef = ref(database, 'group_metadata');
        const unsub = onValue(groupsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                setCustomGroups(list);
            }
        });
        return () => off(groupsRef, 'value', unsub);
    }, [database]);

    // Voice Recording Functions
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    const base64Audio = reader.result;
                    sendAudioMessage(base64Audio);
                };
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Error starting recording:', err);
            showToast('Microphone access denied', 'error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
            clearInterval(recordingTimerRef.current);
        }
    };

    const sendAudioMessage = async (base64Audio) => {
        if (!database) return;
        const newMsgData = {
            room_id: activeRoom,
            user_id: profile.email,
            username: profile.displayName,
            avatar: profile.avatar,
            voice: base64Audio,
            message: '🎤 Pesan suara',
            created_at: new Date().toISOString(),
        };
        try {
            const messagesRef = ref(database, `messages/${activeRoom}`);
            await set(push(messagesRef), newMsgData);
        } catch (error) {
            showToast('Gagal mengirim pesan suara', 'error');
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || !database) return;
        const groupRef = push(ref(database, 'group_metadata'));
        await set(groupRef, {
            name: newGroupName.trim(),
            created_by: profile.email,
            created_at: new Date().toISOString(),
            icon: 'Users'
        });
        setNewGroupName('');
        setShowAddGroupModal(false);
        showToast('Grup berhasil dibuat');
    };

    // Dummy loadMessages to keep compatibility with existing refresh buttons
    const loadMessages = useCallback(async () => {
        // Firebase is realtime, so we don't need manual reload
        // but we'll leave this empty to avoid breaking other parts
    }, []);

    // Load Contacts
    const loadContacts = useCallback(async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase.from('user_accounts').select('id, username, display_name, email, avatar, status');
            if (error) throw error;
            setContacts((data || []).filter(u => u.email !== profile.email).map(u => ({
                id: u.id, name: u.display_name || u.username || 'User',
                email: u.email, avatar: u.avatar, online: u.status === 'online',
            })));
        } catch (error) {
            console.error('Error loading contacts:', error);
        }
    }, [profile.email]);

    // Initialize & Layout
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 1024;
            setIsMobile(mobile);
            if (mobile) setShowRightPanel(false);
        };
        window.addEventListener('resize', handleResize);
        handleResize();

        // Load data if user is authenticated
        if (user) {
            loadMessages();
            loadContacts();
        }

        return () => window.removeEventListener('resize', handleResize);
    }, [activeRoom, user, loadMessages, loadContacts]);

    // Real-time Subscription (Handled by Firebase useEffect above)
    // We can remove this Supabase channel logic

    // Auto Scroll
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    // Send Message (Firebase version)
    const handleSend = useCallback(async () => {
        if (!inputMessage.trim() && !attachment) return;
        if (!database) return;

        const msgText = inputMessage.trim();
        const currentAttachment = attachment;
        const currentReplyTo = replyTo;
        const currentRoom = activeRoom;

        const newMsgData = {
            room_id: currentRoom,
            user_id: profile.email,
            username: profile.displayName,
            avatar: profile.avatar, // Add this line
            message: msgText,
            attachment: currentAttachment,
            reply_to: currentReplyTo?.id || null,
            created_at: new Date().toISOString(),
        };

        setInputMessage('');
        setAttachment(null);
        setReplyTo(null);
        setShowEmojiPicker(false);

        try {
            const messagesRef = ref(database, `messages/${currentRoom}`);
            const newMessageRef = push(messagesRef);
            await set(newMessageRef, newMsgData);
        } catch (error) {
            console.error('Error sending message to Firebase:', error);
            showToast(`Gagal: ${error.message}`, 'error');
        }
    }, [inputMessage, attachment, replyTo, profile, activeRoom]);

    const handleDeleteRoom = (roomId, e) => {
        if (e) e.stopPropagation();
        if (!database) return;

        const isGlobal = roomId === GLOBAL_ROOM_ID;
        const isAdminAccount = ['taufikhidayaat56@gmail.com', 'afwanf388@gmail.com'].includes(profile.email);

        if (isGlobal && !isAdminAccount) {
            showToast('Akses ditolak: Hanya Admin yang bisa menghapus Global Chat', 'error');
            return;
        }

        let roomTitle = 'Percakapan';
        let isGroup = false;

        if (isGlobal) {
            roomTitle = 'Global Chat';
        } else {
            const group = customGroups.find(g => g.id === roomId);
            if (group) {
                roomTitle = group.name;
                isGroup = true;
            } else {
                const contact = contacts.find(c => getPrivateRoomId(profile.email, c.email) === roomId);
                if (contact) roomTitle = contact.name;
            }
        }

        setDeleteRoomModal({ id: roomId, title: roomTitle, isGlobal, isGroup });
    };

    const confirmDeleteRoom = async () => {
        if (!deleteRoomModal || !database) return;
        const { id, isGroup } = deleteRoomModal;

        const btn = document.getElementById('confirm-delete-btn');
        if (btn) { btn.disabled = true; btn.innerText = 'Processing...'; }

        try {
            const promises = [remove(ref(database, `messages/${id}`))];

            if (isGroup) {
                promises.push(remove(ref(database, `group_metadata/${id}`)));
            }

            await Promise.all(promises);

            if (isGroup) {
                showToast(`Grup "${deleteRoomModal.title}" berhasil dihapus permanen`);
            } else {
                showToast('Percakapan telah dibersihkan');
            }

            if (activeRoom === id) {
                setMessages([]);
                setActiveRoom(GLOBAL_ROOM_ID);
                setSelectedContact(null);
            }

            setDeleteRoomModal(null);
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Gagal menghapus', 'error');
            if (btn) { btn.disabled = false; btn.innerText = 'Ya, Hapus!'; }
        }
    };

    // Delete Message (Firebase version)
    const handleDeleteMessage = async (msgId, forEveryone = false) => {
        if (!database) return;
        try {
            const msgRef = ref(database, `messages/${activeRoom}/${msgId}`);
            if (forEveryone) {
                await update(msgRef, { message: '🚫 Pesan telah dihapus', is_deleted: true, attachment: null });
                showToast('Pesan dihapus untuk semua orang');
            } else {
                // For "Just for me", we would need a different structure, 
                // but usually for real-time DB we just remove it or ignore it locally
                // Here we'll just filter it locally as before
                setMessages(prev => prev.filter(m => m.id !== msgId));
                showToast('Pesan disembunyikan');
            }
        } catch (error) {
            showToast('Gagal menghapus pesan', 'error');
            console.error(error);
        }
        setActiveMessageMenu(null);
    };

    // Edit Message (Firebase version)
    const handleEditMessage = async () => {
        if (!editingMessage || !editText.trim() || !database) return;
        try {
            const msgRef = ref(database, `messages/${activeRoom}/${editingMessage.id}`);
            await update(msgRef, { message: editText.trim(), is_edited: true });
            showToast('Pesan berhasil diedit');
            setEditingMessage(null); setEditText('');
        } catch (error) {
            showToast('Gagal mengedit pesan', 'error');
            console.error(error);
        }
    };

    // Copy Message
    const handleCopyMessage = (text) => {
        navigator.clipboard.writeText(text);
        showToast('Pesan disalin ke clipboard');
        setActiveMessageMenu(null);
    };

    // Reply to Message
    const handleReplyMessage = (msg) => {
        setReplyTo(msg);
        setActiveMessageMenu(null);
        inputRef.current?.focus();
    };

    // File Select
    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type.startsWith('image/')) {
            const compressed = await compressImage(file);
            if (compressed) setAttachment(compressed);
        }
    };

    // Filter contacts
    // Filter contacts based on active conversations or search
    const filteredContacts = useMemo(() => {
        if (searchQuery) {
            return contacts.filter(c =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.email?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        // When not searching, only show contacts who have an active conversation OR are currently selected
        return contacts.filter(c => {
            const roomId = getPrivateRoomId(profile.email, c.email);
            return lastMessages[roomId] !== undefined || selectedContact?.id === c.id;
        });
    }, [contacts, searchQuery, lastMessages, profile.email, selectedContact]);

    // Filtered messages for search
    const filteredMessages = useMemo(() => {
        if (!searchQuery) return messages;
        return messages.filter(m => m.message?.toLowerCase().includes(searchQuery.toLowerCase()) || m.username?.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [messages, searchQuery]);

    return (
        <div style={{
            // Dynamic Height & Position for Mobile
            // Using viewportStyle.height ensures we fit in the visible area (above keyboard)
            height: isMobile ? `${viewportStyle.height}px` : 'calc(100vh - 100px)',
            // anchor to top 0 is safer than dynamic top for fullscreen apps
            top: isMobile ? '0px' : 'auto',

            display: 'flex', width: '100%', maxWidth: '1600px',
            margin: isMobile ? '0' : '0 auto',
            background: 'linear-gradient(135deg, rgba(15, 10, 40, 0.95), rgba(20, 15, 50, 0.98))',
            backdropFilter: 'blur(20px)',
            borderRadius: isMobile ? '0' : '24px',
            overflow: 'hidden',
            border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 25px 80px -12px rgba(0,0,0,0.6)',
            position: isMobile ? 'fixed' : 'relative',
            left: isMobile ? 0 : 'auto',
            right: isMobile ? 0 : 'auto',
            zIndex: isMobile ? 50 : 1, // Reduced z-index slightly to avoid conflict with modals but keep above standard
        }} onClick={() => setActiveMessageMenu(null)}>
            <style>{`
                .chat-sidebar::-webkit-scrollbar { width: 4px; }
                .chat-sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
                .contact-item { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; position: relative; overflow: hidden; }
                .contact-item:hover { background: rgba(99, 102, 241, 0.08); }
                .contact-item.active { background: linear-gradient(90deg, rgba(99, 102, 241, 0.15), transparent); border-left: 4px solid #6366f1; }
                
                /* Desktop Hover Effects */
                @media (min-width: 1024px) {
                    .contact-item:hover { transform: translateX(5px); }
                    .delete-conv-btn { opacity: 0; transform: scale(0.8); }
                    .contact-item:hover .delete-conv-btn { opacity: 1; transform: scale(1); }
                }

                .delete-conv-btn { 
                    transition: all 0.2s ease;
                    background: rgba(239, 68, 68, 0.1); border: none; color: #ef4444; 
                    padding: 8px; borderRadius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;
                }

                /* Mobile delete button always visible */
                @media (max-width: 1023px) {
                    .delete-conv-btn { opacity: 1; transform: scale(1); margin-left: 8px; }
                }

                .delete-conv-btn:hover { background: #ef4444; color: white; }
                .msg-bubble:hover .msg-actions { opacity: 1; transform: translateY(0); }
                .msg-actions { opacity: 0; transition: all 0.2s ease; transform: translateY(10px); }
                .action-btn { transition: all 0.2s ease; cursor: pointer; display: flex; align-items: center; justify-content: center; }
                .action-btn:hover { background: rgba(99, 102, 241, 0.2); color: #818cf8; transform: scale(1.1); }
                .action-btn:active { transform: scale(0.9); }
                .online-dot { animation: pulse-online 2s ease-in-out infinite; }
                @keyframes pulse-online { 0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); } 50% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); } }
                .glass-card { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); }
                .me-gradient { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); box-shadow: 0 8px 25px -5px rgba(99, 102, 241, 0.4); }
                .other-glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
                .msg-content { position: relative; z-index: 1; }
                .msg-glow { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0; transition: opacity 0.3s ease; box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
                .msg-bubble:hover .msg-glow { opacity: 1; }
                .media-item:hover { transform: scale(1.05); filter: brightness(1.1); }
                .new-msg-btn {
                    animation: bounce 2s infinite;
                    box-shadow: 0 10px 25px rgba(99, 102, 241, 0.5);
                }
                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
                    40% {transform: translateY(-10px);}
                    60% {transform: translateY(-5px);}
                }
                .unread-badge {
                    position: absolute; top: -5px; right: -5px;
                    background: linear-gradient(135deg, #ef4444, #f87171);
                    color: white; font-size: 10px; font-weight: 700;
                    min-width: 18px; height: 18px; border-radius: 10px;
                    display: flex; alignItems: center; justifyContent: center;
                    border: 2px solid #0a081e; box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
                }
                .pulse-unread { animation: pulse-red 2s infinite; }
                @keyframes pulse-red {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                .global-orb {
                    background: linear-gradient(135deg, #6366f1, #d946ef);
                    box-shadow: 0 0 20px rgba(99, 102, 241, 0.6);
                    position: relative; overflow: hidden;
                }
                .global-orb::after {
                    content: ''; position: absolute; inset: 0;
                    background: linear-gradient(0deg, transparent, rgba(255,255,255,0.4), transparent);
                    animation: shine 3s infinite;
                }
                @keyframes shine { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
                .recording-wave {
                    display: flex; align-items: center; gap: 3px; height: 20px;
                }
                .wave-bar {
                    width: 3px; height: 100%; background: #ef4444; border-radius: 2px;
                    animation: wave-anim 0.5s ease-in-out infinite;
                }
                @keyframes wave-anim {
                    0%, 100% { height: 5px; }
                    50% { height: 20px; }
                }
                .delete-conv-btn:hover { background: #ef4444 !important; color: white !important; transform: scale(1.1); }
                
                /* Input Area Polish */
                .chat-input-container { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid rgba(255,255,255,0.06); }
                .chat-input-container:focus-within { 
                    border-color: #6366f1 !important; 
                    box-shadow: 0 0 25px rgba(99, 102, 241, 0.25); 
                    background: rgba(30, 25, 60, 1) !important; 
                    transform: translateY(-1px);
                }
            `}</style>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
                        style={{
                            position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
                            background: toast.type === 'error' ? '#ef4444' : '#22c55e', color: 'white',
                            padding: '12px 24px', borderRadius: '12px', fontWeight: '600', fontSize: '14px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                        }}>
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Image Preview Modal */}
            <AnimatePresence>
                {imagePreview && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setImagePreview(null)}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px',
                        }}>
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                            <img src={imagePreview} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px' }} />
                        </motion.div>
                        <button onClick={() => setImagePreview(null)} style={{
                            position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)',
                            border: 'none', borderRadius: '50%', width: 48, height: 48, color: 'white', cursor: 'pointer',
                        }}><X size={24} /></button>
                        <a href={imagePreview} download style={{
                            position: 'absolute', bottom: 20, right: 20, background: '#6366f1',
                            border: 'none', borderRadius: '12px', padding: '12px 24px', color: 'white',
                            textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px',
                        }}><Download size={18} /> Download</a>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Message Modal */}
            <AnimatePresence>
                {editingMessage && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px',
                        }}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            style={{
                                background: '#1e1b4b', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '500px',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '700' }}>Edit Pesan</h3>
                                <button onClick={() => { setEditingMessage(null); setEditText(''); }}
                                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={24} /></button>
                            </div>
                            <textarea value={editText} onChange={(e) => setEditText(e.target.value)}
                                style={{
                                    width: '100%', minHeight: '120px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px', padding: '16px', color: 'white', fontSize: '14px', outline: 'none', resize: 'none',
                                }} placeholder="Edit pesan..." />
                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                                <button onClick={() => { setEditingMessage(null); setEditText(''); }}
                                    style={{
                                        padding: '12px 24px', background: 'rgba(255,255,255,0.05)', border: 'none',
                                        borderRadius: '12px', color: 'white', fontWeight: '600', cursor: 'pointer',
                                    }}>Batal</button>
                                <button onClick={handleEditMessage}
                                    style={{
                                        padding: '12px 24px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        border: 'none', borderRadius: '12px', color: 'white', fontWeight: '600', cursor: 'pointer',
                                    }}>Simpan</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Settings Modal */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setShowSettings(false)}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
                        }}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'linear-gradient(135deg, #1e1b4b, #0f172a)', borderRadius: '24px',
                                width: '100%', maxWidth: '480px', maxHeight: '80vh', overflow: 'hidden',
                                border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
                            }}>
                            <div style={{
                                padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Settings size={22} color="white" />
                                    </div>
                                    <div>
                                        <h3 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '700' }}>Chat Settings</h3>
                                        <p style={{ color: '#94a3b8', margin: 0, fontSize: '12px' }}>Customize your experience</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowSettings(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', width: '36px', height: '36px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
                            </div>
                            <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(80vh - 100px)' }}>
                                <div style={{ marginBottom: '24px' }}>
                                    <h4 style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>🔔 Notifications</h4>
                                    {[{ key: 'notifications', label: 'Enable Notifications', desc: 'Receive chat notifications' },
                                    { key: 'notificationSound', label: 'Notification Sound', desc: 'Play sound for new messages' }].map(item => (
                                        <label key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '14px 16px', borderRadius: '12px', cursor: 'pointer', marginBottom: '8px' }}>
                                            <div><span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>{item.label}</span><p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>{item.desc}</p></div>
                                            <input type="checkbox" checked={chatSettings[item.key]} onChange={(e) => updateChatSettings(item.key, e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#6366f1' }} />
                                        </label>
                                    ))}
                                </div>
                                <div style={{ marginBottom: '24px' }}>
                                    <h4 style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>🎨 Display</h4>
                                    {[{ key: 'showTimestamp', label: 'Show Timestamps', desc: 'Display time on messages' },
                                    { key: 'showAvatars', label: 'Show Avatars', desc: 'Display user avatars' },
                                    { key: 'showReadReceipts', label: 'Show Read Receipts', desc: 'Show blue checkmarks' },
                                    { key: 'compactMode', label: 'Compact Mode', desc: 'Reduce message spacing' }].map(item => (
                                        <label key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '14px 16px', borderRadius: '12px', cursor: 'pointer', marginBottom: '8px' }}>
                                            <div><span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>{item.label}</span><p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>{item.desc}</p></div>
                                            <input type="checkbox" checked={chatSettings[item.key]} onChange={(e) => updateChatSettings(item.key, e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#6366f1' }} />
                                        </label>
                                    ))}
                                </div>
                                <div style={{ marginBottom: '24px' }}>
                                    <h4 style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>📝 Font Size</h4>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {['small', 'medium', 'large'].map((size) => (
                                            <button key={size} onClick={() => updateChatSettings('fontSize', size)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: chatSettings.fontSize === size ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)', color: 'white', fontWeight: '600', cursor: 'pointer', textTransform: 'capitalize', fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px' }}>{size}</button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ marginBottom: '24px' }}>
                                    <h4 style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>⚙️ Behavior</h4>
                                    {[{ key: 'autoScroll', label: 'Auto Scroll', desc: 'Scroll to new messages' },
                                    { key: 'enterToSend', label: 'Enter to Send', desc: 'Press Enter to send' }].map(item => (
                                        <label key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '14px 16px', borderRadius: '12px', cursor: 'pointer', marginBottom: '8px' }}>
                                            <div><span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>{item.label}</span><p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>{item.desc}</p></div>
                                            <input type="checkbox" checked={chatSettings[item.key]} onChange={(e) => updateChatSettings(item.key, e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#6366f1' }} />
                                        </label>
                                    ))}
                                </div>
                                {isAdmin && (
                                    <div>
                                        <h4 style={{ color: '#ef4444', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>⚠️ Danger Zone (Admin Only)</h4>
                                        <button onClick={handleClearChatHistory} style={{
                                            width: '100%', padding: '16px', background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px',
                                            color: '#ef4444', fontWeight: '800', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                            transition: 'all 0.3s ease',
                                            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.1)'
                                        }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                        >
                                            <Trash2 size={20} /> Clear This Chat for Everyone
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* LEFT SIDEBAR */}
            {(!isMobile || showContactList) && (
                <div style={{
                    width: isMobile ? '100%' : '320px', background: 'rgba(10, 8, 30, 0.95)',
                    borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', flexShrink: 0,
                }}>
                    {/* Header */}
                    <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div>
                                <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '700', margin: 0 }}>Global Chat</h2>
                                <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>{profile.email}</p>
                            </div>
                            <button onClick={loadMessages} className="action-btn"
                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', padding: '8px', color: '#94a3b8' }}>
                                <RefreshCw size={18} />
                            </button>
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)',
                            borderRadius: '12px', padding: '10px 14px', border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <Search size={18} color="#64748b" />
                            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..."
                                style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '14px', outline: 'none' }} />
                            {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={16} /></button>}
                        </div>
                    </div>

                    {/* Channels & Users */}
                    <div className="chat-sidebar" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                        {/* Custom Groups */}
                        {customGroups.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ padding: '0 12px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '800', letterSpacing: '1px' }}>CUSTOM GROUPS</span>
                                </div>
                                {customGroups.map((group) => {
                                    const isActive = activeRoom === group.id;
                                    const unread = unreadCounts[group.id] || 0;
                                    return (
                                        <div key={group.id} onClick={() => { setActiveRoom(group.id); setSelectedContact(null); if (isMobile) setShowContactList(false); }}
                                            className={`contact-item ${isActive ? 'active' : ''}`}
                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '16px', marginBottom: '4px' }}>
                                            <div style={{ position: 'relative' }}>
                                                <div className="global-orb" style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                                                    <Users size={18} color="white" />
                                                </div>
                                                {unread > 0 && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="unread-badge pulse-unread">{unread}</motion.div>}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ color: 'white', fontSize: '14px', fontWeight: '700' }}>{group.name}</div>
                                                <div style={{ color: '#4b5563', fontSize: '11px' }}>Custom Channel</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button className="delete-conv-btn" onClick={(e) => handleDeleteRoom(group.id, e, 'clear')} title="Bersihkan Chat"
                                                    style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}>
                                                    <Eraser size={14} />
                                                </button>
                                                <button className="delete-conv-btn" onClick={(e) => handleDeleteRoom(group.id, e, 'delete')} title="Hapus Grup">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Channels */}
                        <div style={{ padding: '16px 12px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '800', letterSpacing: '1px' }}>CHANNELS</span>
                            <button onClick={() => setShowAddGroupModal(true)} style={{ background: 'rgba(99, 102, 241, 0.1)', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: '#818cf8' }}><Plus size={14} /></button>
                        </div>
                        <div className={`contact-item ${activeRoom === GLOBAL_ROOM_ID ? 'active' : ''}`}
                            onClick={() => { setActiveRoom(GLOBAL_ROOM_ID); setSelectedContact(null); if (isMobile) setShowContactList(false); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 12px', borderRadius: '20px', marginBottom: '8px' }}>
                            <div style={{ position: 'relative' }}>
                                <div className="global-orb" style={{ width: '48px', height: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Hash size={24} color="white" />
                                </div>
                                {unreadCounts[GLOBAL_ROOM_ID] > 0 && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="unread-badge pulse-unread">
                                        {unreadCounts[GLOBAL_ROOM_ID]}
                                    </motion.div>
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ color: 'white', fontSize: '15px', fontWeight: '800' }}>global-chat</div>
                                    {lastMessages[GLOBAL_ROOM_ID] && <span style={{ color: '#4b5563', fontSize: '10px', fontWeight: '700' }}>{formatTime(lastMessages[GLOBAL_ROOM_ID].created_at)}</span>}
                                </div>
                                <div style={{ color: unreadCounts[GLOBAL_ROOM_ID] > 0 ? '#94a3b8' : '#4b5563', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: unreadCounts[GLOBAL_ROOM_ID] > 0 ? '700' : '400' }}>
                                    {lastMessages[GLOBAL_ROOM_ID] ? `${lastMessages[GLOBAL_ROOM_ID].username}: ${lastMessages[GLOBAL_ROOM_ID].message}` : 'Tap to join global'}
                                </div>
                            </div>
                            {isAdmin && (
                                <button className="delete-conv-btn" onClick={(e) => handleDeleteRoom(GLOBAL_ROOM_ID, e)} title="Clear Global Chat">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>

                        <div style={{ padding: '16px 12px 8px', marginTop: '8px' }}>
                            <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '800', letterSpacing: '1px' }}>
                                {searchQuery ? 'SEARCH RESULTS' : 'RECENT CONVERSATIONS'} ({filteredContacts.length})
                            </span>
                        </div>
                        {filteredContacts.map((contact) => (
                            <div key={contact.id}
                                className={`contact-item ${selectedContact?.id === contact.id ? 'active' : ''}`}
                                onClick={() => {
                                    const roomId = getPrivateRoomId(profile.email, contact.email);
                                    setActiveRoom(roomId);
                                    setSelectedContact(contact);
                                    if (isMobile) setShowContactList(false);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', marginBottom: '4px' }}>
                                <div style={{ position: 'relative' }}>
                                    <img src={contact.avatar || getAvatar(contact.name)} alt={contact.name}
                                        style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} />
                                    {contact.online && <div className="online-dot" style={{
                                        position: 'absolute', bottom: '2px', right: '2px', width: '12px', height: '12px',
                                        background: '#22c55e', borderRadius: '50%', border: '2px solid rgba(10, 8, 30, 0.95)',
                                    }} />}
                                    {unreadCounts[getPrivateRoomId(profile.email, contact.email)] > 0 && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="unread-badge pulse-unread">
                                            {unreadCounts[getPrivateRoomId(profile.email, contact.email)]}
                                        </motion.div>
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>{contact.name}</div>
                                        {lastMessages[getPrivateRoomId(profile.email, contact.email)] && (
                                            <span style={{ color: '#64748b', fontSize: '10px' }}>{formatTime(lastMessages[getPrivateRoomId(profile.email, contact.email)].created_at)}</span>
                                        )}
                                    </div>
                                    <p style={{
                                        color: unreadCounts[getPrivateRoomId(profile.email, contact.email)] > 0 ? '#94a3b8' : '#64748b',
                                        fontSize: '12px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        fontWeight: unreadCounts[getPrivateRoomId(profile.email, contact.email)] > 0 ? '600' : '400'
                                    }}>
                                        {lastMessages[getPrivateRoomId(profile.email, contact.email)]?.message || contact.email}
                                    </p>
                                </div>
                                <button className="delete-conv-btn" onClick={(e) => handleDeleteRoom(getPrivateRoomId(profile.email, contact.email), e)} title="Delete Conversation">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* User Footer */}
                    <div style={{ background: '#0b0918', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ position: 'relative' }}>
                            <img src={profile.avatar || getAvatar(profile.displayName)} alt={profile.displayName}
                                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #22c55e' }} />
                            <div style={{ position: 'absolute', bottom: '0', right: '0', width: '12px', height: '12px', background: '#22c55e', borderRadius: '50%', border: '2px solid #0b0918' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: 'white', fontSize: '13px', fontWeight: '700' }}>{profile.displayName}</div>
                            <div style={{ color: '#22c55e', fontSize: '11px' }}>Online</div>
                        </div>
                        <button onClick={() => setShowSettings(!showSettings)} className="action-btn"
                            style={{ background: 'none', border: 'none', color: '#64748b', padding: '4px' }}><Settings size={18} /></button>
                    </div>
                </div>
            )}

            {/* MAIN CHAT AREA */}
            {(!isMobile || !showContactList) && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {/* Header */}
                    <div style={{
                        padding: isMobile ? '12px 16px' : '16px 24px', background: 'rgba(15, 12, 45, 0.8)', backdropFilter: 'blur(10px)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px'
                    }}>
                        {isMobile && <button onClick={() => setShowContactList(true)} style={{ background: 'none', border: 'none', color: 'white', padding: '8px' }}>
                            <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /></button>}
                        {selectedContact ? (
                            <div style={{ position: 'relative' }}>
                                <img src={selectedContact.avatar || getAvatar(selectedContact.name)} alt={selectedContact.name}
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                {selectedContact.online && <div style={{ position: 'absolute', bottom: '0', right: '0', width: '10px', height: '10px', background: '#22c55e', borderRadius: '50%', border: '2px solid #0f0c2d' }} />}
                            </div>
                        ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Hash size={24} color="#6366f1" />
                            </div>
                        )}
                        <div style={{ flex: 1 }}>
                            <h3 style={{ color: 'white', fontSize: '16px', fontWeight: '700', margin: 0 }}>
                                {selectedContact ? selectedContact.name : 'Global Chat'}
                            </h3>
                            <span style={{ color: selectedContact?.online ? '#22c55e' : '#64748b', fontSize: '13px' }}>
                                {selectedContact ? (selectedContact.online ? 'Online' : 'Offline') : `${contacts.filter(c => c.online).length} online • ${messages.length} pesan`}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => updateChatSettings('notificationSound', !chatSettings.notificationSound)} className="action-btn" title={!chatSettings.notificationSound ? 'Unmute' : 'Mute'}
                                style={{ background: !chatSettings.notificationSound ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', padding: isMobile ? '8px' : '10px', color: !chatSettings.notificationSound ? '#ef4444' : '#94a3b8' }}>
                                {!chatSettings.notificationSound ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </button>
                            <button onClick={() => setIsStarred(!isStarred)} className="action-btn" title={isStarred ? 'Unstar' : 'Star'}
                                style={{ background: isStarred ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', padding: isMobile ? '8px' : '10px', color: isStarred ? '#eab308' : '#94a3b8' }}>
                                <Star size={18} fill={isStarred ? '#eab308' : 'none'} />
                            </button>
                            {!isMobile && (
                                <button onClick={() => setShowRightPanel(!showRightPanel)} className="action-btn"
                                    style={{ background: showRightPanel ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', padding: '10px', color: showRightPanel ? '#6366f1' : '#94a3b8' }}>
                                    <Info size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef}
                        onScroll={handleScroll}
                        style={{
                            flex: 1, overflowY: 'auto', padding: isMobile ? '12px 16px' : (chatSettings.compactMode ? '12px 24px' : '24px'),
                            display: 'flex', flexDirection: 'column', gap: chatSettings.compactMode ? '8px' : '16px',
                            scrollBehavior: 'smooth'
                        }}
                    >
                        {isLoading && messages.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                                <RefreshCw size={48} className="animate-spin" style={{ marginBottom: '16px', opacity: 0.5 }} />
                                <p>Loading messages...</p>
                            </div>
                        ) : filteredMessages.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                                    <MessageSquare size={36} color="#6366f1" />
                                </div>
                                <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '700', margin: '0 0 8px' }}>{searchQuery ? 'Tidak ada hasil' : 'Belum ada pesan'}</h3>
                                <p style={{ color: '#64748b', fontSize: '14px' }}>{searchQuery ? 'Coba kata kunci lain' : 'Mulai percakapan!'}</p>
                            </div>
                        ) : (
                            <>
                                <div style={{ textAlign: 'center', margin: '8px 0' }}>
                                    <span style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b', fontSize: '12px', padding: '6px 16px', borderRadius: '20px' }}>Today</span>
                                </div>
                                {filteredMessages.map((msg, index) => {
                                    const isMe = msg.user_id === profile.email;
                                    const replyMsg = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null;
                                    const isFirstInGroup = index === 0 || messages[index - 1]?.user_id !== msg.user_id;

                                    return (
                                        <motion.div key={msg.id} initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="msg-bubble"
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: isMe ? 'flex-end' : 'flex-start',
                                                maxWidth: '90%',
                                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                                position: 'relative',
                                                marginBottom: isFirstInGroup ? '12px' : '4px'
                                            }}>

                                            {/* Profile Header (Avatar + Name) - Only show for first message in group */}
                                            {isFirstInGroup && (
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: isMe ? 'row-reverse' : 'row',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    marginBottom: '6px',
                                                    padding: '0 4px'
                                                }}>
                                                    {chatSettings.showAvatars && (
                                                        <motion.img whileHover={{ scale: 1.1 }}
                                                            src={msg.avatar || getAvatar(msg.username)} alt=""
                                                            style={{
                                                                width: '32px', height: '32px',
                                                                borderRadius: '10px', objectFit: 'cover',
                                                                border: isMe ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.1)',
                                                                boxShadow: isMe ? '0 0 10px rgba(99, 102, 241, 0.3)' : 'none'
                                                            }} />
                                                    )}
                                                    <span style={{
                                                        color: isMe ? '#a855f7' : '#818cf8',
                                                        fontSize: '12px', fontWeight: '800',
                                                        letterSpacing: '0.02em',
                                                        textShadow: '0 0 10px rgba(99, 102, 241, 0.2)'
                                                    }}>{isMe ? 'Anda' : msg.username}</span>
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', width: '100%' }}>
                                                {/* Reply Preview Card */}
                                                {replyMsg && (
                                                    <div style={{
                                                        background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(5px)',
                                                        padding: '8px 12px', borderRadius: '12px 12px 4px 4px', marginBottom: '-4px',
                                                        borderLeft: '4px solid #6366f1', fontSize: '11px', color: '#94a3b8',
                                                        maxWidth: '280px', borderTop: '1px solid rgba(255,255,255,0.05)',
                                                        alignSelf: isMe ? 'flex-end' : 'flex-start'
                                                    }}>
                                                        <span style={{ color: '#818cf8', fontWeight: '800', fontSize: '10px' }}>{replyMsg.username}</span>
                                                        <p style={{ margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.7 }}>{replyMsg.message}</p>
                                                    </div>
                                                )}

                                                <div className={isMe ? 'me-gradient' : 'other-glass'} style={{
                                                    color: 'white',
                                                    padding: (msg.attachment || msg.voice) ? '6px' : (chatSettings.compactMode ? '10px 16px' : '14px 22px'),
                                                    borderRadius: isMe ? (isFirstInGroup ? '24px 4px 24px 24px' : '24px 24px 24px 24px') : (isFirstInGroup ? '4px 24px 24px 24px' : '24px 24px 24px 24px'),
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    transition: 'all 0.3s ease',
                                                    border: isMe ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.08)',
                                                    boxShadow: isMe ? '0 10px 25px -5px rgba(99, 102, 241, 0.4)' : '0 4px 15px rgba(0,0,0,0.2)',
                                                }}>
                                                    <div className="msg-glow" />
                                                    {msg.attachment && !msg.is_deleted && (
                                                        <motion.img whileHover={{ scale: 1.02 }}
                                                            src={msg.attachment} alt="" onClick={() => setImagePreview(msg.attachment)}
                                                            style={{
                                                                width: 'auto',
                                                                maxWidth: isMobile ? '85vw' : '450px',
                                                                height: 'auto',
                                                                maxHeight: '60vh', // Limit vertical height to prevent taking up full screen
                                                                borderRadius: '16px',
                                                                display: 'block',
                                                                marginBottom: msg.message && !msg.voice ? '10px' : 0,
                                                                cursor: 'pointer',
                                                                boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                transition: 'all 0.3s ease'
                                                            }} />
                                                    )}
                                                    {msg.voice && !msg.is_deleted && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', minWidth: '200px' }}>
                                                            <button onClick={() => {
                                                                const audio = new Audio(msg.voice);
                                                                const btn = document.getElementById(`play-${msg.id}`);
                                                                audio.play();
                                                                if (btn) btn.style.color = '#10b981';
                                                                audio.onended = () => { if (btn) btn.style.color = 'white'; };
                                                            }}
                                                                id={`play-${msg.id}`}
                                                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}>
                                                                <Play size={18} fill="currentColor" />
                                                            </button>
                                                            <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', position: 'relative' }}>
                                                                <div className="voice-wave" style={{ position: 'absolute', inset: 0, display: 'flex', gap: '2px', alignItems: 'center' }}>
                                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => <div key={i} style={{ flex: 1, height: `${20 + Math.random() * 60}%`, background: 'rgba(255,255,255,0.3)', borderRadius: '1px' }} />)}
                                                                </div>
                                                            </div>
                                                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Voice</span>
                                                        </div>
                                                    )}
                                                    {msg.message && !msg.voice && <div className="msg-content" style={{
                                                        fontSize: chatSettings.fontSize === 'small' ? '12px' : chatSettings.fontSize === 'large' ? '17px' : '15px',
                                                        lineHeight: '1.6', fontWeight: '450', letterSpacing: '0.01em'
                                                    }}>{msg.message}</div>}
                                                    {msg.is_edited && <span style={{ fontSize: '9px', opacity: 0.5, marginTop: '4px', display: 'block', textAlign: 'right' }}>Edited</span>}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', padding: '0 6px' }}>
                                                    {chatSettings.showTimestamp && <span style={{ color: '#4b5563', fontSize: '10px', fontWeight: '700' }}>{formatTime(msg.created_at)}</span>}
                                                    {isMe && chatSettings.showReadReceipts && (
                                                        <CheckCheck size={12} color="#6366f1" />
                                                    )}
                                                </div>

                                                {/* Floating Actions */}
                                                {!msg.is_deleted && (
                                                    <div className="msg-actions" style={{
                                                        display: 'flex', gap: '4px', marginTop: '4px',
                                                        background: 'rgba(15, 12, 45, 0.9)', padding: '3px 6px',
                                                        borderRadius: '8px', backdropFilter: 'blur(10px)',
                                                        border: '1px solid rgba(255,255,255,0.1)'
                                                    }}>
                                                        <button onClick={(e) => { e.stopPropagation(); handleReplyMessage(msg); }} className="action-btn" title="Reply"
                                                            style={{ background: 'none', border: 'none', color: '#94a3b8' }}><Reply size={14} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleCopyMessage(msg.message); }} className="action-btn" title="Copy"
                                                            style={{ background: 'none', border: 'none', color: '#94a3b8' }}><Copy size={14} /></button>
                                                        {isMe && (
                                                            <>
                                                                <button onClick={(e) => { e.stopPropagation(); setEditingMessage(msg); setEditText(msg.message); }} className="action-btn" title="Edit"
                                                                    style={{ background: 'none', border: 'none', color: '#94a3b8' }}><Edit3 size={14} /></button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id, true); }} className="action-btn" title="Delete"
                                                                    style={{ background: 'none', border: 'none', color: '#f87171' }}><Trash2 size={14} /></button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                <div ref={messagesEndRef} style={{ height: '1px' }} />
                            </>
                        )}
                    </div>

                    {/* New Message Floating Button */}
                    <AnimatePresence>
                        {showScrollButton && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                                onClick={() => { scrollToBottom(); setShowScrollButton(false); }}
                                className="new-msg-btn"
                                style={{
                                    position: 'absolute',
                                    bottom: isMobile ? '100px' : '110px',
                                    right: isMobile ? '20px' : (showRightPanel ? '320px' : '40px'),
                                    background: 'linear-gradient(135deg, #6366f1, #d946ef)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '100px',
                                    fontSize: '13px',
                                    fontWeight: '800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    cursor: 'pointer',
                                    zIndex: 100,
                                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
                                }}
                            >
                                <ChevronDown size={18} />
                                Pesan Baru
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Input Area */}
                    <div style={{ padding: isMobile ? '12px 12px 12px' : '16px 24px', background: 'rgba(15, 12, 45, 0.6)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {replyTo && (
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(99, 102, 241, 0.1)',
                                padding: '10px 16px', borderRadius: '12px 12px 0 0', borderLeft: '3px solid #6366f1', marginBottom: '-8px'
                            }}>
                                <div>
                                    <span style={{ color: '#6366f1', fontSize: '12px', fontWeight: '600' }}>Replying to {replyTo.username}</span>
                                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>{replyTo.message?.substring(0, 50)}...</p>
                                </div>
                                <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
                            </div>
                        )}
                        {attachment && (
                            <div style={{ marginBottom: '8px', position: 'relative', display: 'inline-block' }}>
                                <img src={attachment} alt="" style={{ height: '60px', borderRadius: '8px' }} />
                                <button onClick={() => setAttachment(null)} style={{
                                    position: 'absolute', top: '-8px', right: '-8px', width: '20px', height: '20px', borderRadius: '50%',
                                    background: '#ef4444', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                }}><X size={12} /></button>
                            </div>
                        )}
                        <div className="chat-input-container" style={{
                            display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px',
                            background: 'rgba(30, 25, 60, 0.8)',
                            borderRadius: replyTo ? '0 0 16px 16px' : '16px',
                            padding: isMobile ? '8px 12px' : '10px 16px',
                            minHeight: isMobile ? '50px' : 'auto',
                            flexShrink: 0 // Prevent collapse
                        }}>
                            {isRecording ? (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px', color: '#ef4444' }}>
                                    <div className="recording-wave">
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />)}
                                    </div>
                                    <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '0.5px' }}>
                                        RECORDING: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                                    </span>
                                    <button onClick={stopRecording}
                                        style={{ marginLeft: 'auto', background: 'rgba(239, 68, 68, 0.15)', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#ef4444', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Square size={16} fill="currentColor" /> STOP
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px', transition: 'transform 0.2s' }} className="action-btn">
                                        <Paperclip size={20} color="#64748b" />
                                        <input type="file" accept="image/*" hidden onChange={handleFileSelect} />
                                    </label>
                                    <input ref={inputRef} value={inputMessage} onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && chatSettings.enterToSend && handleSend()}
                                        placeholder="Ketik pesan..."
                                        style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', color: 'white', fontSize: '15px', outline: 'none', padding: '8px 0', height: '100%' }} />

                                    <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        style={{ background: 'none', border: 'none', color: showEmojiPicker ? '#fbbf24' : '#94a3b8', cursor: 'pointer', padding: isMobile ? '8px' : '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                        <Smile size={isMobile ? 22 : 20} fill={showEmojiPicker ? '#fbbf24' : 'none'} />
                                    </button>

                                    {isMobile ? null : (
                                        <button onClick={isRecording ? stopRecording : startRecording}
                                            style={{ background: 'none', border: 'none', color: isRecording ? '#ef4444' : '#94a3b8', cursor: 'pointer', padding: '10px', transition: 'all 0.2s' }}>
                                            {isRecording ? <Square size={20} /> : <Mic size={20} />}
                                        </button>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {isMobile && (
                                            <button onClick={isRecording ? stopRecording : startRecording}
                                                style={{ background: 'none', border: 'none', color: isRecording ? '#ef4444' : '#94a3b8', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {isRecording ? <Square size={22} /> : <Mic size={22} />}
                                            </button>
                                        )}
                                        <button onClick={handleSend} disabled={!inputMessage.trim() && !attachment}
                                            style={{
                                                background: inputMessage.trim() || attachment ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.08)',
                                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
                                                width: isMobile ? '44px' : 'auto',
                                                height: isMobile ? '44px' : 'auto',
                                                padding: isMobile ? '0' : '10px 20px',
                                                color: 'white', fontWeight: '800', fontSize: '14px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: inputMessage.trim() || attachment ? 'pointer' : 'default',
                                                boxShadow: inputMessage.trim() || attachment ? '0 10px 20px -5px rgba(99, 102, 241, 0.4)' : 'none',
                                                flexShrink: 0,
                                                transform: inputMessage.trim() || attachment ? 'scale(1)' : 'scale(0.95)',
                                                opacity: inputMessage.trim() || attachment ? 1 : 0.7,
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}>
                                            {!isMobile && 'Send'} <Send size={isMobile ? 20 : 16} fill="white" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* RIGHT PANEL */}
            {showRightPanel && !isMobile && (
                <div style={{
                    width: '300px', background: 'rgba(10, 8, 30, 0.95)', borderLeft: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0
                }}>
                    <div style={{ textAlign: 'center', padding: '32px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="global-orb" style={{
                            width: '100px', height: '100px', borderRadius: '30px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                            boxShadow: '0 15px 35px rgba(99, 102, 241, 0.4)'
                        }}><Hash size={48} color="white" /></div>
                        <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '800', margin: '0 0 6px', letterSpacing: '0.5px' }}>Global Space</h3>
                        <p style={{ color: '#4b5563', fontSize: '13px', margin: 0, fontWeight: '600' }}>Public channel for everyone</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
                            {[{ icon: Flag, action: () => showToast('Reported') }, { icon: Bell, action: () => updateChatSettings('notificationSound', !chatSettings.notificationSound) }, { icon: Info, action: () => showToast('Info channel') }, { icon: Star, action: () => setIsStarred(!isStarred) }].map((item, i) => (
                                <button key={i} onClick={item.action} className="action-btn" style={{
                                    width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.06)', color: (item.icon === Bell && !chatSettings.notificationSound) ? '#ef4444' : (item.icon === Star && isStarred) ? '#eab308' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}><item.icon size={18} fill={(item.icon === Star && isStarred) ? '#eab308' : 'none'} /></button>
                            ))}
                        </div>
                    </div>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>Statistics</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ color: '#6366f1', fontSize: '24px', fontWeight: '700' }}>{messages.length}</div>
                                <div style={{ color: '#64748b', fontSize: '11px' }}>Messages</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ color: '#22c55e', fontSize: '24px', fontWeight: '700' }}>{contacts.filter(c => c.online).length}</div>
                                <div style={{ color: '#64748b', fontSize: '11px' }}>Online</div>
                            </div>
                        </div>
                    </div>
                    {sharedMedia.length > 0 && (
                        <div style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>Shared Media ({sharedMedia.length})</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                {sharedMedia.slice(0, 9).map((item, i) => (
                                    <div key={i} className="media-item" onClick={() => setImagePreview(item.url)}
                                        style={{ aspectRatio: '1', borderRadius: '10px', overflow: 'hidden' }}>
                                        <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Emoji Picker */}
            <AnimatePresence>
                {showEmojiPicker && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        style={{
                            position: 'absolute',
                            bottom: isMobile ? '80px' : '100px',
                            right: isMobile ? '12px' : (showRightPanel ? '340px' : '40px'),
                            left: isMobile ? '12px' : 'auto',
                            zIndex: 1000,
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                            borderRadius: '24px',
                            overflow: 'hidden'
                        }}>
                        <Suspense fallback={<div style={{ width: isMobile ? '100%' : 350, height: 350, background: '#1e293b', borderRadius: 24 }} />}>
                            <EmojiPicker
                                theme="dark"
                                width="100%"
                                height={isMobile ? 350 : 400}
                                onEmojiClick={(e) => {
                                    setInputMessage(prev => prev + e.emoji);
                                    if (isMobile) setShowEmojiPicker(false);
                                }}
                                searchDisabled={isMobile}
                                skinTonesDisabled
                            />
                        </Suspense>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Group Modal */}
            <AnimatePresence>
                {showAddGroupModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setShowAddGroupModal(false)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ background: '#1e1b4b', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Users size={20} color="white" />
                                    </div>
                                    <h3 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '800' }}>Buat Grup Kustom</h3>
                                </div>
                                <button onClick={() => setShowAddGroupModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', width: '32px', height: '32px', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '700', marginBottom: '8px', display: 'block' }}>NAMA GRUP</label>
                                <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} autoFocus
                                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '16px', color: 'white', outline: 'none', fontSize: '15px' }} placeholder="Contoh: Tim Proyek..." />
                            </div>
                            <button onClick={handleCreateGroup} disabled={!newGroupName.trim()}
                                style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '14px', color: 'white', fontWeight: '800', cursor: 'pointer', opacity: newGroupName.trim() ? 1 : 0.5, transition: 'all 0.3s ease', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)' }}>
                                Buat Grup Sekarang
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Delete Room Modal */}
            <AnimatePresence>
                {deleteRoomModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setDeleteRoomModal(null)}
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 10001, padding: '20px'
                        }}>
                        <motion.div initial={{ scale: 0.9, y: 20, rotateX: 10 }} animate={{ scale: 1, y: 0, rotateX: 0 }} exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'linear-gradient(145deg, #1e1b4b, #0f172a)',
                                borderRadius: '28px', padding: '32px', width: '100%', maxWidth: '420px',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                boxShadow: '0 25px 80px rgba(220, 38, 38, 0.2), 0 0 0 1px rgba(239, 68, 68, 0.1)',
                                textAlign: 'center', position: 'relative', overflow: 'hidden'
                            }}>

                            {/* Background Effect */}
                            <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

                            <div style={{
                                width: '88px', height: '88px', borderRadius: '24px',
                                background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 24px', position: 'relative',
                                boxShadow: '0 0 30px rgba(239, 68, 68, 0.2)'
                            }}>
                                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}>
                                    {deleteRoomModal.isGroup ? <Users size={44} /> : <Trash2 size={44} />}
                                </motion.div>
                                <div style={{ position: 'absolute', bottom: -5, right: -5, background: '#1e1b4b', borderRadius: '50%', padding: '4px' }}>
                                    <div style={{ width: '24px', height: '24px', background: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                        <X size={14} strokeWidth={4} />
                                    </div>
                                </div>
                            </div>

                            <h3 style={{ color: 'white', fontSize: '24px', fontWeight: '900', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
                                {deleteRoomModal.isGroup && deleteRoomModal.action === 'delete' ? 'Hapus Grup?' : 'Bersihkan Chat?'}
                            </h3>

                            <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.6', margin: '0 0 32px' }}>
                                {deleteRoomModal.isGroup && deleteRoomModal.action === 'delete' ? (
                                    <>
                                        Anda akan menghapus grup <span style={{ color: 'white', fontWeight: '800' }}>"{deleteRoomModal.title}"</span> beserta seluruh isinya secara permanen. Tindakan ini tidak dapat dibatalkan.
                                    </>
                                ) : (
                                    <>
                                        Apakah Anda yakin ingin {deleteRoomModal.action === 'clear' ? 'membersihkan' : 'menghapus'} semua pesan di <span style={{ color: 'white', fontWeight: '800' }}>{deleteRoomModal.title}</span>?
                                        {deleteRoomModal.isGroup ? ' Grup tidak akan terhapus.' : ' Chat akan menjadi kosong.'}
                                    </>
                                )}
                            </p>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setDeleteRoomModal(null)}
                                    style={{
                                        flex: 1, padding: '16px', background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
                                        color: '#cbd5e1', fontWeight: '700', cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}
                                    onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.03)'}
                                >
                                    Batalkan
                                </button>
                                <button id="confirm-delete-btn" onClick={confirmDeleteRoom}
                                    style={{
                                        flex: 1, padding: '16px',
                                        background: deleteRoomModal.action === 'clear' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #ef4444, #b91c1c)',
                                        border: deleteRoomModal.action === 'clear' ? '1px solid #f59e0b' : '1px solid #ef4444',
                                        borderRadius: '16px',
                                        color: 'white', fontWeight: '800', cursor: 'pointer',
                                        boxShadow: deleteRoomModal.action === 'clear' ? '0 8px 20px -4px rgba(245, 158, 11, 0.5)' : '0 8px 20px -4px rgba(239, 68, 68, 0.5)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        position: 'relative', overflow: 'hidden'
                                    }}
                                >
                                    <span style={{ position: 'relative', zIndex: 1 }}>
                                        {deleteRoomModal.isGroup && deleteRoomModal.action === 'delete' ? 'Hapus Grup' : 'Bersihkan'}
                                    </span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GlobalChat;

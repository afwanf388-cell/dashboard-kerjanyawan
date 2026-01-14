import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertCircle, Zap } from 'lucide-react';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, target, isDeleting, customTitle, customDescription }) => {
    if (!isOpen) return null;

    return createPortal(
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
        }}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(2, 6, 23, 0.85)',
                    backdropFilter: 'blur(12px)'
                }}
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                style={{
                    width: '100%',
                    maxWidth: '440px',
                    background: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: '32px',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    boxShadow: '0 30px 60px rgba(0,0,0,0.5), 0 0 40px rgba(239, 68, 68, 0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '40px'
                }}
            >
                {/* Background Decorations */}
                <div style={{
                    position: 'absolute',
                    top: '-100px',
                    left: '-100px',
                    width: '200px',
                    height: '200px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    filter: 'blur(60px)',
                    borderRadius: '50%'
                }} />

                {/* Animated Trash Icon Container */}
                <div style={{ position: 'relative', marginBottom: '32px' }}>
                    <motion.div
                        animate={{
                            scale: [1, 1.1, 1],
                            boxShadow: [
                                '0 0 0px rgba(239, 68, 68, 0)',
                                '0 0 30px rgba(239, 68, 68, 0.4)',
                                '0 0 0px rgba(239, 68, 68, 0)'
                            ]
                        }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        style={{
                            width: '90px',
                            height: '90px',
                            borderRadius: '30px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid rgba(239, 68, 68, 0.2)'
                        }}
                    >
                        <Trash2 size={42} style={{ color: '#ef4444' }} />
                    </motion.div>

                    {/* Floating Warning Icon */}
                    <motion.div
                        animate={{ y: [0, -5, 0], rotate: [0, 10, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 3 }}
                        style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '3px solid rgba(15, 23, 42, 0.9)',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                        }}
                    >
                        <AlertCircle size={16} color="white" />
                    </motion.div>
                </div>

                <h2 style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color: 'white',
                    marginBottom: '16px',
                    textAlign: 'center'
                }}>
                    {customTitle || 'Hapus Data?'}
                </h2>

                <p style={{
                    fontSize: '15px',
                    color: 'rgba(255,255,255,0.5)',
                    textAlign: 'center',
                    marginBottom: '32px',
                    lineHeight: '1.6'
                }}>
                    {customDescription || (
                        <>Apakah Anda yakin ingin menghapus <span style={{ color: '#ef4444', fontWeight: '800' }}>"{target?.title}"</span> secara permanen?</>
                    )}
                </p>

                <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        disabled={isDeleting}
                        style={{
                            flex: 1,
                            padding: '16px',
                            borderRadius: '16px',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.1)',
                            fontWeight: '800',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        BATAL
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02, boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onConfirm}
                        disabled={isDeleting}
                        style={{
                            flex: 1,
                            padding: '16px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                            color: 'white',
                            border: 'none',
                            fontWeight: '800',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                        }}
                    >
                        {isDeleting ? (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            >
                                <Zap size={18} />
                            </motion.div>
                        ) : (
                            <>HAPUS</>
                        )}
                    </motion.button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default DeleteConfirmationModal;

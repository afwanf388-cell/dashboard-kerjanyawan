import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('dashboard_user');
      console.log('AuthContext: Loading saved user from localStorage:', savedUser ? 'Found' : 'Not found');
      if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
        const parsed = JSON.parse(savedUser);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error('AuthContext: Failed to parse saved user:', e);
      try { localStorage.removeItem('dashboard_user'); } catch (err) { }
    }
    return null;
  });

  // Sync profile with cloud on mount
  useEffect(() => {
    const syncProfile = async () => {
      if (!supabase || !user?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_accounts')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          const updatedUser = {
            ...user,
            id: data.id,
            username: data.username,
            displayName: data.display_name || data.username,
            email: data.email,
            role: data.role || 'user',
            avatar: data.avatar,
            bgImage: data.bg_image,
            status: data.status
          };

          // Only update if something actually changed and we have valid data
          if (data && JSON.stringify(updatedUser) !== JSON.stringify(user)) {
            console.log('AuthContext: Profile synced from cloud');
            setUser(updatedUser);
            try {
              localStorage.setItem('dashboard_user', JSON.stringify(updatedUser));
            } catch (storageErr) {
              console.error('AuthContext: Failed to save synced user to localStorage:', storageErr);
            }
          }
        }
      } catch (err) {
        console.error('AuthContext: Failed to sync profile from cloud:', err);
      }
    };

    syncProfile();
  }, [user?.id]);

  const login = (userData) => {
    console.log('AuthContext: Logging in user:', userData.username);
    setUser(userData);
    try {
      localStorage.setItem('dashboard_user', JSON.stringify(userData));
    } catch (e) {
      console.error('AuthContext: Quota full! Retrying with essential data only.', e);
      if (e.name === 'QuotaExceededError') {
        // Fallback: Simpan data penting saja (tanpa foto/background raksasa) biar tetep bisa login
        const essentialData = {
          id: userData.id,
          username: userData.username,
          role: userData.role,
          displayName: userData.displayName
        };
        try {
          localStorage.setItem('dashboard_user', JSON.stringify(essentialData));
          console.warn('AuthContext: Session saved without images due to storage limit.');
        } catch (innerErr) {
          console.error('AuthContext: Critical storage failure!', innerErr);
        }
      }
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('dashboard_user');
  };

  const updateUser = async (newUserData) => {
    const updatedUser = { ...user, ...newUserData };
    console.log('AuthContext: Updating user profile');
    setUser(updatedUser);
    try {
      localStorage.setItem('dashboard_user', JSON.stringify(updatedUser));
    } catch (e) {
      console.error('AuthContext: Failed to save updated user to localStorage:', e);
      if (e.name === 'QuotaExceededError') {
        // Fallback: Update hanya data text jika storage penuh
        const essentialData = { ...updatedUser };
        delete essentialData.avatar;
        delete essentialData.bgImage;
        try {
          localStorage.setItem('dashboard_user', JSON.stringify(essentialData));
          alert('Penyimpanan browser penuh min! Foto profil/background gagal disimpan di lokal, tapi profil di cloud (database) tetap aman. Coba pakai gambar yang lebih kecil ya.');
        } catch (innerErr) { }
      }
    }

    // Sync with Supabase if online
    if (supabase && updatedUser?.id) {
      try {
        const { error } = await supabase
          .from('user_accounts')
          .update({
            avatar: updatedUser.avatar,
            bg_image: updatedUser.bgImage,
            status: updatedUser.status,
            display_name: updatedUser.displayName
          })
          .eq('id', updatedUser.id);

        if (error) {
          console.error('AuthContext: Supabase update error:', error);
        }
      } catch (err) {
        console.error('AuthContext: Failed to sync profile to cloud:', err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

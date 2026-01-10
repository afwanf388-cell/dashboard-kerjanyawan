import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('dashboard_user');
      if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
        return JSON.parse(savedUser);
      }
    } catch (e) {
      console.error('Failed to parse saved user:', e);
      localStorage.removeItem('dashboard_user');
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

          // Only update if something actually changed
          if (JSON.stringify(updatedUser) !== JSON.stringify(user)) {
            console.log('Profile synced from cloud');
            setUser(updatedUser);
            localStorage.setItem('dashboard_user', JSON.stringify(updatedUser));
          }
        }
      } catch (err) {
        console.error('Failed to sync profile from cloud:', err);
      }
    };

    syncProfile();
  }, [user?.id]);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('dashboard_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('dashboard_user');
  };

  const updateUser = async (newUserData) => {
    const updatedUser = { ...user, ...newUserData };
    setUser(updatedUser);
    localStorage.setItem('dashboard_user', JSON.stringify(updatedUser));

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
          console.error('Supabase update error:', error);
        }
      } catch (err) {
        console.error('Failed to sync profile to cloud:', err);
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

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

  const [loading, setLoading] = useState(false); // Set to false since we init sync

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
            avatar: updatedUser.photoURL || updatedUser.avatar,
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
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

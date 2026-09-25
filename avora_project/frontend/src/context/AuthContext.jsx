import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getProfile } from '../services/authService';

const AuthContext = createContext(null);

/**
 * Provides authentication state (user, token) and helpers (login, logout)
 * to the entire application tree.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('avora_token'));
  const [loading, setLoading] = useState(true);

  // Fetch user profile on mount if a token exists
  useEffect(() => {
    const bootstrap = async () => {
      if (token) {
        try {
          const res = await getProfile();
          setUser(res.data);
        } catch {
          // Token invalid/expired — clear it
          localStorage.removeItem('avora_token');
          setToken(null);
        }
      }
      setLoading(false);
    };
    bootstrap();
  }, [token]);

  const login = useCallback((jwtToken, userData) => {
    localStorage.setItem('avora_token', jwtToken);
    setToken(jwtToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('avora_token');
    setToken(null);
    setUser(null);
  }, []);

  const value = { user, token, loading, login, logout, setUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to consume AuthContext.
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

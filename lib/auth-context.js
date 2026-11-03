'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { authAPI } from './api';
import logger from './logger';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.role) parsed.role = String(parsed.role).toLowerCase();
        if (parsed?.token) {
          setUser(parsed);
        } else {
          localStorage.removeItem('user');
        }
      } catch (e) {
        logger.error('Failed to parse stored user', e);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Cross-tab session enforcement: if another tab logs in as a different user
  // or logs out, immediately reflect that in this tab.
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key !== 'user') return;
      if (!e.newValue) {
        // Another tab logged out — clear this tab too
        queryClient.clear();
        setUser(null);
        router.push('/login');
        return;
      }
      try {
        const incoming = JSON.parse(e.newValue);
        if (incoming?.role) incoming.role = String(incoming.role).toLowerCase();
        // Different user logged in on another tab — kick this session
        setUser((current) => {
          if (current && incoming?.id && current.id !== incoming.id) {
            queryClient.clear();
            router.push('/login');
            return null;
          }
          return incoming?.token ? incoming : current;
        });
      } catch {
        // Corrupt value — treat as logout
        queryClient.clear();
        setUser(null);
        router.push('/login');
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [queryClient, router]);

  const login = async (email, password) => {
    try {
      const data = await authAPI.login(email, password);

      logger.log('Login response received');

      if (data && data.success) {
        const accessToken = data?.data?.accessToken || data?.data?.token || data?.accessToken || data?.token;

        const userData = {
          id: data?.data?.user?.id || data?.user?.id,
          email: data?.data?.user?.email || data?.user?.email,
          role: (data?.data?.user?.role || data?.user?.role || 'USER').toLowerCase(),
          name: data?.data?.user?.name || data?.user?.name,
          token: accessToken,
        };

        // Validate that we have required fields
        if (!userData.email || !userData.token) {
          logger.error('Missing required user data');
          return {
            success: false,
            message: 'Invalid response from server'
          };
        }

        // Clear any cached data from a previous session before setting new user
        queryClient.clear();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));

        router.push('/dashboard');

        return { success: true };
      }

      const errorMessage = data?.error || data?.message || 'Login failed';
      logger.error('Login failed:', errorMessage);
      return { 
        success: false, 
        message: errorMessage
      };
    } catch (error) {
      logger.error('Login error:', error);
      return {
        success: false,
        message:
          error.message === 'Failed to fetch'
            ? 'Unable to connect to server. Please check if the server is running.'
            : error.message || 'Login failed',
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      logger.error('Logout API call failed:', e);
    } finally {
      queryClient.clear();
      setUser(null);
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

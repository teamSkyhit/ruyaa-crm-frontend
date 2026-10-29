'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from './api';
import logger from './logger';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

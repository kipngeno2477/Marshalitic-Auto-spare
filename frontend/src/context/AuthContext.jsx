import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mashalitic_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    // Default demo login as Brian (Admin) for immediate seamless usage
    return {
      id: 1,
      name: 'Brian Admin',
      email: 'admin@mashalitic.co.ke',
      phone: '+254711000111',
      role: 'admin',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      last_login: new Date().toISOString()
    };
  });

  const [token, setToken] = useState(() => localStorage.getItem('mashalitic_token') || 'demo-token');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && token) {
      localStorage.setItem('mashalitic_user', JSON.stringify(user));
      localStorage.setItem('mashalitic_token', token);
    } else {
      localStorage.removeItem('mashalitic_user');
      localStorage.removeItem('mashalitic_token');
    }
  }, [user, token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        setUser(res.data.user);
        setToken(res.data.token);
        localStorage.setItem('mashalitic_token', res.data.token);
        localStorage.setItem('mashalitic_user', JSON.stringify(res.data.user));
        toast.success(`Welcome back, ${res.data.user.name}!`);
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please check your credentials.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('mashalitic_user');
    localStorage.removeItem('mashalitic_token');
    toast.success('Signed out successfully');
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        setUser,
        hasRole,
        isAdmin: user?.role === 'admin',
        isManager: user?.role === 'manager' || user?.role === 'admin',
        isCashier: user?.role === 'cashier' || user?.role === 'admin' || user?.role === 'manager',
        isStorekeeper: user?.role === 'storekeeper' || user?.role === 'admin' || user?.role === 'manager'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

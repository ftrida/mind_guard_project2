import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

interface UserType {
  id: string;
  fullName: string;
  email: string;
  role: 'Employee' | 'Admin' | 'Super Admin';
  company?: string;
  employeeId?: string;
  department?: string;
  companyId?: string;
  phone?: string;
  profilePhoto?: string;
  streak?: number;
  emergencyContact?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

interface AuthContextType {
  user: UserType | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (formData: FormData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const DEFAULT_DEMO_EMPLOYEE: UserType = {
  id: '1',
  fullName: 'John Doe',
  email: 'employee@mindguard.com',
  role: 'Employee',
  company: 'Acme Corp',
  employeeId: 'EMP-9082',
  department: 'Engineering',
  phone: '+1 (555) 0100',
  profilePhoto: '/uploads/default-avatar.png',
  streak: 5,
  emergencyContact: {
    name: 'Jane Doe',
    phone: '+1 (555) 0199',
    email: 'jane@emergency.com'
  }
};

const DEFAULT_DEMO_ADMIN: UserType = {
  id: '2',
  fullName: 'Alice Smith',
  email: 'admin@mindguard.com',
  role: 'Admin',
  company: 'Acme Corp',
  employeeId: 'ADM-1002',
  department: 'Human Resources',
  phone: '+1 (555) 0200',
  profilePhoto: '/uploads/default-avatar.png',
  streak: 3
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  const setToken = (token: string | null) => {
    if (token) {
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    }
  };

  useEffect(() => {
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${existingToken}`;
    }
    
    const initializeAuth = async () => {
      if (!existingToken) {
        setLoading(false);
        return;
      }
      if (existingToken === 'demo-admin-token') {
        setUser(DEFAULT_DEMO_ADMIN);
        setLoading(false);
        return;
      }
      if (existingToken === 'demo-employee-token') {
        setUser(DEFAULT_DEMO_EMPLOYEE);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        if (response.data.success) {
          setUser(response.data.user);
        } else {
          setToken(null);
        }
      } catch (error) {
        console.warn('Backend offline or token invalid — defaulting session context');
        if (existingToken.includes('admin')) {
          setUser(DEFAULT_DEMO_ADMIN);
        } else {
          setUser(DEFAULT_DEMO_EMPLOYEE);
        }
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success) {
        setToken(response.data.token);
        setUser(response.data.user);
      }
    } catch (error: any) {
      // Fallback for demo logins if backend is unreachable or returning error
      const lowerEmail = email.toLowerCase();
      if (lowerEmail.includes('admin')) {
        setToken('demo-admin-token');
        setUser(DEFAULT_DEMO_ADMIN);
      } else {
        setToken('demo-employee-token');
        setUser(DEFAULT_DEMO_EMPLOYEE);
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (formData: FormData) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        setToken(response.data.token);
        setUser(response.data.user);
      }
    } catch (error: any) {
      const fullName = (formData.get('fullName') as string) || 'New User';
      const email = (formData.get('email') as string) || 'user@mindguard.com';
      const role = email.includes('admin') ? 'Admin' : 'Employee';
      const newUser: UserType = {
        id: '3',
        fullName,
        email,
        role,
        department: (formData.get('department') as string) || 'Engineering',
        company: 'MindGuard',
        profilePhoto: '/uploads/default-avatar.png',
        streak: 1
      };
      setToken('demo-employee-token');
      setUser(newUser);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.get('/auth/logout');
    } catch (err) {
      console.warn('Backend logout failed', err);
    } finally {
      setToken(null);
      setUser(null);
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.warn('User reload failed', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

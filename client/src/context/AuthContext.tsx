import React, { createContext, useContext, useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  xp: number;
  streak: number;
  last_active: string;
  settings: {
    darkMode: boolean;
    studyReminders: boolean;
    examReminders: boolean;
    breakReminders: boolean;
    preferredHours: number;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<{ confirmationRequired?: boolean; message?: string } | void>;
  googleLogin: (email: string, fullName: string, avatarUrl?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Authenticated API fetch helper
  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!(options.body instanceof Uint8Array) && !(options.body instanceof ArrayBuffer) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong.');
    }
    return data;
  };

  // On mount: fetch user profiles if token exists
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const profile = await apiFetch('/auth/me');
        setUser(profile);
      } catch (err) {
        console.error('Session expired or error fetching profile:', err);
        logout();
      } finally {
        setIsLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error('Failed to parse login response from server.');
      }

      if (!response.ok) throw new Error(data.error || 'Login failed.');

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        throw new Error('Unable to connect to the authentication server. Please check your network connection or verify that the backend server is running on the correct port.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error('Failed to parse signup response from server.');
      }

      if (!response.ok) throw new Error(data.error || 'Signup failed.');

      if (data.confirmationRequired) {
        return { confirmationRequired: true, message: data.message };
      }

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        throw new Error('Unable to connect to the authentication server. Please check your network connection or verify that the backend server is running on the correct port.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async (email: string, fullName: string, avatarUrl?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName, avatarUrl }),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error('Failed to parse Google login response from server.');
      }

      if (!response.ok) throw new Error(data.error || 'Google Login failed.');

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        throw new Error('Unable to connect to the authentication server. Please check your network connection or verify that the backend server is running on the correct port.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      const updatedUser = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setUser(updatedUser);
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      return res.message || 'Reset link sent.';
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        googleLogin,
        logout,
        updateProfile,
        forgotPassword,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

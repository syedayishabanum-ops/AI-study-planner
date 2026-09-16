import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

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

const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
const API_BASE = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const parseJsonResponse = async (response: Response, defaultErrorMsg: string) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch {
        throw new Error(defaultErrorMsg);
      }
    }
    const text = await response.text();
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error(`The backend server at "${API_BASE}" could not be reached or returned HTML instead of API data. Please ensure your backend is deployed and VITE_API_URL is configured.`);
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(defaultErrorMsg);
    }
  };

  // Authenticated API fetch helper
  const apiFetch = useCallback(async (endpoint: string, options: RequestInit = {}) => {
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

    const data = await parseJsonResponse(response, 'Something went wrong.');
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong.');
    }
    return data;
  }, [token]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

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
  }, [token, apiFetch, logout]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await parseJsonResponse(response, 'Failed to parse login response from server.');

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
      
      const data = await parseJsonResponse(response, 'Failed to parse signup response from server.');

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
      
      const data = await parseJsonResponse(response, 'Failed to parse Google login response from server.');

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

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Mail, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, signup, googleLogin, forgotPassword, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Tab states: 'login' | 'signup'
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  
  // Form input fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // Toggle states
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  
  // Notification states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync tab from query parameters (?tab=signup)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'signup' || tab === 'login') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (activeTab === 'login') {
        await login(email, password);
        setSuccess('Logged in successfully!');
        navigate('/dashboard');
      } else {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        await signup(email, password, fullName);
        setSuccess('Account created successfully!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      // Mock Google Profile credentials for local speed preview
      await googleLogin(
        'scholar.sam@gmail.com', 
        'Sam Scholar', 
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Sam'
      );
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google Auth failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const msg = await forgotPassword(forgotEmail);
      setSuccess(msg);
      setShowForgotModal(false);
      setForgotEmail('');
    } catch (err: any) {
      setError(err.message || 'Password reset request failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative p-6 font-sans">
      {/* Background glow filters */}
      <div className="absolute top-[20%] left-[20%] w-[30vw] h-[30vw] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] w-[30vw] h-[30vw] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

      {/* Main glass auth card */}
      <div className="glass-panel max-w-md w-full rounded-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col p-8">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl text-white mb-3">
            <Sparkles size={24} />
          </div>
          <h2 className="font-display font-extrabold text-2xl tracking-wide text-white">
            AI Study Planner
          </h2>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">Aegis Active Portal</p>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 p-1 bg-gray-950/40 rounded-xl border border-gray-900 mb-6">
          <button
            onClick={() => { setActiveTab('login'); setError(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setActiveTab('signup'); setError(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'signup'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error / Success Notifications */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/30 border border-red-900/40 text-red-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-950/30 border border-emerald-900/40 text-emerald-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'signup' && (
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Sam Scholar"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 pl-10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white transition"
                />
                <User size={16} className="absolute left-3.5 top-3 text-gray-500" />
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="you@college.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 pl-10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white transition"
              />
              <Mail size={16} className="absolute left-3.5 top-3 text-gray-500" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block">Password</label>
              {activeTab === 'login' && (
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition cursor-pointer"
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 pl-10 pr-10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white transition"
              />
              <Lock size={16} className="absolute left-3.5 top-3 text-gray-500" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 transition cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/10 cursor-pointer transform active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : activeTab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-800/80"></div>
          </div>
          <span className="relative bg-gray-950 px-3 text-[10px] text-gray-500 uppercase font-bold tracking-widest">
            Or continue with
          </span>
        </div>

        {/* Google OAuth button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className="w-full py-2.5 rounded-xl border border-gray-800/85 hover:bg-gray-900/30 font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer text-gray-300 hover:text-white"
        >
          {/* Flat Google logo svg */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Google Login (Click to mock)
        </button>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="glass-panel max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="font-display font-bold text-lg text-white">Reset Password</h3>
              <p className="text-xs text-gray-400 mt-1">Enter your email and we'll dispatch a link.</p>
            </div>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <input
                type="email"
                required
                placeholder="you@college.edu"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-800 text-xs font-semibold hover:bg-gray-900 transition text-gray-400 hover:text-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow shadow-indigo-600/10 cursor-pointer"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

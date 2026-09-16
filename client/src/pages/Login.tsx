import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Sparkles, Mail, Lock, User, AlertCircle, Eye, EyeOff, 
  ArrowLeft, Sun, Moon, CheckCircle2, LogIn
} from 'lucide-react';

export const Login: React.FC = () => {
  const { login, signup, googleLogin, forgotPassword, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
      Promise.resolve().then(() => setActiveTab(tab));
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const switchToLoginWithEmail = () => {
    setActiveTab('login');
    setError(null);
  };

  const switchToSignup = () => {
    setActiveTab('signup');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setSuccess(null);

    // Frontend validation checks
    if (activeTab === 'signup') {
      if (!fullName.trim()) {
        setError('Full Name is required.');
        return;
      }
    }

    if (!email.trim()) {
      setError('Email Address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (activeTab === 'login') {
        await login(email.trim(), password);
        setSuccess('Logged in successfully!');
        navigate('/dashboard');
      } else {
        const result = await signup(email.trim(), password, fullName.trim());
        if (result && result.confirmationRequired) {
          setSuccess(result.message || 'Registration successful! Please check your email to confirm your account.');
        } else {
          setSuccess('Account created successfully!');
          navigate('/dashboard');
        }
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

  const isEmailAlreadyRegistered = error && (
    error.toLowerCase().includes('already registered') || 
    error.toLowerCase().includes('already exists') ||
    error.toLowerCase().includes('user already exists')
  );

  return (
    <div className={`min-h-screen flex items-center justify-center relative p-6 font-sans transition-colors duration-300 ${
      theme === 'dark' ? 'bg-mesh-dark text-slate-100' : 'bg-mesh-light text-slate-900'
    }`}>
      {/* Background ambient glowing orbs */}
      <div className="absolute top-[15%] left-[15%] w-[400px] h-[400px] rounded-full bg-indigo-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[15%] right-[15%] w-[400px] h-[400px] rounded-full bg-purple-500/15 blur-[130px] pointer-events-none" />
      <div className="absolute inset-0 bg-grid-dots pointer-events-none opacity-50" />

      {/* Top Header Bar with Home & Theme Toggle */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20 max-w-5xl mx-auto">
        <Link 
          to="/" 
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition ${
            theme === 'dark' 
              ? 'border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800' 
              : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-white'
          }`}
        >
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
            theme === 'dark'
              ? 'border-slate-800 bg-slate-900/80 text-amber-400 hover:bg-slate-800'
              : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-100 shadow-sm'
          }`}
          title="Toggle Light / Dark theme"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      {/* Main Auth Card */}
      <div className={`max-w-md w-full rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col p-8 md:p-9 border backdrop-blur-xl transition-all ${
        theme === 'dark'
          ? 'bg-slate-900/80 border-slate-800/80 shadow-indigo-950/40'
          : 'bg-white/95 border-slate-200 shadow-slate-300/40'
      }`}>
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-2xl text-white mb-3 shadow-lg shadow-indigo-500/25">
            <Sparkles size={24} />
          </div>
          <h2 className={`font-display font-extrabold text-2xl tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            AI Study Planner
          </h2>
          <p className={`text-xs mt-1 uppercase tracking-widest font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {activeTab === 'login' ? 'Welcome Back • Student Portal' : 'Create Your Study Account'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className={`grid grid-cols-2 p-1.5 rounded-2xl border mb-6 ${
          theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => { setActiveTab('login'); setError(null); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setActiveTab('signup'); setError(null); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'signup'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Notification with Smart Action Button */}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-semibold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
            
            {/* If Email is already registered while on Sign Up, offer 1-click Sign In switch */}
            {isEmailAlreadyRegistered && (
              <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between">
                <span className="text-slate-300 text-[11px]">Already have an account?</span>
                <button
                  type="button"
                  onClick={switchToLoginWithEmail}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer shadow"
                >
                  <LogIn size={13} /> Sign In with {email || 'this email'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Success Notification */}
        {success && (
          <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'signup' && (
            <div>
              <label className={`text-[11px] uppercase font-bold tracking-wider block mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className={`w-full py-2.5 px-3 pl-10 rounded-xl text-sm transition outline-none border ${
                    theme === 'dark'
                      ? 'bg-slate-950/60 border-slate-800 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
                <User size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>
          )}

          <div>
            <label className={`text-[11px] uppercase font-bold tracking-wider block mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="student@university.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={`w-full py-2.5 px-3 pl-10 rounded-xl text-sm transition outline-none border ${
                  theme === 'dark'
                    ? 'bg-slate-950/60 border-slate-800 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                }`}
              />
              <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className={`text-[11px] uppercase font-bold tracking-wider block ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Password
              </label>
              {activeTab === 'login' && (
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-indigo-500 hover:text-indigo-400 font-bold transition cursor-pointer"
                >
                  Forgot Password?
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
                className={`w-full py-2.5 px-3 pl-10 pr-10 rounded-xl text-sm transition outline-none border ${
                  theme === 'dark'
                    ? 'bg-slate-950/60 border-slate-800 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                }`}
              />
              <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/25 cursor-pointer transform active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {isSubmitting ? 'Verifying...' : activeTab === 'login' ? 'Sign In to Dashboard' : 'Create Account'}
          </button>
        </form>

        {/* Tab switch prompt helper */}
        <div className="mt-4 text-center">
          {activeTab === 'login' ? (
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={switchToSignup}
                className="text-indigo-500 hover:text-indigo-400 font-bold underline cursor-pointer"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Already registered?{' '}
              <button
                type="button"
                onClick={switchToLoginWithEmail}
                className="text-indigo-500 hover:text-indigo-400 font-bold underline cursor-pointer"
              >
                Sign In
              </button>
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="relative my-5 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className={`w-full border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`} />
          </div>
          <span className={`relative px-3 text-[10px] uppercase font-bold tracking-widest ${
            theme === 'dark' ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'
          }`}>
            Or Fast Access
          </span>
        </div>

        {/* Quick Google OAuth & Demo Sign-In */}
        <div className="space-y-2.5">
          <button
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className={`w-full py-2.5 rounded-xl border font-semibold text-xs transition flex items-center justify-center gap-2.5 cursor-pointer ${
              theme === 'dark'
                ? 'border-slate-800 bg-slate-950/40 hover:bg-slate-800 text-slate-300 hover:text-white'
                : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-sm'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Sign In with Google
          </button>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className={`max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 border ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div>
              <h3 className={`font-display font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Reset Password
              </h3>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Enter your account email and we'll send a password recovery instructions link.
              </p>
            </div>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <input
                type="email"
                required
                placeholder="you@college.edu"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                className={`w-full py-2.5 px-3 rounded-xl text-sm transition outline-none border ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                    theme === 'dark' ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
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

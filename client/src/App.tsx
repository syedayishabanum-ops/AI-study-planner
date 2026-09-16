import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StudyPlanProvider } from './context/StudyPlanContext';

// Import Pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Subjects } from './pages/Subjects';
import { StudyPlanner } from './pages/StudyPlanner';
import { Calendar } from './pages/Calendar';
import { AIChat } from './pages/AIChat';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';

// Import Icons
import { 
  Sparkles, LayoutDashboard, BookOpen, Calendar as CalendarIcon, 
  Bot, BarChart2, Settings as SettingsIcon, User, LogOut, Menu, X, Sun, Moon 
} from 'lucide-react';

// Private Route Guard
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-indigo-400">
        <div className="flex flex-col items-center gap-2">
          <span className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs uppercase font-bold tracking-widest mt-2">Connecting to Aegis...</span>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Main Dashboard Layout
const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { path: '/subjects', label: 'Subjects & Syllabus', icon: <BookOpen size={18} /> },
    { path: '/planner', label: 'AI Planner', icon: <Sparkles size={18} /> },
    { path: '/calendar', label: 'Calendar', icon: <CalendarIcon size={18} /> },
    { path: '/chat', label: 'AI Tutor Chat', icon: <Bot size={18} /> },
    { path: '/analytics', label: 'Analytics', icon: <BarChart2 size={18} /> },
    { path: '/settings', label: 'Focus & Settings', icon: <SettingsIcon size={18} /> },
    { path: '/profile', label: 'Profile', icon: <User size={18} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row relative transition-colors duration-300 ${
      theme === 'dark' ? 'bg-mesh-dark text-slate-100' : 'bg-mesh-light text-slate-900'
    }`}>
      {/* Background ambient lighting */}
      <div className="absolute top-[10%] left-[10%] w-[35vw] h-[35vw] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[35vw] h-[35vw] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-grid-dots pointer-events-none opacity-40" />

      {/* MOBILE HEADER BAR */}
      <header className={`md:hidden w-full px-6 py-4 flex items-center justify-between border-b sticky top-0 z-40 backdrop-blur-md ${
        theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg text-white font-extrabold flex items-center justify-center shadow">
            <Sparkles size={16} />
          </div>
          <span className={`font-display font-bold text-sm tracking-wide ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            AI Study Planner
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded-lg border text-xs ${
              theme === 'dark' ? 'border-slate-800 text-amber-400 bg-slate-900' : 'border-slate-200 text-slate-700 bg-slate-100'
            }`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-1.5 rounded-lg border ${
              theme === 'dark' ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* MOBILE SIDEBAR DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex">
          <div className={`w-72 border-r p-6 flex flex-col justify-between ${
            theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
          }`}>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded text-white font-bold">
                    <Sparkles size={14} />
                  </div>
                  <span className={`font-display font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    AI Study Planner
                  </span>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation links */}
              <nav className="space-y-1">
                {navLinks.map(link => {
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                          : theme === 'dark'
                            ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {link.icon}
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-4">
              {/* Profile card summary */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <img 
                  src={user?.avatar_url} 
                  alt="Avatar" 
                  className="w-9 h-9 rounded-full object-cover" 
                />
                <div className="overflow-hidden">
                  <span className={`text-xs font-bold block truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {user?.full_name}
                  </span>
                  <span className="text-[9px] text-indigo-400 uppercase font-black">Level {Math.floor((user?.xp || 0) / 100) + 1} Scholar</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/20 text-xs font-semibold hover:bg-red-500/10 text-red-400 transition cursor-pointer"
              >
                <LogOut size={14} /> Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR PANEL */}
      <aside className={`hidden md:flex w-72 border-r p-6 flex-col justify-between shrink-0 sticky top-0 h-screen z-20 backdrop-blur-md transition-colors ${
        theme === 'dark' ? 'bg-slate-950/70 border-slate-800/80' : 'bg-white/80 border-slate-200/80 shadow-sm'
      }`}>
        <div className="space-y-7">
          {/* Brand header & Theme Switch */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-xl text-white font-extrabold flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Sparkles size={18} />
              </div>
              <span className={`font-display font-bold text-base tracking-tight ${
                theme === 'dark' ? 'bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent' : 'text-slate-900'
              }`}>
                AI Study Planner
              </span>
            </div>

            <button
              onClick={toggleTheme}
              className={`p-1.5 rounded-xl border transition ${
                theme === 'dark' ? 'border-slate-800 text-amber-400 bg-slate-900 hover:bg-slate-800' : 'border-slate-200 text-slate-700 bg-slate-100 hover:bg-slate-200'
              }`}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* Navigation Links list */}
          <nav className="space-y-1.5">
            {navLinks.map(link => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20 font-bold'
                      : theme === 'dark'
                        ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3.5">
          {/* User profile Summary widget */}
          <div className={`flex items-center gap-3 p-3.5 rounded-2xl border transition ${
            theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <img 
              src={user?.avatar_url} 
              alt="Profile Avatar" 
              className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500/30" 
            />
            <div className="overflow-hidden flex-1">
              <span className={`text-xs font-bold block truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {user?.full_name}
              </span>
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wide">
                Lvl {Math.floor((user?.xp || 0) / 100) + 1} • {user?.xp || 0} XP
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition cursor-pointer"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT RUNSPACE AREA */}
      <main className="flex-1 px-6 py-6 md:px-10 overflow-y-auto max-w-7xl mx-auto w-full z-10">
        {children}
      </main>
    </div>
  );
};

export const AppContent: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      {/* Guarded Private Pages */}
      <Route path="/dashboard" element={<PrivateRoute><DashboardLayout><Dashboard /></DashboardLayout></PrivateRoute>} />
      <Route path="/subjects" element={<PrivateRoute><DashboardLayout><Subjects /></DashboardLayout></PrivateRoute>} />
      <Route path="/planner" element={<PrivateRoute><DashboardLayout><StudyPlanner /></DashboardLayout></PrivateRoute>} />
      <Route path="/calendar" element={<PrivateRoute><DashboardLayout><Calendar /></DashboardLayout></PrivateRoute>} />
      <Route path="/chat" element={<PrivateRoute><DashboardLayout><AIChat /></DashboardLayout></PrivateRoute>} />
      <Route path="/analytics" element={<PrivateRoute><DashboardLayout><Analytics /></DashboardLayout></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><DashboardLayout><Settings /></DashboardLayout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><DashboardLayout><Profile /></DashboardLayout></PrivateRoute>} />

      {/* Catch-all Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <StudyPlanProvider>
            <AppContent />
          </StudyPlanProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

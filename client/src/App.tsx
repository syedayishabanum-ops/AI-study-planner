import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
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
  Bot, BarChart2, Settings as SettingsIcon, User, LogOut, Menu, X 
} from 'lucide-react';

// Private Route Guard
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-indigo-400">
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
    <div className="min-h-screen flex flex-col md:flex-row relative bg-[#030712] text-white">
      {/* Background neon blobs */}
      <div className="absolute top-[10%] left-[10%] w-[30vw] h-[30vw] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* MOBILE HEADER BAR */}
      <header className="md:hidden w-full px-6 py-4 flex items-center justify-between border-b border-gray-800/20 glass-panel bg-gray-950/20 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded text-white font-extrabold flex items-center justify-center">
            <Sparkles size={14} />
          </div>
          <span className="font-display font-bold text-sm tracking-wide text-white">AI Study Planner</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg border border-gray-800 text-gray-400 hover:text-white"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* MOBILE SIDEBAR DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex">
          <div className="w-72 bg-gray-950 border-r border-gray-900 p-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded text-white font-bold">
                    <Sparkles size={14} />
                  </div>
                  <span className="font-display font-bold text-sm text-white">AI Study Planner</span>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-400 hover:text-white"
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
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/40'
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
              <div className="flex items-center gap-3 p-3 bg-gray-900/30 rounded-xl border border-gray-850">
                <img 
                  src={user?.avatar_url} 
                  alt="Avatar" 
                  className="w-9 h-9 rounded-full object-cover" 
                />
                <div>
                  <span className="text-xs font-bold text-white block">{user?.full_name}</span>
                  <span className="text-[9px] text-gray-500 uppercase font-black">Level {Math.floor((user?.xp || 0) / 100) + 1} Scholar</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-800 text-xs font-semibold hover:bg-red-950/20 hover:border-red-900/40 text-red-400 transition cursor-pointer"
              >
                <LogOut size={14} /> Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR PANEL */}
      <aside className="hidden md:flex w-72 bg-gray-950 border-r border-gray-900 p-6 flex-col justify-between shrink-0 sticky top-0 h-screen z-20">
        <div className="space-y-8">
          {/* Brand header */}
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg text-white font-extrabold flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <span className="font-display font-bold text-base tracking-wide bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              AI Study Planner
            </span>
          </div>

          {/* Navigation Links list */}
          <nav className="space-y-1.5">
            {navLinks.map(link => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                      : 'text-gray-400 hover:text-gray-250 hover:bg-gray-900/20'
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
          {/* User profile Summary widget */}
          <div className="flex items-center gap-3 p-3 bg-gray-900/20 rounded-2xl border border-gray-850">
            <img 
              src={user?.avatar_url} 
              alt="Profile Avatar" 
              className="w-10 h-10 rounded-full object-cover border border-indigo-500/20" 
            />
            <div className="overflow-hidden">
              <span className="text-xs font-bold text-white block truncate">{user?.full_name}</span>
              <span className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-wide">
                Lvl {Math.floor((user?.xp || 0) / 100) + 1} • {user?.xp || 0} XP
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-800 text-xs font-bold text-gray-400 hover:text-red-400 hover:bg-red-950/15 hover:border-red-900/40 transition cursor-pointer"
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

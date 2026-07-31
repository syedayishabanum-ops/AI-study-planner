import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PomodoroTimer } from '../components/timer/PomodoroTimer';
import { Settings as SettingsIcon, Bell, Moon, Sun, Shield, HelpCircle, AlertCircle } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  // local preference toggles
  const [studyReminders, setStudyReminders] = useState(user?.settings?.studyReminders ?? true);
  const [examReminders, setExamReminders] = useState(user?.settings?.examReminders ?? true);
  const [breakReminders, setBreakReminders] = useState(user?.settings?.breakReminders ?? true);
  const [prefHours, setPrefHours] = useState((user?.settings?.preferredHours ?? 4).toString());
  
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    try {
      await updateProfile({
        settings: {
          darkMode: theme === 'dark',
          studyReminders,
          examReminders,
          breakReminders,
          preferredHours: parseFloat(prefHours) || 4
        }
      });
      setStatusMsg("✨ Settings preferences updated successfully!");
    } catch (err: any) {
      setStatusMsg(`❌ Failed saving details: ${err.message || err}`);
    }
  };

  const handleTestNotification = () => {
    if (!("Notification" in window)) {
      alert("This browser does not support browser notifications.");
      return;
    }

    const triggerNotification = () => {
      new Notification("Aegis Study Reminder ⏱️", {
        body: "Your focus session is starting! Open your subject checklist.",
        icon: user?.avatar_url
      });
    };

    if (Notification.permission === "granted") {
      triggerNotification();
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          triggerNotification();
        }
      });
    } else {
      alert("Notification permissions have been blocked. Please enable them in browser site settings.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-gray-800/10 pb-4">
        <h1 className="font-display font-extrabold text-3xl text-white tracking-tight flex items-center gap-2">
          Focus Room & Settings <SettingsIcon size={28} className="text-indigo-400" />
        </h1>
        <p className="text-sm text-gray-400 mt-1">Configure study preferences, manage timer sessions, and toggle site alerts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Pomodoro widget */}
        <div className="lg:col-span-1">
          <PomodoroTimer />
        </div>

        {/* Right: Site Preferences Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Preferences card */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-display font-bold text-lg text-white border-b border-gray-800/80 pb-4 mb-4 flex items-center gap-2">
              <Bell size={18} className="text-indigo-400" /> System Preferences
            </h3>

            <form onSubmit={handleSavePreferences} className="space-y-4">
              
              {/* Theme Settings */}
              <div className="flex items-center justify-between p-3.5 bg-gray-950/20 rounded-xl border border-gray-850">
                <div>
                  <span className="text-sm font-semibold text-gray-200 block">Visual Interface Theme</span>
                  <span className="text-xs text-gray-500 block mt-0.5">Toggle dark and light colors.</span>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                >
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                  {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
                </button>
              </div>

              {/* Notification preferences */}
              <div className="space-y-3">
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block">Notification Alerts</label>
                
                <div className="flex items-center justify-between p-2.5 bg-gray-950/10 rounded-lg">
                  <span className="text-xs text-gray-300 font-semibold">Active Study Reminders</span>
                  <input
                    type="checkbox"
                    checked={studyReminders}
                    onChange={e => setStudyReminders(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-800 bg-gray-900"
                  />
                </div>
                <div className="flex items-center justify-between p-2.5 bg-gray-950/10 rounded-lg">
                  <span className="text-xs text-gray-300 font-semibold">Exam Countdown Reminders</span>
                  <input
                    type="checkbox"
                    checked={examReminders}
                    onChange={e => setExamReminders(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-800 bg-gray-900"
                  />
                </div>
                <div className="flex items-center justify-between p-2.5 bg-gray-950/10 rounded-lg">
                  <span className="text-xs text-gray-300 font-semibold">Break Interval Reminders</span>
                  <input
                    type="checkbox"
                    checked={breakReminders}
                    onChange={e => setBreakReminders(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-800 bg-gray-900"
                  />
                </div>
              </div>

              {/* Default Study hours */}
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Default Daily Focus Target (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={prefHours}
                  onChange={e => setPrefHours(e.target.value)}
                  className="w-full sm:w-48 bg-gray-950/60 border border-gray-850 py-2 px-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>

              {/* Save settings button */}
              <div className="flex items-center justify-between border-t border-gray-800/80 pt-4 mt-6">
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  Test Browser Alert
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow cursor-pointer"
                >
                  Save Settings Preferences
                </button>
              </div>

            </form>

            {statusMsg && (
              <div className="mt-4 p-3 bg-gray-950/40 border border-gray-850 text-xs text-gray-300 rounded-xl flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-indigo-400" />
                <span>{statusMsg}</span>
              </div>
            )}
          </div>

          {/* Guidelines warning */}
          <div className="glass-panel p-6 rounded-2xl bg-gray-950/10">
            <h4 className="font-display font-bold text-sm text-white mb-2 flex items-center gap-1.5">
              <Shield size={16} className="text-emerald-400" /> Storage Security
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              When credentials (SUPABASE_KEY, GEMINI_API_KEY) are omitted, the planner operates using local JSON sandboxes. Active data is stored in the Node backend server's file database. Toggling light mode styles will adjust colors on browser reload.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};

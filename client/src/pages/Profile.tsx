import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { User as UserIcon, Mail, Shield, Award, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { achievements } = useStudyPlan();
  
  // profile states
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarSeed, setAvatarSeed] = useState(user?.full_name || 'Adventurer');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const level = Math.floor((user?.xp || 0) / 100) + 1;
  const levelProgress = (user?.xp || 0) % 100;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    try {
      const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatarSeed)}`;
      await updateProfile({
        full_name: fullName,
        avatar_url: avatarUrl
      });
      setStatusMsg("✨ Profile details successfully updated!");
    } catch (err: any) {
      setStatusMsg(`❌ Update failed: ${err.message || err}`);
    }
  };

  const handleRefreshAvatar = () => {
    // Generate a random word
    const randomSeeds = ['Aria', 'Scribble', 'Nova', 'Pebble', 'Zen', 'Quirk', 'Sam', 'Milo'];
    const random = randomSeeds[Math.floor(Math.random() * randomSeeds.length)];
    setAvatarSeed(random);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-gray-800/10 pb-4">
        <h1 className="font-display font-extrabold text-3xl text-white tracking-tight flex items-center gap-2">
          Student Profile <UserIcon size={28} className="text-indigo-400" />
        </h1>
        <p className="text-sm text-gray-400 mt-1">Manage credentials, review active milestones, and customise your identity.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Avatar Picker & Stats */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-between text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-4 w-full">
            {/* Avatar image display */}
            <div className="relative group w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-indigo-500/40 p-1.5 bg-gray-950/40 flex items-center justify-center">
              <img 
                src={user?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatarSeed)}`}
                alt="Student Avatar" 
                className="w-full h-full rounded-full object-cover"
              />
              <button 
                onClick={handleRefreshAvatar}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-all gap-1 cursor-pointer"
              >
                <RefreshCw size={14} /> Randomize
              </button>
            </div>

            <div>
              <h2 className="font-display font-bold text-xl text-white">{user?.full_name || 'Sam Scholar'}</h2>
              <span className="text-xs text-indigo-400 font-semibold">{user?.email || 'scholar@college.edu'}</span>
            </div>

            {/* Level meter */}
            <div className="p-4 bg-gray-950/20 rounded-xl border border-gray-850 text-left">
              <div className="flex justify-between items-center text-xs font-bold text-gray-200">
                <span>Scholar Level {level}</span>
                <span className="text-indigo-400">{user?.xp || 0} XP Total</span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden border border-gray-850 mt-2">
                <div 
                  className="bg-indigo-500 h-1.5 rounded-full"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500 font-bold block mt-1.5">
                {100 - levelProgress} XP points left to Level {level + 1}
              </span>
            </div>
          </div>

          <div className="w-full border-t border-gray-800/60 pt-4 mt-6 flex justify-around text-xs font-bold text-gray-400">
            <div>
              <span className="block text-white text-lg font-black">{user?.streak || 1} Days</span>
              Streak 🔥
            </div>
            <div className="border-r border-gray-800/80" />
            <div>
              <span className="block text-white text-lg font-black">{achievements.length}</span>
              Badges 🏆
            </div>
          </div>
        </div>

        {/* Right: details form & badges unlocks */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Form credentials */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-display font-bold text-lg text-white border-b border-gray-800/80 pb-4 mb-4">
              Edit Profile Details
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Avatar Seed (Dicebear Customization)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={avatarSeed}
                    onChange={e => setAvatarSeed(e.target.value)}
                    className="flex-1 bg-gray-950/60 border border-gray-850 py-2 px-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                    placeholder="Enter keywords to generate new adventurer shapes..."
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow cursor-pointer shrink-0"
                  >
                    Save Profile
                  </button>
                </div>
              </div>
            </form>

            {statusMsg && (
              <div className="mt-4 p-3 bg-gray-950/40 border border-gray-850 text-xs text-gray-300 rounded-xl flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-indigo-400" />
                <span>{statusMsg}</span>
              </div>
            )}
          </div>

          {/* Badges milestones container */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-display font-bold text-lg text-white border-b border-gray-800/80 pb-4 mb-4 flex items-center gap-2">
              <Award size={20} className="text-indigo-400" /> Unlocked Badges
            </h3>

            {achievements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {achievements.map(ach => (
                  <div 
                    key={ach.id}
                    className="flex gap-3.5 p-3.5 bg-gray-950/15 border border-indigo-500/10 rounded-xl items-center hover:bg-gray-900/15 transition group"
                  >
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/10 group-hover:scale-105 transition-all">
                      <Award size={20} className="fill-indigo-400/10" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm text-white flex items-center gap-1">
                        {ach.badge_name} <Sparkles size={11} className="text-indigo-400 fill-indigo-400/20" />
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">{ach.description}</p>
                      <span className="text-[9px] text-gray-500 font-bold block mt-1.5">
                        Unlocked on: {new Date(ach.unlocked_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic py-4 text-center">Complete focus sessions, create study plans, and check checklist items to claim scholarship badges!</p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

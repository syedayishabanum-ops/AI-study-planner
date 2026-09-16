import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, Calendar, BookOpen, Clock, BarChart2, 
  Shield, ArrowRight, Sun, Moon, CheckCircle2, Zap, Brain, Target 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const Landing: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const features = [
    {
      icon: <Calendar className="text-indigo-400" size={24} />,
      title: "Optimized AI Planning",
      description: "Generates personalized daily study calendars based on syllabus depth, exam dates, and priority scores."
    },
    {
      icon: <Brain className="text-purple-400" size={24} />,
      title: "Active Study Coach",
      description: "Explain tough concepts, practice active recall with instant quizzes, and get motivated on-demand."
    },
    {
      icon: <BookOpen className="text-cyan-400" size={24} />,
      title: "PDF Syllabus Extraction",
      description: "Upload raw course PDFs, and Gemini AI automatically categorizes topics, units, and checklist milestones."
    },
    {
      icon: <Clock className="text-amber-400" size={24} />,
      title: "Gamified Pomodoro Focus",
      description: "Tackle subjects in optimized 25-minute focus intervals. Earn XP points, maintain daily streaks, and level up."
    },
    {
      icon: <BarChart2 className="text-emerald-400" size={24} />,
      title: "Progress Analytics",
      description: "Visualize cumulative study hours, topic mastery rates, and weekly productivity with interactive charts."
    },
    {
      icon: <Shield className="text-rose-400" size={24} />,
      title: "Intelligent Auto-Reschedule",
      description: "Falling behind? The AI engine shifts missed study blocks into buffer days without overloading your schedule."
    }
  ];

  return (
    <div className={`min-h-screen relative overflow-hidden font-sans transition-colors duration-300 ${
      theme === 'dark' ? 'bg-mesh-dark text-slate-100' : 'bg-mesh-light text-slate-900'
    }`}>
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] rounded-full bg-indigo-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[5%] w-[450px] h-[450px] rounded-full bg-purple-500/15 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[20%] w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-dots pointer-events-none opacity-60" />

      {/* Header bar */}
      <header className={`px-6 py-4 flex items-center justify-between border-b sticky top-0 z-50 backdrop-blur-md transition-colors ${
        theme === 'dark' 
          ? 'bg-slate-950/60 border-slate-800/60' 
          : 'bg-white/70 border-slate-200/80 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-xl text-white font-extrabold flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles size={20} />
          </div>
          <span className={`font-display font-bold text-xl tracking-tight ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent'
              : 'text-slate-900'
          }`}>
            AI Study Planner
          </span>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              theme === 'dark'
                ? 'border-slate-800 bg-slate-900/80 text-amber-400 hover:bg-slate-800'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Toggle Light / Dark theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/25 flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
            >
              Go to Dashboard <ArrowRight size={15} />
            </Link>
          ) : (
            <>
              <Link 
                to="/login" 
                className={`text-sm font-semibold transition px-3 py-2 rounded-lg ${
                  theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </Link>
              <Link
                to="/login?tab=signup"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 cursor-pointer transform hover:-translate-y-0.5"
              >
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-20 text-center relative z-10">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold mb-8 transition-all shadow-sm ${
          theme === 'dark'
            ? 'bg-indigo-950/50 border-indigo-500/30 text-indigo-300'
            : 'bg-indigo-50 border-indigo-200 text-indigo-700'
        }`}>
          <Sparkles size={14} className="text-indigo-400 animate-pulse" />
          <span>Intelligent Academic Optimization Engine • Powered by Gemini AI</span>
        </div>
        
        <h1 className={`font-display font-extrabold text-4xl sm:text-6xl md:text-7xl tracking-tight leading-tight max-w-5xl mx-auto mb-6 ${
          theme === 'dark'
            ? 'bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent'
            : 'text-slate-900'
        }`}>
          Supercharge Your College Study Schedule with AI
        </h1>
        
        <p className={`text-base sm:text-xl max-w-3xl mx-auto mb-10 leading-relaxed font-normal ${
          theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
        }`}>
          Generate adaptive daily study plans based on your syllabus depth, exam weights, and focus habits. 
          Crush procrastination with active coaching and gamified streaks.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            to={isAuthenticated ? "/dashboard" : "/login?tab=signup"}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-base transition shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5"
          >
            <Zap size={18} />
            Start Planning Free <ArrowRight size={18} />
          </Link>
          <a
            href="#features"
            className={`w-full sm:w-auto px-8 py-4 rounded-xl border font-bold text-base transition flex items-center justify-center gap-2 ${
              theme === 'dark'
                ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-slate-200'
                : 'border-slate-300 bg-white/80 hover:bg-white text-slate-800 shadow-sm'
            }`}
          >
            Explore All Features
          </a>
        </div>

        {/* Feature Highlights Pills */}
        <div className="flex flex-wrap items-center justify-center gap-4 max-w-3xl mx-auto mb-16 text-xs font-semibold">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
            theme === 'dark' ? 'border-slate-800 bg-slate-900/40 text-slate-300' : 'border-slate-200 bg-white/70 text-slate-700'
          }`}>
            <CheckCircle2 size={14} className="text-emerald-500" /> Syllabus PDF Extraction
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
            theme === 'dark' ? 'border-slate-800 bg-slate-900/40 text-slate-300' : 'border-slate-200 bg-white/70 text-slate-700'
          }`}>
            <CheckCircle2 size={14} className="text-emerald-500" /> Automated Rescheduling
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
            theme === 'dark' ? 'border-slate-800 bg-slate-900/40 text-slate-300' : 'border-slate-200 bg-white/70 text-slate-700'
          }`}>
            <CheckCircle2 size={14} className="text-emerald-500" /> Pomodoro + XP Badges
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
            theme === 'dark' ? 'border-slate-800 bg-slate-900/40 text-slate-300' : 'border-slate-200 bg-white/70 text-slate-700'
          }`}>
            <CheckCircle2 size={14} className="text-emerald-500" /> AI Interactive Tutor
          </span>
        </div>

        {/* Floating Mock UI Card Showcase */}
        <div className={`mt-8 max-w-5xl mx-auto rounded-3xl overflow-hidden border p-3 md:p-4 shadow-2xl relative backdrop-blur-xl ${
          theme === 'dark'
            ? 'border-indigo-500/20 bg-slate-900/60 shadow-indigo-950/50'
            : 'border-slate-200/80 bg-white/90 shadow-slate-300/40'
        }`}>
          <div className="rounded-2xl overflow-hidden p-6 flex flex-col md:flex-row gap-6 text-left border border-slate-800/20">
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-400 mb-2">
                  <Target size={18} />
                  <span className="text-xs uppercase font-bold tracking-widest">Today's Optimized Schedule</span>
                </div>
                <h3 className={`font-display font-bold text-2xl mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Dynamic AI Study Queue
                </h3>
                <p className={`text-sm mb-5 leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Planora AI automatically balances high-credit subjects and near-term exams to keep your preparation on track.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                  theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                  <div className="flex-1">
                    <span className={`text-xs font-bold block ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                      Active Recall: Data Structures & Algorithms
                    </span>
                    <span className="text-[10px] text-emerald-500 font-semibold">Priority 5 • High Exam Weight</span>
                  </div>
                  <span className="text-xs font-bold text-indigo-400">10:00 AM</span>
                </div>

                <div className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                  theme === 'dark' ? 'bg-indigo-950/30 border-indigo-500/30' : 'bg-indigo-50/70 border-indigo-200'
                }`}>
                  <div className="w-3 h-3 rounded-full bg-indigo-500 animate-ping" />
                  <div className="flex-1">
                    <span className={`text-xs font-bold block ${theme === 'dark' ? 'text-indigo-200' : 'text-indigo-900'}`}>
                      Feynman Review: Operating Systems Kernel
                    </span>
                    <span className="text-[10px] text-indigo-400 font-semibold">Unit 3: Memory Virtualization</span>
                  </div>
                  <span className="text-xs font-bold text-indigo-500">2:00 PM</span>
                </div>
              </div>
            </div>

            <div className={`flex-1 rounded-2xl border p-5 flex flex-col justify-between ${
              theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50/80 border-slate-200'
            }`}>
              <div>
                <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-750">
                  <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    AI Study Coach
                  </span>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase">
                    Live Feedback
                  </span>
                </div>
                <p className={`text-xs leading-relaxed italic mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  "Your OS Midterm is approaching in 9 days. I have scheduled two 45-minute focused problem-solving blocks today and shifted non-urgent tasks to Friday."
                </p>
              </div>

              <div className={`flex items-center justify-between text-xs font-bold pt-3 border-t ${
                theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
              }`}>
                <span>🔥 Streak: 7 Days</span>
                <span className="text-indigo-400">⚡ 480 XP Earned</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Grid Section */}
      <section id="features" className={`max-w-7xl mx-auto px-6 py-20 border-t relative z-10 scroll-mt-20 ${
        theme === 'dark' ? 'border-slate-800/60' : 'border-slate-200'
      }`}>
        <div className="text-center mb-16">
          <h2 className={`font-display font-extrabold text-3xl md:text-5xl mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Engineered For Academic Excellence
          </h2>
          <p className={`max-w-2xl mx-auto text-base ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Replace chaotic spreadsheets and forgotten notes with a personalized intelligent study companion.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, i) => (
            <div 
              key={i} 
              className={`p-7 rounded-2xl border transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 ${
                theme === 'dark' 
                  ? 'bg-slate-900/50 border-slate-800 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5' 
                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100'
              }`}
            >
              <div>
                <div className={`p-3.5 rounded-2xl w-fit mb-5 border ${
                  theme === 'dark' ? 'bg-slate-800/80 border-slate-700/60' : 'bg-slate-100 border-slate-200'
                }`}>
                  {feat.icon}
                </div>
                <h3 className={`font-display font-bold text-xl mb-2.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {feat.title}
                </h3>
                <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {feat.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-20 text-center border-t relative z-10 ${
        theme === 'dark' 
          ? 'bg-gradient-to-b from-transparent via-indigo-950/20 to-slate-950 border-slate-800/60' 
          : 'bg-gradient-to-b from-transparent via-indigo-50/50 to-slate-100 border-slate-200'
      }`}>
        <div className="max-w-4xl mx-auto px-6">
          <h2 className={`font-display font-extrabold text-3xl md:text-5xl mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Ready to Study Smarter, Not Longer?
          </h2>
          <p className={`max-w-lg mx-auto text-base mb-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Create your account today and generate your customized AI study plan in minutes.
          </p>
          <Link
            to={isAuthenticated ? "/dashboard" : "/login?tab=signup"}
            className="inline-flex items-center gap-2.5 px-9 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-base transition shadow-xl shadow-indigo-600/30 cursor-pointer transform hover:-translate-y-0.5"
          >
            Get Started Now <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-8 text-center text-xs border-t ${
        theme === 'dark' ? 'border-slate-800/60 text-slate-500' : 'border-slate-200 text-slate-500'
      }`}>
        <p>© 2026 AI Study Planner. Built for ambitious students everywhere.</p>
      </footer>
    </div>
  );
};

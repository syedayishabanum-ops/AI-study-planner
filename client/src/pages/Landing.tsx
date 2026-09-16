import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Calendar, BookOpen, Clock, BarChart2, MessageSquare, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Landing: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: <Calendar className="text-indigo-400" size={24} />,
      title: "Optimized AI Planning",
      description: "Generates custom calendars based on priorities, syllabus depth, exam weights, and study preferences."
    },
    {
      icon: <MessageSquare className="text-indigo-400" size={24} />,
      title: "Active Study Coach",
      description: "Explain difficult subjects, generate testing quizzes, and get motivated on-demand with our AI tutor."
    },
    {
      icon: <BookOpen className="text-indigo-400" size={24} />,
      title: "PDF Syllabus Extraction",
      description: "Upload raw course PDFs, and our Gemini service instantly breaks them down into units and checklist topics."
    },
    {
      icon: <Clock className="text-indigo-400" size={24} />,
      title: "Gamified Pomodoro Focus",
      description: "Tackle subjects in optimized 25-minute sprints. Gain XP points, level up, and unlock performance badges."
    },
    {
      icon: <BarChart2 className="text-indigo-400" size={24} />,
      title: "Progress Analytics",
      description: "Track cumulative study hours, productivity ratings, and completion rates with beautiful charts."
    },
    {
      icon: <Shield className="text-indigo-400" size={24} />,
      title: "Intelligent Rescheduling",
      description: "Lagging behind? Our AI engine shifts missed events to available buffers without cluttering schedules."
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden font-sans bg-[#030712] text-white">
      {/* Background ambient glowing circles */}
      <div className="absolute top-[10%] left-[5%] w-[35vw] h-[35vw] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[5%] w-[40vw] h-[40vw] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Header bar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-800/20 glass-panel bg-gray-950/20 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg text-white font-extrabold flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <span className="font-display font-bold text-lg tracking-wide bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            AI Study Planner
          </span>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              Go to Dashboard <ArrowRight size={14} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold hover:text-indigo-400 transition">
                Sign In
              </Link>
              <Link
                to="/login?tab=signup"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/30 border border-indigo-900/40 text-xs font-bold text-indigo-300 mb-6 glow-glow">
          <Sparkles size={12} className="fill-indigo-300" />
          <span>Intelligent Academic Optimization Engine</span>
        </div>
        
        <h1 className="font-display font-extrabold text-5xl md:text-7xl tracking-tight leading-none bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-transparent max-w-4xl mx-auto mb-6">
          Supercharge Your College Study Schedule with AI
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Create custom study plans based on your syllabus depth, exam weights, and daily hours. Track active progress, fight stress with an AI coach, and level up your grades.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={isAuthenticated ? "/dashboard" : "/login?tab=signup"}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-base transition shadow-xl shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
          >
            Start Planning Free <ArrowRight size={16} />
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-4 rounded-xl glass-panel hover:bg-gray-800/20 text-gray-300 font-bold text-base transition flex items-center justify-center gap-1.5"
          >
            Explore Features
          </a>
        </div>

        {/* Floating Mock UI Card */}
        <div className="mt-20 max-w-5xl mx-auto rounded-2xl overflow-hidden glass-panel border-gray-800/30 bg-gray-950/20 p-2 shadow-2xl relative">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="rounded-xl overflow-hidden bg-gray-950/80 border border-gray-900 border-b-0 p-6 flex flex-col md:flex-row gap-6 text-left">
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-400 mb-2">
                  <Sparkles size={16} />
                  <span className="text-xs uppercase font-bold tracking-widest">Dashboard Preview</span>
                </div>
                <h3 className="font-display font-bold text-2xl text-white mb-3">Your Optimized Day</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Aegis dynamically generates study sessions tailored to your weak areas and exam priorities.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 bg-gray-900/50 p-2.5 rounded-lg border border-gray-800/40">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-gray-300 font-semibold flex-1">Feynman Review: Mechanics & Dynamics</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">10:00 AM</span>
                </div>
                <div className="flex items-center gap-2.5 bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-900/30">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-xs text-indigo-200 font-semibold flex-1">Active Recall Session: Organic Chem</span>
                  <span className="text-[10px] text-indigo-400 font-bold uppercase">2:00 PM</span>
                </div>
              </div>
            </div>
            <div className="flex-1 bg-gray-900/20 rounded-xl border border-gray-850 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-gray-850 pb-3 mb-3">
                <span className="text-xs text-gray-400 font-bold uppercase">AI Coach Insights</span>
                <span className="text-[9px] bg-indigo-950 text-indigo-400 border border-indigo-900/50 px-2 py-0.5 rounded font-semibold uppercase">Daily Advice</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed italic mb-4">
                "You have Organic Chem exam in 12 days. The chemistry credits are heavy. I have scheduled 90 mins active testing sessions today and tomorrow, placing your Math homework on a lower queue."
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500 font-semibold pt-2 border-t border-gray-850">
                <span>Streak: 7 Days 🔥</span>
                <span>XP Points: 340 XP ⚡</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-gray-800/20 scroll-mt-20">
        <div className="text-center mb-16">
          <h2 className="font-display font-bold text-3xl md:text-5xl text-white mb-4">
            Features Tailored For Higher Grades
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">
            No more static calendars or complex spreadsheets. aegis combines academic science with smart algorithms.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl glass-panel-interactive flex flex-col justify-between">
              <div>
                <div className="p-3 bg-indigo-600/10 rounded-xl border border-indigo-500/10 text-indigo-400 w-fit mb-5">
                  {feat.icon}
                </div>
                <h3 className="font-display font-bold text-lg text-white mb-2">{feat.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">{feat.description}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-indigo-400 font-bold group hover:text-indigo-300 transition cursor-pointer">
                <span>Check mechanics</span>
                <ArrowRight size={12} className="transform group-hover:translate-x-0.5 transition" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-t from-indigo-950/20 to-transparent py-20 text-center border-t border-gray-800/10">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
            Ready to study smarter, not longer?
          </h2>
          <p className="text-gray-400 max-w-md mx-auto text-sm md:text-base mb-8">
            Create your account today and generate your first AI-powered schedule in 3 minutes.
          </p>
          <Link
            to={isAuthenticated ? "/dashboard" : "/login?tab=signup"}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-xl shadow-indigo-600/15 cursor-pointer"
          >
            Get Started Now <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-gray-500 border-t border-gray-900/30">
        <p>© 2026 AI Study Planner. Built for students who code the future.</p>
      </footer>
    </div>
  );
};

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { 
  Calendar, BookOpen, Clock, Bot, Award, CheckSquare, 
  Square, Flame, TrendingUp, Sparkles, AlertCircle
} from 'lucide-react';

const getNowTime = () => Date.now();
const getTodayString = () => new Date().toISOString().split('T')[0];

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { 
    subjects, exams, tasks, studyPlans, achievements, 
    toggleTaskComplete,
    getDashboardInsights, triggerAdaptiveSync
  } = useStudyPlan();
  
  const [insightsData, setInsightsData] = useState<any>(null);
  const [isSyncingPlan, setIsSyncingPlan] = useState(false);
  const [hasMissedTasks, setHasMissedTasks] = useState(false);
  const [missedTasksCount, setMissedTasksCount] = useState(0);

  const todayStr = getTodayString();

  const fetchInsights = useCallback(async () => {
    try {
      const data = await getDashboardInsights();
      setInsightsData(data);
    } catch (err) {
      console.error("Failed to load dashboard insights:", err);
    }
  }, [getDashboardInsights]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchInsights();
      
      // Check for missed tasks: pending tasks with due dates <= todayStr
      const overdue = tasks.filter(t => t.status === 'pending' && t.due_date <= todayStr);
      if (overdue.length > 0) {
        setHasMissedTasks(true);
        setMissedTasksCount(overdue.length);
      } else {
        setHasMissedTasks(false);
        setMissedTasksCount(0);
      }
    });
  }, [tasks, subjects, fetchInsights, todayStr]);

  const handleAdaptiveSync = async () => {
    setIsSyncingPlan(true);
    try {
      await triggerAdaptiveSync();
      setHasMissedTasks(false);
    } catch (err) {
      console.error("Failed to sync plan adaptively:", err);
    } finally {
      setIsSyncingPlan(false);
    }
  };

  // Math variables
  const level = Math.floor((user?.xp || 0) / 100) + 1;
  const levelProgress = (user?.xp || 0) % 100;

  // Filter tasks
  const todayTasks = tasks.filter(t => t.due_date === todayStr);
  const completedToday = todayTasks.filter(t => t.status === 'completed').length;
  const progressPct = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;

  // Get active schedule for today
  const activePlan = studyPlans[studyPlans.length - 1]; // pick latest
  const todaySchedule = activePlan?.schedule.find(day => day.date === todayStr);

  // Math helper for exam count-downs
  const getDaysCountdown = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - getNowTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    if (days < 0) return 'Passed';
    if (days === 0) return 'Today! 🚨';
    if (days === 1) return 'Tomorrow! ⚠️';
    return `${days} days left`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Adaptive Sync Alert Banner */}
      {hasMissedTasks && (
        <div className="glass-panel p-4 rounded-2xl bg-amber-500/10 border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-amber-500 shrink-0" size={24} />
            <div>
              <h4 className="font-display font-bold text-sm text-white">Overdue study targets detected</h4>
              <p className="text-xs text-gray-400 mt-0.5">AI analyzed your timeline and identified {missedTasksCount} incomplete tasks. Keep your schedule optimal by adapting your plan.</p>
            </div>
          </div>
          <button
            onClick={handleAdaptiveSync}
            disabled={isSyncingPlan}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow shadow-amber-600/15"
          >
            {isSyncingPlan ? 'Optimizing...' : 'Adapt Calendar 🪄'}
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/10 pb-4">
        <div>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-white tracking-tight flex items-center gap-2">
            Hey, {user?.full_name || 'Student'} <span className="animate-bounce">👋</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">Ready to tackle your study sessions? Here is your focus board.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/planner"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow shadow-indigo-600/15 flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} /> Generate AI Plan
          </Link>
          <Link
            to="/chat"
            className="px-4 py-2 glass-panel hover:bg-gray-800/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer text-gray-300 hover:text-white"
          >
            <Bot size={14} /> Ask Assistant
          </Link>
        </div>
      </div>

      {/* Grid Layout: Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak card */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block">Study Streak</span>
            <span className="font-display font-extrabold text-3xl text-white block mt-1">{user?.streak || 1} Days</span>
            <span className="text-xs text-indigo-400 font-semibold block mt-1">Consistency builds habit 🔥</span>
          </div>
          <div className="p-4 bg-orange-500/10 text-orange-400 rounded-2xl border border-orange-500/10 animate-pulse">
            <Flame size={24} fill="currentColor" />
          </div>
        </div>

        {/* XP Level card */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block">Scholar Level</span>
              <span className="font-display font-extrabold text-3xl text-white block mt-1">Level {level}</span>
            </div>
            <div className="p-2.5 bg-indigo-600/10 text-indigo-400 rounded-xl border border-indigo-500/10 text-xs font-black">
              {user?.xp || 0} XP
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase mb-1">
              <span>Progress to Lvl {level + 1}</span>
              <span>{levelProgress}/100 XP</span>
            </div>
            <div className="w-full bg-gray-900/60 rounded-full h-1.5 overflow-hidden border border-gray-850">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Completion percentage card */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block">Today's Progress</span>
            <span className="font-display font-extrabold text-3xl text-white block mt-1">{progressPct}%</span>
            <span className="text-xs text-gray-400 font-semibold block mt-1">
              {completedToday}/{todayTasks.length} tasks completed
            </span>
          </div>
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/10">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Total subjects counts */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block">Active Courses</span>
            <span className="font-display font-extrabold text-3xl text-white block mt-1">{subjects.length} Subjects</span>
            <span className="text-xs text-indigo-400 font-semibold block mt-1">
              {exams.length} upcoming exams
            </span>
          </div>
          <div className="p-4 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/10">
            <BookOpen size={24} />
          </div>
        </div>
      </div>

      {/* AI Insights & Diagnostics Dashboard Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Performance Predictor Card */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-indigo-400 uppercase font-extrabold tracking-widest block">AI Grade Prediction</span>
              <span className="text-[10px] bg-indigo-950/20 text-indigo-400 border border-indigo-900/40 px-2 py-0.5 rounded font-bold">
                {insightsData?.prediction?.confidence || 75}% Confidence
              </span>
            </div>
            
            <div className="flex items-baseline gap-2.5">
              <span className="font-display font-black text-5xl text-white">
                {insightsData?.prediction?.grade || 'B'}
              </span>
              <span className="text-sm font-semibold text-gray-400">
                Predicted GPA: {insightsData?.prediction?.predictedGpa?.toFixed(2) || '3.00'}
              </span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed italic">
              "{insightsData?.prediction?.interpretation || 'Complete tasks and log daily study hours to construct an academic performance profile.'}"
            </p>

            <div className="space-y-2 pt-2 border-t border-gray-800/40">
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-extrabold block">Prediction Influencers</span>
              {insightsData?.prediction?.factors?.map((factor: any, idx: number) => (
                <div key={idx} className="flex gap-2 items-start text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${factor.impact === 'positive' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <div>
                    <span className="font-bold text-gray-200 text-left block">{factor.name}</span>
                    <p className="text-gray-400 text-[10px] mt-0.5 text-left">{factor.description}</p>
                  </div>
                </div>
              )) || (
                <p className="text-[10px] text-gray-500 italic">No tracking records yet. Keep study streaks alive.</p>
              )}
            </div>
          </div>
        </div>

        {/* AI Recommendations (Next Actions) */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-cyan-400 uppercase font-extrabold tracking-widest block mb-4">Recommended Next Actions</span>
            <div className="space-y-3.5">
              {insightsData?.recommendations?.map((rec: any, idx: number) => (
                <div 
                  key={idx} 
                  className="p-3 rounded-xl border border-gray-850 bg-gray-950/10 flex gap-2.5 items-start transition hover:border-indigo-500/20"
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    rec.priority === 'high' ? 'bg-red-500/10 text-red-400 border border-red-900/30' :
                    rec.priority === 'medium' ? 'bg-orange-500/10 text-orange-400 border border-orange-900/30' :
                    'bg-indigo-500/10 text-indigo-400 border border-indigo-900/30'
                  }`}>
                    <Sparkles size={14} className="fill-current" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-200">{rec.title}</span>
                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        rec.priority === 'high' ? 'bg-red-950/30 text-red-400' :
                        rec.priority === 'medium' ? 'bg-orange-950/30 text-orange-400' :
                        'bg-indigo-950/30 text-indigo-400'
                      }`}>
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 leading-relaxed text-left">{rec.description}</p>
                  </div>
                </div>
              )) || (
                <p className="text-xs text-gray-500 italic py-4">No recommended items. Add exams or subjects.</p>
              )}
            </div>
          </div>
        </div>

        {/* Weak Topics Warning Panel */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-emerald-400 uppercase font-extrabold tracking-widest block mb-4">Weak Topics Diagnostics</span>
            {insightsData?.weakTopics && insightsData.weakTopics.length > 0 ? (
              <div className="space-y-3.5">
                {insightsData.weakTopics.map((wt: any, idx: number) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-200">{wt.subjectName}</span>
                      <span className="text-red-400 font-bold">{wt.score}% Avg</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-normal text-left">{wt.reason}</p>
                    <div className="flex gap-2">
                      <span className="text-[9px] text-indigo-400 font-bold uppercase shrink-0">Tips:</span>
                      <span className="text-[9px] text-gray-400 truncate">{wt.recommendedFirstSteps[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bot className="text-emerald-400/30 mx-auto mb-2" size={32} />
                <p className="text-xs text-gray-300 font-bold font-display">Diagnostics: Excellent!</p>
                <p className="text-[10px] text-gray-400 mt-1">All subjects maintain scoring profiles above target thresholds.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Main Grid Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Today's Tasks Checklist */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Today's study slots */}
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-4 mb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-white">Today's Timetable</h3>
                <p className="text-xs text-gray-400 mt-0.5">AI Scheduled sessions for today.</p>
              </div>
              <span className="text-xs font-semibold text-indigo-400 bg-indigo-950/20 border border-indigo-900/40 px-2.5 py-1 rounded-full">
                {todayStr}
              </span>
            </div>

            {todaySchedule && todaySchedule.slots.length > 0 ? (
              <div className="space-y-3">
                {todaySchedule.slots.map((slot, index) => (
                  <div 
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition hover:bg-gray-900/15"
                    style={{ 
                      borderColor: `${slot.color}25`, 
                      background: `linear-gradient(90deg, ${slot.color}05, transparent)`
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: slot.color }}
                        />
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: slot.color }}>
                          {slot.type}
                        </span>
                        <span className="text-xs text-gray-500 font-semibold">•</span>
                        <span className="text-xs text-gray-300 font-bold">{slot.subjectName}</span>
                      </div>
                      <p className="text-sm text-white font-medium mt-1 pl-4">{slot.topic}</p>
                    </div>
                    <span className="text-xs text-gray-400 font-semibold bg-gray-950/40 border border-gray-850 px-2.5 py-1 rounded mt-2 sm:mt-0 w-fit shrink-0">
                      {slot.duration} Mins
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="text-gray-600 mx-auto mb-2" size={32} />
                <p className="text-sm text-gray-400">No scheduled sessions for today.</p>
                <Link to="/planner" className="text-xs text-indigo-400 font-bold hover:underline mt-1 inline-block">
                  Generate study plan
                </Link>
              </div>
            )}
          </div>

          {/* Today's Checklist */}
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-4 mb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-white">Focus Checklist</h3>
                <p className="text-xs text-gray-400 mt-0.5">Tasks due today. Checking off grants XP points!</p>
              </div>
              <Link to="/calendar" className="text-xs text-indigo-400 font-bold hover:underline">
                View Calendar
              </Link>
            </div>

            {todayTasks.length > 0 ? (
              <div className="space-y-2.5">
                {todayTasks.map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => toggleTaskComplete(task.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border border-gray-850 bg-gray-950/10 cursor-pointer hover:bg-gray-900/10 transition ${
                      task.status === 'completed' ? 'opacity-55' : ''
                    }`}
                  >
                    <button className="text-indigo-400 hover:text-indigo-300 shrink-0">
                      {task.status === 'completed' ? (
                        <CheckSquare size={20} className="fill-indigo-600/10" />
                      ) : (
                        <Square size={20} />
                      )}
                    </button>
                    <span className={`text-sm text-gray-200 flex-1 font-medium ${
                      task.status === 'completed' ? 'line-through text-gray-500' : ''
                    }`}>
                      {task.title}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 border ${
                      task.priority === 'high' 
                        ? 'bg-red-950/20 text-red-400 border-red-900/30' 
                        : task.priority === 'medium' ? 'bg-orange-950/20 text-orange-400 border-orange-900/30' : 'bg-gray-900/40 text-gray-400 border-gray-800/40'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckSquare className="text-gray-600 mx-auto mb-2" size={32} />
                <p className="text-sm text-gray-400">All caught up! No tasks due today.</p>
                <Link to="/planner" className="text-xs text-indigo-400 font-bold hover:underline mt-1 inline-block">
                  Add new target task
                </Link>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Exams countdown, Quick actions, Badges */}
        <div className="space-y-6">
          
          {/* Upcoming Exams Countdown */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-display font-bold text-lg text-white border-b border-gray-800/80 pb-4 mb-4">
              Upcoming Exams
            </h3>

            {exams.length > 0 ? (
              <div className="space-y-3.5">
                {[...exams]
                  .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())
                  .slice(0, 3)
                  .map(exam => {
                    const mathColor = subjects.find(s => s.id === exam.subject_id)?.color || '#6366f1';
                    const mathName = subjects.find(s => s.id === exam.subject_id)?.name || 'Subject';
                    
                    return (
                      <div key={exam.id} className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: mathColor }} />
                            <span className="text-xs text-gray-400 font-bold">{mathName}</span>
                          </div>
                          <p className="text-sm text-white font-semibold mt-0.5">{exam.name}</p>
                        </div>
                        <span className="text-xs font-bold text-indigo-400 bg-indigo-950/20 border border-indigo-900/40 px-2.5 py-1 rounded-full">
                          {getDaysCountdown(exam.exam_date)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="text-gray-600 mx-auto mb-2" size={24} />
                <p className="text-xs text-gray-400">No exams logged.</p>
                <Link to="/subjects" className="text-xs text-indigo-400 font-bold hover:underline mt-1 inline-block">
                  Add Exam now
                </Link>
              </div>
            )}
          </div>

          {/* Gamified Achievements / Badges */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-display font-bold text-lg text-white border-b border-gray-800/80 pb-4 mb-4 flex items-center justify-between">
              <span>Achievements</span>
              <span className="text-xs text-gray-400 font-bold">{achievements.length} Badges</span>
            </h3>

            {achievements.length > 0 ? (
              <div className="grid grid-cols-4 gap-2.5">
                {achievements.slice(0, 8).map(ach => (
                  <div 
                    key={ach.id} 
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-900/20 border border-indigo-500/10 text-indigo-400 hover:scale-105 transition"
                    title={`${ach.badge_name}: ${ach.description}`}
                  >
                    <Award size={24} className="stroke-indigo-400 fill-indigo-400/10" />
                    <span className="text-[8px] text-gray-300 font-bold truncate w-full text-center mt-1.5">
                      {ach.badge_name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Award className="text-gray-600 mx-auto mb-2" size={28} />
                <p className="text-xs text-gray-400">Complete tasks to unlock badges!</p>
              </div>
            )}
          </div>

          {/* Pomodoro Quick link */}
          <div className="glass-panel p-6 rounded-2xl bg-gradient-to-br from-indigo-950/20 to-transparent border-indigo-900/20 flex items-center justify-between">
            <div>
              <h4 className="font-display font-bold text-base text-white">Pomodoro Timer</h4>
              <p className="text-xs text-gray-400 mt-1">Ready for a focus sprint?</p>
            </div>
            <Link
              to="/settings"
              className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition flex items-center justify-center cursor-pointer shadow-lg shadow-indigo-600/10"
            >
              <Clock size={20} />
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
};

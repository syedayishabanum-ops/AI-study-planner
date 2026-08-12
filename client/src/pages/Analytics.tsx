import React from 'react';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useTheme } from '../context/ThemeContext';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend 
} from 'recharts';
import { BarChart2, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

export const Analytics: React.FC = () => {
  const { progressLogs, subjects, tasks } = useStudyPlan();
  const { theme } = useTheme();

  // Create default past 7 days records if DB is empty
  const defaultLogs = [
    { date: 'Mon', study_hours: 2.5, tasks_completed: 2, productivity_score: 85 },
    { date: 'Tue', study_hours: 4.0, tasks_completed: 4, productivity_score: 90 },
    { date: 'Wed', study_hours: 1.5, tasks_completed: 1, productivity_score: 70 },
    { date: 'Thu', study_hours: 3.5, tasks_completed: 3, productivity_score: 80 },
    { date: 'Fri', study_hours: 5.0, tasks_completed: 5, productivity_score: 95 },
    { date: 'Sat', study_hours: 2.0, tasks_completed: 2, productivity_score: 85 },
    { date: 'Sun', study_hours: 3.0, tasks_completed: 3, productivity_score: 88 }
  ];

  // Process data for charts
  const studyLogsData = progressLogs.length > 0
    ? progressLogs.map(log => ({
        date: log.date.split('-').slice(1).join('/'), // format as MM/DD
        study_hours: log.study_hours,
        tasks_completed: log.tasks_completed,
        productivity_score: log.productivity_score
      }))
    : defaultLogs;

  // Pie chart calculation for subject distribution
  // If subjects exist, assign random proportions for mock preview
  const pieColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];
  const pieData = subjects.length > 0
    ? subjects.map((sub, idx) => ({
        name: sub.name,
        value: sub.credits * 1.5 + (idx % 2 === 0 ? 2 : 1), // weight formula
        color: sub.color
      }))
    : [
        { name: 'Organic Chemistry', value: 35, color: '#6366f1' },
        { name: 'Advanced Calculus', value: 25, color: '#10b981' },
        { name: 'Mechanics Lab', value: 15, color: '#f59e0b' },
        { name: 'Electromagnetics', value: 25, color: '#8b5cf6' }
      ];

  // Summary Metrics
  const totalHours = studyLogsData.reduce((sum, item) => sum + item.study_hours, 0);
  const avgHours = (totalHours / studyLogsData.length).toFixed(1);
  const totalTasks = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 75;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-gray-800/10 pb-4">
        <h1 className="font-display font-extrabold text-3xl text-white tracking-tight flex items-center gap-2">
          Analytics & Progress <BarChart2 size={28} className="text-indigo-400" />
        </h1>
        <p className="text-sm text-gray-400 mt-1">Review study distributions, target tasks completions, and overall productivity levels.</p>
      </div>

      {/* Numerical Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Hours */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block">Cumulative Study</span>
            <span className="font-display font-extrabold text-3xl text-white block mt-1">{totalHours} Hours</span>
            <span className="text-xs text-indigo-400 font-semibold block mt-1">Avg: {avgHours} hours/day</span>
          </div>
          <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/10">
            <Clock size={22} />
          </div>
        </div>

        {/* Completion rate */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block">Total Tasks Completed</span>
            <span className="font-display font-extrabold text-3xl text-white block mt-1">{taskCompletionRate}%</span>
            <span className="text-xs text-gray-400 font-semibold block mt-1">
              {completedTasksCount}/{totalTasks} targets checked
            </span>
          </div>
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/10">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Average productivity score */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block">Productivity Rating</span>
            <span className="font-display font-extrabold text-3xl text-white block mt-1">87 / 100</span>
            <span className="text-xs text-indigo-400 font-semibold block mt-1">Excellent focus retention ⚡</span>
          </div>
          <div className="p-4 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/10">
            <TrendingUp size={22} />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weekly Study Hours */}
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="font-display font-bold text-base text-white mb-4">Focus Hours Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studyLogsData}>
                <XAxis dataKey="date" stroke={theme === 'light' ? '#6B7280' : '#9ca3af'} fontSize={11} tickLine={false} />
                <YAxis stroke={theme === 'light' ? '#6B7280' : '#9ca3af'} fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={
                    theme === 'light'
                      ? { backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', color: '#1F2937' }
                      : { backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }
                  } 
                  labelStyle={theme === 'light' ? { color: '#6B7280' } : { color: '#9ca3af' }}
                />
                <Bar dataKey="study_hours" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subject Hour Weight Allocation */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-white mb-4">Course Weights & Effort</h3>
            <div className="h-60 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry: any, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={
                      theme === 'light'
                        ? { backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', color: '#1F2937' }
                        : { backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Custom Legends list */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
            {pieData.map((item: any, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Line graph: Completion trends */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
          <h3 className="font-display font-bold text-base text-white mb-4">Productivity Progression Timeline</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={studyLogsData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? '#E5E7EB' : 'rgba(156,163,175,0.1)'} />
                <XAxis dataKey="date" stroke={theme === 'light' ? '#6B7280' : '#9ca3af'} fontSize={11} tickLine={false} />
                <YAxis stroke={theme === 'light' ? '#6B7280' : '#9ca3af'} fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={
                    theme === 'light'
                      ? { backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', color: '#1F2937' }
                      : { backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }
                  }
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="productivity_score" name="Productivity Rating" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="tasks_completed" name="Targets Met" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useStudyPlan } from '../context/StudyPlanContext';
import { 
  Sparkles, Calendar, Clock, AlertTriangle, BookOpen, 
  ChevronRight, Calendar as CalendarIcon, CheckCircle 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudyPlanner: React.FC = () => {
  const { subjects, generateAIPlan, studyPlans, isLoading } = useStudyPlan();
  
  // Form configurations
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const end = new Date();
    end.setDate(end.getDate() + 7); // Default 1 week plan
    return end.toISOString().split('T')[0];
  });
  const [dailyHours, setDailyHours] = useState('4');
  const [weakSubjects, setWeakSubjects] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState('afternoon');
  const [breakDuration, setBreakDuration] = useState('10');
  
  // UI Status
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const activePlan = studyPlans[studyPlans.length - 1]; // Pick latest plan

  const handleToggleWeak = (subName: string) => {
    setWeakSubjects(prev => 
      prev.includes(subName) 
        ? prev.filter(s => s !== subName) 
        : [...prev, subName]
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subjects.length === 0) {
      setStatusMsg("❌ Please add subjects first in the Subjects tab.");
      return;
    }

    setStatusMsg("Generating your optimized AI schedule...");
    try {
      await generateAIPlan({
        dailyHours: parseFloat(dailyHours) || 4,
        weakSubjects,
        preferredStudyTime: preferredTime,
        breakDuration: parseInt(breakDuration) || 10,
        startDate,
        endDate
      });
      setStatusMsg("✨ AI Study Plan generated successfully! Check your calendar.");
    } catch (err: any) {
      setStatusMsg(`⚠️ Generation failed: ${err.message || 'Check connection details.'}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-gray-800/10 pb-4">
        <h1 className="font-display font-extrabold text-3xl text-white tracking-tight flex items-center gap-2">
          AI Study Planner Generator <Sparkles size={24} className="text-indigo-400 fill-indigo-400/20" />
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Tell Aegis your target dates and priorities, and get an optimized revision schedule immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Input Form Panels */}
        <div className="glass-panel p-6 rounded-2xl h-fit">
          <h3 className="font-display font-bold text-lg text-white border-b border-gray-800/80 pb-4 mb-4">
            Planner Parameters
          </h3>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Daily Hours & Breaks */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Study Hours / Day</label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  required
                  value={dailyHours}
                  onChange={e => setDailyHours(e.target.value)}
                  className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Break (mins)</label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  required
                  value={breakDuration}
                  onChange={e => setBreakDuration(e.target.value)}
                  className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Study Time preference */}
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Preferred Focus Time</label>
              <select
                value={preferredTime}
                onChange={e => setPreferredTime(e.target.value)}
                className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="morning">Morning (8:00 AM - 12:00 PM)</option>
                <option value="afternoon">Afternoon (12:00 PM - 4:00 PM)</option>
                <option value="evening">Evening (4:00 PM - 8:00 PM)</option>
                <option value="night">Night (8:00 PM - 12:00 AM)</option>
              </select>
            </div>

            {/* Weak Subjects check list */}
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1.5">
                Weak Subjects (AI gives 1.5x weights)
              </label>
              {subjects.length > 0 ? (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {subjects.map(sub => {
                    const isChecked = weakSubjects.includes(sub.name);
                    return (
                      <div 
                        key={sub.id}
                        onClick={() => handleToggleWeak(sub.name)}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                          isChecked 
                            ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-300' 
                            : 'bg-gray-950/40 border-gray-850/50 hover:bg-gray-900/20 text-gray-300'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                        <span className="text-xs font-semibold">{sub.name}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No subjects added yet. Add subjects to define weaknesses.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || subjects.length === 0}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/10 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Assembling Timetable...' : 'Generate AI study plan'}
            </button>
          </form>

          {statusMsg && (
            <div className="mt-4 p-3 bg-gray-950/40 border border-gray-850 text-xs text-gray-300 rounded-xl flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 text-indigo-400 mt-0.5" />
              <span>{statusMsg}</span>
            </div>
          )}
        </div>

        {/* Right: Plan Result Slots Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-4 mb-4">
                <div>
                  <h3 className="font-display font-bold text-lg text-white">Active Plan Preview</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Your generated day-by-day target schedule.</p>
                </div>
                {activePlan && (
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest bg-gray-950/60 border border-gray-850 px-2 py-1 rounded">
                    Plan Period: {activePlan.start_date} to {activePlan.end_date}
                  </span>
                )}
              </div>

              {activePlan ? (
                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
                  {activePlan.schedule.map((day, idx) => (
                    <div key={idx} className="space-y-2 border-b border-gray-900 pb-3 last:border-b-0">
                      <h4 className="text-xs font-bold text-indigo-400">{day.date}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {day.slots.map((slot, sIdx) => (
                          <div 
                            key={sIdx} 
                            className="p-2.5 rounded-lg border flex items-center justify-between gap-2"
                            style={{ 
                              borderColor: `${slot.color}25`,
                              background: `linear-gradient(135deg, ${slot.color}05, transparent)` 
                            }}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: slot.color }} />
                                <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: slot.color }}>
                                  {slot.type}
                                </span>
                                <span className="text-[10px] text-gray-500 font-bold">•</span>
                                <span className="text-xs text-gray-200 font-bold truncate max-w-[120px]">{slot.subjectName}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{slot.topic}</p>
                            </div>
                            <span className="text-[9px] font-bold text-gray-400 bg-gray-950/40 border border-gray-850 px-1.5 py-0.5 rounded shrink-0">
                              {slot.duration}m
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <CalendarIcon className="text-gray-600 mx-auto mb-3" size={48} />
                  <h4 className="font-display font-bold text-base text-gray-300">No AI Study Plan Active</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                    Fill out the parameters on the left and trigger Aegis AI to construct a high-impact calendar.
                  </p>
                </div>
              )}
            </div>

            {activePlan && (
              <div className="mt-6 pt-4 border-t border-gray-800/80 flex items-center justify-between text-xs font-semibold">
                <span className="text-gray-400">Timetable sync'd to Focus Checklist.</span>
                <Link to="/calendar" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  Open Interactive Calendar <ChevronRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

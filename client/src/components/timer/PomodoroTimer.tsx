import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Award, CheckCircle, Zap } from 'lucide-react';
import { useStudyPlan } from '../../context/StudyPlanContext';

type TimerMode = 'work' | 'break';

export const PomodoroTimer: React.FC = () => {
  const { logStudySession, unlockBadge } = useStudyPlan();
  
  // Timer presets
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [mode, setMode] = useState<TimerMode>('work');
  
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  
  // Custom mode state
  const [customWork, setCustomWork] = useState('25');
  const [customBreak, setCustomBreak] = useState('5');
  const [isCustomMode, setIsCustomMode] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio tone generator
  const triggerAlarmTone = (type: TimerMode) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playBeep = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.1, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        
        osc.start(start);
        osc.stop(start + duration);
      };

      if (type === 'work') {
        // High double chime
        playBeep(880, ctx.currentTime, 0.4);
        playBeep(880, ctx.currentTime + 0.5, 0.4);
      } else {
        // Soft major chord chime
        playBeep(523.25, ctx.currentTime, 0.5); // C5
        playBeep(659.25, ctx.currentTime + 0.1, 0.5); // E5
        playBeep(783.99, ctx.currentTime + 0.2, 0.6); // G5
      }
    } catch (e) {
      console.log('Audio synthesis blocked by browser security. Audio will trigger after interaction.', e);
    }
  };

  // Browser system notification
  const sendSystemNotification = (title: string, message: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
  };

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Timer finished!
            setIsActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            
            // Handle session changeover
            setMode(currentMode => {
              const nextMode = currentMode === 'work' ? 'break' : 'work';
              triggerAlarmTone(nextMode);
              sendSystemNotification(
                nextMode === 'break' ? 'Pomodoro Done!' : 'Break Ended!',
                nextMode === 'break' ? 'Time for a well-deserved break.' : 'Time to focus again.'
              );
              
              if (currentMode === 'work') {
                setSessionCount(s => {
                  const nextCount = s + 1;
                  // Log study session in progress analytics
                  const hoursLogged = workMinutes / 60;
                  logStudySession(hoursLogged, 90); // default to high productivity 90%
                  
                  // Unlock Achievements
                  if (nextCount >= 1) {
                    unlockBadge('First Focus', 'timer', 'Completed your first Pomodoro session!');
                  }
                  if (nextCount >= 4) {
                    unlockBadge('Hyperfocus Guru', 'timer', 'Completed 4 Pomodoro sessions in one go!');
                  }
                  return nextCount;
                });
              }
              
              // Set the next duration
              setTimeLeft((nextMode === 'work' ? workMinutes : breakMinutes) * 60);
              return nextMode;
            });
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, workMinutes, breakMinutes, logStudySession, unlockBadge]);

  const toggleStartPause = () => {
    // Request notification permission on first interaction
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft((mode === 'work' ? workMinutes : breakMinutes) * 60);
  };

  const applyPreset = (work: number, breakTime: number) => {
    setIsActive(false);
    setIsCustomMode(false);
    setWorkMinutes(work);
    setBreakMinutes(breakTime);
    setMode('work');
    setTimeLeft(work * 60);
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseInt(customWork) || 25;
    const b = parseInt(customBreak) || 5;
    setWorkMinutes(w);
    setBreakMinutes(b);
    applyPreset(w, b);
    setIsCustomMode(false);
  };

  // Calculations for progress circle
  const totalDuration = (mode === 'work' ? workMinutes : breakMinutes) * 60;
  const progressPercentage = ((totalDuration - timeLeft) / totalDuration) * 100;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-between h-full max-w-md w-full mx-auto">
      {/* Header Info */}
      <div className="text-center w-full">
        <h3 className="font-display font-bold text-xl tracking-wide flex items-center justify-center gap-2">
          {mode === 'work' ? (
            <span className="text-indigo-400 flex items-center gap-1.5"><Zap size={20} className="fill-indigo-400" /> Focus Session</span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1.5"><CheckCircle size={20} /> Break Period</span>
          )}
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Completed Today: <strong className="text-gray-200">{sessionCount} Pomodoros</strong>
        </p>
      </div>

      {/* Circle Timer Area */}
      <div className="relative my-8 flex items-center justify-center">
        <svg width="220" height="220" className="transform -rotate-90">
          {/* Back Circle */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="transparent"
            stroke="rgba(156, 163, 175, 0.1)"
            strokeWidth="8"
          />
          {/* Foreground Circle */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="transparent"
            stroke={mode === 'work' ? '#4F46E5' : '#10b981'}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="progress-ring-circle"
          />
        </svg>
        <div className="absolute text-center">
          <span className="font-display text-4xl font-extrabold tracking-wider block">
            {formatTime(timeLeft)}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mt-1 block">
            {isActive ? 'Keep Going' : 'Paused'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 w-full justify-center">
        <button
          onClick={handleReset}
          className="p-3 rounded-full glass-panel hover:bg-gray-800 text-gray-400 hover:text-white transition cursor-pointer"
          title="Reset Timer"
        >
          <RotateCcw size={20} />
        </button>

        <button
          onClick={toggleStartPause}
          className={`p-5 rounded-full transition shadow-lg cursor-pointer transform hover:scale-105 ${
            isActive 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : mode === 'work' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
          title={isActive ? 'Pause' : 'Start'}
        >
          {isActive ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
        </button>

        <div className="p-3 rounded-full glass-panel opacity-40 cursor-default text-gray-400">
          <Award size={20} />
        </div>
      </div>

      {/* Presets Grid */}
      <div className="w-full mt-6">
        <div className="flex items-center justify-between border-t border-gray-800/80 pt-4 mb-3">
          <span className="text-xs font-semibold text-gray-400">Timer Presets</span>
          <button
            onClick={() => setIsCustomMode(!isCustomMode)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition"
          >
            {isCustomMode ? 'Show Presets' : 'Custom Timer'}
          </button>
        </div>

        {!isCustomMode ? (
          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              onClick={() => applyPreset(25, 5)}
              className={`py-2 px-3 rounded-lg text-xs font-semibold glass-panel transition ${
                workMinutes === 25 && breakMinutes === 5 && !isCustomMode
                  ? 'border-indigo-500/50 bg-indigo-950/20 text-indigo-300'
                  : 'hover:bg-gray-800/40 text-gray-300'
              }`}
            >
              25 / 5 Mode (Standard)
            </button>
            <button
              onClick={() => applyPreset(50, 10)}
              className={`py-2 px-3 rounded-lg text-xs font-semibold glass-panel transition ${
                workMinutes === 50 && breakMinutes === 10 && !isCustomMode
                  ? 'border-indigo-500/50 bg-indigo-950/20 text-indigo-300'
                  : 'hover:bg-gray-800/40 text-gray-300'
              }`}
            >
              50 / 10 Mode (Deep Focus)
            </button>
          </div>
        ) : (
          <form onSubmit={handleApplyCustom} className="flex gap-2 items-end w-full">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Work (min)</label>
              <input
                type="number"
                min="1"
                max="180"
                value={customWork}
                onChange={e => setCustomWork(e.target.value)}
                className="w-full bg-gray-900/60 border border-gray-850 px-2 py-1.5 rounded text-xs text-center text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Break (min)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={customBreak}
                onChange={e => setCustomBreak(e.target.value)}
                className="w-full bg-gray-900/60 border border-gray-850 px-2 py-1.5 rounded text-xs text-center text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="py-2 px-4 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition h-[33px]"
            >
              Set
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

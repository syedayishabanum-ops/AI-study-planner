import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface Subject {
  id: string;
  name: string;
  color: string;
  difficulty_level: 'easy' | 'medium' | 'hard';
  credits: number;
  priority: 'low' | 'medium' | 'high';
  current_grade?: number;
}

export interface Unit {
  id: string;
  subject_id: string;
  name: string;
  status: 'pending' | 'completed';
}

export interface Exam {
  id: string;
  subject_id: string;
  name: string;
  exam_date: string;
  weightage: number;
}

export interface Task {
  id: string;
  subject_id: string;
  title: string;
  status: 'pending' | 'completed';
  due_date: string;
  type: 'study' | 'revision' | 'exam' | 'task';
  priority: 'low' | 'medium' | 'high';
  duration_minutes: number;
  recurring: boolean;
}

export interface StudyPlan {
  id: string;
  start_date: string;
  end_date: string;
  config: {
    dailyHours: number;
    weakSubjects: string[];
    preferredStudyTime: string;
    breakDuration: number;
  };
  schedule: Array<{
    date: string;
    slots: Array<{
      subjectId: string;
      subjectName: string;
      color: string;
      topic: string;
      duration: number;
      type: 'study' | 'revision' | 'buffer';
    }>;
  }>;
}

export interface ProgressLog {
  id: string;
  date: string;
  study_hours: number;
  tasks_completed: number;
  productivity_score: number;
}

export interface Achievement {
  id: string;
  achievement_type: string;
  badge_name: string;
  description: string;
  unlocked_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  scheduled_for: string;
  type: 'study' | 'exam' | 'break' | 'missed';
}

interface StudyPlanContextType {
  subjects: Subject[];
  exams: Exam[];
  tasks: Task[];
  studyPlans: StudyPlan[];
  progressLogs: ProgressLog[];
  achievements: Achievement[];
  notifications: NotificationItem[];
  isLoading: boolean;
  
  // Subjects
  fetchSubjects: () => Promise<void>;
  addSubject: (subject: Omit<Subject, 'id'>) => Promise<void>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  
  // Units
  getUnits: (subjectId: string) => Promise<Unit[]>;
  addUnit: (subjectId: string, name: string) => Promise<Unit>;
  updateUnit: (subjectId: string, unitId: string, updates: Partial<Unit>) => Promise<void>;
  deleteUnit: (subjectId: string, unitId: string) => Promise<void>;

  // Exams
  addExam: (exam: Omit<Exam, 'id'>) => Promise<void>;
  updateExam: (id: string, updates: Partial<Exam>) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;

  // Tasks
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  toggleTaskComplete: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTaskDate: (id: string, date: string) => Promise<void>; // Drag-n-drop helper

  // AI & Planner
  generateAIPlan: (config: StudyPlan['config'] & { startDate: string; endDate: string }) => Promise<void>;
  rescheduleMissedTasks: (planId: string) => Promise<void>;
  parseSyllabusPDF: (subjectId: string, pdfBuffer: ArrayBuffer) => Promise<string[]>;
  sendChatMsg: (message: string, history: Array<{ role: 'user' | 'model'; parts: string }>) => Promise<string>;
  askStudyAgent: (message: string) => Promise<any>;
  logStudySession: (hours: number, productivity: number) => Promise<void>;
  unlockBadge: (badgeName: string, type: string, description: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  
  // AI Diagnostics & Adaptability
  getPerformancePrediction: () => Promise<any>;
  getWeakTopics: () => Promise<any>;
  getAIRecommendations: () => Promise<any>;
  getDifficultyEstimation: () => Promise<any>;
  getDashboardInsights: () => Promise<any>;
  triggerAdaptiveSync: () => Promise<any>;
  
  // General Sync
  syncAllData: () => Promise<void>;
}

const StudyPlanContext = createContext<StudyPlanContextType | undefined>(undefined);

export const StudyPlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, apiFetch, updateProfile, user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const syncAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    Promise.resolve().then(() => setIsLoading(true));
    try {
      const [subs, exms, tsks, plans, logs, achs, notifs] = await Promise.all([
        apiFetch('/subjects'),
        apiFetch('/exams'),
        apiFetch('/tasks'),
        apiFetch('/planner/history'),
        apiFetch('/progress/logs'),
        apiFetch('/progress/achievements'),
        apiFetch('/notifications')
      ]);
      setSubjects(subs);
      setExams(exms);
      setTasks(tsks);
      setStudyPlans(plans);
      setProgressLogs(logs);
      setAchievements(achs);
      setNotifications(notifs);
    } catch (err) {
      console.error('Error syncing all planner data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, apiFetch]);

  // Trigger sync on login
  useEffect(() => {
    Promise.resolve().then(() => {
      if (isAuthenticated) {
        syncAllData();
      } else {
        setSubjects([]);
        setExams([]);
        setTasks([]);
        setStudyPlans([]);
        setProgressLogs([]);
        setAchievements([]);
        setNotifications([]);
      }
    });
  }, [isAuthenticated, syncAllData]);

  // ==================== SUBJECT METHODS ====================
  const fetchSubjects = async () => {
    const data = await apiFetch('/subjects');
    setSubjects(data);
  };

  const addSubject = async (sub: Omit<Subject, 'id'>) => {
    const newSub = await apiFetch('/subjects', {
      method: 'POST',
      body: JSON.stringify(sub)
    });
    setSubjects(prev => [...prev, newSub]);
  };

  const updateSubject = async (id: string, updates: Partial<Subject>) => {
    const updated = await apiFetch(`/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    setSubjects(prev => prev.map(s => (s.id === id ? updated : s)));
  };

  const deleteSubject = async (id: string) => {
    await apiFetch(`/subjects/${id}`, { method: 'DELETE' });
    setSubjects(prev => prev.filter(s => s.id !== id));
    // Sync to clear tasks/exams cascade
    syncAllData();
  };

  // ==================== UNIT METHODS ====================
  const getUnits = async (subjectId: string): Promise<Unit[]> => {
    return await apiFetch(`/subjects/${subjectId}/units`);
  };

  const addUnit = async (subjectId: string, name: string): Promise<Unit> => {
    return await apiFetch(`/subjects/${subjectId}/units`, {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  };

  const updateUnit = async (subjectId: string, unitId: string, updates: Partial<Unit>) => {
    await apiFetch(`/subjects/${subjectId}/units/${unitId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  };

  const deleteUnit = async (subjectId: string, unitId: string) => {
    await apiFetch(`/subjects/${subjectId}/units/${unitId}`, { method: 'DELETE' });
  };

  // ==================== EXAM METHODS ====================
  const addExam = async (exm: Omit<Exam, 'id'>) => {
    const newExm = await apiFetch('/exams', {
      method: 'POST',
      body: JSON.stringify(exm)
    });
    setExams(prev => [...prev, newExm]);
  };

  const updateExam = async (id: string, updates: Partial<Exam>) => {
    const updated = await apiFetch(`/exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    setExams(prev => prev.map(e => (e.id === id ? updated : e)));
  };

  const deleteExam = async (id: string) => {
    await apiFetch(`/exams/${id}`, { method: 'DELETE' });
    setExams(prev => prev.filter(e => e.id !== id));
  };

  // ==================== TASK METHODS ====================
  const addTask = async (tsk: Omit<Task, 'id'>) => {
    const newTsk = await apiFetch('/tasks', {
      method: 'POST',
      body: JSON.stringify(tsk)
    });
    setTasks(prev => [newTsk, ...prev]);
  };

  const toggleTaskComplete = async (id: string) => {
    const target = tasks.find(t => t.id === id);
    if (!target) return;
    const newStatus = target.status === 'completed' ? 'pending' : 'completed';
    
    // Optimistic UI updates
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status: newStatus } : t)));
    
    try {
      await apiFetch(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      // Fetch latest profile to sync XP points and badge progress
      const freshUser = await apiFetch('/auth/me');
      // Update profile context manually
      if (user) {
        updateProfile({ xp: freshUser.xp, streak: freshUser.streak });
      }
      // Re-sync achievements and progress
      const achs = await apiFetch('/progress/achievements');
      setAchievements(achs);
      const logs = await apiFetch('/progress/logs');
      setProgressLogs(logs);
    } catch (err) {
      // Revert on error
      setTasks(prev => prev.map(t => (t.id === id ? target : t)));
      console.error(err);
    }
  };

  const deleteTask = async (id: string) => {
    await apiFetch(`/tasks/${id}`, { method: 'DELETE' });
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateTaskDate = async (id: string, date: string) => {
    // Optimistic update
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, due_date: date } : t)));
    try {
      await apiFetch(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ due_date: date })
      });
    } catch (err) {
      console.error('Failed to save task date shift:', err);
      syncAllData();
    }
  };

  // ==================== AI SERVICE INTERFACES ====================
  const generateAIPlan = async (config: StudyPlan['config'] & { startDate: string; endDate: string }) => {
    await apiFetch('/planner/generate', {
      method: 'POST',
      body: JSON.stringify(config)
    });
    await syncAllData(); // Reload schedules and tasks list
  };

  const rescheduleMissedTasks = async (planId: string) => {
    await apiFetch('/planner/reschedule', {
      method: 'POST',
      body: JSON.stringify({ currentPlanId: planId })
    });
    await syncAllData();
  };

  const parseSyllabusPDF = async (subjectId: string, pdfBuffer: ArrayBuffer): Promise<string[]> => {
    const res = await apiFetch('/syllabus/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: new Uint8Array(pdfBuffer)
    });
    
    // Automatically add these units to the subject database
    if (res.units && res.units.length > 0) {
      for (const unitName of res.units) {
        await addUnit(subjectId, unitName);
      }
    }
    return res.units || [];
  };

  const sendChatMsg = async (message: string, history: Array<{ role: 'user' | 'model'; parts: string }>): Promise<string> => {
    const res = await apiFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history })
    });
    return res.reply;
  };

  const askStudyAgent = async (message: string): Promise<any> => {
    const res = await apiFetch('/agent/study', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    await syncAllData();
    return res;
  };

  const logStudySession = async (hours: number, productivity: number) => {
    await apiFetch('/progress/log', {
      method: 'POST',
      body: JSON.stringify({ studyHours: hours, productivityScore: productivity })
    });
    // Refresh XP points in user context
    const freshUser = await apiFetch('/auth/me');
    if (user) {
      updateProfile({ xp: freshUser.xp });
    }
    // Refresh achievements & logs
    const logs = await apiFetch('/progress/logs');
    setProgressLogs(logs);
  };

  const unlockBadge = async (badgeName: string, type: string, description: string) => {
    try {
      const badge = await apiFetch('/progress/badge', {
        method: 'POST',
        body: JSON.stringify({ badgeName, type, description })
      });
      setAchievements(prev => [...prev, badge]);
    } catch (err) {
      console.log('Badge already unlocked or error.', err);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      const updated = await apiFetch(`/notifications/${id}`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => (n.id === id ? updated : n)));
    } catch {
      // Direct optimistic update fallback if needed
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    }
  };

  const getPerformancePrediction = async () => {
    return await apiFetch('/ai/performance-prediction');
  };

  const getWeakTopics = async () => {
    return await apiFetch('/ai/weak-topics');
  };

  const getAIRecommendations = async () => {
    return await apiFetch('/ai/recommendations');
  };

  const getDifficultyEstimation = async () => {
    return await apiFetch('/ai/difficulty-estimation');
  };

  const getDashboardInsights = async () => {
    return await apiFetch('/ai/dashboard-insights');
  };

  const triggerAdaptiveSync = async () => {
    const res = await apiFetch('/planner/adaptive-sync', { method: 'POST' });
    await syncAllData();
    return res;
  };

  return (
    <StudyPlanContext.Provider
      value={{
        subjects,
        exams,
        tasks,
        studyPlans,
        progressLogs,
        achievements,
        notifications,
        isLoading,
        fetchSubjects,
        addSubject,
        updateSubject,
        deleteSubject,
        getUnits,
        addUnit,
        updateUnit,
        deleteUnit,
        addExam,
        updateExam,
        deleteExam,
        addTask,
        toggleTaskComplete,
        deleteTask,
        updateTaskDate,
        generateAIPlan,
        rescheduleMissedTasks,
        parseSyllabusPDF,
        sendChatMsg,
        askStudyAgent,
        logStudySession,
        unlockBadge,
        markNotificationRead,
        getPerformancePrediction,
        getWeakTopics,
        getAIRecommendations,
        getDifficultyEstimation,
        getDashboardInsights,
        triggerAdaptiveSync,
        syncAllData
      }}
    >
      {children}
    </StudyPlanContext.Provider>
  );
};

export const useStudyPlan = () => {
  const context = useContext(StudyPlanContext);
  if (!context) throw new Error('useStudyPlan must be used within StudyPlanProvider');
  return context;
};

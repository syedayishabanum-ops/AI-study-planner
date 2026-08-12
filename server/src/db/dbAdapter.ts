import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Setup types for Database Schema
export interface User {
  id: string;
  email: string;
  password_hash?: string; // Only used in local mock auth
  full_name: string;
  avatar_url: string;
  xp: number;
  streak: number;
  last_active: string;
  settings: {
    darkMode: boolean;
    studyReminders: boolean;
    examReminders: boolean;
    breakReminders: boolean;
    preferredHours: number;
  };
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  color: string;
  difficulty_level: 'easy' | 'medium' | 'hard';
  credits: number;
  priority: 'low' | 'medium' | 'high';
  current_grade?: number; // 0-100 percentage classroom grade
}

export interface Unit {
  id: string;
  subject_id: string;
  name: string;
  status: 'pending' | 'completed';
}

export interface Exam {
  id: string;
  user_id: string;
  subject_id: string;
  name: string;
  exam_date: string;
  weightage: number; // percentage, e.g. 20
  score?: number; // score/grade achieved, 0-100
}

export interface Task {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  status: 'pending' | 'completed';
  due_date: string;
  type: 'study' | 'revision' | 'exam' | 'task';
  priority: 'low' | 'medium' | 'high';
  duration_minutes: number;
  recurring: boolean;
  actual_duration_minutes?: number; // tracked duration spent
}

export interface StudyPlan {
  id: string;
  user_id: string;
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
      type: string;
    }>;
  }>;
}

export interface ProgressLog {
  id: string;
  user_id: string;
  date: string;
  study_hours: number;
  tasks_completed: number;
  productivity_score: number;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_type: string;
  badge_name: string;
  unlocked_at: string;
  description: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  scheduled_for: string;
  type: 'study' | 'exam' | 'break' | 'missed';
}

// Local Database Structure
interface LocalDB {
  users: User[];
  subjects: Subject[];
  units: Unit[];
  exams: Exam[];
  tasks: Task[];
  studyPlans: StudyPlan[];
  progress: ProgressLog[];
  achievements: Achievement[];
  notifications: Notification[];
}

const LOCAL_DB_PATH = path.join(__dirname, '../../data/local_db.json');

class DatabaseAdapter {
  private supabase: SupabaseClient | null = null;
  private isLocal = true;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.isLocal = false;
        console.log('Successfully initialized Supabase connection.');
      } catch (err) {
        console.error('Failed to connect to Supabase. Falling back to local database.', err);
        this.isLocal = true;
      }
    } else {
      console.log('Supabase credentials missing. Running database in local JSON fallback mode.');
      this.isLocal = true;
    }

    if (this.isLocal) {
      this.initLocalDB();
    }
  }

  getSupabaseClient(): SupabaseClient | null {
    return this.supabase;
  }

  getIsLocal(): boolean {
    return this.isLocal;
  }

  // Helper: Get local DB content
  private getLocalDB(): LocalDB {
    try {
      if (!fs.existsSync(LOCAL_DB_PATH)) {
        this.initLocalDB();
      }
      const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading local JSON database, returning empty schemas.', err);
      return {
        users: [],
        subjects: [],
        units: [],
        exams: [],
        tasks: [],
        studyPlans: [],
        progress: [],
        achievements: [],
        notifications: [],
      };
    }
  }

  // Helper: Save local DB content
  private saveLocalDB(db: LocalDB) {
    try {
      const dir = path.dirname(LOCAL_DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing to local JSON database.', err);
    }
  }

  // Helper: Initialize empty local DB with standard structure
  private initLocalDB() {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      const initialDB: LocalDB = {
        users: [],
        subjects: [],
        units: [],
        exams: [],
        tasks: [],
        studyPlans: [],
        progress: [],
        achievements: [],
        notifications: [],
      };
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initialDB, null, 2), 'utf-8');
    }
  }

  // ==================== USER OPERATIONS ====================
  async getUser(id: string): Promise<User | null> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      return db.users.find(u => u.id === id) || null;
    } else {
      const { data, error } = await this.supabase!
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      if (error) return null;
      return data;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    } else {
      const { data, error } = await this.supabase!
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      if (error) return null;
      return data;
    }
  }

  async createUser(
    user: Omit<User, 'id' | 'xp' | 'streak' | 'last_active'> & { password_hash?: string },
    explicitId?: string
  ): Promise<User> {
    const newUser: User = {
      ...user,
      id: explicitId || crypto.randomUUID(),
      xp: 0,
      streak: 1,
      last_active: new Date().toISOString().split('T')[0],
    };

    if (this.isLocal) {
      const db = this.getLocalDB();
      db.users.push(newUser);
      this.saveLocalDB(db);
      return newUser;
    } else {
      const { data, error } = await this.supabase!
        .from('users')
        .insert([newUser])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'email'>>): Promise<User> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      const idx = db.users.findIndex(u => u.id === id);
      if (idx === -1) throw new Error('User not found');
      db.users[idx] = { ...db.users[idx], ...updates, settings: { ...db.users[idx].settings, ...updates.settings } };
      this.saveLocalDB(db);
      return db.users[idx];
    } else {
      const { data, error } = await this.supabase!
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }

  // ==================== SUBJECT OPERATIONS ====================
  async getSubjects(userId: string): Promise<Subject[]> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      return db.subjects.filter(s => s.user_id === userId);
    } else {
      const { data, error } = await this.supabase!
        .from('subjects')
        .select('*')
        .eq('user_id', userId);
      if (error) return [];
      return data;
    }
  }

  async addSubject(userId: string, subject: Omit<Subject, 'id' | 'user_id'>): Promise<Subject> {
    const newSubject: Subject = {
      ...subject,
      id: crypto.randomUUID(),
      user_id: userId,
    };

    if (this.isLocal) {
      const db = this.getLocalDB();
      db.subjects.push(newSubject);
      this.saveLocalDB(db);
      return newSubject;
    } else {
      const { data, error } = await this.supabase!
        .from('subjects')
        .insert([newSubject])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }

  async updateSubject(userId: string, subjectId: string, updates: Partial<Omit<Subject, 'id' | 'user_id'>>): Promise<Subject> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      const idx = db.subjects.findIndex(s => s.id === subjectId && s.user_id === userId);
      if (idx === -1) throw new Error('Subject not found');
      db.subjects[idx] = { ...db.subjects[idx], ...updates };
      this.saveLocalDB(db);
      return db.subjects[idx];
    } else {
      const { data, error } = await this.supabase!
        .from('subjects')
        .update(updates)
        .eq('id', subjectId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }

  async deleteSubject(userId: string, subjectId: string): Promise<void> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      db.subjects = db.subjects.filter(s => !(s.id === subjectId && s.user_id === userId));
      // Cascade delete units, exams and tasks
      db.units = db.units.filter(u => u.subject_id !== subjectId);
      db.exams = db.exams.filter(e => e.subject_id !== subjectId);
      db.tasks = db.tasks.filter(t => t.subject_id !== subjectId);
      this.saveLocalDB(db);
    } else {
      const { error } = await this.supabase!
        .from('subjects')
        .delete()
        .eq('id', subjectId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
    }
  }

  // ==================== UNIT OPERATIONS ====================
  async getUnits(subjectId: string): Promise<Unit[]> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      return db.units.filter(u => u.subject_id === subjectId);
    } else {
      const { data, error } = await this.supabase!
        .from('units')
        .select('*')
        .eq('subject_id', subjectId);
      if (error) return [];
      return data;
    }
  }

  async addUnit(subjectId: string, name: string): Promise<Unit> {
    const newUnit: Unit = {
      id: crypto.randomUUID(),
      subject_id: subjectId,
      name,
      status: 'pending',
    };

    if (this.isLocal) {
      const db = this.getLocalDB();
      db.units.push(newUnit);
      this.saveLocalDB(db);
      return newUnit;
    } else {
      const { data, error } = await this.supabase!
        .from('units')
        .insert([newUnit])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }

  async updateUnit(subjectId: string, unitId: string, updates: Partial<Omit<Unit, 'id' | 'subject_id'>>): Promise<Unit> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      const idx = db.units.findIndex(u => u.id === unitId && u.subject_id === subjectId);
      if (idx === -1) throw new Error('Unit not found');
      db.units[idx] = { ...db.units[idx], ...updates };
      this.saveLocalDB(db);
      return db.units[idx];
    } else {
      const { data, error } = await this.supabase!
        .from('units')
        .update(updates)
        .eq('id', unitId)
        .eq('subject_id', subjectId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }

  async deleteUnit(subjectId: string, unitId: string): Promise<void> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      db.units = db.units.filter(u => !(u.id === unitId && u.subject_id === subjectId));
      this.saveLocalDB(db);
    } else {
      const { error } = await this.supabase!
        .from('units')
        .delete()
        .eq('id', unitId)
        .eq('subject_id', subjectId);
      if (error) throw new Error(error.message);
    }
  }

  // ==================== EXAM OPERATIONS ====================
  async getExams(userId: string): Promise<Exam[]> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      return db.exams.filter(e => e.user_id === userId);
    } else {
      const { data, error } = await this.supabase!
        .from('exams')
        .select('*')
        .eq('user_id', userId);
      if (error) return [];
      return data;
    }
  }

  async addExam(userId: string, exam: Omit<Exam, 'id' | 'user_id'>): Promise<Exam> {
    const newExam: Exam = {
      ...exam,
      id: crypto.randomUUID(),
      user_id: userId,
    };

    if (this.isLocal) {
      const db = this.getLocalDB();
      db.exams.push(newExam);
      this.saveLocalDB(db);
      return newExam;
    } else {
      const { data, error } = await this.supabase!
        .from('exams')
        .insert([newExam])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }

  async updateExam(userId: string, examId: string, updates: Partial<Omit<Exam, 'id' | 'user_id'>>): Promise<Exam> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      const idx = db.exams.findIndex(e => e.id === examId && e.user_id === userId);
      if (idx === -1) throw new Error('Exam not found');
      db.exams[idx] = { ...db.exams[idx], ...updates };
      this.saveLocalDB(db);
      return db.exams[idx];
    } else {
      const { data, error } = await this.supabase!
        .from('exams')
        .update(updates)
        .eq('id', examId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }

  async deleteExam(userId: string, examId: string): Promise<void> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      db.exams = db.exams.filter(e => !(e.id === examId && e.user_id === userId));
      this.saveLocalDB(db);
    } else {
      const { error } = await this.supabase!
        .from('exams')
        .delete()
        .eq('id', examId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
    }
  }

  // ==================== TASK OPERATIONS ====================
  async getTasks(userId: string): Promise<Task[]> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      return db.tasks.filter(t => t.user_id === userId);
    } else {
      const { data, error } = await this.supabase!
        .from('tasks')
        .select('*')
        .eq('user_id', userId);
      if (error) return [];
      return data;
    }
  }

  async addTask(userId: string, task: Omit<Task, 'id' | 'user_id'>): Promise<Task> {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      user_id: userId,
    };

    if (this.isLocal) {
      const db = this.getLocalDB();
      db.tasks.push(newTask);
      this.saveLocalDB(db);
      return newTask;
    } else {
      const { data, error } = await this.supabase!
        .from('tasks')
        .insert([newTask])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }

  async updateTask(userId: string, taskId: string, updates: Partial<Omit<Task, 'id' | 'user_id'>>): Promise<Task> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      const idx = db.tasks.findIndex(t => t.id === taskId && t.user_id === userId);
      if (idx === -1) throw new Error('Task not found');
      db.tasks[idx] = { ...db.tasks[idx], ...updates };
      this.saveLocalDB(db);
      return db.tasks[idx];
    } else {
      const { data, error } = await this.supabase!
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }

  async deleteTask(userId: string, taskId: string): Promise<void> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      db.tasks = db.tasks.filter(t => !(t.id === taskId && t.user_id === userId));
      this.saveLocalDB(db);
    } else {
      const { error } = await this.supabase!
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
    }
  }

  // ==================== STUDY PLAN OPERATIONS ====================
  async getStudyPlans(userId: string): Promise<StudyPlan[]> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      return db.studyPlans.filter(p => p.user_id === userId);
    } else {
      const { data, error } = await this.supabase!
        .from('study_plans')
        .select('*')
        .eq('user_id', userId);
      if (error) return [];
      return data;
    }
  }

  async addStudyPlan(userId: string, plan: Omit<StudyPlan, 'id' | 'user_id'>): Promise<StudyPlan> {
    const newPlan: StudyPlan = {
      ...plan,
      id: crypto.randomUUID(),
      user_id: userId,
    };

    if (this.isLocal) {
      const db = this.getLocalDB();
      db.studyPlans.push(newPlan);
      this.saveLocalDB(db);
      return newPlan;
    } else {
      const { data, error } = await this.supabase!
        .from('study_plans')
        .insert([newPlan])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }

  // ==================== PROGRESS LOG OPERATIONS ====================
  async getProgressLogs(userId: string): Promise<ProgressLog[]> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      return db.progress.filter(p => p.user_id === userId);
    } else {
      const { data, error } = await this.supabase!
        .from('progress')
        .select('*')
        .eq('user_id', userId);
      if (error) return [];
      return data;
    }
  }

  async addOrUpdateProgress(userId: string, date: string, updates: Partial<Omit<ProgressLog, 'id' | 'user_id' | 'date'>>): Promise<ProgressLog> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      let log = db.progress.find(p => p.user_id === userId && p.date === date);
      if (!log) {
        log = {
          id: crypto.randomUUID(),
          user_id: userId,
          date,
          study_hours: 0,
          tasks_completed: 0,
          productivity_score: 80, // Default productivity baseline
        };
        db.progress.push(log);
      }
      if (updates.study_hours !== undefined) log.study_hours += updates.study_hours;
      if (updates.tasks_completed !== undefined) log.tasks_completed += updates.tasks_completed;
      if (updates.productivity_score !== undefined) log.productivity_score = updates.productivity_score;

      this.saveLocalDB(db);
      return log;
    } else {
      // Supabase upsert logic or separate select and insert/update
      const { data: existing } = await this.supabase!
        .from('progress')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

      if (existing) {
        const payload: any = {};
        if (updates.study_hours !== undefined) payload.study_hours = existing.study_hours + updates.study_hours;
        if (updates.tasks_completed !== undefined) payload.tasks_completed = existing.tasks_completed + updates.tasks_completed;
        if (updates.productivity_score !== undefined) payload.productivity_score = updates.productivity_score;

        const { data, error } = await this.supabase!
          .from('progress')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data;
      } else {
        const payload = {
          id: crypto.randomUUID(),
          user_id: userId,
          date,
          study_hours: updates.study_hours || 0,
          tasks_completed: updates.tasks_completed || 0,
          productivity_score: updates.productivity_score || 80,
        };
        const { data, error } = await this.supabase!
          .from('progress')
          .insert([payload])
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data;
      }
    }
  }

  // ==================== ACHIEVEMENTS OPERATIONS ====================
  async getAchievements(userId: string): Promise<Achievement[]> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      return db.achievements.filter(a => a.user_id === userId);
    } else {
      const { data, error } = await this.supabase!
        .from('achievements')
        .select('*')
        .eq('user_id', userId);
      if (error) return [];
      return data;
    }
  }

  async unlockAchievement(userId: string, badgeName: string, type: string, description: string): Promise<Achievement | null> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      const existing = db.achievements.find(a => a.user_id === userId && a.badge_name === badgeName);
      if (existing) return null;

      const newBadge: Achievement = {
        id: crypto.randomUUID(),
        user_id: userId,
        achievement_type: type,
        badge_name: badgeName,
        description,
        unlocked_at: new Date().toISOString(),
      };
      db.achievements.push(newBadge);
      this.saveLocalDB(db);
      return newBadge;
    } else {
      const { data: existing } = await this.supabase!
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
        .eq('badge_name', badgeName)
        .maybeSingle();

      if (existing) return null;

      const newBadge = {
        id: crypto.randomUUID(),
        user_id: userId,
        achievement_type: type,
        badge_name: badgeName,
        description,
        unlocked_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase!
        .from('achievements')
        .insert([newBadge])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }

  // ==================== NOTIFICATIONS OPERATIONS ====================
  async getNotifications(userId: string): Promise<Notification[]> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      return db.notifications.filter(n => n.user_id === userId);
    } else {
      const { data, error } = await this.supabase!
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('scheduled_for', { ascending: false });
      if (error) return [];
      return data;
    }
  }

  async addNotification(userId: string, notification: Omit<Notification, 'id' | 'user_id' | 'read'>): Promise<Notification> {
    const newNotif: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      user_id: userId,
      read: false,
    };

    if (this.isLocal) {
      const db = this.getLocalDB();
      db.notifications.push(newNotif);
      this.saveLocalDB(db);
      return newNotif;
    } else {
      const { data, error } = await this.supabase!
        .from('notifications')
        .insert([newNotif])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }

  async markNotificationRead(userId: string, notifId: string): Promise<Notification> {
    if (this.isLocal) {
      const db = this.getLocalDB();
      const idx = db.notifications.findIndex(n => n.id === notifId && n.user_id === userId);
      if (idx === -1) throw new Error('Notification not found');
      db.notifications[idx].read = true;
      this.saveLocalDB(db);
      return db.notifications[idx];
    } else {
      const { data, error } = await this.supabase!
        .from('notifications')
        .update({ read: true })
        .eq('id', notifId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }
}

export const db = new DatabaseAdapter();

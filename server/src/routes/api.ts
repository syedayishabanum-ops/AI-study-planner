import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import express from 'express';
import { db, User, Subject, Exam, Task, ProgressLog, Achievement, Notification } from '../db/dbAdapter';
import { gemini } from '../services/geminiService';
import { aiAgent } from '../services/aiAgentService';
import { pdfService } from '../services/pdfService';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'AI Study Planner API is running'
  });
});
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_ai_study_planner_key_12345';

// Helper to sign JWT
const generateToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// ==================== AUTHENTICATION ROUTES ====================

// Signup
router.post('/auth/signup', async (req, res) => {
  const { email, password, fullName } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Basic validation checks
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    let explicitUserId: string | undefined = undefined;

    // Optional: Also register user in Supabase Auth if Supabase is active
    if (!db.getIsLocal()) {
      try {
        const { data: authData, error: authError } = await db.getSupabaseClient()!.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });
        if (!authError && authData?.user?.id) {
          explicitUserId = authData.user.id;
        }
      } catch (e) {
        console.warn('[Auth] Supabase GoTrue Auth signUp warning (fallback continuing):', e);
      }
    }

    // Always create student record in database table
    const userProfile = await db.createUser({
      email,
      password_hash,
      full_name: fullName,
      avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fullName)}`,
      settings: {
        darkMode: true,
        studyReminders: true,
        examReminders: true,
        breakReminders: true,
        preferredHours: 4,
      },
    }, explicitUserId);

    const token = generateToken(userProfile.id);
    res.status(201).json({ token, user: userProfile });
  } catch (err: any) {
    console.error('[Auth] Signup error:', err);
    res.status(500).json({ error: err.message || 'Signup failed.' });
  }
});

// Login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // 1. First check if user exists in database table
    let user = await db.getUserByEmail(email);

    // If user has a password_hash stored in database, check bcrypt
    if (user && user.password_hash) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (isMatch) {
        // Daily streak logic
        const todayStr = new Date().toISOString().split('T')[0];
        let newStreak = user.streak || 1;
        if (user.last_active) {
          const lastActiveDate = new Date(user.last_active);
          const todayDate = new Date(todayStr);
          const diffTime = Math.abs(todayDate.getTime() - lastActiveDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            newStreak += 1;
          } else if (diffDays > 1) {
            newStreak = 1;
          }
        }
        const updatedUser = await db.updateUser(user.id, {
          streak: newStreak,
          last_active: todayStr,
        });

        const token = generateToken(updatedUser.id);
        return res.json({ token, user: updatedUser });
      }
    }

    // 2. If not matched by password_hash or user was created in Supabase Auth directly, try Supabase Auth
    if (!db.getIsLocal()) {
      try {
        const { data: authData, error: authError } = await db.getSupabaseClient()!.auth.signInWithPassword({
          email,
          password,
        });

        if (!authError && authData.user) {
          if (!user) {
            user = await db.getUser(authData.user.id);
          }

          if (!user) {
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            user = await db.createUser({
              email,
              password_hash,
              full_name: authData.user.user_metadata?.full_name || email.split('@')[0],
              avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(authData.user.id)}`,
              settings: {
                darkMode: true,
                studyReminders: true,
                examReminders: true,
                breakReminders: true,
                preferredHours: 4,
              },
            }, authData.user.id);
          } else {
            // Update streak
            const todayStr = new Date().toISOString().split('T')[0];
            let newStreak = user.streak || 1;
            if (user.last_active) {
              const lastActiveDate = new Date(user.last_active);
              const todayDate = new Date(todayStr);
              const diffTime = Math.abs(todayDate.getTime() - lastActiveDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays === 1) {
                newStreak += 1;
              } else if (diffDays > 1) {
                newStreak = 1;
              }
            }
            user = await db.updateUser(user.id, {
              streak: newStreak,
              last_active: todayStr,
            });
          }

          const token = generateToken(user.id);
          return res.json({ token, user });
        }
      } catch (authErr) {
        console.warn('[Auth] Supabase auth.signInWithPassword notice:', authErr);
      }
    }

    return res.status(400).json({ error: 'Invalid email or password.' });
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// Mock Google Auth
router.post('/auth/google', async (req, res) => {
  const { email, fullName, avatarUrl } = req.body;

  if (!email || !fullName) {
    return res.status(400).json({ error: 'Email and name are required.' });
  }

  try {
    let user = await db.getUserByEmail(email);

    if (!user) {
      user = await db.createUser({
        email,
        full_name: fullName,
        avatar_url: avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fullName)}`,
        settings: {
          darkMode: true,
          studyReminders: true,
          examReminders: true,
          breakReminders: true,
          preferredHours: 4,
        },
      });
    } else {
      // Update streak
      const todayStr = new Date().toISOString().split('T')[0];
      let newStreak = user.streak || 1;
      if (user.last_active) {
        const lastActiveDate = new Date(user.last_active);
        const todayDate = new Date(todayStr);
        const diffTime = Math.abs(todayDate.getTime() - lastActiveDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      }
      user = await db.updateUser(user.id, {
        streak: newStreak,
        last_active: todayStr,
      });
    }

    const token = generateToken(user.id);
    res.json({ token, user });
  } catch (err: any) {
    console.error('[Auth] Google Auth error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Forgot Password Mock
router.post('/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  // Return mock successful code dispatch
  res.json({ message: 'A verification link has been sent to your email.' });
});

// Get User Profile
router.get('/auth/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await db.getUser(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile
router.put('/auth/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await db.updateUser(req.userId!, req.body);
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SUBJECTS ROUTES ====================

router.get('/subjects', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const subjects = await db.getSubjects(req.userId!);
    res.json(subjects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/subjects', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const subject = await db.addSubject(req.userId!, req.body);
    res.status(201).json(subject);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/subjects/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const subject = await db.updateSubject(req.userId!, req.params.id, req.body);
    res.json(subject);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/subjects/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await db.deleteSubject(req.userId!, req.params.id);
    res.json({ message: 'Subject and related tasks, exams, units deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== UNITS ROUTES ====================

router.get('/subjects/:subjectId/units', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const units = await db.getUnits(req.params.subjectId);
    res.json(units);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/subjects/:subjectId/units', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const unit = await db.addUnit(req.params.subjectId, req.body.name);
    res.status(201).json(unit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/subjects/:subjectId/units/:unitId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const unit = await db.updateUnit(req.params.subjectId, req.params.unitId, req.body);
    res.json(unit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/subjects/:subjectId/units/:unitId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await db.deleteUnit(req.params.subjectId, req.params.unitId);
    res.json({ message: 'Unit deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== EXAMS ROUTES ====================

router.get('/exams', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const exams = await db.getExams(req.userId!);
    res.json(exams);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/exams', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const exam = await db.addExam(req.userId!, req.body);
    res.status(201).json(exam);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/exams/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const exam = await db.updateExam(req.userId!, req.params.id, req.body);
    res.json(exam);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/exams/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await db.deleteExam(req.userId!, req.params.id);
    res.json({ message: 'Exam deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== TASKS ROUTES ====================

router.get('/tasks', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const tasks = await db.getTasks(req.userId!);
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tasks', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const task = await db.addTask(req.userId!, req.body);
    res.status(201).json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/tasks/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const task = await db.updateTask(req.userId!, req.params.id, req.body);
    
    // XP and Achievement logic when task is checked complete
    if (req.body.status === 'completed' && task.status === 'completed') {
      const user = await db.getUser(req.userId!);
      if (user) {
        let earnedXp = 10; // base task xp
        if (task.priority === 'high') earnedXp = 20;
        if (task.priority === 'medium') earnedXp = 15;

        const updatedUser = await db.updateUser(req.userId!, { xp: user.xp + earnedXp });

        // Update progress statistics
        const todayStr = new Date().toISOString().split('T')[0];
        await db.addOrUpdateProgress(req.userId!, todayStr, { tasks_completed: 1 });

        // Badge Checks
        if (updatedUser.xp >= 100) {
          await db.unlockAchievement(req.userId!, 'XP Novice', 'level', 'Reached 100 XP points');
        }
        if (updatedUser.xp >= 500) {
          await db.unlockAchievement(req.userId!, 'Expert Scholar', 'level', 'Reached 500 XP points');
        }
      }
    }

    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tasks/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await db.deleteTask(req.userId!, req.params.id);
    res.json({ message: 'Task deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== STUDY PLANNER GENERATOR ROUTES ====================

router.get('/planner/history', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const plans = await db.getStudyPlans(req.userId!);
    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/planner/generate', authenticateToken, async (req: AuthRequest, res) => {
  const { dailyHours, weakSubjects, preferredStudyTime, breakDuration, startDate, endDate } = req.body;

  if (!dailyHours || !startDate || !endDate) {
    return res.status(400).json({ error: 'dailyHours, startDate, and endDate are required.' });
  }

  try {
    // 1. Fetch user's subjects & exams to inject into Gemini prompt context
    const subjects = await db.getSubjects(req.userId!);
    const exams = await db.getExams(req.userId!);

    if (subjects.length === 0) {
      return res.status(400).json({ error: 'Please add at least one subject before generating a study plan.' });
    }

    // 2. Query AI generator
    const generated = await gemini.generateStudyPlan(subjects, exams, {
      dailyHours,
      weakSubjects: weakSubjects || [],
      preferredStudyTime: preferredStudyTime || 'morning',
      breakDuration: breakDuration || 10,
      startDate,
      endDate
    });

    // 3. Save generated plan into the database
    const studyPlan = await db.addStudyPlan(req.userId!, {
      start_date: startDate,
      end_date: endDate,
      config: {
        dailyHours,
        weakSubjects: weakSubjects || [],
        preferredStudyTime: preferredStudyTime || 'morning',
        breakDuration: breakDuration || 10
      },
      schedule: generated.schedule
    });

    // 4. Create tasks based on generated timetable slots
    const createdTasks: Task[] = [];
    for (const day of generated.schedule) {
      for (const slot of day.slots) {
        // Ensure subject_id is a valid UUID matching one of the user's subjects
        let targetSubjectId = slot.subjectId;
        if (!targetSubjectId || !subjects.some(s => s.id === targetSubjectId)) {
          const matched = subjects.find(s => s.name.toLowerCase() === (slot.subjectName || '').toLowerCase());
          targetSubjectId = matched ? matched.id : subjects[0].id;
        }

        const title = `${slot.type.toUpperCase()}: ${slot.subjectName} - ${slot.topic}`;
        const task = await db.addTask(req.userId!, {
          subject_id: targetSubjectId,
          title,
          status: 'pending',
          due_date: day.date,
          type: slot.type === 'revision' ? 'revision' : (slot.type === 'buffer' ? 'exam' : 'study'),
          priority: slot.type === 'buffer' ? 'high' : 'medium',
          duration_minutes: slot.duration,
          recurring: false
        });
        createdTasks.push(task);
      }
    }

    // Unlock achievement
    await db.unlockAchievement(req.userId!, 'Master Planner', 'planner', 'Generated your first AI-optimized study plan!');

    res.status(201).json({ studyPlan, generatedTasksCount: createdTasks.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Adaptive Rescheduling for missed tasks
router.post('/planner/reschedule', authenticateToken, async (req: AuthRequest, res) => {
  const { currentPlanId } = req.body;
  
  try {
    const plans = await db.getStudyPlans(req.userId!);
    const currentPlan = plans.find(p => p.id === currentPlanId) || plans[plans.length - 1];

    if (!currentPlan) {
      return res.status(404).json({ error: 'No active study plan found.' });
    }

    const tasks = await db.getTasks(req.userId!);
    const today = new Date().toISOString().split('T')[0];
    
    // Find tasks that are pending but due in the past or today
    const missedTasks = tasks.filter(t => t.status === 'pending' && t.due_date <= today);

    if (missedTasks.length === 0) {
      return res.json({ message: 'No missed tasks to reschedule.', studyPlan: currentPlan });
    }

    const updatedSchedule = await gemini.adaptiveReschedule(currentPlan, missedTasks, 5);

    // Update study plan
    // In dbAdapter, we need to update schedule. We can update config to reflect changes or make an updatePlan method.
    // For simplicity, we write over studyPlans
    const dbData: any = db;
    if (dbData.isLocal) {
      const localDb = dbData.getLocalDB();
      const planIdx = localDb.studyPlans.findIndex((p: any) => p.id === currentPlan.id);
      if (planIdx !== -1) {
        localDb.studyPlans[planIdx].schedule = updatedSchedule;
        dbData.saveLocalDB(localDb);
      }
    } else {
      await dbData.supabase!
        .from('study_plans')
        .update({ schedule: updatedSchedule })
        .eq('id', currentPlan.id);
    }

    // Adjust existing missed tasks due dates to tomorrow so they move in checklist
    const tomorrowStr = new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0];
    for (const task of missedTasks) {
      await db.updateTask(req.userId!, task.id, { due_date: tomorrowStr, title: `Rescheduled: ${task.title}` });
    }

    res.json({ message: 'AI Rescheduled missed tasks to future slots.', schedule: updatedSchedule });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ASSISTANT CHAT ROUTE ====================

router.post('/chat', authenticateToken, async (req: AuthRequest, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  try {
    const subjects = await db.getSubjects(req.userId!);
    const exams = await db.getExams(req.userId!);
    const tasks = await db.getTasks(req.userId!);
    const logs = await db.getProgressLogs(req.userId!);

    // Package extended statistics context to chatbot
    const prediction = await gemini.predictPerformance(subjects, exams, tasks, logs);
    const weakTopics = await gemini.detectWeakTopics(subjects, exams, tasks, logs);

    const enrichedContext: any = {
      subjects,
      exams,
      recentTasks: tasks,
      predictedGpa: prediction.predictedGpa,
      predictedGrade: prediction.grade,
      weakTopics: weakTopics.map(w => w.subjectName),
      studyHoursCount: logs.reduce((sum, item) => sum + (item.study_hours || 0), 0)
    };

    const reply = await gemini.askAssistant(message, history || [], enrichedContext);

    res.json({ reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== AI STUDY PLANNER AGENT ROUTE ====================

router.post('/agent/study', authenticateToken, async (req: AuthRequest, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  try {
    const result = await aiAgent.processRequest(req.userId!, message);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PDF UPLOAD SYLLABUS ROUTE ====================

router.post(
  '/syllabus/upload',
  authenticateToken,
  express.raw({ type: 'application/pdf', limit: '10mb' }),
  async (req: AuthRequest, res) => {
    if (!req.body || req.body.length === 0) {
      return res.status(400).json({ error: 'No PDF syllabus file buffer provided.' });
    }

    try {
      // 1. Extract text from PDF buffer
      const text = await pdfService.extractText(req.body);
      
      // 2. Feed text to Gemini syllabus parser
      const units = await gemini.extractSyllabusUnits(text);
      
      res.json({ units, length: text.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ==================== PROGRESS & ACHIEVEMENTS ROUTE ====================

router.get('/progress/logs', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const logs = await db.getProgressLogs(req.userId!);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Log study sessions manually or from Pomodoro completion
router.post('/progress/log', authenticateToken, async (req: AuthRequest, res) => {
  const { studyHours, productivityScore } = req.body;

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const log = await db.addOrUpdateProgress(req.userId!, todayStr, {
      study_hours: studyHours || 0,
      productivity_score: productivityScore || 80
    });

    // Award XP points for study hours (5 XP per hour)
    if (studyHours > 0) {
      const user = await db.getUser(req.userId!);
      if (user) {
        const earnedXp = Math.ceil(studyHours * 10);
        await db.updateUser(req.userId!, { xp: user.xp + earnedXp });
      }
    }

    res.json(log);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/progress/achievements', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const achievements = await db.getAchievements(req.userId!);
    res.json(achievements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/progress/badge', authenticateToken, async (req: AuthRequest, res) => {
  const { badgeName, type, description } = req.body;

  try {
    const badge = await db.unlockAchievement(req.userId!, badgeName, type, description);
    if (!badge) {
      return res.status(400).json({ message: 'Achievement already unlocked.' });
    }
    res.status(201).json(badge);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== NOTIFICATIONS ROUTES ====================

router.get('/notifications', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const notifications = await db.getNotifications(req.userId!);
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/notifications/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const notification = await db.markNotificationRead(req.userId!, req.params.id);
    res.json(notification);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== AI OPERATIONS ENDPOINTS ====================

router.get('/ai/performance-prediction', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const subjects = await db.getSubjects(req.userId!);
    const exams = await db.getExams(req.userId!);
    const tasks = await db.getTasks(req.userId!);
    const logs = await db.getProgressLogs(req.userId!);

    const prediction = await gemini.predictPerformance(subjects, exams, tasks, logs);
    res.json(prediction);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ai/weak-topics', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const subjects = await db.getSubjects(req.userId!);
    const exams = await db.getExams(req.userId!);
    const tasks = await db.getTasks(req.userId!);
    const logs = await db.getProgressLogs(req.userId!);

    const weakTopics = await gemini.detectWeakTopics(subjects, exams, tasks, logs);
    res.json(weakTopics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ai/recommendations', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const subjects = await db.getSubjects(req.userId!);
    const exams = await db.getExams(req.userId!);
    const tasks = await db.getTasks(req.userId!);
    const logs = await db.getProgressLogs(req.userId!);

    const recommendations = await gemini.getRecommendations(subjects, exams, tasks, logs);
    res.json(recommendations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ai/difficulty-estimation', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const subjects = await db.getSubjects(req.userId!);
    const tasks = await db.getTasks(req.userId!);
    const exams = await db.getExams(req.userId!);

    const difficulties = await gemini.estimateDifficulty(subjects, tasks, exams);
    res.json(difficulties);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ai/dashboard-insights', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const subjects = await db.getSubjects(req.userId!);
    const exams = await db.getExams(req.userId!);
    const tasks = await db.getTasks(req.userId!);
    const logs = await db.getProgressLogs(req.userId!);

    const prediction = await gemini.predictPerformance(subjects, exams, tasks, logs);
    const weakTopics = await gemini.detectWeakTopics(subjects, exams, tasks, logs);
    const recommendations = await gemini.getRecommendations(subjects, exams, tasks, logs);

    const totalHours = logs.reduce((sum, item) => sum + (item.study_hours || 0), 0);
    const avgHours = logs.length > 0 ? (totalHours / logs.length) : 0;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const taskRatio = totalTasks > 0 ? (completedTasks / totalTasks) : 0;

    res.json({
      prediction,
      weakTopics,
      recommendations,
      stats: {
        avgStudyHours: parseFloat(avgHours.toFixed(1)),
        taskCompletionRate: Math.round(taskRatio * 100),
        totalStudyHours: totalHours,
        completedTasks,
        totalTasks
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/planner/adaptive-sync', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const plans = await db.getStudyPlans(req.userId!);
    const currentPlan = plans[plans.length - 1];

    if (!currentPlan) {
      return res.status(404).json({ error: 'No active study plan found.' });
    }

    const tasks = await db.getTasks(req.userId!);
    const today = new Date().toISOString().split('T')[0];
    
    // Auto-detect missed tasks: pending and due on or before today
    const missedTasks = tasks.filter(t => t.status === 'pending' && t.due_date <= today);
    
    if (missedTasks.length === 0) {
      return res.json({ message: 'Plan is fully up to date.', studyPlan: currentPlan });
    }

    // Re-route the missed tasks through gemini rescheduling engine
    const updatedSchedule = await gemini.adaptiveReschedule(currentPlan, missedTasks, 5);

    // Save updated schedule in study plan record
    const dbData: any = db;
    if (dbData.isLocal) {
      const localDb = dbData.getLocalDB();
      const planIdx = localDb.studyPlans.findIndex((p: any) => p.id === currentPlan.id);
      if (planIdx !== -1) {
        localDb.studyPlans[planIdx].schedule = updatedSchedule;
        dbData.saveLocalDB(localDb);
      }
    } else {
      await dbData.supabase!
        .from('study_plans')
        .update({ schedule: updatedSchedule })
        .eq('id', currentPlan.id);
    }

    // Shift missed task due dates in database to tomorrow
    const tomorrowStr = new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0];
    for (const task of missedTasks) {
      await db.updateTask(req.userId!, task.id, { due_date: tomorrowStr, title: `Rescheduled: ${task.title}` });
    }

    res.json({ message: 'Adaptive sync: Shifted overdue tasks to future slots.', schedule: updatedSchedule });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// General health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

export default router;

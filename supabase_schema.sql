-- ================================================================================
-- Aegis AI Study Planner - Complete Supabase Database Schema & Setup Script
-- ================================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project and navigate to the "SQL Editor" tab on the left sidebar.
-- 3. Click "+ New query", paste this entire script, and click "Run".
-- ================================================================================

-- Enable UUID & cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

--------------------------------------------------------------------------------
-- 1. USERS TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT, -- Optional, used for local fallback auth
    full_name TEXT NOT NULL DEFAULT 'Student',
    avatar_url TEXT NOT NULL DEFAULT 'https://api.dicebear.com/7.x/adventurer/svg?seed=student',
    xp INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 1,
    last_active DATE NOT NULL DEFAULT CURRENT_DATE,
    settings JSONB NOT NULL DEFAULT '{"darkMode": true, "studyReminders": true, "examReminders": true, "breakReminders": true, "preferredHours": 4}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- If users table was previously created with auth.users foreign key constraint, remove it to allow flexible authentication
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Enable RLS and create open policy for the API server
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access for users" ON public.users;
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
    DROP POLICY IF EXISTS "Allow server/service role full access to users" ON public.users;
    DROP POLICY IF EXISTS "Allow server and authenticated access to users" ON public.users;
    DROP POLICY IF EXISTS "Allow server or user access to users" ON public.users;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Allow server and authenticated access to users"
    ON public.users FOR ALL
    USING (true)
    WITH CHECK (true);

--------------------------------------------------------------------------------
-- 2. SUBJECTS TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366F1',
    difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    credits INTEGER NOT NULL DEFAULT 3 CHECK (credits > 0),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    current_grade NUMERIC CHECK (current_grade >= 0 AND current_grade <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure columns exist if table was previously created with fewer columns
DO $$ BEGIN
    ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';
    ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS current_grade NUMERIC;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects(user_id);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access for subjects" ON public.subjects;
    DROP POLICY IF EXISTS "Users can view their own subjects" ON public.subjects;
    DROP POLICY IF EXISTS "Users can insert their own subjects" ON public.subjects;
    DROP POLICY IF EXISTS "Users can update their own subjects" ON public.subjects;
    DROP POLICY IF EXISTS "Users can delete their own subjects" ON public.subjects;
    DROP POLICY IF EXISTS "Allow server and authenticated access to subjects" ON public.subjects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Allow server and authenticated access to subjects"
    ON public.subjects FOR ALL
    USING (true)
    WITH CHECK (true);

--------------------------------------------------------------------------------
-- 3. UNITS TABLE (Syllabus Units & Checklist)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_units_subject_id ON public.units(subject_id);
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access for units" ON public.units;
    DROP POLICY IF EXISTS "Users can view units for their subjects" ON public.units;
    DROP POLICY IF EXISTS "Users can insert units into their subjects" ON public.units;
    DROP POLICY IF EXISTS "Users can update units in their subjects" ON public.units;
    DROP POLICY IF EXISTS "Users can delete units from their subjects" ON public.units;
    DROP POLICY IF EXISTS "Allow server and authenticated access to units" ON public.units;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Allow server and authenticated access to units"
    ON public.units FOR ALL
    USING (true)
    WITH CHECK (true);

--------------------------------------------------------------------------------
-- 4. EXAMS TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    exam_date TIMESTAMP WITH TIME ZONE NOT NULL,
    weightage INTEGER NOT NULL DEFAULT 20 CHECK (weightage >= 0 AND weightage <= 100),
    score NUMERIC CHECK (score >= 0 AND score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exams_user_id ON public.exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON public.exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_exams_date ON public.exams(exam_date);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access for exams" ON public.exams;
    DROP POLICY IF EXISTS "Users can view their own exams" ON public.exams;
    DROP POLICY IF EXISTS "Users can insert their own exams" ON public.exams;
    DROP POLICY IF EXISTS "Users can update their own exams" ON public.exams;
    DROP POLICY IF EXISTS "Users can delete their own exams" ON public.exams;
    DROP POLICY IF EXISTS "Allow server and authenticated access to exams" ON public.exams;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Allow server and authenticated access to exams"
    ON public.exams FOR ALL
    USING (true)
    WITH CHECK (true);

--------------------------------------------------------------------------------
-- 5. TASKS TABLE (Study, Revision, Exam Prep, Custom Tasks)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT NOT NULL DEFAULT 'study' CHECK (type IN ('study', 'revision', 'exam', 'task')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    duration_minutes INTEGER NOT NULL DEFAULT 45 CHECK (duration_minutes >= 0),
    recurring BOOLEAN NOT NULL DEFAULT FALSE,
    actual_duration_minutes INTEGER CHECK (actual_duration_minutes >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_subject_id ON public.tasks(subject_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access for tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Allow server and authenticated access to tasks" ON public.tasks;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Allow server and authenticated access to tasks"
    ON public.tasks FOR ALL
    USING (true)
    WITH CHECK (true);

--------------------------------------------------------------------------------
-- 6. STUDY PLANS TABLE (AI Schedules & Timetables)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    config JSONB NOT NULL,
    schedule JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON public.study_plans(user_id);
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access for study_plans" ON public.study_plans;
    DROP POLICY IF EXISTS "Users can view their own study plans" ON public.study_plans;
    DROP POLICY IF EXISTS "Users can insert their own study plans" ON public.study_plans;
    DROP POLICY IF EXISTS "Users can update their own study plans" ON public.study_plans;
    DROP POLICY IF EXISTS "Users can delete their own study plans" ON public.study_plans;
    DROP POLICY IF EXISTS "Allow server and authenticated access to study_plans" ON public.study_plans;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Allow server and authenticated access to study_plans"
    ON public.study_plans FOR ALL
    USING (true)
    WITH CHECK (true);

--------------------------------------------------------------------------------
-- 7. PROGRESS TABLE (Daily Logs, Hours, Streaks & Productivity)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    study_hours NUMERIC NOT NULL DEFAULT 0 CHECK (study_hours >= 0),
    tasks_completed INTEGER NOT NULL DEFAULT 0 CHECK (tasks_completed >= 0),
    productivity_score INTEGER NOT NULL DEFAULT 80 CHECK (productivity_score >= 0 AND productivity_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_progress_user_id ON public.progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_date ON public.progress(date);
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access for progress" ON public.progress;
    DROP POLICY IF EXISTS "Users can view their own progress logs" ON public.progress;
    DROP POLICY IF EXISTS "Users can insert their own progress logs" ON public.progress;
    DROP POLICY IF EXISTS "Users can update their own progress logs" ON public.progress;
    DROP POLICY IF EXISTS "Users can delete their own progress logs" ON public.progress;
    DROP POLICY IF EXISTS "Allow server and authenticated access to progress" ON public.progress;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Allow server and authenticated access to progress"
    ON public.progress FOR ALL
    USING (true)
    WITH CHECK (true);

--------------------------------------------------------------------------------
-- 8. ACHIEVEMENTS TABLE (Badges & Gamification)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    badge_name TEXT NOT NULL,
    description TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_badge UNIQUE (user_id, badge_name)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access for achievements" ON public.achievements;
    DROP POLICY IF EXISTS "Users can view their own achievements" ON public.achievements;
    DROP POLICY IF EXISTS "Users can insert/unlock achievements" ON public.achievements;
    DROP POLICY IF EXISTS "Allow server and authenticated access to achievements" ON public.achievements;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Allow server and authenticated access to achievements"
    ON public.achievements FOR ALL
    USING (true)
    WITH CHECK (true);

--------------------------------------------------------------------------------
-- 9. NOTIFICATIONS TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('study', 'exam', 'break', 'missed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access for notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Allow server and authenticated access to notifications" ON public.notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Allow server and authenticated access to notifications"
    ON public.notifications FOR ALL
    USING (true)
    WITH CHECK (true);

--------------------------------------------------------------------------------
-- 10. AUTH TRIGGER (Auto-create public.users profile on Supabase Auth Signup)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.users (
        id,
        email,
        full_name,
        avatar_url,
        xp,
        streak,
        last_active,
        settings
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            'https://api.dicebear.com/7.x/adventurer/svg?seed=' || encode(digest(NEW.email, 'sha256'), 'hex')
        ),
        0,
        1,
        CURRENT_DATE,
        '{"darkMode": true, "studyReminders": true, "examReminders": true, "breakReminders": true, "preferredHours": 4}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE 
    SET 
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

--------------------------------------------------------------------------------
-- 11. REALTIME REPLICATION (For live tasks, notifications, and progress)
--------------------------------------------------------------------------------
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.progress;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.achievements;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

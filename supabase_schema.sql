-- Supabase Database Schema for Aegis AI Study Planner
-- Paste this script into the Supabase SQL Editor (https://supabase.com) to initialize your database tables.

--------------------------------------------------------------------------------
-- 1. USERS TABLE (Linked to Supabase Auth)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT, -- Optional, used only for local fallback auth
    full_name TEXT NOT NULL,
    avatar_url TEXT NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 1,
    last_active DATE NOT NULL DEFAULT CURRENT_DATE,
    settings JSONB NOT NULL DEFAULT '{"darkMode": true, "studyReminders": true, "examReminders": true, "breakReminders": true, "preferredHours": 4}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS policies for users
CREATE POLICY "Users can view their own profile" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.users FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Allow server/service role to insert or manage all profiles"
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
    color TEXT NOT NULL,
    difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    credits INTEGER NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    current_grade NUMERIC CHECK (current_grade >= 0 AND current_grade <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects(user_id);

-- Enable RLS on subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- RLS policies for subjects
CREATE POLICY "Users can view their own subjects" 
    ON public.subjects FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subjects" 
    ON public.subjects FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subjects" 
    ON public.subjects FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subjects" 
    ON public.subjects FOR DELETE 
    USING (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 3. UNITS TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on subject_id for faster queries
CREATE INDEX IF NOT EXISTS idx_units_subject_id ON public.units(subject_id);

-- Enable RLS on units
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- RLS policies for units (relying on subject ownership)
CREATE POLICY "Users can view units for their subjects" 
    ON public.units FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.subjects 
        WHERE public.subjects.id = public.units.subject_id AND public.subjects.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert units into their subjects" 
    ON public.units FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.subjects 
        WHERE public.subjects.id = public.units.subject_id AND public.subjects.user_id = auth.uid()
    ));

CREATE POLICY "Users can update units in their subjects" 
    ON public.units FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM public.subjects 
        WHERE public.subjects.id = public.units.subject_id AND public.subjects.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete units from their subjects" 
    ON public.units FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM public.subjects 
        WHERE public.subjects.id = public.units.subject_id AND public.subjects.user_id = auth.uid()
    ));

--------------------------------------------------------------------------------
-- 4. EXAMS TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    exam_date TIMESTAMP WITH TIME ZONE NOT NULL,
    weightage INTEGER NOT NULL CHECK (weightage >= 0 AND weightage <= 100),
    score NUMERIC CHECK (score >= 0 AND score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exams_user_id ON public.exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON public.exams(subject_id);

-- Enable RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- RLS policies for exams
CREATE POLICY "Users can view their own exams" 
    ON public.exams FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exams" 
    ON public.exams FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exams" 
    ON public.exams FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exams" 
    ON public.exams FOR DELETE 
    USING (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 5. TASKS TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('study', 'revision', 'exam', 'task')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 0),
    recurring BOOLEAN NOT NULL DEFAULT FALSE,
    actual_duration_minutes INTEGER CHECK (actual_duration_minutes >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_subject_id ON public.tasks(subject_id);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for tasks
CREATE POLICY "Users can view their own tasks" 
    ON public.tasks FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" 
    ON public.tasks FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" 
    ON public.tasks FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" 
    ON public.tasks FOR DELETE 
    USING (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 6. STUDY PLANS TABLE
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

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON public.study_plans(user_id);

-- Enable RLS
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for study plans
CREATE POLICY "Users can view their own study plans" 
    ON public.study_plans FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study plans" 
    ON public.study_plans FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study plans" 
    ON public.study_plans FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study plans" 
    ON public.study_plans FOR DELETE 
    USING (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 7. PROGRESS TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    study_hours NUMERIC NOT NULL DEFAULT 0 CHECK (study_hours >= 0),
    tasks_completed INTEGER NOT NULL DEFAULT 0 CHECK (tasks_completed >= 0),
    productivity_score INTEGER NOT NULL DEFAULT 80 CHECK (productivity_score >= 0 AND productivity_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Add unique constraint per user per date so upserts work cleanly
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON public.progress(user_id);

-- Enable RLS
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for progress logs
CREATE POLICY "Users can view their own progress logs" 
    ON public.progress FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress logs" 
    ON public.progress FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress logs" 
    ON public.progress FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress logs" 
    ON public.progress FOR DELETE 
    USING (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 8. ACHIEVEMENTS TABLE
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

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies for achievements
CREATE POLICY "Users can view their own achievements" 
    ON public.achievements FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/unlock achievements" 
    ON public.achievements FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

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

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" 
    ON public.notifications FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications" 
    ON public.notifications FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
    ON public.notifications FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
    ON public.notifications FOR DELETE 
    USING (auth.uid() = user_id);

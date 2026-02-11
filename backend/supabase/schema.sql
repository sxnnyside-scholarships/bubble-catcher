-- Bubble Catcher Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Bubble Profiles (App-specific user profiles)
-- References auth.users(id) and logically linked to sxnny_users via same UUID
-- ============================================
CREATE TABLE IF NOT EXISTS bubble_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'enterprise')),
  preferred_theme TEXT NOT NULL DEFAULT 'colorful' CHECK (preferred_theme IN ('colorful', 'light', 'dark')),
  preferred_locale TEXT NOT NULL DEFAULT 'en' CHECK (preferred_locale IN ('en', 'es')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Bubble Projects
-- ============================================
CREATE TABLE IF NOT EXISTS bubble_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  dialect TEXT NOT NULL CHECK (dialect IN ('mysql', 'mariadb', 'postgresql', 'sqlite', 'mssql', 'oracle')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bubble_projects_user_id ON bubble_projects(user_id);

-- ============================================
-- Bubble Saved Queries
-- ============================================
CREATE TABLE IF NOT EXISTS bubble_saved_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES bubble_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  sql TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bubble_saved_queries_project_id ON bubble_saved_queries(project_id);

-- ============================================
-- Bubble Execution History
-- ============================================
CREATE TABLE IF NOT EXISTS bubble_execution_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES bubble_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sql TEXT NOT NULL,
  dialect TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout', 'killed')),
  result_summary TEXT,
  error TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bubble_execution_history_project_id ON bubble_execution_history(project_id);
CREATE INDEX IF NOT EXISTS idx_bubble_execution_history_user_id ON bubble_execution_history(user_id);
CREATE INDEX IF NOT EXISTS idx_bubble_execution_history_created_at ON bubble_execution_history(created_at DESC);

-- ============================================
-- Updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_bubble_profiles
  BEFORE UPDATE ON bubble_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_bubble_projects
  BEFORE UPDATE ON bubble_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_bubble_saved_queries
  BEFORE UPDATE ON bubble_saved_queries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE bubble_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bubble_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE bubble_saved_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bubble_execution_history ENABLE ROW LEVEL SECURITY;

-- Bubble profiles: users can read/update only their own
CREATE POLICY "Users can view own profile"
  ON bubble_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON bubble_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Bubble projects: users can CRUD only their own
CREATE POLICY "Users can view own projects"
  ON bubble_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON bubble_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON bubble_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON bubble_projects FOR DELETE
  USING (auth.uid() = user_id);

-- Bubble saved queries: access through project ownership
CREATE POLICY "Users can view queries in own projects"
  ON bubble_saved_queries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bubble_projects
      WHERE bubble_projects.id = bubble_saved_queries.project_id
      AND bubble_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create queries in own projects"
  ON bubble_saved_queries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bubble_projects
      WHERE bubble_projects.id = bubble_saved_queries.project_id
      AND bubble_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update queries in own projects"
  ON bubble_saved_queries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bubble_projects
      WHERE bubble_projects.id = bubble_saved_queries.project_id
      AND bubble_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete queries in own projects"
  ON bubble_saved_queries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM bubble_projects
      WHERE bubble_projects.id = bubble_saved_queries.project_id
      AND bubble_projects.user_id = auth.uid()
    )
  );

-- Bubble execution history: users can view/create in own projects
CREATE POLICY "Users can view own execution history"
  ON bubble_execution_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create execution history"
  ON bubble_execution_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Project limit enforcement function
-- Reads plan from bubble_profiles, enforces 3-project limit for free plan
-- ============================================
CREATE OR REPLACE FUNCTION enforce_bubble_project_limit()
RETURNS TRIGGER AS $$
DECLARE
  project_count INTEGER;
  user_plan TEXT;
BEGIN
  SELECT plan INTO user_plan
  FROM bubble_profiles
  WHERE id = NEW.user_id;

  IF user_plan IS NULL OR user_plan = 'free' THEN
    SELECT COUNT(*) INTO project_count
    FROM bubble_projects
    WHERE user_id = NEW.user_id;

    IF project_count >= 3 THEN
      RAISE EXCEPTION 'Free plan allows a maximum of 3 projects';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_bubble_project_limit_trigger
  BEFORE INSERT ON bubble_projects
  FOR EACH ROW EXECUTE FUNCTION enforce_bubble_project_limit();

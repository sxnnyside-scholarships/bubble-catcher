-- Custom SQL, applied after `drizzle-kit migrate`.
-- Portable PL/pgSQL, agnostic to Supabase — keeps updated_at in sync
-- without requiring every service to set it manually on each UPDATE.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_users ON users;
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_bubble_projects ON bubble_projects;
CREATE TRIGGER set_updated_at_bubble_projects
  BEFORE UPDATE ON bubble_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_bubble_saved_queries ON bubble_saved_queries;
CREATE TRIGGER set_updated_at_bubble_saved_queries
  BEFORE UPDATE ON bubble_saved_queries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- NOTE: the old `enforce_bubble_project_limit` trigger was intentionally
-- removed. The per-user project limit is now enforced in
-- backend/src/services/project.service.ts against config.maxProjectsPerUser
-- (an instance-wide env-configurable constant, since there are no plan tiers
-- anymore) instead of a DB trigger that looked up a per-user plan.

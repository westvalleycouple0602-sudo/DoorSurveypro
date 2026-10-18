CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant ON memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_floor_plans_project ON floor_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_openings_floor_plan ON openings(floor_plan_id);
CREATE INDEX IF NOT EXISTS idx_openings_code ON openings(code);

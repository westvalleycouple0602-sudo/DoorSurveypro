-- Performance Optimization: Database Indexes
-- Created: October 26, 2025
-- Purpose: Improve query performance for frequently accessed tables

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_org_status ON projects(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Door Openings table indexes
CREATE INDEX IF NOT EXISTS idx_door_openings_project_id ON door_openings(project_id);
CREATE INDEX IF NOT EXISTS idx_door_openings_organization_id ON door_openings(organization_id);
CREATE INDEX IF NOT EXISTS idx_door_openings_number ON door_openings(opening_number);
CREATE INDEX IF NOT EXISTS idx_door_openings_project_org ON door_openings(project_id, organization_id);

-- Photos table indexes
CREATE INDEX IF NOT EXISTS idx_photos_opening_id ON photos(opening_id);
CREATE INDEX IF NOT EXISTS idx_photos_type ON photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_photos_opening_type ON photos(opening_id, photo_type);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(uploaded_at DESC);

-- Hardware table indexes
CREATE INDEX IF NOT EXISTS idx_door_hardware_opening_id ON door_hardware(opening_id);
CREATE INDEX IF NOT EXISTS idx_door_hardware_type ON door_hardware(hardware_type);
CREATE INDEX IF NOT EXISTS idx_door_hardware_manufacturer ON door_hardware(manufacturer_id);

-- Quotes table indexes
CREATE INDEX IF NOT EXISTS idx_quotes_project_id ON quotes(project_id);
CREATE INDEX IF NOT EXISTS idx_quotes_organization_id ON quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_org_status ON quotes(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);

-- Purchase Orders table indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_id ON purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_quote_id ON purchase_orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_id ON purchase_orders(organization_id);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_replit_id ON users(replit_user_id);

-- Organization memberships indexes
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_id ON organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON organization_memberships(role);
CREATE INDEX IF NOT EXISTS idx_memberships_user_org ON organization_memberships(user_id, organization_id);

-- Catalog items indexes
CREATE INDEX IF NOT EXISTS idx_catalog_items_org_id ON catalog_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items(category);
CREATE INDEX IF NOT EXISTS idx_catalog_items_active ON catalog_items(is_active);

-- Audit logs indexes (for compliance and debugging)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Partner pricing indexes
CREATE INDEX IF NOT EXISTS idx_partner_pricing_item_id ON partner_pricing(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_partner_pricing_partner ON partner_pricing(partner_name);

-- Comment explaining index strategy
COMMENT ON INDEX idx_projects_org_status IS 'Composite index for filtering projects by organization and status';
COMMENT ON INDEX idx_door_openings_project_org IS 'Composite index for multi-tenant project isolation';
COMMENT ON INDEX idx_photos_opening_type IS 'Composite index for photo type queries per opening';
COMMENT ON INDEX idx_quotes_org_status IS 'Composite index for quote dashboard filtering';

-- Analyze tables to update statistics for query planner
ANALYZE projects;
ANALYZE door_openings;
ANALYZE photos;
ANALYZE door_hardware;
ANALYZE quotes;
ANALYZE purchase_orders;
ANALYZE users;
ANALYZE organization_memberships;
ANALYZE catalog_items;
ANALYZE audit_logs;
ANALYZE partner_pricing;

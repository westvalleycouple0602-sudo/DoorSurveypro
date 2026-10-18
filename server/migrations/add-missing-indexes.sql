-- ============================================================================
-- Performance Optimization: Additional Strategic Indexes
-- ============================================================================
-- Only adds missing indexes that don't already exist

-- Door openings: Improve filtering by status and created date
CREATE INDEX IF NOT EXISTS idx_door_openings_status ON door_openings(status);
CREATE INDEX IF NOT EXISTS idx_door_openings_created_at ON door_openings(created_at);

-- Hardware items: Improve filtering by type and condition
CREATE INDEX IF NOT EXISTS idx_hardware_items_item_type ON hardware_items(item_type);
CREATE INDEX IF NOT EXISTS idx_hardware_items_condition ON hardware_items(condition);

-- Photos: Improve sorting by date
CREATE INDEX IF NOT EXISTS idx_photos_captured_at ON photos(captured_at);

-- Catalog items: Composite index for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_catalog_items_org_category ON catalog_items(organization_id, category);

-- Organizations: Improve subscription status queries
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON organizations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_organizations_tier ON organizations(subscription_tier);

-- Users: Improve role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Customers: Improve organization queries
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON customers(organization_id);

-- Purchase orders: Composite for organization + status filtering
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_status ON purchase_orders(organization_id, status);

-- LiDAR scans: Improve lookup by opening
CREATE INDEX IF NOT EXISTS idx_lidar_scans_opening_id ON lidar_scans(opening_id);

-- Hardware scans: Improve lookup by opening
CREATE INDEX IF NOT EXISTS idx_hardware_scans_opening_id ON hardware_scans(opening_id);

-- Compliance violations: Improve lookup and filtering
CREATE INDEX IF NOT EXISTS idx_compliance_violations_opening_id ON compliance_violations(opening_id);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_severity ON compliance_violations(severity);

-- Floor plans: Improve project lookup
CREATE INDEX IF NOT EXISTS idx_floor_plans_project_id ON floor_plans(project_id);

-- Wiring diagrams: Improve project lookup
CREATE INDEX IF NOT EXISTS idx_wiring_diagrams_project_id ON wiring_diagrams(project_id);

-- Quote requests: Improve status and date filtering
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at ON quote_requests(created_at);

-- Leads: Improve status filtering for sales funnel
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);

-- Marketing campaigns: Improve organization lookup
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_organization_id ON marketing_campaigns(organization_id);

-- Sales activities: Improve lead and campaign lookup
CREATE INDEX IF NOT EXISTS idx_sales_activities_lead_id ON sales_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_activities_campaign_id ON sales_activities(campaign_id);

-- Update table statistics for query planner
ANALYZE door_openings;
ANALYZE hardware_items;
ANALYZE photos;
ANALYZE catalog_items;
ANALYZE organizations;
ANALYZE users;
ANALYZE customers;
ANALYZE purchase_orders;
ANALYZE lidar_scans;
ANALYZE hardware_scans;
ANALYZE compliance_violations;
ANALYZE floor_plans;
ANALYZE wiring_diagrams;
ANALYZE quote_requests;
ANALYZE leads;
ANALYZE marketing_campaigns;
ANALYZE sales_activities;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Successfully added performance indexes for multi-tenant SaaS optimization';
END
$$;

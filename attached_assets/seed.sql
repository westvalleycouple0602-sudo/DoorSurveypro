-- Seed minimal data
DO $$ BEGIN
  INSERT INTO tenants (id, name) VALUES ('00000000-0000-0000-0000-000000000001','Demo Workspace') ON CONFLICT DO NOTHING;
  INSERT INTO users (id, email, password_hash, display_name) VALUES ('00000000-0000-0000-0000-0000000000aa','demo@doorsurvey.pro','seed','Demo User') ON CONFLICT DO NOTHING;
  INSERT INTO memberships (id, tenant_id, user_id, role) VALUES ('00000000-0000-0000-0000-0000000000bb','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000aa','owner') ON CONFLICT DO NOTHING;
  INSERT INTO projects (id, tenant_id, name, address) VALUES ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','HQ Retrofit','123 Main, Phoenix, AZ') ON CONFLICT DO NOTHING;
  INSERT INTO floor_plans (id, project_id, name, image_url, width_px, height_px, scale_pixels_per_unit, scale_unit) VALUES ('00000000-0000-0000-0000-000000000100','00000000-0000-0000-0000-000000000010','Level 1 - North Wing','/plans/level1.png',2400,1800,48,'ft') ON CONFLICT DO NOTHING;
  INSERT INTO openings (id, floor_plan_id, code, label, type, status, x, y) VALUES
    ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000100','D-104A','Office 104','Hinged','existing','0.3840','0.6120'),
    ('00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000100','D-105','Lobby Entrance','Automatic','installed','0.5800','0.4400')
  ON CONFLICT DO NOTHING;
END $$;

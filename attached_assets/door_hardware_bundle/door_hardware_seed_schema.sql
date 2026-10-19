
-- Door Hardware Seed Schema (PostgreSQL)
CREATE TABLE IF NOT EXISTS hardware_items (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  subtype TEXT,
  brand TEXT,
  model TEXT,
  nomenclature TEXT,
  grade TEXT,
  bhma_standard TEXT,
  bhma_certified BOOLEAN,
  msrp NUMERIC,
  typical_price NUMERIC,
  material TEXT,
  finish_options TEXT,
  dimensions TEXT,
  door_thickness TEXT,
  power TEXT,
  features TEXT,
  use TEXT,
  fire_rating TEXT,
  ada_compliant TEXT,
  cross_ref TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS bhma_finishes (
  code_us TEXT PRIMARY KEY,
  code_bhma TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS lock_functions (
  id SERIAL PRIMARY KEY,
  category TEXT,
  function TEXT,
  typical_use TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS function_catalog (
  id SERIAL PRIMARY KEY,
  brand TEXT,
  family TEXT,
  function_code TEXT,
  name TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS code_rules (
  rule_id TEXT PRIMARY KEY,
  category TEXT,
  condition TEXT,
  jurisdiction TEXT,
  severity TEXT,
  guidance TEXT
);

CREATE TABLE IF NOT EXISTS ahj_variations (
  id SERIAL PRIMARY KEY,
  state TEXT,
  code_edition TEXT,
  rule_id TEXT REFERENCES code_rules(rule_id),
  override TEXT,
  notes TEXT
);

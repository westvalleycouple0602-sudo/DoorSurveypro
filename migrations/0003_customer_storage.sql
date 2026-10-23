-- Additive only. Review/apply separately; never replay baselines or force schema push.
CREATE TABLE IF NOT EXISTS customer_storage_destinations (
  organization_id varchar NOT NULL,
  id varchar NOT NULL,
  data jsonb NOT NULL,
  PRIMARY KEY (organization_id, id)
);
CREATE TABLE IF NOT EXISTS customer_storage_archives (
  organization_id varchar NOT NULL,
  id varchar NOT NULL,
  destination_id varchar NOT NULL,
  identity_key text NOT NULL,
  data jsonb NOT NULL,
  PRIMARY KEY (organization_id, id),
  UNIQUE (organization_id, destination_id, identity_key),
  FOREIGN KEY (organization_id, destination_id)
    REFERENCES customer_storage_destinations (organization_id, id)
);
CREATE TABLE IF NOT EXISTS customer_storage_oauth_states (
  state_hash text PRIMARY KEY,
  organization_id varchar NOT NULL,
  user_id varchar NOT NULL,
  secret text NOT NULL,
  expires_at timestamptz NOT NULL
);
-- JSON contains references, checksums, progress and encrypted credentials/session URLs only; never file bytes.

-- Drop old NextAuth tables and recreate for BetterAuth
-- IMPORTANT: This will delete existing session and account data!

-- Drop dependent constraints first
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_user_id_users_id_fk;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_users_id_fk;

-- Drop old tables
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS sessions;

-- Create BetterAuth accounts table
CREATE TABLE accounts (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id VARCHAR(255) NOT NULL,
  provider_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  access_token_expires_at TIMESTAMP,
  refresh_token_expires_at TIMESTAMP,
  scope VARCHAR(255),
  id_token TEXT,
  password TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create BetterAuth sessions table
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(255),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load env from .env file manually
const envContent = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
const dbUrl = envContent.match(/DATABASE_URL=(.+)/)?.[1];

if (!dbUrl) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}

const sql = neon(dbUrl);

async function migrate() {
  console.log("Starting BetterAuth migration...");

  try {
    // Drop dependent constraints
    console.log("Dropping constraints...");
    await sql`ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_user_id_users_id_fk`;
    await sql`ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_users_id_fk`;

    // Drop old tables
    console.log("Dropping old tables...");
    await sql`DROP TABLE IF EXISTS accounts`;
    await sql`DROP TABLE IF EXISTS sessions`;

    // Create BetterAuth accounts table
    console.log("Creating new accounts table...");
    await sql`
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
      )
    `;

    // Create BetterAuth sessions table
    console.log("Creating new sessions table...");
    await sql`
      CREATE TABLE sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        ip_address VARCHAR(255),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    // Create indexes
    console.log("Creating indexes...");
    await sql`CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`;

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();

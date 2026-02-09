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
  console.log("Checking user_id column types in accounts and sessions...");

  try {
    // Check accounts.user_id type
    const accountsUserIdInfo = await sql`
      SELECT data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'accounts' AND column_name = 'user_id'
    `;

    console.log("accounts.user_id type:", accountsUserIdInfo[0]);

    // Check sessions.user_id type
    const sessionsUserIdInfo = await sql`
      SELECT data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'sessions' AND column_name = 'user_id'
    `;

    console.log("sessions.user_id type:", sessionsUserIdInfo[0]);

    // Check users.id type
    const usersIdInfo = await sql`
      SELECT data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id'
    `;

    console.log("users.id type:", usersIdInfo[0]);

    // If accounts.user_id is not UUID, recreate the table
    if (accountsUserIdInfo[0]?.udt_name !== "uuid") {
      console.log("Recreating accounts table with UUID user_id...");

      await sql`DROP TABLE IF EXISTS accounts`;
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
      await sql`CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)`;
    }

    // If sessions.user_id is not UUID, recreate the table
    if (sessionsUserIdInfo[0]?.udt_name !== "uuid") {
      console.log("Recreating sessions table with UUID user_id...");

      await sql`DROP TABLE IF EXISTS sessions`;
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
      await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`;
    }

    console.log("Done!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();

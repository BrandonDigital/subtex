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
  console.log("Fixing email_verified column...");

  try {
    // Check if email_verified is already boolean
    const columnInfo = await sql`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'email_verified'
    `;

    if (columnInfo[0]?.data_type === "boolean") {
      console.log("email_verified is already boolean");
      return;
    }

    // Convert email_verified from timestamp to boolean
    console.log("Converting email_verified from timestamp to boolean...");

    // Add new column
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_new BOOLEAN DEFAULT false NOT NULL`;

    // Copy data (any non-null timestamp = true)
    await sql`UPDATE users SET email_verified_new = (email_verified IS NOT NULL)`;

    // Drop old column and rename new
    await sql`ALTER TABLE users DROP COLUMN IF EXISTS email_verified`;
    await sql`ALTER TABLE users RENAME COLUMN email_verified_new TO email_verified`;

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();

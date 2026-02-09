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
  console.log("Migrating users.id from UUID to VARCHAR...\n");

  try {
    // Check current type
    const idInfo = await sql`
      SELECT data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id'
    `;

    console.log("Current users.id type:", idInfo[0]);

    if (
      idInfo[0]?.udt_name === "varchar" ||
      idInfo[0]?.data_type === "character varying"
    ) {
      console.log("users.id is already VARCHAR, skipping migration");
      return;
    }

    // Get all foreign key constraints referencing users.id
    const foreignKeys = await sql`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'users'
        AND ccu.column_name = 'id'
    `;

    console.log(
      `Found ${foreignKeys.length} foreign key constraints to update:\n`
    );
    foreignKeys.forEach((fk) => {
      console.log(
        `  - ${fk.table_name}.${fk.column_name} (${fk.constraint_name})`
      );
    });
    console.log();

    // Drop all foreign key constraints using raw SQL
    console.log("Dropping foreign key constraints...");
    for (const fk of foreignKeys) {
      try {
        await sql.query(
          `ALTER TABLE "${fk.table_name}" DROP CONSTRAINT IF EXISTS "${fk.constraint_name}"`
        );
        console.log(`  Dropped: ${fk.constraint_name}`);
      } catch (e) {
        console.log(
          `  Warning: Could not drop ${fk.constraint_name}: ${e.message}`
        );
      }
    }

    // Change users.id type
    console.log("\nConverting users.id to VARCHAR(255)...");
    await sql`ALTER TABLE users ALTER COLUMN id TYPE VARCHAR(255) USING id::text`;
    console.log("  Done");

    // Change all referencing columns
    console.log("\nConverting foreign key columns to VARCHAR(255)...");
    for (const fk of foreignKeys) {
      try {
        await sql.query(
          `ALTER TABLE "${fk.table_name}" ALTER COLUMN "${fk.column_name}" TYPE VARCHAR(255) USING "${fk.column_name}"::text`
        );
        console.log(`  Converted: ${fk.table_name}.${fk.column_name}`);
      } catch (e) {
        console.log(
          `  Warning: Could not convert ${fk.table_name}.${fk.column_name}: ${e.message}`
        );
      }
    }

    // Recreate foreign key constraints
    console.log("\nRecreating foreign key constraints...");
    for (const fk of foreignKeys) {
      try {
        await sql.query(
          `ALTER TABLE "${fk.table_name}" ADD CONSTRAINT "${fk.constraint_name}" FOREIGN KEY ("${fk.column_name}") REFERENCES users(id) ON DELETE CASCADE`
        );
        console.log(`  Created: ${fk.constraint_name}`);
      } catch (e) {
        console.log(
          `  Warning: Could not create ${fk.constraint_name}: ${e.message}`
        );
      }
    }

    // Remove the default value since BetterAuth will provide IDs
    console.log("\nRemoving default value from users.id...");
    try {
      await sql`ALTER TABLE users ALTER COLUMN id DROP DEFAULT`;
    } catch (e) {
      console.log("  No default to remove or already removed");
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();

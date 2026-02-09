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
  console.log("Migrating all user_id references from UUID to VARCHAR...\n");

  try {
    // Get ALL foreign key constraints referencing users.id (not just user_id columns)
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

    console.log(`Found ${foreignKeys.length} foreign key constraints:\n`);
    foreignKeys.forEach((fk) => {
      console.log(
        `  - ${fk.table_name}.${fk.column_name} (${fk.constraint_name})`
      );
    });
    console.log();

    // Drop all foreign key constraints
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

    // Change all referencing columns to VARCHAR
    console.log("\nConverting foreign key columns to VARCHAR(255)...");
    for (const fk of foreignKeys) {
      try {
        // Check current type first
        const colInfo = await sql`
          SELECT data_type, udt_name
          FROM information_schema.columns 
          WHERE table_name = ${fk.table_name} AND column_name = ${fk.column_name}
        `;

        if (colInfo[0]?.udt_name === "uuid") {
          await sql.query(
            `ALTER TABLE "${fk.table_name}" ALTER COLUMN "${fk.column_name}" TYPE VARCHAR(255) USING "${fk.column_name}"::text`
          );
          console.log(`  Converted: ${fk.table_name}.${fk.column_name}`);
        } else {
          console.log(`  Already VARCHAR: ${fk.table_name}.${fk.column_name}`);
        }
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

    // Also update passkeys.user_id if not already done
    console.log("\nChecking passkeys table...");
    const passkeyCol = await sql`
      SELECT data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'passkeys' AND column_name = 'user_id'
    `;

    if (passkeyCol[0]?.udt_name === "uuid") {
      console.log("  Converting passkeys.user_id...");
      await sql`ALTER TABLE passkeys DROP CONSTRAINT IF EXISTS passkey_user_id_users_id_fk`;
      await sql`ALTER TABLE passkeys DROP CONSTRAINT IF EXISTS passkeys_user_id_users_id_fk`;
      await sql`ALTER TABLE passkeys ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text`;
      await sql`ALTER TABLE passkeys ADD CONSTRAINT passkeys_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`;
      console.log("  Done");
    } else {
      console.log("  passkeys.user_id already VARCHAR");
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();

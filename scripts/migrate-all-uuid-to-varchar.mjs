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

// All columns that reference users.id
const columnsToConvert = [
  { table: "addresses", column: "user_id" },
  { table: "cart_items", column: "user_id" },
  { table: "delivery_quotes", column: "user_id" },
  { table: "discount_code_usage", column: "user_id" },
  { table: "discount_codes", column: "created_by" },
  { table: "email_verification_codes", column: "user_id" },
  { table: "notification_preferences", column: "user_id" },
  { table: "notifications", column: "user_id" },
  { table: "order_status_history", column: "changed_by" },
  { table: "orders", column: "user_id" },
  { table: "refund_requests", column: "user_id" },
  { table: "stock_subscriptions", column: "user_id" },
];

async function migrate() {
  console.log("Converting remaining UUID columns to VARCHAR...\n");

  try {
    for (const { table, column } of columnsToConvert) {
      // Check current type
      const colInfo = await sql`
        SELECT data_type, udt_name
        FROM information_schema.columns 
        WHERE table_name = ${table} AND column_name = ${column}
      `;

      if (!colInfo[0]) {
        console.log(`  Skipping ${table}.${column} (column not found)`);
        continue;
      }

      if (colInfo[0].udt_name !== "uuid") {
        console.log(`  ${table}.${column} already VARCHAR`);
        continue;
      }

      console.log(`Converting ${table}.${column}...`);

      // Find and drop any foreign key constraint
      const fks = await sql`
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = ${table}
          AND kcu.column_name = ${column}
      `;

      for (const fk of fks) {
        try {
          await sql.query(
            `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${fk.constraint_name}"`
          );
          console.log(`  Dropped constraint: ${fk.constraint_name}`);
        } catch (e) {
          console.log(`  Warning dropping constraint: ${e.message}`);
        }
      }

      // Convert column type
      try {
        await sql.query(
          `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE VARCHAR(255) USING "${column}"::text`
        );
        console.log(`  Converted column type`);
      } catch (e) {
        console.log(`  Error converting: ${e.message}`);
        continue;
      }

      // Recreate foreign key constraint
      const constraintName = `${table}_${column}_users_id_fk`;
      try {
        await sql.query(
          `ALTER TABLE "${table}" ADD CONSTRAINT "${constraintName}" FOREIGN KEY ("${column}") REFERENCES users(id) ON DELETE CASCADE`
        );
        console.log(`  Created constraint: ${constraintName}`);
      } catch (e) {
        console.log(`  Warning creating constraint: ${e.message}`);
      }
    }

    console.log("\n✅ Migration completed!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();

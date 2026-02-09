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
  console.log("Starting users table migration...");

  try {
    // Check if email_verified is already boolean
    const columnInfo = await sql`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'email_verified'
    `;

    if (columnInfo[0]?.data_type === "boolean") {
      console.log("email_verified is already boolean, skipping conversion");
    } else {
      // Convert email_verified from timestamp to boolean
      console.log("Converting email_verified from timestamp to boolean...");

      // Add new column
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_new BOOLEAN DEFAULT false NOT NULL`;

      // Copy data (any non-null timestamp = true)
      await sql`UPDATE users SET email_verified_new = (email_verified IS NOT NULL)`;

      // Drop old column and rename new
      await sql`ALTER TABLE users DROP COLUMN IF EXISTS email_verified`;
      await sql`ALTER TABLE users RENAME COLUMN email_verified_new TO email_verified`;
    }

    // Check if id is already varchar
    const idInfo = await sql`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id'
    `;

    if (idInfo[0]?.data_type === "character varying") {
      console.log("id is already varchar, skipping conversion");
    } else {
      console.log("Converting users.id from uuid to varchar...");

      // This is complex because of foreign keys - we need to:
      // 1. Drop all foreign key constraints
      // 2. Change the column type
      // 3. Recreate foreign keys

      // Drop foreign keys
      await sql`ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_user_id_users_id_fk`;
      await sql`ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_users_id_fk`;
      await sql`ALTER TABLE passkey DROP CONSTRAINT IF EXISTS passkey_user_id_users_id_fk`;
      await sql`ALTER TABLE addresses DROP CONSTRAINT IF EXISTS addresses_user_id_users_id_fk`;
      await sql`ALTER TABLE email_verification_codes DROP CONSTRAINT IF EXISTS email_verification_codes_user_id_users_id_fk`;
      await sql`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_users_id_fk`;
      await sql`ALTER TABLE delivery_quotes DROP CONSTRAINT IF EXISTS delivery_quotes_user_id_users_id_fk`;
      await sql`ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_users_id_fk`;
      await sql`ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_users_id_fk`;
      await sql`ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_users_id_fk`;
      await sql`ALTER TABLE refund_requests DROP CONSTRAINT IF EXISTS refund_requests_user_id_users_id_fk`;
      await sql`ALTER TABLE discount_codes DROP CONSTRAINT IF EXISTS discount_codes_created_by_users_id_fk`;
      await sql`ALTER TABLE discount_code_usage DROP CONSTRAINT IF EXISTS discount_code_usage_user_id_users_id_fk`;
      await sql`ALTER TABLE order_status_history DROP CONSTRAINT IF EXISTS order_status_history_changed_by_users_id_fk`;

      // Change users.id type
      await sql`ALTER TABLE users ALTER COLUMN id TYPE VARCHAR(255) USING id::text`;

      // Change all user_id foreign key columns
      await sql`ALTER TABLE accounts ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text`;
      await sql`ALTER TABLE sessions ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text`;
      await sql`ALTER TABLE passkey ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text`;
      await sql`ALTER TABLE addresses ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text`;
      await sql`ALTER TABLE email_verification_codes ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text`;

      // Update other tables that reference users
      try {
        await sql`ALTER TABLE orders ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text`;
      } catch (e) {
        console.log("orders.user_id already correct or doesn't exist");
      }
      try {
        await sql`ALTER TABLE delivery_quotes ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text`;
      } catch (e) {
        console.log("delivery_quotes.user_id already correct or doesn't exist");
      }
      try {
        await sql`ALTER TABLE cart_items ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text`;
      } catch (e) {
        console.log("cart_items.user_id already correct or doesn't exist");
      }
      try {
        await sql`ALTER TABLE notifications ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text`;
      } catch (e) {
        console.log("notifications.user_id already correct or doesn't exist");
      }
      try {
        await sql`ALTER TABLE notification_preferences ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text`;
      } catch (e) {
        console.log(
          "notification_preferences.user_id already correct or doesn't exist"
        );
      }
      try {
        await sql`ALTER TABLE refund_requests ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text`;
      } catch (e) {
        console.log("refund_requests.user_id already correct or doesn't exist");
      }
      try {
        await sql`ALTER TABLE discount_codes ALTER COLUMN created_by TYPE VARCHAR(255) USING created_by::text`;
      } catch (e) {
        console.log(
          "discount_codes.created_by already correct or doesn't exist"
        );
      }
      try {
        await sql`ALTER TABLE discount_code_usage ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text`;
      } catch (e) {
        console.log(
          "discount_code_usage.user_id already correct or doesn't exist"
        );
      }
      try {
        await sql`ALTER TABLE order_status_history ALTER COLUMN changed_by TYPE VARCHAR(255) USING changed_by::text`;
      } catch (e) {
        console.log(
          "order_status_history.changed_by already correct or doesn't exist"
        );
      }

      // Recreate foreign keys
      await sql`ALTER TABLE accounts ADD CONSTRAINT accounts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`;
      await sql`ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`;
      await sql`ALTER TABLE passkey ADD CONSTRAINT passkey_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`;
      await sql`ALTER TABLE addresses ADD CONSTRAINT addresses_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`;
      await sql`ALTER TABLE email_verification_codes ADD CONSTRAINT email_verification_codes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`;
    }

    // Remove password_hash column if exists (BetterAuth stores passwords in accounts)
    console.log("Removing password_hash column if exists...");
    await sql`ALTER TABLE users DROP COLUMN IF EXISTS password_hash`;

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();

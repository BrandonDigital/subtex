-- Add stock_reserved to notification_type enum
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'stock_reserved';

-- Create reservations table for checkout holds
CREATE TABLE IF NOT EXISTS "reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "user_id" varchar(255) REFERENCES "users"("id") ON DELETE CASCADE,
  "session_id" varchar(255),
  "quantity" integer NOT NULL,
  "expires_at" timestamp NOT NULL,
  "checkout_session_id" varchar(255),
  "status" varchar(50) DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "reservations_product_id_idx" ON "reservations" ("product_id");
CREATE INDEX IF NOT EXISTS "reservations_user_id_idx" ON "reservations" ("user_id");
CREATE INDEX IF NOT EXISTS "reservations_session_id_idx" ON "reservations" ("session_id");
CREATE INDEX IF NOT EXISTS "reservations_expires_at_idx" ON "reservations" ("expires_at");
CREATE INDEX IF NOT EXISTS "reservations_status_idx" ON "reservations" ("status");

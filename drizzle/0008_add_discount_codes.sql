-- Create discount type enum
CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed_amount');

-- Create discount target enum
CREATE TYPE "public"."discount_target" AS ENUM('subtotal', 'shipping');

-- Create discount_codes table
CREATE TABLE IF NOT EXISTS "discount_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL UNIQUE,
  "description" text,
  "discount_type" "discount_type" NOT NULL,
  "discount_target" "discount_target" NOT NULL DEFAULT 'subtotal',
  "discount_value" integer NOT NULL,
  "min_purchase_in_cents" integer,
  "max_discount_in_cents" integer,
  "max_uses" integer,
  "max_uses_per_user" integer DEFAULT 1,
  "used_count" integer DEFAULT 0 NOT NULL,
  "start_date" timestamp,
  "end_date" timestamp,
  "active" boolean DEFAULT true NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create discount_code_usage table to track per-user usage
CREATE TABLE IF NOT EXISTS "discount_code_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "discount_code_id" uuid NOT NULL REFERENCES "discount_codes"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "order_id" uuid,
  "used_at" timestamp DEFAULT now() NOT NULL
);

-- Add discount code reference to orders table
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_code_id" uuid REFERENCES "discount_codes"("id");
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_code_snapshot" varchar(50);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "discount_codes_code_idx" ON "discount_codes"("code");
CREATE INDEX IF NOT EXISTS "discount_codes_active_idx" ON "discount_codes"("active");
CREATE INDEX IF NOT EXISTS "discount_code_usage_code_idx" ON "discount_code_usage"("discount_code_id");
CREATE INDEX IF NOT EXISTS "discount_code_usage_user_idx" ON "discount_code_usage"("user_id");
CREATE INDEX IF NOT EXISTS "orders_discount_code_idx" ON "orders"("discount_code_id");

-- Add slug and isAcm columns to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "slug" varchar(255) UNIQUE;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_acm" boolean DEFAULT false NOT NULL;

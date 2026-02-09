-- Migration: Remove Product Variants - Simplify to Product-Level Inventory
-- This migration moves inventory from variants to products directly

-- Step 1: Add inventory columns to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stock" integer DEFAULT 0 NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "low_stock_threshold" integer DEFAULT 5 NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "holding_fee_in_cents" integer DEFAULT 5000 NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "holding_period_days" integer DEFAULT 7 NOT NULL;

-- Step 2: Migrate stock data from variants to products (copy first variant's stock to product)
UPDATE "products" p
SET 
  "stock" = COALESCE((
    SELECT pv."stock" 
    FROM "product_variants" pv 
    WHERE pv."product_id" = p."id" AND pv."active" = true 
    ORDER BY pv."created_at" ASC 
    LIMIT 1
  ), 0),
  "low_stock_threshold" = COALESCE((
    SELECT pv."low_stock_threshold" 
    FROM "product_variants" pv 
    WHERE pv."product_id" = p."id" AND pv."active" = true 
    ORDER BY pv."created_at" ASC 
    LIMIT 1
  ), 5),
  "holding_fee_in_cents" = COALESCE((
    SELECT pv."holding_fee_in_cents" 
    FROM "product_variants" pv 
    WHERE pv."product_id" = p."id" AND pv."active" = true 
    ORDER BY pv."created_at" ASC 
    LIMIT 1
  ), 5000),
  "holding_period_days" = COALESCE((
    SELECT pv."holding_period_days" 
    FROM "product_variants" pv 
    WHERE pv."product_id" = p."id" AND pv."active" = true 
    ORDER BY pv."created_at" ASC 
    LIMIT 1
  ), 7);

-- Step 3: Update stock_subscriptions to reference products instead of variants
-- First add the new column
ALTER TABLE "stock_subscriptions" ADD COLUMN IF NOT EXISTS "product_id" uuid;

-- Populate product_id from variant's product_id
UPDATE "stock_subscriptions" ss
SET "product_id" = (
  SELECT pv."product_id" 
  FROM "product_variants" pv 
  WHERE pv."id" = ss."variant_id"
);

-- Drop the old foreign key constraint and column
ALTER TABLE "stock_subscriptions" DROP CONSTRAINT IF EXISTS "stock_subscriptions_variant_id_product_variants_id_fk";
ALTER TABLE "stock_subscriptions" DROP COLUMN IF EXISTS "variant_id";

-- Make product_id NOT NULL and add foreign key
ALTER TABLE "stock_subscriptions" ALTER COLUMN "product_id" SET NOT NULL;
ALTER TABLE "stock_subscriptions" ADD CONSTRAINT "stock_subscriptions_product_id_products_id_fk" 
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Step 4: Update order_items to reference products instead of variants
-- First add the new column
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "product_id" uuid;

-- Populate product_id from variant's product_id
UPDATE "order_items" oi
SET "product_id" = (
  SELECT pv."product_id" 
  FROM "product_variants" pv 
  WHERE pv."id" = oi."variant_id"
);

-- Rename sku to part_number
ALTER TABLE "order_items" RENAME COLUMN "sku" TO "part_number";

-- Make color, material, size nullable (not all products have these)
ALTER TABLE "order_items" ALTER COLUMN "color" DROP NOT NULL;
ALTER TABLE "order_items" ALTER COLUMN "material" DROP NOT NULL;
ALTER TABLE "order_items" ALTER COLUMN "size" DROP NOT NULL;

-- Drop the old foreign key constraint and column
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_variant_id_product_variants_id_fk";
ALTER TABLE "order_items" DROP COLUMN IF EXISTS "variant_id";

-- Make product_id NOT NULL and add foreign key
ALTER TABLE "order_items" ALTER COLUMN "product_id" SET NOT NULL;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" 
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Step 5: Update cart_items to reference products instead of variants
-- First add the new column
ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "product_id" uuid;

-- Populate product_id from variant's product_id
UPDATE "cart_items" ci
SET "product_id" = (
  SELECT pv."product_id" 
  FROM "product_variants" pv 
  WHERE pv."id" = ci."variant_id"
);

-- Drop the old foreign key constraint and column
ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "cart_items_variant_id_product_variants_id_fk";
ALTER TABLE "cart_items" DROP COLUMN IF EXISTS "variant_id";

-- Make product_id NOT NULL and add foreign key
ALTER TABLE "cart_items" ALTER COLUMN "product_id" SET NOT NULL;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" 
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Step 6: Drop the product_variants table
DROP TABLE IF EXISTS "product_variants";

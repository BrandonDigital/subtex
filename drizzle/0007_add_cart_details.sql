-- Add product details columns to cart_items for admin visibility
ALTER TABLE "cart_items" ADD COLUMN "part_number" varchar(100);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "product_name" varchar(255) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "color" varchar(50);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "material" varchar(50);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "size" varchar(50);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "image_url" varchar(500);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "base_price_in_cents" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "price_in_cents" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "holding_fee_in_cents" integer;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "applied_discount_percent" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "bulk_discounts" text;

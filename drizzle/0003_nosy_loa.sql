CREATE TYPE "public"."announcement_type" AS ENUM('info', 'warning', 'success', 'error');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active');--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" "announcement_type" DEFAULT 'info' NOT NULL,
	"link" varchar(500),
	"link_text" varchar(100),
	"dismissible" boolean DEFAULT true NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_variants" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "product_variants" CASCADE;--> statement-breakpoint
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_variant_id_product_variants_id_fk";
--> statement-breakpoint
ALTER TABLE "stock_subscriptions" DROP CONSTRAINT "stock_subscriptions_variant_id_product_variants_id_fk";
--> statement-breakpoint
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_variant_id_product_variants_id_fk";
--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "color" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "material" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "size" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "product_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "status" "product_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "slug" varchar(255);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_acm" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "acm_color" "color";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "acm_material" "material";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "acm_size" "size";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "low_stock_threshold" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "holding_fee_in_cents" integer DEFAULT 5000 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "holding_period_days" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "width" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "height" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "depth" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "weight" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "meta_title" varchar(255);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "meta_description" text;--> statement-breakpoint
ALTER TABLE "stock_subscriptions" ADD COLUMN "product_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "product_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "part_number" varchar(100);--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_subscriptions" ADD CONSTRAINT "stock_subscriptions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" DROP COLUMN "variant_id";--> statement-breakpoint
ALTER TABLE "stock_subscriptions" DROP COLUMN "variant_id";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "variant_id";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "sku";--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_slug_unique" UNIQUE("slug");
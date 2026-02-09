CREATE TYPE "public"."discount_target" AS ENUM('subtotal', 'shipping');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed_amount');--> statement-breakpoint
CREATE TABLE "discount_code_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discount_code_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"discount_type" "discount_type" NOT NULL,
	"discount_target" "discount_target" DEFAULT 'subtotal' NOT NULL,
	"discount_value" integer NOT NULL,
	"min_purchase_in_cents" integer,
	"max_discount_in_cents" integer,
	"max_uses" integer,
	"max_uses_per_user" integer DEFAULT 1,
	"used_count" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discount_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "passkey" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"public_key" text NOT NULL,
	"user_id" uuid NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" varchar(255) NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"aaguid" varchar(255)
);
--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "part_number" varchar(100);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "product_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "color" varchar(50);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "material" varchar(50);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "size" varchar(50);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "image_url" varchar(500);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "base_price_in_cents" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "price_in_cents" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "holding_fee_in_cents" integer;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "applied_discount_percent" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "bulk_discounts" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_code_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_code_snapshot" varchar(50);--> statement-breakpoint
ALTER TABLE "discount_code_usage" ADD CONSTRAINT "discount_code_usage_discount_code_id_discount_codes_id_fk" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_code_usage" ADD CONSTRAINT "discount_code_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_discount_code_id_discount_codes_id_fk" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE no action ON UPDATE no action;
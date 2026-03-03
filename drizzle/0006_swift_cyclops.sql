ALTER TYPE "public"."notification_type" ADD VALUE 'stock_reserved';--> statement-breakpoint
CREATE TABLE "passkeys" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"public_key" text NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" varchar(255) NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"aaguid" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"user_id" varchar(255),
	"session_id" varchar(255),
	"quantity" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"checkout_session_id" varchar(255),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "passkey" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "passkey" CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_session_token_unique";--> statement-breakpoint
ALTER TABLE "cart_items" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "delivery_quotes" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "delivery_quotes" ALTER COLUMN "quoted_by" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "discount_code_usage" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "discount_codes" ALTER COLUMN "created_by" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "addresses" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "email_verification_codes" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email_verified" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email_verified" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_subscriptions" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "order_status_history" ALTER COLUMN "changed_by" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "refund_requests" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "refund_requests" ALTER COLUMN "processed_by" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "notification_preferences" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "cart_item_id" varchar(255);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "cutting_spec" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "account_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "provider_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "access_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "refresh_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "password" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "recipient_name" varchar(255);--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "unit" varchar(50);--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "place_id" varchar(255);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "token" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "expires_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "ip_address" varchar(255);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company" varchar(255);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "cutting_spec" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_name" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_email" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "collection_date" varchar(10);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "collection_slot" varchar(20);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "has_backorder_items" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sender_signature" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "receiver_signature" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "signed_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "confirmation_email_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "image_url" varchar(500);--> statement-breakpoint
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "provider";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "provider_account_id";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "expires_at";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "token_type";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "session_state";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "session_token";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "expires";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password_hash";--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_token_unique" UNIQUE("token");
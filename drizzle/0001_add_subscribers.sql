-- Migration: Add subscribers table for coming soon page email collection
CREATE TABLE IF NOT EXISTS "subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"subscribed_at" timestamp DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);

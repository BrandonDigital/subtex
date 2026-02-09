-- Create announcement type enum
CREATE TYPE "announcement_type" AS ENUM ('info', 'warning', 'success', 'error');

-- Create announcements table
CREATE TABLE IF NOT EXISTS "announcements" (
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

-- Create index for efficient querying of active announcements
CREATE INDEX IF NOT EXISTS "announcements_active_idx" ON "announcements" ("active");
CREATE INDEX IF NOT EXISTS "announcements_dates_idx" ON "announcements" ("start_date", "end_date");

-- Add image_url column to notifications table for product thumbnails
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "image_url" varchar(500);

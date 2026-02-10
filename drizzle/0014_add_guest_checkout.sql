-- Allow guest checkout: make user_id nullable and add guest contact fields
ALTER TABLE "orders" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "orders" ADD COLUMN "guest_name" varchar(255);
ALTER TABLE "orders" ADD COLUMN "guest_email" varchar(255);
ALTER TABLE "orders" ADD COLUMN "guest_phone" varchar(50);

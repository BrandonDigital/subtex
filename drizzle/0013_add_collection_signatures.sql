ALTER TABLE "orders" ADD COLUMN "sender_signature" text;
ALTER TABLE "orders" ADD COLUMN "receiver_signature" text;
ALTER TABLE "orders" ADD COLUMN "signed_at" timestamp;

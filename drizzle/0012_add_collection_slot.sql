ALTER TABLE "orders" ADD COLUMN "collection_date" varchar(10);
ALTER TABLE "orders" ADD COLUMN "collection_slot" varchar(20);
ALTER TABLE "orders" ADD COLUMN "has_backorder_items" boolean DEFAULT false;

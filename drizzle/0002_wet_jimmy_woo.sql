ALTER TABLE "products" ADD COLUMN "part_number" varchar(100);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_part_number_unique" UNIQUE("part_number");
ALTER TABLE "products" ALTER COLUMN "acm_material" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."material";--> statement-breakpoint
CREATE TYPE "public"."material" AS ENUM('gloss/matte', 'gloss/primer');--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "acm_material" SET DATA TYPE "public"."material" USING "acm_material"::"public"."material";
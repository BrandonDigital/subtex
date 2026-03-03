CREATE TABLE "settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cutting_fee_in_cents" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
INSERT INTO "settings" ("key", "value", "updated_at") VALUES ('cutting_fee_per_sheet_in_cents', '2500', now()) ON CONFLICT DO NOTHING;
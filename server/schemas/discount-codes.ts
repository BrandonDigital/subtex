import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const discountTypeEnum = pgEnum("discount_type", [
  "percentage",
  "fixed_amount",
]);

export const discountTargetEnum = pgEnum("discount_target", [
  "subtotal",
  "shipping",
]);

export const discountCodes = pgTable("discount_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  discountType: discountTypeEnum("discount_type").notNull(),
  discountTarget: discountTargetEnum("discount_target")
    .notNull()
    .default("subtotal"), // What the discount applies to
  discountValue: integer("discount_value").notNull(), // Percentage (0-100) or amount in cents
  minPurchaseInCents: integer("min_purchase_in_cents"), // Minimum order amount to use code
  maxDiscountInCents: integer("max_discount_in_cents"), // Max discount for percentage codes
  maxUses: integer("max_uses"), // Total uses allowed (null = unlimited)
  maxUsesPerUser: integer("max_uses_per_user").default(1), // Uses per user (null = unlimited)
  usedCount: integer("used_count").default(0).notNull(),
  startDate: timestamp("start_date"), // null means immediately active
  endDate: timestamp("end_date"), // null means no end date
  active: boolean("active").default(true).notNull(),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Track discount code usage per user
export const discountCodeUsage = pgTable("discount_code_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  discountCodeId: uuid("discount_code_id")
    .notNull()
    .references(() => discountCodes.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  orderId: uuid("order_id"), // Will be set after order is created
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

// Relations
export const discountCodesRelations = relations(
  discountCodes,
  ({ one, many }) => ({
    createdByUser: one(users, {
      fields: [discountCodes.createdBy],
      references: [users.id],
    }),
    usages: many(discountCodeUsage),
  })
);

export const discountCodeUsageRelations = relations(
  discountCodeUsage,
  ({ one }) => ({
    discountCode: one(discountCodes, {
      fields: [discountCodeUsage.discountCodeId],
      references: [discountCodes.id],
    }),
    user: one(users, {
      fields: [discountCodeUsage.userId],
      references: [users.id],
    }),
  })
);

// Types
export type DiscountCode = typeof discountCodes.$inferSelect;
export type NewDiscountCode = typeof discountCodes.$inferInsert;
export type DiscountCodeUsage = typeof discountCodeUsage.$inferSelect;
export type NewDiscountCodeUsage = typeof discountCodeUsage.$inferInsert;

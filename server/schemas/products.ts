import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const colorEnum = pgEnum("color", ["white", "black"]);
export const materialEnum = pgEnum("material", ["gloss", "matte"]);
export const sizeEnum = pgEnum("size", ["standard", "xl"]);
export const productStatusEnum = pgEnum("product_status", ["draft", "active"]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: productStatusEnum("status").default("draft").notNull(),
  partNumber: varchar("part_number", { length: 100 }).unique(),
  slug: varchar("slug", { length: 255 }).unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  basePriceInCents: integer("base_price_in_cents").notNull(), // GST-inclusive
  imageUrl: varchar("image_url", { length: 500 }),
  // ACM Product Configuration
  isAcm: boolean("is_acm").default(false).notNull(),
  acmColor: colorEnum("acm_color"),
  acmMaterial: materialEnum("acm_material"),
  acmSize: sizeEnum("acm_size"),
  // Inventory fields (moved from variants)
  stock: integer("stock").default(0).notNull(),
  lowStockThreshold: integer("low_stock_threshold").default(5).notNull(),
  holdingFeeInCents: integer("holding_fee_in_cents").default(5000).notNull(), // Click & Collect fee
  holdingPeriodDays: integer("holding_period_days").default(7).notNull(),
  // Dimensions (in mm)
  width: numeric("width", { precision: 10, scale: 2 }),
  height: numeric("height", { precision: 10, scale: 2 }),
  depth: numeric("depth", { precision: 10, scale: 2 }),
  weight: numeric("weight", { precision: 10, scale: 2 }), // in kg
  // SEO
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  // Legacy field - kept for backward compatibility
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bulkDiscounts = pgTable("bulk_discounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "cascade",
  }),
  minQuantity: integer("min_quantity").notNull(),
  discountPercent: integer("discount_percent").notNull(), // e.g., 10 = 10% off
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stockSubscriptions = pgTable("stock_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }), // Can be null for guest subscriptions
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  notified: boolean("notified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reservations for checkout hold
export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).references(() => users.id, {
    onDelete: "cascade",
  }), // Nullable for guest users
  sessionId: varchar("session_id", { length: 255 }), // For guest users
  quantity: integer("quantity").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  checkoutSessionId: varchar("checkout_session_id", { length: 255 }), // Stripe checkout session
  status: varchar("status", { length: 50 }).default("active").notNull(), // active, completed, expired, cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const productsRelations = relations(products, ({ many }) => ({
  bulkDiscounts: many(bulkDiscounts),
  stockSubscriptions: many(stockSubscriptions),
  reservations: many(reservations),
}));

export const bulkDiscountsRelations = relations(bulkDiscounts, ({ one }) => ({
  product: one(products, {
    fields: [bulkDiscounts.productId],
    references: [products.id],
  }),
}));

export const stockSubscriptionsRelations = relations(
  stockSubscriptions,
  ({ one }) => ({
    product: one(products, {
      fields: [stockSubscriptions.productId],
      references: [products.id],
    }),
  })
);

export const reservationsRelations = relations(reservations, ({ one }) => ({
  product: one(products, {
    fields: [reservations.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [reservations.userId],
    references: [users.id],
  }),
}));

// Types
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type BulkDiscount = typeof bulkDiscounts.$inferSelect;
export type NewBulkDiscount = typeof bulkDiscounts.$inferInsert;
export type StockSubscription = typeof stockSubscriptions.$inferSelect;
export type NewStockSubscription = typeof stockSubscriptions.$inferInsert;
export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
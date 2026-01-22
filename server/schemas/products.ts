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

export const colorEnum = pgEnum("color", ["white", "black"]);
export const materialEnum = pgEnum("material", ["gloss", "matte"]);
export const sizeEnum = pgEnum("size", ["standard", "xl"]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  basePriceInCents: integer("base_price_in_cents").notNull(), // GST-inclusive
  imageUrl: varchar("image_url", { length: 500 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  color: colorEnum("color").notNull(),
  material: materialEnum("material").notNull(),
  size: sizeEnum("size").notNull(),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  priceInCents: integer("price_in_cents").notNull(), // GST-inclusive
  priceModifier: integer("price_modifier").default(0), // Additional cost in cents
  stock: integer("stock").default(0).notNull(),
  lowStockThreshold: integer("low_stock_threshold").default(5).notNull(),
  holdingFeeInCents: integer("holding_fee_in_cents").default(5000).notNull(), // Click & Collect fee
  holdingPeriodDays: integer("holding_period_days").default(7).notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
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
  userId: uuid("user_id"), // Can be null for guest subscriptions
  variantId: uuid("variant_id")
    .notNull()
    .references(() => productVariants.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  notified: boolean("notified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
  bulkDiscounts: many(bulkDiscounts),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
    stockSubscriptions: many(stockSubscriptions),
  })
);

export const bulkDiscountsRelations = relations(bulkDiscounts, ({ one }) => ({
  product: one(products, {
    fields: [bulkDiscounts.productId],
    references: [products.id],
  }),
}));

export const stockSubscriptionsRelations = relations(
  stockSubscriptions,
  ({ one }) => ({
    variant: one(productVariants, {
      fields: [stockSubscriptions.variantId],
      references: [productVariants.id],
    }),
  })
);

// Types
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type BulkDiscount = typeof bulkDiscounts.$inferSelect;
export type NewBulkDiscount = typeof bulkDiscounts.$inferInsert;
export type StockSubscription = typeof stockSubscriptions.$inferSelect;
export type NewStockSubscription = typeof stockSubscriptions.$inferInsert;

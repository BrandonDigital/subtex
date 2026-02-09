import {
  pgTable,
  uuid,
  integer,
  timestamp,
  varchar,
  text,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { products } from "./products";

// Server-side cart for logged-in users - synced from client localStorage
export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),

  // Product snapshot at time of adding to cart
  partNumber: varchar("part_number", { length: 100 }),
  productName: varchar("product_name", { length: 255 }).notNull(),
  color: varchar("color", { length: 50 }),
  material: varchar("material", { length: 50 }),
  size: varchar("size", { length: 50 }),
  imageUrl: varchar("image_url", { length: 500 }),

  // Pricing
  basePriceInCents: integer("base_price_in_cents").notNull(),
  priceInCents: integer("price_in_cents").notNull(), // After any discounts
  holdingFeeInCents: integer("holding_fee_in_cents"),
  appliedDiscountPercent: integer("applied_discount_percent").default(0),

  // Bulk discounts stored as JSON
  bulkDiscounts: text("bulk_discounts"), // JSON array of { minQuantity, discountPercent }

  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

// Types
export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;

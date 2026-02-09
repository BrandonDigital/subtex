import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { orders } from "./orders";

export const quoteStatusEnum = pgEnum("quote_status", [
  "pending",
  "quoted",
  "paid",
  "expired",
  "cancelled",
]);

// Delivery zones for local Perth delivery
export const deliveryZones = pgTable("delivery_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Perth Metro", "Greater Perth"
  radiusKm: integer("radius_km").notNull(), // Distance from warehouse in km
  baseFeeInCents: integer("base_fee_in_cents").notNull(), // GST-inclusive
  perSheetFeeInCents: integer("per_sheet_fee_in_cents").default(0).notNull(), // Additional per sheet
  minOrderSheets: integer("min_order_sheets").default(1).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Warehouse location (for distance calculations)
export const warehouseLocations = pgTable("warehouse_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  street: varchar("street", { length: 255 }).notNull(),
  suburb: varchar("suburb", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  postcode: varchar("postcode", { length: 10 }).notNull(),
  country: varchar("country", { length: 100 }).default("Australia").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Quote requests for interstate/international shipping
export const deliveryQuotes = pgTable("delivery_quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id),

  // Destination
  destinationType: varchar("destination_type", { length: 50 }).notNull(), // interstate, international
  addressStreet: varchar("address_street", { length: 255 }).notNull(),
  addressSuburb: varchar("address_suburb", { length: 100 }).notNull(),
  addressState: varchar("address_state", { length: 50 }).notNull(),
  addressPostcode: varchar("address_postcode", { length: 10 }).notNull(),
  addressCountry: varchar("address_country", { length: 100 }).notNull(),

  // Order details for quote
  itemCount: integer("item_count").notNull(),
  itemDetails: text("item_details").notNull(), // JSON of items being shipped

  // Quote details
  status: quoteStatusEnum("status").default("pending").notNull(),
  quotedAmountInCents: integer("quoted_amount_in_cents"), // GST-inclusive
  quotedAt: timestamp("quoted_at"),
  quotedBy: varchar("quoted_by", { length: 255 }).references(() => users.id),
  expiresAt: timestamp("expires_at"),

  // Stripe Payment Link (for interstate/international)
  stripePaymentLinkId: varchar("stripe_payment_link_id", { length: 255 }),
  stripePaymentLinkUrl: varchar("stripe_payment_link_url", { length: 500 }),
  paidAt: timestamp("paid_at"),

  // Notes
  customerNotes: text("customer_notes"),
  adminNotes: text("admin_notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const deliveryQuotesRelations = relations(deliveryQuotes, ({ one }) => ({
  order: one(orders, {
    fields: [deliveryQuotes.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [deliveryQuotes.userId],
    references: [users.id],
  }),
  quotedByUser: one(users, {
    fields: [deliveryQuotes.quotedBy],
    references: [users.id],
  }),
}));

// Types
export type DeliveryZone = typeof deliveryZones.$inferSelect;
export type NewDeliveryZone = typeof deliveryZones.$inferInsert;
export type WarehouseLocation = typeof warehouseLocations.$inferSelect;
export type NewWarehouseLocation = typeof warehouseLocations.$inferInsert;
export type DeliveryQuote = typeof deliveryQuotes.$inferSelect;
export type NewDeliveryQuote = typeof deliveryQuotes.$inferInsert;

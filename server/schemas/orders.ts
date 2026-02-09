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
import { users, addresses } from "./users";
import { products } from "./products";
import { discountCodes } from "./discount-codes";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "collected",
  "cancelled",
  "refund_requested",
  "refunded",
]);

export const refundStatusEnum = pgEnum("refund_status", [
  "pending",
  "approved",
  "rejected",
  "processed",
]);

export const deliveryMethodEnum = pgEnum("delivery_method", [
  "click_collect",
  "local_delivery",
  "interstate",
  "international",
]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id),
  status: orderStatusEnum("status").default("pending").notNull(),
  deliveryMethod: deliveryMethodEnum("delivery_method").notNull(),

  // Pricing (all in cents, GST-inclusive)
  subtotalInCents: integer("subtotal_in_cents").notNull(),
  discountInCents: integer("discount_in_cents").default(0).notNull(),
  discountCodeId: uuid("discount_code_id").references(() => discountCodes.id),
  discountCodeSnapshot: varchar("discount_code_snapshot", { length: 50 }), // Code string at time of order
  deliveryFeeInCents: integer("delivery_fee_in_cents").default(0).notNull(),
  holdingFeeInCents: integer("holding_fee_in_cents").default(0).notNull(), // For click & collect
  totalInCents: integer("total_in_cents").notNull(),

  // Payment
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id", {
    length: 255,
  }),
  paidAt: timestamp("paid_at"),

  // Refund
  refundedAmountInCents: integer("refunded_amount_in_cents")
    .default(0)
    .notNull(),
  stripeRefundId: varchar("stripe_refund_id", { length: 255 }),
  refundedAt: timestamp("refunded_at"),

  // Click & Collect specific
  collectionDate: varchar("collection_date", { length: 10 }), // YYYY-MM-DD
  collectionSlot: varchar("collection_slot", { length: 20 }), // "morning" or "afternoon"
  hasBackorderItems: boolean("has_backorder_items").default(false),
  holdingExpiresAt: timestamp("holding_expires_at"),
  balanceDueInCents: integer("balance_due_in_cents"), // Amount due on pickup

  // Collection signatures (data URLs)
  senderSignature: text("sender_signature"), // Warehouse staff signature
  receiverSignature: text("receiver_signature"), // Customer signature
  signedAt: timestamp("signed_at"), // When both signatures were captured

  // Delivery address (snapshot at order time)
  deliveryAddressId: uuid("delivery_address_id").references(() => addresses.id),
  deliveryAddressSnapshot: text("delivery_address_snapshot"), // JSON snapshot

  // Notes
  customerNotes: text("customer_notes"),
  adminNotes: text("admin_notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),

  // Snapshot of product details at order time
  partNumber: varchar("part_number", { length: 100 }),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 50 }),
  material: varchar("material", { length: 50 }),
  size: varchar("size", { length: 50 }),

  quantity: integer("quantity").notNull(),
  unitPriceInCents: integer("unit_price_in_cents").notNull(), // Price per item at order time
  discountPercent: integer("discount_percent").default(0).notNull(), // Bulk discount applied
  totalInCents: integer("total_in_cents").notNull(), // quantity * unitPrice * (1 - discount)

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  status: orderStatusEnum("status").notNull(),
  note: text("note"),
  changedBy: varchar("changed_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Refund requests from customers
export const refundRequests = pgTable("refund_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id),
  status: refundStatusEnum("status").default("pending").notNull(),

  // Request details
  reason: text("reason").notNull(),
  requestedAmountInCents: integer("requested_amount_in_cents").notNull(),

  // Admin response
  approvedAmountInCents: integer("approved_amount_in_cents"),
  adminNotes: text("admin_notes"),
  processedBy: varchar("processed_by", { length: 255 }).references(
    () => users.id
  ),
  processedAt: timestamp("processed_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  deliveryAddress: one(addresses, {
    fields: [orders.deliveryAddressId],
    references: [addresses.id],
  }),
  discountCode: one(discountCodes, {
    fields: [orders.discountCodeId],
    references: [discountCodes.id],
  }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
  refundRequests: many(refundRequests),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const orderStatusHistoryRelations = relations(
  orderStatusHistory,
  ({ one }) => ({
    order: one(orders, {
      fields: [orderStatusHistory.orderId],
      references: [orders.id],
    }),
    changedByUser: one(users, {
      fields: [orderStatusHistory.changedBy],
      references: [users.id],
    }),
  })
);

export const refundRequestsRelations = relations(refundRequests, ({ one }) => ({
  order: one(orders, {
    fields: [refundRequests.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [refundRequests.userId],
    references: [users.id],
  }),
  processedByUser: one(users, {
    fields: [refundRequests.processedBy],
    references: [users.id],
  }),
}));

// Types
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type RefundRequest = typeof refundRequests.$inferSelect;
export type NewRefundRequest = typeof refundRequests.$inferInsert;

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const notificationTypeEnum = pgEnum("notification_type", [
  "order_update",
  "stock_alert",
  "quote_ready",
  "payment_link",
  "promotion",
  "system",
  "low_stock_admin", // Admin-only notification for low stock
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 500 }), // Optional link to relevant page
  read: boolean("read").default(false).notNull(),
  emailSent: boolean("email_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  
  // Email preferences
  emailOrderUpdates: boolean("email_order_updates").default(true).notNull(),
  emailStockAlerts: boolean("email_stock_alerts").default(true).notNull(),
  emailQuoteReady: boolean("email_quote_ready").default(true).notNull(),
  emailPromotions: boolean("email_promotions").default(false).notNull(),
  
  // In-app preferences
  pushOrderUpdates: boolean("push_order_updates").default(true).notNull(),
  pushStockAlerts: boolean("push_stock_alerts").default(true).notNull(),
  pushQuoteReady: boolean("push_quote_ready").default(true).notNull(),
  pushPromotions: boolean("push_promotions").default(false).notNull(),
  
  // Marketing
  marketingUnsubscribed: boolean("marketing_unsubscribed").default(false).notNull(),
  unsubscribedAt: timestamp("unsubscribed_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [notificationPreferences.userId],
      references: [users.id],
    }),
  })
);

// Types
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreferences = typeof notificationPreferences.$inferInsert;

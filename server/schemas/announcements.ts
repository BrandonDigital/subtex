import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const announcementTypeEnum = pgEnum("announcement_type", [
  "info",
  "warning",
  "success",
  "error",
]);

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: announcementTypeEnum("type").notNull().default("info"),
  link: varchar("link", { length: 500 }), // Optional link for "Learn more" or CTA
  linkText: varchar("link_text", { length: 100 }), // Custom link text
  dismissible: boolean("dismissible").default(true).notNull(),
  startDate: timestamp("start_date"), // null means immediately active
  endDate: timestamp("end_date"), // null means no end date
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Types
export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;

import { pgTable, varchar, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const settingsHistory = pgTable("settings_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value").notNull(),
  changedBy: varchar("changed_by", { length: 255 }).references(() => users.id, {
    onDelete: "set null",
  }),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
});

export const settingsHistoryRelations = relations(settingsHistory, ({ one }) => ({
  user: one(users, {
    fields: [settingsHistory.changedBy],
    references: [users.id],
  }),
}));

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type SettingHistory = typeof settingsHistory.$inferSelect;

export const SETTING_KEYS = {
  CUTTING_FEE_PER_SHEET_IN_CENTS: "cutting_fee_per_sheet_in_cents",
} as const;

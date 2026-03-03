import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as companies from "../schemas/companies";
import * as users from "../schemas/users";
import * as products from "../schemas/products";
import * as orders from "../schemas/orders";
import * as deliveries from "../schemas/deliveries";
import * as notifications from "../schemas/notifications";
import * as cart from "../schemas/cart";
import * as subscribers from "../schemas/subscribers";
import * as announcements from "../schemas/announcements";
import * as discountCodes from "../schemas/discount-codes";
import * as settingsSchema from "../schemas/settings";

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, {
  schema: {
    ...companies,
    ...users,
    ...products,
    ...orders,
    ...deliveries,
    ...notifications,
    ...cart,
    ...subscribers,
    ...announcements,
    ...discountCodes,
    ...settingsSchema,
  },
});

export type Database = typeof db;

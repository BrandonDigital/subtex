import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as users from "../schemas/users";
import * as products from "../schemas/products";
import * as orders from "../schemas/orders";
import * as deliveries from "../schemas/deliveries";
import * as notifications from "../schemas/notifications";
import * as cart from "../schemas/cart";
import * as subscribers from "../schemas/subscribers";

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, {
  schema: {
    ...users,
    ...products,
    ...orders,
    ...deliveries,
    ...notifications,
    ...cart,
    ...subscribers,
  },
});

export type Database = typeof db;

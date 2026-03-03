"use server";

import { db } from "../db";
import { auth } from "../auth";
import { headers } from "next/headers";
import { users } from "../schemas/users";
import { orders } from "../schemas/orders";
import { eq, sql, desc, and, isNull, isNotNull } from "drizzle-orm";
import { orderItems } from "../schemas/orders";

// Auth helper
async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id: string; role?: string } | undefined;
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

// Customer with order analytics
export type CustomerWithAnalytics = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  phone: string | null;
  createdAt: Date;
  orderCount: number;
  totalSpent: number;
  averageOrderValue: number;
  firstOrderDate: Date | null;
  lastOrderDate: Date | null;
  isRepeatCustomer: boolean;
};

// Get all customers with their order analytics
export async function getCustomersWithAnalytics(): Promise<
  CustomerWithAnalytics[]
> {
  await requireAdmin();

  // Get customers with order statistics
  const customersWithOrders = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      phone: users.phone,
      createdAt: users.createdAt,
      orderCount: sql<number>`(
        SELECT COUNT(*)::int 
        FROM "orders" 
        WHERE "orders"."user_id" = "users"."id"
        AND "orders"."status" NOT IN ('cancelled', 'refunded')
      )`.as("order_count"),
      totalSpent: sql<number>`COALESCE((
        SELECT SUM("orders"."total_in_cents")::int 
        FROM "orders" 
        WHERE "orders"."user_id" = "users"."id"
        AND "orders"."status" NOT IN ('cancelled', 'refunded')
      ), 0)`.as("total_spent"),
      firstOrderDate: sql<Date | null>`(
        SELECT MIN("orders"."created_at") 
        FROM "orders" 
        WHERE "orders"."user_id" = "users"."id"
        AND "orders"."status" NOT IN ('cancelled', 'refunded')
      )`.as("first_order_date"),
      lastOrderDate: sql<Date | null>`(
        SELECT MAX("orders"."created_at") 
        FROM "orders" 
        WHERE "orders"."user_id" = "users"."id"
        AND "orders"."status" NOT IN ('cancelled', 'refunded')
      )`.as("last_order_date"),
    })
    .from(users)
    .orderBy(
      desc(
        sql`(
        SELECT COUNT(*)::int 
        FROM "orders" 
        WHERE "orders"."user_id" = "users"."id"
        AND "orders"."status" NOT IN ('cancelled', 'refunded')
      )`
      )
    );

  return customersWithOrders.map((customer) => ({
    ...customer,
    averageOrderValue:
      customer.orderCount > 0
        ? Math.round(customer.totalSpent / customer.orderCount)
        : 0,
    isRepeatCustomer: customer.orderCount > 1,
  }));
}

// Get repeat customers only (2+ orders)
export async function getRepeatCustomers(): Promise<CustomerWithAnalytics[]> {
  const allCustomers = await getCustomersWithAnalytics();
  return allCustomers.filter((customer) => customer.isRepeatCustomer);
}

// Get customer stats
export type CustomerStats = {
  totalCustomers: number;
  customersWithOrders: number;
  repeatCustomers: number;
  totalRevenue: number;
  averageOrderValue: number;
  averageOrdersPerCustomer: number;
};

export async function getCustomerStats(): Promise<CustomerStats> {
  await requireAdmin();

  const totalUsers = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(users);

  // Customers with at least one order
  const customersWithOrdersResult = await db.execute(sql`
    SELECT COUNT(DISTINCT user_id)::int as count
    FROM ${orders}
    WHERE status NOT IN ('cancelled', 'refunded')
  `);

  // Repeat customers (2+ orders)
  const repeatCustomersResult = await db.execute(sql`
    SELECT COUNT(*)::int as count
    FROM (
      SELECT user_id
      FROM ${orders}
      WHERE status NOT IN ('cancelled', 'refunded')
      GROUP BY user_id
      HAVING COUNT(*) >= 2
    ) as repeat_buyers
  `);

  // Total revenue and order count
  const revenueStats = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(${orders.totalInCents}), 0)::int`,
      totalOrders: sql<number>`COUNT(*)::int`,
    })
    .from(orders)
    .where(and(sql`${orders.status} NOT IN ('cancelled', 'refunded')`));

  const totalCustomers = totalUsers[0]?.count || 0;
  const customersWithOrders =
    (customersWithOrdersResult.rows[0] as { count: number })?.count || 0;
  const repeatCustomers =
    (repeatCustomersResult.rows[0] as { count: number })?.count || 0;
  const totalRevenue = revenueStats[0]?.totalRevenue || 0;
  const totalOrders = revenueStats[0]?.totalOrders || 0;

  return {
    totalCustomers,
    customersWithOrders,
    repeatCustomers,
    totalRevenue,
    averageOrderValue:
      totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    averageOrdersPerCustomer:
      customersWithOrders > 0
        ? Math.round((totalOrders / customersWithOrders) * 100) / 100
        : 0,
  };
}

// Get a specific customer's order history
export type CustomerOrderHistory = {
  customer: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    phone: string | null;
    createdAt: Date;
  };
  orders: {
    id: string;
    orderNumber: string;
    status: string;
    totalInCents: number;
    itemCount: number;
    createdAt: Date;
  }[];
  analytics: {
    orderCount: number;
    totalSpent: number;
    averageOrderValue: number;
    firstOrderDate: Date | null;
    lastOrderDate: Date | null;
  };
};

export async function getCustomerOrderHistory(
  customerId: string
): Promise<CustomerOrderHistory | null> {
  await requireAdmin();

  // Get customer info
  const customer = await db.query.users.findFirst({
    where: eq(users.id, customerId),
  });

  if (!customer) {
    return null;
  }

  // Get customer's orders
  const customerOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalInCents: orders.totalInCents,
      createdAt: orders.createdAt,
      itemCount: sql<number>`(
        SELECT COUNT(*)::int FROM order_items WHERE order_id = ${orders.id}
      )`.as("item_count"),
    })
    .from(orders)
    .where(eq(orders.userId, customerId))
    .orderBy(desc(orders.createdAt));

  // Calculate analytics
  const validOrders = customerOrders.filter(
    (o) => o.status !== "cancelled" && o.status !== "refunded"
  );
  const totalSpent = validOrders.reduce((sum, o) => sum + o.totalInCents, 0);
  const orderCount = validOrders.length;

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      image: customer.image,
      phone: customer.phone,
      createdAt: customer.createdAt,
    },
    orders: customerOrders,
    analytics: {
      orderCount,
      totalSpent,
      averageOrderValue:
        orderCount > 0 ? Math.round(totalSpent / orderCount) : 0,
      firstOrderDate:
        validOrders.length > 0
          ? validOrders[validOrders.length - 1].createdAt
          : null,
      lastOrderDate: validOrders.length > 0 ? validOrders[0].createdAt : null,
    },
  };
}

// ============ GUEST CUSTOMERS ============

export type GuestCustomer = {
  email: string;
  name: string | null;
  phone: string | null;
  orderCount: number;
  totalSpent: number;
  averageOrderValue: number;
  firstOrderDate: Date | null;
  lastOrderDate: Date | null;
};

export async function getGuestCustomers(): Promise<GuestCustomer[]> {
  await requireAdmin();

  const rows = await db
    .select({
      email: orders.guestEmail,
      orderCount: sql<number>`COUNT(*)::int`.as("order_count"),
      totalSpent:
        sql<number>`COALESCE(SUM(${orders.totalInCents}), 0)::int`.as(
          "total_spent"
        ),
      firstOrderDate: sql<Date | null>`MIN(${orders.createdAt})`.as(
        "first_order_date"
      ),
      lastOrderDate: sql<Date | null>`MAX(${orders.createdAt})`.as(
        "last_order_date"
      ),
    })
    .from(orders)
    .where(
      and(
        isNull(orders.userId),
        isNotNull(orders.guestEmail),
        sql`${orders.status} NOT IN ('cancelled', 'refunded')`
      )
    )
    .groupBy(orders.guestEmail)
    .orderBy(desc(sql`COUNT(*)`));

  // For each unique email, grab the most recent name/phone from their latest order
  const guests: GuestCustomer[] = [];

  for (const row of rows) {
    const latestOrder = await db
      .select({
        guestName: orders.guestName,
        guestPhone: orders.guestPhone,
      })
      .from(orders)
      .where(
        and(
          isNull(orders.userId),
          eq(orders.guestEmail, row.email!)
        )
      )
      .orderBy(desc(orders.createdAt))
      .limit(1);

    guests.push({
      email: row.email!,
      name: latestOrder[0]?.guestName || null,
      phone: latestOrder[0]?.guestPhone || null,
      orderCount: row.orderCount,
      totalSpent: row.totalSpent,
      averageOrderValue:
        row.orderCount > 0 ? Math.round(row.totalSpent / row.orderCount) : 0,
      firstOrderDate: row.firstOrderDate,
      lastOrderDate: row.lastOrderDate,
    });
  }

  return guests;
}

export type GuestCustomerOrderHistory = {
  guest: {
    email: string;
    name: string | null;
    phone: string | null;
  };
  orders: {
    id: string;
    orderNumber: string;
    status: string;
    totalInCents: number;
    itemCount: number;
    createdAt: Date;
  }[];
  analytics: {
    orderCount: number;
    totalSpent: number;
    averageOrderValue: number;
    firstOrderDate: Date | null;
    lastOrderDate: Date | null;
  };
};

export async function getGuestCustomerOrderHistory(
  email: string
): Promise<GuestCustomerOrderHistory | null> {
  await requireAdmin();

  const guestOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalInCents: orders.totalInCents,
      createdAt: orders.createdAt,
      guestName: orders.guestName,
      guestPhone: orders.guestPhone,
      itemCount: sql<number>`(
        SELECT COUNT(*)::int FROM order_items WHERE order_id = ${orders.id}
      )`.as("item_count"),
    })
    .from(orders)
    .where(
      and(isNull(orders.userId), eq(orders.guestEmail, email))
    )
    .orderBy(desc(orders.createdAt));

  if (guestOrders.length === 0) return null;

  const latest = guestOrders[0];
  const validOrders = guestOrders.filter(
    (o) => o.status !== "cancelled" && o.status !== "refunded"
  );
  const totalSpent = validOrders.reduce((sum, o) => sum + o.totalInCents, 0);
  const orderCount = validOrders.length;

  return {
    guest: {
      email,
      name: latest.guestName,
      phone: latest.guestPhone,
    },
    orders: guestOrders,
    analytics: {
      orderCount,
      totalSpent,
      averageOrderValue:
        orderCount > 0 ? Math.round(totalSpent / orderCount) : 0,
      firstOrderDate:
        validOrders.length > 0
          ? validOrders[validOrders.length - 1].createdAt
          : null,
      lastOrderDate: validOrders.length > 0 ? validOrders[0].createdAt : null,
    },
  };
}

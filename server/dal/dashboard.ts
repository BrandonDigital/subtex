import { db } from "../db";
import { orders, orderItems } from "../schemas/orders";
import { productVariants, stockSubscriptions } from "../schemas/products";
import { deliveryQuotes } from "../schemas/deliveries";
import { eq, and, gte, lte, lt, sql, count, sum, desc } from "drizzle-orm";

interface DateRange {
  from: Date;
  to: Date;
}

interface MetricWithChange {
  current: number;
  previous: number;
  change: number; // Percentage change
}

export interface DashboardMetrics {
  revenue: MetricWithChange;
  orders: MetricWithChange;
  avgOrderValue: MetricWithChange;
  // Note: Conversion rate requires analytics tracking (visitors), omitted for now
}

export interface DashboardAlerts {
  lowStockCount: number;
  outOfStockCount: number;
  pendingQuotes: number;
  expiringHolds: number;
  stockSubscribers: number;
}

export interface RevenueChartData {
  date: string;
  revenue: number;
}

export interface TopSellingVariant {
  variantId: string;
  sku: string;
  color: string;
  material: string;
  size: string;
  soldCount: number;
}

export interface OrdersByStatus {
  pending: number;
  paid: number;
  processing: number;
  shipped: number;
  delivered: number;
  collected: number;
}

export interface InventoryStatus {
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalUnits: number;
}

// Helper to calculate previous period
function getPreviousPeriod(dateRange: DateRange): DateRange {
  const duration = dateRange.to.getTime() - dateRange.from.getTime();
  return {
    from: new Date(dateRange.from.getTime() - duration),
    to: new Date(dateRange.from.getTime()),
  };
}

// Calculate percentage change
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getDashboardMetrics(
  dateRange: DateRange
): Promise<DashboardMetrics> {
  const previousPeriod = getPreviousPeriod(dateRange);

  // Current period revenue and orders
  const currentData = await db
    .select({
      totalRevenue: sum(orders.totalInCents),
      orderCount: count(),
    })
    .from(orders)
    .where(
      and(
        gte(orders.paidAt, dateRange.from),
        lte(orders.paidAt, dateRange.to),
        eq(orders.status, "paid")
      )
    );

  // Previous period revenue and orders
  const previousData = await db
    .select({
      totalRevenue: sum(orders.totalInCents),
      orderCount: count(),
    })
    .from(orders)
    .where(
      and(
        gte(orders.paidAt, previousPeriod.from),
        lte(orders.paidAt, previousPeriod.to),
        eq(orders.status, "paid")
      )
    );

  const currentRevenue = Number(currentData[0]?.totalRevenue || 0);
  const currentOrders = Number(currentData[0]?.orderCount || 0);
  const previousRevenue = Number(previousData[0]?.totalRevenue || 0);
  const previousOrders = Number(previousData[0]?.orderCount || 0);

  const currentAvgOrder = currentOrders > 0 ? currentRevenue / currentOrders : 0;
  const previousAvgOrder =
    previousOrders > 0 ? previousRevenue / previousOrders : 0;

  return {
    revenue: {
      current: currentRevenue,
      previous: previousRevenue,
      change: calculateChange(currentRevenue, previousRevenue),
    },
    orders: {
      current: currentOrders,
      previous: previousOrders,
      change: calculateChange(currentOrders, previousOrders),
    },
    avgOrderValue: {
      current: Math.round(currentAvgOrder),
      previous: Math.round(previousAvgOrder),
      change: calculateChange(currentAvgOrder, previousAvgOrder),
    },
  };
}

export async function getDashboardAlerts(): Promise<DashboardAlerts> {
  // Low stock variants
  const lowStockResult = await db
    .select({ count: count() })
    .from(productVariants)
    .where(
      and(
        sql`${productVariants.stock} > 0`,
        sql`${productVariants.stock} <= ${productVariants.lowStockThreshold}`,
        eq(productVariants.active, true)
      )
    );

  // Out of stock variants
  const outOfStockResult = await db
    .select({ count: count() })
    .from(productVariants)
    .where(
      and(eq(productVariants.stock, 0), eq(productVariants.active, true))
    );

  // Pending quote requests
  const pendingQuotesResult = await db
    .select({ count: count() })
    .from(deliveryQuotes)
    .where(eq(deliveryQuotes.status, "pending"));

  // Click & collect orders expiring within 24 hours
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const expiringHoldsResult = await db
    .select({ count: count() })
    .from(orders)
    .where(
      and(
        eq(orders.deliveryMethod, "click_collect"),
        eq(orders.status, "paid"),
        lt(orders.holdingExpiresAt, tomorrow)
      )
    );

  // Stock subscribers waiting for restock
  const subscribersResult = await db
    .select({ count: count() })
    .from(stockSubscriptions)
    .where(eq(stockSubscriptions.notified, false));

  return {
    lowStockCount: Number(lowStockResult[0]?.count || 0),
    outOfStockCount: Number(outOfStockResult[0]?.count || 0),
    pendingQuotes: Number(pendingQuotesResult[0]?.count || 0),
    expiringHolds: Number(expiringHoldsResult[0]?.count || 0),
    stockSubscribers: Number(subscribersResult[0]?.count || 0),
  };
}

export async function getRevenueChartData(
  days: number
): Promise<RevenueChartData[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await db
    .select({
      date: sql<string>`DATE(${orders.paidAt})`,
      revenue: sum(orders.totalInCents),
    })
    .from(orders)
    .where(
      and(
        gte(orders.paidAt, startDate),
        eq(orders.status, "paid")
      )
    )
    .groupBy(sql`DATE(${orders.paidAt})`)
    .orderBy(sql`DATE(${orders.paidAt})`);

  return result.map((row) => ({
    date: row.date,
    revenue: Number(row.revenue || 0),
  }));
}

export async function getTopSellingVariants(
  limit: number
): Promise<TopSellingVariant[]> {
  const result = await db
    .select({
      variantId: orderItems.variantId,
      sku: orderItems.sku,
      color: orderItems.color,
      material: orderItems.material,
      size: orderItems.size,
      soldCount: sum(orderItems.quantity),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(eq(orders.status, "paid"))
    .groupBy(
      orderItems.variantId,
      orderItems.sku,
      orderItems.color,
      orderItems.material,
      orderItems.size
    )
    .orderBy(desc(sum(orderItems.quantity)))
    .limit(limit);

  return result.map((row) => ({
    variantId: row.variantId,
    sku: row.sku,
    color: row.color,
    material: row.material,
    size: row.size,
    soldCount: Number(row.soldCount || 0),
  }));
}

export async function getOrdersByStatus(): Promise<OrdersByStatus> {
  const result = await db
    .select({
      status: orders.status,
      count: count(),
    })
    .from(orders)
    .groupBy(orders.status);

  const statusCounts: OrdersByStatus = {
    pending: 0,
    paid: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    collected: 0,
  };

  result.forEach((row) => {
    if (row.status && row.status in statusCounts) {
      statusCounts[row.status as keyof OrdersByStatus] = Number(row.count);
    }
  });

  return statusCounts;
}

export async function getInventoryStatus(): Promise<InventoryStatus> {
  const result = await db
    .select({
      stock: productVariants.stock,
      lowStockThreshold: productVariants.lowStockThreshold,
    })
    .from(productVariants)
    .where(eq(productVariants.active, true));

  let inStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let totalUnits = 0;

  result.forEach((variant) => {
    totalUnits += variant.stock;

    if (variant.stock === 0) {
      outOfStock++;
    } else if (variant.stock <= variant.lowStockThreshold) {
      lowStock++;
    } else {
      inStock++;
    }
  });

  return {
    inStock,
    lowStock,
    outOfStock,
    totalUnits,
  };
}

export async function getRecentOrders(limit: number) {
  return db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

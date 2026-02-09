import type { Metadata } from "next";
import { DashboardPageClient } from "./dashboard-page-client";
import {
  getDashboardMetrics,
  getDashboardAlerts,
  getRevenueChartData,
  getTopSellingProducts,
  getOrdersByStatus,
  getInventoryStatus,
  getRecentOrders,
  getRecentUsers,
  getUserStats,
  refreshDashboardData,
  type DateRangeOption,
} from "@/server/actions/dashboard";

export const metadata: Metadata = {
  title: "Dashboard Overview",
  description: "Subtex admin dashboard overview with sales metrics and alerts.",
};

export default async function DashboardPage() {
  // Default to last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  now.setHours(23, 59, 59, 999);

  // Fetch all dashboard data in parallel
  const [
    metrics,
    alerts,
    revenueChart,
    topProducts,
    ordersByStatus,
    inventoryStatus,
    recentOrders,
    recentUsers,
    userStats,
  ] = await Promise.all([
    getDashboardMetrics(thirtyDaysAgo, now),
    getDashboardAlerts(),
    getRevenueChartData(30),
    getTopSellingProducts(5),
    getOrdersByStatus(),
    getInventoryStatus(),
    getRecentOrders(5),
    getRecentUsers(5),
    getUserStats(),
  ]);

  // Transform recent orders for the client component
  const transformedRecentOrders = recentOrders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.user?.name || "Guest",
    customerEmail: order.user?.email || "",
    totalInCents: order.totalInCents,
    status: order.status,
    createdAt: order.createdAt,
  }));

  // Server action to refresh data for different date ranges
  async function handleRefreshData(range: DateRangeOption) {
    "use server";
    return refreshDashboardData(range);
  }

  return (
    <DashboardPageClient
      initialMetrics={metrics}
      initialAlerts={alerts}
      initialRevenueChart={revenueChart}
      initialTopProducts={topProducts}
      initialOrdersByStatus={ordersByStatus}
      initialInventoryStatus={inventoryStatus}
      initialRecentOrders={transformedRecentOrders}
      initialRecentUsers={recentUsers}
      initialUserStats={userStats}
      refreshData={handleRefreshData}
    />
  );
}

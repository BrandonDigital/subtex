"use server";

import {
  getDashboardMetrics as getMetrics,
  getDashboardAlerts as getAlerts,
  getRevenueChartData as getRevenueChart,
  getTopSellingProducts as getTopProducts,
  getOrdersByStatus as getOrdersStatus,
  getInventoryStatus as getInventory,
  getRecentOrders as getRecent,
  getRecentUsers as getRecentUsersDAL,
  getUserStats as getUserStatsDAL,
} from "../dal/dashboard";

export type DateRangeOption = "7d" | "30d" | "90d" | "this_month" | "last_month";

// Helper to convert date range option to actual dates
function getDateRangeFromOption(option: DateRangeOption): { from: Date; to: Date; days: number } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  
  let from: Date;
  let days: number;
  
  switch (option) {
    case "7d":
      from = new Date(now);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      days = 7;
      break;
    case "30d":
      from = new Date(now);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      days = 30;
      break;
    case "90d":
      from = new Date(now);
      from.setDate(from.getDate() - 90);
      from.setHours(0, 0, 0, 0);
      days = 90;
      break;
    case "this_month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      from.setHours(0, 0, 0, 0);
      days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      break;
    case "last_month":
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(0); // Last day of previous month
      to.setHours(23, 59, 59, 999);
      days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      break;
    default:
      from = new Date(now);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      days = 30;
  }
  
  return { from, to, days };
}

export async function getDashboardMetrics(from: Date, to: Date) {
  return getMetrics({ from, to });
}

export async function getDashboardAlerts() {
  return getAlerts();
}

export async function getRevenueChartData(days: number = 30) {
  return getRevenueChart(days);
}

export async function getTopSellingProducts(limit: number = 5) {
  return getTopProducts(limit);
}

export async function getOrdersByStatus() {
  return getOrdersStatus();
}

export async function getInventoryStatus() {
  return getInventory();
}

export async function getRecentOrders(limit: number = 10) {
  return getRecent(limit);
}

export async function getRecentUsers(limit: number = 5) {
  return getRecentUsersDAL(limit);
}

export async function getUserStats() {
  return getUserStatsDAL();
}

// New function to refresh dashboard data for a specific date range
export async function refreshDashboardData(range: DateRangeOption) {
  const { from, to, days } = getDateRangeFromOption(range);
  
  const [metrics, revenueChart] = await Promise.all([
    getMetrics({ from, to }),
    getRevenueChart(days),
  ]);
  
  return {
    metrics,
    revenueChart,
  };
}

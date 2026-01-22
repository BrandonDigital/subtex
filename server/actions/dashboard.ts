"use server";

import {
  getDashboardMetrics as getMetrics,
  getDashboardAlerts as getAlerts,
  getRevenueChartData as getRevenueChart,
  getTopSellingVariants as getTopVariants,
  getOrdersByStatus as getOrdersStatus,
  getInventoryStatus as getInventory,
  getRecentOrders as getRecent,
} from "../dal/dashboard";

export async function getDashboardMetrics(from: Date, to: Date) {
  return getMetrics({ from, to });
}

export async function getDashboardAlerts() {
  return getAlerts();
}

export async function getRevenueChartData(days: number = 30) {
  return getRevenueChart(days);
}

export async function getTopSellingVariants(limit: number = 5) {
  return getTopVariants(limit);
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

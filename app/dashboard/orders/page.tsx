import type { Metadata } from "next";
import { getRefundRequests } from "@/server/actions/refunds";
import { getOrders } from "@/server/actions/orders";
import { OrdersPageClient } from "./orders-page-client";

export const metadata: Metadata = {
  title: "Orders",
  description: "Manage customer orders and refunds.",
};

export default async function DashboardOrdersPage() {
  const [orders, pendingRefunds] = await Promise.all([
    getOrders(),
    getRefundRequests("pending"),
  ]);

  return (
    <OrdersPageClient
      orders={orders as any}
      pendingRefunds={pendingRefunds as any}
    />
  );
}

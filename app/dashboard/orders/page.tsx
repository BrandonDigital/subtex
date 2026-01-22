import type { Metadata } from "next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRefundRequests } from "@/server/actions/refunds";
import { OrdersTable } from "./orders-table";
import { RefundRequestsTable } from "./refund-requests-table";
import { getOrders } from "@/server/actions/orders";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground">Manage customer orders and process refunds</p>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">All Orders</TabsTrigger>
          <TabsTrigger value="refunds" className="relative">
            Refund Requests
            {pendingRefunds.length > 0 && (
              <span className="ml-2 h-5 w-5 flex items-center justify-center text-xs bg-destructive text-destructive-foreground rounded-full">
                {pendingRefunds.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <OrdersTable orders={orders} />
        </TabsContent>

        <TabsContent value="refunds">
          <RefundRequestsTable requests={pendingRefunds} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

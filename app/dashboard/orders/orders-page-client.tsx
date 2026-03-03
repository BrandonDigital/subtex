"use client";

import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrdersTable } from "./orders-table";
import { RefundRequestsTable } from "./refund-requests-table";
import { OrderDetailPanel } from "./order-detail-panel";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  deliveryMethod: string;
  totalInCents: number;
  discountInCents: number;
  discountCodeSnapshot: string | null;
  refundedAmountInCents: number;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
  } | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  items: { quantity: number }[];
  refundRequests: { status: string }[];
}

interface RefundRequest {
  id: string;
  reason: string;
  requestedAmountInCents: number;
  status: string;
  createdAt: Date;
  order: {
    id: string;
    orderNumber: string;
    totalInCents: number;
    refundedAmountInCents: number;
    stripePaymentIntentId: string | null;
    user: {
      name: string | null;
      email: string;
    } | null;
  };
  user: {
    name: string | null;
    email: string;
  };
  items?: {
    id: string;
    quantity: number;
    amountInCents: number;
    orderItem: {
      name: string;
      partNumber: string | null;
    };
  }[];
}

interface OrdersPageClientProps {
  orders: Order[];
  pendingRefunds: RefundRequest[];
}

export function OrdersPageClient({
  orders,
  pendingRefunds,
}: OrdersPageClientProps) {
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const handleViewOrder = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
    setShowDetailPanel(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowDetailPanel(false);
    setSelectedOrderId(null);
  }, []);

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">
            Manage customer orders and process refunds
          </p>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders">All Orders</TabsTrigger>
            <TabsTrigger value="refunds" className="relative">
              Refund Requests
              {pendingRefunds.length > 0 && (
                <span className="ml-2 h-5 w-5 flex items-center justify-center text-xs bg-destructive text-white rounded-full">
                  {pendingRefunds.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OrdersTable orders={orders} onViewOrder={handleViewOrder} />
          </TabsContent>

          <TabsContent value="refunds">
            <RefundRequestsTable requests={pendingRefunds} />
          </TabsContent>
        </Tabs>
      </div>

      <OrderDetailPanel
        isOpen={showDetailPanel}
        onClose={handleCloseDetail}
        orderId={selectedOrderId}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { Search, Filter, SquareArrowOutUpRight, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface OrdersTableProps {
  orders: Order[];
  onViewOrder: (orderId: string) => void;
}

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  paid: { label: "Paid", variant: "default" },
  processing: { label: "Processing", variant: "default" },
  shipped: { label: "Shipped", variant: "default" },
  delivered: { label: "Delivered", variant: "outline" },
  collected: { label: "Collected", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  refund_requested: { label: "Refund Requested", variant: "destructive" },
  refunded: { label: "Refunded", variant: "secondary" },
};

const deliveryLabels: Record<string, string> = {
  click_collect: "Click & Collect",
  local_delivery: "Local Delivery",
  interstate: "Interstate",
  international: "International",
};

export function OrdersTable({ orders, onViewOrder }: OrdersTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all");

  const filteredOrders = orders.filter((order) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchLower) ||
      order.user?.name?.toLowerCase().includes(searchLower) ||
      order.user?.email?.toLowerCase().includes(searchLower) ||
      order.guestName?.toLowerCase().includes(searchLower) ||
      order.guestEmail?.toLowerCase().includes(searchLower) ||
      order.guestPhone?.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesDelivery = deliveryFilter === "all" || order.deliveryMethod === deliveryFilter;

    return matchesSearch && matchesStatus && matchesDelivery;
  });

  const totalItems = (items: { quantity: number }[]) => 
    items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number or customer..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="collected">Collected</SelectItem>
                <SelectItem value="refund_requested">Refund Requested</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Delivery" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Delivery</SelectItem>
                <SelectItem value="click_collect">Click & Collect</SelectItem>
                <SelectItem value="local_delivery">Local Delivery</SelectItem>
                <SelectItem value="interstate">Interstate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Orders ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {orders.length === 0 ? "No orders yet" : "No orders match your filters"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={() => onViewOrder(order.id)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          {order.discountCodeSnapshot && (
                            <Badge variant="outline" className="mt-1 text-xs gap-1">
                              <Ticket className="h-3 w-3" />
                              {order.discountCodeSnapshot}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {order.user?.name || order.guestName || "Guest"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.user?.email || order.guestEmail || order.guestPhone || ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {deliveryLabels[order.deliveryMethod] || order.deliveryMethod}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{totalItems(order.items)}</TableCell>
                      <TableCell className="text-right">
                        <div>
                          <p>{formatPrice(order.totalInCents)}</p>
                          {order.discountInCents > 0 && (
                            <p className="text-xs text-green-600">
                              -{formatPrice(order.discountInCents)} discount
                            </p>
                          )}
                          {order.refundedAmountInCents > 0 && (
                            <p className="text-xs text-red-500">
                              -{formatPrice(order.refundedAmountInCents)} refunded
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[order.status]?.variant || "secondary"}>
                          {statusConfig[order.status]?.label || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewOrder(order.id)}
                        >
                          <SquareArrowOutUpRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

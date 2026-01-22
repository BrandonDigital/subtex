"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Filter, Download, MoreHorizontal, Eye, RefreshCw } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrderStatus } from "@/server/actions/orders";
import { toast } from "sonner";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  deliveryMethod: string;
  totalInCents: number;
  refundedAmountInCents: number;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
  };
  items: { quantity: number }[];
  refundRequests: { status: string }[];
}

interface OrdersTableProps {
  orders: Order[];
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

export function OrdersTable({ orders }: OrdersTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all");

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      order.user?.email.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesDelivery = deliveryFilter === "all" || order.deliveryMethod === deliveryFilter;

    return matchesSearch && matchesStatus && matchesDelivery;
  });

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus(orderId, newStatus as any);
      toast.success("Order status updated");
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    }
  };

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
                  const hasPendingRefund = order.refundRequests.some(r => r.status === "pending");
                  const isPartiallyRefunded = order.refundedAmountInCents > 0 && order.refundedAmountInCents < order.totalInCents;

                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          {hasPendingRefund && (
                            <Badge variant="destructive" className="mt-1 text-xs">
                              Refund pending
                            </Badge>
                          )}
                          {isPartiallyRefunded && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              Partial refund
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.user?.name || "Guest"}</p>
                          <p className="text-xs text-muted-foreground">{order.user?.email}</p>
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/orders/${order.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, "processing")}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Mark Processing
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, "shipped")}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Mark Shipped
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, "delivered")}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Mark Delivered
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, "collected")}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Mark Collected
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

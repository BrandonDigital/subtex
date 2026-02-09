"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  Clock,
  Bell,
  ArrowRight,
  RefreshCw,
  Calendar,
  Users,
  UserPlus,
  Mail,
  CheckCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import type {
  DashboardMetrics,
  DashboardAlerts,
  RevenueChartData,
  TopSellingProduct,
  OrdersByStatus,
  InventoryStatus,
  RecentUser,
} from "@/server/dal/dashboard";

type DateRangeOption = "7d" | "30d" | "90d" | "this_month" | "last_month";

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string;
  totalInCents: number;
  status: string;
  createdAt: Date;
  itemCount?: number;
}

interface UserStats {
  totalUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  verifiedUsers: number;
}

interface DashboardPageClientProps {
  initialMetrics: DashboardMetrics;
  initialAlerts: DashboardAlerts;
  initialRevenueChart: RevenueChartData[];
  initialTopProducts: TopSellingProduct[];
  initialOrdersByStatus: OrdersByStatus;
  initialInventoryStatus: InventoryStatus;
  initialRecentOrders: RecentOrder[];
  initialRecentUsers: RecentUser[];
  initialUserStats: UserStats;
  refreshData: (range: DateRangeOption) => Promise<{
    metrics: DashboardMetrics;
    revenueChart: RevenueChartData[];
  }>;
}

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(priceInCents / 100);
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
  }).format(then);
}

const dateRangeOptions: { value: DateRangeOption; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

export function DashboardPageClient({
  initialMetrics,
  initialAlerts,
  initialRevenueChart,
  initialTopProducts,
  initialOrdersByStatus,
  initialInventoryStatus,
  initialRecentOrders,
  initialRecentUsers,
  initialUserStats,
  refreshData,
}: DashboardPageClientProps) {
  const [dateRange, setDateRange] = useState<DateRangeOption>("30d");
  const [metrics, setMetrics] = useState(initialMetrics);
  const [revenueChart, setRevenueChart] = useState(initialRevenueChart);
  const [isPending, startTransition] = useTransition();

  const alerts = initialAlerts;
  const topProducts = initialTopProducts;
  const ordersByStatus = initialOrdersByStatus;
  const inventoryStatus = initialInventoryStatus;
  const recentOrders = initialRecentOrders;
  const recentUsers = initialRecentUsers;
  const userStats = initialUserStats;

  const handleDateRangeChange = (value: DateRangeOption) => {
    setDateRange(value);
    startTransition(async () => {
      const data = await refreshData(value);
      setMetrics(data.metrics);
      setRevenueChart(data.revenueChart);
    });
  };

  const hasAlerts =
    alerts.lowStockCount > 0 ||
    alerts.outOfStockCount > 0 ||
    alerts.pendingQuotes > 0 ||
    alerts.expiringHolds > 0 ||
    alerts.stockSubscribers > 0;

  // Format chart data for display
  const formattedChartData = revenueChart.map((item) => ({
    date: new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
    }).format(new Date(item.date)),
    revenue: item.revenue,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {dateRangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isPending && (
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Alerts */}
      {hasAlerts && (
        <div className="space-y-2">
          {alerts.lowStockCount > 0 && (
            <AlertBanner
              icon={AlertTriangle}
              message={`${alerts.lowStockCount} product${alerts.lowStockCount === 1 ? " is" : "s are"} low on stock`}
              href="/dashboard/inventory"
              variant="warning"
            />
          )}
          {alerts.outOfStockCount > 0 && (
            <AlertBanner
              icon={Package}
              message={`${alerts.outOfStockCount} product${alerts.outOfStockCount === 1 ? " is" : "s are"} out of stock`}
              href="/dashboard/inventory"
              variant="destructive"
            />
          )}
          {alerts.pendingQuotes > 0 && (
            <AlertBanner
              icon={Clock}
              message={`${alerts.pendingQuotes} pending quote request${alerts.pendingQuotes === 1 ? "" : "s"}`}
              href="/dashboard/deliveries"
              variant="info"
            />
          )}
          {alerts.expiringHolds > 0 && (
            <AlertBanner
              icon={Clock}
              message={`${alerts.expiringHolds} click & collect order${alerts.expiringHolds === 1 ? "" : "s"} expiring soon`}
              href="/dashboard/orders"
              variant="warning"
            />
          )}
          {alerts.stockSubscribers > 0 && (
            <AlertBanner
              icon={Bell}
              message={`${alerts.stockSubscribers} customer${alerts.stockSubscribers === 1 ? "" : "s"} waiting for restock notifications`}
              href="/dashboard/inventory"
              variant="info"
            />
          )}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Revenue"
          value={formatPrice(metrics.revenue.current)}
          change={metrics.revenue.change}
          icon={DollarSign}
          loading={isPending}
        />
        <MetricCard
          title="Orders"
          value={metrics.orders.current.toString()}
          change={metrics.orders.change}
          icon={ShoppingCart}
          loading={isPending}
        />
        <MetricCard
          title="Avg Order Value"
          value={formatPrice(metrics.avgOrderValue.current)}
          change={metrics.avgOrderValue.change}
          icon={TrendingUp}
          loading={isPending}
        />
      </div>

      {/* Charts and Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>
              {dateRangeOptions.find((o) => o.value === dateRange)?.label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formattedChartData.length > 0 ? (
              <RevenueChart data={formattedChartData} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No revenue data for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Selling Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>By units sold (all time)</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-4">
                        {index + 1}.
                      </span>
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.partNumber || "No part number"}
                          {product.color && ` · ${product.color}`}
                          {product.size && ` · ${product.size}`}
                        </p>
                      </div>
                    </div>
                    <span className="font-medium">{product.soldCount} pcs</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No sales data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <StatusItem label="Pending" value={ordersByStatus.pending} />
              <StatusItem label="Paid" value={ordersByStatus.paid} />
              <StatusItem label="Processing" value={ordersByStatus.processing} />
              <StatusItem label="Shipped" value={ordersByStatus.shipped} />
              <StatusItem label="Delivered" value={ordersByStatus.delivered} />
              <StatusItem label="Collected" value={ordersByStatus.collected} />
            </div>
          </CardContent>
        </Card>

        {/* Inventory Status */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <StatusItem
                label="In Stock"
                value={inventoryStatus.inStock}
                suffix="products"
                variant="success"
              />
              <StatusItem
                label="Low Stock"
                value={inventoryStatus.lowStock}
                suffix="products"
                variant="warning"
              />
              <StatusItem
                label="Out of Stock"
                value={inventoryStatus.outOfStock}
                suffix={inventoryStatus.outOfStock === 1 ? "product" : "products"}
                variant="destructive"
              />
              <StatusItem
                label="Total Units"
                value={inventoryStatus.totalUnits}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Stats and New Users */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <StatusItem
                label="Total Users"
                value={userStats.totalUsers}
                suffix={userStats.totalUsers === 1 ? "user" : "users"}
              />
              <StatusItem
                label="New This Week"
                value={userStats.newUsersThisWeek}
                suffix={userStats.newUsersThisWeek === 1 ? "user" : "users"}
                variant="success"
              />
              <StatusItem
                label="New This Month"
                value={userStats.newUsersThisMonth}
                suffix={userStats.newUsersThisMonth === 1 ? "user" : "users"}
              />
              <StatusItem
                label="Verified"
                value={userStats.verifiedUsers}
                suffix={userStats.verifiedUsers === 1 ? "user" : "users"}
                variant="success"
              />
            </div>
          </CardContent>
        </Card>

        {/* New Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                New Users
              </CardTitle>
              <CardDescription>Recently registered accounts</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/users">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentUsers.length > 0 ? (
              <div className="space-y-4">
                {recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.image || undefined} alt={user.name || user.email} />
                        <AvatarFallback>
                          {user.name
                            ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                            : user.email.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {user.name || "No name"}
                          {user.emailVerified && (
                            <CheckCircle className="inline-block ml-1 h-3 w-3 text-green-600" />
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(user.createdAt)}
                      </p>
                      {user.role === "admin" && (
                        <Badge variant="secondary" className="text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No users registered yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders from your store</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/orders">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>
                      {order.customerName || order.customerEmail}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(order.totalInCents)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatDate(order.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No orders yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Component: Alert Banner
function AlertBanner({
  icon: Icon,
  message,
  href,
  variant = "warning",
}: {
  icon: React.ElementType;
  message: string;
  href: string;
  variant?: "warning" | "destructive" | "info";
}) {
  const variantStyles = {
    warning:
      "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
    destructive:
      "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
    info: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
  };

  return (
    <Link
      href={href}
      className={`flex items-center justify-between p-3 rounded-lg border ${variantStyles[variant]} transition-colors hover:opacity-80`}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

// Component: Metric Card
function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  loading?: boolean;
}) {
  const isPositive = change >= 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className={loading ? "opacity-50" : ""}>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <div className="flex items-center gap-1 mt-1">
              {isPositive ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span
                className={`text-xs font-medium ${
                  isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {isPositive ? "+" : ""}
                {change}% vs last period
              </span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Component: Status Item
function StatusItem({
  label,
  value,
  suffix,
  variant,
}: {
  label: string;
  value: number;
  suffix?: string;
  variant?: "success" | "warning" | "destructive";
}) {
  const variantStyles = {
    success: "text-green-600",
    warning: "text-amber-600",
    destructive: "text-red-600",
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-medium ${variant ? variantStyles[variant] : ""}`}>
        {value} {suffix}
      </span>
    </div>
  );
}

// Component: Order Status Badge
function OrderStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" }
  > = {
    pending: { label: "Pending", variant: "secondary" },
    paid: { label: "Paid", variant: "default" },
    processing: { label: "Processing", variant: "default" },
    shipped: { label: "Shipped", variant: "default" },
    delivered: { label: "Delivered", variant: "default" },
    collected: { label: "Collected", variant: "default" },
    cancelled: { label: "Cancelled", variant: "destructive" },
    refund_requested: { label: "Refund Requested", variant: "secondary" },
    refunded: { label: "Refunded", variant: "destructive" },
  };

  const config = statusConfig[status] || {
    label: status,
    variant: "secondary" as const,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

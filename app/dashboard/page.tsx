import type { Metadata } from "next";
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
  Users,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RevenueChart } from "@/components/dashboard/revenue-chart";

export const metadata: Metadata = {
  title: "Dashboard Overview",
  description: "Subtex admin dashboard overview with sales metrics and alerts.",
};

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(priceInCents / 100);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

export default async function DashboardPage() {
  // TODO: Fetch real data from actions
  const metrics = {
    revenue: { current: 1245000, previous: 1082000, change: 15 },
    orders: { current: 47, previous: 43, change: 9 },
    avgOrderValue: { current: 26489, previous: 25163, change: 5 },
  };

  const alerts = {
    lowStockCount: 3,
    outOfStockCount: 1,
    pendingQuotes: 2,
    expiringHolds: 1,
    stockSubscribers: 5,
  };

  const topVariants = [
    { sku: "WHT-GLS-STD", color: "White", material: "Gloss", size: "Standard", soldCount: 145 },
    { sku: "BLK-MAT-XL", color: "Black", material: "Matte", size: "XL", soldCount: 98 },
    { sku: "WHT-MAT-STD", color: "White", material: "Matte", size: "Standard", soldCount: 76 },
    { sku: "BLK-GLS-STD", color: "Black", material: "Gloss", size: "Standard", soldCount: 54 },
    { sku: "WHT-GLS-XL", color: "White", material: "Gloss", size: "XL", soldCount: 32 },
  ];

  const ordersByStatus = {
    pending: 12,
    paid: 8,
    processing: 5,
    shipped: 15,
    delivered: 45,
    collected: 12,
  };

  const inventoryStatus = {
    inStock: 6,
    lowStock: 2,
    outOfStock: 1,
    totalUnits: 847,
  };

  const recentOrders = [
    { id: "1", orderNumber: "SUB-XYZ123", customer: "John Smith", items: 10, total: 65000, status: "paid", date: "2026-01-18" },
    { id: "2", orderNumber: "SUB-ABC456", customer: "Sarah Jones", items: 25, total: 145000, status: "shipped", date: "2026-01-18" },
    { id: "3", orderNumber: "SUB-DEF789", customer: "Mike Wilson", items: 5, total: 37500, status: "collected", date: "2026-01-17" },
    { id: "4", orderNumber: "SUB-GHI012", customer: "Emma Brown", items: 15, total: 98000, status: "processing", date: "2026-01-17" },
    { id: "5", orderNumber: "SUB-JKL345", customer: "Tom Davis", items: 8, total: 52000, status: "pending", date: "2026-01-16" },
  ];

  const revenueChartData = [
    { date: "Jan 1", revenue: 45000 },
    { date: "Jan 5", revenue: 52000 },
    { date: "Jan 10", revenue: 38000 },
    { date: "Jan 15", revenue: 65000 },
    { date: "Jan 18", revenue: 72000 },
  ];

  const hasAlerts = alerts.lowStockCount > 0 || alerts.outOfStockCount > 0 || 
                    alerts.pendingQuotes > 0 || alerts.expiringHolds > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here&apos;s what&apos;s happening.</p>
      </div>

      {/* Alerts */}
      {hasAlerts && (
        <div className="space-y-2">
          {alerts.lowStockCount > 0 && (
            <Alert
              icon={AlertTriangle}
              message={`${alerts.lowStockCount} products are low on stock`}
              href="/dashboard/inventory"
              variant="warning"
            />
          )}
          {alerts.outOfStockCount > 0 && (
            <Alert
              icon={Package}
              message={`${alerts.outOfStockCount} product is out of stock`}
              href="/dashboard/inventory"
              variant="destructive"
            />
          )}
          {alerts.pendingQuotes > 0 && (
            <Alert
              icon={Clock}
              message={`${alerts.pendingQuotes} pending quote requests`}
              href="/dashboard/deliveries"
              variant="info"
            />
          )}
          {alerts.expiringHolds > 0 && (
            <Alert
              icon={Clock}
              message={`${alerts.expiringHolds} click & collect expiring tomorrow`}
              href="/dashboard/orders"
              variant="warning"
            />
          )}
          {alerts.stockSubscribers > 0 && (
            <Alert
              icon={Bell}
              message={`${alerts.stockSubscribers} customers waiting for restock notifications`}
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
        />
        <MetricCard
          title="Orders"
          value={metrics.orders.current.toString()}
          change={metrics.orders.change}
          icon={ShoppingCart}
        />
        <MetricCard
          title="Avg Order Value"
          value={formatPrice(metrics.avgOrderValue.current)}
          change={metrics.avgOrderValue.change}
          icon={TrendingUp}
        />
      </div>

      {/* Charts and Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueChartData} />
          </CardContent>
        </Card>

        {/* Top Selling Variants */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Variants</CardTitle>
            <CardDescription>By units sold</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topVariants.map((variant, index) => (
                <div key={variant.sku} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-4">{index + 1}.</span>
                    <div>
                      <p className="font-medium text-sm">
                        {variant.color} {variant.material} {variant.size}
                      </p>
                      <p className="text-xs text-muted-foreground">{variant.sku}</p>
                    </div>
                  </div>
                  <span className="font-medium">{variant.soldCount} pcs</span>
                </div>
              ))}
            </div>
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
              <StatusItem label="In Stock" value={inventoryStatus.inStock} suffix="variants" variant="success" />
              <StatusItem label="Low Stock" value={inventoryStatus.lowStock} suffix="variants" variant="warning" />
              <StatusItem label="Out of Stock" value={inventoryStatus.outOfStock} suffix="variant" variant="destructive" />
              <StatusItem label="Total Units" value={inventoryStatus.totalUnits} />
            </div>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell className="text-center">{order.items}</TableCell>
                  <TableCell className="text-right">{formatPrice(order.total)}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right">{formatDate(order.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Component: Alert Banner
function Alert({
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
    warning: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
    destructive: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
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
}: {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
}) {
  const isPositive = change >= 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
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
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    pending: { label: "Pending", variant: "secondary" },
    paid: { label: "Paid", variant: "default" },
    processing: { label: "Processing", variant: "default" },
    shipped: { label: "Shipped", variant: "default" },
    delivered: { label: "Delivered", variant: "default" },
    collected: { label: "Collected", variant: "default" },
    cancelled: { label: "Cancelled", variant: "destructive" },
  };

  const config = statusConfig[status] || { label: status, variant: "secondary" as const };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

import type { Metadata } from "next";
import { Bell, Mail, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NotificationForm } from "./notification-form";
import {
  getRecipientCounts,
  getNotificationHistory,
} from "@/server/actions/notifications";
import { getActiveSubscribersWithDetails } from "@/server/actions/subscribers";
import { getStockSubscribersByProduct } from "@/server/actions/stock-subscriptions";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Send notifications and manage stock alerts.",
};

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function DashboardNotificationsPage() {
  const [recipientCounts, notificationHistory, comingSoonSubscribers, stockSubscribers] = await Promise.all([
    getRecipientCounts(),
    getNotificationHistory(),
    getActiveSubscribersWithDetails(),
    getStockSubscribersByProduct(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">
          Send notifications and manage stock alerts
        </p>
      </div>

      <Tabs defaultValue="send" className="space-y-6">
        <TabsList>
          <TabsTrigger value="send">Send Notification</TabsTrigger>
          <TabsTrigger value="coming-soon">
            Coming Soon
            {comingSoonSubscribers.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {comingSoonSubscribers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stock">
            Stock Alerts
            {stockSubscribers.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stockSubscribers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Send Notification Tab */}
        <TabsContent value="send" className="space-y-6">
          <NotificationForm recipientCounts={recipientCounts} />
        </TabsContent>

        {/* Coming Soon Subscribers Tab */}
        <TabsContent value="coming-soon" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Coming Soon Subscribers
              </CardTitle>
              <CardDescription>
                Users who signed up to be notified when the site launches
              </CardDescription>
            </CardHeader>
            <CardContent>
              {comingSoonSubscribers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No subscribers yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Subscribed At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comingSoonSubscribers.map((subscriber) => (
                      <TableRow key={subscriber.id}>
                        <TableCell className="font-medium">
                          {subscriber.email}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(subscriber.subscribedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Subscribers Tab */}
        <TabsContent value="stock" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Stock Alert Subscribers
              </CardTitle>
              <CardDescription>
                Customers waiting to be notified when products are back in stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stockSubscribers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No subscribers waiting for stock alerts
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part Number</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-center">Subscribers</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockSubscribers.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-mono text-sm">
                          {item.partNumber || "-"}
                        </TableCell>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={item.stock === 0 ? "destructive" : "secondary"}>
                            {item.stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            <Bell className="h-3 w-3 mr-1" />
                            {item.subscriberCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" disabled={item.stock === 0}>
                            Notify All
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>History of sent notifications</CardDescription>
            </CardHeader>
            <CardContent>
              {notificationHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No notifications sent yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="text-center">Recipients</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Sent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notificationHistory.map((notification) => (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {notification.type === "stock_alert" && "Stock Alert"}
                            {notification.type === "order_update" && "Order Update"}
                            {notification.type === "promotion" && "Promotion"}
                            {notification.type === "system" && "System"}
                            {notification.type === "quote_ready" && "Quote Ready"}
                            {notification.type === "payment_link" && "Payment Link"}
                            {notification.type === "low_stock_admin" && "Low Stock"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {notification.title}
                        </TableCell>
                        <TableCell className="text-center">
                          {notification.recipients}
                        </TableCell>
                        <TableCell>
                          <Badge variant={notification.emailSent ? "secondary" : "outline"}>
                            {notification.emailSent ? "Email" : "In-App"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(notification.sentAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

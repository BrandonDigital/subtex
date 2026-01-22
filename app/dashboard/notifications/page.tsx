import type { Metadata } from "next";
import { Bell, Send, Users, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export const metadata: Metadata = {
  title: "Notifications",
  description: "Send notifications and manage stock alerts.",
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function DashboardNotificationsPage() {
  // TODO: Fetch from action
  const recentNotifications = [
    { id: "1", type: "stock_alert", title: "Back in Stock: White Matte XL", recipients: 5, sentAt: "2026-01-18T10:00:00Z" },
    { id: "2", type: "order_update", title: "Order Shipped: SUB-ABC456", recipients: 1, sentAt: "2026-01-18T09:30:00Z" },
    { id: "3", type: "promotion", title: "January Sale - 20% Off", recipients: 150, sentAt: "2026-01-15T08:00:00Z" },
  ];

  const stockSubscribers = [
    { id: "1", sku: "WHT-MAT-XL", variant: "White Matte XL", subscribers: 5 },
    { id: "2", sku: "BLK-MAT-XL", variant: "Black Matte XL", subscribers: 2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">Send notifications and manage stock alerts</p>
      </div>

      <Tabs defaultValue="send" className="space-y-6">
        <TabsList>
          <TabsTrigger value="send">Send Notification</TabsTrigger>
          <TabsTrigger value="stock">Stock Subscribers</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Send Notification Tab */}
        <TabsContent value="send" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Notification
              </CardTitle>
              <CardDescription>
                Send a notification to all users or specific groups
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" placeholder="Notification title..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Write your notification message..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Recipients</Label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    All Users
                  </Button>
                  <Button variant="outline" size="sm">
                    <Package className="h-4 w-4 mr-2" />
                    Customers with Orders
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button>
                  <Bell className="h-4 w-4 mr-2" />
                  Send In-App Notification
                </Button>
                <Button variant="outline">
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Subscribers Tab */}
        <TabsContent value="stock" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Alert Subscribers</CardTitle>
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
                      <TableHead>SKU</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead className="text-center">Subscribers</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockSubscribers.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell>{item.variant}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            <Bell className="h-3 w-3 mr-1" />
                            {item.subscribers}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
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
              <CardDescription>
                History of sent notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-center">Recipients</TableHead>
                    <TableHead>Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentNotifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {notification.type === "stock_alert" && "Stock Alert"}
                          {notification.type === "order_update" && "Order Update"}
                          {notification.type === "promotion" && "Promotion"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{notification.title}</TableCell>
                      <TableCell className="text-center">{notification.recipients}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(notification.sentAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

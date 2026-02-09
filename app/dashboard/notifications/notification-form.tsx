"use client";

import { useState, useTransition } from "react";
import { Bell, Send, Users, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  sendBulkInAppNotification,
  sendBulkEmailNotification,
  type RecipientGroup,
} from "@/server/actions/notifications";
import { cn } from "@/lib/utils";

interface NotificationFormProps {
  recipientCounts: {
    allUsers: number;
    customersWithOrders: number;
  };
}

export function NotificationForm({ recipientCounts }: NotificationFormProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<RecipientGroup | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSendInApp = () => {
    if (!selectedRecipients) {
      toast.error("Please select a recipient group");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    startTransition(async () => {
      const result = await sendBulkInAppNotification({
        title,
        message,
        recipientGroup: selectedRecipients,
      });

      if (result.success) {
        toast.success(result.message);
        setTitle("");
        setMessage("");
        setSelectedRecipients(null);
      } else {
        toast.error(result.error || "Failed to send notification");
      }
    });
  };

  const handleSendEmail = () => {
    if (!selectedRecipients) {
      toast.error("Please select a recipient group");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    startTransition(async () => {
      const result = await sendBulkEmailNotification({
        title,
        message,
        recipientGroup: selectedRecipients,
      });

      if (result.success) {
        toast.success(result.message);
        setTitle("");
        setMessage("");
        setSelectedRecipients(null);
      } else {
        toast.error(result.error || "Failed to send email");
      }
    });
  };

  return (
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
          <Input
            id="title"
            placeholder="Notification title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Write your notification message..."
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label>Recipients</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={selectedRecipients === "all_users" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRecipients("all_users")}
              disabled={isPending}
              className={cn(
                selectedRecipients === "all_users" && "ring-2 ring-offset-2 ring-primary"
              )}
            >
              <Users className="h-4 w-4 mr-2" />
              All Users ({recipientCounts.allUsers})
            </Button>
            <Button
              type="button"
              variant={selectedRecipients === "customers_with_orders" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRecipients("customers_with_orders")}
              disabled={isPending}
              className={cn(
                selectedRecipients === "customers_with_orders" && "ring-2 ring-offset-2 ring-primary"
              )}
            >
              <Package className="h-4 w-4 mr-2" />
              Customers with Orders ({recipientCounts.customersWithOrders})
            </Button>
          </div>
          {selectedRecipients && (
            <p className="text-sm text-muted-foreground mt-2">
              Selected: {selectedRecipients === "all_users" 
                ? `${recipientCounts.allUsers} user${recipientCounts.allUsers === 1 ? "" : "s"}` 
                : `${recipientCounts.customersWithOrders} customer${recipientCounts.customersWithOrders === 1 ? "" : "s"} with orders`}
            </p>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <Button onClick={handleSendInApp} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            Send In-App Notification
          </Button>
          <Button variant="outline" onClick={handleSendEmail} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

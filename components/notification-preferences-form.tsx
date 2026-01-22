"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface NotificationPreferences {
  emailOrderUpdates: boolean;
  emailStockAlerts: boolean;
  emailQuoteReady: boolean;
  emailPromotions: boolean;
  pushOrderUpdates: boolean;
  pushStockAlerts: boolean;
  pushQuoteReady: boolean;
  pushPromotions: boolean;
}

export function NotificationPreferencesForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailOrderUpdates: true,
    emailStockAlerts: true,
    emailQuoteReady: true,
    emailPromotions: false,
    pushOrderUpdates: true,
    pushStockAlerts: true,
    pushQuoteReady: true,
    pushPromotions: false,
  });

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    // TODO: Save preferences via action
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const handleUnsubscribeAll = () => {
    setPreferences({
      emailOrderUpdates: true, // Keep essential notifications
      emailStockAlerts: false,
      emailQuoteReady: true, // Keep essential notifications
      emailPromotions: false,
      pushOrderUpdates: true, // Keep essential notifications
      pushStockAlerts: false,
      pushQuoteReady: true, // Keep essential notifications
      pushPromotions: false,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose how you want to be notified about orders, stock alerts, and promotions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Order Updates */}
        <div className="space-y-4">
          <h3 className="font-medium">Order Updates</h3>
          <p className="text-sm text-muted-foreground">
            Notifications about your order status, shipping, and delivery.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="emailOrderUpdates" className="font-normal">
                Email notifications
              </Label>
              <Switch
                id="emailOrderUpdates"
                checked={preferences.emailOrderUpdates}
                onCheckedChange={() => handleToggle("emailOrderUpdates")}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pushOrderUpdates" className="font-normal">
                In-app notifications
              </Label>
              <Switch
                id="pushOrderUpdates"
                checked={preferences.pushOrderUpdates}
                onCheckedChange={() => handleToggle("pushOrderUpdates")}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Stock Alerts */}
        <div className="space-y-4">
          <h3 className="font-medium">Stock Alerts</h3>
          <p className="text-sm text-muted-foreground">
            Get notified when products you&apos;re interested in are back in stock.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="emailStockAlerts" className="font-normal">
                Email notifications
              </Label>
              <Switch
                id="emailStockAlerts"
                checked={preferences.emailStockAlerts}
                onCheckedChange={() => handleToggle("emailStockAlerts")}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pushStockAlerts" className="font-normal">
                In-app notifications
              </Label>
              <Switch
                id="pushStockAlerts"
                checked={preferences.pushStockAlerts}
                onCheckedChange={() => handleToggle("pushStockAlerts")}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Quote Ready */}
        <div className="space-y-4">
          <h3 className="font-medium">Quote Notifications</h3>
          <p className="text-sm text-muted-foreground">
            Notifications when shipping quotes are ready for interstate/international orders.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="emailQuoteReady" className="font-normal">
                Email notifications
              </Label>
              <Switch
                id="emailQuoteReady"
                checked={preferences.emailQuoteReady}
                onCheckedChange={() => handleToggle("emailQuoteReady")}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pushQuoteReady" className="font-normal">
                In-app notifications
              </Label>
              <Switch
                id="pushQuoteReady"
                checked={preferences.pushQuoteReady}
                onCheckedChange={() => handleToggle("pushQuoteReady")}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Promotions */}
        <div className="space-y-4">
          <h3 className="font-medium">Promotions & News</h3>
          <p className="text-sm text-muted-foreground">
            Special offers, discounts, and company news.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="emailPromotions" className="font-normal">
                Email notifications
              </Label>
              <Switch
                id="emailPromotions"
                checked={preferences.emailPromotions}
                onCheckedChange={() => handleToggle("emailPromotions")}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pushPromotions" className="font-normal">
                In-app notifications
              </Label>
              <Switch
                id="pushPromotions"
                checked={preferences.pushPromotions}
                onCheckedChange={() => handleToggle("pushPromotions")}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <Button variant="ghost" onClick={handleUnsubscribeAll}>
            Unsubscribe from marketing
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

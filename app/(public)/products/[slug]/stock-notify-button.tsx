"use client";

import { useState } from "react";
import { Bell, BellOff, Loader2, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  subscribeToStockNotification,
  unsubscribeFromStock,
} from "@/server/actions/stock-subscriptions";

interface StockNotifyButtonProps {
  productId: string;
  isSubscribed: boolean;
  userEmail?: string | null;
}

export function StockNotifyButton({
  productId,
  isSubscribed: initialIsSubscribed,
  userEmail,
}: StockNotifyButtonProps) {
  const [isSubscribed, setIsSubscribed] = useState(initialIsSubscribed);
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubscribe = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const emailToUse = userEmail || email;
    
    if (!emailToUse) {
      setStatus("error");
      setMessage("Please enter your email address");
      return;
    }
    
    setStatus("loading");
    
    const result = await subscribeToStockNotification(productId, emailToUse);
    
    if (result.success) {
      setStatus("success");
      setMessage(result.message || "You'll be notified when back in stock!");
      setIsSubscribed(true);
      setTimeout(() => {
        setIsOpen(false);
        setStatus("idle");
      }, 2000);
    } else {
      setStatus("error");
      setMessage(result.error || "Something went wrong");
    }
  };

  const handleUnsubscribe = async () => {
    setStatus("loading");
    
    const result = await unsubscribeFromStock(productId);
    
    if (result.success) {
      setIsSubscribed(false);
      setStatus("idle");
      setIsOpen(false);
    } else {
      setStatus("error");
      setMessage(result.error || "Something went wrong");
    }
  };

  // If logged in and already subscribed, show a simple toggle button
  if (userEmail && isSubscribed) {
    return (
      <Button
        variant="outline"
        size="lg"
        className="w-full h-14 text-muted-foreground"
        onClick={handleUnsubscribe}
        disabled={status === "loading"}
      >
        {status === "loading" ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <BellOff className="mr-2 h-5 w-5" />
        )}
        Notification Set - Click to Cancel
      </Button>
    );
  }

  // Logged in user - can subscribe with one click
  if (userEmail) {
    return (
      <Button
        variant="secondary"
        size="lg"
        className="w-full h-14"
        onClick={() => handleSubscribe()}
        disabled={status === "loading" || status === "success"}
      >
        {status === "loading" ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Subscribing...
          </>
        ) : status === "success" ? (
          <>
            <Check className="mr-2 h-5 w-5" />
            {message}
          </>
        ) : (
          <>
            <Bell className="mr-2 h-5 w-5" />
            Notify Me When Available
          </>
        )}
      </Button>
    );
  }

  // Guest user - needs to enter email
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="lg" className="w-full h-14">
          <Bell className="mr-2 h-5 w-5" />
          Notify Me When Available
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="center">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">Get Stock Alert</h4>
            <p className="text-sm text-muted-foreground">
              Enter your email to be notified when this product is back in stock.
            </p>
          </div>
          
          {status === "success" ? (
            <div className="flex items-center gap-2 py-3 px-4 rounded-lg bg-green-50 text-green-700">
              <Check className="h-5 w-5 shrink-0" />
              <span className="text-sm">{message}</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === "error") {
                      setStatus("idle");
                      setMessage("");
                    }
                  }}
                  className="pl-10"
                  disabled={status === "loading"}
                />
              </div>
              
              {status === "error" && message && (
                <p className="text-sm text-red-600">{message}</p>
              )}
              
              <Button
                type="submit"
                className="w-full"
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subscribing...
                  </>
                ) : (
                  "Notify Me"
                )}
              </Button>
            </form>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

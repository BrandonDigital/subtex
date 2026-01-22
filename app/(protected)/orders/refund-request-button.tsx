"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { requestRefund } from "@/server/actions/refunds";
import { toast } from "sonner";

interface RefundRequestButtonProps {
  orderId: string;
  orderNumber: string;
  maxRefundable: number;
}

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

export function RefundRequestButton({ orderId, orderNumber, maxRefundable }: RefundRequestButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for your refund request");
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestRefund(orderId, reason);
      if (result.success) {
        toast.success("Refund request submitted", {
          description: "We'll review your request and get back to you soon.",
        });
        setOpen(false);
        setReason("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to submit refund request");
      }
    } catch {
      toast.error("Failed to submit refund request");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RotateCcw className="h-4 w-4 mr-2" />
          Request Refund
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a Refund</DialogTitle>
          <DialogDescription>
            Order #{orderNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Maximum refund amount</p>
            <p className="text-lg font-bold">{formatPrice(maxRefundable)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Why would you like a refund?</Label>
            <Textarea
              id="reason"
              placeholder="Please describe your reason for requesting a refund..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Your refund request will be reviewed by our team. We typically process requests within 1-2 business days.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !reason.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

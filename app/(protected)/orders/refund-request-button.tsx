"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
import { toast } from "@/components/ui/toast";

interface OrderItemForRefund {
  id: string;
  name: string;
  partNumber: string | null;
  color: string | null;
  material: string | null;
  size: string | null;
  quantity: number;
  refundedQuantity: number;
  unitPriceInCents: number;
}

interface RefundRequestButtonProps {
  orderId: string;
  orderNumber: string;
  items: OrderItemForRefund[];
}

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

interface SelectedItem {
  orderItemId: string;
  quantity: number;
}

export function RefundRequestButton({
  orderId,
  orderNumber,
  items,
}: RefundRequestButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(
    new Map()
  );

  const refundableItems = items.filter(
    (item) => item.quantity - item.refundedQuantity > 0
  );

  const toggleItem = useCallback(
    (itemId: string, maxQty: number) => {
      setSelectedItems((prev) => {
        const next = new Map(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          next.set(itemId, maxQty);
        }
        return next;
      });
    },
    []
  );

  const updateQuantity = useCallback(
    (itemId: string, qty: number, maxQty: number) => {
      setSelectedItems((prev) => {
        const next = new Map(prev);
        const clamped = Math.max(1, Math.min(qty, maxQty));
        next.set(itemId, clamped);
        return next;
      });
    },
    []
  );

  const totalRefundCents = Array.from(selectedItems.entries()).reduce(
    (sum, [itemId, qty]) => {
      const item = items.find((i) => i.id === itemId);
      return item ? sum + qty * item.unitPriceInCents : sum;
    },
    0
  );

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for your refund request");
      return;
    }

    if (selectedItems.size === 0) {
      toast.error("Please select at least one item to refund");
      return;
    }

    const refundItems: SelectedItem[] = Array.from(
      selectedItems.entries()
    ).map(([orderItemId, quantity]) => ({ orderItemId, quantity }));

    setIsLoading(true);
    try {
      const result = await requestRefund(orderId, reason, refundItems);
      if (result.success) {
        toast.success("Refund request submitted", {
          description: "We'll review your request and get back to you soon.",
        });
        setOpen(false);
        setReason("");
        setSelectedItems(new Map());
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

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setReason("");
      setSelectedItems(new Map());
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RotateCcw className="h-4 w-4 mr-2" />
          Request Refund
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request a Refund</DialogTitle>
          <DialogDescription>
            Order #{orderNumber} &mdash; Select items to refund
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Select items</Label>
            <div className="border rounded-lg divide-y">
              {refundableItems.map((item) => {
                const availableQty = item.quantity - item.refundedQuantity;
                const isSelected = selectedItems.has(item.id);
                const selectedQty = selectedItems.get(item.id) ?? availableQty;

                return (
                  <div key={item.id} className="flex items-start gap-3 p-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleItem(item.id, availableQty)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {item.name}
                      </p>
                      <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground mt-0.5">
                        {item.partNumber && <span>{item.partNumber}</span>}
                        {item.color && <span>{item.color}</span>}
                        {item.material && <span>{item.material}</span>}
                        {item.size && <span>{item.size}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatPrice(item.unitPriceInCents)} each
                        {item.refundedQuantity > 0 && (
                          <span className="ml-1 text-amber-600">
                            ({item.refundedQuantity} already refunded)
                          </span>
                        )}
                      </p>

                      {isSelected && availableQty > 1 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            Qty:
                          </span>
                          <div className="flex items-center border rounded-md">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                updateQuantity(
                                  item.id,
                                  selectedQty - 1,
                                  availableQty
                                )
                              }
                              disabled={selectedQty <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {selectedQty}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                updateQuantity(
                                  item.id,
                                  selectedQty + 1,
                                  availableQty
                                )
                              }
                              disabled={selectedQty >= availableQty}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            of {availableQty}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">
                        {isSelected
                          ? formatPrice(selectedQty * item.unitPriceInCents)
                          : formatPrice(availableQty * item.unitPriceInCents)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedItems.size > 0 && (
            <div className="bg-muted p-3 rounded-lg flex justify-between items-center">
              <span className="text-sm font-medium">Refund total</span>
              <span className="text-lg font-bold">
                {formatPrice(totalRefundCents)}
              </span>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="reason">Why would you like a refund?</Label>
            <Textarea
              id="reason"
              placeholder="Please describe your reason for requesting a refund..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Your refund request will be reviewed by our team. We typically
            process requests within 1-2 business days.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading || !reason.trim() || selectedItems.size === 0
            }
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

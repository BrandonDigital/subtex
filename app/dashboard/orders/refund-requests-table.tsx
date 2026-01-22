"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { approveRefund, rejectRefund } from "@/server/actions/refunds";
import { toast } from "sonner";

interface RefundRequest {
  id: string;
  reason: string;
  requestedAmountInCents: number;
  status: string;
  createdAt: Date;
  order: {
    id: string;
    orderNumber: string;
    totalInCents: number;
    refundedAmountInCents: number;
    stripePaymentIntentId: string | null;
    user: {
      name: string | null;
      email: string;
    };
  };
  user: {
    name: string | null;
    email: string;
  };
}

interface RefundRequestsTableProps {
  requests: RefundRequest[];
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

export function RefundRequestsTable({ requests }: RefundRequestsTableProps) {
  const router = useRouter();
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null);
  const [dialogMode, setDialogMode] = useState<"approve" | "reject" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [approveAmount, setApproveAmount] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const openApproveDialog = (request: RefundRequest) => {
    setSelectedRequest(request);
    setApproveAmount((request.requestedAmountInCents / 100).toFixed(2));
    setAdminNotes("");
    setDialogMode("approve");
  };

  const openRejectDialog = (request: RefundRequest) => {
    setSelectedRequest(request);
    setAdminNotes("");
    setDialogMode("reject");
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    const amountInCents = Math.round(parseFloat(approveAmount) * 100);
    const maxRefundable = selectedRequest.order.totalInCents - selectedRequest.order.refundedAmountInCents;

    if (amountInCents <= 0 || amountInCents > maxRefundable) {
      toast.error(`Amount must be between $0.01 and ${formatPrice(maxRefundable)}`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await approveRefund(selectedRequest.id, amountInCents, adminNotes || undefined);
      if (result.success) {
        toast.success("Refund processed successfully");
        setDialogMode(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to process refund");
      }
    } catch {
      toast.error("Failed to process refund");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !adminNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsLoading(true);
    try {
      const result = await rejectRefund(selectedRequest.id, adminNotes);
      if (result.success) {
        toast.success("Refund request rejected");
        setDialogMode(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to reject refund");
      }
    } catch {
      toast.error("Failed to reject refund");
    } finally {
      setIsLoading(false);
    }
  };

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Check className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-medium">All caught up!</h3>
            <p className="text-muted-foreground">No pending refund requests</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {requests.map((request) => {
          const maxRefundable = request.order.totalInCents - request.order.refundedAmountInCents;
          const hasPaymentIntent = !!request.order.stripePaymentIntentId;

          return (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Order #{request.order.orderNumber}
                    </CardTitle>
                    <CardDescription>
                      Requested by {request.user?.name || request.user?.email} on {formatDate(request.createdAt)}
                    </CardDescription>
                  </div>
                  <Badge variant="destructive">Pending Review</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Order Total</p>
                    <p className="font-medium">{formatPrice(request.order.totalInCents)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Already Refunded</p>
                    <p className="font-medium">{formatPrice(request.order.refundedAmountInCents)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Requested Amount</p>
                    <p className="font-medium text-red-600">{formatPrice(request.requestedAmountInCents)}</p>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Customer&apos;s Reason:</p>
                  <p className="text-sm">{request.reason}</p>
                </div>

                {!hasPaymentIntent && (
                  <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      No Stripe payment found. Manual refund may be required.
                    </p>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => openRejectDialog(request)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => openApproveDialog(request)}
                    disabled={!hasPaymentIntent}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve & Refund
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Approve Dialog */}
      <Dialog open={dialogMode === "approve"} onOpenChange={() => setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Refund</DialogTitle>
            <DialogDescription>
              Process refund for order #{selectedRequest?.order.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Refund Amount (AUD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
              {selectedRequest && (
                <p className="text-xs text-muted-foreground">
                  Maximum refundable: {formatPrice(selectedRequest.order.totalInCents - selectedRequest.order.refundedAmountInCents)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Admin Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Internal notes about this refund..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={dialogMode === "reject"} onOpenChange={() => setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Refund Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this refund request. The customer will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason for Rejection</Label>
              <Textarea
                id="reject-reason"
                placeholder="Explain why this refund cannot be processed..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isLoading || !adminNotes.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

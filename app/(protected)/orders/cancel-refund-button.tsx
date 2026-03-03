"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cancelRefundRequest } from "@/server/actions/refunds";
import { toast } from "@/components/ui/toast";

interface CancelRefundButtonProps {
  requestId: string;
  orderNumber: string;
}

export function CancelRefundButton({
  requestId,
  orderNumber,
}: CancelRefundButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const result = await cancelRefundRequest(requestId);
      if (result.success) {
        toast.success("Refund request cancelled");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to cancel refund request");
      }
    } catch {
      toast.error("Failed to cancel refund request");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <X className="h-4 w-4 mr-2" />
          Cancel Refund
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Refund Request</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel your refund request for order #{orderNumber}? You can always submit a new request later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep Request
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel Refund
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

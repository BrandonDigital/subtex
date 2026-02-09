"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { markAllNotificationsAsRead } from "@/server/actions/notifications";
import { useRouter } from "next/navigation";

export function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleMarkAllRead = () => {
    startTransition(async () => {
      const result = await markAllNotificationsAsRead();
      if (result.success) {
        toast.success("All notifications marked as read");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to mark notifications as read");
      }
    });
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleMarkAllRead}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Check className="h-4 w-4 mr-2" />
      )}
      Mark all read
    </Button>
  );
}

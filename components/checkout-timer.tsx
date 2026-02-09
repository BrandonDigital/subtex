"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Clock, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { releaseUserReservations } from "@/server/actions/reservations";
import { cn } from "@/lib/utils";

interface CheckoutTimerProps {
  expiresAt: Date;
  onExpired?: () => void;
  guestSessionId?: string;
  className?: string;
}

export function CheckoutTimer({
  expiresAt,
  onExpired,
  guestSessionId,
  className,
}: CheckoutTimerProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  // Calculate time left in seconds
  const calculateTimeLeft = useCallback(() => {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = Math.max(0, Math.floor((expiry - now) / 1000));
    return diff;
  }, [expiresAt]);

  // Handle expiration
  const handleExpired = useCallback(async () => {
    if (isExpired) return;
    setIsExpired(true);

    toast.error("Your reservation has expired. Please try again.");

    // Release reservations
    await releaseUserReservations(guestSessionId);

    // Call callback if provided
    if (onExpired) {
      onExpired();
    } else {
      // Default: redirect to cart
      router.push("/?expired=true");
    }
  }, [isExpired, guestSessionId, onExpired, router]);

  useEffect(() => {
    // Initial calculation
    const initial = calculateTimeLeft();
    setTimeLeft(initial);

    if (initial <= 0) {
      handleExpired();
      return;
    }

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      // Show warning at 1 minute
      if (remaining === 60) {
        toast.warning("Only 1 minute left to complete checkout!");
      }

      // Show warning at 30 seconds
      if (remaining === 30) {
        toast.warning("30 seconds remaining!");
      }

      if (remaining <= 0) {
        clearInterval(interval);
        handleExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateTimeLeft, handleExpired]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Determine urgency level
  const isUrgent = timeLeft <= 60;
  const isCritical = timeLeft <= 30;

  if (isExpired) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
        isCritical
          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 animate-pulse"
          : isUrgent
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
          : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        className
      )}
    >
      {isCritical ? (
        <AlertTriangle className='h-4 w-4' />
      ) : (
        <Clock className='h-4 w-4' />
      )}
      <span>
        {isCritical
          ? `Hurry! ${formatTime(timeLeft)} remaining`
          : isUrgent
          ? `Complete checkout in ${formatTime(timeLeft)}`
          : `Items reserved for ${formatTime(timeLeft)}`}
      </span>
    </div>
  );
}

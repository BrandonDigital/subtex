"use client";

import { Bell, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackorderNoticeProps {
  availableStock: number;
  requestedQuantity: number;
  className?: string;
  variant?: "default" | "compact";
}

export function BackorderNotice({
  availableStock,
  requestedQuantity,
  className,
  variant = "default",
}: BackorderNoticeProps) {
  // Only show if requested quantity exceeds available stock
  if (requestedQuantity <= availableStock || availableStock <= 0) {
    return null;
  }

  const backorderQuantity = requestedQuantity - availableStock;

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs",
          className
        )}
      >
        <Bell className='h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5' />
        <p className='text-amber-800 dark:text-amber-200'>
          <span className='font-medium'>{availableStock}</span> available now,{" "}
          <span className='font-medium'>{backorderQuantity}</span> on backorder
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800",
        className
      )}
    >
      <div className='h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0'>
        <Package className='h-4 w-4 text-amber-600 dark:text-amber-400' />
      </div>
      <div className='space-y-1'>
        <p className='text-sm font-medium text-amber-800 dark:text-amber-200'>
          Partial backorder
        </p>
        <p className='text-sm text-amber-700 dark:text-amber-300'>
          <span className='font-semibold'>{availableStock}</span>{" "}
          {availableStock === 1 ? "sheet is" : "sheets are"} available and will
          ship immediately. The remaining{" "}
          <span className='font-semibold'>{backorderQuantity}</span>{" "}
          {backorderQuantity === 1 ? "sheet" : "sheets"} will be ordered and you
          will be notified once{" "}
          {backorderQuantity === 1 ? "it becomes" : "they become"} available.
        </p>
        <div className='flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-2'>
          <Bell className='h-3.5 w-3.5' />
          <span>We&apos;ll email you when your backorder is ready</span>
        </div>
      </div>
    </div>
  );
}

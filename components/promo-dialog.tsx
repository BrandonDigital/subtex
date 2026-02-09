"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Gift, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PROMO_DISMISSED_KEY = "subtex_promo_dismissed";
const PROMO_TRIGGER_EVENT = "promo-scroll-trigger";
const PROMO_DISMISSED_EVENT = "promo-dismissed";

interface PromoDialogProps {
  className?: string;
}

// Shared dialog content component
function PromoDialogContent({ onClose }: { onClose: () => void }) {
  return (
    <>
      {/* Close button */}
      <button
        onClick={onClose}
        className='absolute top-3 right-3 z-10 rounded-full bg-white/90 p-1.5 shadow-md transition-colors hover:bg-white'
      >
        <X className='h-4 w-4 text-gray-600' />
        <span className='sr-only'>Close</span>
      </button>

      {/* Promo Image */}
      <div className='relative aspect-video w-full bg-gray-100 max-h-48 sm:max-h-56'>
        <Image
          src='/Subtex_ACM_Stack.png'
          alt='ACM Sheets Stack'
          fill
          className='object-cover'
          priority
        />
      </div>

      {/* Content */}
      <div className='px-6 py-6 text-center'>
        <h2 className='text-3xl font-serif font-normal text-gray-900 mb-6'>
          Buy More Save More
        </h2>

        <div className='space-y-4 text-gray-600'>
          <p>
            Spend $700 or more get 5% off - Coupon Code{" "}
            <span className='font-bold text-gray-900'>5off700</span>
          </p>

          <p>
            Spend $1500 or more and get 10% off - Coupon code{" "}
            <span className='font-bold text-gray-900'>10off1500</span>
          </p>

          <p>
            Spend $3500 or more and get 15% off - Coupon code{" "}
            <span className='font-bold text-gray-900'>15off3500</span>
          </p>
        </div>

        <p className='mt-6 text-sm text-gray-500'>Use code at checkout</p>
      </div>
    </>
  );
}

// Sentinel component to place inside the scrollable content area
// Place this component where you want to trigger the promo (e.g., after hero section)
export function PromoScrollSentinel() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem(PROMO_DISMISSED_KEY);
    if (dismissed) {
      hasTriggeredRef.current = true;
      return;
    }

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // When sentinel goes out of view (user scrolled past it)
        if (!entries[0].isIntersecting && !hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          // Dispatch event to trigger the promo dialog
          window.dispatchEvent(new CustomEvent(PROMO_TRIGGER_EVENT));
        }
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={sentinelRef}
      className='w-full h-1 pointer-events-none'
      aria-hidden='true'
    />
  );
}

// Main dialog component - place this in your layout
export function PromoDialog({ className }: PromoDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Listen for scroll trigger event from sentinel
  useEffect(() => {
    const handleTrigger = () => {
      // Double-check localStorage
      const dismissed = localStorage.getItem(PROMO_DISMISSED_KEY);
      if (!dismissed) {
        setIsOpen(true);
      }
    };

    window.addEventListener(PROMO_TRIGGER_EVENT, handleTrigger);
    return () => window.removeEventListener(PROMO_TRIGGER_EVENT, handleTrigger);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(PROMO_DISMISSED_KEY, new Date().toISOString());
    // Dispatch custom event so footer banner can show
    window.dispatchEvent(new CustomEvent(PROMO_DISMISSED_EVENT));
  }, []);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleDismiss();
        else setIsOpen(true);
      }}
    >
      <DialogContent
        className={cn(
          "max-w-md p-0 overflow-hidden rounded-xl border-0 shadow-2xl",
          className
        )}
        showCloseButton={false}
      >
        <DialogTitle className='sr-only'>
          Buy More Save More Promotion
        </DialogTitle>
        <PromoDialogContent onClose={handleDismiss} />
      </DialogContent>
    </Dialog>
  );
}

// Banner component to place above footer
export function PromoFooterBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    // Check if promo was previously dismissed
    const checkDismissed = () => {
      const dismissed = localStorage.getItem(PROMO_DISMISSED_KEY);
      if (dismissed) {
        setIsVisible(true);
      }
    };

    // Check on mount
    checkDismissed();

    // Listen for custom event when promo is dismissed
    const handlePromoDismissed = () => {
      setIsVisible(true);
    };

    window.addEventListener(PROMO_DISMISSED_EVENT, handlePromoDismissed);
    window.addEventListener("storage", checkDismissed);

    return () => {
      window.removeEventListener(PROMO_DISMISSED_EVENT, handlePromoDismissed);
      window.removeEventListener("storage", checkDismissed);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      {/* Banner above footer */}
      <div
        className='bg-black cursor-pointer transition-transform hover:brightness-125'
        onClick={() => setDialogOpen(true)}
      >
        <div className='container mx-auto px-4 py-4'>
          <div className='flex items-center justify-center gap-3 text-white'>
            <Gift className='h-5 w-5 shrink-0' />
            <span className='font-medium text-center'>
              We have a gift for you! Click here to see our special discount
              codes
            </span>
            <Gift className='h-5 w-5 shrink-0 hidden sm:block' />
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className='max-w-md p-0 overflow-hidden rounded-xl border-0 shadow-2xl'
          showCloseButton={false}
        >
          <DialogTitle className='sr-only'>
            Buy More Save More Promotion
          </DialogTitle>
          <PromoDialogContent onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

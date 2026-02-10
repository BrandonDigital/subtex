"use client";

import { useState, useMemo, useCallback } from "react";
import {
  CalendarDays,
  Clock,
  Package,
  User,
  Phone,
  Mail,
  Building2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  PackageCheck,
  PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Signature from "@/components/ui/signature";
import {
  markOrderPacking,
  markOrderCollected,
} from "@/server/actions/orders";
import { toast } from "@/components/ui/toast";

// Types based on what getAppointments returns
interface AppointmentUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
}

interface OrderItem {
  id: string;
  name: string;
  partNumber: string | null;
  color: string | null;
  material: string | null;
  size: string | null;
  quantity: number;
  unitPriceInCents: number;
  totalInCents: number;
}

interface Appointment {
  id: string;
  orderNumber: string;
  status: string;
  collectionDate: string | null;
  collectionSlot: string | null;
  hasBackorderItems: boolean | null;
  totalInCents: number;
  subtotalInCents: number;
  customerNotes: string | null;
  senderSignature: string | null;
  receiverSignature: string | null;
  signedAt: Date | null;
  createdAt: Date;
  user: AppointmentUser | null;
  // Guest checkout fields
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  items: OrderItem[];
}

interface AppointmentsPageClientProps {
  scheduled: Appointment[];
  backorder: Appointment[];
  recentlyCollected: Appointment[];
  todayKey: string;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getSlotLabel(slot: string): string {
  return slot === "morning" ? "8:00 AM – 11:30 AM" : "1:00 PM – 3:30 PM";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "paid":
      return (
        <Badge variant='outline' className='bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'>
          Needs Packing
        </Badge>
      );
    case "processing":
      return (
        <Badge variant='outline' className='bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'>
          Packing
        </Badge>
      );
    case "collected":
      return (
        <Badge variant='outline' className='bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800'>
          Collected
        </Badge>
      );
    default:
      return <Badge variant='outline'>{status}</Badge>;
  }
}

type DateFilter = "today" | "tomorrow" | "week" | "all";

export function AppointmentsPageClient({
  scheduled,
  backorder,
  recentlyCollected,
  todayKey,
}: AppointmentsPageClientProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>(
    {}
  );

  // Signature dialog state
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signatureOrderId, setSignatureOrderId] = useState<string | null>(null);
  const [signatureOrderNumber, setSignatureOrderNumber] = useState("");
  const [senderSignature, setSenderSignature] = useState<string | null>(null);
  const [receiverSignature, setReceiverSignature] = useState<string | null>(
    null
  );
  const [signatureSubmitting, setSignatureSubmitting] = useState(false);

  // View signatures dialog state (for already-collected orders)
  const [viewSignaturesOpen, setViewSignaturesOpen] = useState(false);
  const [viewSignaturesOrder, setViewSignaturesOrder] =
    useState<Appointment | null>(null);

  // Compute tomorrow key
  const tomorrowKey = useMemo(() => {
    const [y, m, d] = todayKey.split("-").map(Number);
    const tomorrow = new Date(y, m - 1, d);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${tomorrow.getFullYear()}-${String(
      tomorrow.getMonth() + 1
    ).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  }, [todayKey]);

  // Compute end of week key (7 days from today)
  const weekEndKey = useMemo(() => {
    const [y, m, d] = todayKey.split("-").map(Number);
    const end = new Date(y, m - 1, d);
    end.setDate(end.getDate() + 7);
    return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(end.getDate()).padStart(2, "0")}`;
  }, [todayKey]);

  // Filter scheduled appointments by date range
  const filteredScheduled = useMemo(() => {
    return scheduled.filter((order) => {
      const date = order.collectionDate || "";
      switch (dateFilter) {
        case "today":
          return date === todayKey;
        case "tomorrow":
          return date === tomorrowKey;
        case "week":
          return date >= todayKey && date <= weekEndKey;
        case "all":
          return date >= todayKey;
      }
    });
  }, [scheduled, dateFilter, todayKey, tomorrowKey, weekEndKey]);

  // Group by date, then by slot
  const groupedByDate = useMemo(() => {
    const groups: Record<
      string,
      { morning: Appointment[]; afternoon: Appointment[] }
    > = {};

    filteredScheduled.forEach((order) => {
      const date = order.collectionDate!;
      if (!groups[date]) {
        groups[date] = { morning: [], afternoon: [] };
      }
      const slot = order.collectionSlot === "morning" ? "morning" : "afternoon";
      groups[date][slot].push(order);
    });

    // Sort dates
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredScheduled]);

  // Counts for filter badges
  const todayCount = scheduled.filter(
    (o) => o.collectionDate === todayKey
  ).length;
  const tomorrowCount = scheduled.filter(
    (o) => o.collectionDate === tomorrowKey
  ).length;
  const weekCount = scheduled.filter(
    (o) =>
      o.collectionDate &&
      o.collectionDate >= todayKey &&
      o.collectionDate <= weekEndKey
  ).length;

  const handleMarkPacking = async (orderId: string) => {
    setLoadingActions((prev) => ({ ...prev, [orderId]: true }));
    try {
      await markOrderPacking(orderId);
      toast.success("Order marked as packing");
    } catch {
      toast.error("Failed to update order");
    } finally {
      setLoadingActions((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const openSignatureDialog = useCallback(
    (orderId: string, orderNumber: string) => {
      setSignatureOrderId(orderId);
      setSignatureOrderNumber(orderNumber);
      setSenderSignature(null);
      setReceiverSignature(null);
      setSignatureDialogOpen(true);
    },
    []
  );

  const handleSignatureSubmit = async () => {
    if (!signatureOrderId || !senderSignature || !receiverSignature) return;

    setSignatureSubmitting(true);
    try {
      await markOrderCollected(signatureOrderId, {
        senderSignature,
        receiverSignature,
      });
      toast.success("Order marked as collected with signatures");
      setSignatureDialogOpen(false);
      setSignatureOrderId(null);
    } catch {
      toast.error("Failed to update order");
    } finally {
      setSignatureSubmitting(false);
    }
  };

  const openViewSignatures = useCallback((order: Appointment) => {
    setViewSignaturesOrder(order);
    setViewSignaturesOpen(true);
  }, []);

  return (
    <div className='space-y-6'>
      {/* Summary cards */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-muted-foreground'>Today</p>
                <p className='text-3xl font-bold'>{todayCount}</p>
              </div>
              <CalendarDays className='h-8 w-8 text-muted-foreground' />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-muted-foreground'>This Week</p>
                <p className='text-3xl font-bold'>{weekCount}</p>
              </div>
              <Clock className='h-8 w-8 text-muted-foreground' />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-muted-foreground'>
                  Pending Timeslot
                </p>
                <p className='text-3xl font-bold'>{backorder.length}</p>
              </div>
              <AlertTriangle className='h-8 w-8 text-amber-500' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date filter */}
      <div className='flex flex-wrap gap-2'>
        {(
          [
            { key: "today", label: "Today", count: todayCount },
            { key: "tomorrow", label: "Tomorrow", count: tomorrowCount },
            { key: "week", label: "This Week", count: weekCount },
            { key: "all", label: "All Upcoming", count: scheduled.filter((o) => o.collectionDate && o.collectionDate >= todayKey).length },
          ] as const
        ).map(({ key, label, count }) => (
          <Button
            key={key}
            variant={dateFilter === key ? "default" : "outline"}
            size='sm'
            onClick={() => setDateFilter(key)}
          >
            {label}
            {count > 0 && (
              <Badge
                variant={dateFilter === key ? "secondary" : "outline"}
                className='ml-2 h-5 min-w-[20px] flex items-center justify-center text-xs'
              >
                {count}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Scheduled appointments grouped by date */}
      {groupedByDate.length === 0 && (
        <Card>
          <CardContent className='py-12 text-center'>
            <CalendarDays className='h-12 w-12 mx-auto text-muted-foreground mb-4' />
            <p className='text-lg font-medium'>No appointments</p>
            <p className='text-sm text-muted-foreground mt-1'>
              No scheduled collections for this period.
            </p>
          </CardContent>
        </Card>
      )}

      {groupedByDate.map(([dateKey, slots]) => (
        <Card key={dateKey}>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <CalendarDays className='h-5 w-5' />
              {formatDate(dateKey)}
              {dateKey === todayKey && (
                <Badge className='bg-foreground text-background'>Today</Badge>
              )}
              {dateKey === tomorrowKey && (
                <Badge variant='outline'>Tomorrow</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-6'>
            {/* Morning slot */}
            {slots.morning.length > 0 && (
              <div className='space-y-3'>
                <div className='flex items-center gap-2 text-sm font-medium text-muted-foreground'>
                  <Clock className='h-4 w-4' />
                  Morning &mdash; 8:00 AM – 11:30 AM
                  <Badge variant='outline' className='ml-auto'>
                    {slots.morning.length}
                  </Badge>
                </div>
                <div className='space-y-3'>
                  {slots.morning.map((order) => (
                    <AppointmentCard
                      key={order.id}
                      order={order}
                      isLoading={!!loadingActions[order.id]}
                      onMarkPacking={() => handleMarkPacking(order.id)}
                      onMarkCollected={() =>
                        openSignatureDialog(order.id, order.orderNumber)
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {slots.morning.length > 0 && slots.afternoon.length > 0 && (
              <Separator />
            )}

            {/* Afternoon slot */}
            {slots.afternoon.length > 0 && (
              <div className='space-y-3'>
                <div className='flex items-center gap-2 text-sm font-medium text-muted-foreground'>
                  <Clock className='h-4 w-4' />
                  Afternoon &mdash; 1:00 PM – 3:30 PM
                  <Badge variant='outline' className='ml-auto'>
                    {slots.afternoon.length}
                  </Badge>
                </div>
                <div className='space-y-3'>
                  {slots.afternoon.map((order) => (
                    <AppointmentCard
                      key={order.id}
                      order={order}
                      isLoading={!!loadingActions[order.id]}
                      onMarkPacking={() => handleMarkPacking(order.id)}
                      onMarkCollected={() =>
                        openSignatureDialog(order.id, order.orderNumber)
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Backorder / Pending Timeslot section */}
      {backorder.length > 0 && (
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <AlertTriangle className='h-5 w-5 text-amber-500' />
              Pending Timeslot
              <Badge variant='outline' className='ml-auto'>
                {backorder.length}
              </Badge>
            </CardTitle>
            <p className='text-sm text-muted-foreground'>
              Orders with backordered items awaiting stock before a collection
              timeslot can be booked.
            </p>
          </CardHeader>
          <CardContent className='space-y-3'>
            {backorder.map((order) => (
              <AppointmentCard
                key={order.id}
                order={order}
                isLoading={!!loadingActions[order.id]}
                onMarkPacking={() => handleMarkPacking(order.id)}
                onMarkCollected={() =>
                  openSignatureDialog(order.id, order.orderNumber)
                }
                isBackorder
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recently collected */}
      {recentlyCollected.length > 0 && (
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 text-lg text-muted-foreground'>
              <CheckCircle2 className='h-5 w-5 text-green-500' />
              Recently Collected
              <Badge variant='outline' className='ml-auto'>
                {recentlyCollected.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {recentlyCollected.map((order) => (
              <AppointmentCard
                key={order.id}
                order={order}
                isLoading={false}
                onMarkPacking={() => {}}
                onMarkCollected={() => {}}
                onViewSignatures={() => openViewSignatures(order)}
                isCompleted
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Signature Collection Dialog */}
      <Dialog
        open={signatureDialogOpen}
        onOpenChange={(open) => {
          if (!signatureSubmitting) {
            setSignatureDialogOpen(open);
          }
        }}
      >
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <PenLine className='h-5 w-5' />
              Sign Off Collection — #{signatureOrderNumber}
            </DialogTitle>
            <DialogDescription>
              Both the warehouse staff (sender) and the customer (receiver) must
              sign below to confirm the order handover.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-6 py-2'>
            {/* Sender (warehouse) signature */}
            <Signature
              label='Sender (Warehouse Staff)'
              height={140}
              onChange={setSenderSignature}
            />

            <Separator />

            {/* Receiver (customer) signature */}
            <Signature
              label='Receiver (Customer)'
              height={140}
              onChange={setReceiverSignature}
            />
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setSignatureDialogOpen(false)}
              disabled={signatureSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSignatureSubmit}
              disabled={
                !senderSignature || !receiverSignature || signatureSubmitting
              }
            >
              {signatureSubmitting ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <PackageCheck className='mr-2 h-4 w-4' />
              )}
              Confirm Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Signatures Dialog */}
      <Dialog open={viewSignaturesOpen} onOpenChange={setViewSignaturesOpen}>
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <PenLine className='h-5 w-5' />
              Signatures — #{viewSignaturesOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              {viewSignaturesOrder?.signedAt
                ? `Signed on ${new Date(
                    viewSignaturesOrder.signedAt
                  ).toLocaleDateString("en-AU", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}`
                : "No signatures recorded for this order."}
            </DialogDescription>
          </DialogHeader>

          {viewSignaturesOrder?.senderSignature &&
          viewSignaturesOrder?.receiverSignature ? (
            <div className='space-y-6 py-2'>
              <div>
                <p className='text-sm text-muted-foreground mb-2'>
                  Sender (Warehouse Staff)
                </p>
                <div className='border rounded-md bg-white overflow-hidden'>
                  <img
                    src={viewSignaturesOrder.senderSignature}
                    alt='Sender signature'
                    className='w-full h-[140px] object-contain'
                  />
                </div>
              </div>
              <Separator />
              <div>
                <p className='text-sm text-muted-foreground mb-2'>
                  Receiver (Customer)
                </p>
                <div className='border rounded-md bg-white overflow-hidden'>
                  <img
                    src={viewSignaturesOrder.receiverSignature}
                    alt='Receiver signature'
                    className='w-full h-[140px] object-contain'
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className='py-8 text-center text-muted-foreground'>
              <PenLine className='h-8 w-8 mx-auto mb-2 opacity-50' />
              <p>No signatures were captured for this order.</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setViewSignaturesOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Individual appointment card
function AppointmentCard({
  order,
  isLoading,
  onMarkPacking,
  onMarkCollected,
  onViewSignatures,
  isBackorder = false,
  isCompleted = false,
}: {
  order: Appointment;
  isLoading: boolean;
  onMarkPacking: () => void;
  onMarkCollected: () => void;
  onViewSignatures?: () => void;
  isBackorder?: boolean;
  isCompleted?: boolean;
}) {
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className={`p-4 border rounded-lg space-y-3 ${
        isCompleted ? "opacity-60" : ""
      }`}
    >
      {/* Header row */}
      <div className='flex items-start justify-between gap-4'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <span className='font-mono font-bold text-sm'>
              #{order.orderNumber}
            </span>
            {getStatusBadge(order.status)}
            {isBackorder && (
              <Badge
                variant='outline'
                className='bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
              >
                Backorder
              </Badge>
            )}
          </div>

          {/* Customer info */}
          <div className='mt-2 space-y-1'>
            <div className='flex items-center gap-2 text-sm'>
              <User className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
              <span className='font-medium'>
                {order.user?.name || order.guestName || "Guest"}
              </span>
              {order.user?.company && (
                <span className='text-muted-foreground flex items-center gap-1'>
                  <Building2 className='h-3 w-3' />
                  {order.user.company}
                </span>
              )}
            </div>
            {(order.user?.phone || order.guestPhone) && (
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Phone className='h-3.5 w-3.5 shrink-0' />
                <a
                  href={`tel:${order.user?.phone || order.guestPhone}`}
                  className='hover:underline'
                >
                  {order.user?.phone || order.guestPhone}
                </a>
              </div>
            )}
            {(order.user?.email || order.guestEmail) && (
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Mail className='h-3.5 w-3.5 shrink-0' />
                <a
                  href={`mailto:${order.user?.email || order.guestEmail}`}
                  className='hover:underline truncate'
                >
                  {order.user?.email || order.guestEmail}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {!isCompleted && (
          <div className='flex flex-col gap-2 shrink-0'>
            {order.status === "paid" && (
              <Button
                size='sm'
                onClick={onMarkPacking}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <>
                    <Package className='mr-1.5 h-3.5 w-3.5' />
                    Pack Order
                  </>
                )}
              </Button>
            )}
            {order.status === "processing" && (
              <Button
                size='sm'
                variant='outline'
                onClick={onMarkCollected}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <>
                    <PenLine className='mr-1.5 h-3.5 w-3.5' />
                    Sign & Collect
                  </>
                )}
              </Button>
            )}
          </div>
        )}
        {isCompleted && onViewSignatures && (
          <div className='flex flex-col gap-2 shrink-0'>
            <Button
              size='sm'
              variant='ghost'
              onClick={onViewSignatures}
              className='text-muted-foreground'
            >
              <PenLine className='mr-1.5 h-3.5 w-3.5' />
              {order.senderSignature ? "View Signatures" : "No Signatures"}
            </Button>
          </div>
        )}
      </div>

      {/* Items to pack */}
      <div className='bg-muted/50 rounded-md p-3'>
        <p className='text-xs font-medium text-muted-foreground mb-2'>
          Items to pack ({totalItems} {totalItems === 1 ? "sheet" : "sheets"})
        </p>
        <div className='space-y-1'>
          {order.items.map((item) => (
            <div
              key={item.id}
              className='flex items-center justify-between text-sm'
            >
              <div className='flex items-center gap-2 min-w-0'>
                <span className='font-medium truncate'>{item.name}</span>
                {item.color && item.color !== "default" && (
                  <span className='text-xs text-muted-foreground capitalize'>
                    {item.color}
                  </span>
                )}
                {item.partNumber && (
                  <span className='text-xs text-muted-foreground font-mono'>
                    {item.partNumber}
                  </span>
                )}
              </div>
              <span className='text-muted-foreground shrink-0 ml-2'>
                &times;{item.quantity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: total + notes */}
      <div className='flex items-center justify-between text-sm'>
        <span className='font-medium'>{formatPrice(order.totalInCents)}</span>
        {order.customerNotes && (
          <span className='text-xs text-muted-foreground truncate ml-4'>
            Note: {order.customerNotes}
          </span>
        )}
        {isCompleted && order.collectionDate && (
          <span className='text-xs text-muted-foreground'>
            {formatShortDate(order.collectionDate)}
            {order.collectionSlot &&
              ` · ${
                order.collectionSlot === "morning" ? "Morning" : "Afternoon"
              }`}
          </span>
        )}
      </div>
    </div>
  );
}

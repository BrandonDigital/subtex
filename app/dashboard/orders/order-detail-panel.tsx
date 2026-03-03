"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Package,
  Truck,
  User,
  CreditCard,
  Clock,
  MessageSquare,
  Pencil,
  Trash2,
  Check,
  X,
  Scissors,
  MapPin,
  ShieldCheck,
  CircleAlert,
  CircleCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  updateOrderStatus,
  updateOrderDetails,
  updateOrderItem,
  deleteOrderItem,
  getOrderById,
  verifyStripePayment,
} from "@/server/actions/orders";
import { toast } from "@/components/ui/toast";

interface OrderDetailData {
  id: string;
  orderNumber: string;
  status: string;
  deliveryMethod: string;
  subtotalInCents: number;
  discountInCents: number;
  discountCodeSnapshot: string | null;
  deliveryFeeInCents: number;
  holdingFeeInCents: number;
  totalInCents: number;
  refundedAmountInCents: number;
  stripePaymentIntentId: string | null;
  paidAt: Date | null;
  customerNotes: string | null;
  adminNotes: string | null;
  collectionDate: string | null;
  collectionSlot: string | null;
  deliveryAddressSnapshot: string | null;
  createdAt: Date;
  updatedAt: Date;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    company: string | null;
  } | null;
  items: {
    id: string;
    productId: string;
    partNumber: string | null;
    name: string;
    color: string | null;
    material: string | null;
    size: string | null;
    quantity: number;
    unitPriceInCents: number;
    discountPercent: number;
    totalInCents: number;
    refundedQuantity: number;
    cuttingSpec: string | null;
    product: {
      id: string;
      name: string;
      imageUrl: string | null;
    } | null;
  }[];
  statusHistory: {
    id: string;
    status: string;
    note: string | null;
    createdAt: Date;
    changedByUser: { name: string | null; email: string } | null;
  }[];
  refundRequests: {
    id: string;
    status: string;
    reason: string;
    requestedAmountInCents: number;
    approvedAmountInCents: number | null;
    createdAt: Date;
    items?: {
      id: string;
      quantity: number;
      amountInCents: number;
      orderItem: { name: string; partNumber: string | null };
    }[];
  }[];
  deliveryAddress: {
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    address: string;
    unit: string | null;
    city: string;
    state: string;
    postalCode: string;
  } | null;
}

interface OrderDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
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

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pending", variant: "secondary" },
  paid: { label: "Paid", variant: "default" },
  processing: { label: "Processing", variant: "default" },
  shipped: { label: "Shipped", variant: "default" },
  delivered: { label: "Delivered", variant: "outline" },
  collected: { label: "Collected", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  refund_requested: { label: "Refund Requested", variant: "destructive" },
  refunded: { label: "Refunded", variant: "secondary" },
};

const deliveryLabels: Record<string, string> = {
  click_collect: "Click & Collect",
  local_delivery: "Local Delivery",
  interstate: "Interstate",
  international: "International",
};

export function OrderDetailPanel({
  isOpen,
  onClose,
  orderId,
}: OrderDetailPanelProps) {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [order, setOrder] = useState<OrderDetailData | null>(null);

  // Edit states
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editItemData, setEditItemData] = useState<{
    quantity: number;
    unitPriceInCents: number;
  } | null>(null);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  // Order detail editing
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [adminNotesEdit, setAdminNotesEdit] = useState("");
  const [customerNotesEdit, setCustomerNotesEdit] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Status change
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Payment verification
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    stripeStatus?: string;
    amountCharged?: number;
    amountReceived?: number;
    currency?: string;
    stripeFee?: number;
    netAmount?: number;
    chargeId?: string | null;
    orderTotalInCents?: number;
    message?: string;
    error?: string;
  } | null>(null);

  const loadOrder = useCallback(async (id: string) => {
    setIsLoadingOrder(true);
    try {
      const data = await getOrderById(id);
      setOrder(data as OrderDetailData | null);
    } catch {
      toast.error("Failed to load order details");
    } finally {
      setIsLoadingOrder(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && orderId) {
      setIsVisible(true);
      setIsClosing(false);
      loadOrder(orderId);
    }
  }, [isOpen, orderId, loadOrder]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setOrder(null);
      setEditingItem(null);
      setEditItemData(null);
      setIsEditingNotes(false);
      setVerifyResult(null);
      onClose();
    }, 300);
  }, [onClose]);

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    setIsChangingStatus(true);
    try {
      await updateOrderStatus(order.id, newStatus as any);
      toast.success("Order status updated");
      await loadOrder(order.id);
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!order) return;
    setIsVerifyingPayment(true);
    setVerifyResult(null);
    try {
      const result = await verifyStripePayment(order.id);
      if (result.success) {
        setVerifyResult({
          stripeStatus: result.stripeStatus,
          amountReceived: "amountReceived" in result ? result.amountReceived : undefined,
          message: result.message,
        });
        if (!result.alreadyPaid && result.stripeStatus === "succeeded") {
          toast.success("Payment verified — order updated to paid");
          await loadOrder(order.id);
          router.refresh();
        }
      } else {
        setVerifyResult({ error: result.error });
        toast.error(result.error || "Failed to verify payment");
      }
    } catch {
      setVerifyResult({ error: "Failed to verify payment" });
      toast.error("Failed to verify payment");
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  const handleStartEditItem = (item: OrderDetailData["items"][0]) => {
    setEditingItem(item.id);
    setEditItemData({
      quantity: item.quantity,
      unitPriceInCents: item.unitPriceInCents,
    });
  };

  const handleCancelEditItem = () => {
    setEditingItem(null);
    setEditItemData(null);
  };

  const handleSaveItem = async () => {
    if (!editingItem || !editItemData) return;
    setIsSavingItem(true);
    try {
      const result = await updateOrderItem(editingItem, {
        quantity: editItemData.quantity,
        unitPriceInCents: editItemData.unitPriceInCents,
      });
      if (result.success) {
        toast.success("Item updated");
        await loadOrder(order!.id);
        router.refresh();
        setEditingItem(null);
        setEditItemData(null);
      } else {
        toast.error(result.error || "Failed to update item");
      }
    } catch {
      toast.error("Failed to update item");
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItemId || !order) return;
    try {
      const result = await deleteOrderItem(deleteItemId);
      if (result.success) {
        toast.success("Item removed");
        await loadOrder(order.id);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to remove item");
      }
    } catch {
      toast.error("Failed to remove item");
    } finally {
      setDeleteItemId(null);
    }
  };

  const handleStartEditNotes = () => {
    setAdminNotesEdit(order?.adminNotes || "");
    setCustomerNotesEdit(order?.customerNotes || "");
    setIsEditingNotes(true);
  };

  const handleSaveNotes = async () => {
    if (!order) return;
    setIsSavingNotes(true);
    try {
      const result = await updateOrderDetails(order.id, {
        adminNotes: adminNotesEdit || null,
        customerNotes: customerNotesEdit || null,
      });
      if (result.success) {
        toast.success("Notes updated");
        await loadOrder(order.id);
        setIsEditingNotes(false);
      } else {
        toast.error(result.error || "Failed to update notes");
      }
    } catch {
      toast.error("Failed to update notes");
    } finally {
      setIsSavingNotes(false);
    }
  };

  if (!isVisible) return null;

  const parseCuttingSpec = (spec: string | null) => {
    if (!spec) return null;
    try {
      return JSON.parse(spec) as { cutType: string; xCutMm: number; yCutMm: number };
    } catch {
      return null;
    }
  };

  const parseAddressSnapshot = (snapshot: string | null) => {
    if (!snapshot) return null;
    try {
      return JSON.parse(snapshot) as {
        firstName?: string;
        lastName?: string;
        company?: string;
        address?: string;
        unit?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        phone?: string;
      };
    } catch {
      return null;
    }
  };

  return (
    <>
      <div
        className={`fixed top-16 bottom-0 left-0 right-0 z-40 bg-background transition-transform duration-300 ease-in-out ${
          isClosing ? "translate-x-full" : "translate-x-0"
        } ${!isClosing && isOpen ? "animate-in slide-in-from-right" : ""}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b bg-background">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">
                  {order ? `Order #${order.orderNumber}` : "Order Details"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  View and manage order details
                </p>
              </div>
            </div>
            {order && (
              <Badge
                variant={statusConfig[order.status]?.variant || "secondary"}
                className="text-sm px-3 py-1"
              >
                {statusConfig[order.status]?.label || order.status}
              </Badge>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {isLoadingOrder ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !order ? (
              <div className="text-center py-24 text-muted-foreground">
                Order not found
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Status + Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock className="h-4 w-4" />
                      Status & Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">
                          Current Status
                        </p>
                        <Badge
                          variant={statusConfig[order.status]?.variant || "secondary"}
                          className="text-sm"
                        >
                          {statusConfig[order.status]?.label || order.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Select
                          value={order.status}
                          onValueChange={handleStatusChange}
                          disabled={isChangingStatus}
                        >
                          <SelectTrigger className="w-[180px]">
                            {isChangingStatus ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SelectValue placeholder="Change Status" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="collected">Collected</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="h-4 w-4" />
                      Customer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">
                          {order.user?.name || order.guestName || "Guest"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">
                          {order.user?.email || order.guestEmail || "—"}
                        </p>
                      </div>
                      {(order.user?.phone || order.guestPhone) && (
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">
                            {order.user?.phone || order.guestPhone}
                          </p>
                        </div>
                      )}
                      {order.user?.company && (
                        <div>
                          <p className="text-sm text-muted-foreground">Company</p>
                          <p className="font-medium">{order.user.company}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Delivery Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Truck className="h-4 w-4" />
                      Delivery
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Method</p>
                        <p className="font-medium">
                          {deliveryLabels[order.deliveryMethod] || order.deliveryMethod}
                        </p>
                      </div>
                      {order.deliveryFeeInCents > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Delivery Fee
                          </p>
                          <p className="font-medium">
                            {formatPrice(order.deliveryFeeInCents)}
                          </p>
                        </div>
                      )}
                      {order.collectionDate && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Collection Date
                          </p>
                          <p className="font-medium">
                            {order.collectionDate}
                            {order.collectionSlot && ` (${order.collectionSlot})`}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Delivery Address */}
                    {(() => {
                      const addr =
                        order.deliveryAddress ||
                        parseAddressSnapshot(order.deliveryAddressSnapshot);
                      if (!addr) return null;
                      return (
                        <div className="pt-2">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Delivery Address
                            </p>
                          </div>
                          <div className="bg-muted rounded-lg p-3 text-sm">
                            {addr.company && <p>{addr.company}</p>}
                            <p>
                              {"firstName" in addr
                                ? `${addr.firstName || ""} ${addr.lastName || ""}`.trim()
                                : ""}
                            </p>
                            <p>
                              {addr.unit ? `${addr.unit}/` : ""}
                              {addr.address}
                            </p>
                            <p>
                              {addr.city}, {addr.state} {addr.postalCode}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Order Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Package className="h-4 w-4" />
                      Items ({order.items.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {order.items.map((item) => {
                        const cutting = parseCuttingSpec(item.cuttingSpec);
                        const isEditing = editingItem === item.id;

                        return (
                          <div
                            key={item.id}
                            className="flex gap-4 p-4 border rounded-lg"
                          >
                            {/* Product Image */}
                            {item.product?.imageUrl && (
                              <div className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}

                            {/* Item Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {item.partNumber && (
                                      <Badge variant="outline" className="text-xs">
                                        {item.partNumber}
                                      </Badge>
                                    )}
                                    {item.color && (
                                      <Badge variant="secondary" className="text-xs">
                                        {item.color}
                                      </Badge>
                                    )}
                                    {item.material && (
                                      <Badge variant="secondary" className="text-xs">
                                        {item.material}
                                      </Badge>
                                    )}
                                    {item.size && (
                                      <Badge variant="secondary" className="text-xs">
                                        {item.size}
                                      </Badge>
                                    )}
                                  </div>
                                  {cutting && (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                      <Scissors className="h-3 w-3" />
                                      CNC {cutting.cutType}: {cutting.xCutMm}mm x{" "}
                                      {cutting.yCutMm}mm
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                {!isEditing && (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleStartEditItem(item)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    {order.items.length > 1 && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() => setDeleteItemId(item.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Edit Mode */}
                              {isEditing && editItemData ? (
                                <div className="mt-3 space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Quantity</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={editItemData.quantity}
                                        onChange={(e) =>
                                          setEditItemData((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  quantity:
                                                    parseInt(e.target.value) || 1,
                                                }
                                              : prev
                                          )
                                        }
                                        className="h-8"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">
                                        Unit Price (inc. GST)
                                      </Label>
                                      <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                          $
                                        </span>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={(
                                            editItemData.unitPriceInCents / 100
                                          ).toFixed(2)}
                                          onChange={(e) =>
                                            setEditItemData((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    unitPriceInCents: Math.round(
                                                      parseFloat(
                                                        e.target.value || "0"
                                                      ) * 100
                                                    ),
                                                  }
                                                : prev
                                            )
                                          }
                                          className="h-8 pl-6"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleCancelEditItem}
                                    >
                                      <X className="h-3.5 w-3.5 mr-1" />
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={handleSaveItem}
                                      disabled={isSavingItem}
                                    >
                                      {isSavingItem ? (
                                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                      ) : (
                                        <Check className="h-3.5 w-3.5 mr-1" />
                                      )}
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-4 mt-2 text-sm">
                                  <span className="text-muted-foreground">
                                    Qty: {item.quantity}
                                  </span>
                                  <span className="text-muted-foreground">
                                    @ {formatPrice(item.unitPriceInCents)}
                                  </span>
                                  {item.discountPercent > 0 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs text-green-600"
                                    >
                                      -{item.discountPercent}%
                                    </Badge>
                                  )}
                                  {item.refundedQuantity > 0 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs text-amber-600 border-amber-300"
                                    >
                                      {item.refundedQuantity} refunded
                                    </Badge>
                                  )}
                                  <span className="font-medium ml-auto">
                                    {formatPrice(item.totalInCents)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CreditCard className="h-4 w-4" />
                      Payment Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatPrice(order.subtotalInCents)}</span>
                      </div>
                      {order.discountInCents > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>
                            Discount
                            {order.discountCodeSnapshot &&
                              ` (${order.discountCodeSnapshot})`}
                          </span>
                          <span>-{formatPrice(order.discountInCents)}</span>
                        </div>
                      )}
                      {order.deliveryFeeInCents > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Delivery Fee
                          </span>
                          <span>{formatPrice(order.deliveryFeeInCents)}</span>
                        </div>
                      )}
                      {order.holdingFeeInCents > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Holding Fee
                          </span>
                          <span>{formatPrice(order.holdingFeeInCents)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Total</span>
                        <span>{formatPrice(order.totalInCents)}</span>
                      </div>
                      {order.refundedAmountInCents > 0 && (
                        <div className="flex justify-between text-sm text-red-500">
                          <span>Refunded</span>
                          <span>
                            -{formatPrice(order.refundedAmountInCents)}
                          </span>
                        </div>
                      )}
                      {order.paidAt && (
                        <p className="text-xs text-muted-foreground pt-1">
                          Paid on {formatDate(order.paidAt)}
                        </p>
                      )}
                      {order.stripePaymentIntentId && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {order.stripePaymentIntentId}
                        </p>
                      )}

                      {/* Verify Payment with Stripe */}
                      {order.stripePaymentIntentId && (
                        <>
                          <Separator />
                          <div className="pt-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">
                                Stripe Verification
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleVerifyPayment}
                                disabled={isVerifyingPayment}
                              >
                                {isVerifyingPayment ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Verify Payment
                              </Button>
                            </div>

                            {verifyResult && (
                              <div className="space-y-3">
                                {/* Status banner */}
                                <div
                                  className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
                                    verifyResult.error
                                      ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                                      : verifyResult.stripeStatus === "succeeded"
                                        ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                                        : "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300"
                                  }`}
                                >
                                  {verifyResult.error ? (
                                    <CircleAlert className="h-4 w-4 shrink-0" />
                                  ) : verifyResult.stripeStatus === "succeeded" ? (
                                    <CircleCheck className="h-4 w-4 shrink-0" />
                                  ) : (
                                    <CircleAlert className="h-4 w-4 shrink-0" />
                                  )}
                                  {verifyResult.error || verifyResult.message}
                                </div>

                                {/* Comparison table */}
                                {!verifyResult.error && verifyResult.amountCharged != null && (
                                  <div className="border rounded-lg overflow-hidden">
                                    <div className="grid grid-cols-2 text-xs font-medium text-muted-foreground bg-muted/50">
                                      <div className="px-3 py-2 border-r">Order (Subtex)</div>
                                      <div className="px-3 py-2">Stripe</div>
                                    </div>

                                    {/* Amount row */}
                                    <div className="grid grid-cols-2 text-sm border-t">
                                      <div className="px-3 py-2 border-r">
                                        <p className="text-xs text-muted-foreground">Order Total</p>
                                        <p className="font-medium">
                                          {formatPrice(verifyResult.orderTotalInCents ?? 0)}
                                        </p>
                                      </div>
                                      <div className="px-3 py-2">
                                        <p className="text-xs text-muted-foreground">Amount Charged</p>
                                        <p className="font-medium">
                                          {formatPrice(verifyResult.amountCharged)}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Received + Fee row */}
                                    <div className="grid grid-cols-2 text-sm border-t">
                                      <div className="px-3 py-2 border-r">
                                        <p className="text-xs text-muted-foreground">Status</p>
                                        <p className="font-mono text-xs">
                                          {verifyResult.stripeStatus}
                                        </p>
                                      </div>
                                      <div className="px-3 py-2">
                                        <p className="text-xs text-muted-foreground">Received</p>
                                        <p className="font-medium">
                                          {formatPrice(verifyResult.amountReceived ?? 0)}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Stripe Fee + Net row */}
                                    {(verifyResult.stripeFee ?? 0) > 0 && (
                                      <div className="grid grid-cols-2 text-sm border-t">
                                        <div className="px-3 py-2 border-r">
                                          <p className="text-xs text-muted-foreground">Stripe Fee</p>
                                          <p className="font-medium text-red-600">
                                            -{formatPrice(verifyResult.stripeFee ?? 0)}
                                          </p>
                                        </div>
                                        <div className="px-3 py-2">
                                          <p className="text-xs text-muted-foreground">Net (You Receive)</p>
                                          <p className="font-medium text-green-600">
                                            {formatPrice(verifyResult.netAmount ?? 0)}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* Match indicator */}
                                    {verifyResult.orderTotalInCents != null && verifyResult.amountReceived != null && (
                                      <div className="border-t px-3 py-2 text-xs">
                                        {verifyResult.orderTotalInCents === verifyResult.amountReceived ? (
                                          <span className="text-green-600 flex items-center gap-1.5">
                                            <CircleCheck className="h-3.5 w-3.5" />
                                            Amounts match
                                          </span>
                                        ) : (
                                          <span className="text-yellow-600 flex items-center gap-1.5">
                                            <CircleAlert className="h-3.5 w-3.5" />
                                            Difference:{" "}
                                            {formatPrice(
                                              Math.abs(
                                                verifyResult.amountReceived - verifyResult.orderTotalInCents
                                              )
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Charge ID */}
                                {verifyResult.chargeId && (
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {verifyResult.chargeId}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <MessageSquare className="h-4 w-4" />
                        Notes
                      </CardTitle>
                      {!isEditingNotes && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleStartEditNotes}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditingNotes ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Customer Notes</Label>
                          <Textarea
                            value={customerNotesEdit}
                            onChange={(e) => setCustomerNotesEdit(e.target.value)}
                            placeholder="Notes from the customer..."
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Admin Notes</Label>
                          <Textarea
                            value={adminNotesEdit}
                            onChange={(e) => setAdminNotesEdit(e.target.value)}
                            placeholder="Internal notes..."
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingNotes(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveNotes}
                            disabled={isSavingNotes}
                          >
                            {isSavingNotes && (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            )}
                            Save Notes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {order.customerNotes && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Customer Notes
                            </p>
                            <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
                              {order.customerNotes}
                            </div>
                          </div>
                        )}
                        {order.adminNotes && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Admin Notes
                            </p>
                            <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
                              {order.adminNotes}
                            </div>
                          </div>
                        )}
                        {!order.customerNotes && !order.adminNotes && (
                          <p className="text-sm text-muted-foreground">
                            No notes yet
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Status History */}
                {order.statusHistory.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Clock className="h-4 w-4" />
                        Status History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {order.statusHistory.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-start gap-3 text-sm"
                          >
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    statusConfig[entry.status]?.variant ||
                                    "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {statusConfig[entry.status]?.label ||
                                    entry.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(entry.createdAt)}
                                </span>
                              </div>
                              {entry.note && (
                                <p className="text-muted-foreground mt-1">
                                  {entry.note}
                                </p>
                              )}
                              {entry.changedByUser && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  by{" "}
                                  {entry.changedByUser.name ||
                                    entry.changedByUser.email}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Refund Requests */}
                {order.refundRequests.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Refund Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {order.refundRequests.map((refund) => (
                          <div
                            key={refund.id}
                            className="flex items-start justify-between p-3 border rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    refund.status === "pending"
                                      ? "destructive"
                                      : refund.status === "approved"
                                        ? "default"
                                        : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {refund.status}
                                </Badge>
                                <span className="text-sm font-medium">
                                  {formatPrice(refund.requestedAmountInCents)}
                                </span>
                              </div>
                              {refund.items && refund.items.length > 0 && (
                                <div className="bg-muted/50 rounded-md p-2 mt-1.5 space-y-1">
                                  {refund.items.map((ri) => (
                                    <div key={ri.id} className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">
                                        {ri.orderItem.name}
                                        {ri.orderItem.partNumber && ` (${ri.orderItem.partNumber})`}
                                        {" "}&times; {ri.quantity}
                                      </span>
                                      <span>{formatPrice(ri.amountInCents)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <p className="text-sm text-muted-foreground mt-1">
                                {refund.reason}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDate(refund.createdAt)}
                              </p>
                            </div>
                            {refund.approvedAmountInCents != null && (
                              <div className="text-right shrink-0">
                                <p className="text-xs text-muted-foreground">
                                  Approved
                                </p>
                                <p className="text-sm font-medium">
                                  {formatPrice(refund.approvedAmountInCents)}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Order Meta */}
                <div className="text-xs text-muted-foreground space-y-1 pb-8">
                  <p>Order ID: {order.id}</p>
                  <p>Created: {formatDate(order.createdAt)}</p>
                  <p>Last Updated: {formatDate(order.updatedAt)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Item Confirmation */}
      <AlertDialog
        open={!!deleteItemId}
        onOpenChange={() => setDeleteItemId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this item from the order? The order
              total will be recalculated. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem}>
              Remove Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Truck,
  Package,
  CreditCard,
  Loader2,
  ArrowLeft,
  Ticket,
  X,
  Check,
  Mail,
  Phone,
  User,
  Minus,
  Plus,
  Trash2,
  CalendarDays,
  Clock,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { BackorderNotice } from "@/components/backorder-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCart } from "@/hooks/use-cart";
import {
  createCheckoutSession,
  createDevOrder,
} from "@/server/actions/checkout";
import { validateDiscountCode } from "@/server/actions/discount-codes";
import {
  createReservationsForCheckout,
  releaseUserReservations,
  linkReservationsToCheckout,
} from "@/server/actions/reservations";
import { toast } from "@/components/ui/toast";
import { DeliveryZoneMap } from "@/components/delivery-zone-map";
import {
  AddressAutocompleteInput,
  type AddressComponents,
} from "@/components/address-autocomplete-input";
import { authClient } from "@/lib/auth-client";
import { createAddress } from "@/server/actions/addresses";
import { updateProfileFromCheckout } from "@/server/actions/auth";
import { CheckoutTimer } from "@/components/checkout-timer";
import type { Address } from "@/server/schemas/users";

interface DeliveryZone {
  id: string;
  name: string;
  radiusKm: number;
  baseFeeInCents: number;
  perSheetFeeInCents: number;
}

interface CheckoutClientProps {
  deliveryZones: DeliveryZone[];
  savedAddresses?: Address[];
  userName?: string;
  userPhone?: string;
  userCompany?: string;
}

type DeliveryMethod = "click_collect" | "local_delivery";

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

// Generate or retrieve a guest session ID for non-logged-in users
function getGuestSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = localStorage.getItem("subtex-guest-session-id");
  if (!sessionId) {
    sessionId = `guest-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    localStorage.setItem("subtex-guest-session-id", sessionId);
  }
  return sessionId;
}

// Click & Collect timeslot helpers
interface CollectionDay {
  dateKey: string; // YYYY-MM-DD
  dayLabel: string; // "Mon", "Tue"
  dateLabel: string; // "10 Feb"
  morningAvailable: boolean;
  afternoonAvailable: boolean;
}

// Western Australia public holidays (update annually)
// Includes: New Year's Day, Australia Day, Labour Day, Good Friday,
// Saturday before Easter, Easter Monday, Anzac Day, WA Day,
// Queen's Birthday, Christmas Day, Boxing Day + observed dates
const WA_PUBLIC_HOLIDAYS = new Set([
  // 2025
  "2025-01-01",
  "2025-01-27", // Australia Day (observed Mon)
  "2025-03-03", // Labour Day
  "2025-04-18", // Good Friday
  "2025-04-19", // Saturday before Easter
  "2025-04-21", // Easter Monday
  "2025-04-25", // Anzac Day
  "2025-06-02", // WA Day
  "2025-09-29", // Queen's Birthday
  "2025-12-25", // Christmas Day
  "2025-12-26", // Boxing Day
  // 2026
  "2026-01-01",
  "2026-01-26", // Australia Day
  "2026-03-02", // Labour Day
  "2026-04-03", // Good Friday
  "2026-04-04", // Saturday before Easter
  "2026-04-06", // Easter Monday
  "2026-06-01", // WA Day
  "2026-09-28", // Queen's Birthday
  "2026-12-25", // Christmas Day
  "2026-12-28", // Boxing Day (observed Mon)
  // 2027
  "2027-01-01",
  "2027-01-26", // Australia Day
  "2027-03-01", // Labour Day
  "2027-03-26", // Good Friday
  "2027-03-27", // Saturday before Easter
  "2027-03-29", // Easter Monday
  "2027-04-26", // Anzac Day (observed Mon)
  "2027-06-07", // WA Day
  "2027-09-27", // Queen's Birthday
  "2027-12-27", // Christmas Day (observed Mon)
  "2027-12-28", // Boxing Day (observed Tue)
]);

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getAvailableCollectionDays(): CollectionDay[] {
  // Get current time in Perth (AWST = UTC+8)
  const perthNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Australia/Perth" })
  );
  const isAfterNoon = perthNow.getHours() >= 12;

  const days: CollectionDay[] = [];
  let daysAdded = 0;
  let dayOffset = 1; // Start from tomorrow

  // Generate 20 business days (4 weeks of options)
  while (daysAdded < 20) {
    const date = new Date(perthNow);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);

    const dateKey = toDateKey(date);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) {
      dayOffset++;
      continue;
    }

    // Skip public holidays
    if (WA_PUBLIC_HOLIDAYS.has(dateKey)) {
      dayOffset++;
      continue;
    }

    // First business day: morning slot not available if ordered after noon Perth time
    const morningAvailable = daysAdded === 0 ? !isAfterNoon : true;

    days.push({
      dateKey,
      dayLabel: date.toLocaleDateString("en-AU", { weekday: "short" }),
      dateLabel: date.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
      }),
      morningAvailable,
      afternoonAvailable: true,
    });

    daysAdded++;
    dayOffset++;
  }

  return days;
}

export function CheckoutClient({
  deliveryZones,
  savedAddresses = [],
  userName = "",
  userPhone = "",
  userCompany = "",
}: CheckoutClientProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const {
    items,
    subtotalInCents,
    totalItems,
    clearCart,
    updateQuantity,
    removeItem,
  } = useCart();
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("local_delivery");
  const [selectedZone, setSelectedZone] = useState<string>(
    deliveryZones[0]?.id || ""
  );
  const [isZoneAutoSelected, setIsZoneAutoSelected] = useState(false);
  const [isOutOfDeliveryRange, setIsOutOfDeliveryRange] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState("");

  // Reservation state
  const [reservationIds, setReservationIds] = useState<string[]>([]);
  const [reservationExpiresAt, setReservationExpiresAt] = useState<Date | null>(
    null
  );
  const [isCreatingReservation, setIsCreatingReservation] = useState(true);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const hasCreatedReservation = useRef(false);
  const guestSessionId = useRef<string>("");

  // Contact Information state
  const [email, setEmail] = useState("");
  const [contactPhone, setContactPhone] = useState(userPhone || "");
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(false);
  const isGuest = !session?.user;

  // Click & Collect timeslot state
  const [selectedCollectionDate, setSelectedCollectionDate] = useState("");
  const [selectedCollectionSlot, setSelectedCollectionSlot] = useState<
    "morning" | "afternoon" | ""
  >("");
  const [datePageIndex, setDatePageIndex] = useState(0);

  // Detect backorder items (any item where requested quantity exceeds stock)
  const hasBackorderItems = items.some(
    (item) => item.stock !== undefined && item.quantity > item.stock
  );

  // Available collection days (computed once on mount)
  const availableCollectionDays = useMemo(
    () => getAvailableCollectionDays(),
    []
  );

  // Address selection state
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new">(
    savedAddresses.find((a) => a.isDefault)?.id ||
      savedAddresses[0]?.id ||
      "new"
  );
  const [addresses, setAddresses] = useState<Address[]>(savedAddresses);
  const [saveToAddressBook, setSaveToAddressBook] = useState(false);
  const [addressLabel, setAddressLabel] = useState("Home");
  const [placeId, setPlaceId] = useState("");

  // Shipping Address state (for manual entry)
  const [shippingAddress, setShippingAddress] = useState({
    firstName: "",
    lastName: "",
    company: userCompany,
    address: "",
    unit: "",
    city: "",
    state: "WA",
    postalCode: "",
    phone: "",
  });

  // Create reservations when component mounts
  useEffect(() => {
    async function createReservations() {
      if (hasCreatedReservation.current || items.length === 0) {
        setIsCreatingReservation(false);
        return;
      }

      hasCreatedReservation.current = true;
      guestSessionId.current = getGuestSessionId();

      try {
        const reservationItems = items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        }));

        const result = await createReservationsForCheckout(
          reservationItems,
          guestSessionId.current
        );

        if (result.success && result.reservationIds && result.expiresAt) {
          setReservationIds(result.reservationIds);
          setReservationExpiresAt(result.expiresAt);
          setReservationError(null);
        } else {
          setReservationError(result.error || "Failed to reserve items");
          toast.error(
            result.error || "Failed to reserve items. Please try again."
          );
        }
      } catch (error) {
        console.error("Error creating reservations:", error);
        setReservationError("Failed to reserve items");
        toast.error("Failed to reserve items. Please try again.");
      } finally {
        setIsCreatingReservation(false);
      }
    }

    createReservations();
  }, [items]);

  // Release reservations when component unmounts or user navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Using sendBeacon for reliability on page unload
      if (reservationIds.length > 0) {
        navigator.sendBeacon?.(
          "/api/reservations/release",
          JSON.stringify({ sessionId: guestSessionId.current })
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Release reservations on unmount (e.g., navigating away)
      if (reservationIds.length > 0) {
        releaseUserReservations(guestSessionId.current);
      }
    };
  }, [reservationIds]);

  // Handle reservation expiry
  const handleReservationExpired = useCallback(() => {
    setReservationIds([]);
    setReservationExpiresAt(null);
    router.push("/?expired=true");
  }, [router]);

  // Autofill user info when signed in
  useEffect(() => {
    if (session?.user) {
      // Autofill email
      if (session.user.email && !email) {
        setEmail(session.user.email);
      }
      // Autofill name for manual entry
      if (session.user.name && selectedAddressId === "new") {
        const nameParts = session.user.name.split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";
        setShippingAddress((prev) => ({
          ...prev,
          firstName: prev.firstName || firstName,
          lastName: prev.lastName || lastName,
        }));
      }
      // Autofill phone if available (check if user object has phone property)
      const phone = (session.user as { phone?: string }).phone;
      if (phone) {
        if (!contactPhone) {
          setContactPhone(phone);
        }
        if (!shippingAddress.phone && selectedAddressId === "new") {
          setShippingAddress((prev) => ({
            ...prev,
            phone: phone,
          }));
        }
      }
    }
  }, [session, selectedAddressId]);

  // Update shipping address when a saved address is selected
  useEffect(() => {
    if (selectedAddressId && selectedAddressId !== "new") {
      const address = addresses.find((a) => a.id === selectedAddressId);
      if (address) {
        const nameParts = (address.recipientName || "").split(" ");
        setShippingAddress({
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          company: "",
          address: address.street,
          unit: address.unit || "",
          city: address.suburb,
          state: address.state,
          postalCode: address.postcode,
          phone: address.phone || "",
        });
      }
    }
  }, [selectedAddressId, addresses]);

  // Handle address autocomplete selection
  const handleAddressAutocomplete = (addressComponents: AddressComponents) => {
    setShippingAddress((prev) => ({
      ...prev,
      address: addressComponents.street,
      unit: addressComponents.unit,
      city: addressComponents.suburb,
      state: addressComponents.state,
      postalCode: addressComponents.postcode,
    }));
    setPlaceId(addressComponents.placeId);
  };

  // Discount code state
  const [discountCode, setDiscountCode] = useState("");
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    codeId: string;
    amountInCents: number;
    description: string;
    target: "subtotal" | "shipping";
    discountType: "percentage" | "fixed_amount";
    discountValue: number;
  } | null>(null);

  // Calculate totals
  const totalSheets = totalItems;

  // Calculate delivery fee
  let baseDeliveryFee = 0;
  if (deliveryMethod === "local_delivery" && selectedZone) {
    const zone = deliveryZones.find((z) => z.id === selectedZone);
    if (zone) {
      baseDeliveryFee =
        zone.baseFeeInCents + zone.perSheetFeeInCents * totalSheets;
    }
  }

  // Calculate discount based on target
  let subtotalDiscount = 0;
  let shippingDiscount = 0;

  if (appliedDiscount) {
    if (appliedDiscount.target === "subtotal") {
      // Recalculate subtotal discount
      if (appliedDiscount.discountType === "percentage") {
        subtotalDiscount = Math.round(
          (subtotalInCents * appliedDiscount.discountValue) / 100
        );
      } else {
        subtotalDiscount = appliedDiscount.discountValue;
      }
      // Don't let discount exceed subtotal
      subtotalDiscount = Math.min(subtotalDiscount, subtotalInCents);
    } else if (appliedDiscount.target === "shipping") {
      // Recalculate shipping discount based on current delivery fee
      if (appliedDiscount.discountType === "percentage") {
        shippingDiscount = Math.round(
          (baseDeliveryFee * appliedDiscount.discountValue) / 100
        );
      } else {
        shippingDiscount = appliedDiscount.discountValue;
      }
      // Don't let discount exceed shipping fee
      shippingDiscount = Math.min(shippingDiscount, baseDeliveryFee);
    }
  }

  const discountedSubtotal = Math.max(0, subtotalInCents - subtotalDiscount);
  const deliveryFee = Math.max(0, baseDeliveryFee - shippingDiscount);
  const totalDiscountAmount = subtotalDiscount + shippingDiscount;

  // For click & collect, customer pays full amount upfront (no holding fee)
  const amountDueNow =
    deliveryMethod === "click_collect"
      ? discountedSubtotal
      : discountedSubtotal + deliveryFee;

  // Handle applying discount code
  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      toast.error("Please enter a discount code");
      return;
    }

    setIsValidatingDiscount(true);

    try {
      const result = await validateDiscountCode(
        discountCode.trim(),
        subtotalInCents,
        baseDeliveryFee
      );

      if (!result.valid) {
        toast.error(result.error || "Invalid discount code");
        return;
      }

      if (
        result.discountCode &&
        result.discountAmountInCents !== undefined &&
        result.discountTarget
      ) {
        const targetLabel =
          result.discountTarget === "shipping" ? " shipping" : "";
        const description =
          result.discountCode.discountType === "percentage"
            ? `${result.discountCode.discountValue}% off${targetLabel}`
            : `${formatPrice(
                result.discountCode.discountValue
              )} off${targetLabel}`;

        setAppliedDiscount({
          code: result.discountCode.code,
          codeId: result.discountCode.id,
          amountInCents: result.discountAmountInCents,
          description,
          target: result.discountTarget,
          discountType: result.discountCode.discountType,
          discountValue: result.discountCode.discountValue,
        });
        toast.success(`Discount applied: ${description}`);
      }
    } catch (error) {
      toast.error("Failed to validate discount code");
    } finally {
      setIsValidatingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // Validate required contact info (always required)
    if (!shippingAddress.firstName.trim()) {
      toast.error("Please enter your first name");
      return;
    }

    // Guests must provide at least an email or phone
    if (isGuest && !email.trim() && !contactPhone.trim()) {
      toast.error("Please provide at least an email address or phone number");
      return;
    }

    // Validate timeslot for click & collect (not required when items are backordered)
    if (
      deliveryMethod === "click_collect" &&
      !hasBackorderItems
    ) {
      if (!selectedCollectionDate) {
        toast.error("Please select a collection date");
        return;
      }
      if (!selectedCollectionSlot) {
        toast.error("Please select a collection timeslot");
        return;
      }
    }

    // Validate required fields for delivery
    if (deliveryMethod === "local_delivery") {
      if (!email.trim()) {
        toast.error("Please enter your email address");
        return;
      }
      if (!shippingAddress.address.trim()) {
        toast.error("Please enter your delivery address");
        return;
      }
      if (!shippingAddress.city.trim() || !shippingAddress.postalCode.trim()) {
        toast.error("Please enter your city and postal code");
        return;
      }
    }

    setIsLoading(true);

    try {
      // Save to address book if checkbox is checked and user is logged in
      if (
        saveToAddressBook &&
        session?.user &&
        selectedAddressId === "new" &&
        deliveryMethod === "local_delivery"
      ) {
        try {
          await createAddress({
            recipientName:
              `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim(),
            phone: shippingAddress.phone || undefined,
            label: addressLabel || undefined,
            street: shippingAddress.address,
            unit: shippingAddress.unit || undefined,
            suburb: shippingAddress.city,
            state: shippingAddress.state,
            postcode: shippingAddress.postalCode,
            country: "Australia",
            placeId: placeId || undefined,
            isDefault: addresses.length === 0,
          });
        } catch (error) {
          console.error("Failed to save address:", error);
          // Don't block checkout if address save fails
        }
      }

      // Save company and phone to user profile if logged in
      if (session?.user) {
        const profileUpdates: { company?: string; phone?: string } = {};

        if (shippingAddress.company.trim()) {
          profileUpdates.company = shippingAddress.company.trim();
        }

        if (contactPhone.trim()) {
          profileUpdates.phone = contactPhone.trim();
        }

        if (Object.keys(profileUpdates).length > 0) {
          try {
            await updateProfileFromCheckout(profileUpdates);
          } catch (error) {
            console.error("Failed to save profile info:", error);
            // Don't block checkout if profile save fails
          }
        }
      }

      const checkoutItems = items.map((item) => ({
        productId: item.productId,
        partNumber: item.partNumber,
        name: item.productName,
        color: item.color,
        material: item.material,
        size: item.size,
        priceInCents: item.priceInCents,
        quantity: item.quantity,
      }));

      // Use dev checkout (bypasses Stripe) — switch to createCheckoutSession once Stripe is configured
      const result = await createDevOrder({
        items: checkoutItems,
        deliveryMethod:
          deliveryMethod === "click_collect" ? "pickup" : "delivery",
        deliveryFeeInCents:
          deliveryMethod === "local_delivery" ? deliveryFee : 0,
        discountCodeId: appliedDiscount?.codeId,
        discountInCents: totalDiscountAmount,
        ...(isGuest && {
          guestInfo: {
            firstName: shippingAddress.firstName.trim(),
            email: email.trim() || undefined,
            phone: contactPhone.trim() || undefined,
          },
        }),
        ...(deliveryMethod === "click_collect" &&
          !hasBackorderItems &&
          selectedCollectionDate &&
          selectedCollectionSlot && {
            collectionDate: selectedCollectionDate,
            collectionSlot: selectedCollectionSlot,
          }),
        hasBackorderItems:
          deliveryMethod === "click_collect" && hasBackorderItems
            ? true
            : undefined,
        customerNotes: notes.trim() || undefined,
        deliveryAddressSnapshot:
          deliveryMethod === "local_delivery"
            ? {
                firstName: shippingAddress.firstName,
                lastName: shippingAddress.lastName,
                company: shippingAddress.company || undefined,
                address: shippingAddress.address,
                unit: shippingAddress.unit || undefined,
                city: shippingAddress.city,
                state: shippingAddress.state,
                postalCode: shippingAddress.postalCode,
                phone: shippingAddress.phone || undefined,
              }
            : undefined,
      });

      if (result.success && result.redirectUrl) {
        // Clear cart and redirect to orders page
        clearCart();
        toast.success(
          `Order ${result.orderNumber} placed successfully!`
        );
        window.location.href = result.redirectUrl;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to create checkout session. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while creating reservations
  if (isCreatingReservation) {
    return (
      <div className='text-center py-12'>
        <Loader2 className='h-16 w-16 mx-auto text-muted-foreground mb-4 animate-spin' />
        <h2 className='text-xl font-semibold mb-2'>Reserving your items...</h2>
        <p className='text-muted-foreground'>
          Please wait while we reserve your items for checkout.
        </p>
      </div>
    );
  }

  // Show error state if reservation failed
  if (reservationError && !reservationExpiresAt) {
    return (
      <div className='text-center py-12'>
        <Package className='h-16 w-16 mx-auto text-destructive mb-4' />
        <h2 className='text-xl font-semibold mb-2'>Unable to Reserve Items</h2>
        <p className='text-muted-foreground mb-6'>{reservationError}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className='text-center py-12'>
        <Package className='h-16 w-16 mx-auto text-muted-foreground mb-4' />
        <h2 className='text-xl font-semibold mb-2'>Your cart is empty</h2>
        <p className='text-muted-foreground mb-6'>
          Add some ACM sheets to your cart to proceed with checkout.
        </p>
        <Button asChild>
          <Link href='/'>Browse Products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Reservation Timer */}
      {reservationExpiresAt && (
        <CheckoutTimer
          expiresAt={reservationExpiresAt}
          onExpired={handleReservationExpired}
          guestSessionId={guestSessionId.current}
          className='w-full justify-center'
        />
      )}

      <div className='grid gap-8 lg:grid-cols-3'>
        {/* Main Content */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Mail className='h-5 w-5' />
                Contact Information
              </CardTitle>
              {isGuest && (
                <p className='text-sm text-muted-foreground'>
                  Checking out as a guest.{" "}
                  <Link
                    href='/sign-in?callbackUrl=/checkout'
                    className='text-primary underline-offset-4 hover:underline font-medium'
                  >
                    Sign in
                  </Link>{" "}
                  for a faster checkout experience.
                </p>
              )}
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='firstName'>
                    First Name{" "}
                    <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    id='firstName'
                    placeholder='John'
                    value={shippingAddress.firstName}
                    onChange={(e) =>
                      setShippingAddress((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='lastName'>Last Name</Label>
                  <Input
                    id='lastName'
                    placeholder='Smith'
                    value={shippingAddress.lastName}
                    onChange={(e) =>
                      setShippingAddress((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='company'>Company (Optional)</Label>
                <Input
                  id='company'
                  placeholder='Company name'
                  value={shippingAddress.company}
                  onChange={(e) =>
                    setShippingAddress((prev) => ({
                      ...prev,
                      company: e.target.value,
                    }))
                  }
                />
              </div>

              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='email'>
                    Email{" "}
                    {isGuest && !contactPhone.trim() && (
                      <span className='text-destructive'>*</span>
                    )}
                  </Label>
                  <Input
                    id='email'
                    type='email'
                    placeholder='your@email.com'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='contactPhone'>
                    Phone{" "}
                    {isGuest && !email.trim() && (
                      <span className='text-destructive'>*</span>
                    )}
                  </Label>
                  <Input
                    id='contactPhone'
                    type='tel'
                    placeholder='0412 345 678'
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
              </div>

              {isGuest && (
                <p className='text-xs text-muted-foreground'>
                  Please provide at least an email address or phone number so we
                  can contact you about your order.
                </p>
              )}

              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='newsletter'
                  checked={subscribeNewsletter}
                  disabled={!email.trim()}
                  onCheckedChange={(checked) =>
                    setSubscribeNewsletter(checked === true)
                  }
                />
                <Label
                  htmlFor='newsletter'
                  className={`text-sm font-normal cursor-pointer ${
                    !email.trim() ? "text-muted-foreground" : ""
                  }`}
                >
                  Email me with news and offers
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Method */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Truck className='h-5 w-5' />
                Delivery Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={deliveryMethod}
                onValueChange={(value) =>
                  setDeliveryMethod(value as DeliveryMethod)
                }
                className='space-y-4'
              >
                {/* Click & Collect */}
                <div
                  className={`flex items-start space-x-3 p-4 border rounded-lg transition-colors ${
                    deliveryMethod === "click_collect"
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <RadioGroupItem
                    value='click_collect'
                    id='click_collect'
                    className='mt-1'
                  />
                  <div className='flex-1'>
                    <Label
                      htmlFor='click_collect'
                      className='font-medium cursor-pointer'
                    >
                      Click & Collect
                    </Label>
                    <p className='text-sm text-muted-foreground mt-1'>
                      Collect from our warehouse at 16 Brewer Rd, Canning Vale
                    </p>
                    <p className='text-sm text-green-600 dark:text-green-400 mt-1'>
                      Free &mdash; no delivery fee
                    </p>

                    {deliveryMethod === "click_collect" && (
                      <div className='mt-4 space-y-5'>
                        <Separator />

                        {hasBackorderItems ? (
                          // Backorder notice — timeslot will be booked via email later
                          <div className='p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg'>
                            <div className='flex items-start gap-3'>
                              <AlertTriangle className='h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5' />
                              <div className='space-y-1'>
                                <p className='text-sm font-medium text-amber-800 dark:text-amber-200'>
                                  Some items are on backorder
                                </p>
                                <p className='text-sm text-amber-700 dark:text-amber-300'>
                                  Once all items are ready and in stock,
                                  we&apos;ll send you an email with a link to
                                  book your collection timeslot.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Timeslot picker
                          <div className='space-y-4'>
                            {/* Date selection */}
                            <div className='space-y-2'>
                              <div className='flex items-center justify-between'>
                                <Label className='text-sm font-medium flex items-center gap-2'>
                                  <CalendarDays className='h-4 w-4' />
                                  Collection Date
                                </Label>
                                <div className='flex items-center gap-1'>
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    className='h-7 w-7'
                                    disabled={datePageIndex === 0}
                                    onClick={() =>
                                      setDatePageIndex((p) => p - 1)
                                    }
                                  >
                                    <ChevronLeft className='h-4 w-4' />
                                  </Button>
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    className='h-7 w-7'
                                    disabled={
                                      datePageIndex >=
                                      Math.ceil(
                                        availableCollectionDays.length / 5
                                      ) -
                                        1
                                    }
                                    onClick={() =>
                                      setDatePageIndex((p) => p + 1)
                                    }
                                  >
                                    <ChevronRight className='h-4 w-4' />
                                  </Button>
                                </div>
                              </div>
                              <div className='grid grid-cols-3 sm:grid-cols-5 gap-2'>
                                {availableCollectionDays
                                  .slice(
                                    datePageIndex * 5,
                                    datePageIndex * 5 + 5
                                  )
                                  .map((day) => (
                                    <button
                                      key={day.dateKey}
                                      type='button'
                                      onClick={() => {
                                        setSelectedCollectionDate(day.dateKey);
                                        if (
                                          selectedCollectionSlot ===
                                            "morning" &&
                                          !day.morningAvailable
                                        ) {
                                          setSelectedCollectionSlot("");
                                        }
                                      }}
                                      className={`p-2 text-center border rounded-lg transition-colors text-sm ${
                                        selectedCollectionDate === day.dateKey
                                          ? "bg-foreground text-background border-foreground"
                                          : "hover:border-muted-foreground/30"
                                      }`}
                                    >
                                      <div className='font-medium'>
                                        {day.dayLabel}
                                      </div>
                                      <div
                                        className={`text-xs ${
                                          selectedCollectionDate === day.dateKey
                                            ? "text-background/70"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {day.dateLabel}
                                      </div>
                                    </button>
                                  ))}
                              </div>
                            </div>

                            {/* Timeslot selection */}
                            {selectedCollectionDate && (
                              <div className='space-y-2'>
                                <Label className='text-sm font-medium flex items-center gap-2'>
                                  <Clock className='h-4 w-4' />
                                  Collection Time
                                </Label>
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                                  {(() => {
                                    const day = availableCollectionDays.find(
                                      (d) =>
                                        d.dateKey === selectedCollectionDate
                                    );
                                    return (
                                      <>
                                        <button
                                          type='button'
                                          disabled={!day?.morningAvailable}
                                          onClick={() =>
                                            setSelectedCollectionSlot("morning")
                                          }
                                          className={`p-3 text-left border rounded-lg transition-colors ${
                                            selectedCollectionSlot === "morning"
                                              ? "bg-foreground text-background border-foreground"
                                              : !day?.morningAvailable
                                              ? "opacity-50 cursor-not-allowed bg-muted"
                                              : "hover:border-muted-foreground/30"
                                          }`}
                                        >
                                          <div className='font-medium text-sm'>
                                            Morning
                                          </div>
                                          <div
                                            className={`text-xs ${
                                              selectedCollectionSlot ===
                                              "morning"
                                                ? "text-background/70"
                                                : "text-muted-foreground"
                                            }`}
                                          >
                                            8:00 AM &ndash; 11:30 AM
                                          </div>
                                        </button>
                                        <button
                                          type='button'
                                          disabled={!day?.afternoonAvailable}
                                          onClick={() =>
                                            setSelectedCollectionSlot(
                                              "afternoon"
                                            )
                                          }
                                          className={`p-3 text-left border rounded-lg transition-colors ${
                                            selectedCollectionSlot ===
                                            "afternoon"
                                              ? "bg-foreground text-background border-foreground"
                                              : !day?.afternoonAvailable
                                              ? "opacity-50 cursor-not-allowed bg-muted"
                                              : "hover:border-muted-foreground/30"
                                          }`}
                                        >
                                          <div className='font-medium text-sm'>
                                            Afternoon
                                          </div>
                                          <div
                                            className={`text-xs ${
                                              selectedCollectionSlot ===
                                              "afternoon"
                                                ? "text-background/70"
                                                : "text-muted-foreground"
                                            }`}
                                          >
                                            1:00 PM &ndash; 3:30 PM
                                          </div>
                                        </button>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Collection Information */}
                        <div className='p-4 bg-muted/50 border rounded-lg space-y-3'>
                          <h4 className='text-sm font-medium flex items-center gap-2'>
                            <Info className='h-4 w-4' />
                            Collection Information
                          </h4>
                          <ul className='space-y-2 text-sm text-muted-foreground'>
                            <li className='flex items-start gap-2'>
                              <span className='shrink-0 mt-0.5'>&bull;</span>
                              <span>
                                <strong>Appointment-based collection only</strong>{" "}
                                &mdash; please arrive within your booked
                                timeslot
                              </span>
                            </li>
                            <li className='flex items-start gap-2'>
                              <span className='shrink-0 mt-0.5'>&bull;</span>
                              <span>
                                <strong>Signature required</strong> upon
                                collection
                              </span>
                            </li>
                            <li className='flex items-start gap-2'>
                              <span className='shrink-0 mt-0.5'>&bull;</span>
                              <span>
                                We have a <strong>forklift</strong> and can
                                assist with loading onto your vehicle
                              </span>
                            </li>
                            <li className='flex items-start gap-2'>
                              <span className='shrink-0 mt-0.5'>&bull;</span>
                              <span>
                                <strong>Bring a mate</strong> to help &mdash;
                                ACM sheets can be heavy and awkward to handle
                              </span>
                            </li>
                            <li className='flex items-start gap-2'>
                              <span className='shrink-0 mt-0.5'>&bull;</span>
                              <span>
                                We are{" "}
                                <strong>not obligated to tie down</strong>{" "}
                                sheets and are{" "}
                                <strong>not liable for any damage</strong> once
                                loaded onto your vehicle
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Local Delivery */}
                <div
                  className={`flex items-start space-x-3 p-4 border rounded-lg transition-colors ${
                    deliveryMethod === "local_delivery"
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <RadioGroupItem
                    value='local_delivery'
                    id='local_delivery'
                    className='mt-1'
                  />
                  <div className='flex-1'>
                    <Label
                      htmlFor='local_delivery'
                      className='font-medium cursor-pointer'
                    >
                      Local Delivery (Perth Area)
                    </Label>
                    <p className='text-sm text-muted-foreground mt-1'>
                      We deliver using our own van within the Perth metropolitan
                      area
                    </p>
                    {deliveryMethod === "local_delivery" &&
                      deliveryZones.length > 0 && (
                        <div className='mt-4 space-y-6'>
                          {/* Shipping Address */}
                          <div className='space-y-4'>
                            <Label className='text-base font-medium flex items-center gap-2'>
                              <MapPin className='h-4 w-4' />
                              Delivery Address
                            </Label>

                            {/* Saved Addresses List */}
                            {addresses.length > 0 && (
                              <RadioGroup
                                value={selectedAddressId}
                                onValueChange={setSelectedAddressId}
                                className='space-y-3'
                              >
                                {addresses.map((address) => (
                                  <div
                                    key={address.id}
                                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                      selectedAddressId === address.id
                                        ? "border-primary bg-primary/5"
                                        : "hover:border-muted-foreground/30"
                                    }`}
                                    onClick={() =>
                                      setSelectedAddressId(address.id)
                                    }
                                  >
                                    <RadioGroupItem
                                      value={address.id}
                                      id={`address-${address.id}`}
                                      className='mt-0.5'
                                    />
                                    <div className='flex-1 min-w-0'>
                                      <div className='flex items-center gap-2 flex-wrap'>
                                        <span className='font-medium text-sm'>
                                          {address.recipientName ||
                                            address.label ||
                                            "Address"}
                                        </span>
                                        {address.isDefault && (
                                          <span className='text-xs bg-muted px-2 py-0.5 rounded border'>
                                            Default
                                          </span>
                                        )}
                                      </div>
                                      <p className='text-sm text-muted-foreground mt-1'>
                                        {address.unit && `${address.unit}, `}
                                        {address.street}, {address.suburb},{" "}
                                        {address.state} {address.postcode}
                                      </p>
                                    </div>
                                  </div>
                                ))}

                                {/* Add New Address Option */}
                                <div
                                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                    selectedAddressId === "new"
                                      ? "border-primary bg-primary/5"
                                      : "hover:border-muted-foreground/30"
                                  }`}
                                  onClick={() => setSelectedAddressId("new")}
                                >
                                  <RadioGroupItem
                                    value='new'
                                    id='address-new'
                                    className='mt-0.5'
                                  />
                                  <div className='flex-1'>
                                    <Label
                                      htmlFor='address-new'
                                      className='font-medium text-sm cursor-pointer'
                                    >
                                      Enter a new address
                                    </Label>
                                  </div>
                                </div>
                              </RadioGroup>
                            )}

                            {/* Manual Address Entry Form */}
                            {(selectedAddressId === "new" ||
                              addresses.length === 0) && (
                              <div className='space-y-4'>
                                {addresses.length > 0 && <Separator />}

                                {/* Street Address with Autocomplete */}
                                <div className='space-y-2'>
                                  <Label htmlFor='address'>
                                    Street Address
                                  </Label>
                                  <AddressAutocompleteInput
                                    value={shippingAddress.address}
                                    onChange={(value) =>
                                      setShippingAddress((prev) => ({
                                        ...prev,
                                        address: value,
                                      }))
                                    }
                                    onAddressSelect={handleAddressAutocomplete}
                                    placeholder='Start typing your address...'
                                  />
                                </div>

                                {/* Unit/Apt */}
                                <div className='space-y-2'>
                                  <Label htmlFor='unit'>
                                    Unit / Apt / Suite (Optional)
                                  </Label>
                                  <Input
                                    id='unit'
                                    placeholder='Apt 4B, Suite 100, etc.'
                                    value={shippingAddress.unit}
                                    onChange={(e) =>
                                      setShippingAddress((prev) => ({
                                        ...prev,
                                        unit: e.target.value,
                                      }))
                                    }
                                  />
                                </div>

                                <div className='grid gap-4 sm:grid-cols-2'>
                                  <div className='space-y-2'>
                                    <Label htmlFor='city'>Suburb</Label>
                                    <Input
                                      id='city'
                                      placeholder='Perth'
                                      value={shippingAddress.city}
                                      onChange={(e) =>
                                        setShippingAddress((prev) => ({
                                          ...prev,
                                          city: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className='space-y-2'>
                                    <Label htmlFor='state'>State</Label>
                                    <Input
                                      id='state'
                                      placeholder='WA'
                                      value={shippingAddress.state}
                                      onChange={(e) =>
                                        setShippingAddress((prev) => ({
                                          ...prev,
                                          state: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                </div>

                                <div className='grid gap-4 sm:grid-cols-2'>
                                  <div className='space-y-2'>
                                    <Label htmlFor='postalCode'>Postcode</Label>
                                    <Input
                                      id='postalCode'
                                      placeholder='6000'
                                      value={shippingAddress.postalCode}
                                      onChange={(e) =>
                                        setShippingAddress((prev) => ({
                                          ...prev,
                                          postalCode: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className='space-y-2'>
                                    <Label htmlFor='phone'>Phone</Label>
                                    <Input
                                      id='phone'
                                      type='tel'
                                      placeholder='0412 345 678'
                                      value={shippingAddress.phone}
                                      onChange={(e) =>
                                        setShippingAddress((prev) => ({
                                          ...prev,
                                          phone: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                </div>

                                {/* Save to Address Book (only for logged in users) */}
                                {session?.user && (
                                  <div className='space-y-3 pt-2'>
                                    <div className='flex items-center space-x-2'>
                                      <Checkbox
                                        id='saveToAddressBook'
                                        checked={saveToAddressBook}
                                        onCheckedChange={(checked) =>
                                          setSaveToAddressBook(checked === true)
                                        }
                                      />
                                      <Label
                                        htmlFor='saveToAddressBook'
                                        className='text-sm font-normal cursor-pointer'
                                      >
                                        Save to my address book
                                      </Label>
                                    </div>

                                    {saveToAddressBook && (
                                      <div className='pl-6 space-y-2'>
                                        <Label
                                          htmlFor='addressLabel'
                                          className='text-sm'
                                        >
                                          Address Label
                                        </Label>
                                        <RadioGroup
                                          value={addressLabel}
                                          onValueChange={setAddressLabel}
                                          className='flex gap-4'
                                        >
                                          {["Home", "Work", "Other"].map(
                                            (label) => (
                                              <div
                                                key={label}
                                                className='flex items-center space-x-2'
                                              >
                                                <RadioGroupItem
                                                  value={label}
                                                  id={`label-${label}`}
                                                />
                                                <Label
                                                  htmlFor={`label-${label}`}
                                                  className='font-normal cursor-pointer'
                                                >
                                                  {label}
                                                </Label>
                                              </div>
                                            )
                                          )}
                                        </RadioGroup>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <Separator />

                          {/* Google Maps with Delivery Zones */}
                          <div>
                            <DeliveryZoneMap
                              deliveryZones={deliveryZones}
                              selectedZone={selectedZone}
                              onZoneSelect={(zoneId, isAuto) => {
                                setSelectedZone(zoneId);
                                setIsZoneAutoSelected(isAuto || false);
                                setIsOutOfDeliveryRange(false);
                              }}
                              onOutOfRange={() => {
                                setIsOutOfDeliveryRange(true);
                                setIsZoneAutoSelected(false);
                              }}
                              deliveryAddress={{
                                address: shippingAddress.address,
                                city: shippingAddress.city,
                                state: shippingAddress.state,
                                postalCode: shippingAddress.postalCode,
                              }}
                            />
                          </div>

                          {/* Delivery Zone Display */}
                          <div className='space-y-3'>
                            <div className='flex items-center justify-between'>
                              <Label>Delivery Zone</Label>
                              {isZoneAutoSelected && (
                                <span className='text-xs text-muted-foreground bg-muted px-2 py-1 rounded'>
                                  Auto-detected from address
                                </span>
                              )}
                            </div>

                            {isOutOfDeliveryRange ? (
                              <div className='p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3'>
                                <p className='text-sm text-amber-800 dark:text-amber-200 font-medium'>
                                  Your address is outside our local delivery
                                  area
                                </p>
                                <p className='text-sm text-amber-700 dark:text-amber-300'>
                                  We currently deliver within{" "}
                                  {Math.max(
                                    ...deliveryZones.map((z) => z.radiusKm)
                                  )}
                                  km of our Canning Vale warehouse.
                                </p>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  className='w-full'
                                  onClick={() =>
                                    setDeliveryMethod("click_collect")
                                  }
                                >
                                  Switch to Click & Collect (Free)
                                </Button>
                              </div>
                            ) : (
                              <RadioGroup
                                value={selectedZone}
                                onValueChange={(zoneId) => {
                                  setSelectedZone(zoneId);
                                  setIsZoneAutoSelected(false);
                                }}
                                className='flex flex-wrap gap-4'
                                disabled={isZoneAutoSelected}
                              >
                                {deliveryZones.map((zone) => (
                                  <div
                                    key={zone.id}
                                    className={`flex items-center space-x-2 p-3 border rounded-lg transition-colors ${
                                      selectedZone === zone.id
                                        ? "border-primary bg-primary/5"
                                        : isZoneAutoSelected
                                        ? "opacity-50 cursor-not-allowed"
                                        : "hover:border-muted-foreground/30 cursor-pointer"
                                    }`}
                                    onClick={() => {
                                      if (!isZoneAutoSelected) {
                                        setSelectedZone(zone.id);
                                      }
                                    }}
                                  >
                                    <RadioGroupItem
                                      value={zone.id}
                                      id={`zone-${zone.id}`}
                                      disabled={isZoneAutoSelected}
                                    />
                                    <Label
                                      htmlFor={`zone-${zone.id}`}
                                      className={`font-normal ${
                                        isZoneAutoSelected
                                          ? "cursor-not-allowed"
                                          : "cursor-pointer"
                                      }`}
                                    >
                                      {zone.name} (
                                      {formatPrice(
                                        zone.baseFeeInCents +
                                          zone.perSheetFeeInCents * totalSheets
                                      )}
                                      )
                                    </Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Discount Code */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Ticket className='h-5 w-5' />
                Discount Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appliedDiscount ? (
                <div className='flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800'>
                  <div className='flex items-center gap-2'>
                    <Check className='h-4 w-4 text-green-600' />
                    <div>
                      <p className='font-medium text-green-800 dark:text-green-200'>
                        {appliedDiscount.code}
                      </p>
                      <p className='text-sm text-green-600 dark:text-green-400'>
                        {appliedDiscount.description}
                        {totalDiscountAmount > 0 &&
                          ` (-${formatPrice(totalDiscountAmount)})`}
                        {appliedDiscount.target === "shipping" &&
                          deliveryMethod !== "local_delivery" && (
                            <span className='text-amber-600 dark:text-amber-400 ml-1'>
                              (select local delivery to apply)
                            </span>
                          )}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={handleRemoveDiscount}
                    className='text-green-600 hover:text-green-800 hover:bg-green-100'
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
              ) : (
                <div className='flex gap-2'>
                  <Input
                    placeholder='Enter discount code'
                    value={discountCode}
                    onChange={(e) =>
                      setDiscountCode(e.target.value.toUpperCase())
                    }
                    className='font-mono uppercase'
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyDiscount();
                      }
                    }}
                  />
                  <Button
                    variant='outline'
                    onClick={handleApplyDiscount}
                    disabled={isValidatingDiscount || !discountCode.trim()}
                  >
                    {isValidatingDiscount ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Section */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <CreditCard className='h-5 w-5' />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <p className='text-sm text-muted-foreground'>
                You will be redirected to our secure payment provider (Stripe)
                to complete your purchase.
              </p>
              <div className='flex flex-wrap gap-3'>
                <div className='flex items-center gap-2 px-3 py-2 border rounded-md'>
                  <svg
                    className='h-6 w-8'
                    viewBox='0 0 38 24'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <rect width='38' height='24' rx='4' fill='#1434CB' />
                    <path
                      d='M15.5 16.5H13L14.75 7.5H17.25L15.5 16.5Z'
                      fill='white'
                    />
                    <path
                      d='M23.75 7.75C23.25 7.5 22.5 7.25 21.5 7.25C19 7.25 17.25 8.5 17.25 10.25C17.25 11.5 18.5 12.25 19.5 12.75C20.5 13.25 20.75 13.5 20.75 14C20.75 14.75 19.75 15 19 15C18 15 17.5 14.75 16.75 14.5L16.5 14.25L16.25 16C17 16.25 18.25 16.5 19.5 16.5C22.25 16.5 24 15.25 24 13.25C24 12.25 23.25 11.5 22 10.75C21 10.25 20.5 10 20.5 9.5C20.5 9 21 8.5 22 8.5C22.75 8.5 23.25 8.75 23.75 8.75L24 9L24.25 7.5L23.75 7.75Z'
                      fill='white'
                    />
                    <path
                      d='M27.75 7.5H25.75C25.25 7.5 24.75 7.75 24.5 8.25L21 16.5H23.75L24.25 15H27.5L27.75 16.5H30.25L27.75 7.5ZM25 13.25L26.25 9.75L27 13.25H25Z'
                      fill='white'
                    />
                    <path
                      d='M12.5 7.5L10 13.75L9.75 12.5C9.25 11 8 9.5 6.5 8.75L8.75 16.5H11.5L15.25 7.5H12.5Z'
                      fill='white'
                    />
                    <path
                      d='M8.25 7.5H4L4 7.75C7.5 8.5 9.75 10.5 10.5 13L9.5 8.25C9.25 7.75 8.75 7.5 8.25 7.5Z'
                      fill='#F9A533'
                    />
                  </svg>
                  <span className='text-xs'>Visa</span>
                </div>
                <div className='flex items-center gap-2 px-3 py-2 border rounded-md'>
                  <svg
                    className='h-6 w-8'
                    viewBox='0 0 38 24'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <rect width='38' height='24' rx='4' fill='#252525' />
                    <circle cx='15' cy='12' r='7' fill='#EB001B' />
                    <circle cx='23' cy='12' r='7' fill='#F79E1B' />
                    <path
                      d='M19 7C20.86 8.32 22 10.51 22 13C22 15.49 20.86 17.68 19 19C17.14 17.68 16 15.49 16 13C16 10.51 17.14 8.32 19 7Z'
                      fill='#FF5F00'
                    />
                  </svg>
                  <span className='text-xs'>Mastercard</span>
                </div>
                <div className='flex items-center gap-2 px-3 py-2 border rounded-md'>
                  <svg
                    className='h-6 w-8'
                    viewBox='0 0 38 24'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <rect width='38' height='24' rx='4' fill='#006FCF' />
                    <path
                      d='M19 4L4 12L19 20L34 12L19 4Z'
                      fill='white'
                      fillOpacity='0.3'
                    />
                    <text
                      x='19'
                      y='14'
                      textAnchor='middle'
                      fill='white'
                      fontSize='6'
                      fontWeight='bold'
                    >
                      AMEX
                    </text>
                  </svg>
                  <span className='text-xs'>Amex</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Order Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder='Any special instructions for your order...'
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Order Summary Sidebar */}
        <div className='lg:col-span-1'>
          <Card className='sticky top-24'>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Items with Thumbnails */}
              <div className='space-y-4'>
                {items.map((item) => {
                  const hasDiscount =
                    item.appliedDiscountPercent &&
                    item.appliedDiscountPercent > 0;
                  const basePrice =
                    item.basePriceInCents || item.priceInCents || 0;
                  const currentPrice = item.priceInCents || basePrice;

                  return (
                    <div key={item.productId} className='flex gap-3'>
                      {/* Product Thumbnail */}
                      <div className='h-16 w-16 shrink-0 rounded-md bg-muted overflow-hidden relative'>
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.productName || "Product"}
                            fill
                            className='object-cover'
                            sizes='64px'
                          />
                        ) : (
                          <div className='h-full w-full flex items-center justify-center text-muted-foreground'>
                            <Package className='h-6 w-6' />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className='flex-1 min-w-0'>
                        <p className='font-medium text-sm truncate'>
                          {item.productName}
                        </p>
                        {item.color && item.color !== "default" && (
                          <p className='text-xs text-muted-foreground capitalize'>
                            {item.color}
                            {item.material && ` / ${item.material}`}
                          </p>
                        )}

                        {/* Quantity Controls */}
                        <div className='flex items-center gap-2 mt-2'>
                          <div className='flex items-center border rounded-md'>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-7 w-7 rounded-none'
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  Math.max(1, item.quantity - 1)
                                )
                              }
                              disabled={item.quantity <= 1}
                            >
                              <Minus className='h-3 w-3' />
                            </Button>
                            <span className='w-8 text-center text-sm'>
                              {item.quantity}
                            </span>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-7 w-7 rounded-none'
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.quantity + 1
                                )
                              }
                            >
                              <Plus className='h-3 w-3' />
                            </Button>
                          </div>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-7 w-7 text-muted-foreground hover:text-destructive'
                            onClick={() => removeItem(item.productId)}
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </div>

                        {/* Backorder Notice */}
                        {item.stock !== undefined &&
                          item.quantity > item.stock &&
                          item.stock > 0 && (
                            <BackorderNotice
                              availableStock={item.stock}
                              requestedQuantity={item.quantity}
                              variant='compact'
                              className='mt-2'
                            />
                          )}
                      </div>

                      {/* Price */}
                      <div className='text-right'>
                        <p className='font-medium text-sm'>
                          {formatPrice(currentPrice * item.quantity)}
                        </p>
                        {hasDiscount && (
                          <p className='text-xs text-muted-foreground line-through'>
                            {formatPrice(basePrice * item.quantity)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* Totals */}
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Subtotal</span>
                  <span>{formatPrice(subtotalInCents)}</span>
                </div>

                {appliedDiscount &&
                  appliedDiscount.target === "subtotal" &&
                  subtotalDiscount > 0 && (
                    <div className='flex justify-between text-green-600'>
                      <span>Discount ({appliedDiscount.code})</span>
                      <span>-{formatPrice(subtotalDiscount)}</span>
                    </div>
                  )}

                {deliveryMethod === "local_delivery" && (
                  <>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Delivery</span>
                      <span>
                        {shippingDiscount > 0 ? (
                          <>
                            <span className='line-through text-muted-foreground mr-2'>
                              {formatPrice(baseDeliveryFee)}
                            </span>
                            {formatPrice(deliveryFee)}
                          </>
                        ) : (
                          formatPrice(deliveryFee)
                        )}
                      </span>
                    </div>
                    {appliedDiscount &&
                      appliedDiscount.target === "shipping" &&
                      shippingDiscount > 0 && (
                        <div className='flex justify-between text-green-600'>
                          <span>
                            Shipping Discount ({appliedDiscount.code})
                          </span>
                          <span>-{formatPrice(shippingDiscount)}</span>
                        </div>
                      )}
                  </>
                )}

                {deliveryMethod === "click_collect" && (
                  <>
                    <div className='flex justify-between text-green-600'>
                      <span>Delivery</span>
                      <span>Free</span>
                    </div>
                    {selectedCollectionDate &&
                      selectedCollectionSlot && (
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>
                            Collection
                          </span>
                          <span className='text-right text-sm'>
                            {
                              availableCollectionDays.find(
                                (d) => d.dateKey === selectedCollectionDate
                              )?.dateLabel
                            }
                            ,{" "}
                            {selectedCollectionSlot === "morning"
                              ? "8–11:30 AM"
                              : "1–3:30 PM"}
                          </span>
                        </div>
                      )}
                    {hasBackorderItems && (
                      <div className='flex justify-between text-amber-600 dark:text-amber-400'>
                        <span>Collection</span>
                        <span className='text-right text-sm'>
                          TBD (backorder)
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <Separator />

              <div className='flex justify-between font-semibold text-lg'>
                <span>Total</span>
                <span>{formatPrice(amountDueNow)}</span>
              </div>

              <p className='text-xs text-muted-foreground'>
                All prices include GST
              </p>

              <Button
                className='w-full'
                size='lg'
                onClick={handleSubmit}
                disabled={
                  isLoading ||
                  (deliveryMethod === "local_delivery" &&
                    isOutOfDeliveryRange) ||
                  (deliveryMethod === "click_collect" &&
                    !hasBackorderItems &&
                    (!selectedCollectionDate || !selectedCollectionSlot))
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Processing...
                  </>
                ) : deliveryMethod === "local_delivery" &&
                  isOutOfDeliveryRange ? (
                  "Address outside delivery area"
                ) : (
                  <>
                    <CreditCard className='mr-2 h-4 w-4' />
                    Pay {formatPrice(amountDueNow)}
                  </>
                )}
              </Button>

              <Button variant='ghost' className='w-full' asChild>
                <Link href='/'>
                  <ArrowLeft className='mr-2 h-4 w-4' />
                  Continue Shopping
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

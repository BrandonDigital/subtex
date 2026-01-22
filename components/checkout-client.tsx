"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Truck, Package, CreditCard, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/use-cart";
import { createCheckoutSession } from "@/server/actions/checkout";
import { toast } from "sonner";

interface DeliveryZone {
  id: string;
  name: string;
  radiusKm: number;
  baseFeeInCents: number;
  perSheetFeeInCents: number;
}

interface CheckoutClientProps {
  deliveryZones: DeliveryZone[];
  holdingFeeInCents?: number;
}

type DeliveryMethod = "click_collect" | "local_delivery" | "interstate";

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

export function CheckoutClient({ 
  deliveryZones,
  holdingFeeInCents = 5000,
}: CheckoutClientProps) {
  const router = useRouter();
  const { items, subtotalInCents, totalItems, clearCart } = useCart();
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("local_delivery");
  const [selectedZone, setSelectedZone] = useState<string>(deliveryZones[0]?.id || "");
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState("");

  // Calculate totals
  const totalSheets = totalItems;
  const totalHoldingFee = holdingFeeInCents * totalSheets;

  // Calculate delivery fee
  let deliveryFee = 0;
  if (deliveryMethod === "local_delivery" && selectedZone) {
    const zone = deliveryZones.find((z) => z.id === selectedZone);
    if (zone) {
      deliveryFee = zone.baseFeeInCents + zone.perSheetFeeInCents * totalSheets;
    }
  }

  // For click & collect, customer only pays holding fee now
  const amountDueNow =
    deliveryMethod === "click_collect" ? totalHoldingFee : subtotalInCents + deliveryFee;

  const balanceDueOnCollection =
    deliveryMethod === "click_collect" ? subtotalInCents - totalHoldingFee : 0;

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setIsLoading(true);
    
    try {
      if (deliveryMethod === "interstate") {
        // For interstate, submit a quote request (handle differently)
        toast.info("Quote request submitted. We'll contact you with shipping details.");
        router.push("/orders");
        return;
      }

      const checkoutItems = items.map((item) => ({
        variantId: item.variantId,
        sku: item.sku,
        color: item.color,
        material: item.material,
        size: item.size,
        priceInCents: item.priceInCents,
        quantity: item.quantity,
      }));

      const result = await createCheckoutSession({
        items: checkoutItems,
        deliveryMethod: deliveryMethod === "click_collect" ? "pickup" : "delivery",
        deliveryFeeInCents: deliveryMethod === "local_delivery" ? deliveryFee : 0,
        holdingFeeInCents: deliveryMethod === "click_collect" ? totalHoldingFee : 0,
      });

      if (result.url) {
        // Clear cart before redirecting to Stripe
        clearCart();
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to create checkout session. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">
          Add some ACM sheets to your cart to proceed with checkout.
        </p>
        <Button asChild>
          <Link href="/">Browse Products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Delivery Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={deliveryMethod}
              onValueChange={(value) => setDeliveryMethod(value as DeliveryMethod)}
              className="space-y-4"
            >
              {/* Click & Collect */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <RadioGroupItem value="click_collect" id="click_collect" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="click_collect" className="font-medium cursor-pointer">
                    Click & Collect
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Collect from our warehouse at 16 Brewer Rd, Canning Vale
                  </p>
                  <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Holding fee:</strong> {formatPrice(totalHoldingFee)}
                      <br />
                      <span className="text-xs">
                        Pay the balance of {formatPrice(subtotalInCents - totalHoldingFee)} on
                        collection within 7 days
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Local Delivery */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <RadioGroupItem value="local_delivery" id="local_delivery" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="local_delivery" className="font-medium cursor-pointer">
                    Local Delivery (Perth Area)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    We deliver using our own van within the Perth metropolitan area
                  </p>
                  {deliveryMethod === "local_delivery" && deliveryZones.length > 0 && (
                    <div className="mt-3 space-y-3">
                      <div className="space-y-2">
                        <Label>Select Delivery Zone</Label>
                        <RadioGroup
                          value={selectedZone}
                          onValueChange={setSelectedZone}
                          className="flex flex-wrap gap-4"
                        >
                          {deliveryZones.map((zone) => (
                            <div key={zone.id} className="flex items-center space-x-2">
                              <RadioGroupItem value={zone.id} id={`zone-${zone.id}`} />
                              <Label htmlFor={`zone-${zone.id}`} className="font-normal">
                                {zone.name} (
                                {formatPrice(
                                  zone.baseFeeInCents + zone.perSheetFeeInCents * totalSheets
                                )}
                                )
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Interstate */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <RadioGroupItem value="interstate" id="interstate" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="interstate" className="font-medium cursor-pointer">
                    Interstate / International
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    We&apos;ll contact you with a shipping quote
                  </p>
                  {deliveryMethod === "interstate" && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        After submitting your order, we&apos;ll calculate shipping costs and send
                        you a payment link via email.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Order Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Order Notes (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Any special instructions for your order..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>
      </div>

      {/* Order Summary Sidebar */}
      <div className="lg:col-span-1">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items */}
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.variantId} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium capitalize">
                      {item.color} {item.material} {item.size}
                    </p>
                    <p className="text-muted-foreground">
                      {item.quantity} × {formatPrice(item.priceInCents)}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatPrice(item.priceInCents * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(subtotalInCents)}</span>
              </div>

              {deliveryMethod === "local_delivery" && (
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>{formatPrice(deliveryFee)}</span>
                </div>
              )}

              {deliveryMethod === "interstate" && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>Quote pending</span>
                </div>
              )}

              {deliveryMethod === "click_collect" && (
                <>
                  <div className="flex justify-between">
                    <span>Holding Fee</span>
                    <span>{formatPrice(totalHoldingFee)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Balance (on collection)</span>
                    <span>{formatPrice(balanceDueOnCollection)}</span>
                  </div>
                </>
              )}
            </div>

            <Separator />

            <div className="flex justify-between font-medium text-lg">
              <span>
                {deliveryMethod === "click_collect" ? "Due Now" : "Total"}
              </span>
              <span>{formatPrice(amountDueNow)}</span>
            </div>

            <p className="text-xs text-muted-foreground">
              All prices include GST
            </p>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {deliveryMethod === "interstate"
                    ? "Submit Quote Request"
                    : `Pay ${formatPrice(amountDueNow)}`}
                </>
              )}
            </Button>

            <Button variant="ghost" className="w-full" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Continue Shopping
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout-client";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Subtex ACM sheet order.",
};

export default async function CheckoutPage() {
  // TODO: Fetch delivery zones from database via action
  // const deliveryZones = await getDeliveryZones();

  const deliveryZones = [
    { id: "1", name: "Perth Metro", radiusKm: 25, baseFeeInCents: 5000, perSheetFeeInCents: 0 },
    { id: "2", name: "Greater Perth", radiusKm: 50, baseFeeInCents: 8000, perSheetFeeInCents: 200 },
  ];

  // Default holding fee per item (can be fetched from settings)
  const holdingFeeInCents = 5000;

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Checkout</h1>
          <CheckoutClient
            deliveryZones={deliveryZones}
            holdingFeeInCents={holdingFeeInCents}
          />
        </div>
      </div>
    </div>
  );
}

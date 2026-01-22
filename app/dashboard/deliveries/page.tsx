import type { Metadata } from "next";
import { getDeliveryZones } from "@/server/actions/admin";
import { DeliveryZonesTable } from "./delivery-zones-table";

export const metadata: Metadata = {
  title: "Deliveries",
  description: "Manage delivery zones and shipping quotes.",
};

export default async function DashboardDeliveriesPage() {
  const deliveryZones = await getDeliveryZones();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Deliveries</h1>
        <p className="text-muted-foreground">Manage delivery zones and shipping options</p>
      </div>

      {/* Warehouse Info */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">Warehouse Location</h2>
        <p className="text-muted-foreground">
          16 Brewer Rd, Canning Vale, Perth, WA, 6155
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          All delivery zones are calculated from this location
        </p>
      </div>

      {/* Delivery Zones */}
      <DeliveryZonesTable zones={deliveryZones} />
    </div>
  );
}

import type { Metadata } from "next";
import { getDeliveryZones } from "@/server/actions/admin";
import { getDeliveryOrders } from "@/server/actions/orders";
import { DeliveryZonesTable } from "./delivery-zones-table";
import { DeliveryOrdersClient } from "./delivery-orders-client";

export const metadata: Metadata = {
  title: "Deliveries",
  description: "Manage delivery orders, zones and shipping quotes.",
};

export default async function DashboardDeliveriesPage() {
  const [deliveryZones, deliveryData] = await Promise.all([
    getDeliveryZones(),
    getDeliveryOrders(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Deliveries</h1>
        <p className="text-muted-foreground">Manage delivery orders and shipping zones</p>
      </div>

      {/* Delivery Orders */}
      <DeliveryOrdersClient
        needsShipping={deliveryData.needsShipping}
        inTransit={deliveryData.inTransit}
        recentlyDelivered={deliveryData.recentlyDelivered}
      />

      {/* Warehouse Info */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">Warehouse Location</h2>
        <p className="text-muted-foreground">
          14B Brewer Rd, Canning Vale, Perth, WA, 6155
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

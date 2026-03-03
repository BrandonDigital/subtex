import type { Metadata } from "next";
import { headers } from "next/headers";
import { CheckoutClient } from "./checkout-client";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { addresses as addressesTable, users } from "@/server/schemas";
import { eq } from "drizzle-orm";
import { getDeliveryZones } from "@/server/actions/admin";
import { getCuttingFeePerSheet } from "@/server/actions/settings";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Subtex ACM sheet order.",
};

export default async function CheckoutPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  // Fetch user's addresses if logged in
  let addresses: (typeof addressesTable.$inferSelect)[] = [];
  let userName = "";
  let userPhone = "";
  let userCompany = "";

  if (session?.user?.id) {
    addresses = await db.query.addresses.findMany({
      where: eq(addressesTable.userId, session.user.id),
      orderBy: (addr, { desc }) => [desc(addr.isDefault), desc(addr.createdAt)],
    });

    // Get user details for prefilling
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });
    if (user) {
      userName = user.name || "";
      userPhone = user.phone || "";
      userCompany = user.company || "";
    }
  }

  // Fetch delivery zones and cutting fee from database
  const [deliveryZones, cuttingFeePerSheetInCents] = await Promise.all([
    getDeliveryZones(),
    getCuttingFeePerSheet(),
  ]);

  return (
    <div className='py-12'>
      <div className='w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='max-w-6xl mx-auto'>
          <h1 className='text-3xl font-bold mb-8'>Checkout</h1>
          <CheckoutClient
            deliveryZones={deliveryZones}
            savedAddresses={addresses}
            userName={userName}
            userPhone={userPhone}
            userCompany={userCompany}
            cuttingFeePerSheetInCents={cuttingFeePerSheetInCents}
          />
        </div>
      </div>
    </div>
  );
}

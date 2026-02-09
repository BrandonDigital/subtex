import type { Metadata } from "next";
import { getDiscountCodes } from "@/server/actions/discount-codes";
import { DiscountCodesPageClient } from "./discount-codes-page-client";

export const metadata: Metadata = {
  title: "Discount Codes",
  description: "Manage discount and promo codes for customers.",
};

export default async function DashboardDiscountCodesPage() {
  const discountCodes = await getDiscountCodes();

  const now = new Date();
  const activeCount = discountCodes.filter(
    (c) =>
      c.active &&
      (!c.startDate || new Date(c.startDate) <= now) &&
      (!c.endDate || new Date(c.endDate) >= now)
  ).length;
  const expiredCount = discountCodes.filter(
    (c) => c.endDate && new Date(c.endDate) < now
  ).length;
  const totalUsed = discountCodes.reduce((sum, c) => sum + c.usedCount, 0);

  return (
    <DiscountCodesPageClient
      discountCodes={discountCodes}
      stats={{
        total: discountCodes.length,
        active: activeCount,
        expired: expiredCount,
        totalUsed,
      }}
    />
  );
}

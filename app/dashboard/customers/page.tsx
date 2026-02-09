import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  getCustomersWithAnalytics,
  getCustomerStats,
} from "@/server/actions/customers";
import { CustomersPageClient } from "./customers-page-client";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Customers",
  description: "View customer analytics and repeat customer insights.",
};

export default async function DashboardCustomersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const [customers, stats] = await Promise.all([
    getCustomersWithAnalytics(),
    getCustomerStats(),
  ]);

  return <CustomersPageClient customers={customers} stats={stats} />;
}

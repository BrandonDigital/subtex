import type { Metadata } from "next";
import { headers } from "next/headers";
import { getAllUserCarts, getCartStats } from "@/server/actions/cart";
import { CartsPageClient } from "./carts-page-client";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "User Carts",
  description: "View active shopping carts from customers.",
};

export default async function DashboardCartsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const [carts, stats] = await Promise.all([getAllUserCarts(), getCartStats()]);

  return <CartsPageClient carts={carts} stats={stats} />;
}

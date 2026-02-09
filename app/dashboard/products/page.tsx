import type { Metadata } from "next";
import { getAllProductsForAdmin } from "@/server/actions/products";
import { ProductsPageClient } from "./products-page-client";

export const metadata: Metadata = {
  title: "Products",
  description: "Manage ACM sheet products.",
};

export default async function DashboardProductsPage() {
  const products = await getAllProductsForAdmin();

  return <ProductsPageClient products={products} />;
}

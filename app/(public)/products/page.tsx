import type { Metadata } from "next";
import { getActiveProducts } from "@/server/actions/products";
import { ProductsPageClient } from "./products-page-client";

export const metadata: Metadata = {
  title: "Products | Subtex - ACM Sheets & Building Materials",
  description:
    "Browse our range of ACM sheets, aluminium composite panels, and building materials. Quality products for signage, cladding, and construction in Perth, WA.",
  keywords: [
    "ACM sheets",
    "aluminium composite panels",
    "building materials",
    "signage materials",
    "Perth",
  ],
};

export default async function ProductsPage() {
  const products = await getActiveProducts();

  return (
    <main>
      {/* Products Grid */}
      <ProductsPageClient products={products} />
    </main>
  );
}

import type { Metadata } from "next";
import { headers } from "next/headers";
import { getCompanies, getCompanyStats } from "@/server/actions/companies";
import { CompaniesPageClient } from "./companies-page-client";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Companies",
  description: "Manage company accounts.",
};

export default async function DashboardCompaniesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const [companies, stats] = await Promise.all([
    getCompanies(),
    getCompanyStats(),
  ]);

  return <CompaniesPageClient companies={companies} stats={stats} />;
}

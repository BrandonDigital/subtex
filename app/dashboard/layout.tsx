import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | Dashboard | Subtex",
  },
  description: "Subtex admin dashboard for managing orders, products, and inventory.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Check if user is admin via session
  // If not admin, redirect to home

  return (
    <div className="p-6 lg:p-8">
      {children}
    </div>
  );
}

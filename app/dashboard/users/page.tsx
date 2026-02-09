import type { Metadata } from "next";
import { headers } from "next/headers";
import { getUsers, getUserRoleStats } from "@/server/actions/users";
import { UsersPageClient } from "./users-page-client";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Users",
  description: "Manage user accounts and permissions.",
};

export default async function DashboardUsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const [users, stats] = await Promise.all([getUsers(), getUserRoleStats()]);

  return (
    <UsersPageClient
      users={users}
      currentUserId={session.user.id}
      stats={stats}
    />
  );
}

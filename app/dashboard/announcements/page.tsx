import type { Metadata } from "next";
import { getAnnouncements } from "@/server/actions/announcements";
import { AnnouncementsPageClient } from "./announcements-page-client";

export const metadata: Metadata = {
  title: "Announcements",
  description: "Manage site-wide announcement banners.",
};

export default async function DashboardAnnouncementsPage() {
  const announcements = await getAnnouncements();

  const activeCount = announcements.filter((a) => a.active).length;
  const scheduledCount = announcements.filter(
    (a) => a.startDate && new Date(a.startDate) > new Date()
  ).length;

  return (
    <AnnouncementsPageClient
      announcements={announcements}
      stats={{
        total: announcements.length,
        active: activeCount,
        scheduled: scheduledCount,
      }}
    />
  );
}

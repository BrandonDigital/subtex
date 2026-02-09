import type { Metadata } from "next";
import { getAppointments } from "@/server/actions/orders";
import { AppointmentsPageClient } from "./appointments-page-client";

export const metadata: Metadata = {
  title: "Appointments",
  description: "Manage click & collect appointments and packing schedule.",
};

export default async function AppointmentsPage() {
  const { scheduled, backorder, recentlyCollected, todayKey } =
    await getAppointments();

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold'>Appointments</h1>
        <p className='text-muted-foreground'>
          Click & Collect schedule and packing queue
        </p>
      </div>

      <AppointmentsPageClient
        scheduled={scheduled}
        backorder={backorder}
        recentlyCollected={recentlyCollected}
        todayKey={todayKey}
      />
    </div>
  );
}

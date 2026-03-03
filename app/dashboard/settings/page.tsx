import type { Metadata } from "next";
import { getCuttingFeePerSheet, getSettingHistory } from "@/server/actions/settings";
import { SETTING_KEYS } from "@/server/schemas/settings";
import { SettingsPageClient } from "./settings-page-client";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage application settings and service fees.",
};

export default async function DashboardSettingsPage() {
  const [cuttingFeeInCents, cuttingFeeHistory] = await Promise.all([
    getCuttingFeePerSheet(),
    getSettingHistory(SETTING_KEYS.CUTTING_FEE_PER_SHEET_IN_CENTS),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage service fees and application configuration
        </p>
      </div>

      <SettingsPageClient
        cuttingFeeInCents={cuttingFeeInCents}
        cuttingFeeHistory={cuttingFeeHistory}
      />
    </div>
  );
}

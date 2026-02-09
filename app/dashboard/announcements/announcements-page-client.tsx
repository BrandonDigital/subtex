"use client";

import { useState, useCallback } from "react";
import { Megaphone } from "lucide-react";
import { AnnouncementsTable } from "./announcements-table";
import { AnnouncementEditPanel } from "./announcement-edit-panel";
import type { Announcement } from "@/server/schemas/announcements";

interface AnnouncementsPageClientProps {
  announcements: Announcement[];
  stats: {
    total: number;
    active: number;
    scheduled: number;
  };
}

export function AnnouncementsPageClient({
  announcements,
  stats,
}: AnnouncementsPageClientProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [panelMode, setPanelMode] = useState<"create" | "edit">("create");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const handleCreate = useCallback(() => {
    setSelectedAnnouncement(null);
    setPanelMode("create");
    setShowPanel(true);
  }, []);

  const handleEdit = useCallback((announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setPanelMode("edit");
    setShowPanel(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setShowPanel(false);
    setSelectedAnnouncement(null);
  }, []);

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground">
            Manage site-wide announcement banners displayed below the navigation
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Announcements</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium">Currently Active</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.active}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-sm font-medium">Scheduled</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.scheduled}</p>
          </div>
        </div>

        <AnnouncementsTable
          announcements={announcements}
          onEdit={handleEdit}
          onCreate={handleCreate}
        />
      </div>

      {/* Create/Edit Panel Overlay */}
      <AnnouncementEditPanel
        isOpen={showPanel}
        onClose={handleClosePanel}
        announcement={selectedAnnouncement}
        mode={panelMode}
      />
    </>
  );
}

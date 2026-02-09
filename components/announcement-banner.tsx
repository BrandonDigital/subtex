"use client";

import { useState, useEffect } from "react";
import { X, Info, AlertTriangle, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Announcement } from "@/server/schemas/announcements";

interface AnnouncementBannerProps {
  announcements: Announcement[];
}

const typeStyles = {
  info: {
    bg: "bg-blue-500/10 border-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    icon: Info,
  },
  warning: {
    bg: "bg-yellow-500/10 border-yellow-500/20",
    text: "text-yellow-600 dark:text-yellow-400",
    icon: AlertTriangle,
  },
  success: {
    bg: "bg-green-500/10 border-green-500/20",
    text: "text-green-600 dark:text-green-400",
    icon: CheckCircle,
  },
  error: {
    bg: "bg-red-500/10 border-red-500/20",
    text: "text-red-600 dark:text-red-400",
    icon: AlertCircle,
  },
};

const DISMISSED_KEY = "dismissed_announcements";

function getDismissedAnnouncements(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function dismissAnnouncement(id: string) {
  if (typeof window === "undefined") return;
  try {
    const dismissed = getDismissedAnnouncements();
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function AnnouncementBanner({ announcements }: AnnouncementBannerProps) {
  const [visibleAnnouncements, setVisibleAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const dismissed = getDismissedAnnouncements();
    const visible = announcements.filter(
      (a) => !a.dismissible || !dismissed.includes(a.id)
    );
    setVisibleAnnouncements(visible);
  }, [announcements]);

  const handleDismiss = (id: string) => {
    dismissAnnouncement(id);
    setVisibleAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {visibleAnnouncements.map((announcement) => {
        const style = typeStyles[announcement.type];
        const Icon = style.icon;

        return (
          <div
            key={announcement.id}
            className={`border-b ${style.bg} ${style.text}`}
          >
            <div className="container mx-auto px-4 py-2.5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    {announcement.title && (
                      <span className="font-semibold">{announcement.title}</span>
                    )}
                    <span className="opacity-90">{announcement.message}</span>
                    {announcement.link && (
                      <Link
                        href={announcement.link}
                        className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:opacity-80"
                      >
                        {announcement.linkText || "Learn more"}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
                {announcement.dismissible && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 shrink-0 ${style.text} hover:bg-black/5 dark:hover:bg-white/10`}
                    onClick={() => handleDismiss(announcement.id)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Dismiss announcement</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
